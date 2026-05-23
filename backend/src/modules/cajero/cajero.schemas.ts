import { z } from "zod";

export const cajeroClientesQuerySchema = z.object({
  tipo: z.enum(["mayorista", "minorista"]).optional(),
  con_deuda: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  buscar: z.string().trim().max(100, "La búsqueda no puede exceder 100 caracteres").optional(),
});

const fechaISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de depósito inválida");
const mesISODateSchema = z.string().regex(/^\d{4}-\d{2}$/, "Mes inválido");
const horaSchema = z.string().regex(/^\d{2}:\d{2}$/, "Hora de depósito inválida");

export const registrarPagoSchema = z
  .object({
    factura_id: z.coerce.number().int().positive("Factura inválida"),
    cliente_id: z.coerce.number().int().positive("Cliente inválido"),
    monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    tipo: z.enum(["efectivo", "deposito"]),
    metodo: z.string().trim().min(1, "Método de pago requerido"),
    banco: z.string().trim().optional().nullable(),
    nro_operacion: z.string().trim().optional().nullable(),
    fecha_deposito: fechaISODateSchema.optional().nullable(),
    hora_deposito: horaSchema.optional().nullable(),
    observaciones: z.string().trim().max(500, "Las observaciones no pueden exceder 500 caracteres").optional().nullable(),
  })
  .superRefine((data, context) => {
    if (data.tipo === "efectivo") {
      const allowedMethods = ["efectivo", "yape", "plin", "transferencia"];

      if (!allowedMethods.includes(data.metodo)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Método de pago inválido",
          path: ["metodo"],
        });
      }
    }

    if (data.tipo === "deposito") {
      if (data.metodo !== "deposito") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Método de depósito inválido",
          path: ["metodo"],
        });
      }

      if (!data.banco) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Banco requerido",
          path: ["banco"],
        });
      }

      if (!data.nro_operacion) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número de operación requerido",
          path: ["nro_operacion"],
        });
      }

      if (!data.fecha_deposito) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fecha de depósito requerida",
          path: ["fecha_deposito"],
        });
      }

      if (!data.hora_deposito) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hora de depósito requerida",
          path: ["hora_deposito"],
        });
      }
    }
  });

export const cajeroEgresosQuerySchema = z.object({
  fecha: fechaISODateSchema.optional(),
  mes: mesISODateSchema.optional(),
});

const conceptosEgreso = [
  "Pago a proveedores",
  "Combustible",
  "Mantenimiento",
  "Servicios (luz, agua, etc.)",
  "Salarios",
  "Alquiler",
  "Insumos",
  "Otro",
] as const;

const metodosEgreso = ["efectivo", "transferencia", "cheque", "tarjeta"] as const;

export const registrarEgresoSchema = z.object({
  concepto: z.enum(conceptosEgreso, {
    errorMap: () => ({ message: "Concepto inválido" }),
  }),
  descripcion: z.string().trim().min(2, "Descripción requerida").max(500, "La descripción no puede exceder 500 caracteres"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodo_pago: z.enum(metodosEgreso, {
    errorMap: () => ({ message: "Método de pago inválido" }),
  }),
  beneficiario: z.string().trim().min(2, "Beneficiario requerido").max(120, "Beneficiario demasiado largo"),
  comprobante: z.string().trim().max(60, "Comprobante demasiado largo").optional().nullable(),
});

export type CajeroClientesQuery = z.infer<typeof cajeroClientesQuerySchema>;
export type CajeroEgresosQuery = z.infer<typeof cajeroEgresosQuerySchema>;
export type RegistrarEgresoInput = z.infer<typeof registrarEgresoSchema>;
export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
