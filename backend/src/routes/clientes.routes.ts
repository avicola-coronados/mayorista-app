import { Router } from "express";
import { prisma } from "../lib/prisma";
import { serializePrisma } from "../utils/serializers";
import { asyncHandler } from "../utils/async-handler";

export const clientesRouter = Router();

clientesRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });

    return response.json(serializePrisma(clientes));
  }),
);
