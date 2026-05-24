import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { serializePrisma } from "../../utils/serializers";
import { listGuiasClienteQuerySchema } from "../guias/guias.schemas";
import { getClienteGuiasPanel, getClientesConSaldo } from "../guias/guias.service";
import {
  createCliente,
  disableCliente,
  getClienteById,
  getClientesActivos,
  getClientesAdmin,
  updateCliente,
} from "./clientes.service";
import { clienteCreateSchema, clientesQuerySchema, clienteUpdateSchema } from "./clientes.schemas";

export async function getClientes(request: Request, response: Response) {
  const query = clientesQuerySchema.parse(request.query);
  const role = request.user?.role;

  if (role === "cajero") {
    const clientes = await getClientesConSaldo(query.search);
    return response.json(serializePrisma({ clientes }));
  }

  if (query.include_stats) {
    if (request.user?.role !== "admin") {
      throw new AppError("Acceso restringido a administradores", 403);
    }

    const clientes = await getClientesAdmin(query);
    return response.json(serializePrisma(clientes));
  }

  const clientes = await getClientesActivos();
  return response.json(serializePrisma(clientes));
}

export async function getCliente(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const cliente = await getClienteById(id);

  return response.json(serializePrisma(cliente));
}

export async function getClienteGuias(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const query = listGuiasClienteQuerySchema.parse(request.query);
  const result = await getClienteGuiasPanel(id, query);

  return response.json(serializePrisma(result));
}

export async function postCliente(request: Request, response: Response) {
  const data = clienteCreateSchema.parse(request.body);
  const cliente = await createCliente(data);

  return response.status(201).json(serializePrisma(cliente));
}

export async function putCliente(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const data = clienteUpdateSchema.parse(request.body);
  const cliente = await updateCliente(id, data);

  return response.json(serializePrisma(cliente));
}

export async function deleteCliente(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  await disableCliente(id);

  return response.json({ mensaje: "Cliente eliminado exitosamente" });
}

function validateId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Cliente inválido", 400);
  }
}
