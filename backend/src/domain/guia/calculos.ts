import { calcularPesoNeto, calcularTara, DEFAULT_TARA_POR_JABA, roundKg } from "../pesadas/calculos";

export { DEFAULT_TARA_POR_JABA };

export type LineaGuiaCalculoInput = {
  jabas: number;
  peso_bruto: number;
  tara_por_jaba?: number;
  tara?: number;
  devolucion_kg?: number;
  peladuria?: number;
};

export type LineaGuiaCalculada = {
  tara: number;
  tara_por_jaba: number;
  peso_neto: number;
  neto_total: number;
  importe_guia: number;
  importe_total: number;
};

export function calcularLineaGuia(input: LineaGuiaCalculoInput, precioKg: number): LineaGuiaCalculada {
  if (!Number.isInteger(input.jabas) || input.jabas <= 0) {
    throw new Error("El número de jabas debe ser mayor a 0");
  }

  if (input.peso_bruto < 0) {
    throw new Error("El peso bruto no puede ser negativo");
  }

  const taraPorJaba = input.tara_por_jaba ?? DEFAULT_TARA_POR_JABA;
  const tara = input.tara ?? calcularTara(input.jabas, taraPorJaba);

  if (tara < 0 || tara > input.peso_bruto) {
    throw new Error("La tara debe ser mayor o igual a 0 y no superar el peso bruto");
  }

  const devolucionKg = roundKg(input.devolucion_kg ?? 0);
  if (devolucionKg < 0) {
    throw new Error("La devolución no puede ser negativa");
  }

  const pesoNeto = calcularPesoNeto(input.peso_bruto, tara);

  if (devolucionKg > pesoNeto) {
    throw new Error("La devolución no puede superar el peso neto");
  }

  const netoTotal = roundKg(pesoNeto - devolucionKg);
  const peladuria = roundKg(input.peladuria ?? 0);

  if (peladuria < 0) {
    throw new Error("La peladuría no puede ser negativa");
  }

  if (precioKg <= 0) {
    throw new Error("El precio por kg debe ser mayor a 0");
  }

  const importeGuia = roundKg(netoTotal * precioKg);
  const importeTotal = roundKg(importeGuia + peladuria);

  return {
    tara,
    tara_por_jaba: taraPorJaba,
    peso_neto: pesoNeto,
    neto_total: netoTotal,
    importe_guia: importeGuia,
    importe_total: importeTotal,
  };
}

export function calcularTotalesGuia(
  lineas: Array<{
    peso_neto: number;
    devolucion_kg: number;
    neto_total: number;
    importe_guia: number;
    peladuria: number;
    importe_total: number;
  }>,
  saldoAnterior: number,
) {
  const totalPesoNeto = roundKg(lineas.reduce((sum, linea) => sum + linea.peso_neto, 0));
  const totalDevolucion = roundKg(lineas.reduce((sum, linea) => sum + linea.devolucion_kg, 0));
  const totalNeto = roundKg(lineas.reduce((sum, linea) => sum + linea.neto_total, 0));
  const totalImporte = roundKg(lineas.reduce((sum, linea) => sum + linea.importe_guia, 0));
  const totalPeladuria = roundKg(lineas.reduce((sum, linea) => sum + linea.peladuria, 0));
  const totalLineas = roundKg(lineas.reduce((sum, linea) => sum + linea.importe_total, 0));
  const totalGeneral = roundKg(totalLineas + saldoAnterior);

  return {
    total_peso_neto: totalPesoNeto,
    total_devolucion: totalDevolucion,
    total_neto: totalNeto,
    total_importe: totalImporte,
    total_peladuria: totalPeladuria,
    total_general: totalGeneral,
  };
}
