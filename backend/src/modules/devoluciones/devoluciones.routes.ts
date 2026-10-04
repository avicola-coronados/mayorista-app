import { Router } from "express";
import { requireOperario } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  deleteDevolucionById,
  getPeladoDisponibleController,
  postDevolucion,
  postDistribucionPelado,
} from "./devoluciones.controller";

export const devolucionesRouter = Router();

devolucionesRouter.post("/", asyncHandler(postDevolucion));
devolucionesRouter.get(
  "/pelado-disponible",
  requireOperario,
  asyncHandler(getPeladoDisponibleController),
);
devolucionesRouter.post(
  "/pelado-distribuciones",
  requireOperario,
  asyncHandler(postDistribucionPelado),
);
devolucionesRouter.delete("/:id", asyncHandler(deleteDevolucionById));
