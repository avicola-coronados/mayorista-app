import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentJornadaCode } from "../../utils/date";
import { ClienteCreateInput, ClientesQuery, ClienteUpdateInput } from "./clientes.schemas";

export async function getClientesActivos() {
  return prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
}

export async function getClientesAdmin(query: ClientesQuery) {
  const jornadaActiva = query.jornada_id
    ? await prisma.jornada.findUnique({ where: { id: query.jornada_id } })
    : await prisma.jornada.findFirst({
        where: { estado: "abierta" },
        orderBy: { fecha: "desc" },
      });

  const where: Prisma.ClienteWhereInput = {};

  if (query.activo !== undefined) {
    where.activo = query.activo;
  }

  if (query.search) {
    where.OR = [
      { nombre: { contains: query.search, mode: "insensitive" } },
      { codigo: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
  });

  const clienteIds = clientes.map((cliente) => cliente.id);

  if (clienteIds.length === 0) {
    return {
      clientes: [],
      jornada_activa: jornadaActiva
        ? {
            id: jornadaActiva.id,
            codigo: jornadaActiva.codigo,
            fecha: jornadaActiva.fecha,
            estado: jornadaActiva.estado,
          }
        : null,
      resumen_inactivos: {
        total_sin_compras_hoy: 0,
        clientes_sin_compras: [],
      },
    };
  }

  const [kgPorCliente, ventasPorCliente, ultimaCompraPorCliente, comprasHoy] = await Promise.all([
    prisma.lineaVenta.groupBy({
      by: ["cliente_id"],
      where: { cliente_id: { in: clienteIds } },
      _sum: { peso_neto: true },
    }),
    prisma.lineaVenta.findMany({
      where: { cliente_id: { in: clienteIds } },
      select: { cliente_id: true, jornada_id: true },
      distinct: ["cliente_id", "jornada_id"],
    }),
    prisma.lineaVenta.groupBy({
      by: ["cliente_id"],
      where: { cliente_id: { in: clienteIds } },
      _max: { created_at: true },
    }),
    jornadaActiva
      ? prisma.lineaVenta.findMany({
          where: {
            jornada_id: jornadaActiva.id,
            cliente_id: { in: clienteIds },
          },
          select: { cliente_id: true },
          distinct: ["cliente_id"],
        })
      : Promise.resolve([]),
  ]);

  const kgMap = new Map(
    kgPorCliente.map((row) => [row.cliente_id ?? 0, Number(row._sum.peso_neto ?? 0)]),
  );
  const ventasMap = ventasPorCliente.reduce((map, row) => {
    if (row.cliente_id) {
      map.set(row.cliente_id, (map.get(row.cliente_id) ?? 0) + 1);
    }

    return map;
  }, new Map<number, number>());
  const ultimaCompraMap = new Map(
    ultimaCompraPorCliente.map((row) => [row.cliente_id ?? 0, row._max.created_at]),
  );
  const comprasHoySet = new Set(comprasHoy.map((row) => row.cliente_id).filter(Boolean));

  const clientesConStats = clientes
    .map((cliente) => ({
      id: cliente.id,
      nombre: cliente.nombre,
      codigo: cliente.codigo,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      activo: cliente.activo,
      created_at: cliente.created_at,
      total_ventas: ventasMap.get(cliente.id) ?? 0,
      total_kg_vendido: kgMap.get(cliente.id) ?? 0,
      compro_hoy: comprasHoySet.has(cliente.id),
      ultima_compra: ultimaCompraMap.get(cliente.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.activo !== b.activo) {
        return a.activo ? -1 : 1;
      }

      if (a.compro_hoy !== b.compro_hoy) {
        return a.compro_hoy ? -1 : 1;
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });

  const clientesSinCompras = jornadaActiva
    ? clientesConStats
        .filter((cliente) => cliente.activo && !cliente.compro_hoy)
        .map((cliente) => ({
          id: cliente.id,
          nombre: cliente.nombre,
          ultima_compra: cliente.ultima_compra,
        }))
    : [];

  return {
    clientes: clientesConStats,
    jornada_activa: jornadaActiva
      ? {
          id: jornadaActiva.id,
          codigo: jornadaActiva.codigo,
          fecha: jornadaActiva.fecha,
          estado: jornadaActiva.estado,
        }
      : null,
    resumen_inactivos: {
      total_sin_compras_hoy: clientesSinCompras.length,
      clientes_sin_compras: clientesSinCompras,
    },
  };
}

export async function getClienteById(id: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  return cliente;
}

export async function createCliente(data: ClienteCreateInput) {
  await ensureUniqueCliente(data.nombre, data.codigo ?? null);

  return prisma.cliente.create({
    data: {
      nombre: data.nombre,
      codigo: data.codigo,
      telefono: data.telefono,
      direccion: data.direccion,
      activo: true,
    },
  });
}

export async function updateCliente(id: number, data: ClienteUpdateInput) {
  await ensureClienteExists(id);
  await ensureUniqueCliente(data.nombre, data.codigo ?? null, id);

  if (!data.activo) {
    await ensureCanDisableCliente(id);
  }

  return prisma.cliente.update({
    where: { id },
    data,
  });
}

export async function disableCliente(id: number) {
  await ensureClienteExists(id);
  await ensureCanDisableCliente(id);

  return prisma.cliente.update({
    where: { id },
    data: { activo: false },
  });
}

async function ensureClienteExists(id: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  return cliente;
}

async function ensureUniqueCliente(nombre: string, codigo: string | null, currentId?: number) {
  const existingByName = await prisma.cliente.findFirst({
    where: {
      nombre: {
        equals: nombre,
        mode: "insensitive",
      },
    },
  });

  if (existingByName && existingByName.id !== currentId) {
    throw new AppError("Ya existe un cliente con ese nombre", 409, "DUPLICATE_NAME");
  }

  if (!codigo) {
    return;
  }

  const existingByCode = await prisma.cliente.findFirst({
    where: {
      codigo: {
        equals: codigo,
        mode: "insensitive",
      },
    },
  });

  if (existingByCode && existingByCode.id !== currentId) {
    throw new AppError("El código de cliente ya está en uso", 409, "DUPLICATE_CODE");
  }
}

async function ensureCanDisableCliente(id: number) {
  const jornada = await prisma.jornada.findUnique({
    where: { codigo: getCurrentJornadaCode() },
    select: { id: true, estado: true },
  });

  if (!jornada || jornada.estado !== "abierta") {
    return;
  }

  const ventasActivas = await prisma.lineaVenta.count({
    where: {
      jornada_id: jornada.id,
      cliente_id: id,
    },
  });

  if (ventasActivas > 0) {
    throw new AppError(
      "No se puede eliminar el cliente porque tiene ventas en una jornada abierta",
      409,
      "HAS_ACTIVE_SALES",
    );
  }
}
