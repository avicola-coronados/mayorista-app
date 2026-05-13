import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  IconCalendar,
  IconCalendarOff,
  IconDownload,
  IconEye,
  IconLoader2,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import {
  apiClient,
  type JornadaResumen,
  type JornadasListParams,
} from "../../services/api";

const PAGE_SIZE = 10;

type DateFilters = {
  fecha_inicio: string;
  fecha_fin: string;
};

export function AdminJornadas() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilters, setDateFilters] = useState<DateFilters>({
    fecha_inicio: "",
    fecha_fin: "",
  });
  const [dateModalOpen, setDateModalOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const params = useMemo<JornadasListParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(dateFilters.fecha_inicio ? { fecha_inicio: dateFilters.fecha_inicio } : {}),
      ...(dateFilters.fecha_fin ? { fecha_fin: dateFilters.fecha_fin } : {}),
    }),
    [dateFilters.fecha_fin, dateFilters.fecha_inicio, debouncedSearch, page],
  );

  const jornadasQuery = useQuery({
    queryKey: ["admin-jornadas", params],
    queryFn: ({ signal }) => apiClient.getJornadas(params, signal),
    staleTime: 5 * 60 * 1000,
  });

  const isTyping = search.trim() !== debouncedSearch;
  const data = jornadasQuery.data;
  const jornadas = data?.jornadas ?? [];
  const totalPages = data?.total_pages ?? 1;

  async function handleExportAll() {
    const toastId = toast.loading("Preparando exportación...");

    try {
      const response = await apiClient.exportJornadas(params);
      downloadBlob(response.data, getFilename(response.headers["content-disposition"]) ?? "jornadas.xlsx");
      toast.success("Exportación descargada", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }

  async function handleExportOne(jornada: JornadaResumen) {
    const toastId = toast.loading(`Preparando jornada ${jornada.codigo}...`);

    try {
      const response = await apiClient.exportJornada(jornada.id);
      downloadBlob(response.data, getFilename(response.headers["content-disposition"]) ?? `jornada_${jornada.codigo}.pdf`);
      toast.success("PDF descargado", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }

  return (
    <AdminShell
      title="Jornadas"
      subtitle="Historial de jornadas consolidadas"
      actions={null}
    >
      <div className="p-[30px]">
        <section className="mb-5 flex gap-3">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-coronados-green bg-white px-[14px]">
            {isTyping || jornadasQuery.isFetching ? (
              <IconLoader2 size={18} className="animate-spin text-coronados-green" />
            ) : (
              <IconSearch size={18} className="text-coronados-green" />
            )}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código o fecha..."
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-neutral-900 outline-none placeholder:text-neutral-400"
              aria-label="Buscar jornadas por código o fecha"
            />
          </div>

          <button
            type="button"
            onClick={() => setDateModalOpen(true)}
            className="flex h-10 items-center gap-[6px] rounded-[8px] border border-coronados-orange bg-white px-4 text-[14px] font-medium text-coronados-orange transition hover:bg-orange-50"
          >
            <IconCalendar size={16} />
            Filtrar por fecha
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            disabled={jornadasQuery.isLoading}
            className="flex h-10 items-center gap-[6px] rounded-[8px] bg-coronados-green px-4 text-[14px] font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconDownload size={16} />
            Exportar todo
          </button>
        </section>

        <span className="sr-only" aria-live="polite">
          {data ? `Mostrando ${jornadas.length} de ${data.total} jornadas` : "Cargando jornadas"}
        </span>

        {jornadasQuery.isLoading ? (
          <JornadasSkeleton />
        ) : jornadasQuery.isError ? (
          <ErrorState
            message={(jornadasQuery.error as Error)?.message ?? "Error al cargar jornadas"}
            onRetry={() => jornadasQuery.refetch()}
          />
        ) : jornadas.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <JornadasTable
              jornadas={jornadas}
              onView={(jornada) => navigate(`/admin/jornadas/${jornada.id}`)}
              onDownload={handleExportOne}
            />
            <Pagination
              page={page}
              total={data?.total ?? 0}
              totalPages={totalPages}
              showing={jornadas.length}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {dateModalOpen ? (
        <DateFilterModal
          value={dateFilters}
          onApply={(filters) => {
            setDateFilters(filters);
            setPage(1);
            setDateModalOpen(false);
          }}
          onClose={() => setDateModalOpen(false)}
        />
      ) : null}
    </AdminShell>
  );
}

export function AdminJornadaDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const jornadaId = Number(id);
  const jornadaQuery = useQuery({
    queryKey: ["admin-jornada", jornadaId],
    queryFn: () => apiClient.getJornadaDetalle(jornadaId),
    enabled: Number.isInteger(jornadaId) && jornadaId > 0,
  });

  return (
    <AdminShell title="Detalle de jornada" subtitle="Resumen consolidado de la jornada">
      <div className="p-[30px]">
        <button
          type="button"
          onClick={() => navigate("/admin/jornadas")}
          className="mb-5 rounded-[8px] border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Volver a jornadas
        </button>

        {jornadaQuery.isLoading ? (
          <div className="h-[260px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
        ) : jornadaQuery.isError || !jornadaQuery.data ? (
          <ErrorState
            message={(jornadaQuery.error as Error)?.message ?? "Error al cargar la jornada"}
            onRetry={() => jornadaQuery.refetch()}
          />
        ) : (
          <section className="rounded-[12px] border border-neutral-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
              <div>
                <h2 className="text-[22px] font-semibold text-neutral-950">Jornada {jornadaQuery.data.codigo}</h2>
                <p className="mt-1 text-[14px] font-medium text-neutral-500">
                  {formatLongDate(jornadaQuery.data.fecha)}
                </p>
              </div>
              <EstadoBadge estado={jornadaQuery.data.estado} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <DetailMetric label="Entrada" value={formatKg(jornadaQuery.data.entrada_total_kg)} highlight />
              <DetailMetric label="Vendido" value={formatKg(jornadaQuery.data.vendido_total_kg)} />
              <DetailMetric label="Devoluciones" value={formatKg(jornadaQuery.data.devoluciones_total_kg)} />
              <DetailMetric label="Desperdicio" value={formatKg(jornadaQuery.data.desperdicio_kg)} />
              <DetailMetric label="Muertero" value={formatKg(jornadaQuery.data.muertero_kg)} />
              <div className="rounded-[8px] bg-neutral-50 p-4">
                <p className="text-[13px] font-medium text-neutral-500">Merma</p>
                <div className="mt-2">
                  <MermaBadge value={jornadaQuery.data.merma_porcentaje} />
                </div>
                <p className="mt-2 text-[18px] font-semibold text-neutral-950">
                  {formatKg(jornadaQuery.data.merma_kg)}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function JornadasTable({
  jornadas,
  onDownload,
  onView,
}: {
  jornadas: JornadaResumen[];
  onDownload: (jornada: JornadaResumen) => void;
  onView: (jornada: JornadaResumen) => void;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-[12px] border border-neutral-200 bg-white lg:block">
        <table className="w-full">
          <thead className="bg-coronados-green text-white">
            <tr>
              <TableHead align="left">Jornada</TableHead>
              <TableHead align="left">Fecha</TableHead>
              <TableHead align="right">Entrada</TableHead>
              <TableHead align="right">Vendido</TableHead>
              <TableHead align="right">Merma %</TableHead>
              <TableHead align="center">Estado</TableHead>
              <TableHead align="center">Acciones</TableHead>
            </tr>
          </thead>
          <tbody>
            {jornadas.map((jornada) => (
              <tr key={jornada.id} className="border-b border-neutral-200 transition hover:bg-neutral-50">
                <td className="px-4 py-4 text-left text-[14px] font-medium text-neutral-950">{jornada.codigo}</td>
                <td className="px-4 py-4 text-left text-[13px] font-medium text-neutral-500">
                  {formatLongDate(jornada.fecha)}
                </td>
                <td className="px-4 py-4 text-right text-[14px] font-medium text-coronados-orange">
                  {formatKg(jornada.entrada_total_kg)}
                </td>
                <td className="px-4 py-4 text-right text-[14px] font-medium text-neutral-900">
                  {formatKg(jornada.vendido_total_kg)}
                </td>
                <td className="px-4 py-4 text-right">
                  <MermaBadge value={jornada.merma_porcentaje} />
                </td>
                <td className="px-4 py-4 text-center">
                  <EstadoBadge estado={jornada.estado} />
                </td>
                <td className="px-4 py-4 text-center">
                  <ActionButtons jornada={jornada} onDownload={onDownload} onView={onView} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-[14px] lg:hidden">
        {jornadas.map((jornada) => (
          <article key={jornada.id} className="rounded-[12px] border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-neutral-950">{jornada.codigo}</h2>
                <p className="mt-1 text-[13px] font-medium text-neutral-500">{formatLongDate(jornada.fecha)}</p>
              </div>
              <EstadoBadge estado={jornada.estado} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              <Metric label="Entrada" value={formatKg(jornada.entrada_total_kg)} highlight />
              <Metric label="Vendido" value={formatKg(jornada.vendido_total_kg)} />
              <Metric label="Devoluciones" value={formatKg(jornada.devoluciones_total_kg)} />
              <div>
                <p className="text-neutral-500">Merma</p>
                <div className="mt-1">
                  <MermaBadge value={jornada.merma_porcentaje} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <ActionButtons jornada={jornada} onDownload={onDownload} onView={onView} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function TableHead({ align, children }: { align: "left" | "right" | "center"; children: string }) {
  const alignClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  }[align];

  return (
    <th
      className={`px-4 py-[14px] ${alignClass} text-[12px] font-medium uppercase tracking-[0.5px]`}
      scope="col"
    >
      {children}
    </th>
  );
}

function MermaBadge({ value }: { value: number }) {
  const color =
    value > 2
      ? "bg-[#FCEBEB] text-[#C62828]"
      : value >= 1
        ? "bg-[#FFF3E0] text-[#BA7517]"
        : "bg-[#E8F5E9] text-coronados-green";

  return (
    <span className={`inline-flex rounded-full px-3 py-[5px] text-[12px] font-medium ${color}`}>
      {value.toFixed(2)}%
    </span>
  );
}

function EstadoBadge({ estado }: { estado: JornadaResumen["estado"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-[14px] py-[5px] text-[11px] font-medium ${
        estado === "abierta" ? "bg-[#E8F5E9] text-coronados-green" : "bg-[#F5F5F5] text-neutral-600"
      }`}
    >
      {estado === "abierta" ? "Abierta" : "Cerrada"}
    </span>
  );
}

function ActionButtons({
  jornada,
  onDownload,
  onView,
}: {
  jornada: JornadaResumen;
  onDownload: (jornada: JornadaResumen) => void;
  onView: (jornada: JornadaResumen) => void;
}) {
  return (
    <div className="inline-flex gap-2">
      <button
        type="button"
        aria-label={`Ver jornada ${jornada.codigo}`}
        onClick={() => onView(jornada)}
        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-coronados-green text-white transition hover:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
      >
        <IconEye size={17} />
      </button>
      <button
        type="button"
        aria-label={`Descargar jornada ${jornada.codigo}`}
        onClick={() => onDownload(jornada)}
        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-coronados-green text-white transition hover:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
      >
        <IconDownload size={17} />
      </button>
    </div>
  );
}

function Pagination({
  onPageChange,
  page,
  showing,
  total,
  totalPages,
}: {
  page: number;
  showing: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="mt-[18px] flex items-center justify-between gap-4 text-[13px] font-medium text-neutral-500">
      <p>
        Mostrando {showing} de {total} jornadas
      </p>
      <div className="flex items-center gap-2">
        <PageButton disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </PageButton>
        {pages.map((item, index) =>
          item === "..." ? (
            <span key={`${item}-${index}`} className="px-1 text-neutral-400">
              ...
            </span>
          ) : (
            <PageButton key={item} active={item === page} onClick={() => onPageChange(item)}>
              {String(item)}
            </PageButton>
          ),
        )}
        <PageButton disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[6px] px-[14px] py-[7px] text-[12px] transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border border-coronados-orange bg-coronados-orange font-medium text-white"
          : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}

function DateFilterModal({
  onApply,
  onClose,
  value,
}: {
  value: DateFilters;
  onApply: (filters: DateFilters) => void;
  onClose: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleApply() {
    const end = localValue.fecha_fin || todayIso();

    if (localValue.fecha_inicio && localValue.fecha_inicio > end) {
      toast.error("La fecha inicio no puede ser mayor a la fecha fin");
      return;
    }

    if (localValue.fecha_inicio && daysBetween(localValue.fecha_inicio, end) > 366) {
      toast.error("El rango máximo es de 1 año");
      return;
    }

    onApply({ fecha_inicio: localValue.fecha_inicio, fecha_fin: end });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-neutral-950">Filtrar por fecha</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Cerrar filtro de fecha"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          <DateInput
            label="Fecha inicio"
            value={localValue.fecha_inicio}
            onChange={(fecha_inicio) => setLocalValue((current) => ({ ...current, fecha_inicio }))}
          />
          <DateInput
            label="Fecha fin"
            value={localValue.fecha_fin}
            onChange={(fecha_fin) => setLocalValue((current) => ({ ...current, fecha_fin }))}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setLocalValue({ fecha_inicio: "", fecha_fin: "" });
              onApply({ fecha_inicio: "", fecha_fin: "" });
            }}
            className="rounded-[8px] border border-neutral-200 bg-white px-5 py-[10px] text-[14px] font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-[8px] bg-coronados-orange px-5 py-[10px] text-[14px] font-medium text-white transition hover:bg-orange-700"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-neutral-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function JornadasSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
      <div className="h-11 bg-coronados-green" />
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-7 gap-4 px-4 py-4">
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <div key={cellIndex} className="h-5 animate-pulse rounded bg-neutral-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[12px] border border-neutral-200 bg-white px-6 py-16 text-center">
      <IconCalendarOff size={48} className="mx-auto text-neutral-400" />
      <h2 className="mt-4 text-[18px] font-medium text-neutral-900">No se encontraron jornadas</h2>
      <p className="mt-1 text-[14px] font-medium text-neutral-500">Intenta ajustar los filtros de búsqueda</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[12px] border border-red-100 bg-red-50 px-5 py-4">
      <p className="text-[14px] font-semibold text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-[8px] border border-red-200 bg-white px-4 py-2 text-[13px] font-bold text-red-800 transition hover:bg-red-100"
      >
        Reintentar
      </button>
    </div>
  );
}

function Metric({ highlight, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className={`mt-1 font-semibold ${highlight ? "text-coronados-orange" : "text-neutral-950"}`}>{value}</p>
    </div>
  );
}

function DetailMetric({ highlight, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-neutral-50 p-4">
      <p className="text-[13px] font-medium text-neutral-500">{label}</p>
      <p className={`mt-2 text-[20px] font-semibold ${highlight ? "text-coronados-orange" : "text-neutral-950"}`}>
        {value}
      </p>
    </div>
  );
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value)} kg`;
}

function formatLongDate(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(date).replace(".", "");
  const rest = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");

  return `${capitalize(day)} ${capitalize(rest)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getVisiblePages(page: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", page - 1, page, page + 1, "...", totalPages];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getFilename(contentDisposition?: string) {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/);
  return match?.[1];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return diff / (1000 * 60 * 60 * 24);
}
