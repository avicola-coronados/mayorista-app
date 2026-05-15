import { z } from "zod";

export const devolucionIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Devolución inválida"),
});

export const createDevolucionSchema = z
  .object({
    jornada_id: z.coerce.number().int().positive("Jornada inválida"),
    cliente_id: z.coerce.number().int().positive("Cliente inválido"),
    tipo: z.enum(["pelado", "muerto", "vivo"]),
    jabas: z.coerce.number().int().min(0).nullable().optional(),
    peso_bruto: z.coerce.number().positive("El peso bruto debe ser mayor a cero"),
    tara: z.coerce.number().min(0, "La tara debe ser mayor o igual a cero"),
    peso_neto: z.coerce.number().positive("El peso neto debe ser mayor a cero"),
  })
  .refine((data) => data.peso_neto <= data.peso_bruto, {
    message: "El peso neto no puede ser mayor al peso bruto",
    path: ["peso_neto"],
  });

export type CreateDevolucionInput = z.infer<typeof createDevolucionSchema>;
