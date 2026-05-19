import { z } from "zod";

export const userRoles = ["admin", "operario", "cajero", "oficina"] as const;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const usuariosQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  activo: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const usuarioCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9._-]+$/, "El usuario solo puede contener letras, números, punto, guion y guion bajo"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
  nombre: optionalText(100, "El nombre no puede exceder 100 caracteres"),
  email: optionalText(120, "El email no puede exceder 120 caracteres").refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Email inválido",
  ),
  role: z.enum(userRoles),
});

export const usuarioUpdateSchema = usuarioCreateSchema
  .omit({ password: true })
  .extend({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100).optional().nullable(),
    activo: z.boolean(),
  });

export type UsuariosQuery = z.infer<typeof usuariosQuerySchema>;
export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;
