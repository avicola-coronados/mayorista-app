import { z } from "zod";

export const jornadaIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Jornada inválida"),
});

export const cierreJornadaSchema = z.object({
  desperdicio_kg: z.coerce.number().min(0, "El desperdicio debe ser positivo"),
  muertero_kg: z.coerce.number().min(0, "El muertero debe ser positivo"),
});

export type CierreJornadaInput = z.infer<typeof cierreJornadaSchema>;
