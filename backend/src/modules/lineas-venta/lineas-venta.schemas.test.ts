import { describe, expect, it } from "vitest";
import { updateDetalleLineaVentaSchema } from "./lineas-venta.schemas";

describe("updateDetalleLineaVentaSchema", () => {
  it("acepta y convierte los campos editables de una pesada", () => {
    expect(
      updateDetalleLineaVentaSchema.parse({
        granja_id: "2",
        jabas: "4",
        tara_por_jaba: "5.8",
      }),
    ).toEqual({ granja_id: 2, jabas: 4, tara_por_jaba: 5.8 });
  });

  it.each([
    [{ granja_id: 2, jabas: 0, tara_por_jaba: 5.8 }],
    [{ granja_id: 2, jabas: 2.5, tara_por_jaba: 5.8 }],
    [{ granja_id: 2, jabas: 2, tara_por_jaba: 0 }],
  ])("rechaza cantidades que producirían una pesada inválida", (payload) => {
    expect(updateDetalleLineaVentaSchema.safeParse(payload).success).toBe(false);
  });
});
