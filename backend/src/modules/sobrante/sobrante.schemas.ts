import { z } from "zod";

export const sobranteQuerySchema = z.object({
  jornada_id: z.coerce.number().int().positive("Jornada inválida"),
});
