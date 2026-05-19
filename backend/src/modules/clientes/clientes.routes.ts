import { Router } from "express";
import { requireAdmin, requireRole } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { deleteCliente, getCliente, getClientes, postCliente, putCliente } from "./clientes.controller";

export const clientesRouter = Router();

clientesRouter.get("/", asyncHandler(getClientes));
clientesRouter.get("/:id", requireAdmin, asyncHandler(getCliente));
clientesRouter.post("/", requireRole("admin", "operario"), asyncHandler(postCliente));
clientesRouter.put("/:id", requireAdmin, asyncHandler(putCliente));
clientesRouter.delete("/:id", requireAdmin, asyncHandler(deleteCliente));
