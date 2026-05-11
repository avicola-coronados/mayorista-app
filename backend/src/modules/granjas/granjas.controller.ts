import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { serializePrisma } from "../../utils/serializers";
import {
  createGranja,
  disableGranja,
  getGranjaById,
  getGranjasList,
  updateGranja,
} from "./granjas.service";
import { granjaCreateSchema, granjaUpdateSchema } from "./granjas.schemas";

export async function getGranjas(request: Request, response: Response) {
  const granjas = await getGranjasList(request.user?.role === "admin");

  return response.json({ granjas: serializePrisma(granjas) });
}

export async function getGranja(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const granja = await getGranjaById(id);

  return response.json(serializePrisma(granja));
}

export async function postGranja(request: Request, response: Response) {
  const data = granjaCreateSchema.parse(request.body);
  const granja = await createGranja(data);

  return response.status(201).json({
    ...(serializePrisma(granja) as Record<string, unknown>),
    mensaje: "Granja creada exitosamente",
  });
}

export async function putGranja(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const data = granjaUpdateSchema.parse(request.body);
  const granja = await updateGranja(id, data);

  return response.json({
    ...(serializePrisma(granja) as Record<string, unknown>),
    mensaje: "Granja actualizada",
  });
}

export async function deleteGranja(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  await disableGranja(id);

  return response.json({ mensaje: "Granja eliminada exitosamente" });
}

function validateId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Granja inválida", 400);
  }
}
