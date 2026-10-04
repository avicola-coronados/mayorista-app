import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lineaVentaAggregate: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    lineaVenta: { aggregate: mocks.lineaVentaAggregate },
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

  it("incluye en el piso las pesadas creadas por devoluciones vivas", async () => {
    mocks.lineaVentaAggregate
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(115), jabas: 7 } })
      .mockResolvedValueOnce({ _sum: { peso_neto: decimal(70), jabas: 3 } });

    await expect(getPisoDisponible(10)).resolves.toEqual({
      peso_neto: 45,
      jabas: 4,
    });
  });
});
