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
  lineas: [
    {
      id: 1,
      origen: "partida",
      jabas: 5,
      peso_bruto: 129,
      tara: 29,
      tara_por_jaba: 5.8,
      peso_neto: 100,
      nota: null,
      tiene_nota: false,
      created_at: "2026-10-04T10:00:00.000Z",
      usa_tara_personalizada: false,
      es_devolucion_viva: false,
      es_distribucion_pelado: false,
      granja: { id: 1, nombre: "Granja Norte" },
    },
  ],
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
          devoluciones={[]}
          jornadaId={10}
          open
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Peso bruto (kg)"), "36.6");
    await user.type(screen.getByLabelText("Jabas (opcional)"), "2");
    await user.type(screen.getByLabelText("Tara por jaba (kg, opcional)"), "5.8");
    expect(screen.getByText("Tara total: 11.60 kg")).toBeInTheDocument();
    expect(screen.getByText("25.00 kg neto")).toBeInTheDocument();
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
        peso_bruto: 36.6,
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("permite guardar sin jabas ni tara y usa el peso completo como neto", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.createDevolucionCliente).mockResolvedValue({
      id: 2,
      jornada_id: 10,
      cliente_id: 20,
      cliente_nombre: "Cliente Uno",
      linea_venta_id: null,
      tipo: "pelado",
      jabas: 0,
      peso_bruto: 25,
      tara: 0,
      peso_neto: 25,
      created_at: "2026-10-04T12:00:00.000Z",
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <RegistrarDevolucionSheet
          cliente={cliente}
          devoluciones={[]}
          jornadaId={10}
          open
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Peso bruto (kg)"), "25");
    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByRole("button", { name: "Pelado" }));
    await user.click(screen.getByRole("button", { name: "Guardar devolución" }));

    await waitFor(() =>
      expect(apiClient.createDevolucionCliente).toHaveBeenCalledWith({
        jornada_id: 10,
        cliente_id: 20,
        tipo: "pelado",
        jabas: 0,
        tara_por_jaba: 0,
        peso_bruto: 25,
      }),
    );
  });
});
