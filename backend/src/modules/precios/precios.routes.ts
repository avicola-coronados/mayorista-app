import { Router } from "express";
import { requireAuth, requireOficina, requireRole } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { getHistorialPrecios, getPrecioVigente, postPrecio } from "./precios.controller";

export const preciosRouter = Router();

preciosRouter.use(requireAuth);

preciosRouter.get(
  "/vigente",
  requireRole("operario", "cajero", "oficina", "admin"),
  asyncHandler(getPrecioVigente),
);
preciosRouter.get("/historial", requireOficina, asyncHandler(getHistorialPrecios));
preciosRouter.post("/", requireOficina, asyncHandler(postPrecio));
