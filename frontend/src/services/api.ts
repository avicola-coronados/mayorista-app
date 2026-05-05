import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore, type AuthUser } from "../store/authStore";

export type Jornada = {
  id: number;
  fecha: string;
  codigo: string;
  estado: "abierta" | "cerrada";
  desperdicio_kg: number | null;
  muertero_kg: number | null;
  created_at: string;
};

export type Granja = {
  id: number;
  nombre: string;
  activo: boolean;
};

export type Cliente = {
  id: number;
  nombre: string;
  activo: boolean;
};

export type MetricasJornada = {
  entrada_total_kg: number;
  vendido_total_kg: number;
  piso_disponible_kg: number;
  devoluciones_total_kg: number;
  sobrante_total_kg: number;
  clientes_atendidos: number;
  pesadas_realizadas: number;
  promedio_por_cliente: number;
};

export type LineaVentaPayload = {
  jornada_id: number;
  cliente_id: number;
  granja_id: number;
  origen: "partida" | "piso";
  jabas: number;
  peso_bruto: number;
  tara_por_jaba: number;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type ClienteDelDia = {
  cliente: {
    id: number;
    nombre: string;
  };
  total_kg: number;
  pesadas: number;
  lineas: Array<{
    id: number;
    origen: "partida" | "piso";
    jabas: number;
    peso_bruto: number;
    tara: number;
    tara_por_jaba: number;
    peso_neto: number;
    created_at: string;
    usa_tara_personalizada: boolean;
    granja: {
      id: number;
      nombre: string;
    };
  }>;
};

export type CierrePayload = {
  desperdicio_kg: number;
  muertero_kg: number;
};

export type CierreResponse = {
  success: boolean;
  merma_kg: number;
  merma_porcentaje: number;
};

export type Sobrante = {
  id: number;
  jabas: number;
  peso_neto: number;
};

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api`,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.sessionStorage.setItem("auth-expired", "1");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      } else {
        toast.error("Sesión expirada, ingresa nuevamente");
      }
    }

    return Promise.reject(error);
  },
);

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? "Ocurrió un error inesperado";
  }

  return "Ocurrió un error inesperado";
}

export const apiClient = {
  async login(username: string, password: string) {
    try {
      const response = await api.post<LoginResponse>("/auth/login", { username, password });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getJornadaActiva() {
    try {
      const response = await api.get<Jornada>("/jornadas/activa");
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getMetricas(jornadaId: number) {
    try {
      const response = await api.get<MetricasJornada>(`/jornadas/${jornadaId}/metricas`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getSobrante(jornadaId: number) {
    try {
      const response = await api.get<Sobrante[]>("/sobrante", {
        params: { jornada_id: jornadaId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGranjas() {
    try {
      const response = await api.get<Granja[]>("/granjas");
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getClientes() {
    try {
      const response = await api.get<Cliente[]>("/clientes");
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createLineaVenta(payload: LineaVentaPayload) {
    try {
      const response = await api.post("/lineas-venta", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getLineasDelDia(jornadaId: number) {
    try {
      const response = await api.get<ClienteDelDia[]>("/lineas-venta", {
        params: { jornada_id: jornadaId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async cerrarJornada(jornadaId: number, payload: CierrePayload) {
    try {
      const response = await api.post<CierreResponse>(`/jornadas/${jornadaId}/cerrar`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
