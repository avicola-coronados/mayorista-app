import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getCurrentJornadaCode } from "../utils/date";
import { serializePrisma } from "../utils/serializers";
import { z } from "zod";

async function calculateJornadaMetrics(jornadaId: number) {
  const [entradaAggregate, ventaAggregate, devolucionAggregate, sobranteAggregate, counts] =
    await Promise.all([
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
      prisma.sobrante.aggregate({
        where: { jornada_id: jornadaId },
        _sum: { peso_neto: true },
      }),
      prisma.lineaVenta.groupBy({
        by: ["cliente_id"],
        where: { jornada_id: jornadaId },
        _count: { _all: true },
      }),
    ]);

  const entradaTotal = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const vendidoTotal = ventaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const devolucionesTotal = devolucionAggregate._sum.peso_neto?.toNumber() ?? 0;
  const sobranteTotal = sobranteAggregate._sum.peso_neto?.toNumber() ?? 0;
  const clientesAtendidos = counts.length;
  const pesadasRealizadas = counts.reduce((accumulator, item) => accumulator + item._count._all, 0);
  const promedioPorCliente =
    clientesAtendidos > 0 ? Number((vendidoTotal / clientesAtendidos).toFixed(2)) : 0;

  return {
    entrada_total_kg: entradaTotal,
    vendido_total_kg: vendidoTotal,
    piso_disponible_kg: sobranteTotal,
    devoluciones_total_kg: devolucionesTotal,
    sobrante_total_kg: sobranteTotal,
    clientes_atendidos: clientesAtendidos,
    pesadas_realizadas: pesadasRealizadas,
    promedio_por_cliente: promedioPorCliente,
  };
}

export async function getOrCreateActiveJornada() {
  const codigo = getCurrentJornadaCode();

  return prisma.jornada.upsert({
    where: { codigo },
    update: {},
    create: {
      codigo,
      fecha: new Date(),
      estado: "abierta",
    },
  });
}

const cierreSchema = z.object({
  desperdicio_kg: z.coerce.number().min(0, "El desperdicio debe ser positivo"),
  muertero_kg: z.coerce.number().min(0, "El muertero debe ser positivo"),
});

export async function getActiveJornada(_request: Request, response: Response) {
  const jornada = await getOrCreateActiveJornada();
  return response.json(serializePrisma(jornada));
}

export async function getJornadaMetricas(request: Request, response: Response) {
  const jornadaId = Number(request.params.id);

  if (Number.isNaN(jornadaId)) {
    return response.status(400).json({ message: "Jornada inválida" });
  }

  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    return response.status(404).json({ message: "Jornada no encontrada" });
  }

  const metrics = await calculateJornadaMetrics(jornadaId);
  return response.json(metrics);
}

export async function closeJornada(request: Request, response: Response) {
  const jornadaId = Number(request.params.id);

  if (Number.isNaN(jornadaId)) {
    return response.status(400).json({ message: "Jornada inválida" });
  }

  const parsed = cierreSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    });
  }

  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    return response.status(404).json({ message: "Jornada no encontrada" });
  }

  if (jornada.estado === "cerrada") {
    return response.status(400).json({ message: "La jornada ya está cerrada" });
  }

  const metrics = await calculateJornadaMetrics(jornadaId);
  const merma =
    metrics.entrada_total_kg -
    metrics.vendido_total_kg +
    metrics.devoluciones_total_kg -
    metrics.sobrante_total_kg -
    parsed.data.desperdicio_kg -
    parsed.data.muertero_kg;
  const mermaPorcentaje =
    metrics.entrada_total_kg > 0
      ? Number(((merma / metrics.entrada_total_kg) * 100).toFixed(2))
      : 0;

  await prisma.jornada.update({
    where: { id: jornadaId },
    data: {
      estado: "cerrada",
      desperdicio_kg: parsed.data.desperdicio_kg,
      muertero_kg: parsed.data.muertero_kg,
    },
  });

  return response.json({
    success: true,
    merma_kg: Number(merma.toFixed(2)),
    merma_porcentaje: mermaPorcentaje,
  });
}
