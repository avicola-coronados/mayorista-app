import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { IconAlertCircle, IconSearch, IconUserOff } from "@tabler/icons-react";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import {
  apiClient,
  type CajeroCliente,
  type CajeroClientesParams,
  type CajeroClientesStats,
} from "../../services/api";

type Filtro = "todos" | "mayoristas" | "minoristas" | "con_deuda";

const emptyStats: CajeroClientesStats = {
  total_clientes: 0,
  total_mayoristas: 0,
  total_minoristas: 0,
  total_por_cobrar: 0,
  clientes_con_deuda: 0,
  cobrado_hoy: 0,
  pagos_hoy: 0,
};

export function ClientesCajero() {
  const navigate = useNavigate();
  const [filtroActivo, setFiltroActivo] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedBusqueda(busqueda.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [busqueda]);

  const params = useMemo<CajeroClientesParams>(() => {
    const nextParams: CajeroClientesParams = {};

    if (filtroActivo === "mayoristas") {
      nextParams.tipo = "mayorista";
    }

    if (filtroActivo === "minoristas") {
      nextParams.tipo = "minorista";
    }

    if (filtroActivo === "con_deuda") {
      nextParams.con_deuda = true;
    }

    if (debouncedBusqueda) {
      nextParams.buscar = debouncedBusqueda;
    }

    return nextParams;
  }, [debouncedBusqueda, filtroActivo]);

  const clientesQuery = useQuery({
    queryKey: ["cajero-clientes", params],
    queryFn: () => apiClient.getClientesCajero(params),
    staleTime: 30000,
  });

  const stats = clientesQuery.data?.stats ?? emptyStats;
  const clientes = clientesQuery.data?.clientes ?? [];

  return (
    <CajeroShell title="Caja - Clientes" subtitle={formatLongDate(new Date())}>
      <div className="p-[30px]">
        <section className="mb-6 grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <StatsCard
            detail={`${stats.total_mayoristas} mayoristas · ${stats.total_minoristas} minoristas`}
            label="Total clientes"
            value={stats.total_clientes.toString()}
          />
          <StatsCard
            detail={`${stats.clientes_con_deuda} clientes con saldo pendiente`}
            label="Cuentas por cobrar"
            tone="orange"
            value={formatCurrency(stats.total_por_cobrar)}
          />
          <StatsCard
            detail={`${stats.pagos_hoy} pagos registrados`}
            label="Cobrado hoy"
            tone="green"
            value={formatCurrency(stats.cobrado_hoy)}
          />
        </section>

        <section className="mb-5 flex items-center gap-2 max-xl:flex-wrap">
          <FilterChip
            active={filtroActivo === "todos"}
            count={stats.total_clientes}
            label="Todos"
            onClick={() => setFiltroActivo("todos")}
          />
          <FilterChip
            active={filtroActivo === "mayoristas"}
            count={stats.total_mayoristas}
            label="Mayoristas"
            onClick={() => setFiltroActivo("mayoristas")}
          />
          <FilterChip
            active={filtroActivo === "minoristas"}
            count={stats.total_minoristas}
            label="Minoristas"
            onClick={() => setFiltroActivo("minoristas")}
          />
          <FilterChip
            active={filtroActivo === "con_deuda"}
            count={stats.clientes_con_deuda}
            label="Con deuda"
            onClick={() => setFiltroActivo("con_deuda")}
          />

          <label className="ml-auto flex h-10 min-w-[280px] flex-1 items-center gap-2 rounded-[8px] border border-[#E5E5E5] bg-white px-[14px] text-[14px] text-neutral-600 max-xl:ml-0 max-xl:w-full">
            <IconSearch size={18} className="shrink-0 text-coronados-green" />
            <input
              className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-neutral-400"
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar cliente por nombre..."
              value={busqueda}
            />
          </label>
        </section>

        {clientesQuery.isLoading ? (
          <ClientesSkeleton />
        ) : clientesQuery.isError ? (
          <ErrorState
            message={(clientesQuery.error as Error)?.message ?? "Error al cargar clientes"}
            onRetry={() => clientesQuery.refetch()}
          />
        ) : clientes.length === 0 ? (
          <EmptyState busqueda={debouncedBusqueda} />
        ) : (
          <section className="grid gap-[14px]" aria-label="Lista de clientes de caja">
            {clientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onClick={() => navigate(`/cajero/clientes/${cliente.id}`)}
              />
            ))}
          </section>
        )}
      </div>
    </CajeroShell>
  );
}

