import { AppError } from "../../errors/AppError";
import { calcularTara, roundKg } from "../../domain/pesadas/calculos";
import { prisma } from "../../lib/prisma";
import { syncDevolucionKgForCliente } from "../guias/guias-sync.service";
import type { z } from "zod";
import {
  CreateDevolucionClienteInput,
  CreateDevolucionInput,
  devolucionLegacySchema,
} from "./devoluciones.schemas";

type CreateDevolucionLegacyInput = z.infer<typeof devolucionLegacySchema>;

function isClienteInput(data: CreateDevolucionInput): data is CreateDevolucionClienteInput {
  return "tara_por_jaba" in data;
}

export async function createDevolucion(data: CreateDevolucionInput) {
  if (isClienteInput(data)) {
    return createDevolucionCliente(data);
  }

  return createDevolucionLegacy(data);
}

async function createDevolucionLegacy(data: CreateDevolucionLegacyInput) {
  if (data.peso_neto <= 0 || data.peso_neto > data.peso_bruto) {
    throw new AppError(
      "El peso neto no puede ser negativo. Verifica peso bruto y tara.",
      400,
      "INVALID_PESO_NETO",
    );
  }

  const [jornada, cliente] = await Promise.all([
    prisma.jornada.findUnique({ where: { id: data.jornada_id } }),
    prisma.cliente.findFirst({ where: { id: data.cliente_id, activo: true } }),
  ]);

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404, "JORNADA_NOT_FOUND");
  }

  if (jornada.estado === "cerrada") {
    throw new AppError(
      "No se pueden registrar devoluciones en una jornada cerrada",
      403,
      "JORNADA_CLOSED",
    );
  }

  if (!cliente) {
    throw new AppError(
      "El cliente seleccionado no existe o está inactivo",
      404,
      "CLIENTE_NOT_FOUND",
    );
  }

  await validateDevolucionDisponible(data.jornada_id, data.cliente_id, {
    jabas: data.jabas,
    peso_bruto: data.peso_bruto,
    peso_neto: data.peso_neto,
  });

  const devolucion = await createDevolucionConPesadaPiso({
    jornada_id: data.jornada_id,
    cliente_id: data.cliente_id,
    cliente_nombre: cliente.nombre,
    tipo: data.tipo,
    jabas: data.jabas,
    peso_bruto: data.peso_bruto,
    tara: data.tara,
    tara_por_jaba: data.jabas > 0 && data.tara > 0 ? roundKg(data.tara / data.jabas) : 0,
    peso_neto: data.peso_neto,
  });

  await syncDevolucionKgForCliente(data.jornada_id, data.cliente_id);

  return serializeDevolucion(devolucion);
}

async function createDevolucionCliente(data: CreateDevolucionClienteInput) {
  const [jornada, cliente] = await Promise.all([
    prisma.jornada.findUnique({ where: { id: data.jornada_id } }),
    prisma.cliente.findFirst({ where: { id: data.cliente_id, activo: true } }),
  ]);

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404, "JORNADA_NOT_FOUND");
  }

  if (jornada.estado === "cerrada") {
    throw new AppError(
      "No se pueden registrar devoluciones en una jornada cerrada",
      403,
      "JORNADA_CLOSED",
    );
  }

  if (!cliente) {
    throw new AppError(
      "El cliente seleccionado no existe o está inactivo",
      404,
      "CLIENTE_NOT_FOUND",
    );
  }

  const tara = calcularTara(data.jabas, data.tara_por_jaba);
  const pesoNeto = roundKg(data.peso_bruto - tara);

  if (pesoNeto <= 0) {
    throw new AppError("El peso bruto debe ser mayor que la tara total", 400, "INVALID_PESO_NETO");
  }

  await validateDevolucionDisponible(data.jornada_id, data.cliente_id, {
    jabas: data.jabas,
    peso_bruto: data.peso_bruto,
    peso_neto: pesoNeto,
  });

  const devolucion = await createDevolucionConPesadaPiso({
    jornada_id: data.jornada_id,
    cliente_id: data.cliente_id,
    cliente_nombre: cliente.nombre,
    tipo: data.tipo,
    jabas: data.jabas,
    peso_bruto: data.peso_bruto,
    tara,
    tara_por_jaba: data.tara_por_jaba,
    peso_neto: pesoNeto,
  });

  await syncDevolucionKgForCliente(data.jornada_id, data.cliente_id);

  return serializeDevolucion(devolucion);
}

async function createDevolucionConPesadaPiso(data: {
  jornada_id: number;
  cliente_id: number;
  cliente_nombre: string;
  tipo: "pelado" | "muerto" | "vivo";
  jabas: number;
  peso_bruto: number;
  tara: number;
  tara_por_jaba: number;
  peso_neto: number;
}) {
  return prisma.$transaction(async (transaction) => {
    const devolucion = await transaction.devolucion.create({
      data: {
        jornada_id: data.jornada_id,
        cliente_id: data.cliente_id,
        tipo: data.tipo,
        jabas: data.jabas,
        peso_bruto: data.peso_bruto,
        tara: data.tara,
        peso_neto: data.peso_neto,
      },
      include: { cliente: true },
    });

    if (data.tipo === "vivo") {
      const granjaPiso = await transaction.granja.findFirst({
        where: { nombre: { equals: "Piso", mode: "insensitive" } },
        select: { id: true },
      });

      if (!granjaPiso) {
        throw new AppError("No se encontró la granja Piso para reincorporar la devolución", 500);
      }

      await transaction.lineaVenta.create({
        data: {
          jornada_id: data.jornada_id,
          cliente_id: null,
          granja_id: granjaPiso.id,
          origen: "piso",
          jabas: data.jabas,
          peso_bruto: data.peso_bruto,
          tara: data.tara,
          tara_por_jaba: data.tara_por_jaba,
          peso_neto: data.peso_neto,
          nota: `Devolución viva de ${data.cliente_nombre}`,
          devolucion_origen_id: devolucion.id,
        },
      });
    }

    return devolucion;
  });
}

