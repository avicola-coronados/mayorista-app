import { describe, expect, it } from "vitest";
import { calcularLineaGuia, calcularTotalesGuia } from "./calculos";

describe("calcularLineaGuia", () => {
  it("calcula peso neto, neto total e importes", () => {
    const result = calcularLineaGuia(
      {
        jabas: 5,
        peso_bruto: 150,
        tara_por_jaba: 5.8,
        devolucion_kg: 2,
        peladuria: 10,
      },
      4.5,
    );

    expect(result.tara).toBe(29);
    expect(result.peso_neto).toBe(121);
    expect(result.neto_total).toBe(119);
    expect(result.importe_guia).toBe(535.5);
    expect(result.importe_total).toBe(545.5);
  });

  it("rechaza devolución mayor al peso neto", () => {
    expect(() =>
      calcularLineaGuia({ jabas: 1, peso_bruto: 10, devolucion_kg: 20 }, 4),
    ).toThrow("La devolución no puede superar el peso neto");
  });

  it("acepta peso neto sin jabas ni tara para una distribución de pelado", () => {
    const result = calcularLineaGuia(
      { jabas: 0, peso_bruto: 12.5, tara: 0, tara_por_jaba: 0 },
      5,
    );

    expect(result).toMatchObject({
      tara: 0,
      peso_neto: 12.5,
      neto_total: 12.5,
      importe_guia: 62.5,
    });
  });
});

describe("calcularTotalesGuia", () => {
  it("suma líneas y saldo anterior", () => {
    const totals = calcularTotalesGuia(
      [
        {
          peso_neto: 100,
          devolucion_kg: 5,
          neto_total: 95,
          importe_guia: 427.5,
          peladuria: 10,
          importe_total: 437.5,
        },
      ],
      50,
    );

    expect(totals.total_neto).toBe(95);
    expect(totals.total_general).toBe(487.5);
  });
});
