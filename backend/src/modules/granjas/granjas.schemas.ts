import { z } from "zod";

export const granjaCreateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "El nombre no puede exceder 50 caracteres"),
});

export const granjaUpdateSchema = granjaCreateSchema.extend({
  activo: z.boolean(),
});

export type GranjaCreateInput = z.infer<typeof granjaCreateSchema>;
export type GranjaUpdateInput = z.infer<typeof granjaUpdateSchema>;
