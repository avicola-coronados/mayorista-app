import { describe, expect, it } from "vitest";
import type { PrecioHistorial } from "../../services/api";
import { getPrecioClienteVigente } from "./AdminPrecios";

function precio(
  id: string,
  clienteId: number | null,
  vigente: boolean,
): PrecioHistorial {
  return {
    id,
    producto_id: 1,
    cliente_id: clienteId,
    cliente: clienteId ? { id: clienteId, nombre: `Cliente ${clienteId}` } : null,
    precio: 5.5,
    fecha_desde: "2026-10-04",
    fecha_hasta: vigente ? null : "2026-10-03",
    vigente,
    creado_por: { id: 1, nombre: "Admin", username: "admin" },
    creado_en: "2026-10-04T12:00:00.000Z",
  };
}

describe("getPrecioClienteVigente", () => {
  it("selecciona únicamente el precio vigente del cliente indicado", () => {
    const historial = [
      precio("general", null, true),
      precio("anterior", 20, false),
      precio("actual", 20, true),
      precio("otro", 30, true),
    ];

    expect(getPrecioClienteVigente(historial, 20)?.id).toBe("actual");
    expect(getPrecioClienteVigente(historial, 99)).toBeUndefined();
  });
});
