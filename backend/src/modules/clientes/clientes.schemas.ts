import { z } from "zod";

const optionalTrimmedString = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const clientesQuerySchema = z.object({
  activo: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  include_stats: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  jornada_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
});

export const clienteCreateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede exceder 100 caracteres"),
  codigo: optionalTrimmedString(20, "El código no puede exceder 20 caracteres"),
  tipo: z.enum(["mayorista", "minorista"]).optional().default("minorista"),
  documento_tipo: optionalTrimmedString(10, "El tipo de documento no puede exceder 10 caracteres"),
  documento_num: optionalTrimmedString(20, "El número de documento no puede exceder 20 caracteres"),
  contacto: optionalTrimmedString(100, "El contacto no puede exceder 100 caracteres"),
  telefono: optionalTrimmedString(15, "El teléfono no puede exceder 15 caracteres"),
  email: optionalTrimmedString(100, "El email no puede exceder 100 caracteres"),
  direccion: optionalTrimmedString(200, "La dirección no puede exceder 200 caracteres"),
});

export const clienteUpdateSchema = clienteCreateSchema.extend({
  activo: z.boolean(),
});

export type ClientesQuery = z.infer<typeof clientesQuerySchema>;
export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
