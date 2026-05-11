import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const jornadaQuerySchema = z.object({
  jornada_id: z.coerce.number().int().positive("Jornada inválida"),
});

const mermaHistoricaQuerySchema = z.object({
  dias: z.coerce.number().int().min(1).max(30).default(7),
});

const topClientesQuerySchema = jornadaQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

function toNumber(value: unknown) {
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

async function calculateAdminMetrics(jornadaId: number) {
  const [entradaAggregate, ventaAggregate, devolucionAggregate] = await Promise.all([
    prisma.entradaGranja.aggregate({
      where: { jornada_id: jornadaId },
      _sum: { peso_neto: true },
    }),
    prisma.lineaVenta.aggregate({
      where: { jornada_id: jornadaId },
      _sum: { peso_neto: true },
    }),
    prisma.devolucion.aggregate({
      where: { jornada_id: jornadaId },
      _sum: { peso_neto: true },
    }),
  ]);

  const entradaTotal = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const vendidoTotal = ventaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const devolucionesTotal = devolucionAggregate._sum.peso_neto?.toNumber() ?? 0;
  const mermaKg = Number((entradaTotal - vendidoTotal - devolucionesTotal).toFixed(2));
  const mermaPorcentaje =
    entradaTotal > 0 ? Number(((mermaKg / entradaTotal) * 100).toFixed(2)) : 0;
  const mermaEstado =
    mermaPorcentaje < 1 ? "normal" : mermaPorcentaje < 2 ? "alta" : "critica";

  return {
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    devoluciones_kg: devolucionesTotal,
    merma_estimada_kg: mermaKg,
    merma_porcentaje: mermaPorcentaje,
    merma_estado: mermaEstado,
    ultima_actualizacion: new Date().toISOString(),
  };
}

export async function getAdminMetricasDashboard(request: Request, response: Response) {
  const parsed = jornadaQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const jornada = await prisma.jornada.findUnique({ where: { id: parsed.data.jornada_id } });

  if (!jornada) {
    return response.status(404).json({ message: "Jornada no encontrada" });
  }

  const metrics = await calculateAdminMetrics(parsed.data.jornada_id);
  return response.json(metrics);
}

export async function getAdminMermaHistorica(request: Request, response: Response) {
  const parsed = mermaHistoricaQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const jornadas = await prisma.jornada.findMany({
    orderBy: { fecha: "desc" },
    take: parsed.data.dias,
    select: { id: true, fecha: true },
  });

  const rows = await Promise.all(
    jornadas
      .sort((left, right) => left.fecha.getTime() - right.fecha.getTime())
      .map(async (jornada) => {
        const metrics = await calculateAdminMetrics(jornada.id);

        return {
          dia: Number(
            new Intl.DateTimeFormat("es-PE", {
              day: "2-digit",
              timeZone: process.env.APP_TIMEZONE ?? "America/Lima",
            }).format(jornada.fecha),
          ),
          merma_kg: metrics.merma_estimada_kg,
        };
      }),
  );

  return response.json({ datos: rows });
}

export async function getAdminTopClientes(request: Request, response: Response) {
  const parsed = topClientesQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const { jornada_id: jornadaId, limit } = parsed.data;

  const rows = await prisma.lineaVenta.groupBy({
    by: ["cliente_id"],
    where: { jornada_id: jornadaId },
    _sum: {
      jabas: true,
      peso_neto: true,
    },
    orderBy: {
      _sum: {
        peso_neto: "desc",
      },
    },
    take: limit,
  });

  const clientes = await Promise.all(
    rows.map(async (row) => {
      const [cliente, granjas, devolucion] = await Promise.all([
        prisma.cliente.findUnique({
          where: { id: row.cliente_id },
          select: { nombre: true },
        }),
        prisma.lineaVenta.findMany({
          where: { jornada_id: jornadaId, cliente_id: row.cliente_id },
          distinct: ["granja_id"],
          select: {
            granja: {
              select: { nombre: true },
            },
          },
        }),
        prisma.devolucion.findFirst({
          where: { jornada_id: jornadaId, cliente_id: row.cliente_id },
          select: { id: true },
        }),
      ]);

      return {
        nombre: cliente?.nombre ?? "Cliente",
        jabas: row._sum.jabas ?? 0,
        granjas: granjas.map((item) => shortGranjaName(item.granja.nombre)).join("+"),
        kg_neto: toNumber(row._sum.peso_neto),
        estado: devolucion ? "Dev." : "OK",
      };
    }),
  );

  return response.json({ clientes });
}

function shortGranjaName(name: string) {
  const match = name.match(/(\d+)/);

  if (match) {
    return `R${match[1]}`;
  }

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
