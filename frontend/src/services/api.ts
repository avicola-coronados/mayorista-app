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
  updated_at?: string;
};

export type JornadaResumen = {
  id: number;
  codigo: string;
  fecha: string;
  entrada_total_kg: number;
  vendido_total_kg: number;
  devoluciones_total_kg: number;
  desperdicio_kg: number;
  muertero_kg: number;
  merma_kg: number;
  merma_porcentaje: number;
  estado: "abierta" | "cerrada";
};

export type JornadaDetalle = {
  jornada: JornadaResumen & {
    entrada_total_jabas: number;
  };
  entradas_granjas: Array<{
    granja_id: number;
    granja_nombre: string;
    peso_neto_kg: number;
    jabas: number;
  }>;
  consolidado_clientes: Array<{
    cliente_id: number;
    cliente_nombre: string;
    total_pesadas: number;
    total_jabas: number;
    peso_bruto_kg: number;
    tara_kg: number;
    peso_neto_kg: number;
    porcentaje_total: number;
  }>;
};

export type JornadasListParams = {
  page?: number;
  limit?: number;
  search?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: "abierta" | "cerrada";
};

export type JornadasListResponse = {
  jornadas: JornadaResumen[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type Granja = {
  id: number;
  nombre: string;
  activo: boolean;
  created_at?: string;
  total_entregas?: number;
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

export type AdminMetricasDashboard = {
  entrada_total_kg: number;
  vendido_total_kg: number;
  devoluciones_kg: number;
  merma_estimada_kg: number;
  merma_porcentaje: number;
  merma_estado: "normal" | "alta" | "critica";
  ultima_actualizacion: string;
};

export type AdminMermaHistorica = {
  datos: Array<{
    dia: number;
    merma_kg: number;
  }>;
};

export type AdminTopClientes = {
  clientes: Array<{
    nombre: string;
    jabas: number;
    granjas: string;
    kg_neto: number;
    estado: "OK" | "Dev.";
  }>;
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

export type GranjasResponse = {
  granjas: Granja[];
};

export type GranjaPayload = {
  nombre: string;
  activo?: boolean;
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
    return error.response?.data?.message ?? error.response?.data?.error ?? "Ocurrió un error inesperado";
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
  async getJornadas(params: JornadasListParams, signal?: AbortSignal) {
    try {
      const response = await api.get<JornadasListResponse>("/jornadas", { params, signal });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getJornadaDetalle(id: number) {
    try {
      const response = await api.get<JornadaDetalle>(`/jornadas/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async exportJornada(id: number) {
    try {
      const response = await api.get<Blob>(`/jornadas/${id}/export`, {
        params: { format: "pdf" },
        responseType: "blob",
      });
      return response;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async exportClientesJornada(id: number) {
    try {
      const response = await api.get<Blob>(`/jornadas/${id}/clientes/export`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async exportJornadas(params: JornadasListParams) {
    try {
      const response = await api.get<Blob>("/jornadas/export", {
        params: { ...params, format: "excel" },
        responseType: "blob",
      });
      return response;
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
  async getAdminMetricasDashboard(jornadaId: number) {
    try {
      const response = await api.get<AdminMetricasDashboard>("/admin/metricas-dashboard", {
        params: { jornada_id: jornadaId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getAdminMermaHistorica(dias = 7) {
    try {
      const response = await api.get<AdminMermaHistorica>("/admin/merma-historica", {
        params: { dias },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getAdminTopClientes(jornadaId: number, limit = 4) {
    try {
      const response = await api.get<AdminTopClientes>("/admin/top-clientes", {
        params: { jornada_id: jornadaId, limit },
      });
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
      const response = await api.get<GranjasResponse | Granja[]>("/granjas");
      return Array.isArray(response.data) ? response.data : response.data.granjas;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGranja(id: number) {
    try {
      const response = await api.get<Granja>(`/granjas/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createGranja(payload: GranjaPayload) {
    try {
      const response = await api.post<Granja & { mensaje: string }>("/granjas", {
        nombre: payload.nombre,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updateGranja(id: number, payload: Required<GranjaPayload>) {
    try {
      const response = await api.put<Granja & { mensaje: string }>(`/granjas/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteGranja(id: number) {
    try {
      const response = await api.delete<{ mensaje: string }>(`/granjas/${id}`);
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
