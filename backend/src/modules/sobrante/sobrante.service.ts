import { prisma } from "../../lib/prisma";

export function getSobranteByJornadaId(jornadaId: number) {
  return prisma.sobrante.findMany({
    where: { jornada_id: jornadaId },
    select: {
      id: true,
      jabas: true,
      peso_neto: true,
    },
    orderBy: { created_at: "asc" },
  });
}
