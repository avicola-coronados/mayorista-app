import { FormEvent, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowUp,
  IconBuildingBank,
  IconCash,
  IconCircleCheck,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import {
  apiClient,
  type CajeroDetalleClienteResponse,
  type CajeroFactura,
  type TipoPago,
} from "../../services/api";

const bancos = ["BCP", "Interbank", "BBVA", "Scotiabank", "BanBif", "Banco de la Nación"];

const inputClassName =
  "w-full rounded-[8px] border border-neutral-200 px-[14px] py-[11px] text-[15px] font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-coronados-orange focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500";

const montoInputClassName = `${inputClassName} text-[18px] font-bold`;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tabActivo, setTabActivo] = useState<TipoPago>(tabInicial);
  const saldoPendiente = factura.saldo_pendiente;

  const [montoRecibido, setMontoRecibido] = useState("");
  const [observacionesEfectivo, setObservacionesEfectivo] = useState("");
  const [montoDeposito, setMontoDeposito] = useState("");
  const [banco, setBanco] = useState("");
  const [nroOperacion, setNroOperacion] = useState("");
  const [horaDeposito, setHoraDeposito] = useState("");
  const [fechaDeposito, setFechaDeposito] = useState(getTodayISODate());
  const [observacionesDeposito, setObservacionesDeposito] = useState("");

  const montoRecibidoNum = parseAmount(montoRecibido);
  const montoDepositoNum = parseAmount(montoDeposito);
  const vuelto = useMemo(() => {
    if (!Number.isFinite(montoRecibidoNum) || montoRecibidoNum <= saldoPendiente) {
      return 0;
    }

    return Number((montoRecibidoNum - saldoPendiente).toFixed(2));
  }, [montoRecibidoNum, saldoPendiente]);

  const puedeRegistrarEfectivo =
    Number.isFinite(montoRecibidoNum) && montoRecibidoNum > 0;

  const puedeEnviarDeposito =
    Number.isFinite(montoDepositoNum) &&
    montoDepositoNum > 0 &&
    Boolean(banco) &&
    nroOperacion.trim().length > 0 &&
    Boolean(fechaDeposito);

  const registrarPagoMutation = useMutation({
    mutationFn: () => apiClient.registrarPagoCajero(buildPayload()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cajero-detalle-cliente", cliente.id] }),
        queryClient.invalidateQueries({ queryKey: ["cajero-clientes"] }),
      ]);

      if (tabActivo === "efectivo") {
        const montoAplicado = Math.min(montoRecibidoNum, saldoPendiente);
        showToastVerde(`Pago de S/ ${montoAplicado.toFixed(2)} registrado correctamente`);
      } else {
        showToastAmarillo(
          "Depósito enviado a validación. Se aplicará al saldo una vez confirmado por oficina.",
        );
      }

      onSuccess();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isPending = registrarPagoMutation.isPending;

  function buildPayload() {
    if (tabActivo === "efectivo") {
      const montoAplicado = Math.min(montoRecibidoNum, saldoPendiente);

      return {
        factura_id: factura.id,
        cliente_id: cliente.id,
        metodo: "efectivo",
        monto: montoAplicado,
        observaciones: observacionesEfectivo.trim() || null,
        tipo: "efectivo" as const,
      };
    }

    return {
      banco,
      factura_id: factura.id,
      cliente_id: cliente.id,
      fecha_deposito: fechaDeposito,
      hora_deposito: horaDeposito || null,
      metodo: "deposito",
      monto: montoDepositoNum,
      nro_operacion: nroOperacion.trim(),
      observaciones: observacionesDeposito.trim() || null,
      tipo: "deposito" as const,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tabActivo === "efectivo" && !puedeRegistrarEfectivo) {
      return;
    }

    if (tabActivo === "deposito" && !puedeEnviarDeposito) {
      return;
    }

    registrarPagoMutation.mutate();
  }

  function handleClose() {
    if (!isPending) {
      onClose();
    }
  }

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4">
      <section
        className="flex max-h-[90vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-registrar-pago-title"
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-neutral-200 bg-white px-5 pt-5">
          <div className="flex items-center justify-between gap-3 pb-4">
            <h2 id="modal-registrar-pago-title" className="text-[20px] font-medium text-neutral-950">
              Registrar pago
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cerrar modal"
            >
              <IconX size={20} stroke={2.2} />
            </button>
          </div>

          <div className="flex gap-0 border-b border-neutral-200">
            <TabButton
              active={tabActivo === "efectivo"}
              icon={<IconCash size={18} />}
              onClick={() => setTabActivo("efectivo")}
            >
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
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tabActivo === "efectivo" ? (
              <div className="space-y-4">
                <AlertBox variant="green" icon={<IconCircleCheck size={20} className="shrink-0 text-coronados-green" />}>
                  El pago en efectivo se registra de forma inmediata y actualiza el saldo del cliente al
                  instante.
                </AlertBox>

                <div className="rounded-[8px] bg-neutral-100 px-[14px] py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-neutral-500">
                      Saldo pendiente de {cliente.nombre}
                    </p>
                    <p className="text-[16px] font-bold text-coronados-orange">
                      {formatCurrency(saldoPendiente)}
                    </p>
                  </div>
                </div>

                <Field label="Monto recibido (S/)" htmlFor="monto-recibido">
                  <input
                    id="monto-recibido"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={montoRecibido}
                    onChange={(event) => setMontoRecibido(event.target.value)}
                    className={montoInputClassName}
                    placeholder="0.00"
                    required
                    disabled={isPending}
                  />
                </Field>

                {vuelto > 0 ? (
                  <div className="rounded-[8px] border border-[#A8D9AD] bg-[#F0FAF1] px-[14px] py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-coronados-green">
                        <IconArrowBackUp size={18} stroke={2.2} />
                        Vuelto a entregar
                      </span>
                      <span className="text-[16px] font-bold text-coronados-green">
                        S/ {vuelto.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <Field label="Observaciones (opcional)" htmlFor="observaciones-efectivo">
                  <textarea
                    id="observaciones-efectivo"
                    rows={3}
                    value={observacionesEfectivo}
                    onChange={(event) => setObservacionesEfectivo(event.target.value)}
                    className={`${inputClassName} min-h-[72px] resize-y`}
                    placeholder="Ej: Pago parcial, cliente pagó con billete de 200..."
                    disabled={isPending}
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-4">
                <AlertBox
                  variant="yellow"
                  icon={<IconAlertTriangle size={20} className="shrink-0 text-[#B08000]" />}
                >
                  Los depósitos bancarios quedan pendientes de validación por el área de oficina antes de
                  aplicarse al saldo.
                </AlertBox>

                <Field label="Monto depositado (S/)" htmlFor="monto-deposito">
                  <input
                    id="monto-deposito"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={montoDeposito}
                    onChange={(event) => setMontoDeposito(event.target.value)}
                    className={montoInputClassName}
                    placeholder="0.00"
                    required
                    disabled={isPending}
                  />
                </Field>

                <Field label="Banco" htmlFor="banco">
                  <select
                    id="banco"
                    value={banco}
                    onChange={(event) => setBanco(event.target.value)}
                    className={`${inputClassName} appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    }}
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

                <div className="grid grid-cols-2 gap-3">
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
                    className={`${inputClassName} min-h-[72px] resize-y`}
                    placeholder="Ej: Depósito realizado por el mismo cliente..."
                    disabled={isPending}
                  />
                </Field>
              </div>
            )}
          </div>

          <footer className="sticky bottom-0 z-20 flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={scrollToTop}
              disabled={isPending}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Ir al inicio del formulario"
            >
              <IconArrowUp size={18} stroke={2.2} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 rounded-[8px] border border-neutral-200 bg-white px-4 py-2.5 text-[14px] font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                isPending || (tabActivo === "efectivo" ? !puedeRegistrarEfectivo : !puedeEnviarDeposito)
              }
              className={`flex-[1.4] rounded-[8px] px-4 py-2.5 text-[14px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                tabActivo === "efectivo"
                  ? "bg-coronados-green hover:bg-green-700"
                  : "bg-coronados-orange hover:bg-orange-700"
              }`}
            >
              {isPending
                ? "Procesando..."
                : tabActivo === "efectivo"
                  ? "Registrar pago"
                  : "Enviar a validación"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AlertBox({
  children,
  icon,
  variant,
}: {
  children: ReactNode;
  icon: ReactNode;
  variant: "green" | "yellow";
}) {
  const styles =
    variant === "green"
      ? "border-[#A8D9AD] bg-[#F0FAF1] text-[#1A5C22]"
      : "border-[#F5DFA0] bg-[#FFFBEA] text-[#7A5C00]";

  return (
    <div className={`flex gap-3 rounded-[8px] border p-3 text-[13px] font-medium leading-snug ${styles}`}>
      {icon}
      <p>{children}</p>
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
      className={`inline-flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-[14px] font-bold transition ${
        active
          ? "border-coronados-orange text-coronados-orange"
          : "border-transparent text-neutral-500 hover:text-neutral-700"
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
    <div className="mb-4 last:mb-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function showToastVerde(message: string) {
  toast.custom(
    (t) => (
      <div
        className="max-w-sm rounded-[8px] border border-coronados-green bg-[#F0FAF1] px-4 py-3 text-[14px] font-medium text-[#1A5C22] shadow-lg"
      >
        {message}
      </div>
    ),
    { duration: 4000, position: "bottom-right" },
  );
}

function showToastAmarillo(message: string) {
  toast.custom(
    (t) => (
      <div
        className="max-w-sm rounded-[8px] border border-[#F5DFA0] bg-[#FFFBEA] px-4 py-3 text-[14px] font-medium text-[#7A5C00] shadow-lg"
      >
        {message}
      </div>
    ),
    { duration: 4000, position: "bottom-right" },
  );
}

function parseAmount(value: string) {
  return Number.parseFloat(value);
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
