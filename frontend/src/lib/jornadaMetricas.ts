export function roundKg(value: number) {
  return Number(value.toFixed(2));
}

export function calcularVendidoNeto(vendidoBrutoKg: number, devolucionesKg: number) {
  return roundKg(vendidoBrutoKg - devolucionesKg);
}

export function calcularEntradaDiaMostrada(
  entradaRegistradaKg: number,
  vendidoFisicoKg: number,
) {
  if (entradaRegistradaKg > 0) {
    return roundKg(entradaRegistradaKg);
  }

  return roundKg(vendidoFisicoKg);
}

export function calcularPisoJornada({
  entradaRegistradaKg,
  vendidoFisicoKg,
  devolucionesVivasKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaRegistradaKg: number;
  vendidoFisicoKg: number;
  devolucionesVivasKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  const entradaBase = entradaRegistradaKg > 0 ? entradaRegistradaKg : vendidoFisicoKg;

  return Math.max(
    0,
    roundKg(
      entradaBase - vendidoFisicoKg + devolucionesVivasKg - desperdicioKg - muerteroKg,
    ),
  );
}

export function calcularMermaJornada({
  devolucionesMuertasKg,
  desperdicioKg,
  muerteroKg,
}: {
  devolucionesMuertasKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  return roundKg(devolucionesMuertasKg + desperdicioKg + muerteroKg);
}

export function calcularPeladoDisponible(
  devolucionesPeladasKg: number,
  peladoDistribuidoKg: number,
) {
  return Math.max(0, roundKg(devolucionesPeladasKg - peladoDistribuidoKg));
}

export function calcularPorcentajeMerma(mermaKg: number, entradaKg: number) {
  if (entradaKg <= 0) {
    return 0;
  }

  return roundKg((mermaKg / entradaKg) * 100);
}
