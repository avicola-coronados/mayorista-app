import { AppError } from "../../errors/AppError";
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
  return "jornada_id" in data && "cliente_id" in data && !("peso_bruto" in data);
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

  const devolucion = await prisma.devolucion.create({
    data: {
      jornada_id: data.jornada_id,
      cliente_id: data.cliente_id,
      tipo: data.tipo,
      jabas: data.jabas ?? null,
      peso_bruto: data.peso_bruto,
      tara: data.tara,
      peso_neto: data.peso_neto,
    },
    include: {
      cliente: true,
    },
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

  const lineasVenta = await prisma.lineaVenta.findMany({
    where: {
      jornada_id: data.jornada_id,
      cliente_id: data.cliente_id,
      deleted_at: null,
    },
    select: { peso_neto: true },
  });

  if (lineasVenta.length === 0) {
    throw new AppError("El cliente no tiene pesadas registradas en esta jornada", 400);
  }

  const netoTotalCliente = lineasVenta.reduce((sum, linea) => sum + Number(linea.peso_neto), 0);

  const devueltoPrevio = await prisma.devolucion.aggregate({
    where: {
      jornada_id: data.jornada_id,
      cliente_id: data.cliente_id,
    },
    _sum: { peso_neto: true },
  });

  const yaDevuelto = Number(devueltoPrevio._sum.peso_neto ?? 0);
  const disponible = Number((netoTotalCliente - yaDevuelto).toFixed(2));

  if (data.peso_neto > disponible + 0.001) {
    throw new AppError(
      `Los kg a devolver no pueden superar el neto disponible (${disponible.toFixed(1)} kg)`,
      400,
      "EXCEDE_NETO_CLIENTE",
    );
  }

  const devolucion = await prisma.devolucion.create({
    data: {
      jornada_id: data.jornada_id,
      cliente_id: data.cliente_id,
      tipo: data.tipo,
      jabas: null,
      peso_bruto: data.peso_neto,
      tara: 0,
      peso_neto: data.peso_neto,
    },
    include: {
      cliente: true,
    },
  });

  await syncDevolucionKgForCliente(data.jornada_id, data.cliente_id);

  return serializeDevolucion(devolucion);
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
