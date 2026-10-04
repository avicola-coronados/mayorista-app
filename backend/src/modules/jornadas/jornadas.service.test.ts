import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jornadaFindUnique: vi.fn(),
  entradaGranjaAggregate: vi.fn(),
  sobranteAggregate: vi.fn(),
  lineaVentaAggregate: vi.fn(),
  devolucionAggregate: vi.fn(),
  lineaVentaGroupBy: vi.fn(),
  lineaVentaCount: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    jornada: { findUnique: mocks.jornadaFindUnique },
    entradaGranja: { aggregate: mocks.entradaGranjaAggregate },
    sobrante: { aggregate: mocks.sobranteAggregate },
    lineaVenta: {
      aggregate: mocks.lineaVentaAggregate,
      groupBy: mocks.lineaVentaGroupBy,
      count: mocks.lineaVentaCount,
    },
    devolucion: { aggregate: mocks.devolucionAggregate },
  },
}));

vi.mock("../guias/guias-sync.service", () => ({
  cerrarGuiasPorJornada: vi.fn(),
}));

import { calculateJornadaMetrics } from "./jornadas.service";

function decimal(value: number) {
  return { toNumber: () => value };
}

describe("calculateJornadaMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jornadaFindUnique.mockResolvedValue({
      id: 10,
      desperdicio_kg: decimal(2),
      muertero_kg: decimal(3),
    });
    mocks.entradaGranjaAggregate.mockResolvedValue({ _sum: { peso_neto: null } });
    mocks.sobranteAggregate.mockResolvedValue({ _sum: { peso_neto: null } });
    mocks.lineaVentaAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(100) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(110) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(10) } });
    mocks.devolucionAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(30) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(5) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(20) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(5) } });
    mocks.lineaVentaGroupBy.mockResolvedValue([{ cliente_id: 20, _count: { _all: 2 } }]);
    mocks.lineaVentaCount.mockResolvedValue(3);
  });

  it("separa piso vivo, pelado recuperable y merma sin duplicar la entrada", async () => {
    const metrics = await calculateJornadaMetrics(10);

    expect(metrics).toMatchObject({
      entrada_registrada_kg: 100,
      entrada_total_kg: 100,
      vendido_total_kg: 110,
      vendido_fisico_kg: 100,
      vendido_neto_kg: 80,
      piso_disponible_kg: 0,
      pelado_disponible_kg: 10,
      merma_kg: 10,
      merma_porcentaje: 10,
    });

    expect(
      metrics.vendido_neto_kg +
        metrics.piso_disponible_kg +
        metrics.pelado_disponible_kg +
        metrics.devoluciones_muertas_kg +
        metrics.desperdicio_kg +
        metrics.muertero_kg,
    ).toBe(metrics.entrada_total_kg);
  });
});
