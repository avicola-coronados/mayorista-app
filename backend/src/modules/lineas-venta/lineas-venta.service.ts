import {
  calcularPesoNeto,
  calcularTara,
  DEFAULT_TARA_POR_JABA,
} from "../../domain/pesadas/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { CreateLineaVentaInput } from "./lineas-venta.schemas";

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
  number,
  {
    cliente: {
      id: number;
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

  const [cliente, granja] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: data.cliente_id, activo: true },
    }),
    prisma.granja.findFirst({
      where: { id: data.granja_id, activo: true },
    }),
  ]);

  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }

  if (!granja) {
    throw new AppError("Granja no encontrada", 404);
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
      cliente_id: data.cliente_id,
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
    orderBy: [{ cliente: { nombre: "asc" } }, { created_at: "desc" }],
  });

  const grouped = lineas.reduce<LineasVentaGrouped>((accumulator, linea) => {
    const existing = accumulator[linea.cliente_id];
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
      accumulator[linea.cliente_id] = {
        cliente: {
          id: linea.cliente.id,
          nombre: linea.cliente.nombre,
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
