import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  createLineaVentaSchema,
  lineasVentaQuerySchema,
  updateDetalleLineaVentaSchema,
  updateGranjaLineaVentaSchema,
  updateNotaLineaVentaSchema,
} from "./lineas-venta.schemas";
import {
  createLineaVenta,
  getLineasVentaGrouped,
  updateLineaVentaDetalle,
  updateLineaVentaGranja,
  updateLineaVentaNota,
} from "./lineas-venta.service";
import { AppError } from "../../errors/AppError";

export async function createLineaVentaController(request: Request, response: Response) {
  const data = createLineaVentaSchema.parse(request.body);
  const actorUserId = request.user?.id;

  if (!actorUserId) {
    throw new AppError("Usuario no autenticado", 401);
  }

  const lineaVenta = await createLineaVenta(data, actorUserId);

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

export async function updateLineaVentaGranjaController(request: Request, response: Response) {
  const id = Number(request.params.id);
  const actorUserId = request.user?.id;

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Pesada inválida", 400);
  }

  if (!actorUserId) {
    throw new AppError("Usuario no autenticado", 401);
  }

  const data = updateGranjaLineaVentaSchema.parse(request.body);
  const result = await updateLineaVentaGranja(id, data, actorUserId);

  return response.json(serializePrisma(result));
}

export async function updateLineaVentaDetalleController(request: Request, response: Response) {
  const id = Number(request.params.id);
  const actorUserId = request.user?.id;

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Pesada inválida", 400);
  }

  if (!actorUserId) {
    throw new AppError("Usuario no autenticado", 401);
  }

  const data = updateDetalleLineaVentaSchema.parse(request.body);
  const result = await updateLineaVentaDetalle(id, data, actorUserId);

  return response.json(serializePrisma(result));
}
