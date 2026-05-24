import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import type { OperadorGuia, OperadorGuiaLinea } from "../../services/api";
import { formatGuiaEntero, formatGuiaImporte, formatGuiaPeso } from "../../lib/guiaFormatters";

const COLUMNS: Array<{ key: keyof OperadorGuiaLinea; label: string; kind: "entero" | "peso" | "importe" }> = [
  { key: "nroJaba", label: "N° JABA", kind: "entero" },
  { key: "pesoBruto", label: "P. BRUTO", kind: "peso" },
  { key: "tara", label: "TARA", kind: "peso" },
  { key: "pesoNeto", label: "P. NETO", kind: "peso" },
  { key: "devolucion", label: "DEVOL.", kind: "peso" },
  { key: "netoTotal", label: "NETO TOTAL", kind: "peso" },
  { key: "importeGuia", label: "IMP. GUÍA", kind: "importe" },
  { key: "peladuria", label: "PELADURIA", kind: "importe" },
  { key: "importeTotal", label: "IMP. TOTAL", kind: "importe" },
  { key: "saldoAnterior", label: "SALDO ANT.", kind: "importe" },
];

export function OperarioGuiaLineasTable({
  guia,
  editingLineaId,
  deletingLineaId,
  onEdit,
  onDelete,
}: {
  guia: OperadorGuia;
  editingLineaId: number | null;
  deletingLineaId: number | null;
  onEdit: (linea: OperadorGuiaLinea) => void;
  onDelete: (linea: OperadorGuiaLinea) => void;
}) {
  if (guia.lineas.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-12 text-center">
        <p className="text-[14px] font-semibold text-neutral-500">Aún no hay pesadas en esta guía</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-3">
        <h3 className="text-[16px] font-bold text-neutral-950">Pesadas registradas ({guia.lineas.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="max-h-[min(50vh,480px)] overflow-y-auto">
          <table className="w-full min-w-[1180px] border-collapse text-[13px] lg:min-w-full">
            <thead className="sticky top-0 z-10 bg-[#1E5DA8] text-[11px] font-bold uppercase tracking-wide text-white">
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-3 py-3 text-right first:text-center lg:px-4">
                    {column.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-3 text-center lg:px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {guia.lineas.map((linea) => {
                const isEditing = editingLineaId === linea.id;

                return (
                  <tr
                    key={linea.id}
                    className={`border-b border-neutral-100 ${isEditing ? "bg-orange-50" : "bg-white even:bg-neutral-50/60"}`}
                  >
                    {COLUMNS.map((column) => (
                      <Cell key={column.key} kind={column.kind} value={linea[column.key] as number} />
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-center lg:px-4">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(linea)}
                          disabled={!guia.editable || deletingLineaId != null}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-neutral-600 transition enabled:hover:bg-neutral-100 disabled:opacity-40"
                          aria-label="Editar pesada"
                        >
                          <IconEdit size={18} stroke={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(linea)}
                          disabled={!guia.editable || deletingLineaId != null}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-40"
                          aria-label="Eliminar pesada"
                        >
                          {deletingLineaId === linea.id ? (
                            <IconLoader2 size={18} className="animate-spin" />
                          ) : (
                            <IconTrash size={18} stroke={2} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <TotalsRow guia={guia} />
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TotalsRow({ guia }: { guia: OperadorGuia }) {
  const { totales, totalGeneral } = guia;

  return (
    <tr className="bg-coronados-green/15 font-bold text-[#1B5E2E]">
      <td className="px-3 py-3 text-right tabular-nums lg:px-4">{formatGuiaEntero(totales.jabas)}</td>
      <Cell kind="peso" value={totales.pesoBruto} bold />
      <Cell kind="peso" value={totales.tara} bold />
      <Cell kind="peso" value={totales.pesoNeto} bold />
      <Cell kind="peso" value={totales.devolucion} bold />
      <Cell kind="peso" value={totales.netoTotal} bold />
      <Cell kind="importe" value={totales.importeGuia} bold />
      <Cell kind="importe" value={totales.peladuria} bold />
      <Cell kind="importe" value={totales.importeTotal} bold />
      <Cell kind="importe" value={totalGeneral} bold />
      <td />
    </tr>
  );
}

function Cell({
  kind,
  value,
  bold = false,
}: {
  kind: "entero" | "peso" | "importe";
  value: number;
  bold?: boolean;
}) {
  const formatted =
    kind === "entero" ? formatGuiaEntero(value) : kind === "peso" ? formatGuiaPeso(value) : formatGuiaImporte(value);

  return (
    <td
      className={`whitespace-nowrap px-3 py-3 text-right tabular-nums lg:px-4 ${bold ? "font-bold" : "font-medium text-neutral-800"}`}
    >
      {formatted}
    </td>
  );
}
