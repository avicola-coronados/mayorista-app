import { IconChevronRight, IconLock } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import type { CajeroGuiaListItem } from "../../../services/api";

export function GuiaCard({ clienteId, guia }: { clienteId: number; guia: CajeroGuiaListItem }) {
  const isCerrada = guia.estado === "cerrada";

  return (
    <Link
      to={`/cajero/clientes/${clienteId}/guias/${guia.id}`}
      className="group block rounded-[12px] border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-coronados-orange/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[16px] font-bold text-neutral-950">{formatDate(guia.fecha)}</p>
            <EstadoGuiaBadge cerrada={isCerrada} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">
            {guia.numeroJabas} jabas · {formatKg(guia.pesoBrutoTotal)} bruto
          </p>
          {guia.numero ? (
            <p className="mt-0.5 text-[12px] font-medium text-neutral-400">{guia.numero}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Neto total</p>
            <p className="text-[20px] font-bold text-coronados-green">{formatCurrency(guia.netoTotal)}</p>
          </div>
          <IconChevronRight
            size={20}
            className="text-neutral-300 transition group-hover:text-coronados-orange"
            stroke={2.2}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-4">
        <DesgloseItem label="Devolución" value={formatKg(guia.devolucion)} />
        <DesgloseItem label="Neto" value={formatKg(guia.neto)} />
        <DesgloseItem label="Imp. guía" value={formatCurrency(guia.importeGuia)} />
        <DesgloseItem label="Peladuría" value={formatCurrency(guia.peladuria)} />
      </div>
    </Link>
  );
}

function EstadoGuiaBadge({ cerrada }: { cerrada: boolean }) {
  if (cerrada) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-neutral-600">
        <IconLock size={12} stroke={2.2} />
        Cerrada
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#FFF4EF] px-2.5 py-0.5 text-[10px] font-bold uppercase text-coronados-orange">
      Abierta
    </span>
  );
}

function DesgloseItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#F9F9F9] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-neutral-800">{value}</p>
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

function formatKg(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value)} kg`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
