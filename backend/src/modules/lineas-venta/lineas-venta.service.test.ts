import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jornadaFindUnique: vi.fn(),
  clienteFindFirst: vi.fn(),
  granjaFindFirst: vi.fn(),
  lineaVentaCreate: vi.fn(),
  getPisoDisponible: vi.fn(),
  syncGuia: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    jornada: { findUnique: mocks.jornadaFindUnique },
    cliente: { findFirst: mocks.clienteFindFirst },
    granja: { findFirst: mocks.granjaFindFirst },
    lineaVenta: { create: mocks.lineaVentaCreate },
  },
}));

vi.mock("./piso-disponible.service", () => ({
  PISO_GRANJA_NOMBRE: "Piso",
  getPisoDisponible: mocks.getPisoDisponible,
}));

vi.mock("../guias/guias-sync.service", () => ({
  syncGuiaFromLineaVenta: mocks.syncGuia,
}));

import { createLineaVenta } from "./lineas-venta.service";

describe("createLineaVenta para partidas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jornadaFindUnique.mockResolvedValue({ id: 10, estado: "abierta" });
    mocks.clienteFindFirst.mockResolvedValue({ id: 20, nombre: "Cliente Uno", activo: true });
    mocks.granjaFindFirst.mockResolvedValue({ id: 40, nombre: "Piso", activo: true });
    mocks.getPisoDisponible.mockResolvedValue({ peso_neto: 100 });
    mocks.lineaVentaCreate.mockResolvedValue({ id: 50 });
  });

  it("permite reutilizar cualquier cantidad de jabas si hay peso neto disponible", async () => {
    await createLineaVenta(
      {
        jornada_id: 10,
        cliente_id: 20,
        granja_id: 40,
        origen: "partida",
        jabas: 50,
        tara_por_jaba: 5.8,
        peso_bruto: 350,
      },
      1,
    );

    expect(mocks.lineaVentaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jabas: 50,
          tara: 290,
          peso_neto: 60,
        }),
      }),
    );
  });

  it("rechaza la partida cuando el peso neto supera el disponible", async () => {
    await expect(
      createLineaVenta(
        {
          jornada_id: 10,
          cliente_id: 20,
          granja_id: 40,
          origen: "partida",
          jabas: 1,
          tara_por_jaba: 5.8,
          peso_bruto: 120,
        },
        1,
      ),
    ).rejects.toThrow("100.00 kg netos");

    expect(mocks.lineaVentaCreate).not.toHaveBeenCalled();
  });
});
