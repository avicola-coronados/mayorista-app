import { Router } from "express";
import { requireCajeroOrAdmin } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { getClientes, getDetalleCliente, getEgresos, postEgreso, postPago } from "./cajero.controller";

export const cajeroRouter = Router();

cajeroRouter.use(requireCajeroOrAdmin);
cajeroRouter.get("/clientes", asyncHandler(getClientes));
cajeroRouter.get("/clientes/:id", asyncHandler(getDetalleCliente));
cajeroRouter.post("/pagos", asyncHandler(postPago));
cajeroRouter.get("/egresos", asyncHandler(getEgresos));
cajeroRouter.post("/egresos", asyncHandler(postEgreso));
