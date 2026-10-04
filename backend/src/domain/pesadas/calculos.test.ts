import { describe, expect, it } from "vitest";
import {
  calcularEntradaDiaMostrada,
  calcularMermaJornada,
  calcularPeladoDisponible,
  calcularPesoNeto,
  calcularPisoJornada,
  calcularPisoTrasEditarLinea,
  calcularPorcentajeMerma,
  calcularTara,
  calcularVendidoNeto,
} from "./calculos";

describe("calculos de pesadas", () => {
  it("calcula tara y peso neto redondeados", () => {
    expect(calcularTara(10, 5.8)).toBe(58);
    expect(calcularPesoNeto(250.456, 58.111)).toBe(192.34);
  });

  it("proyecta el piso al corregir una entrada o una partida", () => {
    expect(
      calcularPisoTrasEditarLinea({
        disponibleKg: 20,
        pesoAnteriorKg: 100,
        factorAnterior: 1,
        pesoNuevoKg: 90,
        factorNuevo: 1,
      }),
    ).toEqual({ peso_neto: 10 });

    expect(
      calcularPisoTrasEditarLinea({
        disponibleKg: 20,
        pesoAnteriorKg: 50,
        factorAnterior: -1,
        pesoNuevoKg: 75,
        factorNuevo: -1,
      }),
    ).toEqual({ peso_neto: -5 });
  });

  it("calcula la merma solo con pérdidas no recuperables", () => {
    const merma = calcularMermaJornada({
      devolucionesMuertasKg: 10,
      desperdicioKg: 5,
      muerteroKg: 8,
    });

    expect(merma).toBe(23);
    expect(calcularPorcentajeMerma(merma, 1000)).toBe(2.3);
  });

  it("mantiene el pelado devuelto fuera de merma hasta redistribuirlo", () => {
    expect(calcularPeladoDisponible(30, 0)).toBe(30);
    expect(calcularPeladoDisponible(30, 12.5)).toBe(17.5);
    expect(calcularPeladoDisponible(30, 35)).toBe(0);
  });

  it("mantiene en piso lo no asignado y lo descuenta al registrar la partida", () => {
    const ingresoDirectoKg = 450.1;
    const ingresoPisoKg = 200;
    const entradaTotal = ingresoDirectoKg + ingresoPisoKg;

    expect(
      calcularPisoJornada({
        entradaRegistradaKg: entradaTotal,
        vendidoFisicoKg: ingresoDirectoKg,
        devolucionesVivasKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(200);

    expect(
      calcularPisoJornada({
        entradaRegistradaKg: entradaTotal,
        vendidoFisicoKg: entradaTotal,
        devolucionesVivasKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("estima entrada y piso cuando no hay registro de granja", () => {
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

  it("mantiene el piso en cero si se vendió más que la entrada", () => {
    expect(
      calcularPisoJornada({
        entradaRegistradaKg: 1000,
        vendidoFisicoKg: 1100,
        devolucionesVivasKg: 0,
        desperdicioKg: 0,
        muerteroKg: 0,
      }),
    ).toBe(0);
  });

  it("mantiene balanceada la jornada con devoluciones y redistribución de pelado", () => {
    const entrada = 100;
    const vendidoTotal = 110;
    const peladoDistribuido = 10;
    const devolucionViva = 5;
    const devolucionPelada = 20;
    const devolucionMuerta = 5;
    const desperdicio = 2;
    const muertero = 3;
    const vendidoFisico = vendidoTotal - peladoDistribuido;
    const vendidoNeto = calcularVendidoNeto(
      vendidoTotal,
      devolucionViva + devolucionPelada + devolucionMuerta,
    );
    const pisoVivo = calcularPisoJornada({
      entradaRegistradaKg: entrada,
      vendidoFisicoKg: vendidoFisico,
      devolucionesVivasKg: devolucionViva,
      desperdicioKg: desperdicio,
      muerteroKg: muertero,
    });
    const peladoDisponible = calcularPeladoDisponible(
      devolucionPelada,
      peladoDistribuido,
    );
    const merma = calcularMermaJornada({
      devolucionesMuertasKg: devolucionMuerta,
      desperdicioKg: desperdicio,
      muerteroKg: muertero,
    });

    expect(vendidoNeto).toBe(80);
    expect(pisoVivo).toBe(0);
    expect(peladoDisponible).toBe(10);
    expect(merma).toBe(10);
    expect(
      vendidoNeto + pisoVivo + peladoDisponible + devolucionMuerta + desperdicio + muertero,
    ).toBe(entrada);
  });

  it("no incluye devoluciones vivas ni peladas en la merma", () => {
    expect(
      calcularMermaJornada({
        devolucionesMuertasKg: 0,
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
