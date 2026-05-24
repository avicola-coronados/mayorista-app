import { Router } from "express";
import { requireAdmin, requireGuiaRead, requireRole } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  deleteCliente,
  getCliente,
  getClienteGuias,
  getClientes,
  postCliente,
  putCliente,
} from "./clientes.controller";

export const clientesRouter = Router();

clientesRouter.get("/", asyncHandler(getClientes));
clientesRouter.get("/:id/guias", requireGuiaRead, asyncHandler(getClienteGuias));
clientesRouter.get("/:id", requireAdmin, asyncHandler(getCliente));
clientesRouter.post("/", requireRole("admin", "operario"), asyncHandler(postCliente));
clientesRouter.put("/:id", requireAdmin, asyncHandler(putCliente));
clientesRouter.delete("/:id", requireAdmin, asyncHandler(deleteCliente));
