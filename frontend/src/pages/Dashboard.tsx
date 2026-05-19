import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";
import toast from "react-hot-toast";
import { Layout } from "../components/Layout";
import { useDashboard } from "../hooks/useDashboard";
import { useAuthStore } from "../store/authStore";
import {
  apiClient,
  type AdminMermaHistorica,
  type AdminMetricasDashboard,
  type AdminTopClientes,
  type Jornada,
} from "../services/api";

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const currentRole = getRoleFromToken(token) ?? user?.role;
  const isAdmin = currentRole === "admin";
  const { jornada: jornadaQuery, metricas: metricasQuery, sobrante: sobranteQuery } = useDashboard(!isAdmin);
  const adminMetricasQuery = useQuery({
    queryKey: ["admin-metricas", jornadaQuery.data?.id],
    queryFn: () => apiClient.getAdminMetricasDashboard(jornadaQuery.data!.id),
    enabled: isAdmin && Boolean(jornadaQuery.data?.id),
    refetchInterval: 120000,
  });
  const adminMermaHistoricaQuery = useQuery({
    queryKey: ["admin-merma-historica"],
    queryFn: () => apiClient.getAdminMermaHistorica(7),
    enabled: isAdmin,
    refetchInterval: 120000,
  });
  const adminTopClientesQuery = useQuery({
    queryKey: ["admin-top-clientes", jornadaQuery.data?.id],
    queryFn: () => apiClient.getAdminTopClientes(jornadaQuery.data!.id, 4),
    enabled: isAdmin && Boolean(jornadaQuery.data?.id),
    refetchInterval: 120000,
  });

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
  const pisoDisponiblePorcentaje = entradaKg > 0 ? (pisoDisponibleKg / entradaKg) * 100 : 0;
  const pisoTone = pisoDisponiblePorcentaje > 2 ? "red" : pisoDisponiblePorcentaje >= 1 ? "yellow" : "green";

  if (isAdmin) {
    return (
      <AdminDashboard
        clearAuth={clearAuth}
        isClosed={isClosed}
        isLoading={adminMetricasQuery.isLoading || adminMermaHistoricaQuery.isLoading || adminTopClientesQuery.isLoading}
        jornada={jornada}
        mermaHistorica={adminMermaHistoricaQuery.data}
        metricas={adminMetricasQuery.data}
        metricasError={adminMetricasQuery.isError ? (adminMetricasQuery.error as Error)?.message : null}
        topClientes={adminTopClientesQuery.data}
        userName={user?.nombre ?? "María"}
      />
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
          <CompactMetric
            label="PISO DISPONIBLE"
            secondary={`${pisoDisponiblePorcentaje.toFixed(2)}% de entrada`}
            value={pisoDisponibleKg}
            tone={pisoTone}
          />
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
            to="/operario/devolucion"
            title="Registrar devolución"
            description="Pelado, muerto o vivo"
            disabled={isClosed}
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
            Piso disponible: {formatKg(primerSobrante.peso_neto)} kg · {primerSobrante.jabas} jabas estimadas sin asignar
          </span>
        ) : (
          <span>Sin piso disponible · Esperando entrada de granja</span>
        )}
      </div>
    </Layout>
  );
}

function getRoleFromToken(token: string | null) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as { role?: string };
    return decodedPayload.role ?? null;
  } catch {
    return null;
  }
}

