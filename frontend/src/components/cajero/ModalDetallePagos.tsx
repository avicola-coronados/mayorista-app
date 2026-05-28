import { IconX } from "@tabler/icons-react";
import type { CajeroGuiaCobro } from "../../services/api";

export function ModalDetallePagos({ guia, onClose }: { guia: CajeroGuiaCobro; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <section className="w-full max-w-[560px] rounded-[12px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-[18px] font-medium text-neutral-950">Pagos de {guia.numero}</h2>
            <p className="mt-1 text-[13px] font-medium text-neutral-500">Jornada {guia.jornada_codigo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Cerrar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <div className="px-6 py-5">
          {guia.pagos.length === 0 ? (
            <p className="rounded-[8px] bg-neutral-50 p-4 text-[13px] font-medium text-neutral-500">
              Esta guía no tiene pagos registrados.
            </p>
          ) : (
            <div className="grid gap-3">
              {guia.pagos.map((pago) => (
                <article key={pago.id} className="rounded-[8px] border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[14px] font-bold capitalize text-neutral-900">
                        {pago.tipo} · {pago.metodo}
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-neutral-500">{formatDate(pago.fecha)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-coronados-green">{formatCurrency(pago.monto)}</p>
                      <p className="mt-1 text-[11px] font-bold uppercase text-neutral-400">{pago.estado}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-neutral-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-neutral-300 bg-white px-5 py-2 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
          >
            Cerrar
          </button>
        </footer>
      </section>
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
    month: "2-digit",
    year: "numeric",
  });
}
