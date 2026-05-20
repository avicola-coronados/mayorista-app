import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCalendar,
  IconCalendarOff,
  IconDownload,
  IconEdit,
  IconEye,
  IconFileSpreadsheet,
  IconLoader2,
  IconNote,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconShoppingCartOff,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import {
  apiClient,
  type AdminLineaVentaDetalle,
  type JornadaDetalle,
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
  const queryClient = useQueryClient();
  const { id } = useParams();
  const jornadaId = Number(id);
  const [clientePesadas, setClientePesadas] = useState<JornadaDetalle["consolidado_clientes"][number] | null>(null);
  const [pesadaEditando, setPesadaEditando] = useState<(AdminLineaVentaDetalle & { cliente_nombre: string }) | null>(null);
  const jornadaQuery = useQuery({
    queryKey: ["admin-jornada", jornadaId],
    queryFn: () => apiClient.getJornadaDetalle(jornadaId),
    enabled: Number.isInteger(jornadaId) && jornadaId > 0,
    staleTime: 5 * 60 * 1000,
  });
  const detalle = jornadaQuery.data;
  const jornada = detalle?.jornada;
  const notasQuery = useQuery({
    queryKey: ["admin-pesadas-con-notas", jornadaId],
    queryFn: () => apiClient.getAdminPesadasConNotas(jornadaId),
    enabled: Number.isInteger(jornadaId) && jornadaId > 0,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (jornadaQuery.isError) {
      toast.error("No se pudo cargar la jornada");
    }
  }, [jornadaQuery.isError]);

  async function handleExportPdf() {
    if (!jornada) {
      return;
    }

    const toastId = toast.loading("Generando PDF...");

    try {
      const response = await apiClient.exportJornada(jornada.id);
      downloadBlob(response.data, getFilename(response.headers["content-disposition"]) ?? `jornada_${jornada.codigo}.pdf`);
      toast.success("PDF descargado", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }

  async function handleExportClientes() {
    if (!jornada) {
      return;
    }

    const toastId = toast.loading("Descargando Excel...");

    try {
      const response = await apiClient.exportClientesJornada(jornada.id);
      downloadBlob(response.data, getFilename(response.headers["content-disposition"]) ?? `clientes_jornada_${jornada.codigo}.xlsx`);
      toast.success("Excel descargado", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  }

  const reopenMutation = useMutation({
    mutationFn: () => apiClient.reabrirJornada(jornadaId),
    onSuccess: async () => {
      toast.success("Jornada reabierta");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-jornada", jornadaId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-jornadas"] }),
        queryClient.invalidateQueries({ queryKey: ["jornada-activa"] }),
      ]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleReopen() {
    if (!jornada) {
      return;
    }

    const confirmed = window.confirm(
      `¿Reabrir la jornada ${jornada.codigo}? Esto permitirá registrar o modificar operaciones de la jornada nuevamente.`,
    );

    if (!confirmed) {
      return;
    }

    reopenMutation.mutate();
  }

  const soldPercent = jornada ? calculatePercent(jornada.vendido_total_kg, jornada.entrada_total_kg) : 0;
  const devolucionesPercent = jornada ? calculatePercent(jornada.devoluciones_total_kg, jornada.entrada_total_kg) : 0;
  const clientesTotal = detalle?.consolidado_clientes.reduce((sum, cliente) => sum + cliente.peso_neto_kg, 0) ?? 0;
  const hasRoundingWarning = jornada ? Math.abs(clientesTotal - jornada.vendido_total_kg) > 1 : false;

  return (
    <AdminShell
      title={jornada ? `Jornada ${jornada.codigo}` : "Jornada"}
      subtitle={jornada ? formatFullDate(jornada.fecha) : "Cargando detalle"}
      actions={
        <div className="no-print flex gap-2">
          {jornada?.estado === "cerrada" ? (
            <button
              type="button"
              onClick={handleReopen}
              disabled={reopenMutation.isPending}
              className="flex items-center gap-[6px] rounded-[6px] border border-white/30 bg-white/15 px-[14px] py-2 text-[14px] font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconRefresh size={16} className={reopenMutation.isPending ? "animate-spin" : ""} />
              <span className="hidden lg:inline">{reopenMutation.isPending ? "Reabriendo..." : "Reabrir"}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-[6px] rounded-[6px] border border-white/30 bg-white/15 px-[14px] py-2 text-[14px] font-medium text-white transition hover:bg-white/20"
          >
            <IconPrinter size={16} />
            <span className="hidden lg:inline">Imprimir</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!jornada}
            className="flex items-center gap-[6px] rounded-[6px] bg-coronados-green px-[14px] py-2 text-[14px] font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconDownload size={16} />
            <span className="hidden lg:inline">Exportar PDF</span>
          </button>
        </div>
      }
      beforeTitle={
        <button
          type="button"
          onClick={() => navigate("/admin/jornadas")}
          aria-label="Volver a jornadas"
          className="no-print flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-white/20 text-white transition hover:bg-white/30"
        >
          <IconArrowLeft size={18} />
        </button>
      }
    >
      <style>
        {`@media print {
          aside, .no-print { display: none !important; }
          main { width: 100% !important; }
          body, html { background: white !important; }
          .print-break-after { break-after: page; page-break-after: always; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }`}
      </style>

      <div className="p-[30px]">
        {jornadaQuery.isLoading ? (
          <JornadaDetalleSkeleton />
        ) : jornadaQuery.isError || !jornadaQuery.data ? (
          <ErrorState
            message={(jornadaQuery.error as Error)?.message ?? "Error al cargar la jornada"}
            onRetry={() => jornadaQuery.refetch()}
          />
        ) : (
          <>
            <section className="mb-6 grid gap-[14px] md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Entrada total"
                value={formatKg(jornadaQuery.data.jornada.entrada_total_kg)}
                secondary={`${jornadaQuery.data.jornada.entrada_total_jabas} jabas`}
                colorClass="text-coronados-orange"
              />
              <MetricCard
                label="Vendido"
                value={formatKg(jornadaQuery.data.jornada.vendido_total_kg)}
                secondary={`${soldPercent.toFixed(2)}% de entrada`}
              />
              <MetricCard
                label="Devoluciones"
                value={formatKg(jornadaQuery.data.jornada.devoluciones_total_kg)}
                secondary={`${devolucionesPercent.toFixed(2)}% de entrada`}
              />
              <MetricCard
                label="Merma"
                value={formatKg(jornadaQuery.data.jornada.merma_kg)}
                secondary={`${jornadaQuery.data.jornada.merma_porcentaje.toFixed(2)}%`}
                colorClass={getMermaTextClass(jornadaQuery.data.jornada.merma_porcentaje)}
                secondaryClass={getMermaTextClass(jornadaQuery.data.jornada.merma_porcentaje)}
              />
            </section>

            <section className="print-break-after mb-6 rounded-[12px] border border-neutral-200 bg-white p-5">
              <h2 className="mb-4 text-[16px] font-medium text-neutral-950">Detalle de Entradas</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {jornadaQuery.data.entradas_granjas.map((entrada) => (
                  <article key={entrada.granja_id} className="rounded-[8px] bg-neutral-50 p-[14px]">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-coronados-green" />
                      <h3 className="text-[13px] font-medium text-neutral-950">{entrada.granja_nombre}</h3>
                    </div>
                    <p className="text-[18px] font-medium text-coronados-orange">{formatKg(entrada.peso_neto_kg)}</p>
                    <p className="mt-1 text-[11px] font-medium text-neutral-500">{entrada.jabas} jabas</p>
                  </article>
                ))}
              </div>
            </section>

            <DesgloseMerma detalle={jornadaQuery.data} />

            {hasRoundingWarning ? (
              <div className="mb-4 rounded-[8px] border border-orange-200 bg-orange-50 px-4 py-3 text-[13px] font-medium text-orange-800">
                Los totales pueden tener diferencias por redondeo.
              </div>
            ) : null}

            {notasQuery.data && notasQuery.data.total > 0 ? (
              <AlertaNotasOperario
                pesadas={notasQuery.data.pesadas_con_notas}
                total={notasQuery.data.total}
              />
            ) : null}

            <ClientesConsolidado
              detalle={jornadaQuery.data}
              onExportExcel={handleExportClientes}
              onEditCliente={setClientePesadas}
            />

            {clientePesadas ? (
              <ModalListaPesadasCliente
                cliente={clientePesadas}
                jornadaId={jornadaId}
                onClose={() => setClientePesadas(null)}
                onEdit={(pesada) => {
                  setPesadaEditando({ ...pesada, cliente_nombre: clientePesadas.cliente_nombre });
                  setClientePesadas(null);
                }}
              />
            ) : null}

            {pesadaEditando ? (
              <ModalEditarPesada
                pesada={pesadaEditando}
                onClose={() => setPesadaEditando(null)}
                onSuccess={async () => {
                  setPesadaEditando(null);
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["admin-jornada", jornadaId] }),
                    queryClient.invalidateQueries({ queryKey: ["admin-pesadas-con-notas", jornadaId] }),
                  ]);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function AlertaNotasOperario({
  pesadas,
  total,
}: {
  total: number;
  pesadas: Array<{
    id: number;
    cliente: string;
    granja: string;
    peso_neto: number;
    nota: string | null;
    hora: string;
  }>;
}) {
  return (
    <section className="no-print mb-6 flex gap-3 rounded-[8px] border border-[#FFE599] bg-[#FFF9E6] p-4">
      <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-[#F59E0B]" />
      <div className="min-w-0 flex-1">
        <h2 className="mb-1 text-[14px] font-medium text-[#92400E]">
          {total} pesada{total !== 1 ? "s" : ""} con observaciones del operario
        </h2>
        <p className="mb-3 text-[13px] font-medium text-[#78350F]">
          Revisa las notas antes de cerrar la jornada:
        </p>
        <div className="grid gap-2">
          {pesadas.map((pesada) => (
            <article
              key={pesada.id}
              className="rounded-[6px] border border-neutral-200 border-l-[3px] border-l-coronados-orange bg-white px-3 py-[10px]"
            >
              <p className="text-[13px] font-medium text-neutral-950">
                {pesada.cliente} - {pesada.granja}
              </p>
              <p className="mt-1 text-[13px] italic text-neutral-600">"{pesada.nota}"</p>
              <p className="mt-1 text-[11px] font-medium text-neutral-400">
                {formatKg(pesada.peso_neto)} · {pesada.hora}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModalListaPesadasCliente({
  cliente,
  jornadaId,
  onClose,
  onEdit,
}: {
  cliente: JornadaDetalle["consolidado_clientes"][number];
  jornadaId: number;
  onClose: () => void;
  onEdit: (pesada: AdminLineaVentaDetalle) => void;
}) {
  const pesadasQuery = useQuery({
    queryKey: ["admin-lineas-cliente", jornadaId, cliente.cliente_id],
    queryFn: () => apiClient.getAdminLineasVentaCliente(cliente.cliente_id, jornadaId),
    enabled: cliente.cliente_id > 0,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[700px] flex-col rounded-[12px] bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <h2 className="text-[18px] font-medium text-neutral-950">Pesadas de {cliente.cliente_nombre}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar pesadas del cliente"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-neutral-500 transition hover:bg-neutral-100"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {pesadasQuery.isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[112px] animate-pulse rounded-[8px] border border-neutral-200 bg-neutral-50" />
              ))}
            </div>
          ) : pesadasQuery.isError ? (
            <ErrorState
              message={(pesadasQuery.error as Error)?.message ?? "Error al cargar pesadas"}
              onRetry={() => pesadasQuery.refetch()}
            />
          ) : pesadasQuery.data?.pesadas.length === 0 ? (
            <p className="py-8 text-center text-[14px] font-medium text-neutral-500">No hay pesadas registradas</p>
          ) : (
            <div className="grid gap-3">
              {pesadasQuery.data?.pesadas.map((pesada, index) => (
                <article
                  key={pesada.id}
                  className={`relative rounded-[8px] border p-4 ${
                    pesada.nota ? "border-[#FFE599] bg-[#FFF9E6]" : "border-neutral-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(pesada)}
                    className="absolute right-4 top-4 rounded-[6px] border border-neutral-200 bg-white px-3 py-[6px] text-[12px] font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Editar
                  </button>
                  <h3 className="pr-20 text-[14px] font-medium text-neutral-950">Pesada #{index + 1}</h3>
                  <p className="mt-1 pr-20 text-[13px] font-medium text-neutral-500">
                    {pesada.granja} · {pesada.origen === "partida" ? "Partida" : "Piso"} · {pesada.jabas} jabas
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-coronados-orange">
                    {formatKg(pesada.peso_neto)} · {pesada.hora}
                  </p>
                  {pesada.nota ? (
                    <div className="mt-3 border-t border-[#FFE599] pt-3">
                      <p className="flex items-center gap-1 text-[12px] font-medium text-neutral-600">
                        <IconNote size={15} />
                        Nota del operario:
                      </p>
                      <p className="mt-1 text-[13px] italic text-neutral-800">"{pesada.nota}"</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[8px] border border-neutral-200 bg-white px-4 py-[10px] text-[14px] font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarPesada({
  onClose,
  onSuccess,
  pesada,
}: {
  pesada: AdminLineaVentaDetalle & { cliente_nombre: string };
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [formData, setFormData] = useState({
    granja_id: pesada.granja_id,
    origen: pesada.origen,
    jabas: pesada.jabas,
    peso_bruto: pesada.peso_bruto,
    tara: pesada.tara,
    tara_por_jaba: pesada.tara_por_jaba,
  });
  const granjasQuery = useQuery({
    queryKey: ["granjas"],
    queryFn: () => apiClient.getGranjas(),
    staleTime: 5 * 60 * 1000,
  });
  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateAdminLineaVenta(pesada.id, formData),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      await onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  const pesoNeto = Math.max(0, Number((formData.peso_bruto - formData.tara).toFixed(2)));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !updateMutation.isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, updateMutation.isPending]);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (formData.jabas <= 0) {
      toast.error("Jabas debe ser mayor a 0");
      return;
    }

    if (formData.peso_bruto <= 0) {
      toast.error("Peso bruto debe ser mayor a 0");
      return;
    }

    if (formData.tara < 0) {
      toast.error("Tara no puede ser negativa");
      return;
    }

    if (formData.peso_bruto <= formData.tara) {
      toast.error("Peso bruto debe ser mayor que tara");
      return;
    }

    updateMutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={() => {
        if (!updateMutation.isPending) {
          onClose();
        }
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[12px] bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <h2 className="text-[18px] font-medium text-neutral-950">Editar pesada de {pesada.cliente_nombre}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Cerrar edición de pesada"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={submitForm}>
          <div className="grid gap-4 p-6">
            {pesada.nota ? (
              <div className="rounded-[6px] border-l-[3px] border-l-coronados-orange bg-neutral-50 p-3">
                <p className="flex items-center gap-1 text-[12px] font-medium text-neutral-600">
                  <IconNote size={15} />
                  Nota del operario:
                </p>
                <p className="mt-1 text-[13px] italic text-neutral-800">"{pesada.nota}"</p>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-neutral-700">Granja</span>
              <select
                value={formData.granja_id}
                onChange={(event) => setFormData((current) => ({ ...current, granja_id: Number(event.target.value) }))}
                disabled={granjasQuery.isLoading || updateMutation.isPending}
                className="w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {granjasQuery.data?.map((granja) => (
                  <option key={granja.id} value={granja.id}>
                    {granja.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-neutral-700">Origen</span>
              <select
                value={formData.origen}
                disabled={updateMutation.isPending}
                className="w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="partida">Partida</option>
                <option value="piso">Piso</option>
              </select>
              <span className="mt-1 block text-[11px] font-medium text-neutral-400">
                El origen Piso puede quedar sin cliente o asignarse a un cliente; en ambos casos cuenta como entrada.
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Jabas"
                min={1}
                step={1}
                value={formData.jabas}
                disabled={updateMutation.isPending}
                onChange={(jabas) => setFormData((current) => ({ ...current, jabas: Math.trunc(jabas) }))}
              />
              <NumberField
                label="Peso bruto"
                min={0.01}
                step={0.01}
                value={formData.peso_bruto}
                disabled={updateMutation.isPending}
                onChange={(peso_bruto) => setFormData((current) => ({ ...current, peso_bruto }))}
              />
              <NumberField
                label="Tara"
                min={0}
                step={0.01}
                value={formData.tara}
                disabled={updateMutation.isPending}
                onChange={(tara) => setFormData((current) => ({ ...current, tara }))}
              />
              <NumberField
                label="Tara por jaba"
                min={0.01}
                step={0.01}
                value={formData.tara_por_jaba}
                disabled={updateMutation.isPending}
                onChange={(tara_por_jaba) => setFormData((current) => ({ ...current, tara_por_jaba }))}
              />
            </div>

            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-neutral-700">Peso neto (kg)</span>
              <input
                type="number"
                value={pesoNeto}
                readOnly
                className="w-full rounded-[8px] border border-neutral-200 bg-neutral-50 px-[14px] py-[10px] text-[14px] font-semibold text-coronados-orange outline-none"
              />
              <span className="mt-1 block text-[11px] font-medium text-neutral-400">
                Calculado automáticamente: Peso bruto - Tara
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="rounded-[8px] border border-neutral-200 bg-white px-5 py-[10px] text-[14px] font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-[8px] bg-coronados-green px-5 py-[10px] text-[14px] font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumberField({
  disabled,
  label,
  min,
  onChange,
  step,
  value,
}: {
  disabled?: boolean;
  label: string;
  min: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-neutral-700">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
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
                  <MermaBadge jornada={jornada} value={jornada.merma_porcentaje} />
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
                  <MermaBadge jornada={jornada} value={jornada.merma_porcentaje} />
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

function MetricCard({
  colorClass = "text-neutral-950",
  label,
  secondary,
  secondaryClass = "text-neutral-500",
  value,
}: {
  label: string;
  value: string;
  secondary: string;
  colorClass?: string;
  secondaryClass?: string;
}) {
  return (
    <article className="rounded-[10px] border border-neutral-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-neutral-500">{label}</p>
      <p className={`mt-2 text-[24px] font-medium leading-tight ${colorClass}`}>{value}</p>
      <p className={`mt-1 text-[12px] font-medium ${secondaryClass}`}>{secondary}</p>
    </article>
  );
}

function ClientesConsolidado({
  detalle,
  onEditCliente,
  onExportExcel,
}: {
  detalle: JornadaDetalle;
  onEditCliente: (cliente: JornadaDetalle["consolidado_clientes"][number]) => void;
  onExportExcel: () => void;
}) {
  const totals = detalle.consolidado_clientes.reduce(
    (accumulator, cliente) => ({
      pesadas: accumulator.pesadas + cliente.total_pesadas,
      jabas: accumulator.jabas + cliente.total_jabas,
      bruto: accumulator.bruto + cliente.peso_bruto_kg,
      tara: accumulator.tara + cliente.tara_kg,
      neto: accumulator.neto + cliente.peso_neto_kg,
    }),
    { pesadas: 0, jabas: 0, bruto: 0, tara: 0, neto: 0 },
  );

  return (
    <section className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 p-5">
        <div>
          <h2 className="text-[16px] font-medium text-neutral-950">Consolidado por Cliente</h2>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">Ventas registradas en esta jornada</p>
        </div>
        <button
          type="button"
          onClick={onExportExcel}
          className="no-print flex items-center gap-[6px] rounded-[6px] border border-coronados-green bg-transparent px-3 py-[7px] text-[12px] font-medium text-coronados-green transition hover:bg-green-50"
        >
          <IconFileSpreadsheet size={14} />
          Exportar Excel
        </button>
      </div>

      {detalle.consolidado_clientes.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <IconShoppingCartOff size={48} className="mx-auto text-neutral-400" />
          <p className="mt-3 text-[15px] font-medium text-neutral-900">No hay ventas registradas en esta jornada</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <caption className="sr-only">Consolidado de ventas por cliente para la jornada {detalle.jornada.codigo}</caption>
            <thead className="bg-coronados-green text-white">
              <tr>
                <ClienteHead align="left">Cliente</ClienteHead>
                <ClienteHead align="right">Jabas</ClienteHead>
                <ClienteHead align="right">Peso Bruto</ClienteHead>
                <ClienteHead align="right">Tara</ClienteHead>
                <ClienteHead align="right">Peso Neto</ClienteHead>
                <ClienteHead align="right">% del Total</ClienteHead>
                <ClienteHead align="center">Acciones</ClienteHead>
              </tr>
            </thead>
            <tbody>
              {detalle.consolidado_clientes.map((cliente) => (
                <tr
                  key={cliente.cliente_id}
                  className="border-b border-neutral-200 transition hover:bg-neutral-50"
                >
                  <td className="px-5 py-[14px]">
                    <div className="flex items-center gap-[10px]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F5E9] text-[13px] font-medium text-coronados-green">
                        {getIniciales(cliente.cliente_nombre)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14px] font-medium text-neutral-950">{cliente.cliente_nombre}</p>
                          {cliente.tiene_notas ? (
                            <span className="inline-flex rounded-full bg-[#FFF9E6] px-2 py-[3px] text-[10px] font-medium text-[#92400E]">
                              Con notas
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[12px] font-medium text-neutral-500">{cliente.total_pesadas} pesadas</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-[14px] text-right text-[14px] font-medium text-neutral-950">{cliente.total_jabas}</td>
                  <td className="px-5 py-[14px] text-right text-[14px] font-medium text-neutral-950">{formatKg(cliente.peso_bruto_kg)}</td>
                  <td className="px-5 py-[14px] text-right text-[13px] font-medium text-neutral-500">{formatKg(cliente.tara_kg)}</td>
                  <td className="px-5 py-[14px] text-right text-[14px] font-medium text-coronados-orange">{formatKg(cliente.peso_neto_kg)}</td>
                  <td className="px-5 py-[14px] text-right">
                    <span className="inline-flex rounded-full bg-[#FEF0EB] px-[10px] py-1 text-[12px] font-medium text-coronados-orange">
                      {cliente.porcentaje_total.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-[14px] text-center">
                    <button
                      type="button"
                      onClick={() => onEditCliente(cliente)}
                      className="no-print inline-flex items-center gap-1 rounded-[6px] border border-neutral-200 bg-transparent px-[10px] py-[6px] text-[12px] font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      <IconEdit size={14} />
                      Ver/Editar
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50">
                <td className="px-5 py-[14px] text-[14px] font-medium text-neutral-950">Total Consolidado</td>
                <td className="px-5 py-[14px] text-right text-[14px] font-medium text-neutral-950">{totals.jabas}</td>
                <td className="px-5 py-[14px] text-right text-[14px] font-medium text-neutral-950">{formatKg(totals.bruto)}</td>
                <td className="px-5 py-[14px] text-right text-[13px] font-medium text-neutral-700">{formatKg(totals.tara)}</td>
                <td className="px-5 py-[14px] text-right text-[15px] font-medium text-coronados-orange">{formatKg(totals.neto)}</td>
                <td className="px-5 py-[14px] text-right">
                  <span className="inline-flex rounded-full bg-coronados-green px-[10px] py-1 text-[12px] font-medium text-white">
                    100%
                  </span>
                </td>
                <td className="px-5 py-[14px]" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClienteHead({ align, children }: { align: "center" | "left" | "right"; children: string }) {
  const alignClass = {
    center: "text-center",
    left: "text-left",
    right: "text-right",
  }[align];

  return (
    <th
      scope="col"
      className={`px-5 py-3 ${alignClass} text-[11px] font-medium uppercase tracking-[0.5px]`}
    >
      {children}
    </th>
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

function DesgloseMerma({ detalle }: { detalle: JornadaDetalle }) {
  const { desglose_merma: desglose, jornada } = detalle;
  const resultClass = getMermaTextClass(jornada.merma_porcentaje);
  const rows = [
    { label: "Entrada total", value: desglose.entrada_total, symbol: "✓", positive: true },
    { label: "Vendido", value: Math.abs(desglose.menos_vendido), symbol: "−" },
    { label: "Devoluciones", value: desglose.mas_devoluciones, symbol: "+", positive: true },
    { label: "Desperdicio", value: Math.abs(desglose.menos_desperdicio), symbol: "−" },
    { label: "Muertero", value: Math.abs(desglose.menos_muertero), symbol: "−" },
  ];

  return (
    <section className="mb-6 rounded-[12px] border border-neutral-200 bg-white p-5">
      <h2 className="mb-4 text-[16px] font-medium text-neutral-950">Desglose de Merma</h2>
      <div className="max-w-[560px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2 text-[14px] font-medium text-neutral-600">
            <span className="flex items-center gap-2">
              <span className={row.positive ? "text-coronados-green" : "text-neutral-400"}>{row.symbol}</span>
              {row.label}
            </span>
            <span className="font-semibold text-neutral-900">{formatKg(row.value)}</span>
          </div>
        ))}
        <div className="mt-3 border-t-2 border-neutral-200 pt-4">
          <div className="flex items-center justify-between gap-4 text-[16px] font-semibold">
            <span className="text-neutral-900">= Piso disponible</span>
            <span className={resultClass}>{formatKg(desglose.resultado_piso)}</span>
          </div>
          <p className={`mt-1 text-right text-[13px] font-semibold ${resultClass}`}>
            {jornada.merma_porcentaje.toFixed(2)}% de entrada
          </p>
        </div>
      </div>
    </section>
  );
}

function MermaBadge({ jornada, value }: { jornada?: JornadaResumen; value: number }) {
  const color =
    value > 2
      ? "bg-[#FCEBEB] text-[#C62828]"
      : value >= 1
        ? "bg-[#FFF3E0] text-[#BA7517]"
        : "bg-[#E8F5E9] text-coronados-green";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-[5px] text-[12px] font-medium ${color}`}
      title={
        jornada
          ? `Merma: ${formatKg(jornada.merma_kg)}\nEntrada: ${formatKg(jornada.entrada_total_kg)}\nVendido: ${formatKg(jornada.vendido_total_kg)}\nDevoluciones: ${formatKg(jornada.devoluciones_total_kg)}`
          : undefined
      }
    >
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

function JornadaDetalleSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-[14px] md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[112px] animate-pulse rounded-[10px] border border-neutral-200 bg-white" />
        ))}
      </div>
      <div className="rounded-[12px] border border-neutral-200 bg-white p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-neutral-100" />
        <div className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[92px] animate-pulse rounded-[8px] bg-neutral-100" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
        <div className="h-[76px] animate-pulse border-b border-neutral-100 bg-white" />
        <div className="h-10 bg-coronados-green" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 border-b border-neutral-100 px-5 py-[14px]">
            {Array.from({ length: 6 }).map((__, cellIndex) => (
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
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value)} kg`;
}

function calculatePercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function getMermaTextClass(value: number) {
  if (value > 2) {
    return "text-[#C62828]";
  }

  if (value >= 1) {
    return "text-[#BA7517]";
  }

  return "text-coronados-green";
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

function formatFullDate(value: string) {
  const date = new Date(value);
  const weekday = new Intl.DateTimeFormat("es-PE", { weekday: "long" }).format(date);
  const rest = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return `${capitalize(weekday)} ${rest}`;
}

function getIniciales(nombre: string) {
  const words = nombre.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return nombre.substring(0, 2).toUpperCase();
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
