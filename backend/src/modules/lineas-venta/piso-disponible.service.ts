import { prisma } from "../../lib/prisma";

export const PISO_GRANJA_NOMBRE = "Piso";

export async function getPisoDisponible(jornadaId: number) {
  const [entradaAggregate, salidaAggregate] = await Promise.all([
    prisma.lineaVenta.aggregate({
      where: { jornada_id: jornadaId, origen: "piso", deleted_at: null },
      _sum: {
        peso_neto: true,
      },
    }),
    prisma.lineaVenta.aggregate({
      where: {
        jornada_id: jornadaId,
        cliente_id: { not: null },
        deleted_at: null,
        es_distribucion_pelado: false,
        OR: [
          { origen: "piso" },
          {
            origen: "partida",
            granja: { nombre: { equals: PISO_GRANJA_NOMBRE, mode: "insensitive" } },
          },
        ],
      },
      _sum: {
        peso_neto: true,
      },
    }),
  ]);

  const entradaKg = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const salidaKg = salidaAggregate._sum.peso_neto?.toNumber() ?? 0;

  return {
    peso_neto: Math.max(0, Number((entradaKg - salidaKg).toFixed(2))),
  };
}
