import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getClientes } from "./clientes.controller";

export const clientesRouter = Router();

clientesRouter.get("/", asyncHandler(getClientes));
