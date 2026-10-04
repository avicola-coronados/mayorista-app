import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lineaVentaAggregate: vi.fn(),
  jornadaFindUnique: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    lineaVenta: { aggregate: mocks.lineaVentaAggregate },
    jornada: { findUnique: mocks.jornadaFindUnique },
  },
}));

import { getPisoDisponible } from "./piso-disponible.service";

function decimal(value: number) {
  return { toNumber: () => value };
}

describe("getPisoDisponible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jornadaFindUnique.mockResolvedValue({
      desperdicio_kg: decimal(0),
      muertero_kg: decimal(0),
    });
  });

  it("incluye en el piso las pesadas creadas por devoluciones vivas", async () => {
    mocks.lineaVentaAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(115) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(70) } });

    await expect(getPisoDisponible(10)).resolves.toEqual({
      peso_neto: 45,
    });
  });

  it("descuenta desperdicio y muertero conservados al reabrir una jornada", async () => {
    mocks.lineaVentaAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(115) } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(70) } });
    mocks.jornadaFindUnique.mockResolvedValue({
      desperdicio_kg: decimal(3),
      muertero_kg: decimal(2),
    });

    await expect(getPisoDisponible(10)).resolves.toEqual({
      peso_neto: 40,
    });
  });
});
