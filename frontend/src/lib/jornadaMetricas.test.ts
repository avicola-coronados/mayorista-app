import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularMermaJornada,
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

  it("no permite merma negativa si una pesada vende más que la entrada", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 250.4,
        vendidoBrutoKg: 280.1,
        devolucionesKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("calcula merma como muertero + desperdicio + (entrada - neto)", () => {
    expect(
      calcularMermaJornada({
        entradaRegistradaKg: 1000,
        vendidoBrutoKg: 950,
        devolucionesKg: 10,
        desperdicioKg: 5,
        muerteroKg: 8,
      }),
    ).toBe(73);
  });
});
