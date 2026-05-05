import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { login } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
