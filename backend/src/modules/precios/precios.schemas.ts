import { z } from "zod";

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD");

export const createPrecioSchema = z.object({
  producto_id: z.coerce.number().int().positive().optional(),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  fecha_desde: fechaSchema,
});

export const historialPreciosQuerySchema = z.object({
  producto_id: z.coerce.number().int().positive().optional(),
});

export const precioVigenteQuerySchema = z.object({
  fecha: fechaSchema.optional(),
  producto_id: z.coerce.number().int().positive().optional(),
});

export type CreatePrecioInput = z.infer<typeof createPrecioSchema>;
export type HistorialPreciosQuery = z.infer<typeof historialPreciosQuerySchema>;
export type PrecioVigenteQuery = z.infer<typeof precioVigenteQuerySchema>;
