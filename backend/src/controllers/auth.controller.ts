import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export async function login(request: Request, response: Response) {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Datos inválidos",
    });
  }

  const { username, password } = parsed.data;

  const user = await prisma.usuario.findUnique({
    where: { username },
  });

  if (!user || !user.activo) {
    return response.status(401).json({ message: "Credenciales inválidas" });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return response.status(401).json({ message: "Credenciales inválidas" });
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  return response.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      nombre: user.role === "admin" ? "María" : "Operario",
    },
  });
}
