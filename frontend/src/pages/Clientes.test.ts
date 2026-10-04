import { describe, expect, it } from "vitest";
import type { ClienteDelDia } from "../services/api";
import { filtrarClientesPorNombre } from "./Clientes";

function cliente(id: number, nombre: string): ClienteDelDia {
  return {
    cliente: { id, nombre },
    total_kg: 0,
    pesadas: 0,
    tiene_notas: false,
    lineas: [],
  };
}

describe("filtrarClientesPorNombre", () => {
  const clientes = [
    cliente(1, "José Ramírez"),
    cliente(2, "Mercado Central"),
    cliente(3, "Avícola Norte"),
  ];

  it("filtra por una parte del nombre ignorando mayúsculas y acentos", () => {
    expect(filtrarClientesPorNombre(clientes, "  JOSE  ")).toEqual([clientes[0]]);
    expect(filtrarClientesPorNombre(clientes, "central")).toEqual([clientes[1]]);
  });

  it("devuelve todos sin término y ninguno cuando no hay coincidencias", () => {
    expect(filtrarClientesPorNombre(clientes, "")).toBe(clientes);
    expect(filtrarClientesPorNombre(clientes, "inexistente")).toEqual([]);
  });
});
