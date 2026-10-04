import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, type GuiaDetalle } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { DetalleGuiaCajero } from "./DetalleGuiaCajero";

vi.mock("../../services/api", () => ({
  apiClient: {
    getGuiaDetalle: vi.fn(),
    updatePeladuriaLineaGuia: vi.fn(),
  },
}));

const guiaAbierta: GuiaDetalle = {
  id: 30,
  numero: "G-04102026-001",
  fecha: "2026-10-04T12:00:00.000Z",
  estado: "abierta",
  saldoAnteriorInicial: 0,
  totalGeneral: 460,
  cliente: { id: 20, nombre: "Cliente Uno", tipo: "mayorista" },
  lineas: [
    {
      id: 40,
      nroJaba: 5,
      pesoBruto: 129,
      tara: 29,
      pesoNeto: 100,
      devolucion: 0,
      netoTotal: 100,
      precioKg: 4.6,
      importeGuia: 460,
      peladuria: 0,
      importeTotal: 460,
      saldoAnterior: 0,
    },
  ],
  totales: {
    jabas: 5,
    pesoBruto: 129,
    tara: 29,
    pesoNeto: 100,
    devolucion: 0,
    netoTotal: 100,
    importeGuia: 460,
    peladuria: 0,
    importeTotal: 460,
  },
};

describe("DetalleGuiaCajero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth("token", {
      id: 1,
      username: "cajero",
      role: "cajero",
      nombre: "Cajero",
    });
    vi.mocked(apiClient.getGuiaDetalle).mockResolvedValue(guiaAbierta);
  });

  it("permite imprimir y exportar una guía aunque siga abierta", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/cajero/clientes/20/guias/30"]}>
          <Routes>
            <Route
              path="/cajero/clientes/:id/guias/:guiaId"
              element={<DetalleGuiaCajero />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const imprimir = await screen.findByRole("button", { name: "Imprimir guía" });
    const exportar = screen.getByRole("button", { name: "Exportar PDF" });

    expect(imprimir).toBeEnabled();
    expect(exportar).toBeEnabled();
    expect(screen.queryByText(/debe estar cerrada para imprimir/i)).not.toBeInTheDocument();

    await user.click(imprimir);
    await user.click(exportar);

    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(2));
  });
});
