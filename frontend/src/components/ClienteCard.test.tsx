import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClienteCard } from "./ClienteCard";
import type { ClienteDelDia } from "../services/api";

const cliente: ClienteDelDia = {
  cliente: { id: 1, nombre: "Cliente Uno" },
  total_kg: 71,
  pesadas: 1,
  tiene_notas: false,
  lineas: [
    {
      id: 10,
      origen: "partida",
      jabas: 5,
      peso_bruto: 100,
      tara: 29,
      tara_por_jaba: 5.8,
      peso_neto: 71,
      nota: null,
      tiene_nota: false,
      created_at: "2026-10-04T12:00:00.000Z",
      usa_tara_personalizada: false,
      es_devolucion_viva: false,
      es_distribucion_pelado: false,
      granja: { id: 2, nombre: "Granja Norte" },
    },
  ],
};

describe("ClienteCard", () => {
  it("permite editar la granja, las jabas y la tara, mostrando el neto recalculado", async () => {
    const user = userEvent.setup();
    const onSaveDetalle = vi.fn().mockResolvedValue(undefined);

    render(
      <ClienteCard
        cliente={cliente}
        devoluciones={[]}
        editingNota={null}
        isSavingNota={false}
        notaTexto=""
        onCancelNota={vi.fn()}
        onNotaTextoChange={vi.fn()}
        onOpenNota={vi.fn()}
        onSaveNota={vi.fn()}
        granjas={[
          { id: 2, nombre: "Granja Norte", activo: true },
          { id: 3, nombre: "Granja Sur", activo: true },
        ]}
        isSavingDetalle={false}
        onSaveDetalle={onSaveDetalle}
      />,
    );

    expect(screen.getByText("1 pesada registrada · 5 jabas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cliente Uno/i }));
    await user.click(screen.getByRole("button", { name: "Editar pesada" }));
    await user.selectOptions(screen.getByLabelText("Granja"), "3");
    await user.clear(screen.getByLabelText("Jabas"));
    await user.type(screen.getByLabelText("Jabas"), "4");
    await user.clear(screen.getByLabelText("Tara por jaba (kg)"));
    await user.type(screen.getByLabelText("Tara por jaba (kg)"), "6");

    expect(screen.getByText("Tara total:").parentElement).toHaveTextContent("24.00 kg");
    expect(screen.getByText("Peso neto:").parentElement).toHaveTextContent("76.00 kg");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSaveDetalle).toHaveBeenCalledWith(cliente.lineas[0], {
      granjaId: 3,
      jabas: 4,
      taraPorJaba: 6,
    });
  });

  it("descuenta peso bruto, peso neto y jabas de las devoluciones", () => {
    render(
      <ClienteCard
        cliente={cliente}
        devoluciones={[
          {
            id: 30,
            jornada_id: 10,
            cliente_id: 1,
            cliente_nombre: "Cliente Uno",
            linea_venta_id: null,
            tipo: "vivo",
            jabas: 2,
            peso_bruto: 20,
            tara: 11.6,
            peso_neto: 8.4,
            created_at: "2026-10-04T13:00:00.000Z",
          },
        ]}
        editingNota={null}
        isSavingNota={false}
        notaTexto=""
        onCancelNota={vi.fn()}
        onNotaTextoChange={vi.fn()}
        onOpenNota={vi.fn()}
        onSaveNota={vi.fn()}
        granjas={[{ id: 2, nombre: "Granja Norte", activo: true }]}
        isSavingDetalle={false}
        onSaveDetalle={vi.fn()}
      />,
    );

    expect(screen.getByText("1 pesada registrada · 3 jabas")).toBeInTheDocument();
    expect(screen.getByText("62.60 kg")).toBeInTheDocument();
    expect(screen.getByText("Bruto: 80.00 kg · Neto: 62.60 kg")).toBeInTheDocument();
  });
});
