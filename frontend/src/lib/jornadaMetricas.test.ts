import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularPisoJornada,
  calcularVendidoNeto,
} from "./jornadaMetricas";

describe("jornadaMetricas", () => {
  it("estima entrada del día cuando no hay registro físico", () => {
    expect(calcularEntradaDiaMostrada(0, 272, 15)).toBe(287);
    expect(calcularVendidoNeto(272, 15)).toBe(257);
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 0,
        vendidoBrutoKg: 272,
        devolucionesKg: 15,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(15);
  });

  it("mantiene balance con entrada registrada", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 1000,
        vendidoBrutoKg: 980,
        devolucionesKg: 50,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(70);
  });
});
