import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import {
  createGuiaSchema,
  guiaActivaQuerySchema,
  lineaGuiaBodySchema,
} from "./guias.schemas";
import {
  addLineaGuia,
  cerrarGuia,
  createGuia,
  deleteLineaGuia,
  getGuiaBorradorActiva,
  getGuiaDetalleCajero,
  getGuiaOperadorDetalle,
  listGuiasJornadaActual,
  updateLineaGuia,
} from "./guias.service";

export async function postGuia(request: Request, response: Response) {
  const data = createGuiaSchema.parse(request.body);
  const guia = await createGuia(data, request.user!.id);
  return response.status(201).json(guia);
}

export async function postLineaGuia(request: Request, response: Response) {
  const guiaId = parseId(request.params.id);
  const data = lineaGuiaBodySchema.parse(request.body);
  const guia = await addLineaGuia(guiaId, data);
  return response.status(201).json(guia);
}

export async function putLineaGuia(request: Request, response: Response) {
  const guiaId = parseId(request.params.id);
  const lineaId = parseId(request.params.lineaId);
  const data = lineaGuiaBodySchema.parse(request.body);
  const guia = await updateLineaGuia(guiaId, lineaId, data);
  return response.json(guia);
}

export async function deleteLineaGuiaController(request: Request, response: Response) {
  const guiaId = parseId(request.params.id);
  const lineaId = parseId(request.params.lineaId);
  const guia = await deleteLineaGuia(guiaId, lineaId);
  return response.json(guia);
}

export async function patchCerrarGuia(request: Request, response: Response) {
  const guiaId = parseId(request.params.id);
  const guia = await cerrarGuia(guiaId, request.user!.id);
  return response.json(guia);
}

export async function getGuia(request: Request, response: Response) {
  const guiaId = parseId(request.params.id);
  const role = request.user!.role;

  if (role === "operario") {
    const guia = await getGuiaOperadorDetalle(guiaId);
    return response.json(guia);
  }

  const guia = await getGuiaDetalleCajero(guiaId);
  return response.json(guia);
}

export async function getGuiaActiva(request: Request, response: Response) {
  const query = guiaActivaQuerySchema.parse(request.query);
  const guia = await getGuiaBorradorActiva(query.cliente_id);
  return response.json({ guia });
}

export async function getGuiasJornadaActual(request: Request, response: Response) {
  const result = await listGuiasJornadaActual();
  return response.json(result);
}

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Identificador inválido", 400);
  }
  return id;
}
