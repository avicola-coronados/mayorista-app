import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import {
  deleteGranja,
  getGranja,
  getGranjas,
  postGranja,
  putGranja,
} from "./granjas.controller";
import { requireAdmin } from "../../middleware/auth.middleware";

export const granjasRouter = Router();

granjasRouter.get("/", asyncHandler(getGranjas));
granjasRouter.get("/:id", requireAdmin, asyncHandler(getGranja));
granjasRouter.post("/", requireAdmin, asyncHandler(postGranja));
granjasRouter.put("/:id", requireAdmin, asyncHandler(putGranja));
granjasRouter.delete("/:id", requireAdmin, asyncHandler(deleteGranja));
