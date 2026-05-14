import { z } from "zod";

export const jornadaIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Jornada inválida"),
});

export const cierreJornadaSchema = z.object({
  desperdicio_kg: z.coerce.number().min(0, "El desperdicio debe ser positivo"),
  muertero_kg: z.coerce.number().min(0, "El muertero debe ser positivo"),
});

export const jornadasListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().optional(),
    fecha_inicio: z.string().trim().optional(),
    fecha_fin: z.string().trim().optional(),
    estado: z.enum(["abierta", "cerrada"]).optional(),
  })
  .superRefine((data, context) => {
    if (data.fecha_inicio && Number.isNaN(Date.parse(data.fecha_inicio))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de inicio inválida",
        path: ["fecha_inicio"],
      });
    }

    if (data.fecha_fin && Number.isNaN(Date.parse(data.fecha_fin))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de fin inválida",
        path: ["fecha_fin"],
      });
    }
  });

export const jornadaExportQuerySchema = z.object({
  format: z.enum(["pdf", "excel"]).optional(),
});

export type CierreJornadaInput = z.infer<typeof cierreJornadaSchema>;
export type JornadasListQuery = z.infer<typeof jornadasListQuerySchema>;
