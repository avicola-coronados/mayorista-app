import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  closeJornada,
  getActiveJornada,
  getJornadaMetricas,
} from "./jornadas.controller";

export const jornadasRouter = Router();

jornadasRouter.get("/activa", asyncHandler(getActiveJornada));
jornadasRouter.get("/:id/metricas", asyncHandler(getJornadaMetricas));
jornadasRouter.post("/:id/cerrar", asyncHandler(closeJornada));
