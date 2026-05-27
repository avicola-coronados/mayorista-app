import { IconCheck } from "@tabler/icons-react";

export type DevolucionSuccessData = {
  kg: number;
  pesadaLabel: string;
  estadoLabel: string;
  clienteNombre: string;
  fecha: string;
};

export function DevolucionRegistradaSuccess({
  data,
  onVolver,
}: {
  data: DevolucionSuccessData;
  onVolver: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FAF1]">
        <IconCheck size={40} stroke={2.5} className="text-coronados-green" />
      </div>
      <h2 className="mt-6 text-[20px] font-medium text-neutral-950">Devolución registrada</h2>
      <p className="mt-2 text-[14px] font-medium text-neutral-500">
        − {data.kg.toFixed(1)} kg · {data.pesadaLabel}
      </p>
      <p className="mt-1 text-[13px] font-medium text-neutral-400">
        Estado: {data.estadoLabel} · {data.clienteNombre} · {data.fecha}
      </p>
      <button
        type="button"
        onClick={onVolver}
        className="mt-10 w-full rounded-[8px] bg-coronados-green px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-green-700"
      >
        Volver a clientes
      </button>
    </div>
  );
}
