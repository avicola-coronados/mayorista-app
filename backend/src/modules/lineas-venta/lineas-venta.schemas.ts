import { z } from "zod";

export const createLineaVentaSchema = z.object({
  jornada_id: z.coerce.number().int().positive(),
  cliente_id: z.coerce.number().int().positive(),
  granja_id: z.coerce.number().int().positive(),
  origen: z.enum(["partida", "piso"]),
  jabas: z.coerce.number().int().positive("Las jabas deben ser mayores a cero"),
  peso_bruto: z.coerce.number().positive("El peso bruto debe ser mayor a cero"),
  tara_por_jaba: z.coerce.number().positive("La tara por jaba debe ser mayor a cero"),
});

export const lineasVentaQuerySchema = z.object({
  jornada_id: z.coerce.number().int().positive("Debes enviar jornada_id"),
});

export type CreateLineaVentaInput = z.infer<typeof createLineaVentaSchema>;
