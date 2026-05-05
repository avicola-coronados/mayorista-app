import { Link } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Layout } from "../components/Layout";
import { useDashboard } from "../hooks/useDashboard";
import { useAuthStore } from "../store/authStore";

export function Dashboard() {
  const { jornada: jornadaQuery, metricas: metricasQuery, sobrante: sobranteQuery } = useDashboard();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (jornadaQuery.isError) {
      toast.error((jornadaQuery.error as Error)?.message ?? "No se pudo cargar la jornada");
    }
  }, [jornadaQuery.error, jornadaQuery.isError]);

  useEffect(() => {
    if (metricasQuery.isError) {
      toast.error((metricasQuery.error as Error)?.message ?? "No se pudieron cargar las métricas");
    }
  }, [metricasQuery.error, metricasQuery.isError]);

  useEffect(() => {
    if (sobranteQuery.isError) {
      toast.error((sobranteQuery.error as Error)?.message ?? "No se pudo cargar el sobrante");
    }
  }, [sobranteQuery.error, sobranteQuery.isError]);

  if (jornadaQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (jornadaQuery.isError || !jornadaQuery.data) {
    return (
      <Layout title="Dashboard" subtitle="No se pudo cargar la jornada actual">
        <ErrorPanel message={(jornadaQuery.error as Error)?.message ?? "Intenta recargar la página"} />
      </Layout>
    );
  }

  const jornada = jornadaQuery.data;
  const metricas = metricasQuery.data;
  const sobrante = sobranteQuery.data ?? [];
  const primerSobrante = sobrante[0];
  const isClosed = jornada.estado === "cerrada";
  const todayLabel = new Date(jornada.fecha).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jornadaFecha = new Date(jornada.fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const entradaKg = metricas?.entrada_total_kg ?? 0;
  const vendidoKg = metricas?.vendido_total_kg ?? 0;
  const pisoDisponibleKg = metricas?.piso_disponible_kg ?? 0;

  if (user?.role === "admin") {
    return (
      <Layout
        title={`Dashboard admin · ${jornada.codigo || jornadaFecha}`}
        subtitle={todayLabel}
        statusBadge={isClosed ? "Cerrada" : "Abierta"}
        statusTone={isClosed ? "closed" : "open"}
      >
        {metricasQuery.isLoading ? (
          <MetricsSkeleton />
        ) : metricasQuery.isError ? (
          <ErrorPanel message={(metricasQuery.error as Error)?.message ?? "No se pudieron cargar las métricas"} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <CompactMetric label="Entrada" value={entradaKg} tone="orange" />
              <CompactMetric label="Vendido" value={vendidoKg} />
              <CompactMetric label="Piso disp." value={pisoDisponibleKg} tone="green" />
            </div>

            <section className="mt-4 overflow-hidden rounded-[9px] border border-neutral-200 bg-white">
              <AdminSummaryRow label="Clientes atendidos" value={metricas?.clientes_atendidos ?? 0} />
              <AdminSummaryRow label="Pesadas realizadas" value={metricas?.pesadas_realizadas ?? 0} />
              <AdminSummaryRow label="Promedio por cliente" value={`${formatKg(metricas?.promedio_por_cliente ?? 0)} kg`} />
              <AdminSummaryRow label="Devoluciones" value={`${formatKg(metricas?.devoluciones_total_kg ?? 0)} kg`} />
            </section>
          </>
        )}

        <section className="mt-4">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.08em] text-neutral-500">
            Gestión
          </h2>

          <div className="mt-3 overflow-hidden rounded-[9px] border border-neutral-200 bg-white">
            <ActionRow
              to="/clientes"
              title="Ver clientes del día"
              description={`${metricas?.clientes_atendidos ?? 0} registrado${
                (metricas?.clientes_atendidos ?? 0) === 1 ? "" : "s"
              }`}
            />
            <ActionRow
              to="/cierre"
              title={isClosed ? "Ver cierre de jornada" : "Cerrar jornada"}
              description={isClosed ? "Jornada cerrada" : "Resumen y merma"}
              muted={isClosed}
            />
            <ActionRow
              to="/pesada/nueva"
              title="Registrar pesada"
              description="Carga operativa"
              disabled={isClosed}
              muted={isClosed}
            />
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Jornada ${jornada.codigo || jornadaFecha} · ${isClosed ? "cerrada" : "en curso"}`}
      subtitle={todayLabel}
      statusBadge={isClosed ? "Cerrada" : "Abierta"}
      statusTone={isClosed ? "closed" : "open"}
    >
      {isClosed ? (
        <div className="mb-4 rounded-[8px] border border-neutral-200 bg-neutral-100 px-4 py-3 text-[14px] font-semibold text-neutral-600">
          Jornada cerrada · Consulta el historial
        </div>
      ) : null}

      {metricasQuery.isLoading ? (
        <MetricsSkeleton />
      ) : metricasQuery.isError ? (
        <ErrorPanel message={(metricasQuery.error as Error)?.message ?? "No se pudieron cargar las métricas"} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <CompactMetric label="Entrada" value={entradaKg} tone="orange" />
          <CompactMetric label="Vendido" value={vendidoKg} />
          <CompactMetric label="Piso disp." value={pisoDisponibleKg} tone="green" />
        </div>
      )}

      <section className="mt-4">
        <h2 className="text-[14px] font-bold uppercase tracking-[0.08em] text-neutral-500">
          Acciones del día
        </h2>

        <div className="mt-3 overflow-hidden rounded-[9px] border border-neutral-200 bg-white">
          <ActionRow
            to="/pesada/nueva"
            title="Registrar pesada"
            description="Partida o piso"
            disabled={isClosed}
          />
          <ActionRow
            title="Registrar devolución"
            description="Pelado, muerto o vivo"
            disabled
          />
          <ActionRow
            to="/clientes"
            title="Ver clientes del día"
            description={`${metricas?.clientes_atendidos ?? 0} registrado${
              (metricas?.clientes_atendidos ?? 0) === 1 ? "" : "s"
            }`}
          />
          <ActionRow
            to="/cierre"
            title="Cerrar jornada"
            description="Solo al final del día"
            disabled={isClosed}
            muted={isClosed}
          />
        </div>
      </section>

      <div className="mt-3 flex items-center gap-3 rounded-[8px] border border-green-400 bg-green-50 px-4 py-3 text-[14px] font-semibold text-green-800">
        <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-coronados-green" />
        {primerSobrante ? (
          <span>
            Piso disponible: {formatKg(primerSobrante.peso_neto)} kg · {primerSobrante.jabas} jabas
            sin asignar
          </span>
        ) : (
          <span>Sin piso disponible · Esperando entrada de granja</span>
        )}
      </div>
    </Layout>
  );
}

function formatKg(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function CompactMetric({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: number;
  tone?: "orange" | "green" | "dark";
}) {
  const valueColor =
    tone === "orange" ? "text-coronados-orange" : tone === "green" ? "text-coronados-green" : "text-neutral-950";

  return (
    <article className="rounded-[8px] border border-neutral-200 bg-white px-3 py-3">
      <p className="text-[13px] font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-[22px] font-bold leading-none ${valueColor}`}>
        {formatKg(value)}
        <span className="ml-1 text-[13px] font-medium text-neutral-400">kg</span>
      </p>
    </article>
  );
}

function AdminSummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-4 border-b border-neutral-100 px-4 last:border-b-0">
      <p className="text-[14px] font-semibold text-neutral-500">{label}</p>
      <p className="text-[18px] font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-[76px] animate-pulse rounded-[8px] border border-neutral-200 bg-white" />
      ))}
    </div>
  );
}

function ActionRow({
  to,
  title,
  description,
  disabled,
  muted,
}: {
  to?: string;
  title: string;
  description: string;
  disabled?: boolean;
  muted?: boolean;
}) {
  const content = (
    <>
      <div>
        <p className={`text-[17px] font-bold leading-tight ${muted ? "text-neutral-400" : "text-neutral-950"}`}>
          {title}
        </p>
        <p className="mt-1 text-[14px] font-medium leading-tight text-neutral-400">{description}</p>
      </div>
      <span className={`text-[18px] font-bold ${disabled ? "text-neutral-200" : "text-coronados-orange"}`}>
        ›
      </span>
    </>
  );

  if (!to || disabled) {
    return (
      <button
        type="button"
        className="flex min-h-[61px] w-full items-center justify-between border-b border-neutral-100 px-4 text-left last:border-b-0"
        disabled
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="flex min-h-[61px] items-center justify-between border-b border-neutral-100 px-4 transition hover:bg-orange-50 last:border-b-0"
    >
      {content}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <Layout title="Cargando jornada..." subtitle="Preparando métricas del día">
      <MetricsSkeleton />
      <div className="mt-4 h-[250px] animate-pulse rounded-[9px] border border-neutral-200 bg-white" />
    </Layout>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
      {message}
    </div>
  );
}
