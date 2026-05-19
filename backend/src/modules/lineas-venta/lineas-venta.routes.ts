import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  createLineaVentaController,
  getLineasVentaGroupedController,
  updateLineaVentaNotaController,
} from "./lineas-venta.controller";

export const lineasVentaRouter = Router();

lineasVentaRouter.get("/", asyncHandler(getLineasVentaGroupedController));
lineasVentaRouter.post("/", asyncHandler(createLineaVentaController));
lineasVentaRouter.patch("/:id/nota", asyncHandler(updateLineaVentaNotaController));
