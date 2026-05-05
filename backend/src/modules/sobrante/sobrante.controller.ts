import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import { sobranteQuerySchema } from "./sobrante.schemas";
import { getSobranteByJornadaId } from "./sobrante.service";

export async function getSobranteByJornada(request: Request, response: Response) {
  const { jornada_id } = sobranteQuerySchema.parse(request.query);
  const sobrantes = await getSobranteByJornadaId(jornada_id);

  return response.json(serializePrisma(sobrantes));
}
