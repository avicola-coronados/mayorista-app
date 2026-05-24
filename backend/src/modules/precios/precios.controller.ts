import { Request, Response } from "express";
import { createPrecioSchema, historialPreciosQuerySchema, precioVigenteQuerySchema } from "./precios.schemas";
import { createPrecio, getPrecioVigenteResponse, listHistorialPrecios } from "./precios.service";

export async function postPrecio(request: Request, response: Response) {
  const data = createPrecioSchema.parse(request.body);
  const precio = await createPrecio(data, request.user!.id);
  return response.status(201).json(precio);
}

export async function getHistorialPrecios(request: Request, response: Response) {
  const query = historialPreciosQuerySchema.parse(request.query);
  const historial = await listHistorialPrecios(query);
  return response.json(historial);
}

export async function getPrecioVigente(request: Request, response: Response) {
  const query = precioVigenteQuerySchema.parse(request.query);
  const precio = await getPrecioVigenteResponse(query);
  return response.json(precio);
}
