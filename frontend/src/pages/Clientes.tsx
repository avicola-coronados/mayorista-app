import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { ClienteCard } from "../components/ClienteCard";
import { Layout } from "../components/Layout";
import {
  DevolucionRegistradaSuccess,
  type DevolucionSuccessData,
} from "../components/operario/DevolucionRegistradaSuccess";
import { RegistrarDevolucionSheet } from "../components/operario/RegistrarDevolucionSheet";
import type { ClienteDelDia } from "../services/api";
import { apiClient } from "../services/api";

export function Clientes() {
  const queryClient = useQueryClient();
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
          {clientesDelDiaQuery.data?.length ?? 0} cliente
          {(clientesDelDiaQuery.data?.length ?? 0) === 1 ? "" : "s"} con ventas registradas
        </div>

        <Link to="/pesada/nueva" className="secondary-button">
          Registrar nueva pesada
        </Link>
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
      ) : (
        <div className="space-y-4">
          {clientesDelDiaQuery.data?.map((cliente) => (
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
          jornadaId={jornadaQuery.data.id}
          open
          onClose={() => setDevolucionCliente(null)}
          onSuccess={handleDevolucionSuccess}
        />
      ) : null}
    </Layout>
  );
}
