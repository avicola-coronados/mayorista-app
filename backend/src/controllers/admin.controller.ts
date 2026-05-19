import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { calculateJornadaMetrics } from "../modules/jornadas/jornadas.service";

const jornadaQuerySchema = z.object({
  jornada_id: z.coerce.number().int().positive("Jornada inválida"),
});

const mermaHistoricaQuerySchema = z.object({
  dias: z.coerce.number().int().min(1).max(30).default(7),
});

const topClientesQuerySchema = jornadaQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

const clienteJornadaParamsSchema = z.object({
  cliente_id: z.coerce.number().int().positive("Cliente inválido"),
  jornada_id: z.coerce.number().int().positive("Jornada inválida"),
});

const lineaVentaParamsSchema = z.object({
  id: z.coerce.number().int().positive("Pesada inválida"),
});

const updateLineaVentaSchema = z.object({
  granja_id: z.coerce.number().int().positive("Granja inválida"),
  origen: z.enum(["partida", "piso"], {
    message: "Origen debe ser partida o piso",
  }),
  jabas: z.coerce.number().int().positive("Jabas debe ser mayor a 0"),
  peso_bruto: z.coerce.number().positive("Peso bruto debe ser mayor a 0"),
  tara: z.coerce.number().min(0, "Tara no puede ser negativa"),
  tara_por_jaba: z.coerce.number().positive("Tara por jaba debe ser mayor a 0"),
});

function toNumber(value: unknown) {
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value ?? 0);
}

async function calculateAdminMetrics(jornadaId: number) {
  const metrics = await calculateJornadaMetrics(jornadaId);
  const entradaTotal = metrics.entrada_total_kg;
  const vendidoTotal = metrics.vendido_total_kg;
  const devolucionesTotal = metrics.devoluciones_total_kg;
  const mermaKg = metrics.piso_disponible_kg;
  const mermaPorcentaje =
    entradaTotal > 0 ? Math.min(100, Math.max(0, Number(((mermaKg / entradaTotal) * 100).toFixed(2)))) : 0;
  const mermaEstado =
    mermaPorcentaje < 1 ? "normal" : mermaPorcentaje < 2 ? "alta" : "critica";

  return {
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    devoluciones_kg: devolucionesTotal,
    piso_disponible_kg: metrics.piso_disponible_kg,
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
          entrada_total_kg: metrics.entrada_total_kg,
          merma_porcentaje: metrics.merma_porcentaje,
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
    where: { jornada_id: jornadaId, cliente_id: { not: null } },
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
          where: { id: row.cliente_id ?? 0 },
          select: { nombre: true },
        }),
        prisma.lineaVenta.findMany({
          where: { jornada_id: jornadaId, cliente_id: row.cliente_id ?? 0 },
          distinct: ["granja_id"],
          select: {
            granja: {
              select: { nombre: true },
            },
          },
        }),
        prisma.devolucion.findFirst({
          where: { jornada_id: jornadaId, cliente_id: row.cliente_id ?? 0 },
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

export async function getAdminPesadasConNotas(request: Request, response: Response) {
  const parsed = jornadaQuerySchema.safeParse(request.query);

  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const pesadas = await prisma.lineaVenta.findMany({
    where: {
      jornada_id: parsed.data.jornada_id,
      nota: { not: null },
    },
    include: {
      cliente: {
        select: { nombre: true },
      },
      granja: {
        select: { nombre: true },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return response.json({
    total: pesadas.length,
    pesadas_con_notas: pesadas.map((pesada) => ({
      id: pesada.id,
      cliente: pesada.cliente?.nombre ?? "Piso / Pesadas sin cliente",
      granja: pesada.granja.nombre,
      origen: pesada.origen,
      peso_neto: toNumber(pesada.peso_neto),
      nota: pesada.nota,
      hora: pesada.created_at.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: process.env.APP_TIMEZONE ?? "America/Lima",
      }),
    })),
  });
}

export async function getAdminLineasVentaPorCliente(request: Request, response: Response) {
  const parsed = clienteJornadaParamsSchema.safeParse(request.params);

  if (!parsed.success) {
    return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const { cliente_id: clienteId, jornada_id: jornadaId } = parsed.data;
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nombre: true },
  });

  if (!cliente) {
    return response.status(404).json({ message: "Cliente no encontrado" });
  }

  const pesadas = await prisma.lineaVenta.findMany({
    where: {
      cliente_id: clienteId,
      jornada_id: jornadaId,
    },
    include: {
      granja: {
        select: { nombre: true },
      },
    },
    orderBy: { created_at: "asc" },
  });

  return response.json({
    cliente,
    pesadas: pesadas.map((pesada) => ({
      id: pesada.id,
      granja_id: pesada.granja_id,
      granja: pesada.granja.nombre,
      origen: pesada.origen,
      jabas: pesada.jabas,
      peso_bruto: toNumber(pesada.peso_bruto),
      tara: toNumber(pesada.tara),
      tara_por_jaba: toNumber(pesada.tara_por_jaba),
      peso_neto: toNumber(pesada.peso_neto),
      nota: pesada.nota,
      hora: pesada.created_at.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: process.env.APP_TIMEZONE ?? "America/Lima",
      }),
    })),
  });
}

