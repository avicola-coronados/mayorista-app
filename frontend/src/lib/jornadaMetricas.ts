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
