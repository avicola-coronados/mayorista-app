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
    createGranja: vi.fn(),
    createLineaVenta: vi.fn(),
    getClientes: vi.fn(),
    getGranjas: vi.fn(),
    getJornadaActiva: vi.fn(),
    getPeladoDisponible: vi.fn(),
    getSobrante: vi.fn(),
    distribuirPelado: vi.fn(),
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
    mockedApi.getPeladoDisponible.mockResolvedValue({
      total_devuelto_kg: 30,
      total_distribuido_kg: 5,
      disponible_kg: 25,
      distribuciones: [],
    });
    mockedApi.distribuirPelado.mockResolvedValue({
      mensaje: "Devolución pelada asignada correctamente",
      distribucion: {
        id: 60,
        cliente_id: 20,
        cliente_nombre: "Cliente Uno",
        peso_neto: 10,
        jabas: 0,
        tara: 0,
        created_at: "2026-10-04T12:00:00.000Z",
      },
    });
    mockedApi.createLineaVenta.mockResolvedValue({} as never);
    mockedApi.createGranja.mockResolvedValue({
      id: 50,
      nombre: "Granja Nueva",
      activo: true,
    });
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
    await waitFor(() => expect(clienteSelect).toBeEnabled());
    expect(screen.getByRole("button", { name: "Piso" })).toHaveAttribute("aria-pressed", "false");
  });

  it("distribuye peso neto de una devolución pelada sin jabas ni tara", async () => {
    const user = userEvent.setup();
    renderPage("partida");

    const clienteDestino = await screen.findByLabelText("Cliente destino");
    await user.selectOptions(clienteDestino, "20");
    await user.type(screen.getByLabelText("Peso neto a distribuir (kg)"), "10");
    await user.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() =>
      expect(mockedApi.distribuirPelado).toHaveBeenCalledWith({
        jornada_id: 10,
        cliente_id: 20,
        peso_neto: 10,
      }),
    );
  });

  it("crea una granja desde ingreso y la selecciona", async () => {
    const user = userEvent.setup();
    mockedApi.createGranja.mockImplementation(async () => {
      const granja = { id: 50, nombre: "Granja Nueva", activo: true };
      mockedApi.getGranjas.mockResolvedValue([
        { id: 30, nombre: "Granja Norte", activo: true },
        { id: 40, nombre: "Piso", activo: true },
        granja,
      ]);
      return granja;
    });
    renderPage("ingreso");

    await screen.findByLabelText("Granja de origen");
    await user.click(screen.getByRole("button", { name: "Nueva granja" }));
    await user.type(screen.getByLabelText("Nombre de la granja"), "Granja Nueva");
    await user.click(screen.getByRole("button", { name: "Crear granja" }));

    await waitFor(() =>
      expect(mockedApi.createGranja).toHaveBeenCalledWith({ nombre: "Granja Nueva" }),
    );
    await waitFor(() => expect(screen.getByLabelText("Granja de origen")).toHaveValue("50"));
  });
});
