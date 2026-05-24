import { z } from "zod";

export const createGuiaSchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
  jornada_id: z.coerce.number().int().positive().optional(),
  producto_id: z.coerce.number().int().positive().optional(),
  saldo_anterior: z.coerce.number().min(0).optional(),
  observaciones: z.string().trim().max(500).optional(),
});

export const lineaGuiaBodySchema = z.object({
  jabas: z.coerce.number().int().positive(),
  peso_bruto: z.coerce.number().min(0),
  tara_por_jaba: z.coerce.number().min(0).optional(),
  tara: z.coerce.number().min(0).optional(),
  devolucion_kg: z.coerce.number().min(0).optional(),
  peladuria: z.coerce.number().min(0).optional(),
  nota: z.string().trim().max(300).optional(),
  linea_venta_id: z.coerce.number().int().positive().optional(),
});

export const listGuiasClienteQuerySchema = z.object({
  estado: z.enum(["borrador", "cerrada", "anulada"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const guiaActivaQuerySchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
});

export type CreateGuiaInput = z.infer<typeof createGuiaSchema>;
export type LineaGuiaBodyInput = z.infer<typeof lineaGuiaBodySchema>;
export type ListGuiasClienteQuery = z.infer<typeof listGuiasClienteQuerySchema>;
export type GuiaActivaQuery = z.infer<typeof guiaActivaQuerySchema>;
