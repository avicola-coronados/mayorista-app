import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError";

export function errorMiddleware(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
      error: error.message,
      code: error.code,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: error.issues[0]?.message ?? "Datos inválidos",
    });
  }

  console.error(error);
  return response.status(500).json({ message: "Ocurrió un error interno" });
}
