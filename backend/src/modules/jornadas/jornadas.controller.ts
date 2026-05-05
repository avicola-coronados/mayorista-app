import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  cierreJornadaSchema,
  jornadaIdParamSchema,
} from "./jornadas.schemas";
import {
  closeJornadaById,
  getJornadaMetricasById,
  getOrCreateActiveJornada,
} from "./jornadas.service";

export async function getActiveJornada(_request: Request, response: Response) {
  const jornada = await getOrCreateActiveJornada();
  return response.json(serializePrisma(jornada));
}

export async function getJornadaMetricas(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const metrics = await getJornadaMetricasById(id);

  return response.json(metrics);
}

export async function closeJornada(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const data = cierreJornadaSchema.parse(request.body);
  const result = await closeJornadaById(id, data);

  return response.json(result);
}
