import { Router } from "express";
import {
  getAdminMermaHistorica,
  getAdminMetricasDashboard,
  getAdminPesadasConNotas,
  getAdminTopClientes,
} from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.get("/metricas-dashboard", asyncHandler(getAdminMetricasDashboard));
adminRouter.get("/merma-historica", asyncHandler(getAdminMermaHistorica));
adminRouter.get("/top-clientes", asyncHandler(getAdminTopClientes));
adminRouter.get("/pesadas-con-notas", asyncHandler(getAdminPesadasConNotas));
