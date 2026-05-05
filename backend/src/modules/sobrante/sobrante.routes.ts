import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getSobranteByJornada } from "./sobrante.controller";

export const sobranteRouter = Router();

sobranteRouter.get("/", asyncHandler(getSobranteByJornada));
