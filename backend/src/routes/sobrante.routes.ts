import { Router } from "express";
import { getSobranteByJornada } from "../controllers/sobrante.controller";
import { asyncHandler } from "../utils/async-handler";

export const sobranteRouter = Router();

sobranteRouter.get("/", asyncHandler(getSobranteByJornada));
