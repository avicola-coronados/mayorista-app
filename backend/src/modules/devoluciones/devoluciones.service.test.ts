import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    devolucion: { create: vi.fn() },
    granja: { findFirst: vi.fn() },
    lineaVenta: { create: vi.fn() },
  };

  return {
    transaction,
    jornadaFindUnique: vi.fn(),
    clienteFindFirst: vi.fn(),
    lineaVentaAggregate: vi.fn(),
    devolucionAggregate: vi.fn(),
    runTransaction: vi.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction),
    ),
    syncDevolucion: vi.fn(),
  };
});

vi.mock("../../lib/prisma", () => ({
  prisma: {
    jornada: { findUnique: mocks.jornadaFindUnique },
    cliente: { findFirst: mocks.clienteFindFirst },
    lineaVenta: { aggregate: mocks.lineaVentaAggregate },
    devolucion: { aggregate: mocks.devolucionAggregate },
    $transaction: mocks.runTransaction,
  },
}));

vi.mock("../guias/guias-sync.service", () => ({
  syncDevolucionKgForCliente: mocks.syncDevolucion,
}));

import { createDevolucion } from "./devoluciones.service";

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value };
}

describe("createDevolucion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jornadaFindUnique.mockResolvedValue({ id: 10, estado: "abierta" });
    mocks.clienteFindFirst.mockResolvedValue({ id: 20, nombre: "Cliente Uno" });
    mocks.lineaVentaAggregate.mockResolvedValue({
      _count: { _all: 1 },
      _sum: { jabas: 5, peso_bruto: decimal(129), peso_neto: decimal(100) },
    });
    mocks.devolucionAggregate.mockResolvedValue({
      _sum: { jabas: null, peso_bruto: null, peso_neto: null },
    });
    mocks.transaction.devolucion.create.mockResolvedValue({
      id: 30,
      jornada_id: 10,
      cliente_id: 20,
      linea_venta_id: null,
      tipo: "vivo",
      jabas: 2,
      peso_bruto: decimal(36.6),
      tara: decimal(11.6),
      peso_neto: decimal(25),
      created_at: new Date("2026-10-04T12:00:00.000Z"),
      cliente: { nombre: "Cliente Uno" },
    });
    mocks.transaction.granja.findFirst.mockResolvedValue({ id: 40 });
    mocks.transaction.lineaVenta.create.mockResolvedValue({ id: 50 });
  });

  it("crea una pesada de piso vinculada para una devolución viva", async () => {
    await createDevolucion({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "vivo",
      jabas: 2,
      tara_por_jaba: 5.8,
      peso_bruto: 36.6,
    });

    expect(mocks.transaction.lineaVenta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jornada_id: 10,
        cliente_id: null,
        granja_id: 40,
        origen: "piso",
        jabas: 2,
        peso_bruto: 36.6,
        tara: 11.6,
        tara_por_jaba: 5.8,
        peso_neto: 25,
        devolucion_origen_id: 30,
      }),
    });
    expect(mocks.syncDevolucion).toHaveBeenCalledWith(10, 20);
  });
});
