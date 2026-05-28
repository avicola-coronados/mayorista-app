import { Link } from "react-router-dom";
import { IconReceiptOff } from "@tabler/icons-react";
import type { CajeroGuiaCobro, TipoPago } from "../../../services/api";
import { ClienteResumenCards } from "./ClienteResumenCards";

export function GuiasClienteView({
  clienteId,
  totalGuias,
  pagado,
  saldoPendiente,
  guias,
  onPagarGuia,
  onVerPagos,
}: {
  clienteId: number;
  totalGuias: number;
  pagado: number;
  saldoPendiente: number;
  guias: CajeroGuiaCobro[];
  onPagarGuia: (guia: CajeroGuiaCobro, tipo: TipoPago) => void;
  onVerPagos: (guia: CajeroGuiaCobro) => void;
}) {
  return (
    <div>
      <ClienteResumenCards totalGuias={totalGuias} pagado={pagado} saldoPendiente={saldoPendiente} />

      <h3 className="mb-4 text-[18px] font-medium text-neutral-950">Guías del cliente</h3>

      {guias.length === 0 ? (
        <EmptyGuias />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="border-b border-neutral-200 bg-[#F9F9F9] text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Guía</th>
                  <th className="px-4 py-3">Jornada</th>
                  <th className="px-4 py-3">Estado guía</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Cobro</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {guias.map((guia) => {
                  const puedePagar = guia.estado_cobro !== "pagado" && guia.saldo_pendiente > 0;

                  return (
                    <tr key={guia.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/cajero/clientes/${clienteId}/guias/${guia.id}`}
                          className="font-bold text-coronados-orange hover:underline"
                        >
                          {guia.numero}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-neutral-400">
                          {formatDate(guia.fecha_emision)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{guia.jornada_codigo}</td>
                      <td className="px-4 py-3">
                        <EstadoGuiaBadge abierta={guia.estado_guia === "abierta"} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(guia.monto_total)}</td>
                      <td className="px-4 py-3 text-right text-coronados-green">
                        {formatCurrency(guia.monto_pagado)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          guia.saldo_pendiente > 0 ? "text-coronados-orange" : "text-coronados-green"
                        }`}
                      >
                        {formatCurrency(guia.saldo_pendiente)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoCobroBadge estado={guia.estado_cobro} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {puedePagar ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onPagarGuia(guia, "efectivo")}
                                className="rounded-[6px] bg-coronados-green px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-green-700"
                              >
                                Efectivo
                              </button>
                              <button
                                type="button"
                                onClick={() => onPagarGuia(guia, "deposito")}
                                className="rounded-[6px] bg-[#378ADD] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-blue-600"
                              >
                                Depósito
                              </button>
                            </>
                          ) : null}
                          {guia.pagos.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => onVerPagos(guia)}
                              className="rounded-[6px] bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-200"
                            >
                              Ver pagos
                            </button>
                          ) : null}
                          {!puedePagar && guia.pagos.length === 0 ? (
                            <span className="text-[11px] text-neutral-400">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EstadoGuiaBadge({ abierta }: { abierta: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        abierta ? "bg-[#FFF4EF] text-coronados-orange" : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {abierta ? "Abierta" : "Cerrada"}
    </span>
  );
}

function EstadoCobroBadge({ estado }: { estado: CajeroGuiaCobro["estado_cobro"] }) {
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[estado]}`}>
      {labels[estado]}
    </span>
  );
}

function EmptyGuias() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[12px] border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
      <IconReceiptOff size={48} className="text-neutral-300" />
      <p className="mt-4 text-[16px] font-bold text-neutral-900">No hay guías registradas</p>
      <p className="mt-1 text-[13px] font-medium text-neutral-500">
        Las guías del operario aparecerán aquí para registrar cobros.
      </p>
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
