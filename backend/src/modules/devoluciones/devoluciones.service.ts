import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { syncDevolucionKgForLineaVenta } from "../guias/guias-sync.service";
import {
  CreateDevolucionDesdePesadaInput,
  CreateDevolucionInput,
} from "./devoluciones.schemas";

function isDesdePesadaInput(data: CreateDevolucionInput): data is CreateDevolucionDesdePesadaInput {
  return "linea_venta_id" in data && typeof data.linea_venta_id === "number";
}

export async function createDevolucion(data: CreateDevolucionInput) {
  if (isDesdePesadaInput(data)) {
    return createDevolucionDesdePesada(data);
  }

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

  return serializeDevolucion(devolucion);
}

async function createDevolucionDesdePesada(data: CreateDevolucionDesdePesadaInput) {
  const lineaVenta = await prisma.lineaVenta.findFirst({
    where: { id: data.linea_venta_id, deleted_at: null },
    include: {
      jornada: { select: { id: true, estado: true } },
      cliente: { select: { id: true, nombre: true, activo: true } },
      granja: { select: { nombre: true } },
    },
  });

  if (!lineaVenta) {
    throw new AppError("Pesada no encontrada", 404, "LINEA_VENTA_NOT_FOUND");
  }

  if (!lineaVenta.cliente_id || !lineaVenta.cliente) {
    throw new AppError("La pesada no tiene un cliente asignado", 400, "CLIENTE_REQUIRED");
  }

  if (!lineaVenta.cliente.activo) {
    throw new AppError("El cliente no está activo", 400, "CLIENTE_INACTIVE");
  }

  if (lineaVenta.jornada.estado === "cerrada") {
    throw new AppError(
      "No se pueden registrar devoluciones en una jornada cerrada",
      403,
      "JORNADA_CLOSED",
    );
  }

  const pesoNetoPesada = Number(lineaVenta.peso_neto);
  const devueltoPrevio = await prisma.devolucion.aggregate({
    where: { linea_venta_id: lineaVenta.id },
    _sum: { peso_neto: true },
  });
  const yaDevuelto = Number(devueltoPrevio._sum.peso_neto ?? 0);
  const disponible = Number((pesoNetoPesada - yaDevuelto).toFixed(2));

  if (data.peso_neto > disponible + 0.001) {
    throw new AppError(
      `Los kg a devolver no pueden superar el neto disponible (${disponible.toFixed(1)} kg)`,
      400,
      "EXCEDE_NETO_PESADA",
    );
  }

  const devolucion = await prisma.devolucion.create({
    data: {
      jornada_id: lineaVenta.jornada_id,
      cliente_id: lineaVenta.cliente_id,
      linea_venta_id: lineaVenta.id,
      tipo: data.tipo,
      jabas: lineaVenta.jabas,
      peso_bruto: data.peso_neto,
      tara: 0,
      peso_neto: data.peso_neto,
    },
    include: {
      cliente: true,
      linea_venta: { include: { granja: true } },
    },
  });

  await syncDevolucionKgForLineaVenta(lineaVenta.id);

  return serializeDevolucion(devolucion, {
    pesada_label: formatPesadaLabel(lineaVenta),
  });
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

  const lineaVentaId = devolucion.linea_venta_id;

  await prisma.devolucion.delete({ where: { id } });

  if (lineaVentaId) {
    await syncDevolucionKgForLineaVenta(lineaVentaId);
  }

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

function formatPesadaLabel(lineaVenta: {
  origen: "partida" | "piso";
  granja: { nombre: string };
}) {
  const origenLabel = lineaVenta.origen === "partida" ? "Partida" : "Piso";
  return `${origenLabel} · ${lineaVenta.granja.nombre}`;
}

function serializeDevolucion(
  devolucion: {
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
    linea_venta?: {
      origen: "partida" | "piso";
      granja: { nombre: string };
    } | null;
  },
  extra?: { pesada_label?: string },
) {
  const pesadaLabel =
    extra?.pesada_label ??
    (devolucion.linea_venta ? formatPesadaLabel(devolucion.linea_venta) : undefined);

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
    pesada_label: pesadaLabel,
  };
}
