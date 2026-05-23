import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconCash,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import {
  apiClient,
  type CajeroDetalleClienteResponse,
  type CajeroFactura,
  type TipoPago,
} from "../../services/api";

const metodosEfectivo = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transferencia", label: "Transferencia" },
];

const bancos = [
  "BCP",
  "BBVA",
  "Interbank",
  "Scotiabank",
  "Banco de la Nación",
  "Banco Pichincha",
  "Otro",
];

export function ModalPago({
  cliente,
  factura,
  onClose,
  onSuccess,
  tabInicial,
}: {
  cliente: CajeroDetalleClienteResponse["cliente"];
  factura: CajeroFactura;
  onClose: () => void;
  onSuccess: () => void;
  tabInicial: TipoPago;
}) {
  const queryClient = useQueryClient();
  const [tabActivo, setTabActivo] = useState<TipoPago>(tabInicial);
  const [montoEfectivo, setMontoEfectivo] = useState(formatAmountInput(factura.saldo_pendiente));
  const [metodoEfectivo, setMetodoEfectivo] = useState("efectivo");
  const [observacionesEfectivo, setObservacionesEfectivo] = useState("");
  const [montoDeposito, setMontoDeposito] = useState(formatAmountInput(factura.saldo_pendiente));
  const [banco, setBanco] = useState("");
  const [nroOperacion, setNroOperacion] = useState("");
  const [horaDeposito, setHoraDeposito] = useState("");
  const [fechaDeposito, setFechaDeposito] = useState(getTodayISODate());
  const [observacionesDeposito, setObservacionesDeposito] = useState("");

  const registrarPagoMutation = useMutation({
    mutationFn: () => apiClient.registrarPagoCajero(buildPayload()),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cajero-detalle-cliente", cliente.id] }),
        queryClient.invalidateQueries({ queryKey: ["cajero-clientes"] }),
      ]);
      onSuccess();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isPending = registrarPagoMutation.isPending;

  function buildPayload() {
    if (tabActivo === "efectivo") {
      return {
        factura_id: factura.id,
        cliente_id: cliente.id,
        metodo: metodoEfectivo,
        monto: parseAmount(montoEfectivo),
        observaciones: observacionesEfectivo.trim() || null,
        tipo: "efectivo" as const,
      };
    }

    return {
      banco,
      factura_id: factura.id,
      cliente_id: cliente.id,
      fecha_deposito: fechaDeposito,
      hora_deposito: horaDeposito,
      metodo: "deposito",
      monto: parseAmount(montoDeposito),
      nro_operacion: nroOperacion.trim(),
      observaciones: observacionesDeposito.trim() || null,
      tipo: "deposito" as const,
    };
  }

  function validateForm() {
    const monto = tabActivo === "efectivo" ? parseAmount(montoEfectivo) : parseAmount(montoDeposito);

    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error("Ingresa un monto válido");
      return false;
    }

    if (monto > factura.saldo_pendiente) {
      toast.error("El monto no puede exceder el saldo pendiente");
      return false;
    }

    if (tabActivo === "deposito") {
      if (!banco) {
        toast.error("Selecciona un banco");
        return false;
      }

      if (!nroOperacion.trim()) {
        toast.error("Ingresa el número de operación");
        return false;
      }

      if (!horaDeposito) {
        toast.error("Ingresa la hora del depósito");
        return false;
      }

      if (!fechaDeposito) {
        toast.error("Ingresa la fecha del depósito");
        return false;
      }

      if (fechaDeposito > getTodayISODate()) {
        toast.error("La fecha del depósito no puede ser futura");
        return false;
      }
    }

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    registrarPagoMutation.mutate();
  }

  function handleClose() {
    if (!isPending) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-[600px] items-center justify-center bg-black/50 p-8"
      onMouseDown={handleClose}
    >
      <section
        className="w-full max-w-[550px] rounded-[12px] bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-5">
          <h2 className="text-[18px] font-medium text-neutral-950">Registrar pago</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <IconX size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[72vh] overflow-y-auto px-6 py-4">
            <InfoBox label="Cliente" value={cliente.nombre} />
            <InfoBox
              label="Factura"
              value={`${factura.codigo} - Jornada ${formatDate(factura.jornada_fecha || factura.fecha_emision)}`}
            />
            <InfoBox
              accent="orange"
              label="Saldo pendiente"
              value={formatCurrency(factura.saldo_pendiente)}
            />

            <div className="mb-6 flex gap-2 border-b border-[#E5E5E5]">
              <TabButton active={tabActivo === "efectivo"} icon={<IconCash size={18} />} onClick={() => setTabActivo("efectivo")}>
                Efectivo
              </TabButton>
              <TabButton
                active={tabActivo === "deposito"}
                icon={<IconBuildingBank size={18} />}
                onClick={() => setTabActivo("deposito")}
              >
                Depósito bancario
              </TabButton>
            </div>

            {tabActivo === "efectivo" ? (
              <div className="grid gap-4">
                <Field label="Monto a pagar (S/)" htmlFor="monto-efectivo">
                  <input
                    id="monto-efectivo"
                    type="number"
                    min="0.01"
                    max={factura.saldo_pendiente}
                    step="0.01"
                    value={montoEfectivo}
                    onChange={(event) => setMontoEfectivo(event.target.value)}
                    className={inputClassName}
                    required
                    disabled={isPending}
                  />
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                    <IconInfoCircle size={14} />
                    Puedes ingresar un monto menor para pago parcial
                  </p>
                </Field>

                <Field label="Método de pago" htmlFor="metodo-efectivo">
                  <select
                    id="metodo-efectivo"
                    value={metodoEfectivo}
                    onChange={(event) => setMetodoEfectivo(event.target.value)}
                    className={inputClassName}
                    required
                    disabled={isPending}
                  >
                    {metodosEfectivo.map((metodo) => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Observaciones (opcional)" htmlFor="observaciones-efectivo">
                  <textarea
                    id="observaciones-efectivo"
                    rows={3}
                    value={observacionesEfectivo}
                    onChange={(event) => setObservacionesEfectivo(event.target.value)}
                    className={inputClassName}
                    placeholder="Ej: Cliente pagó con billetes de S/ 100..."
                    disabled={isPending}
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex gap-3 rounded-[8px] border border-[#FFE599] bg-[#FFF9E6] p-3 text-[13px] font-medium text-[#92400E]">
                  <IconAlertTriangle size={20} className="shrink-0 text-[#F59E0B]" />
                  <p>Los depósitos bancarios quedan pendientes de validación por el administrador</p>
                </div>

                <Field label="Monto depositado (S/)" htmlFor="monto-deposito">
                  <input
                    id="monto-deposito"
                    type="number"
                    min="0.01"
                    max={factura.saldo_pendiente}
                    step="0.01"
                    value={montoDeposito}
                    onChange={(event) => setMontoDeposito(event.target.value)}
                    className={inputClassName}
                    required
                    disabled={isPending}
                  />
                </Field>

                <Field label="Banco" htmlFor="banco">
                  <select
                    id="banco"
                    value={banco}
                    onChange={(event) => setBanco(event.target.value)}
                    className={inputClassName}
                    required
                    disabled={isPending}
                  >
                    <option value="">Seleccionar banco...</option>
                    {bancos.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <Field label="N° de operación" htmlFor="nro-operacion">
                    <input
                      id="nro-operacion"
                      type="text"
                      value={nroOperacion}
                      onChange={(event) => setNroOperacion(event.target.value)}
                      className={inputClassName}
                      placeholder="Ej: 123456789"
                      required
                      disabled={isPending}
                    />
                  </Field>

                  <Field label="Hora del depósito" htmlFor="hora-deposito">
                    <input
                      id="hora-deposito"
                      type="time"
                      value={horaDeposito}
                      onChange={(event) => setHoraDeposito(event.target.value)}
                      className={inputClassName}
                      required
                      disabled={isPending}
                    />
                  </Field>
                </div>

                <Field label="Fecha del depósito" htmlFor="fecha-deposito">
                  <input
                    id="fecha-deposito"
                    type="date"
                    max={getTodayISODate()}
                    value={fechaDeposito}
                    onChange={(event) => setFechaDeposito(event.target.value)}
                    className={inputClassName}
                    required
                    disabled={isPending}
                  />
                </Field>

                <Field label="Observaciones (opcional)" htmlFor="observaciones-deposito">
                  <textarea
                    id="observaciones-deposito"
                    rows={3}
                    value={observacionesDeposito}
                    onChange={(event) => setObservacionesDeposito(event.target.value)}
                    className={inputClassName}
                    placeholder="Ej: Depósito realizado por el mismo cliente..."
                    disabled={isPending}
                  />
                </Field>
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#E5E5E5] px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-[6px] border border-[#E5E5E5] bg-white px-5 py-2.5 text-[14px] font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[6px] bg-coronados-green px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Registrando..." : "Registrar pago"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

const inputClassName =
  "w-full rounded-[6px] border border-[#E5E5E5] px-3 py-2.5 text-[14px] font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500";

function InfoBox({
  accent = "blue",
  label,
  value,
}: {
  accent?: "blue" | "orange";
  label: string;
  value: string;
}) {
  return (
    <div
      className={`mb-3 rounded-[6px] border-l-[3px] bg-[#F9F9F9] p-3 ${
        accent === "orange" ? "border-l-coronados-orange" : "border-l-[#378ADD]"
      }`}
    >
      <p className="mb-1 text-[12px] font-medium text-neutral-500">{label}</p>
      <p className={`text-[16px] font-medium ${accent === "orange" ? "text-coronados-orange" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-6 py-3 text-[14px] font-bold transition ${
        active
          ? "border-coronados-orange text-coronados-orange"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-bold text-neutral-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function parseAmount(value: string) {
  return Number.parseFloat(value);
}

function formatAmountInput(value: number) {
  return value.toFixed(2);
}

function getTodayISODate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
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
