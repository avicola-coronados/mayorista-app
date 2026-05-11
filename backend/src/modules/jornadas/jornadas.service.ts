import {
  calcularMerma,
  calcularPorcentajeMerma,
} from "../../domain/pesadas/calculos";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { getCurrentJornadaCode } from "../../utils/date";
import { CierreJornadaInput } from "./jornadas.schemas";

export async function calculateJornadaMetrics(jornadaId: number) {
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

export async function getJornadaMetricasById(jornadaId: number) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  return calculateJornadaMetrics(jornadaId);
}

export async function closeJornadaById(jornadaId: number, data: CierreJornadaInput) {
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId } });

  if (!jornada) {
    throw new AppError("Jornada no encontrada", 404);
  }

  if (jornada.estado === "cerrada") {
    throw new AppError("La jornada ya está cerrada", 400);
  }

  const metrics = await calculateJornadaMetrics(jornadaId);
  const merma = calcularMerma({
    entradaKg: metrics.entrada_total_kg,
    vendidoKg: metrics.vendido_total_kg,
    devolucionesKg: metrics.devoluciones_total_kg,
    sobranteKg: metrics.sobrante_total_kg,
    desperdicioKg: data.desperdicio_kg,
    muerteroKg: data.muertero_kg,
  });
  const mermaPorcentaje = calcularPorcentajeMerma(merma, metrics.entrada_total_kg);

  await prisma.jornada.update({
    where: { id: jornadaId },
    data: {
      estado: "cerrada",
      desperdicio_kg: data.desperdicio_kg,
      muertero_kg: data.muertero_kg,
    },
  });

  return {
    success: true,
    merma_kg: merma,
    merma_porcentaje: mermaPorcentaje,
  };
}
