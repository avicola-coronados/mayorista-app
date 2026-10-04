import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lineaVentaAggregate: vi.fn(),
  devolucionAggregate: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    lineaVenta: { aggregate: mocks.lineaVentaAggregate },
    devolucion: { aggregate: mocks.devolucionAggregate },
  },
}));

import { getPisoDisponible } from "./piso-disponible.service";

function decimal(value: number) {
  return { toNumber: () => value };
}

describe("getPisoDisponible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reincorpora al piso los kilos y jabas de devoluciones vivas", async () => {
    mocks.lineaVentaAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(100), jabas: 5 } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(70), jabas: 3 } });
    mocks.devolucionAggregate.mockResolvedValue({
      _sum: { peso_neto: decimal(15), jabas: 2 },
    });

    await expect(getPisoDisponible(10)).resolves.toEqual({
      peso_neto: 45,
      jabas: 4,
    });
    expect(mocks.devolucionAggregate).toHaveBeenCalledWith({
      where: { jornada_id: 10, tipo: "vivo" },
      _sum: { jabas: true, peso_neto: true },
    });
  });
});
