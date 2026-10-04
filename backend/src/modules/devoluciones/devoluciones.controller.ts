import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  createDevolucion,
  deleteDevolucion,
  distribuirDevolucionPelado,
  getPeladoDisponible,
} from "./devoluciones.service";
import {
  devolucionClienteSchema,
  devolucionIdParamSchema,
  devolucionLegacySchema,
  distribuirPeladoSchema,
  peladoDisponibleQuerySchema,
} from "./devoluciones.schemas";

export async function postDevolucion(request: Request, response: Response) {
  const body = request.body as Record<string, unknown>;
  const data =
    body?.tara_por_jaba != null
      ? devolucionClienteSchema.parse(body)
      : devolucionLegacySchema.parse(body);
  const devolucion = await createDevolucion(data);

  return response.status(201).json(serializePrisma(devolucion));
}

export async function deleteDevolucionById(request: Request, response: Response) {
  const { id } = devolucionIdParamSchema.parse(request.params);
  const result = await deleteDevolucion(id);

  return response.json(result);
}

export async function getPeladoDisponibleController(request: Request, response: Response) {
  const { jornada_id } = peladoDisponibleQuerySchema.parse(request.query);
  const result = await getPeladoDisponible(jornada_id);
  return response.json(serializePrisma(result));
}

export async function postDistribucionPelado(request: Request, response: Response) {
  const data = distribuirPeladoSchema.parse(request.body);
  const result = await distribuirDevolucionPelado(data, request.user!.id);
  return response.status(201).json(serializePrisma(result));
}
