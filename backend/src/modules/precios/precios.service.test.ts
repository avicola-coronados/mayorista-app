import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  precioFindMany: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    precio: { findMany: mocks.precioFindMany },
  },
}));

import { obtenerPrecioVigente } from "./precios.service";

function precio(overrides: { id: string; cliente_id: number | null; precio: number }) {
  return {
    id: overrides.id,
    producto_id: 1,
    cliente_id: overrides.cliente_id,
    precio: new Prisma.Decimal(overrides.precio),
    fecha_desde: new Date("2026-10-04T12:00:00.000Z"),
    fecha_hasta: null,
    vigente: true,
    creado_en: new Date("2026-10-04T12:00:00.000Z"),
  };
}

describe("obtenerPrecioVigente por cliente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prioriza el precio específico del cliente", async () => {
    mocks.precioFindMany.mockResolvedValue([precio({ id: "cliente", cliente_id: 20, precio: 6.25 })]);

    const result = await obtenerPrecioVigente(1, "2026-10-04", 20);

    expect(result).toMatchObject({
      precio_kg: 6.25,
      precio_id: "cliente",
      cliente_id: 20,
      origen: "cliente",
    });
    expect(mocks.precioFindMany).toHaveBeenCalledOnce();
  });

  it("usa el precio general cuando el cliente no tiene uno propio", async () => {
    mocks.precioFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([precio({ id: "general", cliente_id: null, precio: 5.4 })]);

    const result = await obtenerPrecioVigente(1, "2026-10-04", 20);

    expect(result).toMatchObject({
      precio_kg: 5.4,
      precio_id: "general",
      cliente_id: null,
      origen: "rango",
    });
    expect(mocks.precioFindMany).toHaveBeenCalledTimes(2);
  });
});
