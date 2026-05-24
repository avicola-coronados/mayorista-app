export const TARA_POR_JABA_DEFAULT = 6;

export function roundKg(value: number) {
  return Number(value.toFixed(2));
}

export function calcularTaraTotal(jabas: number, taraPorJaba = TARA_POR_JABA_DEFAULT) {
  return roundKg(jabas * taraPorJaba);
}

export type PesadaCalculoInput = {
  jabas: number;
  pesoBruto: number;
  tara: number;
  devolucion?: number;
  peladuria?: number;
};

export type PesadaCalculada = {
  pesoNeto: number;
  netoTotal: number;
  importeGuia: number;
  importeTotal: number;
};

export function calcularPesadaPreview(input: PesadaCalculoInput, precioKg: number): PesadaCalculada {
  const pesoNeto = roundKg(input.pesoBruto - input.tara);
  const devolucion = roundKg(input.devolucion ?? 0);
  const netoTotal = roundKg(pesoNeto - devolucion);
  const peladuria = roundKg(input.peladuria ?? 0);
  const importeGuia = roundKg(netoTotal * precioKg);
  const importeTotal = roundKg(importeGuia + peladuria);

  return {
    pesoNeto,
    netoTotal,
    importeGuia,
    importeTotal,
  };
}

export function validarPesada(input: PesadaCalculoInput) {
  const errors: string[] = [];

  if (!Number.isInteger(input.jabas) || input.jabas < 1) {
    errors.push("El número de jabas debe ser mayor a 0");
  }

  if (!Number.isFinite(input.pesoBruto) || input.pesoBruto <= 0) {
    errors.push("Ingresa el peso bruto");
  }

  if (!Number.isFinite(input.tara) || input.tara < 0) {
    errors.push("Ingresa la tara");
  }

  if (Number.isFinite(input.pesoBruto) && Number.isFinite(input.tara) && input.pesoBruto <= input.tara) {
    errors.push("El peso bruto debe ser mayor que la tara");
  }

  const pesoNeto = roundKg(input.pesoBruto - input.tara);
  const devolucion = roundKg(input.devolucion ?? 0);

  if (devolucion > pesoNeto) {
    errors.push("La devolución no puede superar el peso neto");
  }

  return errors;
}
