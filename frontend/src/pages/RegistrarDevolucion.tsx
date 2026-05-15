import { FormEvent, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconFilter,
  IconHeart,
  IconLoader2,
  IconPackageOff,
  IconTool,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { apiClient, type Devolucion, type TipoDevolucion } from "../services/api";
import { useAuthStore } from "../store/authStore";

const DEFAULT_TARA_POR_JABA = 5.8;

type FormState = {
  cliente_id: number;
  tipo: TipoDevolucion;
  jabas: string;
  tara_por_jaba: string;
  peso_bruto: string;
};

const initialForm: FormState = {
  cliente_id: 0,
  tipo: "pelado",
  jabas: "",
  tara_por_jaba: String(DEFAULT_TARA_POR_JABA),
  peso_bruto: "",
};

const tipos: Array<{ value: TipoDevolucion; label: string; icon: typeof IconTool }> = [
  { value: "pelado", label: "Pelado", icon: IconTool },
  { value: "muerto", label: "Muerto", icon: IconX },
  { value: "vivo", label: "Vivo", icon: IconHeart },
];

export function RegistrarDevolucion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);
  const pesoBrutoRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState<FormState>(initialForm);
  const [deleteTarget, setDeleteTarget] = useState<Devolucion | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });
  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: apiClient.getClientes,
    staleTime: 5 * 60 * 1000,
  });
  const jornada = jornadaQuery.data;
  const devolucionesQuery = useQuery({
    queryKey: ["devoluciones", jornada?.id],
    queryFn: () => apiClient.getDevoluciones(jornada!.id),
    enabled: Boolean(jornada?.id),
  });

  const jabas = Number(form.jabas) || 0;
  const taraPorJaba = Number(form.tara_por_jaba) || 0;
  const pesoBruto = Number(form.peso_bruto) || 0;
  const tara = useMemo(() => round1(jabas > 0 ? jabas * taraPorJaba : 0), [jabas, taraPorJaba]);
  const pesoNeto = useMemo(() => round1(pesoBruto - tara), [pesoBruto, tara]);
  const hasChanges =
    form.cliente_id !== initialForm.cliente_id ||
    form.tipo !== initialForm.tipo ||
    form.jabas !== initialForm.jabas ||
    form.peso_bruto !== initialForm.peso_bruto ||
    form.tara_por_jaba !== initialForm.tara_por_jaba;

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createDevolucion({
        jornada_id: jornada!.id,
        cliente_id: form.cliente_id,
        tipo: form.tipo,
        jabas: form.jabas.trim() ? jabas : null,
        peso_bruto: pesoBruto,
        tara,
        peso_neto: pesoNeto,
      }),
    onSuccess: async (devolucion) => {
      toast.success(`Devolución registrada: ${devolucion.peso_neto.toFixed(1)} kg`);
      setForm((current) => ({
        ...initialForm,
        cliente_id: current.cliente_id,
        tipo: current.tipo,
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["devoluciones", jornada?.id] }),
        queryClient.invalidateQueries({ queryKey: ["metricas", jornada?.id] }),
      ]);
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteDevolucion(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: async () => {
      toast.success("Devolución eliminada");
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["devoluciones", jornada?.id] }),
        queryClient.invalidateQueries({ queryKey: ["metricas", jornada?.id] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  function handleBack() {
    if (hasChanges && !window.confirm("Hay cambios sin guardar. ¿Deseas salir?")) {
      return;
    }

    navigate("/");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!jornada) {
      toast.error("No hay jornada activa para registrar devoluciones");
      navigate("/");
      return;
    }

    if (jornada.estado !== "abierta") {
      toast.error("No se pueden registrar devoluciones en una jornada cerrada");
      return;
    }

    if (!form.cliente_id) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (!form.tipo) {
      toast.error("Selecciona el tipo de devolución");
      return;
    }

    if (jabas < 0 || taraPorJaba <= 0 || pesoBruto <= 0) {
      toast.error("Ingresa valores válidos para jabas, tara y peso bruto");
      return;
    }

    if (pesoNeto <= 0 || pesoNeto > pesoBruto) {
      toast.error("El peso neto no puede ser negativo");
      return;
    }

    createMutation.mutate();
  }

  const isLoading = jornadaQuery.isLoading || clientesQuery.isLoading;
  const disabled = createMutation.isPending || isLoading || jornada?.estado === "cerrada";

  useEffect(() => {
    if (jornadaQuery.isError) {
      toast.error("No hay jornada activa para registrar devoluciones");
      navigate("/");
    }
  }, [jornadaQuery.isError, navigate]);

  useEffect(() => {
    if (!isLoading) {
      pesoBrutoRef.current?.focus();
    }
  }, [isLoading]);

  if (jornadaQuery.isError) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-8">
      <header className="flex items-center justify-between gap-4 bg-coronados-orange px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-white/20 transition hover:bg-white/30"
            aria-label="Volver al dashboard"
          >
            <IconArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-[20px] font-medium leading-tight">Registrar Devolución</h1>
            <p className="mt-1 text-[13px] font-medium text-white/85">Pelado, muerto o vivo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-medium text-white/90">{user?.role === "operario" ? "Operario" : user?.role}</p>
          <p className="mt-1 text-[12px] font-medium text-white/70">Jornada {jornada?.codigo ?? "..."}</p>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4 bg-coronados-green px-6 py-3 text-white">
        <p className="text-[14px] font-medium">Jornada {jornada?.codigo ?? "..."} · en curso</p>
        <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-medium">
          {jornada?.estado === "cerrada" ? "Cerrada" : "Abierta"}
        </span>
      </div>

      <main className="mx-auto w-full max-w-6xl p-6">
        {isLoading ? (
          <DevolucionSkeleton />
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mb-6 rounded-[12px] border border-neutral-200 bg-white p-6">
              <h2 className="mb-5 text-[16px] font-medium text-neutral-950">Nueva Devolución</h2>

              <div className="grid gap-5">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">
                    Cliente <span className="text-red-600">*</span>
                  </span>
                  <select
                    value={form.cliente_id}
                    disabled={disabled}
                    onChange={(event) => setForm((current) => ({ ...current, cliente_id: Number(event.target.value) }))}
                    className="w-full rounded-[8px] border border-neutral-200 bg-white px-[14px] py-[10px] text-[14px] font-medium outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 disabled:bg-neutral-50"
                  >
                    <option value={0}>Selecciona un cliente</option>
                    {clientesQuery.data?.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-[13px] font-medium text-neutral-700">
                    Tipo de devolución <span className="text-red-600">*</span>
                  </span>
                  <div className="grid grid-cols-3 gap-[10px]">
                    {tipos.map((tipo) => {
                      const Icon = tipo.icon;
                      const selected = form.tipo === tipo.value;
                      return (
                        <button
                          key={tipo.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => setForm((current) => ({ ...current, tipo: tipo.value }))}
                          className={`flex flex-col items-center gap-[6px] rounded-[8px] p-3 text-[14px] transition disabled:opacity-50 ${
                            selected
                              ? "border-2 border-coronados-green bg-[#E8F5E9] font-medium text-coronados-green"
                              : "border border-neutral-200 bg-white font-medium text-neutral-500 hover:bg-neutral-50"
                          }`}
                        >
                          <Icon size={24} />
                          {tipo.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Jabas (opcional)"
                    value={form.jabas}
                    onChange={(jabas) => setForm((current) => ({ ...current, jabas }))}
                    disabled={disabled}
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                  <NumberField
                    label="Tara por jaba (kg)"
                    value={form.tara_por_jaba}
                    onChange={(tara_por_jaba) => setForm((current) => ({ ...current, tara_por_jaba }))}
                    disabled={disabled}
                    min="0.1"
                    step="0.1"
                    placeholder="5.8"
                    muted
                  />
                </div>

                <NumberField
                  ref={pesoBrutoRef}
                  label="Peso Bruto (kg)"
                  value={form.peso_bruto}
                  onChange={(peso_bruto) => setForm((current) => ({ ...current, peso_bruto }))}
                  disabled={disabled}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                  large
                />

                <div className="flex items-center justify-between rounded-[8px] bg-neutral-50 p-[14px]">
                  <div>
                    <p className="text-[12px] font-medium text-neutral-500">TARA CALCULADA</p>
                    <p className="mt-1 text-[18px] font-medium text-neutral-950">{tara.toFixed(1)} kg</p>
                  </div>
                  <div className="h-10 w-px bg-neutral-200" />
                  <div className="text-right">
                    <p className="text-[12px] font-medium text-neutral-500">PESO NETO</p>
                    <p className={`mt-1 text-[18px] font-medium ${pesoNeto > 0 ? "text-coronados-orange" : "text-red-600"}`}>
                      {pesoNeto.toFixed(1)} kg
                    </p>
                  </div>
                </div>

                {pesoNeto < 0 ? (
                  <p className="text-[13px] font-medium text-red-600">El peso neto no puede ser negativo</p>
                ) : null}

                <button
                  type="submit"
                  disabled={disabled || pesoNeto <= 0}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] bg-coronados-green p-[14px] text-[15px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createMutation.isPending ? <IconLoader2 size={18} className="animate-spin" /> : null}
                  {createMutation.isPending ? "Guardando..." : "Registrar Devolución"}
                </button>
              </div>
            </form>

            <section ref={tableRef} className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-200 p-5">
                <div>
                  <h2 className="text-[16px] font-medium text-neutral-950">Devoluciones del Día</h2>
                  <p className="mt-1 text-[13px] font-medium text-neutral-500">
                    {devolucionesQuery.data?.total_registros ?? 0} registros · Total:{" "}
                    {(devolucionesQuery.data?.total_kg ?? 0).toFixed(1)} kg
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-[6px] rounded-[6px] border border-neutral-200 bg-transparent px-3 py-[7px] text-[12px] font-medium text-neutral-600"
                >
                  <IconFilter size={14} />
                  Filtrar
                </button>
              </div>

              {devolucionesQuery.isLoading ? (
                <TableSkeleton />
              ) : (devolucionesQuery.data?.devoluciones.length ?? 0) === 0 ? (
                <EmptyTable />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse">
                    <thead className="bg-neutral-50">
                      <tr>
                        {["Hora", "Cliente", "Tipo", "Jabas", "Peso Bruto", "Tara", "Peso Neto", "Acciones"].map((header, index) => (
                          <th
                            key={header}
                            className={`px-4 py-3 text-[11px] font-medium uppercase text-neutral-500 ${
                              index === 0 || index === 1 ? "text-left" : index === 2 || index === 7 ? "text-center" : "text-right"
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {devolucionesQuery.data?.devoluciones.map((devolucion) => (
                        <tr
                          key={devolucion.id}
                          className={`border-b border-neutral-200 transition hover:bg-neutral-50 ${
                            deletingId === devolucion.id ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-4 py-[14px] text-left text-[13px] font-medium text-neutral-600">
                            {formatTime(devolucion.created_at)}
                          </td>
                          <td className="px-4 py-[14px] text-left text-[14px] font-medium text-neutral-950">
                            {devolucion.cliente_nombre}
                          </td>
                          <td className="px-4 py-[14px] text-center">
                            <TipoBadge tipo={devolucion.tipo} />
                          </td>
                          <td className="px-4 py-[14px] text-right text-[14px] font-medium text-neutral-900">
                            {devolucion.jabas ?? "-"}
                          </td>
                          <td className="px-4 py-[14px] text-right text-[14px] font-medium text-neutral-900">
                            {devolucion.peso_bruto.toFixed(1)} kg
                          </td>
                          <td className="px-4 py-[14px] text-right text-[13px] font-medium text-neutral-500">
                            {devolucion.tara.toFixed(1)} kg
                          </td>
                          <td className="px-4 py-[14px] text-right text-[14px] font-medium text-coronados-orange">
                            {devolucion.peso_neto.toFixed(1)} kg
                          </td>
                          <td className="px-4 py-[14px] text-center">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(devolucion)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-neutral-200 bg-white text-[#C62828] transition hover:bg-neutral-50 disabled:opacity-50"
                              aria-label="Eliminar devolución"
                            >
                              {deletingId === devolucion.id ? (
                                <IconLoader2 size={16} className="animate-spin" />
                              ) : (
                                <IconTrash size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {deleteTarget ? (
        <ConfirmDelete
          devolucion={deleteTarget}
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min: string;
  step: string;
  placeholder: string;
  required?: boolean;
  muted?: boolean;
  large?: boolean;
};

const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { disabled, label, large, min, muted, onChange, placeholder, required, step, value },
  ref,
) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-neutral-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        ref={ref}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={(event) => {
          if (event.target.value && step !== "1") {
            onChange(Number(event.target.value).toFixed(2));
          }
        }}
        min={min}
        step={step}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-[8px] border border-neutral-200 px-[14px] ${
          large ? "py-[12px] text-[16px]" : "py-[10px] text-[14px]"
        } font-medium outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100 ${
          muted ? "bg-neutral-50" : "bg-white"
        } disabled:opacity-60`}
      />
    </label>
  );
});

function TipoBadge({ tipo }: { tipo: TipoDevolucion }) {
  const style = {
    pelado: "bg-[#FFF3E0] text-[#BA7517]",
    muerto: "bg-[#FCEBEB] text-[#C62828]",
    vivo: "bg-[#E8F5E9] text-coronados-green",
  }[tipo];

  return (
    <span className={`inline-flex rounded-full px-[10px] py-1 text-[11px] font-medium capitalize ${style}`}>
      {tipo}
    </span>
  );
}

function ConfirmDelete({
  devolucion,
  isPending,
  onCancel,
  onConfirm,
}: {
  devolucion: Devolucion;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-2xl">
        <h2 className="text-[18px] font-medium text-neutral-950">¿Eliminar devolución?</h2>
        <p className="mt-2 text-[14px] font-medium leading-6 text-neutral-600">
          Se eliminará la devolución de {devolucion.peso_neto.toFixed(1)} kg de {devolucion.cliente_nombre}. Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="flex-1 rounded-[8px] border border-neutral-200 bg-white px-4 py-2 text-[14px] font-medium text-neutral-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#C62828] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          >
            {isPending ? <IconLoader2 size={16} className="animate-spin" /> : null}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function DevolucionSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-[460px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
      <div className="h-[300px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="mb-3 h-10 animate-pulse rounded bg-neutral-100" />
      ))}
    </div>
  );
}

function EmptyTable() {
  return (
    <div className="px-6 py-12 text-center">
      <IconPackageOff size={48} className="mx-auto text-neutral-400" />
      <p className="mt-3 text-[15px] font-medium text-neutral-900">No hay devoluciones registradas hoy</p>
    </div>
  );
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}
