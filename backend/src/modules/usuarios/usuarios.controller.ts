import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { serializePrisma } from "../../utils/serializers";
import { usuarioCreateSchema, usuariosQuerySchema, usuarioUpdateSchema } from "./usuarios.schemas";
import { createUsuario, disableUsuario, getUsuarioById, listUsuarios, updateUsuario } from "./usuarios.service";

export async function getUsuarios(request: Request, response: Response) {
  const query = usuariosQuerySchema.parse(request.query);
  const usuarios = await listUsuarios(query);

  return response.json(serializePrisma(usuarios));
}

export async function getUsuario(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const usuario = await getUsuarioById(id);

  return response.json(serializePrisma(usuario));
}

export async function postUsuario(request: Request, response: Response) {
  const adminId = getAdminId(request);
  const data = usuarioCreateSchema.parse(request.body);
  const usuario = await createUsuario(data, adminId);

  return response.status(201).json(serializePrisma(usuario));
}

export async function putUsuario(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const adminId = getAdminId(request);
  const data = usuarioUpdateSchema.parse(request.body);
  const usuario = await updateUsuario(id, data, adminId);

  return response.json(serializePrisma(usuario));
}

export async function deleteUsuario(request: Request, response: Response) {
  const id = Number(request.params.id);
  validateId(id);
  const adminId = getAdminId(request);
  await disableUsuario(id, adminId);

  return response.json({ mensaje: "Usuario eliminado exitosamente" });
}

function getAdminId(request: Request) {
  if (!request.user?.id) {
    throw new AppError("No autorizado", 401);
  }

  return request.user.id;
}

function validateId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Usuario inválido", 400);
  }
}
