import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import { getClientesActivos } from "./clientes.service";

export async function getClientes(_request: Request, response: Response) {
  const clientes = await getClientesActivos();

  return response.json(serializePrisma(clientes));
}
