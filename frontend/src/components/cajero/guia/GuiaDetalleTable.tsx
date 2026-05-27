import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { GuiaDetalle, GuiaDetalleLinea, GuiaDetalleTotales } from "../../../services/api";
import { apiClient } from "../../../services/api";
import { formatGuiaEntero, formatGuiaImporte, formatGuiaJabas, formatGuiaPeso } from "../../../lib/guiaFormatters";

const COLUMNS: Array<{
  key: keyof GuiaDetalleLinea | "totales";
  label: string;
  kind: "entero" | "peso" | "importe";
  editablePeladuria?: boolean;
}> = [
  { key: "nroJaba", label: "N° JABA", kind: "entero" },
  { key: "pesoBruto", label: "P. BRUTO", kind: "peso" },
  { key: "tara", label: "TARA", kind: "peso" },
  { key: "pesoNeto", label: "P. NETO", kind: "peso" },
  { key: "devolucion", label: "DEVOL.", kind: "peso" },
  { key: "netoTotal", label: "NETO TOTAL", kind: "peso" },
  { key: "importeGuia", label: "IMP. GUÍA", kind: "importe" },
  { key: "peladuria", label: "PELADURIA", kind: "importe", editablePeladuria: true },
  { key: "importeTotal", label: "IMP. TOTAL", kind: "importe" },
  { key: "saldoAnterior", label: "SALDO ANT.", kind: "importe" },
];

export function GuiaDetalleTable({
  guia,
  editable,
}: {
  guia: GuiaDetalle;
  editable: boolean;
}) {
  const queryClient = useQueryClient();

  const peladuriaMutation = useMutation({
    mutationFn: ({ lineaId, peladuria }: { lineaId: number; peladuria: number }) =>
      apiClient.updatePeladuriaLineaGuia(guia.id, lineaId, peladuria),
    onSuccess: (updated) => {
      queryClient.setQueryData(["cajero-guia-detalle", guia.id], updated);
      toast.success("Peladuría actualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
              {guia.lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-neutral-100 bg-white even:bg-neutral-50/60">
                  {COLUMNS.map((column) => {
                    if (column.editablePeladuria && editable) {
                      return (
                        <td key={column.key} className="whitespace-nowrap px-3 py-2 text-right lg:px-4">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            inputMode="decimal"
                            className="w-full min-w-[88px] rounded-[6px] border border-neutral-200 px-2 py-1.5 text-right text-[13px] font-medium tabular-nums focus:border-coronados-orange focus:outline-none focus:ring-1 focus:ring-coronados-orange"
                            defaultValue={linea.peladuria}
                            disabled={peladuriaMutation.isPending}
                            onBlur={(event) => {
                              const next = Number(event.target.value);

                              if (!Number.isFinite(next) || next < 0) {
                                toast.error("Ingresa un monto válido");
                                event.target.value = String(linea.peladuria);
                                return;
                              }

                              if (Math.abs(next - linea.peladuria) < 0.005) {
                                return;
                              }

                              peladuriaMutation.mutate({ lineaId: linea.id, peladuria: next });
                            }}
                          />
                        </td>
                      );
                    }

                    return (
                      <Cell
                        key={column.key}
                        kind={column.kind}
                        value={linea[column.key as keyof GuiaDetalleLinea] as number}
                      />
                    );
                  })}
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
    kind === "entero"
      ? formatGuiaEntero(value)
      : kind === "peso"
        ? formatGuiaPeso(value)
        : formatGuiaImporte(value);

  return (
    <td
      className={`whitespace-nowrap px-3 py-3 text-right tabular-nums lg:px-4 ${bold ? "font-bold" : "font-medium text-neutral-800"}`}
    >
      {formatted}
    </td>
  );
}
