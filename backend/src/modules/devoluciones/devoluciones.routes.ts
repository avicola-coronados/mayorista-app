import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { deleteDevolucionById, postDevolucion } from "./devoluciones.controller";

export const devolucionesRouter = Router();

devolucionesRouter.post("/", asyncHandler(postDevolucion));
devolucionesRouter.delete("/:id", asyncHandler(deleteDevolucionById));
