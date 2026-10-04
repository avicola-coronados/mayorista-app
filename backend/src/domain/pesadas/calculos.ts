export const DEFAULT_TARA_POR_JABA = 5.8;

export function roundKg(value: number) {
  return Number(value.toFixed(2));
}

export function calcularTara(jabas: number, taraPorJaba: number) {
  return roundKg(jabas * taraPorJaba);
}

export function calcularPesoNeto(pesoBruto: number, tara: number) {
  return roundKg(pesoBruto - tara);
}

export function calcularPisoTrasEditarLinea({
  disponibleKg,
  pesoAnteriorKg,
  factorAnterior,
  pesoNuevoKg,
  factorNuevo,
}: {
  disponibleKg: number;
  pesoAnteriorKg: number;
  factorAnterior: -1 | 0 | 1;
  pesoNuevoKg: number;
  factorNuevo: -1 | 0 | 1;
}) {
  return {
    peso_neto: roundKg(
      disponibleKg - factorAnterior * pesoAnteriorKg + factorNuevo * pesoNuevoKg,
    ),
  };
}

export function calcularPisoDisponible({
  entradaKg,
  vendidoKg,
  devolucionesKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaKg: number;
  vendidoKg: number;
  devolucionesKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  return Math.max(0, roundKg(entradaKg - vendidoKg + devolucionesKg - desperdicioKg - muerteroKg));
}

export function calcularVendidoNeto(vendidoBrutoKg: number, devolucionesKg: number) {
  return roundKg(vendidoBrutoKg - devolucionesKg);
}

/** Entrada física registrada (granja, sobrante, piso) o estimada del día si no hay registro. */
export function calcularEntradaDiaMostrada(
  entradaRegistradaKg: number,
  vendidoBrutoKg: number,
  devolucionesKg: number,
) {
  if (entradaRegistradaKg > 0) {
    return roundKg(entradaRegistradaKg);
  }

  return roundKg(vendidoBrutoKg + devolucionesKg);
}

/** Piso sobrante al cierre: con entrada registrada usa balance neto; sin registro, devoluciones menos pérdidas. */
export function calcularPisoJornada({
  entradaRegistradaKg,
  vendidoBrutoKg,
  devolucionesKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaRegistradaKg: number;
  vendidoBrutoKg: number;
  devolucionesKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  const vendidoNeto = calcularVendidoNeto(vendidoBrutoKg, devolucionesKg);

  if (entradaRegistradaKg > 0) {
    return Math.max(0, roundKg(entradaRegistradaKg - vendidoNeto - desperdicioKg - muerteroKg));
  }

  return Math.max(0, roundKg(devolucionesKg - desperdicioKg - muerteroKg));
}

export function calcularMermaJornada({
  entradaRegistradaKg,
  vendidoBrutoKg,
  devolucionesKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaRegistradaKg: number;
  vendidoBrutoKg: number;
  devolucionesKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  return calcularPisoJornada({
    entradaRegistradaKg,
    vendidoBrutoKg,
    devolucionesKg,
    desperdicioKg,
    muerteroKg,
  });
}

export function calcularPorcentajeMerma(mermaKg: number, entradaKg: number) {
  if (entradaKg <= 0) {
    return 0;
  }

  return roundKg((mermaKg / entradaKg) * 100);
}
