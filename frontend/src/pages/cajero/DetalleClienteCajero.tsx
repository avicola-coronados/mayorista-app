import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  IconAlertCircle,
  IconBuildingBank,
  IconCash,
  IconChevronRight,
  IconId,
  IconPrinter,
  IconPhone,
  IconReceiptOff,
  IconUser,
} from "@tabler/icons-react";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import { ModalDetallePagos } from "../../components/cajero/ModalDetallePagos";
import { ModalPago } from "../../components/cajero/ModalPago";
import { apiClient, type CajeroFactura, type TipoPago } from "../../services/api";

export function DetalleClienteCajero() {
  const navigate = useNavigate();
  const { id } = useParams();
  const clienteId = Number(id);
  const [modalPago, setModalPago] = useState<{ factura: CajeroFactura; tipo: TipoPago } | null>(null);
  const [facturaPagos, setFacturaPagos] = useState<CajeroFactura | null>(null);

  const detalleQuery = useQuery({
    queryKey: ["cajero-detalle-cliente", clienteId],
    queryFn: () => apiClient.getDetalleClienteCajero(clienteId),
    enabled: Number.isInteger(clienteId) && clienteId > 0,
    staleTime: 30000,
  });

  const primeraFacturaPendiente = useMemo(
    () => detalleQuery.data?.facturas.find((factura) => factura.saldo_pendiente > 0),
    [detalleQuery.data?.facturas],
  );
  const cliente = detalleQuery.data?.cliente;
  const resumen = detalleQuery.data?.resumen;
  const facturas = detalleQuery.data?.facturas ?? [];

  function openPago(tipo: TipoPago, factura?: CajeroFactura) {
    const target = factura ?? primeraFacturaPendiente;

    if (!target) {
      return;
    }

    setModalPago({ factura: target, tipo });
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
            <section className="mb-6 rounded-[12px] border border-neutral-200 bg-[#F9F9F9] p-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[24px] font-medium leading-tight text-neutral-950">{cliente.nombre}</h2>
                    <TipoBadge tipo={cliente.tipo} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-neutral-600">
                    <MetaItem icon={<IconId size={17} />} text={formatDocumento(cliente)} />
                    {cliente.contacto ? <MetaItem icon={<IconUser size={17} />} text={cliente.contacto} /> : null}
                    {cliente.telefono ? <MetaItem icon={<IconPhone size={17} />} text={cliente.telefono} /> : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-neutral-200 pt-5 max-md:grid-cols-1">
                <ResumenItem label="Total facturado" value={formatCurrency(resumen.total_facturado)} />
                <ResumenItem label="Total pagado" value={formatCurrency(resumen.total_pagado)} tone="green" />
                <ResumenItem label="Saldo pendiente" value={formatCurrency(resumen.saldo_pendiente)} tone="orange" />
              </div>
            </section>

            <section className="mb-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openPago("efectivo")}
                disabled={!primeraFacturaPendiente}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-coronados-green px-5 text-[14px] font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconCash size={18} />
                Registrar pago en efectivo
              </button>
              <button
                type="button"
                onClick={() => openPago("deposito")}
                disabled={!primeraFacturaPendiente}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#378ADD] px-5 text-[14px] font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconBuildingBank size={18} />
                Registrar depósito bancario
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#E5E5E5] bg-white px-5 text-[14px] font-bold text-neutral-600 transition hover:bg-neutral-50"
              >
                <IconPrinter size={18} />
                Imprimir estado de cuenta
              </button>
            </section>

            <section>
              <h3 className="mb-4 text-[18px] font-medium text-neutral-950">Facturas y guías</h3>

              {facturas.length === 0 ? (
                <EmptyFacturas />
              ) : (
                <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse">
                      <thead className="bg-[#F9F9F9]">
                        <tr className="border-b border-neutral-200">
                          <Th>Fecha jornada</Th>
                          <Th>Documento</Th>
                          <Th align="right">Monto total</Th>
                          <Th align="right">Pagado</Th>
                          <Th align="right">Saldo</Th>
                          <Th align="center">Estado</Th>
                          <Th align="center">Acción</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturas.map((factura) => (
                          <tr key={factura.id} className="border-b border-neutral-100 transition last:border-b-0 hover:bg-neutral-50">
                            <Td>{formatDate(factura.jornada_fecha || factura.fecha_emision)}</Td>
                            <Td>
                              <p className="text-[14px] font-bold text-neutral-900">{factura.codigo}</p>
                              <p className="mt-1 text-[11px] font-medium text-neutral-400">
                                Jornada {factura.jornada_codigo}
                              </p>
                            </Td>
                            <Td align="right" strong>
                              {formatCurrency(factura.monto_total)}
                            </Td>
                            <Td align="right" className={factura.monto_pagado > 0 ? "text-coronados-green" : "text-neutral-500"}>
                              {formatCurrency(factura.monto_pagado)}
                            </Td>
                            <Td
                              align="right"
                              strong
                              className={factura.saldo_pendiente > 0 ? "text-coronados-orange" : "text-coronados-green"}
                            >
                              {formatCurrency(factura.saldo_pendiente)}
                            </Td>
                            <Td align="center">
                              <EstadoBadge estado={factura.estado} />
                            </Td>
                            <Td align="center">
                              {factura.estado !== "pagado" && factura.estado !== "anulado" ? (
                                <button
                                  type="button"
                                  onClick={() => openPago("efectivo", factura)}
                                  className="rounded-[6px] bg-coronados-green px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-green-700"
                                >
                                  {factura.estado === "pago_parcial" ? "Pagar saldo" : "Pagar"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setFacturaPagos(factura)}
                                  className="rounded-[6px] bg-neutral-100 px-3 py-1.5 text-[12px] font-bold text-neutral-600 transition hover:bg-neutral-200"
                                >
                                  Ver pago
                                </button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {modalPago && cliente ? (
        <ModalPago
          cliente={cliente}
          factura={modalPago.factura}
          onClose={() => setModalPago(null)}
          onSuccess={() => setModalPago(null)}
          tabInicial={modalPago.tipo}
        />
      ) : null}

      {facturaPagos ? (
        <ModalDetallePagos factura={facturaPagos} onClose={() => setFacturaPagos(null)} />
      ) : null}
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

function ResumenItem({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "green" | "orange";
  value: string;
}) {
  const color =
    tone === "green" ? "text-coronados-green" : tone === "orange" ? "text-coronados-orange" : "text-neutral-950";

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-400">{label}</p>
      <p className={`mt-1 text-[20px] font-medium ${color}`}>{value}</p>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: "mayorista" | "minorista" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
        tipo === "mayorista" ? "bg-[#E6F1FB] text-[#0C447C]" : "bg-[#FAEEDA] text-[#633806]"
      }`}
    >
      {tipo}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: CajeroFactura["estado"] }) {
  const styles = {
    anulado: "bg-neutral-100 text-neutral-500",
    pagado: "bg-[#EAF3DE] text-[#3B6D11]",
    pago_parcial: "bg-[#FFE5CC] text-[#C45500]",
    pendiente: "bg-[#FFF9E6] text-[#92400E]",
  };
  const labels = {
    anulado: "Anulado",
    pagado: "Pagado",
    pago_parcial: "Pago parcial",
    pendiente: "Pendiente",
  };

  return (
    <span className={`inline-flex rounded-full px-[10px] py-1 text-[11px] font-bold ${styles[estado]}`}>
      {labels[estado]}
    </span>
  );
}

function Th({
  align = "left",
  children,
}: {
  align?: "left" | "center" | "right";
  children: ReactNode;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th className={`px-4 py-3 ${alignClass} text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-500`}>
      {children}
    </th>
  );
}

function Td({
  align = "left",
  children,
  className = "",
  strong = false,
}: {
  align?: "left" | "center" | "right";
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <td className={`px-4 py-3 ${alignClass} text-[13px] ${strong ? "font-bold" : "font-medium"} ${className}`}>
      {children}
    </td>
  );
}

function DetalleSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-[184px] animate-pulse rounded-[12px] bg-white" />
      <div className="h-10 w-[520px] animate-pulse rounded-[8px] bg-white" />
      <div className="h-[320px] animate-pulse rounded-[12px] bg-white" />
    </div>
  );
}

function EmptyFacturas() {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[12px] border border-dashed border-neutral-200 bg-white p-8 text-center">
      <IconReceiptOff size={52} className="text-neutral-300" />
      <p className="mt-4 text-[16px] font-bold text-neutral-900">No hay facturas registradas</p>
      <p className="mt-1 text-[13px] font-medium text-neutral-500">Este cliente no tiene documentos de pago.</p>
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

function formatDocumento(cliente: {
  documento_tipo: string | null;
  documento_num: string | null;
}) {
  if (!cliente.documento_tipo && !cliente.documento_num) {
    return "Sin documento";
  }

  if (!cliente.documento_num) {
    return cliente.documento_tipo ?? "Sin documento";
  }

  return `${cliente.documento_tipo ?? "Doc."}: ${cliente.documento_num}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    currency: "PEN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