async function validateDevolucionDisponible(
  jornadaId: number,
  clienteId: number,
  devolucion: { jabas: number; peso_bruto: number; peso_neto: number },
) {
  const [ventas, devueltoPrevio] = await Promise.all([
    prisma.lineaVenta.aggregate({
      where: { jornada_id: jornadaId, cliente_id: clienteId, deleted_at: null },
      _count: { _all: true },
      _sum: { jabas: true, peso_bruto: true, peso_neto: true },
    }),
    prisma.devolucion.aggregate({
      where: { jornada_id: jornadaId, cliente_id: clienteId },
      _sum: { jabas: true, peso_bruto: true, peso_neto: true },
    }),
  ]);

  if (ventas._count._all === 0) {
    throw new AppError("El cliente no tiene pesadas registradas en esta jornada", 400);
  }

  const disponible = {
    jabas: (ventas._sum.jabas ?? 0) - (devueltoPrevio._sum.jabas ?? 0),
    peso_bruto: roundKg(
      Number(ventas._sum.peso_bruto ?? 0) - Number(devueltoPrevio._sum.peso_bruto ?? 0),
    ),
    peso_neto: roundKg(
      Number(ventas._sum.peso_neto ?? 0) - Number(devueltoPrevio._sum.peso_neto ?? 0),
    ),
  };

  if (devolucion.jabas > disponible.jabas) {
    throw new AppError(
      `Las jabas a devolver no pueden superar las disponibles (${disponible.jabas})`,
      400,
      "EXCEDE_JABAS_CLIENTE",
    );
  }

  if (devolucion.peso_bruto > disponible.peso_bruto + 0.001) {
    throw new AppError(
      `El peso bruto a devolver no puede superar el disponible (${disponible.peso_bruto.toFixed(2)} kg)`,
      400,
      "EXCEDE_BRUTO_CLIENTE",
    );
  }

  if (devolucion.peso_neto > disponible.peso_neto + 0.001) {
    throw new AppError(
      `El peso neto a devolver no puede superar el disponible (${disponible.peso_neto.toFixed(2)} kg)`,
      400,
      "EXCEDE_NETO_CLIENTE",
    );
  }
}

export async function deleteDevolucion(id: number) {
  const devolucion = await prisma.devolucion.findUnique({
    where: { id },
    include: { jornada: true },
  });

  if (!devolucion) {
    throw new AppError("Devolución no encontrada", 404, "DEVOLUCION_NOT_FOUND");
  }

  if (devolucion.jornada.estado === "cerrada") {
    throw new AppError(
      "No se puede eliminar una devolución de una jornada cerrada",
      403,
      "JORNADA_CLOSED",
    );
  }

  const { jornada_id, cliente_id } = devolucion;

  await prisma.devolucion.delete({ where: { id } });

  await syncDevolucionKgForCliente(jornada_id, cliente_id);

  return { mensaje: "Devolución eliminada" };
}

export async function listDevolucionesByJornada(jornadaId: number) {
  const devoluciones = await prisma.devolucion.findMany({
    where: { jornada_id: jornadaId },
    include: { cliente: true },
    orderBy: { created_at: "desc" },
  });
  const serialized = devoluciones.map((item) => serializeDevolucion(item));
  const totalKg = serialized.reduce((accumulator, devolucion) => accumulator + devolucion.peso_neto, 0);

  return {
    devoluciones: serialized,
    total_registros: serialized.length,
    total_kg: Number(totalKg.toFixed(2)),
  };
}

function serializeDevolucion(devolucion: {
  id: number;
  jornada_id: number;
  cliente_id: number;
  linea_venta_id?: number | null;
  tipo: "pelado" | "muerto" | "vivo";
  jabas: number | null;
  peso_bruto: { toNumber(): number };
  tara: { toNumber(): number };
  peso_neto: { toNumber(): number };
  created_at: Date;
  cliente: { nombre: string };
}) {
  return {
    id: devolucion.id,
    jornada_id: devolucion.jornada_id,
    cliente_id: devolucion.cliente_id,
    cliente_nombre: devolucion.cliente.nombre,
    linea_venta_id: devolucion.linea_venta_id ?? null,
    tipo: devolucion.tipo,
    jabas: devolucion.jabas,
    peso_bruto: devolucion.peso_bruto.toNumber(),
    tara: devolucion.tara.toNumber(),
    peso_neto: devolucion.peso_neto.toNumber(),
    created_at: devolucion.created_at,
  };
}
