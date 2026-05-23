import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { serializePrisma } from "../../utils/serializers";
import {
  cajeroClientesQuerySchema,
  cajeroEgresosQuerySchema,
  registrarEgresoSchema,
  registrarPagoSchema,
} from "./cajero.schemas";
import {
  getClientesCajero,
  getDetalleClienteCajero,
  getEgresosCajero,
  registrarEgresoCajero,
  registrarPagoCajero,
} from "./cajero.service";

export async function getClientes(request: Request, response: Response) {
  const query = cajeroClientesQuerySchema.parse(request.query);
  const result = await getClientesCajero(query);

  return response.json(serializePrisma(result));
}

export async function getDetalleCliente(request: Request, response: Response) {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Cliente inválido", 400);
  }

  const result = await getDetalleClienteCajero(id);

  if (!result) {
    throw new AppError("Cliente no encontrado", 404);
  }

  return response.json(serializePrisma(result));
}

export async function postPago(request: Request, response: Response) {
  if (!request.user?.id) {
    throw new AppError("No autorizado", 401);
  }

  const data = registrarPagoSchema.parse(request.body);
  const result = await registrarPagoCajero(data, request.user.id);

  return response.status(201).json(serializePrisma(result));
}

export async function getEgresos(request: Request, response: Response) {
  const query = cajeroEgresosQuerySchema.parse(request.query);
  const result = await getEgresosCajero(query);

  return response.json(serializePrisma(result));
}

export async function postEgreso(request: Request, response: Response) {
  if (!request.user?.id) {
    throw new AppError("No autorizado", 401);
  }

  const data = registrarEgresoSchema.parse(request.body);
  const result = await registrarEgresoCajero(data, request.user.id);

  return response.status(201).json(serializePrisma(result));
}
