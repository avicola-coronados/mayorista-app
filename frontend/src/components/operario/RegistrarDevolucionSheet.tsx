import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { IconArrowBackUp, IconChevronDown, IconX } from "@tabler/icons-react";
import type { ClienteDelDia, TipoDevolucion } from "../../services/api";
import { apiClient } from "../../services/api";
import type { DevolucionSuccessData } from "./DevolucionRegistradaSuccess";

const ESTADOS: Array<{
  value: TipoDevolucion;
  label: string;
  dotClass: string;
}> = [
  { value: "muerto", label: "Muerto", dotClass: "bg-[#E24B4A]" },
  { value: "pelado", label: "Pelado", dotClass: "bg-[#BA7517]" },
  { value: "vivo", label: "Vivo", dotClass: "bg-coronados-green" },
];

function formatFechaHoy() {
  return new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function RegistrarDevolucionSheet({
  cliente,
  jornadaId,
  open,
  onClose,
  onSuccess,
}: {
  cliente: ClienteDelDia;
  jornadaId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: (data: DevolucionSuccessData) => void;
}) {
  const [kgInput, setKgInput] = useState("");
  const [estado, setEstado] = useState<TipoDevolucion | null>(null);
  const [estadoOpen, setEstadoOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const netoCliente = cliente.total_kg;
  const kg = Number(kgInput) || 0;
  const excedeNeto = kg > netoCliente + 0.001;
  const netoAjustado = round1(Math.max(netoCliente - kg, 0));
  const estadoLabel = ESTADOS.find((item) => item.value === estado)?.label ?? "";
  const canSave = kg > 0 && !excedeNeto && estado !== null;

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createDevolucionCliente({
        jornada_id: jornadaId,
        cliente_id: cliente.cliente.id!,
        tipo: estado!,
        peso_neto: kg,
      }),
    onSuccess: (devolucion) => {
      onSuccess({
        kg: devolucion.peso_neto,
        estadoLabel,
        clienteNombre: cliente.cliente.nombre,
        fecha: formatFechaHoy(),
      });
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setKgInput("");
    setEstado(null);
    setEstadoOpen(false);
    mutation.reset();
  }, [open, cliente.cliente.id]);

  useEffect(() => {
    if (!estadoOpen) {
      return;
    }

    function handleClick(event: globalThis.MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEstadoOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [estadoOpen]);

  if (!open || cliente.cliente.id == null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="devolucion-sheet-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="devolucion-sheet-title" className="text-[17px] font-medium text-neutral-950">
              Registrar devolución
            </h2>
            <p className="mt-1 text-[13px] font-medium text-neutral-500">
              {cliente.cliente.nombre} · {formatFechaHoy()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            <IconX size={20} stroke={2.2} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label htmlFor="kg-devolver" className="mb-1.5 block text-[13px] font-medium text-neutral-700">
                Kg a devolver
              </label>
              <input
                id="kg-devolver"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                placeholder="0.0"
                value={kgInput}
                onChange={(event) => setKgInput(event.target.value)}
                className="w-full rounded-[8px] border border-neutral-200 px-3 py-2.5 text-[15px] font-medium text-neutral-900 outline-none transition focus:border-coronados-orange focus:ring-1 focus:ring-coronados-orange"
              />
              <p className={`mt-1.5 text-[12px] font-medium ${excedeNeto ? "text-coronados-orange" : "text-neutral-400"}`}>
                {excedeNeto
                  ? `Supera el neto del cliente (${netoCliente.toFixed(1)} kg)`
                  : `Máx. ${netoCliente.toFixed(1)} kg`}
              </p>
            </div>

            <div ref={dropdownRef} className="relative">
              <p className="mb-1.5 text-[13px] font-medium text-neutral-700">Estado de la devolución</p>
              <button
                type="button"
                onClick={() => setEstadoOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-[8px] border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:border-neutral-300"
              >
                {estado ? (
                  <span className="flex items-center gap-2 text-[14px] font-medium text-neutral-900">
                    <span className={`h-2.5 w-2.5 rounded-full ${ESTADOS.find((e) => e.value === estado)?.dotClass}`} />
                    {estadoLabel}
                  </span>
                ) : (
                  <span className="text-[14px] font-medium text-neutral-400">Seleccionar</span>
                )}
                <IconChevronDown
                  size={18}
                  className={`text-neutral-400 transition ${estadoOpen ? "rotate-180" : ""}`}
                />
              </button>

              {estadoOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[8px] border border-neutral-200 bg-white py-1 shadow-lg">
                  {ESTADOS.map((option) => {
                    const active = estado === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setEstado(option.value);
                          setEstadoOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] transition ${
                          active
                            ? "bg-[#FFF0ED] font-medium text-[#993C1D]"
                            : "font-medium text-neutral-800 hover:bg-neutral-50"
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dotClass}`} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[10px]">
            <div className="rounded-[8px] bg-[#FFF0ED] px-3 py-3">
              <p className="text-[11px] font-medium text-neutral-600">A descontar</p>
              <p className="mt-1 text-[17px] font-bold text-coronados-orange">
                {kg > 0 ? `${kg.toFixed(1)} kg` : "— kg"}
              </p>
            </div>
            <div className="rounded-[8px] bg-[#F0FAF1] px-3 py-3">
              <p className="text-[11px] font-medium text-neutral-600">Neto ajustado</p>
              <p className="mt-1 text-[17px] font-bold text-coronados-green">
                {kg > 0 ? `${netoAjustado.toFixed(1)} kg` : `${netoCliente.toFixed(1)} kg`}
              </p>
            </div>
          </div>

          {mutation.isError ? (
            <p className="text-[13px] font-medium text-red-600">{(mutation.error as Error).message}</p>
          ) : null}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={!canSave || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="w-full rounded-[8px] px-4 py-3.5 text-[15px] font-bold text-white transition enabled:bg-coronados-orange enabled:hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-[#D3D1C7]"
            >
              {mutation.isPending ? "Guardando..." : "Guardar devolución"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="w-full rounded-[8px] border border-neutral-200 bg-transparent px-4 py-3 text-[15px] font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegistrarDevolucionButton({
  onClick,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 rounded-[7px] border border-[#F5C4B3] bg-[#FFF0ED] px-[14px] py-[7px] text-[13px] font-medium text-[#993C1D] transition hover:bg-[#FFE8E3]"
    >
      <IconArrowBackUp size={16} stroke={2.2} />
      Registrar devolución
    </button>
  );
}
