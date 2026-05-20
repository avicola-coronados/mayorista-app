import { Router } from "express";
import {
  deleteAdminLineaVenta,
  getAdminLineasVentaPorCliente,
  getAdminMermaHistorica,
  getAdminMetricasDashboard,
  getAdminPesadasConNotas,
  getAdminTopClientes,
  updateAdminLineaVenta,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.get("/metricas-dashboard", asyncHandler(getAdminMetricasDashboard));
adminRouter.get("/merma-historica", asyncHandler(getAdminMermaHistorica));
adminRouter.get("/top-clientes", asyncHandler(getAdminTopClientes));
adminRouter.get("/pesadas-con-notas", asyncHandler(getAdminPesadasConNotas));
adminRouter.get(
  "/lineas-venta/cliente/:cliente_id/jornada/:jornada_id",
  asyncHandler(getAdminLineasVentaPorCliente),
);
adminRouter.put("/lineas-venta/:id", asyncHandler(updateAdminLineaVenta));
adminRouter.delete("/lineas-venta/:id", asyncHandler(deleteAdminLineaVenta));
