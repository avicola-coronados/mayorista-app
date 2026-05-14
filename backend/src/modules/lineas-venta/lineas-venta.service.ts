import {
  calcularPesoNeto,
  calcularTara,
  DEFAULT_TARA_POR_JABA,
} from "../../domain/pesadas/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { CreateLineaVentaInput } from "./lineas-venta.schemas";

const PISO_GRANJA_NOMBRE = "Piso";

type LineaVentaDetalle = {
  id: number;
  origen: "partida" | "piso";
  jabas: number;
  peso_bruto: number;
  tara: number;
  tara_por_jaba: number;
  peso_neto: number;
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

  const clienteId = data.origen === "piso" ? null : data.cliente_id!;

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
        lineas: [detail],
      };
      return accumulator;
    }

    existing.total_kg = Number((existing.total_kg + pesoNeto).toFixed(2));
    existing.pesadas += 1;
    existing.lineas.push(detail);
    return accumulator;
  }, {});

  return Object.values(grouped);
}
