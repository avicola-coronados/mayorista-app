import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore, type AuthUser } from "../store/authStore";

export type Jornada = {
  id: number;
  fecha: string;
  codigo: string;
  estado: "abierta" | "cerrada";
  entrada_total_kg?: number;
  vendido_total_kg?: number;
  devoluciones_total_kg?: number;
  desperdicio_kg?: number | null;
  muertero_kg?: number | null;
  piso_disponible_kg?: number;
  merma_kg?: number;
  merma_porcentaje?: number;
  created_at?: string;
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
  piso_disponible_kg: number;
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
    tiene_notas: boolean;
  }>;
  desglose_merma: {
    entrada_total: number;
    menos_vendido: number;
    mas_devoluciones: number;
    menos_desperdicio: number;
    menos_muertero: number;
    resultado_piso: number;
  };
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
  codigo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo: boolean;
  created_at?: string;
  total_ventas?: number;
  total_kg_vendido?: number;
  compro_hoy?: boolean;
  ultima_compra?: string | null;
};

export type AdminClientesResponse = {
  clientes: Cliente[];
  jornada_activa: {
    id: number;
    codigo: string;
    fecha: string;
    estado: "abierta" | "cerrada";
  } | null;
  resumen_inactivos: {
    total_sin_compras_hoy: number;
    clientes_sin_compras: Array<{
      id: number;
      nombre: string;
      ultima_compra: string | null;
    }>;
  };
};

export type ClientePayload = {
  nombre: string;
  codigo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo?: boolean;
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
  piso_disponible_kg: number;
  merma_estimada_kg: number;
  merma_porcentaje: number;
  merma_estado: "normal" | "alta" | "critica";
  ultima_actualizacion: string;
};

export type AdminMermaHistorica = {
  datos: Array<{
    dia: number;
    merma_kg: number;
    entrada_total_kg: number;
    merma_porcentaje: number;
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
  cliente_id: number | null;
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
    id: number | null;
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
    nota: string | null;
    tiene_nota: boolean;
    created_at: string;
    usa_tara_personalizada: boolean;
    granja: {
      id: number;
      nombre: string;
    };
  }>;
  tiene_notas: boolean;
};

export type CierrePayload = {
  desperdicio_kg: number;
  muertero_kg: number;
};

export type CierreResponse = {
  success: boolean;
  piso_disponible_kg: number;
  merma_kg: number;
  merma_porcentaje: number;
};

export type ReabrirJornadaResponse = {
  success: boolean;
  jornada: Jornada;
};

export type UpdateLineaVentaNotaResponse = {
  mensaje: string;
  linea_venta: {
    id: number;
    nota: string | null;
  };
};

export type AdminPesadasConNotas = {
  total: number;
  pesadas_con_notas: Array<{
    id: number;
    cliente: string;
    granja: string;
    origen: "partida" | "piso";
    peso_neto: number;
    nota: string | null;
    hora: string;
  }>;
};

export type AdminLineaVentaDetalle = {
  id: number;
  granja_id: number;
  granja: string;
  origen: "partida" | "piso";
  jabas: number;
  peso_bruto: number;
  tara: number;
  tara_por_jaba: number;
  peso_neto: number;
  nota: string | null;
  hora: string;
};

export type AdminLineasVentaClienteResponse = {
  cliente: {
    id: number;
    nombre: string;
  };
  pesadas: AdminLineaVentaDetalle[];
};

export type AdminUpdateLineaVentaPayload = {
  granja_id: number;
  origen: "partida" | "piso";
  jabas: number;
  peso_bruto: number;
  tara: number;
  tara_por_jaba: number;
};

export type AdminUpdateLineaVentaResponse = {
  mensaje: string;
  linea_venta: AdminLineaVentaDetalle & {
    jornada_id: number;
    cliente_id: number | null;
    cliente_nombre: string | null;
    created_at: string;
  };
};

export type AdminDeleteLineaVentaResponse = {
  mensaje: string;
  linea_venta: {
    id: number;
    jornada_id: number;
    cliente_id: number | null;
    cliente_nombre: string | null;
    deleted_at: string;
    deleted_by: number | null;
  };
};

export type TipoDevolucion = "pelado" | "muerto" | "vivo";

export type Devolucion = {
  id: number;
  jornada_id: number;
  cliente_id: number;
  cliente_nombre: string;
  linea_venta_id: number | null;
  tipo: TipoDevolucion;
  jabas: number | null;
  peso_bruto: number;
  tara: number;
  peso_neto: number;
  created_at: string;
  pesada_label?: string;
};

export type DevolucionDesdePesadaPayload = {
  linea_venta_id: number;
  tipo: TipoDevolucion;
  peso_neto: number;
};

