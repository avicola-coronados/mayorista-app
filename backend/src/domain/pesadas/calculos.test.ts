import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularMerma,
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

  it("suma desperdicio y muertero a la merma junto con entrada menos neto", () => {
    const merma = calcularMerma({
      entradaKg: 1000,
      vendidoNetoKg: 940,
      desperdicioKg: 5,
      muerteroKg: 8,
    });

    expect(merma).toBe(73);
    expect(calcularPorcentajeMerma(merma, 1000)).toBe(7.3);
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

  it("deja ver el descuadre cuando el neto supera la entrada", () => {
    expect(
      calcularMerma({
        entradaKg: 13291.5,
        vendidoNetoKg: 23127.8,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(-9836.3);

    expect(
      calcularMermaJornada({
        entradaRegistradaKg: 13291.5,
        vendidoBrutoKg: 23427.8,
        devolucionesKg: 300,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(-9836.3);

    expect(calcularPorcentajeMerma(-9836.3, 13291.5)).toBe(-74.0);
  });

  it("evita division por cero y reporta el porcentaje con signo", () => {
    expect(calcularPorcentajeMerma(0, 0)).toBe(0);
    expect(calcularPorcentajeMerma(-10, 1000)).toBe(-1);
    expect(calcularPorcentajeMerma(1500, 1000)).toBe(150);
  });
});
