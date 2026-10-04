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

export function calcularVendidoNeto(vendidoBrutoKg: number, devolucionesKg: number) {
  return roundKg(vendidoBrutoKg - devolucionesKg);
}

/** Entrada física registrada (granja, sobrante, piso) o estimada del día si no hay registro. */
export function calcularEntradaDiaMostrada(
  entradaRegistradaKg: number,
  vendidoFisicoKg: number,
) {
  if (entradaRegistradaKg > 0) {
    return roundKg(entradaRegistradaKg);
  }

  return roundKg(vendidoFisicoKg);
}

/** Inventario vivo: entrada física menos salidas físicas, recuperando solo devoluciones vivas. */
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
