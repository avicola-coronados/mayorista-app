import { describe, expect, it } from "vitest";
import {
  cerrarPrecioVigente,
  DEFAULT_PRECIO_KG,
  resolverPrecioVigente,
  type PrecioRecord,
} from "./resolverPrecioVigente";

const productoId = 1;

function precio(partial: Partial<PrecioRecord> & Pick<PrecioRecord, "id" | "precio" | "fecha_desde">): PrecioRecord {
  return {
    producto_id: productoId,
    fecha_hasta: null,
    vigente: false,
    ...partial,
  };
}

describe("resolverPrecioVigente", () => {
  it("obtiene el precio vigente para hoy", () => {
    const precios: PrecioRecord[] = [
      precio({
        id: "old",
        precio: 4.5,
        fecha_desde: "2026-05-01",
        fecha_hasta: "2026-05-22",
        vigente: false,
      }),
      precio({
        id: "current",
        precio: 5.25,
        fecha_desde: "2026-05-23",
        vigente: true,
      }),
    ];

    const result = resolverPrecioVigente(precios, productoId, "2026-05-23");

    expect(result.precio).toBe(5.25);
    expect(result.precio_id).toBe("current");
    expect(result.origen).toBe("rango");
  });

  it("obtiene el precio vigente para una fecha pasada", () => {
    const precios: PrecioRecord[] = [
      precio({
        id: "old",
        precio: 4.5,
        fecha_desde: "2026-05-01",
        fecha_hasta: "2026-05-22",
        vigente: false,
      }),
      precio({
        id: "current",
        precio: 5.25,
        fecha_desde: "2026-05-23",
        vigente: true,
      }),
    ];

    const result = resolverPrecioVigente(precios, productoId, "2026-05-15");

    expect(result.precio).toBe(4.5);
    expect(result.precio_id).toBe("old");
    expect(result.origen).toBe("rango");
  });

  it("usa el último precio disponible si no hay configuración para la fecha", () => {
    const precios: PrecioRecord[] = [
      precio({
        id: "only",
        precio: 4.8,
        fecha_desde: "2026-05-01",
        fecha_hasta: "2026-05-10",
        vigente: false,
      }),
    ];

    const result = resolverPrecioVigente(precios, productoId, "2026-05-20");

    expect(result.precio).toBe(4.8);
    expect(result.origen).toBe("ultimo_disponible");
  });

  it("devuelve el precio default si no hay histórico", () => {
    const result = resolverPrecioVigente([], productoId, "2026-05-23");

    expect(result.precio).toBe(DEFAULT_PRECIO_KG);
    expect(result.precio_id).toBeNull();
    expect(result.origen).toBe("default");
  });
});

describe("cerrarPrecioVigente", () => {
  it("marca el precio anterior como no vigente con fecha_hasta", () => {
    const actual = precio({
      id: "prev",
      precio: 4.5,
      fecha_desde: "2026-05-01",
      vigente: true,
    });

    const cerrado = cerrarPrecioVigente(actual, "2026-05-23");

    expect(cerrado.vigente).toBe(false);
    expect(cerrado.fecha_hasta).toBe("2026-05-23");
  });
});

describe("createPrecio flow", () => {
  it("al crear un nuevo precio, el anterior queda no vigente", () => {
    const anteriores: PrecioRecord[] = [
      precio({
        id: "prev",
        precio: 4.5,
        fecha_desde: "2026-05-01",
        vigente: true,
      }),
    ];

    const fechaCierre = "2026-05-23";
    const cerrados = anteriores.map((item) => (item.vigente ? cerrarPrecioVigente(item, fechaCierre) : item));

    const nuevo = precio({
      id: "new",
      precio: 5.25,
      fecha_desde: fechaCierre,
      vigente: true,
    });

    const historial = [...cerrados, nuevo];
    const hoy = resolverPrecioVigente(historial, productoId, fechaCierre);

    expect(cerrados[0]?.vigente).toBe(false);
    expect(cerrados[0]?.fecha_hasta).toBe(fechaCierre);
    expect(hoy.precio).toBe(5.25);
    expect(hoy.precio_id).toBe("new");
  });
});
