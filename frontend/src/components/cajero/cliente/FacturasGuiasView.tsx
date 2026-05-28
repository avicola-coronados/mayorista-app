import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient, type CajeroFactura, type TipoPago } from "../../../services/api";
import { ClienteResumenCards } from "./ClienteResumenCards";
import { GuiaCard } from "./GuiaCard";

type FiltroDocumento = "guias" | "facturas";

export function FacturasGuiasView({
  clienteId,
  facturado,
  pagado,
  saldoPendiente,
  facturas,
  onPagarFactura,
  puedePagarFactura,
}: {
  clienteId: number;
  facturado: number;
  pagado: number;
  saldoPendiente: number;
  facturas: CajeroFactura[];
  onPagarFactura?: (factura: CajeroFactura, tipo: TipoPago) => void;
  puedePagarFactura?: (factura: CajeroFactura) => boolean;
}) {
  const [filtro, setFiltro] = useState<FiltroDocumento>("guias");

  return (
    <div>
      <ClienteResumenCards facturado={facturado} pagado={pagado} saldoPendiente={saldoPendiente} />

      <div className="mb-5 flex gap-2">
        <FiltroPill active={filtro === "guias"} onClick={() => setFiltro("guias")}>
          Guías
        </FiltroPill>
        <FiltroPill active={filtro === "facturas"} onClick={() => setFiltro("facturas")}>
          Facturas
        </FiltroPill>
      </div>

      {filtro === "guias" ? (
        <GuiasList clienteId={clienteId} />
      ) : (
        <FacturasList
          facturas={facturas}
          onPagarFactura={onPagarFactura}
          puedePagarFactura={puedePagarFactura}
        />
      )}
    </div>
  );
}

function FiltroPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[13px] font-bold transition ${
        active ? "bg-coronados-orange text-white shadow-sm" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function GuiasList({ clienteId }: { clienteId: number }) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfiniteQuery({
    queryKey: ["cajero", "cliente-guias", clienteId],
    queryFn: ({ pageParam }) => apiClient.getClienteGuias(clienteId, { page: pageParam, limit: 15 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const guias = data?.pages.flatMap((page) => page.guias) ?? [];

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(handleObserver, { rootMargin: "120px" });

    observer.observe(node);

    return () => observer.disconnect();
  }, [handleObserver, guias.length]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <p className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-6 text-center text-[14px] text-red-700">
        No se pudieron cargar las guías.
      </p>
    );
  }

  if (guias.length === 0) {
    return (
      <p className="rounded-[12px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-[14px] font-medium text-neutral-500">
        No hay guías registradas
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {guias.map((guia) => (
        <GuiaCard key={guia.id} clienteId={clienteId} guia={guia} />
      ))}

      <div ref={loadMoreRef} className="h-4" aria-hidden />

      {isFetchingNextPage ? (
        <p className="py-2 text-center text-[13px] font-medium text-neutral-400">Cargando más guías…</p>
      ) : null}
    </div>
  );
}

function FacturasList({
  facturas,
  onPagarFactura,
  puedePagarFactura,
}: {
  facturas: CajeroFactura[];
  onPagarFactura?: (factura: CajeroFactura, tipo: TipoPago) => void;
  puedePagarFactura?: (factura: CajeroFactura) => boolean;
}) {
  if (facturas.length === 0) {
    return (
      <p className="rounded-[12px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-12 text-center text-[14px] font-medium text-neutral-500">
        No hay facturas registradas
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-neutral-200 bg-[#F9F9F9] text-[11px] font-bold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">N°</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Pagado</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3">Estado</th>
            {onPagarFactura ? <th className="px-4 py-3 text-center">Acción</th> : null}
          </tr>
        </thead>
        <tbody>
          {facturas.map((factura) => {
            const puedePagar = puedePagarFactura?.(factura) ?? false;

            return (
            <tr key={factura.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 font-semibold text-neutral-900">{factura.codigo}</td>
              <td className="px-4 py-3 text-neutral-600">{formatDate(factura.fecha_emision)}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(factura.monto_total)}</td>
              <td className="px-4 py-3 text-right text-coronados-green">{formatCurrency(factura.monto_pagado)}</td>
              <td className="px-4 py-3 text-right text-coronados-orange">{formatCurrency(factura.saldo_pendiente)}</td>
              <td className="px-4 py-3 capitalize text-neutral-600">{factura.estado.replace(/_/g, " ")}</td>
              {onPagarFactura ? (
                <td className="px-4 py-3 text-center">
                  {puedePagar ? (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onPagarFactura(factura, "efectivo")}
                        className="rounded-[6px] bg-coronados-green px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-green-700"
                      >
                        Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => onPagarFactura(factura, "deposito")}
                        className="rounded-[6px] bg-[#378ADD] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-blue-600"
                      >
                        Depósito
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium text-neutral-400">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((key) => (
        <div key={key} className="h-36 animate-pulse rounded-[12px] bg-neutral-100" />
      ))}
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

