import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "No autorizado" });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    request.user = verifyToken(token);
    return next();
  } catch (error) {
    return response.status(401).json({ message: "Sesión inválida o expirada" });
  }
}

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (request.user?.role !== "admin") {
    return response.status(403).json({ message: "Acceso restringido a administradores" });
  }

  return next();
}