function StatsCard({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail: string;
  label: string;
  tone?: "default" | "green" | "orange";
  value: string;
}) {
  const valueColor =
    tone === "green" ? "text-coronados-green" : tone === "orange" ? "text-coronados-orange" : "text-neutral-950";

  return (
    <article className="rounded-[10px] border border-neutral-200 bg-[#F9F9F9] p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-neutral-600">{label}</p>
      <p className={`mt-2 text-[24px] font-medium leading-tight ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-neutral-500">{detail}</p>
    </article>
  );
}

function FilterChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-[14px] font-bold transition ${
        active
          ? "border-coronados-orange bg-coronados-orange text-white"
          : "border-[#E5E5E5] bg-white text-neutral-800 hover:border-neutral-400"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function ClienteCard({ cliente, onClick }: { cliente: CajeroCliente; onClick: () => void }) {
  const hasDebt = cliente.saldo_pendiente > 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer rounded-[12px] border border-[#E5E5E5] bg-white px-5 py-4 transition hover:border-neutral-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-coronados-orange/30"
    >
      <div className="flex items-center justify-between gap-5 max-md:items-start">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coronados-orange text-[14px] font-bold text-white">
            {getInitials(cliente.nombre)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[16px] font-medium text-neutral-900">{cliente.nombre}</h2>
              <TipoBadge tipo={cliente.tipo} />
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase text-neutral-500">
              {formatDocumento(cliente)}
            </p>
            {cliente.telefono ? (
              <p className="mt-1 text-[12px] font-medium text-neutral-500">Tel. {cliente.telefono}</p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-[20px] font-medium leading-tight ${hasDebt ? "text-coronados-orange" : "text-coronados-green"}`}>
            {formatCurrency(cliente.saldo_pendiente)}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase text-neutral-400">
            {hasDebt ? "Cuenta pendiente" : "Al día"}
          </p>
          <p className="mt-1 text-[12px] font-medium text-neutral-600">
            Último pago: {formatShortDate(cliente.ultimo_pago)}
          </p>
        </div>
      </div>
    </article>
  );
}

function TipoBadge({ tipo }: { tipo: CajeroCliente["tipo"] }) {
  return (
    <span
      className={`rounded-full px-2 py-[3px] text-[10px] font-bold uppercase ${
        tipo === "mayorista" ? "bg-[#E6F1FB] text-[#0C447C]" : "bg-[#FAEEDA] text-[#633806]"
      }`}
    >
      {tipo}
    </span>
  );
}

function ClientesSkeleton() {
  return (
    <section className="grid gap-[14px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-[92px] animate-pulse rounded-[12px] border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-neutral-100" />
            <div className="flex-1">
              <div className="h-4 w-1/3 rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-1/4 rounded bg-neutral-100" />
            </div>
            <div className="h-5 w-28 rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </section>
  );
}

function EmptyState({ busqueda }: { busqueda: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[12px] border border-dashed border-neutral-200 bg-white p-8 text-center">
      <IconUserOff size={54} className="text-neutral-300" />
      <p className="mt-4 text-[16px] font-bold text-neutral-900">No se encontraron clientes</p>
      <p className="mt-1 text-[13px] font-medium text-neutral-500">
        {busqueda ? `No hay coincidencias para "${busqueda}".` : "No hay clientes activos para este filtro."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[12px] border border-red-100 bg-white p-8 text-center">
      <IconAlertCircle size={48} className="text-[#C62828]" />
      <p className="mt-3 text-[16px] font-bold text-neutral-900">Error al cargar clientes</p>
      <p className="mt-1 text-[13px] font-medium text-neutral-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-[8px] bg-coronados-green px-5 py-2 text-[14px] font-bold text-white transition hover:bg-green-700"
      >
        Reintentar
      </button>
    </div>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 ? `${words[0][0]}${words[1][0]}` : name.substring(0, 2);
  return initials.toUpperCase();
}

function formatDocumento(cliente: CajeroCliente) {
  if (!cliente.documento_tipo && !cliente.documento_num) {
    return "Sin documento";
  }

  if (!cliente.documento_num) {
    return cliente.documento_tipo ?? "Sin documento";
  }

  return `${cliente.documento_tipo ?? "Doc."}: ${cliente.documento_num}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    currency: "PEN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Sin pagos registrados";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
