import { IconBuildingBank, IconCash } from "@tabler/icons-react";
import toast from "react-hot-toast";
import type { CajeroFactura, TipoPago } from "../../services/api";

export function CajeroRegistrarPagoBar({
  facturaPendiente,
  onRegistrar,
}: {
  facturaPendiente: CajeroFactura | undefined;
  onRegistrar: (tipo: TipoPago, factura?: CajeroFactura) => void;
}) {
  function handleClick(tipo: TipoPago) {
    if (!facturaPendiente) {
      toast.error("Este cliente no tiene facturas con saldo pendiente");
      return;
    }

    onRegistrar(tipo, facturaPendiente);
  }

  return (
    <section className="mb-6 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleClick("efectivo")}
        className={`inline-flex h-10 items-center gap-2 rounded-[8px] bg-coronados-green px-5 text-[14px] font-bold text-white transition hover:bg-green-700 ${
          !facturaPendiente ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <IconCash size={18} />
        Registrar pago en efectivo
      </button>
      <button
        type="button"
        onClick={() => handleClick("deposito")}
        className={`inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#378ADD] px-5 text-[14px] font-bold text-white transition hover:bg-blue-600 ${
          !facturaPendiente ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <IconBuildingBank size={18} />
        Registrar depósito bancario
      </button>
    </section>
  );
}
