import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    jornada: { findUnique: vi.fn() },
    cliente: { findFirst: vi.fn() },
    devolucion: { create: vi.fn(), aggregate: vi.fn() },
    granja: { findFirst: vi.fn() },
    lineaVenta: { create: vi.fn(), aggregate: vi.fn() },
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
    syncGuia: vi.fn(),
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
  syncGuiaFromLineaVenta: mocks.syncGuia,
}));

import { createDevolucion, distribuirDevolucionPelado } from "./devoluciones.service";

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
    mocks.transaction.jornada.findUnique.mockResolvedValue({ id: 10, estado: "abierta" });
    mocks.transaction.cliente.findFirst.mockResolvedValue({ id: 20, nombre: "Cliente Uno" });
    mocks.transaction.devolucion.aggregate.mockResolvedValue({ _sum: { peso_neto: decimal(30) } });
    mocks.transaction.lineaVenta.aggregate.mockResolvedValue({ _sum: { peso_neto: decimal(5) } });
    mocks.transaction.lineaVenta.create.mockResolvedValue({
      id: 50,
      cliente_id: 20,
      jabas: 0,
      tara: decimal(0),
      peso_neto: decimal(10),
      created_at: new Date("2026-10-04T12:00:00.000Z"),
      cliente: { nombre: "Cliente Uno" },
    });
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

  it("crea la pesada viva sin jabas ni tara cuando no se registran", async () => {
    await createDevolucion({
      jornada_id: 10,
      cliente_id: 20,
      tipo: "vivo",
      jabas: 0,
      tara_por_jaba: 0,
      peso_bruto: 25,
    });

    expect(mocks.transaction.lineaVenta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jabas: 0,
        peso_bruto: 25,
        tara: 0,
        tara_por_jaba: 0,
        peso_neto: 25,
      }),
    });
  });

  it("distribuye pelado conservando el neto y sumando la tara al peso bruto", async () => {
    await distribuirDevolucionPelado(
      {
        jornada_id: 10,
        cliente_id: 20,
        peso_neto: 10,
        jabas: 2,
        tara_por_jaba: 1.5,
      },
      1,
    );

    expect(mocks.transaction.lineaVenta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jornada_id: 10,
        cliente_id: 20,
        granja_id: 40,
        origen: "partida",
        jabas: 2,
        peso_bruto: 13,
        tara: 3,
        tara_por_jaba: 1.5,
        peso_neto: 10,
        es_distribucion_pelado: true,
      }),
      include: { cliente: true },
    });
    expect(mocks.syncGuia).toHaveBeenCalledWith(50, 1);
  });
});
