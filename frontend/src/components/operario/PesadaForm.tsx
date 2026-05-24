import { FormEvent, useEffect, useMemo, useRef, type ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import {
  calcularPesadaPreview,
  calcularTaraTotal,
  TARA_POR_JABA_DEFAULT,
  validarPesada,
} from "../../lib/pesadaCalculos";
import { formatGuiaImporte, formatGuiaPeso } from "../../lib/guiaFormatters";
import type { OperadorGuiaLinea } from "../../services/api";

export type PesadaFormValues = {
  jabas: string;
  pesoBruto: string;
  tara: string;
  devolucion: string;
  peladuria: string;
};

export const initialPesadaForm: PesadaFormValues = {
  jabas: "5",
  pesoBruto: "",
  tara: String(calcularTaraTotal(5, TARA_POR_JABA_DEFAULT)),
  devolucion: "0",
  peladuria: "0",
};

export function lineaToFormValues(linea: OperadorGuiaLinea): PesadaFormValues {
  return {
    jabas: String(linea.nroJaba),
    pesoBruto: String(linea.pesoBruto),
    tara: String(linea.tara),
    devolucion: String(linea.devolucion),
    peladuria: String(linea.peladuria),
  };
}

export function PesadaForm({
  values,
  onChange,
  precioKg,
  editingLineaId,
  saving,
  onSubmit,
  onClear,
}: {
  values: PesadaFormValues;
  onChange: (values: PesadaFormValues) => void;
  precioKg: number;
  editingLineaId: number | null;
  saving: boolean;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const pesoBrutoRef = useRef<HTMLInputElement>(null);

  const jabas = Number(values.jabas) || 0;
  const pesoBruto = Number(values.pesoBruto) || 0;
  const tara = Number(values.tara) || 0;
  const devolucion = Number(values.devolucion) || 0;
  const peladuria = Number(values.peladuria) || 0;

  const validationErrors = useMemo(
    () => validarPesada({ jabas, pesoBruto, tara, devolucion, peladuria }),
    [jabas, pesoBruto, tara, devolucion, peladuria],
  );

  const preview = useMemo(() => {
    if (validationErrors.length > 0 || precioKg <= 0) {
      return null;
    }

    return calcularPesadaPreview({ jabas, pesoBruto, tara, devolucion, peladuria }, precioKg);
  }, [jabas, pesoBruto, tara, devolucion, peladuria, precioKg, validationErrors.length]);

  const brutoMenorIgualTara = pesoBruto > 0 && tara >= 0 && pesoBruto <= tara;
  const devolucionExcede = preview != null && devolucion > preview.pesoNeto;

  useEffect(() => {
    pesoBrutoRef.current?.focus();
  }, [editingLineaId]);

  function handleJabasChange(nextJabas: string) {
    const parsed = Number(nextJabas) || 0;

    onChange({
      ...values,
      jabas: nextJabas,
      tara: parsed > 0 ? String(calcularTaraTotal(parsed, TARA_POR_JABA_DEFAULT)) : values.tara,
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (validationErrors.length === 0) {
      onSubmit();
    }
  }

  const canSubmit = validationErrors.length === 0 && precioKg > 0 && !saving;

  return (
    <form onSubmit={handleSubmit} className="rounded-[12px] border border-neutral-200 bg-white p-5 shadow-sm lg:p-6">
      <h3 className="mb-4 text-[16px] font-bold text-neutral-950">
        {editingLineaId ? "Editar pesada" : "Nueva pesada"}
      </h3>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Field label="N° jabas" error={jabas < 1 ? "Mínimo 1 jaba" : undefined}>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className="operario-input"
            value={values.jabas}
            onChange={(event) => handleJabasChange(event.target.value)}
          />
        </Field>

        <Field label="Peso bruto (kg)" error={brutoMenorIgualTara ? "Debe ser mayor que la tara" : undefined}>
          <input
            ref={pesoBrutoRef}
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            className="operario-input"
            value={values.pesoBruto}
            onChange={(event) => onChange({ ...values, pesoBruto: event.target.value })}
            placeholder="0.0"
          />
        </Field>

        <Field label="Tara (kg)">
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            className="operario-input"
            value={values.tara}
            onChange={(event) => onChange({ ...values, tara: event.target.value })}
          />
        </Field>

        <Field label="Devolución (kg)" error={devolucionExcede ? "Supera el peso neto" : undefined}>
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            className="operario-input"
            value={values.devolucion}
            onChange={(event) => onChange({ ...values, devolucion: event.target.value })}
          />
        </Field>

        <Field label="Peladuría (S/)">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            className="operario-input"
            value={values.peladuria}
            onChange={(event) => onChange({ ...values, peladuria: event.target.value })}
          />
        </Field>
      </div>

      {preview ? (
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-[10px] bg-[#F9F9F9] p-4 lg:grid-cols-4">
          <PreviewItem label="Peso neto" value={formatGuiaPeso(preview.pesoNeto)} />
          <PreviewItem label="Neto total" value={formatGuiaPeso(preview.netoTotal)} />
          <PreviewItem label="Importe guía" value={formatGuiaImporte(preview.importeGuia)} />
          <PreviewItem label="Importe total" value={formatGuiaImporte(preview.importeTotal)} highlight />
        </div>
      ) : validationErrors.length > 0 ? (
        <p className="mt-4 text-[13px] font-semibold text-red-600">{validationErrors[0]}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 min-w-[160px] flex-1 items-center justify-center gap-2 rounded-[8px] bg-coronados-green px-6 text-[15px] font-bold text-white transition enabled:hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          {saving ? <IconLoader2 size={20} className="animate-spin" /> : null}
          {editingLineaId ? "Guardar cambios" : "Agregar pesada"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={saving}
          className="inline-flex h-12 items-center justify-center rounded-[8px] border border-neutral-200 bg-neutral-100 px-6 text-[15px] font-bold text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-50"
        >
          Limpiar formulario
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function PreviewItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-[15px] font-bold ${highlight ? "text-coronados-green" : "text-neutral-900"}`}>{value}</p>
    </div>
  );
}
