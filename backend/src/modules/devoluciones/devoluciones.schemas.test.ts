import { describe, expect, it } from "vitest";
import { devolucionClienteSchema } from "./devoluciones.schemas";

describe("devolucionClienteSchema", () => {
  it("acepta jabas y tara por jaba en una devolución desde Clientes", () => {
    expect(
      devolucionClienteSchema.parse({
        jornada_id: "10",
        cliente_id: "20",
        tipo: "vivo",
        jabas: "2",
        tara_por_jaba: "5.8",
        peso_neto: "25.5",
      }),
    ).toEqual({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "vivo",
      jabas: 2,
      tara_por_jaba: 5.8,
      peso_neto: 25.5,
    });
  });

  it.each([
    { jabas: 0, tara_por_jaba: 5.8 },
    { jabas: 1.5, tara_por_jaba: 5.8 },
    { jabas: 2, tara_por_jaba: 0 },
  ])("rechaza jabas o tara inválidas", ({ jabas, tara_por_jaba }) => {
    expect(
      devolucionClienteSchema.safeParse({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "vivo",
        jabas,
        tara_por_jaba,
        peso_neto: 25.5,
      }).success,
    ).toBe(false);
  });
});
