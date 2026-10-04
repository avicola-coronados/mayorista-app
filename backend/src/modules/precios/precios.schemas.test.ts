import { describe, expect, it } from "vitest";
import { createPrecioSchema, precioVigenteQuerySchema } from "./precios.schemas";

describe("esquemas de precios por cliente", () => {
  it("acepta un precio general o uno específico por cliente", () => {
    expect(
      createPrecioSchema.parse({ precio: "5.40", fecha_desde: "2026-10-04" }),
    ).toMatchObject({ precio: 5.4, fecha_desde: "2026-10-04" });

    expect(
      createPrecioSchema.parse({
        cliente_id: "20",
        precio: "6.10",
        fecha_desde: "2026-10-04",
      }),
    ).toMatchObject({ cliente_id: 20, precio: 6.1 });
  });

  it("permite consultar el precio efectivo de un cliente", () => {
    expect(precioVigenteQuerySchema.parse({ cliente_id: "20" })).toEqual({ cliente_id: 20 });
  });

  it("rechaza precios no positivos y clientes inválidos", () => {
    expect(
      createPrecioSchema.safeParse({ precio: 0, fecha_desde: "2026-10-04" }).success,
    ).toBe(false);
    expect(
      createPrecioSchema.safeParse({ cliente_id: 0, precio: 5, fecha_desde: "2026-10-04" })
        .success,
    ).toBe(false);
  });
});
