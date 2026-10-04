export function roundKg(value: number) {
  return Number(value.toFixed(2));
}

export function calcularVendidoNeto(vendidoBrutoKg: number, devolucionesKg: number) {
  return roundKg(vendidoBrutoKg - devolucionesKg);
}

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
