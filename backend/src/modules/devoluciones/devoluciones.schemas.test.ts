import { describe, expect, it } from "vitest";
import { devolucionClienteSchema, devolucionLegacySchema } from "./devoluciones.schemas";

describe("devolucionClienteSchema", () => {
  it("acepta jabas y tara por jaba en una devolución desde Clientes", () => {
    expect(
      devolucionClienteSchema.parse({
        jornada_id: "10",
        cliente_id: "20",
        tipo: "vivo",
        jabas: "2",
        tara_por_jaba: "5.8",
        peso_bruto: "37.1",
      }),
    ).toEqual({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "vivo",
      jabas: 2,
      tara_por_jaba: 5.8,
      peso_bruto: 37.1,
    });
  });

  it("permite omitir jabas y tara", () => {
    expect(
      devolucionClienteSchema.parse({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "pelado",
        peso_bruto: 25,
      }),
    ).toEqual({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "pelado",
      jabas: 0,
      tara_por_jaba: 0,
      peso_bruto: 25,
    });
  });

  it.each([
    { jabas: -1, tara_por_jaba: 5.8 },
    { jabas: 1.5, tara_por_jaba: 5.8 },
    { jabas: 2, tara_por_jaba: -1 },
  ])("rechaza jabas o tara inválidas", ({ jabas, tara_por_jaba }) => {
    expect(
      devolucionClienteSchema.safeParse({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "vivo",
        jabas,
        tara_por_jaba,
        peso_bruto: 37.1,
      }).success,
    ).toBe(false);
  });
});

describe("devolucionLegacySchema", () => {
  it("permite omitir jabas y tara", () => {
    expect(
      devolucionLegacySchema.parse({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "muerto",
        peso_bruto: 25,
        peso_neto: 25,
      }),
    ).toEqual({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "muerto",
      jabas: 0,
      peso_bruto: 25,
      tara: 0,
      peso_neto: 25,
    });
  });
});
