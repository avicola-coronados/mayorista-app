import { Router } from "express";
import { requireAuth, requireGuiaRead, requireOperario } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  deleteLineaGuiaController,
  getGuia,
  getGuiaActiva,
  getGuiasJornadaActual,
  patchCerrarGuia,
  postGuia,
  postLineaGuia,
  putLineaGuia,
} from "./guias.controller";

export const guiasRouter = Router();

guiasRouter.use(requireAuth);

guiasRouter.get("/activa", requireOperario, asyncHandler(getGuiaActiva));
guiasRouter.get("/jornada-actual", requireOperario, asyncHandler(getGuiasJornadaActual));

guiasRouter.get("/:id", requireGuiaRead, asyncHandler(getGuia));

guiasRouter.post("/", requireOperario, asyncHandler(postGuia));
guiasRouter.post("/:id/lineas", requireOperario, asyncHandler(postLineaGuia));
guiasRouter.put("/:id/lineas/:lineaId", requireOperario, asyncHandler(putLineaGuia));
guiasRouter.delete("/:id/lineas/:lineaId", requireOperario, asyncHandler(deleteLineaGuiaController));
guiasRouter.patch("/:id/cerrar", requireOperario, asyncHandler(patchCerrarGuia));