export type DevolucionesResponse = {
  devoluciones: Devolucion[];
  total_registros: number;
  total_kg: number;
};

export type DevolucionPayload = {
  jornada_id: number;
  cliente_id: number;
  tipo: TipoDevolucion;
  jabas: number | null;
  peso_bruto: number;
  tara: number;
  peso_neto: number;
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

export type UserRole = "admin" | "operario" | "cajero" | "oficina";
export type TipoCliente = "mayorista" | "minorista";

export type CajeroCliente = {
  id: number;
  nombre: string;
  tipo: TipoCliente;
  documento_tipo: string | null;
  documento_num: string | null;
  contacto: string | null;
  telefono: string | null;
  saldo_pendiente: number;
  monto_total_facturado: number;
  monto_total_pagado: number;
  ultimo_pago: string | null;
  num_facturas_pendientes: number;
};

export type CajeroClientesStats = {
  total_clientes: number;
  total_mayoristas: number;
  total_minoristas: number;
  total_por_cobrar: number;
  clientes_con_deuda: number;
  cobrado_hoy: number;
  pagos_hoy: number;
};

export type CajeroClientesParams = {
  tipo?: TipoCliente;
  con_deuda?: boolean;
  buscar?: string;
};

export type CajeroClientesResponse = {
  stats: CajeroClientesStats;
  clientes: CajeroCliente[];
};

export type EstadoFactura = "pendiente" | "pago_parcial" | "pagado" | "anulado";
export type TipoPago = "efectivo" | "deposito";
export type EstadoPago = "pendiente" | "confirmado" | "rechazado";

export type CajeroPagoFactura = {
  id: number;
  monto: number;
  tipo: TipoPago;
  metodo: string;
  fecha: string;
  estado: EstadoPago;
};

export type CajeroFactura = {
  id: number;
  codigo: string;
  jornada_id: number;
  jornada_codigo: string;
  jornada_fecha: string;
  fecha_emision: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado: EstadoFactura;
  pagos: CajeroPagoFactura[];
};

export type CajeroDetalleClienteResponse = {
  cliente: Pick<
    CajeroCliente,
    "id" | "nombre" | "tipo" | "documento_tipo" | "documento_num" | "contacto" | "telefono"
  > & {
    email: string | null;
  };
  resumen: {
    total_facturado: number;
    total_pagado: number;
    saldo_pendiente: number;
  };
  facturas: CajeroFactura[];
};

export type CajeroGuiaEstado = "abierta" | "cerrada";

export type CajeroGuiaListItem = {
  id: number;
  numero: string;
  fecha: string;
  numeroJabas: number;
  pesoBrutoTotal: number;
  devolucion: number;
  neto: number;
  importeGuia: number;
  peladuria: number;
  netoTotal: number;
  estado: CajeroGuiaEstado;
};

export type CajeroClienteGuiasResponse = {
  cliente: {
    id: number;
    nombre: string;
    tipo: TipoCliente;
  };
  guias: CajeroGuiaListItem[];
  totales: {
    facturado: number;
    pagado: number;
    saldoPendiente: number;
  };
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type GuiaDetalleLinea = {
  id: number;
  nroJaba: number;
  pesoBruto: number;
  tara: number;
  pesoNeto: number;
  devolucion: number;
  netoTotal: number;
  importeGuia: number;
  peladuria: number;
  importeTotal: number;
  saldoAnterior: number;
};

export type GuiaDetalleTotales = {
  jabas: number;
  pesoBruto: number;
  tara: number;
  pesoNeto: number;
  devolucion: number;
  netoTotal: number;
  importeGuia: number;
  peladuria: number;
  importeTotal: number;
};

export type GuiaDetalle = {
  id: number;
  numero: string;
  fecha: string;
  estado: CajeroGuiaEstado;
  saldoAnteriorInicial: number;
  totalGeneral: number;
  cliente: {
    id: number;
    nombre: string;
    tipo: TipoCliente;
  };
  lineas: GuiaDetalleLinea[];
  totales: GuiaDetalleTotales;
};

export type OperadorGuiaLinea = GuiaDetalleLinea & {
  id: number;
  orden: number;
};

export type OperadorGuia = {
  id: number;
  numero: string;
  fecha: string;
  estado: "borrador" | "cerrada" | "anulada";
  editable: boolean;
  cliente: {
    id: number;
    nombre: string;
    tipo: TipoCliente;
  };
  saldoAnteriorInicial: number;
  totalGeneral: number;
  lineas: OperadorGuiaLinea[];
  totales: GuiaDetalleTotales;
};

export type OperadorGuiaActivaResponse = {
  guia: OperadorGuia | null;
};

export type OperadorGuiasJornadaResponse = {
  jornada: {
    id: number;
    codigo: string;
    fecha: string;
  };
  guias: Array<{
    id: number;
    numero: string;
    estado: "borrador" | "cerrada" | "anulada";
    cliente: { id: number; nombre: string; tipo: TipoCliente };
    lineasCount: number;
    totalGeneral: number;
    createdAt: string;
  }>;
};

export type PrecioVigente = {
  precio: number;
  precio_kg: number;
  fecha_desde: string;
  producto_id: number;
  precio_id: string | null;
  origen: "rango" | "ultimo_disponible" | "default";
};

export type LineaGuiaPayload = {
  jabas: number;
  peso_bruto: number;
  tara?: number;
  tara_por_jaba?: number;
  devolucion_kg?: number;
  peladuria?: number;
};

export type CajeroRegistrarPagoPayload = {
  factura_id: number;
  cliente_id: number;
  monto: number;
  tipo: TipoPago;
  metodo: string;
  banco?: string | null;
  nro_operacion?: string | null;
  fecha_deposito?: string | null;
  hora_deposito?: string | null;
  observaciones?: string | null;
};

export type CajeroRegistrarPagoResponse = {
  mensaje: string;
  pago: {
    id: number;
    monto: number;
    tipo: TipoPago;
    estado: EstadoPago;
    created_at: string;
  };
};

export type CajeroEgreso = {
  id: number;
  concepto: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  beneficiario: string;
  comprobante: string | null;
  fecha: string;
  hora: string;
  registrado_por: string;
};

export type CajeroEgresosStats = {
  total_dia: number;
  num_movimientos_dia: number;
  total_mes: number;
  num_movimientos_mes: number;
  mes_nombre: string;
};

export type CajeroEgresosResponse = {
  stats: CajeroEgresosStats;
  egresos: CajeroEgreso[];
};

export type CajeroEgresosParams = {
  fecha?: string;
  mes?: string;
};

export type CajeroRegistrarEgresoPayload = {
  concepto: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  beneficiario: string;
  comprobante?: string | null;
};

export type CajeroRegistrarEgresoResponse = {
  mensaje: string;
  egreso: {
    id: number;
    concepto: string;
    monto: number;
    beneficiario: string;
    fecha: string;
    registrado_por: string;
  };
};

export type UsuarioAdmin = {
  id: number;
  username: string;
  nombre: string | null;
  email: string | null;
  role: UserRole;
  activo: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    username: string;
    nombre: string | null;
  } | null;
  updater?: {
    id: number;
    username: string;
    nombre: string | null;
  } | null;
};

export type UsuariosResponse = {
  usuarios: UsuarioAdmin[];
};

export type UsuarioCreatePayload = {
  username: string;
  password: string;
  nombre: string | null;
  email: string | null;
  role: UserRole;
};

export type UsuarioUpdatePayload = {
  username: string;
  password?: string | null;
  nombre: string | null;
  email: string | null;
  role: UserRole;
  activo: boolean;
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
      const response = await api.get<Cliente[] | { clientes: Cliente[] }>("/clientes", {
        params: { activo: true },
      });
      return Array.isArray(response.data) ? response.data : response.data.clientes;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getAdminClientes(search?: string) {
    try {
      const response = await api.get<AdminClientesResponse>("/clientes", {
        params: { include_stats: true, search: search || undefined },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getCliente(id: number) {
    try {
      const response = await api.get<Cliente>(`/clientes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createCliente(payload: ClientePayload) {
    try {
      const response = await api.post<Cliente>("/clientes", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updateCliente(id: number, payload: Required<ClientePayload>) {
    try {
      const response = await api.put<Cliente>(`/clientes/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteCliente(id: number) {
    try {
      const response = await api.delete<{ mensaje: string }>(`/clientes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getClientesCajero(params: CajeroClientesParams) {
    try {
      const response = await api.get<CajeroClientesResponse>("/cajero/clientes", {
        params: {
          tipo: params.tipo,
          con_deuda: params.con_deuda ? "true" : undefined,
          buscar: params.buscar || undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getDetalleClienteCajero(id: number) {
    try {
      const response = await api.get<CajeroDetalleClienteResponse>(`/cajero/clientes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getClienteGuias(clienteId: number, params?: { page?: number; limit?: number }) {
    try {
      const response = await api.get<CajeroClienteGuiasResponse>(`/clientes/${clienteId}/guias`, {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 15,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGuiaDetalle(guiaId: number) {
    try {
      const response = await api.get<GuiaDetalle>(`/guias/${guiaId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updatePeladuriaLineaGuia(guiaId: number, lineaId: number, peladuria: number) {
    try {
      const response = await api.patch<GuiaDetalle>(`/guias/${guiaId}/lineas/${lineaId}/peladuria`, {
        peladuria,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getPrecioVigente() {
    try {
      const response = await api.get<PrecioVigente>("/precios/vigente");
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGuiaActiva(clienteId: number) {
    try {
      const response = await api.get<OperadorGuiaActivaResponse>("/guias/activa", {
        params: { cliente_id: clienteId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGuiasJornadaActual() {
    try {
      const response = await api.get<OperadorGuiasJornadaResponse>("/guias/jornada-actual");
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getGuiaOperador(guiaId: number) {
    try {
      const response = await api.get<OperadorGuia>(`/guias/${guiaId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createGuia(clienteId: number) {
    try {
      const response = await api.post<OperadorGuia>("/guias", { cliente_id: clienteId });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async addLineaGuia(guiaId: number, payload: LineaGuiaPayload) {
    try {
      const response = await api.post<OperadorGuia>(`/guias/${guiaId}/lineas`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updateLineaGuia(guiaId: number, lineaId: number, payload: LineaGuiaPayload) {
    try {
      const response = await api.put<OperadorGuia>(`/guias/${guiaId}/lineas/${lineaId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteLineaGuia(guiaId: number, lineaId: number) {
    try {
      const response = await api.delete<OperadorGuia>(`/guias/${guiaId}/lineas/${lineaId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async cerrarGuia(guiaId: number) {
    try {
      const response = await api.patch<OperadorGuia>(`/guias/${guiaId}/cerrar`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async registrarPagoCajero(payload: CajeroRegistrarPagoPayload) {
    try {
      const response = await api.post<CajeroRegistrarPagoResponse>("/cajero/pagos", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getEgresosCajero(params?: CajeroEgresosParams) {
    try {
      const response = await api.get<CajeroEgresosResponse>("/cajero/egresos", { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async registrarEgresoCajero(payload: CajeroRegistrarEgresoPayload) {
    try {
      const response = await api.post<CajeroRegistrarEgresoResponse>("/cajero/egresos", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getUsuarios(search?: string) {
    try {
      const response = await api.get<UsuariosResponse>("/usuarios", {
        params: { search: search || undefined },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getUsuario(id: number) {
    try {
      const response = await api.get<UsuarioAdmin>(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createUsuario(payload: UsuarioCreatePayload) {
    try {
      const response = await api.post<UsuarioAdmin>("/usuarios", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updateUsuario(id: number, payload: UsuarioUpdatePayload) {
    try {
      const response = await api.put<UsuarioAdmin>(`/usuarios/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteUsuario(id: number) {
    try {
      const response = await api.delete<{ mensaje: string }>(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getDevoluciones(jornadaId: number) {
    try {
      const response = await api.get<DevolucionesResponse>(`/jornadas/${jornadaId}/devoluciones`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createDevolucion(payload: DevolucionPayload) {
    try {
      const response = await api.post<Devolucion>("/devoluciones", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async createDevolucionDesdePesada(payload: DevolucionDesdePesadaPayload) {
    try {
      const response = await api.post<Devolucion>("/devoluciones", payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteDevolucion(id: number) {
    try {
      const response = await api.delete<{ mensaje: string }>(`/devoluciones/${id}`);
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
  async updateLineaVentaNota(id: number, nota: string | null) {
    try {
      const response = await api.patch<UpdateLineaVentaNotaResponse>(`/lineas-venta/${id}/nota`, { nota });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getAdminPesadasConNotas(jornadaId: number) {
    try {
      const response = await api.get<AdminPesadasConNotas>("/admin/pesadas-con-notas", {
        params: { jornada_id: jornadaId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async getAdminLineasVentaCliente(clienteId: number, jornadaId: number) {
    try {
      const response = await api.get<AdminLineasVentaClienteResponse>(
        `/admin/lineas-venta/cliente/${clienteId}/jornada/${jornadaId}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async updateAdminLineaVenta(id: number, payload: AdminUpdateLineaVentaPayload) {
    try {
      const response = await api.put<AdminUpdateLineaVentaResponse>(`/admin/lineas-venta/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  async deleteAdminLineaVenta(id: number, reason?: string) {
    try {
      const response = await api.delete<AdminDeleteLineaVentaResponse>(`/admin/lineas-venta/${id}`, {
        data: { reason },
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
  async reabrirJornada(jornadaId: number) {
    try {
      const response = await api.post<ReabrirJornadaResponse>(`/jornadas/${jornadaId}/reabrir`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
