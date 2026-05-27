import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import { createDevolucion, deleteDevolucion } from "./devoluciones.service";
import {
  devolucionDesdePesadaSchema,
  devolucionIdParamSchema,
  devolucionLegacySchema,
} from "./devoluciones.schemas";

export async function postDevolucion(request: Request, response: Response) {
  const body = request.body as Record<string, unknown>;
  const data =
    body?.linea_venta_id != null
      ? devolucionDesdePesadaSchema.parse(body)
      : devolucionLegacySchema.parse(body);
  const devolucion = await createDevolucion(data);

  return response.status(201).json(serializePrisma(devolucion));
}

export async function deleteDevolucionById(request: Request, response: Response) {
  const { id } = devolucionIdParamSchema.parse(request.params);
  const result = await deleteDevolucion(id);

  return response.json(result);
}
