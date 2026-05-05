import bcrypt from "bcryptjs";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../utils/jwt";
import { LoginInput } from "./auth.schemas";

export async function loginUser({ username, password }: LoginInput) {
  const user = await prisma.usuario.findUnique({
    where: { username },
  });

  if (!user || !user.activo) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}
