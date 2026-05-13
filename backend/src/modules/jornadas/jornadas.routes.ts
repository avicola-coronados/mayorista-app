import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  closeJornada,
  exportJornada,
  exportJornadas,
  getActiveJornada,
  getJornada,
  getJornadaMetricas,
  getJornadas,
} from "./jornadas.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

export const jornadasRouter = Router();

jornadasRouter.get("/activa", asyncHandler(getActiveJornada));
jornadasRouter.get("/", requireAdmin, asyncHandler(getJornadas));
jornadasRouter.get("/export", requireAdmin, asyncHandler(exportJornadas));
jornadasRouter.get("/:id/export", requireAdmin, asyncHandler(exportJornada));
jornadasRouter.get("/:id", requireAdmin, asyncHandler(getJornada));
jornadasRouter.get("/:id/metricas", asyncHandler(getJornadaMetricas));
jornadasRouter.post("/:id/cerrar", asyncHandler(closeJornada));
