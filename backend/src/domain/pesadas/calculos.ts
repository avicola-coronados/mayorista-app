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

export function calcularMerma({
  entradaKg,
  vendidoNetoKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaKg: number;
  vendidoNetoKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  const diferencia = Math.max(0, roundKg(entradaKg - vendidoNetoKg));
  return roundKg(muerteroKg + desperdicioKg + diferencia);
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
  const vendidoNeto = calcularVendidoNeto(vendidoBrutoKg, devolucionesKg);
  const entradaKg = entradaRegistradaKg > 0 ? entradaRegistradaKg : 0;

  return calcularMerma({
    entradaKg,
    vendidoNetoKg: vendidoNeto,
    desperdicioKg,
    muerteroKg,
  });
}

export function calcularPorcentajeMerma(mermaKg: number, entradaKg: number) {
  if (entradaKg <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, roundKg((mermaKg / entradaKg) * 100)));
}
