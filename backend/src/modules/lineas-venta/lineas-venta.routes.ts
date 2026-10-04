import { Router } from "express";
import { requireOperario } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createLineaVentaController,
  getLineasVentaGroupedController,
  updateLineaVentaDetalleController,
  updateLineaVentaGranjaController,
  updateLineaVentaNotaController,
} from "./lineas-venta.controller";

export const lineasVentaRouter = Router();

lineasVentaRouter.get("/", asyncHandler(getLineasVentaGroupedController));
lineasVentaRouter.post("/", asyncHandler(createLineaVentaController));
lineasVentaRouter.patch("/:id/nota", asyncHandler(updateLineaVentaNotaController));
lineasVentaRouter.patch("/:id/granja", requireOperario, asyncHandler(updateLineaVentaGranjaController));
lineasVentaRouter.patch("/:id/detalle", requireOperario, asyncHandler(updateLineaVentaDetalleController));
