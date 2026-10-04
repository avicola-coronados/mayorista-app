import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ClienteDelDia, Devolucion } from "../../services/api";
import { apiClient } from "../../services/api";
import { RegistrarDevolucionSheet } from "./RegistrarDevolucionSheet";

vi.mock("../../services/api", () => ({
  apiClient: {
    createDevolucionCliente: vi.fn(),
  },
}));

const cliente: ClienteDelDia = {
  cliente: { id: 20, nombre: "Cliente Uno" },
  total_kg: 100,
  pesadas: 1,
  tiene_notas: false,
  lineas: [],
};

describe("RegistrarDevolucionSheet", () => {
  it("envía jabas y tara por jaba con la devolución", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const devolucion = {
      id: 1,
      jornada_id: 10,
      cliente_id: 20,
      cliente_nombre: "Cliente Uno",
      linea_venta_id: null,
      tipo: "vivo",
      jabas: 2,
      peso_bruto: 36.6,
      tara: 11.6,
      peso_neto: 25,
      created_at: "2026-10-04T12:00:00.000Z",
    } satisfies Devolucion;
    vi.mocked(apiClient.createDevolucionCliente).mockResolvedValue(devolucion);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <RegistrarDevolucionSheet
          cliente={cliente}
          jornadaId={10}
          open
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Kg a devolver"), "25");
    await user.type(screen.getByLabelText("Jabas"), "2");
    expect(screen.getByText("Tara total: 11.60 kg")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByRole("button", { name: "Vivo" }));
    await user.click(screen.getByRole("button", { name: "Guardar devolución" }));

    await waitFor(() =>
      expect(apiClient.createDevolucionCliente).toHaveBeenCalledWith({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "vivo",
        jabas: 2,
        tara_por_jaba: 5.8,
        peso_neto: 25,
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