function formatKg(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function AdminDashboard({
  clearAuth,
  isClosed,
  isLoading,
  jornada,
  mermaHistorica,
  metricas,
  metricasError,
  topClientes,
  userName,
}: {
  clearAuth: () => void;
  isClosed: boolean;
  isLoading: boolean;
  jornada: Jornada;
  mermaHistorica?: AdminMermaHistorica;
  metricas?: AdminMetricasDashboard;
  metricasError: string | null;
  topClientes?: AdminTopClientes;
  userName: string;
}) {
  const entradaTotal = metricas?.entrada_total_kg ?? 0;
  const vendidoTotal = metricas?.vendido_total_kg ?? 0;
  const devolucionesTotal = metricas?.devoluciones_kg ?? 0;
  const mermaEstimada = metricas?.merma_estimada_kg ?? 0;
  const mermaPorcentaje = metricas?.merma_porcentaje ?? 0;
  const mermaEstado = metricas?.merma_estado ?? "normal";
  const mermaCopy = getMermaCopy(mermaEstado);
  const tiempoActualizacion = calcularTiempoDesde(metricas?.ultima_actualizacion);
  const historicalBars = mermaHistorica?.datos ?? [];
  const clientes = topClientes?.clientes ?? [];

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="flex min-h-screen">
        <aside className="flex w-[175px] shrink-0 flex-col bg-coronados-orange text-white">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <LogoMark />
              <div>
                <p className="text-[16px] font-bold leading-none">Coronados</p>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em]">Avícola</p>
              </div>
            </div>
          </div>

          <nav className="flex-1">
            <AdminNavLink active to="/admin" label="Dashboard" />
            <AdminNavLink to="/admin/jornadas" label="Jornadas" />
            <AdminNavLink to="/admin/clientes" label="Clientes" />
            <AdminNavLink to="/admin/granjas" label="Granjas" />
            <AdminNavLink to="/admin/usuarios" label="Usuarios" />
            <AdminNavLink to="/admin/config" label="Config." />
          </nav>

          <div className="mx-5 mb-5 border-t border-white/25 pt-5">
            <p className="text-[14px] font-bold leading-tight">{userName} (Admin)</p>
            <p className="mt-1 text-[12px] font-medium text-white/75">Dueña · acceso total</p>
            <button
              type="button"
              onClick={clearAuth}
              className="mt-4 w-full rounded-[8px] bg-coronados-green px-3 py-2 text-center text-[12px] font-bold text-white transition hover:bg-green-700"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#F5F5F5]">
          <header className="flex items-center justify-between gap-4 bg-coronados-orange px-[30px] py-5 text-white">
            <div className="min-w-0">
              <h1 className="truncate text-[24px] font-bold leading-tight">Dashboard · {jornada.codigo}</h1>
              <p className="mt-1 text-[14px] font-medium text-white/80">
                {isClosed ? "Jornada cerrada" : "Jornada en curso"} · act. {tiempoActualizacion}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-green-100 px-4 py-1 text-[14px] font-bold text-green-800">
              {isClosed ? "Cerrada" : "Abierta"}
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </span>
          </header>

          <div className={`flex items-center justify-between gap-4 px-[30px] py-3 ${mermaCopy.bannerClass}`}>
            <p className="text-[14px] font-medium text-white">
              Merma: {mermaPorcentaje.toFixed(2)}% · {mermaCopy.message}
            </p>
            <span className="inline-flex shrink-0 rounded-full bg-white/25 px-3 py-1 text-[12px] font-bold text-white">
              {mermaCopy.badge}
            </span>
          </div>

          <div className="p-[30px]">
            {metricasError ? (
              <ErrorPanel message={metricasError} />
            ) : (
              <section className="grid gap-5 lg:grid-cols-4">
                <AdminMetricCard label="Entrada total" value={entradaTotal} tone="orange" />
                <AdminMetricCard label="Total vendido" value={vendidoTotal} />
                <AdminMetricCard label="Devoluciones" value={devolucionesTotal} />
                <AdminMetricCard
                  label="Merma"
                  secondary={`· ${mermaPorcentaje.toFixed(2)}%`}
                  value={mermaEstimada}
                />
              </section>
            )}
          </div>

          <section className="mx-[30px] mb-5 rounded-[8px] bg-white p-5">
            <h2 className="mb-4 text-[15px] font-bold text-[#333]">Merma diaria - Últimos 7 días (kg)</h2>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalBars}>
                  <XAxis
                    axisLine={false}
                    dataKey="dia"
                    tick={{ fontSize: 12, fill: "#999" }}
                    tickLine={false}
                  />
                  <Bar dataKey="merma_kg" radius={[4, 4, 0, 0]}>
                    {historicalBars.map((entry) => (
                      <Cell key={entry.dia} fill={entry.merma_kg > 200 ? "#E8471A" : "#E0E0E0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mx-[30px] mb-[30px] rounded-[8px] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#333]">Top clientes hoy</h2>
              {isLoading ? <span className="text-[12px] font-semibold text-neutral-400">Actualizando</span> : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-[12px] uppercase text-[#666]">
                    <th className="px-4 pb-3 font-semibold">Cliente</th>
                    <th className="px-4 pb-3 font-semibold">Jabas</th>
                    <th className="px-4 pb-3 font-semibold">Granja(s)</th>
                    <th className="px-4 pb-3 font-semibold">Kg neto</th>
                    <th className="px-4 pb-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.length > 0 ? (
                    clientes.map((cliente) => <AdminClientRow key={cliente.nombre} cliente={cliente} />)
                  ) : (
                    <tr>
                      <td className="px-4 py-4 text-[14px] font-semibold text-neutral-400" colSpan={5}>
                        Aún no hay ventas registradas hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#fff7ed]">
      <div
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-coronados-green text-center text-[5px] font-bold leading-tight text-coronados-green"
      >
        <span>
          Frescura
          <br />
          Garantizada
        </span>
      </div>
    </div>
  );
}

function AdminNavLink({ active, label, to }: { active?: boolean; label: string; to: string }) {
  return (
    <Link
      to={to}
      className={`block cursor-pointer px-5 py-3 text-[15px] font-medium text-white transition ${
        active ? "bg-black/15" : "hover:bg-black/10"
      }`}
    >
      {label}
    </Link>
  );
}

function AdminMetricCard({
  label,
  secondary,
  tone = "dark",
  value,
}: {
  label: string;
  secondary?: string;
  tone?: "orange" | "green" | "red" | "dark";
  value: number;
}) {
  const valueColor =
    tone === "orange"
      ? "text-coronados-orange"
      : tone === "green"
        ? "text-coronados-green"
        : tone === "red"
          ? "text-red-600"
          : "text-neutral-950";

  return (
    <article className="rounded-[8px] bg-white p-5">
      <p className="text-[13px] font-medium uppercase text-[#666]">{label}</p>
      <p className={`mt-2 text-[32px] font-bold leading-none ${valueColor}`}>
        {formatKg(value)}
        <span className="ml-1 text-[16px] font-medium text-neutral-500">kg</span>
        {secondary ? <span className="ml-1 text-[14px] font-medium text-neutral-500">{secondary}</span> : null}
      </p>
    </article>
  );
}

function AdminClientRow({ cliente }: { cliente: AdminTopClientes["clientes"][number] }) {
  return (
    <tr className="border-b border-[#E5E5E5] text-[14px] transition hover:bg-gray-50 last:border-b-0">
      <td className="px-4 py-3 font-bold text-[#111]">{cliente.nombre}</td>
      <td className="px-4 py-3 text-[#111]">{cliente.jabas}</td>
      <td className="px-4 py-3 text-[#111]">{cliente.granjas || "-"}</td>
      <td className="px-4 py-3 text-[#111]">{formatKg(cliente.kg_neto)}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${
            cliente.estado === "OK" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFF3E0] text-[#E65100]"
          }`}
        >
          {cliente.estado}
        </span>
      </td>
    </tr>
  );
}

function getMermaCopy(estado: AdminMetricasDashboard["merma_estado"]) {
  if (estado === "alta") {
    return {
      badge: "Revisar",
      bannerClass: "bg-yellow-600",
      message: "ligeramente elevada",
    };
  }

  if (estado === "critica") {
    return {
      badge: "Crítico",
      bannerClass: "bg-red-600",
      message: "requiere atención",
    };
  }

  return {
    badge: "OK ✓",
    bannerClass: "bg-coronados-green",
    message: "dentro del rango normal",
  };
}

function calcularTiempoDesde(date?: string) {
  if (!date) {
    return "hace 0 min";
  }

  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "hace instantes";
  }

  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `hace ${diffHours} h`;
}

function CompactMetric({
  label,
  secondary,
  value,
  tone = "dark",
}: {
  label: string;
  secondary?: string;
  value: number;
  tone?: "orange" | "green" | "yellow" | "red" | "dark";
}) {
  const valueColor =
    tone === "orange"
      ? "text-coronados-orange"
      : tone === "green"
        ? "text-coronados-green"
        : tone === "yellow"
          ? "text-[#BA7517]"
          : tone === "red"
            ? "text-[#C62828]"
            : "text-neutral-950";

  return (
    <article className="rounded-[8px] border border-neutral-200 bg-white px-3 py-3">
      <p className="text-[13px] font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-[22px] font-bold leading-none ${valueColor}`}>
        {formatKg(value)}
        <span className="ml-1 text-[13px] font-medium text-neutral-400">kg</span>
      </p>
      {secondary ? <p className={`mt-1 text-[12px] font-semibold ${valueColor}`}>{secondary}</p> : null}
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
