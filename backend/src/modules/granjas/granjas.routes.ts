import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getGranjas } from "./granjas.controller";

export const granjasRouter = Router();

granjasRouter.get("/", asyncHandler(getGranjas));
