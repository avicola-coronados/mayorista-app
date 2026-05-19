import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { deleteUsuario, getUsuario, getUsuarios, postUsuario, putUsuario } from "./usuarios.controller";

export const usuariosRouter = Router();

usuariosRouter.use(requireAdmin);
usuariosRouter.get("/", asyncHandler(getUsuarios));
usuariosRouter.get("/:id", asyncHandler(getUsuario));
usuariosRouter.post("/", asyncHandler(postUsuario));
usuariosRouter.put("/:id", asyncHandler(putUsuario));
usuariosRouter.delete("/:id", asyncHandler(deleteUsuario));
