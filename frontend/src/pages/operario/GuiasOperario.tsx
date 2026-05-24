import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { IconChevronRight, IconPlus } from "@tabler/icons-react";
import { Layout } from "../../components/Layout";
import { apiClient } from "../../services/api";
import { formatGuiaFechaTitulo, formatGuiaImporte } from "../../lib/guiaFormatters";

export function GuiasOperario() {
  const guiasQuery = useQuery({
    queryKey: ["guias-jornada"],
    queryFn: apiClient.getGuiasJornadaActual,
  });

  const data = guiasQuery.data;

  return (
    <Layout
      title="Guías del día"
      subtitle={data ? `Jornada ${data.jornada.codigo}` : "Listado de guías registradas"}
      statusBadge={data ? formatGuiaFechaTitulo(data.jornada.fecha) : undefined}
      statusTone="open"
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          to="/pesada/nueva"
          className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-coronados-green px-5 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} />
          Nueva pesada
        </Link>
      </div>

      {guiasQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-[12px] bg-white/80" />
          ))}
        </div>
      ) : guiasQuery.isError ? (
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-6 text-[14px] text-red-700">
          {(guiasQuery.error as Error).message}
        </div>
      ) : !data || data.guias.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-neutral-200 bg-white px-4 py-12 text-center">
          <p className="text-[15px] font-bold text-neutral-800">No hay guías en esta jornada</p>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">Registra la primera pesada del día.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.guias.map((guia) => (
            <article
              key={guia.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-[16px] font-bold text-neutral-950">{guia.cliente.nombre}</p>
                <p className="text-[13px] font-medium text-neutral-500">
                  {guia.numero} · {guia.lineasCount} pesada{guia.lineasCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <EstadoBadge estado={guia.estado} />
                  <p className="mt-1 text-[15px] font-bold text-coronados-green">
                    {formatGuiaImporte(guia.totalGeneral)}
                  </p>
                </div>
                {guia.estado === "borrador" ? (
                  <Link
                    to="/pesada/nueva"
                    state={{ clienteId: guia.cliente.id }}
                    className="inline-flex items-center gap-1 text-[13px] font-bold text-coronados-orange hover:underline"
                  >
                    Continuar
                    <IconChevronRight size={16} />
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </Layout>
  );
}

function EstadoBadge({ estado }: { estado: "borrador" | "cerrada" | "anulada" }) {
  if (estado === "borrador") {
    return (
      <span className="rounded-full bg-[#FFF4EF] px-2.5 py-0.5 text-[10px] font-bold uppercase text-coronados-orange">
        Abierta
      </span>
    );
  }

  if (estado === "cerrada") {
    return (
      <span className="rounded-full bg-[#E8F5EA] px-2.5 py-0.5 text-[10px] font-bold uppercase text-coronados-green">
        Cerrada
      </span>
    );
  }

  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-neutral-500">
      Anulada
    </span>
  );
}