export async function updateAdminLineaVenta(request: Request, response: Response) {
  const params = lineaVentaParamsSchema.safeParse(request.params);
  const body = updateLineaVentaSchema.safeParse(request.body);

  if (!params.success) {
    return response.status(400).json({ message: params.error.issues[0]?.message ?? "Datos inválidos" });
  }

  if (!body.success) {
    return response.status(400).json({ message: body.error.issues[0]?.message ?? "Datos inválidos" });
  }

  const { id } = params.data;
  const { granja_id: granjaId, jabas, origen, peso_bruto: pesoBruto, tara, tara_por_jaba: taraPorJaba } = body.data;
  const lineaVenta = await prisma.lineaVenta.findUnique({
    where: { id },
    include: {
      jornada: {
        select: { estado: true },
      },
    },
  });

  if (!lineaVenta) {
    return response.status(404).json({ message: "Pesada no encontrada" });
  }

  if (lineaVenta.jornada.estado === "cerrada") {
    return response.status(400).json({
      message: "No se puede editar una pesada de una jornada cerrada",
      code: "JORNADA_CLOSED",
    });
  }

  if (pesoBruto <= tara) {
    return response.status(400).json({ message: "Peso bruto debe ser mayor que tara" });
  }

  const granja = await prisma.granja.findUnique({
    where: { id: granjaId },
    select: { id: true },
  });

  if (!granja) {
    return response.status(404).json({ message: "Granja no encontrada" });
  }

  const pesoNeto = Number((pesoBruto - tara).toFixed(2));
  const updated = await prisma.lineaVenta.update({
    where: { id },
    data: {
      granja_id: granjaId,
      origen,
      jabas,
      peso_bruto: pesoBruto,
      tara,
      tara_por_jaba: taraPorJaba,
      peso_neto: pesoNeto,
    },
    include: {
      cliente: { select: { nombre: true } },
      granja: { select: { nombre: true } },
    },
  });

  return response.json({
    mensaje: "Pesada actualizada correctamente",
    linea_venta: {
      id: updated.id,
      jornada_id: updated.jornada_id,
      cliente_id: updated.cliente_id,
      cliente_nombre: updated.cliente?.nombre ?? null,
      granja_id: updated.granja_id,
      granja: updated.granja.nombre,
      origen: updated.origen,
      jabas: updated.jabas,
      peso_bruto: toNumber(updated.peso_bruto),
      tara: toNumber(updated.tara),
      tara_por_jaba: toNumber(updated.tara_por_jaba),
      peso_neto: toNumber(updated.peso_neto),
      nota: updated.nota,
      created_at: updated.created_at,
    },
  });
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
