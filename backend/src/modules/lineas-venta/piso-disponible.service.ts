import { prisma } from "../../lib/prisma";

export const PISO_GRANJA_NOMBRE = "Piso";

export async function getPisoDisponible(jornadaId: number) {
  const [entradaAggregate, salidaAggregate] = await Promise.all([
    prisma.lineaVenta.aggregate({
      where: { jornada_id: jornadaId, origen: "piso", cliente_id: null },
      _sum: {
        jabas: true,
        peso_neto: true,
      },
    }),
    prisma.lineaVenta.aggregate({
      where: {
        jornada_id: jornadaId,
        origen: "partida",
        cliente_id: { not: null },
        granja: { nombre: PISO_GRANJA_NOMBRE },
      },
      _sum: {
        jabas: true,
        peso_neto: true,
      },
    }),
  ]);

  const entradaKg = entradaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const salidaKg = salidaAggregate._sum.peso_neto?.toNumber() ?? 0;
  const entradaJabas = entradaAggregate._sum.jabas ?? 0;
  const salidaJabas = salidaAggregate._sum.jabas ?? 0;

  return {
    peso_neto: Number((entradaKg - salidaKg).toFixed(2)),
    jabas: entradaJabas - salidaJabas,
  };
}
