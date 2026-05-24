import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconChevronLeft } from "@tabler/icons-react";
import type { TipoCliente } from "../../../services/api";

export function ClienteDetalleHeader({
  nombre,
  tipo,
  backTo = "/cajero/clientes",
}: {
  nombre: string;
  tipo: TipoCliente;
  backTo?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <Link
        to={backTo}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-coronados-orange hover:text-coronados-orange"
        aria-label="Volver a clientes"
      >
        <IconChevronLeft size={20} stroke={2.2} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <h2 className="truncate text-[24px] font-medium leading-tight text-neutral-950">{nombre}</h2>
        <TipoClienteBadge tipo={tipo} />
      </div>
    </div>
  );
}

export function TipoClienteBadge({ tipo }: { tipo: TipoCliente }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
        tipo === "mayorista" ? "bg-[#E6F1FB] text-[#0C447C]" : "bg-[#FAEEDA] text-[#633806]"
      }`}
    >
      {tipo}
    </span>
  );
}

export function ClienteMetaRow({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-neutral-600">{children}</div>;
}
