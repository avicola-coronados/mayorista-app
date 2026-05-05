import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import { getGranjasActivas } from "./granjas.service";

export async function getGranjas(_request: Request, response: Response) {
  const granjas = await getGranjasActivas();

  return response.json(serializePrisma(granjas));
}
