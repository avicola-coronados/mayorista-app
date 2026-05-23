import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconPlus, IconReceiptOff } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import {
  apiClient,
  type CajeroEgreso,
  type CajeroEgresosStats,
  type CajeroRegistrarEgresoPayload,
} from "../../services/api";

const conceptos = [
  "Pago a proveedores",
  "Combustible",
  "Mantenimiento",
  "Servicios (luz, agua, etc.)",
  "Salarios",
  "Alquiler",
  "Insumos",
  "Otro",
] as const;

const metodosPago = [
  { label: "Efectivo", value: "efectivo" },
  { label: "Transferencia", value: "transferencia" },
  { label: "Cheque", value: "cheque" },
  { label: "Tarjeta", value: "tarjeta" },
];

const emptyStats: CajeroEgresosStats = {
  total_dia: 0,
  num_movimientos_dia: 0,
  total_mes: 0,
  num_movimientos_mes: 0,
  mes_nombre: "",
};

export function EgresosCajero() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    beneficiario: "",
    comprobante: "",
    concepto: "",
    descripcion: "",
    metodo_pago: "efectivo",
    monto: "",
  });

  const egresosQuery = useQuery({
    queryKey: ["egresos-cajero"],
    queryFn: () => apiClient.getEgresosCajero(),
    staleTime: 30000,
  });

  const registrarEgresoMutation = useMutation({
    mutationFn: (payload: CajeroRegistrarEgresoPayload) => apiClient.registrarEgresoCajero(payload),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      setForm({
        beneficiario: "",
        comprobante: "",
        concepto: "",
        descripcion: "",
        metodo_pago: "efectivo",
        monto: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["egresos-cajero"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stats = egresosQuery.data?.stats ?? emptyStats;
  const egresos = egresosQuery.data?.egresos ?? [];
  const isSaving = registrarEgresoMutation.isPending;

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const monto = Number.parseFloat(form.monto);

    if (!form.concepto) {
      toast.error("Selecciona un concepto");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (!form.beneficiario.trim()) {
      toast.error("Ingresa el beneficiario");
      return;
    }

    if (!form.descripcion.trim()) {
      toast.error("Ingresa una descripción");
      return;
    }

    registrarEgresoMutation.mutate({
      beneficiario: form.beneficiario.trim(),
      comprobante: form.comprobante.trim() || null,
      concepto: form.concepto,
      descripcion: form.descripcion.trim(),
      metodo_pago: form.metodo_pago,
      monto,
    });
  }

  return (
    <CajeroShell title="Egresos de Caja" subtitle={formatLongDate(new Date())}>
      <div className="p-[30px]">
        <section className="mb-6 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <StatsCard
            detail={`${stats.num_movimientos_dia} movimientos registrados`}
            label="Egresos del día"
            tone="orange"
            value={formatCurrency(stats.total_dia)}
          />
          <StatsCard
            detail={stats.mes_nombre || formatMonth(new Date())}
            label="Egresos del mes"
            value={formatCurrency(stats.total_mes)}
          />
        </section>

        <section className="mb-6 rounded-[12px] border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-[16px] font-medium text-neutral-950">Registrar nuevo egreso</h2>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field label="Concepto" htmlFor="concepto">
              <select
                id="concepto"
                value={form.concepto}
                onChange={(event) => updateForm("concepto", event.target.value)}
                className={inputClassName}
                required
                disabled={isSaving}
              >
                <option value="">Seleccionar concepto...</option>
                {conceptos.map((concepto) => (
                  <option key={concepto} value={concepto}>
                    {concepto}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Field label="Monto (S/)" htmlFor="monto">
                <input
                  id="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.monto}
                  onChange={(event) => updateForm("monto", event.target.value)}
                  className={inputClassName}
                  placeholder="0.00"
                  required
                  disabled={isSaving}
                />
              </Field>

              <Field label="Método de pago" htmlFor="metodo-pago">
                <select
                  id="metodo-pago"
                  value={form.metodo_pago}
                  onChange={(event) => updateForm("metodo_pago", event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSaving}
                >
                  {metodosPago.map((metodo) => (
                    <option key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Beneficiario / Proveedor" htmlFor="beneficiario">
              <input
                id="beneficiario"
                type="text"
                value={form.beneficiario}
                onChange={(event) => updateForm("beneficiario", event.target.value)}
                className={inputClassName}
                placeholder="Nombre de quien recibe el pago"
                required
                disabled={isSaving}
              />
            </Field>

            <Field label="Descripción" htmlFor="descripcion">
              <textarea
                id="descripcion"
                rows={3}
                value={form.descripcion}
                onChange={(event) => updateForm("descripcion", event.target.value)}
                className={inputClassName}
                placeholder="Ej: Pago de gasolina para camión de reparto, 45 galones..."
                required
                disabled={isSaving}
              />
            </Field>

            <Field label="Comprobante (opcional)" htmlFor="comprobante">
              <input
                id="comprobante"
                type="text"
                value={form.comprobante}
                onChange={(event) => updateForm("comprobante", event.target.value)}
                className={inputClassName}
                placeholder="N° de boleta o factura"
                disabled={isSaving}
              />
            </Field>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-coronados-orange px-6 py-3 text-[14px] font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconPlus size={18} stroke={2.4} />
              {isSaving ? "Registrando..." : "Registrar egreso"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-[16px] font-medium text-neutral-950">Egresos de hoy</h2>

          {egresosQuery.isLoading ? (
            <EgresosSkeleton />
          ) : egresosQuery.isError ? (
            <ErrorState
              message={(egresosQuery.error as Error)?.message ?? "Error al cargar egresos"}
              onRetry={() => egresosQuery.refetch()}
            />
          ) : egresos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-3">
              {egresos.map((egreso) => (
                <EgresoCard egreso={egreso} key={egreso.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </CajeroShell>
  );
}

const inputClassName =
  "w-full rounded-[8px] border border-neutral-300 px-3 py-2.5 text-[14px] font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500";

function StatsCard({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail: string;
  label: string;
  tone?: "default" | "orange";
  value: string;
}) {
  return (
    <article className="rounded-[10px] border border-neutral-200 bg-[#F9F9F9] p-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-neutral-600">{label}</p>
      <p className={`mt-2 text-[24px] font-medium leading-tight ${tone === "orange" ? "text-coronados-orange" : "text-neutral-950"}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium capitalize text-neutral-500">{detail}</p>
    </article>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-bold text-neutral-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function EgresoCard({ egreso }: { egreso: CajeroEgreso }) {
  const detail = [
    egreso.beneficiario,
    egreso.comprobante,
    capitalize(egreso.metodo_pago),
  ].filter(Boolean);
  const shortDescription =
    egreso.descripcion.length > 70 ? `${egreso.descripcion.slice(0, 70)}...` : egreso.descripcion;

  return (
    <article className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E5E5E5] bg-white p-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-medium text-neutral-900">
          {egreso.concepto} - {shortDescription}
        </h3>
        <p className="mt-1 text-[12px] font-medium text-neutral-500">{detail.join(" · ")}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[18px] font-medium text-coronados-orange">{formatCurrency(egreso.monto)}</p>
        <p className="mt-1 text-[11px] font-medium text-neutral-400">{egreso.hora}</p>
      </div>
    </article>
  );
}

function EgresosSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[78px] animate-pulse rounded-[8px] border border-neutral-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-neutral-100" />
          <div className="mt-3 h-3 w-1/2 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[12px] border border-dashed border-neutral-200 bg-white p-8 text-center">
      <IconReceiptOff size={52} className="text-neutral-300" />
      <p className="mt-4 text-[16px] font-bold text-neutral-900">No hay egresos registrados hoy</p>
      <p className="mt-1 text-[13px] font-medium text-neutral-500">Registra el primer movimiento de salida de caja.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[12px] border border-red-100 bg-white p-8 text-center">
      <IconAlertCircle size={46} className="text-[#C62828]" />
      <p className="mt-3 text-[16px] font-bold text-neutral-900">Error al cargar egresos</p>
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

function formatMonth(date: Date) {
  return date.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
