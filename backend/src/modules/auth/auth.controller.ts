import { Request, Response } from "express";
import { loginSchema } from "./auth.schemas";
import { loginUser } from "./auth.service";

export async function login(request: Request, response: Response) {
  const data = loginSchema.parse(request.body);
  const result = await loginUser(data);

  return response.json(result);
}
