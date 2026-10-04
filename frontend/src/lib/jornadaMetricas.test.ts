import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularMermaJornada,
  calcularPeladoDisponible,
  calcularPisoJornada,
  calcularVendidoNeto,
} from "./jornadaMetricas";

describe("jornadaMetricas", () => {
  it("estima la entrada física sin volver a sumar devoluciones", () => {
    expect(calcularEntradaDiaMostrada(0, 272)).toBe(272);
    expect(calcularVendidoNeto(272, 15)).toBe(257);
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 0,
        vendidoFisicoKg: 272,
        devolucionesVivasKg: 15,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(15);
  });

  it("mantiene en piso únicamente las devoluciones vivas", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 1000,
        vendidoFisicoKg: 980,
        devolucionesVivasKg: 10,
        desperdicioKg: 5,
        muerteroKg: 8,
      }),
    ).toBe(17);
  });

  it("no deja que el piso vivo sea negativo", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 250.4,
        vendidoFisicoKg: 280.1,
        devolucionesVivasKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("calcula merma con muerto, desperdicio y muertero", () => {
    expect(
      calcularMermaJornada({
        devolucionesMuertasKg: 10,
        desperdicioKg: 5,
        muerteroKg: 8,
      }),
    ).toBe(23);
  });

  it("separa el pelado recuperable de la merma", () => {
    expect(calcularPeladoDisponible(30, 12.5)).toBe(17.5);
  });
});
