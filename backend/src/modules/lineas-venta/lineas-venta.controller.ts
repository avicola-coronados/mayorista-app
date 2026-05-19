import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  createLineaVentaSchema,
  lineasVentaQuerySchema,
  updateNotaLineaVentaSchema,
} from "./lineas-venta.schemas";
import {
  createLineaVenta,
  getLineasVentaGrouped,
  updateLineaVentaNota,
} from "./lineas-venta.service";
import { AppError } from "../../errors/AppError";

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

export async function updateLineaVentaNotaController(request: Request, response: Response) {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Pesada inválida", 400);
  }

  const data = updateNotaLineaVentaSchema.parse(request.body);
  const result = await updateLineaVentaNota(id, data);

  return response.json(serializePrisma(result));
}
