import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  closeJornada,
  exportClientesJornada,
  exportJornada,
  exportJornadas,
  getActiveJornada,
  getJornada,
  getJornadaDevoluciones,
  getJornadaMetricas,
  getJornadas,
  reopenJornada,
} from "./jornadas.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

export const jornadasRouter = Router();

jornadasRouter.get("/activa", asyncHandler(getActiveJornada));
jornadasRouter.get("/", requireAdmin, asyncHandler(getJornadas));
jornadasRouter.get("/export", requireAdmin, asyncHandler(exportJornadas));
jornadasRouter.get("/:id/clientes/export", requireAdmin, asyncHandler(exportClientesJornada));
jornadasRouter.get("/:id/export", requireAdmin, asyncHandler(exportJornada));
jornadasRouter.get("/:id/devoluciones", asyncHandler(getJornadaDevoluciones));
jornadasRouter.get("/:id/metricas", asyncHandler(getJornadaMetricas));
jornadasRouter.get("/:id", requireAdmin, asyncHandler(getJornada));
jornadasRouter.post("/:id/cerrar", asyncHandler(closeJornada));
jornadasRouter.post("/:id/reabrir", requireAdmin, asyncHandler(reopenJornada));
