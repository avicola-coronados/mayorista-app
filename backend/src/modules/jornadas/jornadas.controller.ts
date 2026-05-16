import { Request, Response } from "express";
import { serializePrisma } from "../../utils/serializers";
import {
  cierreJornadaSchema,
  jornadaExportQuerySchema,
  jornadaIdParamSchema,
  jornadasListQuerySchema,
} from "./jornadas.schemas";
import {
  closeJornadaById,
  exportClientesJornadaXlsx,
  exportJornadaPdf,
  exportJornadasXlsx,
  getActiveJornadaWithMetrics,
  getJornadaDetalle,
  getJornadaMetricasById,
  listJornadas,
} from "./jornadas.service";
import { listDevolucionesByJornada } from "../devoluciones/devoluciones.service";

export async function getActiveJornada(_request: Request, response: Response) {
  const jornada = await getActiveJornadaWithMetrics();
  return response.json(serializePrisma(jornada));
}

export async function getJornadas(request: Request, response: Response) {
  const query = jornadasListQuerySchema.parse(request.query);
  const result = await listJornadas(query);

  return response.json(serializePrisma(result));
}

export async function getJornada(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const jornada = await getJornadaDetalle(id);

  return response.json(serializePrisma(jornada));
}

export async function getJornadaMetricas(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const metrics = await getJornadaMetricasById(id);

  return response.json(metrics);
}

export async function getJornadaDevoluciones(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const result = await listDevolucionesByJornada(id);

  return response.json(serializePrisma(result));
}

export async function closeJornada(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const data = cierreJornadaSchema.parse(request.body);
  const result = await closeJornadaById(id, data);

  return response.json(result);
}

export async function exportJornada(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  jornadaExportQuerySchema.parse(request.query);
  const file = await exportJornadaPdf(id);

  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  return response.send(file.content);
}

export async function exportClientesJornada(request: Request, response: Response) {
  const { id } = jornadaIdParamSchema.parse(request.params);
  const file = await exportClientesJornadaXlsx(id);

  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  return response.send(file.content);
}

export async function exportJornadas(request: Request, response: Response) {
  const query = jornadasListQuerySchema.parse({ ...request.query, page: 1, limit: 50 });
  const file = await exportJornadasXlsx(query);

  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  return response.send(file.content);
}
