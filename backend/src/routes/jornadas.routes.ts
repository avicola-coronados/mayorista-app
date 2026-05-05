import { Router } from "express";
import {
  closeJornada,
  getActiveJornada,
  getJornadaMetricas,
} from "../controllers/jornadas.controller";
import { asyncHandler } from "../utils/async-handler";

export const jornadasRouter = Router();

jornadasRouter.get("/activa", asyncHandler(getActiveJornada));
jornadasRouter.get("/:id/metricas", asyncHandler(getJornadaMetricas));
jornadasRouter.post("/:id/cerrar", asyncHandler(closeJornada));
