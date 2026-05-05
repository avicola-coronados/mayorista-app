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

export function calcularMerma({
  entradaKg,
  vendidoKg,
  devolucionesKg,
  sobranteKg,
  desperdicioKg,
  muerteroKg,
}: {
  entradaKg: number;
  vendidoKg: number;
  devolucionesKg: number;
  sobranteKg: number;
  desperdicioKg: number;
  muerteroKg: number;
}) {
  return roundKg(entradaKg - vendidoKg + devolucionesKg - sobranteKg - desperdicioKg - muerteroKg);
}

export function calcularPorcentajeMerma(mermaKg: number, entradaKg: number) {
  if (entradaKg <= 0) {
    return 0;
  }

  return roundKg((mermaKg / entradaKg) * 100);
}
