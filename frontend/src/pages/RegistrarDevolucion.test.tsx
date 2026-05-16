import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarDevolucion } from "./RegistrarDevolucion";
import { apiClient } from "../services/api";
import { useAuthStore } from "../store/authStore";

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  apiClient: {
    createDevolucion: vi.fn(),
    deleteDevolucion: vi.fn(),
    getClientes: vi.fn(),
    getDevoluciones: vi.fn(),
    getJornadaActiva: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/operario/devolucion"]}>
        <RegistrarDevolucion />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RegistrarDevolucion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.getState().setAuth("token", {
      id: 1,
      username: "operario",
      role: "operario",
      nombre: "Operario",
    });

    mockedApi.getJornadaActiva.mockResolvedValue({
      id: 1,
      codigo: "16052026",
      estado: "abierta",
      fecha: "2026-05-16T00:00:00.000Z",
    });
    mockedApi.getClientes.mockResolvedValue([
      { id: 1, nombre: "Mercado Central", activo: true },
      { id: 2, nombre: "San José", activo: true },
    ]);
    mockedApi.getDevoluciones.mockResolvedValue({
      devoluciones: [],
      total_kg: 0,
      total_registros: 0,
    });
    mockedApi.createDevolucion.mockResolvedValue({
      id: 1,
      jornada_id: 1,
      cliente_id: 1,
      cliente_nombre: "Mercado Central",
      tipo: "vivo",
      jabas: 2,
      peso_bruto: 15.8,
      tara: 11.6,
      peso_neto: 4.2,
      created_at: "2026-05-16T12:00:00.000Z",
    });
  });

  it("muestra botones de tipo de devolucion y navegacion inferior", async () => {
    renderPage();

    expect(await screen.findByText("Nueva Devolución")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pelado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Muerto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vivo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Pesadas/i })).toHaveAttribute("href", "/pesada/nueva");
    expect(screen.getByRole("link", { name: /Clientes/i })).toHaveAttribute("href", "/clientes");
    expect(screen.getByRole("link", { name: /Historial/i })).toHaveAttribute("href", "/cierre");
  });

  it("registra una devolucion y limpia el formulario", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Nueva Devolución");

    await user.selectOptions(screen.getByLabelText(/Cliente/i), "1");
    await user.click(screen.getByRole("button", { name: /Vivo/i }));
    await user.type(screen.getByLabelText(/Jabas/i), "2");
    await user.type(screen.getByLabelText(/Peso Bruto/i), "15.8");
    await user.click(screen.getByRole("button", { name: /Registrar Devolución/i }));

    await waitFor(() => {
      expect(mockedApi.createDevolucion).toHaveBeenCalledWith({
        jornada_id: 1,
        cliente_id: 1,
        tipo: "vivo",
        jabas: 2,
        peso_bruto: 15.8,
        tara: 11.6,
        peso_neto: 4.2,
      });
    });

    expect(screen.getByLabelText(/Cliente/i)).toHaveValue("0");
    expect(screen.getByLabelText(/Jabas/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Peso Bruto/i)).toHaveValue(null);
  });
});
