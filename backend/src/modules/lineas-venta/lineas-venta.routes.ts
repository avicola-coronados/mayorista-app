import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  createLineaVentaController,
  getLineasVentaGroupedController,
} from "./lineas-venta.controller";

export const lineasVentaRouter = Router();

lineasVentaRouter.get("/", asyncHandler(getLineasVentaGroupedController));
lineasVentaRouter.post("/", asyncHandler(createLineaVentaController));
