import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { ClienteCard } from "../components/ClienteCard";
import { Layout } from "../components/Layout";
import {
  DevolucionRegistradaSuccess,
  type DevolucionSuccessData,
} from "../components/operario/DevolucionRegistradaSuccess";
import { RegistrarDevolucionSheet } from "../components/operario/RegistrarDevolucionSheet";
import type { ClienteDelDia, Devolucion } from "../services/api";
import { apiClient } from "../services/api";

export function Clientes() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [editingNota, setEditingNota] = useState<number | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [devolucionCliente, setDevolucionCliente] = useState<ClienteDelDia | null>(null);
  const [devolucionSuccess, setDevolucionSuccess] = useState<DevolucionSuccessData | null>(null);

  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const clientesDelDiaQuery = useQuery({
    queryKey: ["lineas-venta", jornadaQuery.data?.id],
    queryFn: () => apiClient.getLineasDelDia(jornadaQuery.data!.id),
    enabled: Boolean(jornadaQuery.data?.id),
  });

  const jornadaId = jornadaQuery.data?.id;
  const clientesDelDia = clientesDelDiaQuery.data ?? [];
  const busquedaNormalizada = normalizarBusqueda(busqueda);
  const clientesFiltrados = filtrarClientesPorNombre(clientesDelDia, busquedaNormalizada);

  const devolucionesQuery = useQuery({
    queryKey: ["devoluciones", jornadaId],
    queryFn: () => apiClient.getDevoluciones(jornadaId!),
    enabled: Boolean(jornadaId),
  });

  const granjasQuery = useQuery({
    queryKey: ["granjas"],
    queryFn: apiClient.getGranjas,
  });

  const notaMutation = useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string | null }) => apiClient.updateLineaVentaNota(id, nota),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      setEditingNota(null);
      setNotaTexto("");
      if (jornadaId) {
        await queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornadaId] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["lineas-venta"] });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const detalleMutation = useMutation({
    mutationFn: ({
      id,
      granjaId,
      jabas,
      taraPorJaba,
    }: {
      id: number;
      granjaId: number;
      jabas: number;
      taraPorJaba: number;
    }) =>
      apiClient.updateLineaVentaDetalle(id, {
        granja_id: granjaId,
        jabas,
        tara_por_jaba: taraPorJaba,
      }),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornadaId] }),
        queryClient.invalidateQueries({ queryKey: ["metricas", jornadaId] }),
        queryClient.invalidateQueries({ queryKey: ["sobrante", jornadaId] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openNota(linea: ClienteDelDia["lineas"][number]) {
    if (editingNota === linea.id) {
      setEditingNota(null);
      setNotaTexto("");
      return;
    }

    setEditingNota(linea.id);
    setNotaTexto(linea.nota ?? "");
  }

  function saveNota(linea: ClienteDelDia["lineas"][number]) {
    const cleanNota = notaTexto.trim();

    if (!cleanNota && !linea.nota) {
      toast.error("Escribe una observación");
      return;
    }

    notaMutation.mutate({ id: linea.id, nota: cleanNota || null });
  }

  function cancelNota() {
    setEditingNota(null);
    setNotaTexto("");
  }

  function handleDevolucionSuccess(data: DevolucionSuccessData) {
    setDevolucionCliente(null);
    setDevolucionSuccess(data);
    if (jornadaId) {
      void queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornadaId] });
      void queryClient.invalidateQueries({ queryKey: ["devoluciones", jornadaId] });
      void queryClient.invalidateQueries({ queryKey: ["metricas", jornadaId] });
      void queryClient.invalidateQueries({ queryKey: ["sobrante", jornadaId] });
    }
  }

  function handleVolverClientes() {
    setDevolucionSuccess(null);
    if (jornadaId) {
      void queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornadaId] });
    }
  }

  if (jornadaQuery.isLoading) {
    return (
      <Layout title="Clientes del día" subtitle="Cargando resumen">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      </Layout>
    );
  }

  if (jornadaQuery.isError) {
    return (
      <Layout title="Clientes del día" subtitle="No se pudo cargar la jornada actual">
        <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
          {(jornadaQuery.error as Error)?.message ?? "No se pudo cargar la jornada"}
        </div>
      </Layout>
    );
  }

  if (devolucionSuccess) {
    return (
      <Layout title="Clientes del día" subtitle="Devolución registrada">
        <DevolucionRegistradaSuccess data={devolucionSuccess} onVolver={handleVolverClientes} />
      </Layout>
    );
  }

  return (
    <Layout
      title="Clientes del día"
      subtitle="Consolidado de ventas y detalle de cada pesada registrada"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          {busquedaNormalizada ? `${clientesFiltrados.length} de ` : ""}
          {clientesDelDia.length} cliente
          {clientesDelDia.length === 1 ? "" : "s"} con ventas registradas
        </div>

        <Link to="/pesada/nueva" className="secondary-button">
          Registrar ingreso
        </Link>
      </div>

      <div className="relative mb-5">
        <IconSearch
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar cliente por nombre..."
          aria-label="Buscar cliente por nombre"
          className="field-input w-full pl-12 pr-12"
        />
        {busqueda ? (
          <button
            type="button"
            onClick={() => setBusqueda("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <IconX size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {clientesDelDiaQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="panel h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : clientesDelDiaQuery.isError ? (
        <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
          {(clientesDelDiaQuery.error as Error)?.message ?? "No se pudo cargar el detalle de clientes"}
        </div>
      ) : (clientesDelDiaQuery.data?.length ?? 0) === 0 ? (
        <div className="panel px-5 py-8 text-center">
          <p className="text-lg font-semibold text-slate-900">Aún no hay ventas registradas</p>
          <p className="mt-2 text-sm text-slate-500">
            Registra la primera pesada del día para ver aquí el consolidado por cliente.
          </p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="panel px-5 py-8 text-center">
          <p className="text-lg font-semibold text-slate-900">No se encontraron clientes</p>
          <p className="mt-2 text-sm text-slate-500">
            Prueba con otro nombre o limpia la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientesFiltrados.map((cliente) => (
            <ClienteCard
              key={cliente.cliente.id ?? "piso"}
              cliente={cliente}
              editingNota={editingNota}
              isSavingNota={notaMutation.isPending}
              notaTexto={notaTexto}
              onCancelNota={cancelNota}
              onNotaTextoChange={setNotaTexto}
              onOpenNota={openNota}
              onSaveNota={saveNota}
              granjas={granjasQuery.data ?? []}
              isSavingDetalle={detalleMutation.isPending}
              onSaveDetalle={async (linea, detalle) => {
                await detalleMutation.mutateAsync({ id: linea.id, ...detalle });
              }}
              devoluciones={
                cliente.cliente.id != null
                  ? (devolucionesQuery.data?.devoluciones ?? []).filter(
                      (d: Devolucion) => d.cliente_id === cliente.cliente.id,
                    )
                  : []
              }
              onRegistrarDevolucion={
                cliente.cliente.id != null && cliente.pesadas > 0
                  ? () => setDevolucionCliente(cliente)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {devolucionCliente && jornadaQuery.data?.id ? (
        <RegistrarDevolucionSheet
          cliente={devolucionCliente}
          devoluciones={(devolucionesQuery.data?.devoluciones ?? []).filter(
            (devolucion) => devolucion.cliente_id === devolucionCliente.cliente.id,
          )}
          jornadaId={jornadaQuery.data.id}
          open
          onClose={() => setDevolucionCliente(null)}
          onSuccess={handleDevolucionSuccess}
        />
      ) : null}
    </Layout>
  );
}

export function normalizarBusqueda(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-PE");
}

export function filtrarClientesPorNombre(clientes: ClienteDelDia[], busqueda: string) {
  const termino = normalizarBusqueda(busqueda);

  if (!termino) {
    return clientes;
  }

  return clientes.filter((cliente) =>
    normalizarBusqueda(cliente.cliente.nombre).includes(termino),
  );
}
