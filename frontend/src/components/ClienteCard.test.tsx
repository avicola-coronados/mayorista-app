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
      granja: { id: 2, nombre: "Granja Norte" },
    },
  ],
};

describe("ClienteCard", () => {
  it("permite seleccionar y guardar otra granja", async () => {
    const user = userEvent.setup();
    const onSaveGranja = vi.fn().mockResolvedValue(undefined);

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
        isSavingGranja={false}
        onSaveGranja={onSaveGranja}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Cliente Uno/i }));
    await user.click(screen.getByRole("button", { name: "Editar granja" }));
    await user.selectOptions(screen.getByLabelText("Granja"), "3");
    await user.click(screen.getByRole("button", { name: "Guardar granja" }));

    expect(onSaveGranja).toHaveBeenCalledWith(cliente.lineas[0], 3);
  });
});
