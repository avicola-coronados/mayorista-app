import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IconAlertCircle, IconChevronRight, IconId, IconPhone, IconPrinter, IconUser } from "@tabler/icons-react";
import { CajeroRegistrarPagoBar } from "../../components/cajero/CajeroRegistrarPagoBar";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import { ModalDetallePagos } from "../../components/cajero/ModalDetallePagos";
import { ModalPago } from "../../components/cajero/ModalPago";
import { ClienteDetalleHeader, ClienteMetaRow } from "../../components/cajero/cliente/ClienteDetalleHeader";
import { GuiasClienteView } from "../../components/cajero/cliente/GuiasClienteView";
import { apiClient, type CajeroGuiaCobro, type TipoPago } from "../../services/api";

export function DetalleClienteCajero() {
  const navigate = useNavigate();
  const { id } = useParams();
  const clienteId = Number(id);
  const [modalPago, setModalPago] = useState<{ guia: CajeroGuiaCobro; tipo: TipoPago } | null>(null);
  const [guiaPagos, setGuiaPagos] = useState<CajeroGuiaCobro | null>(null);

  const detalleQuery = useQuery({
    queryKey: ["cajero-detalle-cliente", clienteId],
    queryFn: () => apiClient.getDetalleClienteCajero(clienteId),
    enabled: Number.isInteger(clienteId) && clienteId > 0,
    staleTime: 30000,
  });

  const primeraGuiaPendiente = useMemo(
    () => detalleQuery.data?.guias.find((guia) => guia.saldo_pendiente > 0),
    [detalleQuery.data?.guias],
  );
  const cliente = detalleQuery.data?.cliente;
  const resumen = detalleQuery.data?.resumen;
  const guias = detalleQuery.data?.guias ?? [];

  function openPago(tipo: TipoPago, guia?: CajeroGuiaCobro) {
    const target = guia ?? primeraGuiaPendiente;

    if (!target) {
      return;
    }

    setModalPago({ guia: target, tipo });
  }

  return (
    <CajeroShell
      title="Detalle de Cuenta"
      subtitle={
        <div className="flex items-center gap-1 text-[13px] font-medium opacity-85">
          <Link to="/cajero/clientes" className="hover:underline">
            Clientes
          </Link>
          <IconChevronRight size={14} stroke={2.2} />
          <span>Cuenta de cliente</span>
        </div>
      }
    >
      <div className="p-[30px]">
        {detalleQuery.isLoading ? (
          <DetalleSkeleton />
        ) : detalleQuery.isError ? (
          <ErrorState
            message={(detalleQuery.error as Error)?.message ?? "Error al cargar detalle"}
            onBack={() => navigate("/cajero/clientes")}
            onRetry={() => detalleQuery.refetch()}
          />
        ) : !cliente || !resumen ? (
          <ErrorState
            message="Cliente no encontrado"
            onBack={() => navigate("/cajero/clientes")}
            onRetry={() => detalleQuery.refetch()}
          />
        ) : (
          <>
            <ClienteDetalleHeader nombre={cliente.nombre} tipo={cliente.tipo} />

            <ClienteMetaRow>
              <MetaItem icon={<IconId size={17} />} text={formatDocumento(cliente)} />
              {cliente.contacto ? <MetaItem icon={<IconUser size={17} />} text={cliente.contacto} /> : null}
              {cliente.telefono ? <MetaItem icon={<IconPhone size={17} />} text={cliente.telefono} /> : null}
            </ClienteMetaRow>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <CajeroRegistrarPagoBar guiaPendiente={primeraGuiaPendiente} onRegistrar={openPago} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#E5E5E5] bg-white px-5 text-[14px] font-bold text-neutral-600 transition hover:bg-neutral-50"
              >
                <IconPrinter size={18} />
                Imprimir estado de cuenta
              </button>
            </div>

            <GuiasClienteView
              clienteId={cliente.id}
              totalGuias={resumen.total_guias}
              pagado={resumen.total_pagado}
              saldoPendiente={resumen.saldo_pendiente}
              guias={guias}
              onPagarGuia={(guia, tipo) => openPago(tipo, guia)}
              onVerPagos={setGuiaPagos}
            />
          </>
        )}
      </div>

      {modalPago && cliente ? (
        <ModalPago
          cliente={cliente}
          guia={modalPago.guia}
          onClose={() => setModalPago(null)}
          onSuccess={() => setModalPago(null)}
          tabInicial={modalPago.tipo}
        />
      ) : null}

      {guiaPagos ? <ModalDetallePagos guia={guiaPagos} onClose={() => setGuiaPagos(null)} /> : null}
    </CajeroShell>
  );
}

function MetaItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

function DetalleSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-12 w-2/3 animate-pulse rounded-[8px] bg-neutral-100" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-[8px] bg-neutral-100" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-[12px] bg-neutral-100" />
        ))}
      </div>
      <div className="h-[280px] animate-pulse rounded-[12px] bg-neutral-100" />
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

function formatDocumento(cliente: { documento_tipo: string | null; documento_num: string | null }) {
  if (!cliente.documento_tipo && !cliente.documento_num) {
    return "Sin documento";
  }

  if (!cliente.documento_num) {
    return cliente.documento_tipo ?? "Sin documento";
  }

  return `${cliente.documento_tipo ?? "Doc."}: ${cliente.documento_num}`;
}
