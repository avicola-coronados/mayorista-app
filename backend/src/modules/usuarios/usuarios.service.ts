import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { UsuarioCreateInput, UsuariosQuery, UsuarioUpdateInput } from "./usuarios.schemas";

const userSelect = {
  id: true,
  username: true,
  nombre: true,
  email: true,
  role: true,
  activo: true,
  created_by: true,
  updated_by: true,
  created_at: true,
  updated_at: true,
  creator: {
    select: {
      id: true,
      username: true,
      nombre: true,
    },
  },
  updater: {
    select: {
      id: true,
      username: true,
      nombre: true,
    },
  },
} satisfies Prisma.UsuarioSelect;

export async function listUsuarios(query: UsuariosQuery) {
  const where: Prisma.UsuarioWhereInput = {};

  if (query.activo !== undefined) {
    where.activo = query.activo;
  }

  if (query.search) {
    where.OR = [
      { username: { contains: query.search, mode: "insensitive" } },
      { nombre: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const usuarios = await prisma.usuario.findMany({
    where,
    select: userSelect,
    orderBy: [{ activo: "desc" }, { role: "asc" }, { username: "asc" }],
  });

  return { usuarios };
}

export async function getUsuarioById(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return usuario;
}

export async function createUsuario(data: UsuarioCreateInput, adminId: number) {
  await ensureUniqueUsername(data.username);

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.usuario.create({
    data: {
      username: data.username,
      password_hash: passwordHash,
      nombre: data.nombre,
      email: data.email,
      role: data.role,
      activo: true,
      created_by: adminId,
      updated_by: adminId,
    },
    select: userSelect,
  });
}

export async function updateUsuario(id: number, data: UsuarioUpdateInput, adminId: number) {
  await ensureUsuarioExists(id);
  await ensureUniqueUsername(data.username, id);

  if (!data.activo && id === adminId) {
    throw new AppError("No puedes desactivar tu propio usuario", 400, "SELF_DISABLE");
  }

  const updateData: Prisma.UsuarioUpdateInput = {
    username: data.username,
    nombre: data.nombre,
    email: data.email,
    role: data.role,
    activo: data.activo,
    updater: { connect: { id: adminId } },
  };

  if (data.password) {
    updateData.password_hash = await bcrypt.hash(data.password, 10);
  }

  return prisma.usuario.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });
}

export async function disableUsuario(id: number, adminId: number) {
  await ensureUsuarioExists(id);

  if (id === adminId) {
    throw new AppError("No puedes eliminar tu propio usuario", 400, "SELF_DELETE");
  }

  return prisma.usuario.update({
    where: { id },
    data: {
      activo: false,
      updater: { connect: { id: adminId } },
    },
    select: userSelect,
  });
}

async function ensureUsuarioExists(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!usuario) {
    throw new AppError("Usuario no encontrado", 404);
  }
}

async function ensureUniqueUsername(username: string, currentId?: number) {
  const existing = await prisma.usuario.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Ya existe un usuario con ese username", 409, "DUPLICATE_USERNAME");
  }
}
