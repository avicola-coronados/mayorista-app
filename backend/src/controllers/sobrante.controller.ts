import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { serializePrisma } from "../utils/serializers";

export async function getSobranteByJornada(request: Request, response: Response) {
  const jornadaId = Number(request.query.jornada_id);

  if (Number.isNaN(jornadaId) || jornadaId <= 0) {
    return response.status(400).json({ message: "Jornada inválida" });
  }

  const sobrantes = await prisma.sobrante.findMany({
    where: { jornada_id: jornadaId },
    select: {
      id: true,
      jabas: true,
      peso_neto: true,
    },
    orderBy: { created_at: "asc" },
  });

  return response.json(serializePrisma(sobrantes));
}
