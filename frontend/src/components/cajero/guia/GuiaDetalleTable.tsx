import type { GuiaDetalle, GuiaDetalleLinea, GuiaDetalleTotales } from "../../../services/api";
import { formatGuiaEntero, formatGuiaImporte, formatGuiaJabas, formatGuiaPeso } from "../../../lib/guiaFormatters";

const COLUMNS: Array<{ key: keyof GuiaDetalleLinea | "totales"; label: string; kind: "entero" | "peso" | "importe" }> = [
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

export function GuiaDetalleTable({ guia }: { guia: GuiaDetalle }) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto lg:overflow-x-visible">
        <div className="max-h-[min(70vh,640px)] overflow-y-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[13px] lg:min-w-full">
          <thead className="sticky top-0 z-10 bg-[#1E5DA8] text-[11px] font-bold uppercase tracking-wide text-white">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-3 py-3 text-right first:text-center lg:px-4"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guia.lineas.map((linea, index) => (
              <tr key={index} className="border-b border-neutral-100 bg-white even:bg-neutral-50/60">
                {COLUMNS.map((column) => (
                  <Cell key={column.key} kind={column.kind} value={linea[column.key as keyof GuiaDetalleLinea]} />
                ))}
              </tr>
            ))}
            <TotalsRow totales={guia.totales} totalGeneral={guia.totalGeneral} />
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TotalsRow({ totales, totalGeneral }: { totales: GuiaDetalleTotales; totalGeneral: number }) {
  return (
    <tr className="bg-coronados-green/15 font-bold text-[#1B5E2E]">
      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums lg:px-4">
        <span className="mr-2 text-[10px] uppercase tracking-wide text-[#1B5E2E]/80">Totales</span>
        {formatGuiaJabas(totales.jabas)}
      </td>
      <Cell kind="peso" value={totales.pesoBruto} bold />
      <Cell kind="peso" value={totales.tara} bold />
      <Cell kind="peso" value={totales.pesoNeto} bold />
      <Cell kind="peso" value={totales.devolucion} bold />
      <Cell kind="peso" value={totales.netoTotal} bold />
      <Cell kind="importe" value={totales.importeGuia} bold />
      <Cell kind="importe" value={totales.peladuria} bold />
      <Cell kind="importe" value={totales.importeTotal} bold />
      <Cell kind="importe" value={totalGeneral} bold />
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
