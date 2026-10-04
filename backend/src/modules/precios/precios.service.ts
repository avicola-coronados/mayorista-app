import { Prisma } from "@prisma/client";
import { getDefaultProductoId } from "../../bootstrap/default-producto";
import { calcularTotalesGuia } from "../../domain/guia/calculos";
import { roundKg } from "../../domain/pesadas/calculos";
import {
  DEFAULT_PRECIO_KG,
  isPrecioActivoEnFecha,
  resolverPrecioVigente,
  toDateKey,
  type PrecioRecord,
} from "../../domain/precios/resolverPrecioVigente";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentDateInTimezone } from "../../utils/date";
import { CreatePrecioInput, HistorialPreciosQuery, PrecioVigenteQuery } from "./precios.schemas";

function parseFecha(fecha: string) {
  const date = new Date(`${fecha}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Fecha inválida", 400);
  }

  return date;
}

function mapPrecioRecord(precio: {
  id: string;
  producto_id: number;
  precio: Prisma.Decimal;
  fecha_desde: Date;
  fecha_hasta: Date | null;
  vigente: boolean;
}): PrecioRecord {
  return {
    id: precio.id,
    producto_id: precio.producto_id,
    precio: Number(precio.precio),
    fecha_desde: toDateKey(precio.fecha_desde),
    fecha_hasta: precio.fecha_hasta ? toDateKey(precio.fecha_hasta) : null,
    vigente: precio.vigente,
  };
}

export type PrecioVigenteResult = {
  precio: number;
  precio_kg: number;
  precio_id: string | null;
  fecha_desde: string;
  producto_id: number;
  cliente_id: number | null;
  origen: "cliente" | "rango" | "ultimo_disponible" | "default";
};

export async function obtenerPrecioVigente(
  productoId: number,
  fechaInput?: string,
  clienteId?: number | null,
): Promise<PrecioVigenteResult> {
  const fecha = fechaInput ?? getCurrentDateInTimezone();
  const precios = await prisma.precio.findMany({
    where: {
      producto_id: productoId,
      cliente_id: clienteId ? { in: [clienteId] } : null,
    },
    orderBy: [{ fecha_desde: "desc" }, { creado_en: "desc" }],
  });

  if (clienteId) {
    const precioCliente = precios
      .map(mapPrecioRecord)
      .find((precio) => isPrecioActivoEnFecha(precio, fecha));

    if (precioCliente) {
      return {
        precio: precioCliente.precio,
        precio_kg: precioCliente.precio,
        precio_id: precioCliente.id,
        fecha_desde: precioCliente.fecha_desde,
        producto_id: productoId,
        cliente_id: clienteId,
        origen: "cliente",
      };
    }

    return obtenerPrecioVigente(productoId, fecha, null);
  }

  const resuelto = resolverPrecioVigente(
    precios.map(mapPrecioRecord),
    productoId,
    fecha,
    DEFAULT_PRECIO_KG,
  );

  return {
    precio: resuelto.precio,
    precio_kg: resuelto.precio,
    precio_id: resuelto.precio_id,
    fecha_desde: resuelto.fecha_desde,
    producto_id: resuelto.producto_id,
    cliente_id: null,
    origen: resuelto.origen,
  };
}

export async function createPrecio(data: CreatePrecioInput, creadoPor: number) {
  const productoId = data.producto_id ?? (await getDefaultProductoId());
  const clienteId = data.cliente_id ?? null;
  const fechaDesde = parseFecha(data.fecha_desde);
  const fechaCierre = parseFecha(getCurrentDateInTimezone());

  const [producto, cliente] = await Promise.all([
    prisma.producto.findFirst({ where: { id: productoId, activo: true } }),
    clienteId
      ? prisma.cliente.findFirst({ where: { id: clienteId, activo: true } })
      : Promise.resolve(null),
  ]);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  if (clienteId && !cliente) {
    throw new AppError("Cliente no encontrado o inactivo", 404);
  }

  const precioCreado = await prisma.$transaction(async (tx) => {
    await tx.precio.updateMany({
      where: {
        producto_id: productoId,
        cliente_id: clienteId,
        vigente: true,
      },
      data: {
        vigente: false,
        fecha_hasta: fechaCierre,
      },
    });

    const nuevoPrecio = await tx.precio.create({
      data: {
        producto_id: productoId,
        cliente_id: clienteId,
        precio: new Prisma.Decimal(data.precio),
        fecha_desde: fechaDesde,
        fecha_hasta: null,
        vigente: true,
        creado_por: creadoPor,
      },
      include: {
        producto: true,
        cliente: { select: { id: true, nombre: true } },
        creador: { select: { id: true, nombre: true, username: true } },
      },
    });

    await actualizarPrecioEnGuiasAbiertas(tx, {
      productoId,
      clienteId,
      precioId: nuevoPrecio.id,
      precioKg: Number(nuevoPrecio.precio),
    });

    return nuevoPrecio;
  });

  return {
    id: precioCreado.id,
    producto_id: precioCreado.producto_id,
    cliente_id: precioCreado.cliente_id,
    cliente: precioCreado.cliente,
    precio: Number(precioCreado.precio),
    fecha_desde: toDateKey(precioCreado.fecha_desde),
    fecha_hasta: precioCreado.fecha_hasta ? toDateKey(precioCreado.fecha_hasta) : null,
    vigente: precioCreado.vigente,
    creado_por: {
      id: precioCreado.creador.id,
      nombre: precioCreado.creador.nombre,
      username: precioCreado.creador.username,
    },
    creado_en: precioCreado.creado_en.toISOString(),
  };
}

async function actualizarPrecioEnGuiasAbiertas(
  tx: Prisma.TransactionClient,
  {
    productoId,
    clienteId,
    precioId,
    precioKg,
  }: {
    productoId: number;
    clienteId: number | null;
    precioId: string;
    precioKg: number;
  },
) {
  let clientesConPrecioPropio: number[] = [];

  if (clienteId == null) {
    const preciosPropios = await tx.precio.findMany({
      where: { producto_id: productoId, cliente_id: { not: null }, vigente: true },
      select: { cliente_id: true },
    });
    clientesConPrecioPropio = preciosPropios
      .map((precio) => precio.cliente_id)
      .filter((id): id is number => id != null);
  }

  const guias = await tx.guiaEntrega.findMany({
    where: {
      producto_id: productoId,
      estado: "borrador",
      ...(clienteId != null
        ? { cliente_id: clienteId }
        : clientesConPrecioPropio.length > 0
          ? { cliente_id: { notIn: clientesConPrecioPropio } }
          : {}),
    },
    include: { lineas: true },
  });

  if (guias.length === 0) {
    return;
  }

  for (const guia of guias) {
    const lineasActualizadas = guia.lineas.map((linea) => {
      const importeGuia = roundKg(Number(linea.neto_total) * precioKg);
      const importeTotal = roundKg(importeGuia + Number(linea.peladuria));
      return { linea, importeGuia, importeTotal };
    });

    for (const { linea, importeGuia, importeTotal } of lineasActualizadas) {
      await tx.lineaGuia.update({
        where: { id: linea.id },
        data: {
          precio_kg: new Prisma.Decimal(precioKg),
          precio_id: precioId,
          importe_guia: new Prisma.Decimal(importeGuia),
          importe_total: new Prisma.Decimal(importeTotal),
        },
      });
    }

    const totals = calcularTotalesGuia(
      lineasActualizadas.map(({ linea, importeGuia, importeTotal }) => ({
        peso_neto: Number(linea.peso_neto),
        devolucion_kg: Number(linea.devolucion_kg),
        neto_total: Number(linea.neto_total),
        importe_guia: importeGuia,
        peladuria: Number(linea.peladuria),
        importe_total: importeTotal,
      })),
      Number(guia.saldo_anterior),
    );

    await tx.guiaEntrega.update({
      where: { id: guia.id },
      data: {
        total_peso_neto: new Prisma.Decimal(totals.total_peso_neto),
        total_devolucion: new Prisma.Decimal(totals.total_devolucion),
        total_neto: new Prisma.Decimal(totals.total_neto),
        total_importe: new Prisma.Decimal(totals.total_importe),
        total_peladuria: new Prisma.Decimal(totals.total_peladuria),
        total_general: new Prisma.Decimal(totals.total_general),
      },
    });
  }
}

export async function listHistorialPrecios(query: HistorialPreciosQuery) {
  const productoId = query.producto_id ?? (await getDefaultProductoId());

  const precios = await prisma.precio.findMany({
    where: {
      producto_id: productoId,
      ...(query.cliente_id ? { cliente_id: query.cliente_id } : {}),
    },
    orderBy: [{ fecha_desde: "desc" }, { creado_en: "desc" }],
    include: {
      creador: { select: { id: true, nombre: true, username: true } },
      cliente: { select: { id: true, nombre: true } },
    },
  });

  return precios.map((precio) => ({
    id: precio.id,
    precio: Number(precio.precio),
    fecha_desde: toDateKey(precio.fecha_desde),
    fecha_hasta: precio.fecha_hasta ? toDateKey(precio.fecha_hasta) : null,
    vigente: precio.vigente,
    producto_id: precio.producto_id,
    cliente_id: precio.cliente_id,
    cliente: precio.cliente,
    creado_por: {
      id: precio.creador.id,
      nombre: precio.creador.nombre,
      username: precio.creador.username,
    },
    creado_en: precio.creado_en.toISOString(),
  }));
}

export async function getPrecioVigenteResponse(query: PrecioVigenteQuery) {
  const productoId = query.producto_id ?? (await getDefaultProductoId());
  const fecha = query.fecha ?? getCurrentDateInTimezone();
  const vigente = await obtenerPrecioVigente(productoId, fecha, query.cliente_id);

  return {
    precio: vigente.precio,
    precio_kg: vigente.precio_kg,
    fecha_desde: vigente.fecha_desde,
    producto_id: vigente.producto_id,
    cliente_id: vigente.cliente_id,
    precio_id: vigente.precio_id,
    origen: vigente.origen,
  };
}
