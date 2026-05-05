import { Router } from "express";
import { prisma } from "../lib/prisma";
import { serializePrisma } from "../utils/serializers";
import { asyncHandler } from "../utils/async-handler";

export const granjasRouter = Router();

granjasRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const granjas = await prisma.granja.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });

    return response.json(serializePrisma(granjas));
  }),
);
