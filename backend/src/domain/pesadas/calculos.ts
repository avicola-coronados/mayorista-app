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
  return roundKg(entradaKg - vendidoKg + devolucionesKg - desperdicioKg - muerteroKg);
}

export function calcularMerma(params: Parameters<typeof calcularPisoDisponible>[0]) {
  return calcularPisoDisponible(params);
}

export function calcularPorcentajeMerma(mermaKg: number, entradaKg: number) {
  if (entradaKg <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, roundKg((mermaKg / entradaKg) * 100)));
}
