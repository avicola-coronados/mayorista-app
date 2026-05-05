import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClienteCard } from "../components/ClienteCard";
import { Layout } from "../components/Layout";
import { apiClient } from "../services/api";

export function Clientes() {
  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const clientesDelDiaQuery = useQuery({
    queryKey: ["lineas-venta", jornadaQuery.data?.id],
    queryFn: () => apiClient.getLineasDelDia(jornadaQuery.data!.id),
    enabled: Boolean(jornadaQuery.data?.id),
  });

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
            <ClienteCard key={cliente.cliente.id} cliente={cliente} />
          ))}
        </div>
      )}
    </Layout>
  );
}
