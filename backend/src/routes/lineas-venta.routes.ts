import { Router } from "express";
import { createLineaVenta, getLineasVentaGrouped } from "../controllers/lineas-venta.controller";
import { asyncHandler } from "../utils/async-handler";

export const lineasVentaRouter = Router();

lineasVentaRouter.get("/", asyncHandler(getLineasVentaGrouped));
lineasVentaRouter.post("/", asyncHandler(createLineaVenta));
