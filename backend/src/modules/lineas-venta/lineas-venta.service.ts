import {
  calcularPesoNeto,
  calcularTara,
  DEFAULT_TARA_POR_JABA,
} from "../../domain/pesadas/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getPisoDisponible, PISO_GRANJA_NOMBRE } from "./piso-disponible.service";
import { CreateLineaVentaInput, UpdateNotaLineaVentaInput } from "./lineas-venta.schemas";

type LineaVentaDetalle = {
  id: number;
  origen: "partida" | "piso";
  jabas: number;
  peso_bruto: number;
  tara: number;
  tara_por_jaba: number;
  peso_neto: number;
  nota: string | null;
  tiene_nota: boolean;
  created_at: string;
  granja: {
    id: number;
    nombre: string;
  };
  usa_tara_personalizada: boolean;
};

type LineasVentaGrouped = Record<
  string,
  {
    cliente: {
      id: number | null;
      nombre: string;
    };
    total_kg: number;
    pesadas: number;
    lineas: LineaVentaDetalle[];
    tiene_notas: boolean;
  }
>;

export async function createLineaVenta(data: CreateLineaVentaInput) {
  const jornada = await prisma.jornada.findUnique({
    where: { id: data.jornada_id },
  });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  if (jornada.estado === "cerrada") {
    throw new AppError("La jornada ya está cerrada", 400);
  }

  if (data.origen === "partida" && !data.cliente_id) {
    throw new AppError("Selecciona un cliente para registrar una partida", 400);
  }

  const clienteId = data.cliente_id ?? null;

  const [cliente, granja] = await Promise.all([
    clienteId
      ? prisma.cliente.findFirst({
          where: { id: clienteId, activo: true },
        })
      : Promise.resolve(null),
    prisma.granja.findFirst({
      where: { id: data.granja_id, activo: true },
    }),
  ]);

  if (clienteId && !cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  if (!granja) {
    throw new AppError("Granja no encontrada", 404);
  }

  if (data.origen === "piso" && granja.nombre.toLowerCase() === PISO_GRANJA_NOMBRE.toLowerCase()) {
    throw new AppError("No puedes registrar ingreso a piso usando el proveedor Piso", 400);
  }

  const tara = calcularTara(data.jabas, data.tara_por_jaba);
  const pesoNeto = calcularPesoNeto(data.peso_bruto, tara);

  if (pesoNeto <= 0) {
    throw new AppError(
      "El peso neto debe ser mayor a cero. Revisa jabas, tara o peso bruto.",
      400,
    );
  }

  if (data.origen === "partida" && granja.nombre.toLowerCase() === PISO_GRANJA_NOMBRE.toLowerCase()) {
    const pisoDisponible = await getPisoDisponible(data.jornada_id);

    if (pesoNeto > pisoDisponible.peso_neto) {
      throw new AppError(
        `No se tiene disponibilidad suficiente en piso. Disponible: ${pisoDisponible.peso_neto.toFixed(2)} kg.`,
        400,
      );
    }
  }

  return prisma.lineaVenta.create({
    data: {
      jornada_id: data.jornada_id,
      cliente_id: clienteId,
      granja_id: data.granja_id,
      origen: data.origen,
      jabas: data.jabas,
      peso_bruto: data.peso_bruto,
      tara,
      tara_por_jaba: data.tara_por_jaba,
      peso_neto: pesoNeto,
    },
    include: {
      cliente: true,
      granja: true,
    },
  });
}

export async function getLineasVentaGrouped(jornadaId: number) {
  const lineas = await prisma.lineaVenta.findMany({
    where: { jornada_id: jornadaId },
    include: {
      cliente: true,
      granja: true,
    },
    orderBy: [{ created_at: "desc" }],
  });

  const grouped = lineas.reduce<LineasVentaGrouped>((accumulator, linea) => {
    const groupKey = linea.cliente_id ? String(linea.cliente_id) : "piso-sin-cliente";
    const existing = accumulator[groupKey];
    const taraPorJaba = linea.tara_por_jaba.toNumber();
    const pesoNeto = linea.peso_neto.toNumber();

    const detail: LineaVentaDetalle = {
      id: linea.id,
      origen: linea.origen,
      jabas: linea.jabas,
      peso_bruto: linea.peso_bruto.toNumber(),
      tara: linea.tara.toNumber(),
      tara_por_jaba: taraPorJaba,
      peso_neto: pesoNeto,
      nota: linea.nota,
      tiene_nota: Boolean(linea.nota),
      created_at: linea.created_at.toISOString(),
      granja: {
        id: linea.granja.id,
        nombre: linea.granja.nombre,
      },
      usa_tara_personalizada: Math.abs(taraPorJaba - DEFAULT_TARA_POR_JABA) > 0.001,
    };

    if (!existing) {
      accumulator[groupKey] = {
        cliente: {
          id: linea.cliente?.id ?? null,
          nombre: linea.cliente?.nombre ?? "Piso / Pesadas sin cliente",
        },
        total_kg: pesoNeto,
        pesadas: 1,
        tiene_notas: Boolean(linea.nota),
        lineas: [detail],
      };
      return accumulator;
    }

    existing.total_kg = Number((existing.total_kg + pesoNeto).toFixed(2));
    existing.pesadas += 1;
    existing.tiene_notas = existing.tiene_notas || Boolean(linea.nota);
    existing.lineas.push(detail);
    return accumulator;
  }, {});

  return Object.values(grouped);
}

export async function updateLineaVentaNota(id: number, data: UpdateNotaLineaVentaInput) {
  const lineaVenta = await prisma.lineaVenta.findUnique({
    where: { id },
    include: {
      jornada: {
        select: { estado: true },
      },
    },
  });

  if (!lineaVenta) {
    throw new AppError("Pesada no encontrada", 404);
  }

  if (lineaVenta.jornada.estado === "cerrada") {
    throw new AppError("No se pueden editar notas de una jornada cerrada", 400, "JORNADA_CLOSED");
  }

  const nota = data.nota?.trim() || null;
  const updated = await prisma.lineaVenta.update({
    where: { id },
    data: { nota },
    include: {
      cliente: true,
      granja: true,
    },
  });

  return {
    mensaje: nota ? "Nota guardada correctamente" : "Nota eliminada",
    linea_venta: updated,
  };
}
