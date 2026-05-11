import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  createLineaVentaSchema,
  lineasVentaQuerySchema,
} from "./lineas-venta.schemas";
import {
  createLineaVenta,
  getLineasVentaGrouped,
} from "./lineas-venta.service";

export async function createLineaVentaController(request: Request, response: Response) {
  const data = createLineaVentaSchema.parse(request.body);
  const lineaVenta = await createLineaVenta(data);

  return response.status(201).json(serializePrisma(lineaVenta));
}

export async function getLineasVentaGroupedController(request: Request, response: Response) {
  const { jornada_id } = lineasVentaQuerySchema.parse(request.query);
  const lineas = await getLineasVentaGrouped(jornada_id);

  return response.json(lineas);
}
