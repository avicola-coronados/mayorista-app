import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularMermaJornada,
  calcularPesoNeto,
  calcularPisoDisponible,
  calcularPisoJornada,
  calcularPorcentajeMerma,
  calcularTara,
  calcularVendidoNeto,
} from "./calculos";

describe("calculos de pesadas", () => {
  it("calcula tara y peso neto redondeados", () => {
    expect(calcularTara(10, 5.8)).toBe(58);
    expect(calcularPesoNeto(250.456, 58.111)).toBe(192.34);
  });

  it("calcula piso disponible sin devoluciones ni desperdicio", () => {
    const piso = calcularPisoDisponible({
      entradaKg: 1000,
      vendidoKg: 980,
      devolucionesKg: 0,
      desperdicioKg: 0,
      muerteroKg: 0,
    });

    expect(piso).toBe(20);
    expect(calcularPorcentajeMerma(piso, 1000)).toBe(2);
  });

  it("suma devoluciones al piso disponible segun formula vigente", () => {
    expect(
      calcularPisoDisponible({
        entradaKg: 1000,
        vendidoKg: 980,
        devolucionesKg: 50,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(70);
  });

  it("descuenta desperdicio y muertero del piso disponible y la merma", () => {
    const merma = calcularMermaJornada({
      entradaRegistradaKg: 1000,
      vendidoBrutoKg: 950,
      devolucionesKg: 10,
      desperdicioKg: 5,
      muerteroKg: 8,
    });

    expect(merma).toBe(47);
    expect(calcularPorcentajeMerma(merma, 1000)).toBe(4.7);
    expect(
      calcularMermaJornada({
        entradaRegistradaKg: 1000,
        vendidoBrutoKg: 950,
        devolucionesKg: 10,
        desperdicioKg: 5,
        muerteroKg: 8,
      }),
    ).toBe(47);
  });

  it("considera sobrante dentro de la entrada total", () => {
    const entradaTotal = 1000 + 50;
    const piso = calcularPisoDisponible({
      entradaKg: entradaTotal,
      vendidoKg: 1020,
      devolucionesKg: 0,
      desperdicioKg: 0,
      muerteroKg: 0,
    });

    expect(piso).toBe(30);
    expect(calcularPorcentajeMerma(piso, entradaTotal)).toBe(2.86);
  });

  it("considera el ingreso a piso dentro de la entrada total", () => {
    const entradaTotal = 1620.8;
    const piso = calcularPisoDisponible({
      entradaKg: entradaTotal,
      vendidoKg: 1620.8,
      devolucionesKg: 0,
      desperdicioKg: 0,
      muerteroKg: 0,
    });

    expect(piso).toBe(0);
    expect(calcularPorcentajeMerma(piso, entradaTotal)).toBe(0);
  });

  it("mantiene en piso lo no asignado y lo descuenta al registrar la partida", () => {
    const ingresoDirectoKg = 450.1;
    const ingresoPisoKg = 200;
    const entradaTotal = ingresoDirectoKg + ingresoPisoKg;

    expect(
      calcularPisoJornada({
        entradaRegistradaKg: entradaTotal,
        vendidoBrutoKg: ingresoDirectoKg,
        devolucionesKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(200);

    expect(
      calcularPisoJornada({
        entradaRegistradaKg: entradaTotal,
        vendidoBrutoKg: entradaTotal,
        devolucionesKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("permite que una entrada de piso asignada a cliente cuente como entrada y venta", () => {
    const entradaTotal = 1620.8;
    const vendidoTotal = 1620.8;
    const piso = calcularPisoDisponible({
      entradaKg: entradaTotal,
      vendidoKg: vendidoTotal,
      devolucionesKg: 0,
      desperdicioKg: 0,
      muerteroKg: 0,
    });

    expect(piso).toBe(0);
    expect(calcularPorcentajeMerma(piso, entradaTotal)).toBe(0);
  });

  it("estima entrada y piso cuando no hay registro de granja", () => {
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

  it("mantiene el piso en cero si se vendió más que la entrada", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 1000,
        vendidoBrutoKg: 1100,
        devolucionesKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);

    expect(
      calcularPisoDisponible({
        entradaKg: 100,
        vendidoKg: 150,
        devolucionesKg: 10,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("evita merma negativa cuando el neto supera la entrada", () => {
    expect(
      calcularMermaJornada({
        entradaRegistradaKg: 13291.5,
        vendidoBrutoKg: 23427.8,
        devolucionesKg: 300,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("evita division por cero y calcula el porcentaje", () => {
    expect(calcularPorcentajeMerma(0, 0)).toBe(0);
    expect(calcularPorcentajeMerma(1500, 1000)).toBe(150);
  });
});
