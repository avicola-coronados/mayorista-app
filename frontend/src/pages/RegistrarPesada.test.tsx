import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { RegistrarPesada } from "./RegistrarPesada";

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  apiClient: {
    createCliente: vi.fn(),
    createLineaVenta: vi.fn(),
    getClientes: vi.fn(),
    getGranjas: vi.fn(),
    getJornadaActiva: vi.fn(),
    getSobrante: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

function renderPage(modo: "ingreso" | "partida") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegistrarPesada modo={modo} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RegistrarPesada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth("token", {
      id: 1,
      username: "operario",
      role: "operario",
      nombre: "Operario",
    });
    mockedApi.getJornadaActiva.mockResolvedValue({
      id: 10,
      codigo: "04102026",
      estado: "abierta",
      fecha: "2026-10-04T00:00:00.000Z",
    });
    mockedApi.getClientes.mockResolvedValue([
      { id: 20, nombre: "Cliente Uno", activo: true },
    ]);
    mockedApi.getGranjas.mockResolvedValue([
      { id: 30, nombre: "Granja Norte", activo: true },
      { id: 40, nombre: "Piso", activo: true },
    ]);
    mockedApi.getSobrante.mockResolvedValue([{ id: 0, peso_neto: 500, jabas: 10 }]);
    mockedApi.createLineaVenta.mockResolvedValue({} as never);
  });

  it("registra una partida para un cliente usando Piso como origen", async () => {
    const user = userEvent.setup();
    renderPage("partida");

    await screen.findByText(/Disponible en piso: 500.00 kg/i);
    await user.selectOptions(screen.getByLabelText("Cliente"), "20");
    await user.clear(screen.getByLabelText("Peso bruto (kg)"));
    await user.type(screen.getByLabelText("Peso bruto (kg)"), "100");
    await user.click(screen.getByRole("button", { name: "Guardar partida" }));

    await waitFor(() =>
      expect(mockedApi.createLineaVenta).toHaveBeenCalledWith({
        jornada_id: 10,
        cliente_id: 20,
        granja_id: 40,
        origen: "partida",
        jabas: 5,
        peso_bruto: 100,
        tara_por_jaba: 5.8,
      }),
    );
  });

  it("envía un ingreso a piso sin asignarle cliente", async () => {
    const user = userEvent.setup();
    renderPage("ingreso");

    const clienteSelect = await screen.findByLabelText("Cliente");
    await user.click(screen.getByRole("button", { name: "Piso" }));
    expect(clienteSelect).toBeDisabled();
    expect(clienteSelect).toHaveValue("0");
    await user.selectOptions(screen.getByLabelText("Granja de origen"), "30");
    await user.clear(screen.getByLabelText("Peso bruto (kg)"));
    await user.type(screen.getByLabelText("Peso bruto (kg)"), "100");
    await user.click(screen.getByRole("button", { name: "Guardar ingreso" }));

    await waitFor(() =>
      expect(mockedApi.createLineaVenta).toHaveBeenCalledWith({
        jornada_id: 10,
        cliente_id: null,
        granja_id: 30,
        origen: "piso",
        jabas: 5,
        peso_bruto: 100,
        tara_por_jaba: 5.8,
      }),
    );
  });
});
