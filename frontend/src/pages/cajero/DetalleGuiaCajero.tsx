import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconFileTypePdf,
  IconPrinter,
} from "@tabler/icons-react";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import { GuiaDetalleTable } from "../../components/cajero/guia/GuiaDetalleTable";
import { apiClient } from "../../services/api";
import type { ReactNode } from "react";
import { formatGuiaFechaTitulo, formatGuiaJabas, formatGuiaPeso } from "../../lib/guiaFormatters";

export function DetalleGuiaCajero() {
  const navigate = useNavigate();
  const { id: clienteIdParam, guiaId: guiaIdParam } = useParams();
  const clienteId = Number(clienteIdParam);
  const guiaId = Number(guiaIdParam);

  const guiaQuery = useQuery({
    queryKey: ["cajero-guia-detalle", guiaId],
    queryFn: () => apiClient.getGuiaDetalle(guiaId),
    enabled: Number.isInteger(guiaId) && guiaId > 0,
  });

  const guia = guiaQuery.data;
  const isAbierta = guia?.estado === "abierta";
  const backUrl =
    guia?.cliente.id != null
      ? `/cajero/clientes/${guia.cliente.id}`
      : clienteId > 0
        ? `/cajero/clientes/${clienteId}`
        : "/cajero/clientes";

  return (
    <CajeroShell
      title="Detalle de guía"
      subtitle={
        <div className="flex items-center gap-1 text-[13px] font-medium opacity-85">
          <Link to="/cajero/clientes" className="hover:underline">
            Clientes
          </Link>
          <IconChevronRight size={14} stroke={2.2} />
          {guia ? (
            <>
              <Link to={backUrl} className="hover:underline">
                {guia.cliente.nombre}
              </Link>
              <IconChevronRight size={14} stroke={2.2} />
              <span>Guía</span>
            </>
          ) : (
            <span>Guía</span>
          )}
        </div>
      }
    >
      <div className="p-[30px] print:p-4">
        {guiaQuery.isLoading ? (
          <DetalleSkeleton />
        ) : guiaQuery.isError || !guia ? (
          <ErrorState
            message={(guiaQuery.error as Error)?.message ?? "Guía no encontrada"}
            onBack={() => navigate(backUrl)}
            onRetry={() => guiaQuery.refetch()}
          />
        ) : (
          <div className="print:text-black">
            <header className="mb-6">
              <div className="flex flex-wrap items-start gap-4">
                <Link
                  to={backUrl}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-coronados-orange hover:text-coronados-orange print:hidden"
                  aria-label="Volver"
                >
                  <IconChevronLeft size={20} stroke={2.2} />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[24px] font-bold leading-tight text-neutral-950">
                      Guía {formatGuiaFechaTitulo(guia.fecha)}
                    </h2>
                    <EstadoGuiaBadge abierta={isAbierta} />
                  </div>
                  <p className="mt-1 text-[15px] font-medium text-neutral-600">{guia.cliente.nombre}</p>
                  {guia.numero ? (
                    <p className="mt-0.5 text-[12px] font-medium text-neutral-400">{guia.numero}</p>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ResumenCard label="Jabas" value={formatGuiaJabas(guia.totales.jabas)} isCount />
              <ResumenCard label="Peso bruto" value={formatGuiaPeso(guia.totales.pesoBruto)} />
              <ResumenCard label="Devolución" value={formatGuiaPeso(guia.totales.devolucion)} />
              <ResumenCard label="Neto total" value={formatGuiaPeso(guia.totales.netoTotal)} highlight="green" />
              <ResumenCard label="Precio del día" value={`S/ ${(guia.lineas[0]?.precioKg ?? 5).toFixed(2)}/kg`} />
            </div>

            <GuiaDetalleTable guia={guia} editable={isAbierta} />

            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
              <ActionButton
                icon={<IconPrinter size={18} />}
                label="Imprimir guía"
                disabled={isAbierta}
                onClick={() => window.print()}
              />
              <ActionButton
                icon={<IconFileTypePdf size={18} />}
                label="Exportar PDF"
                disabled={isAbierta}
                onClick={() => window.print()}
              />
            </div>

            {isAbierta ? (
              <p className="mt-3 text-[12px] font-medium text-neutral-500 print:hidden">
                La guía debe estar cerrada para imprimir o exportar.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </CajeroShell>
  );
}

function EstadoGuiaBadge({ abierta }: { abierta: boolean }) {
  if (abierta) {
    return (
      <span className="rounded-full bg-[#FFF4EF] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coronados-orange">
        Abierta
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#E8F5EA] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coronados-green">
      Cerrada
    </span>
  );
}

function ResumenCard({
  label,
  value,
  highlight,
  isCount,
}: {
  label: string;
  value: string;
  highlight?: "green";
  isCount?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p
        className={`mt-2 text-[20px] font-bold leading-tight ${
          highlight === "green" ? "text-coronados-green" : "text-neutral-950"
        }`}
      >
        {value}
        {isCount && value !== "—" ? (
          <span className="ml-1 text-[14px] font-semibold text-neutral-500">jabas</span>
        ) : null}
      </p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-neutral-200 bg-white px-5 text-[14px] font-bold text-neutral-700 transition enabled:hover:border-coronados-orange enabled:hover:text-coronados-orange disabled:cursor-not-allowed disabled:border-neutral-100 disabled:bg-neutral-50 disabled:text-neutral-300"
    >
      {icon}
      {label}
    </button>
  );
}

function DetalleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-2/3 animate-pulse rounded-[8px] bg-neutral-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-[12px] bg-neutral-100" />
        ))}
      </div>
      <div className="h-[360px] animate-pulse rounded-[12px] bg-neutral-100" />
    </div>
  );
}

function ErrorState({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[12px] border border-red-100 bg-white p-8 text-center">
      <IconAlertCircle size={48} className="text-[#C62828]" />
      <p className="mt-3 text-[16px] font-bold text-neutral-900">{message}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-[8px] border border-neutral-300 bg-white px-5 py-2 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[8px] bg-coronados-green px-5 py-2 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
