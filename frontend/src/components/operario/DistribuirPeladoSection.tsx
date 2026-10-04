import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { apiClient, type Cliente } from "../../services/api";

export function DistribuirPeladoSection({
  jornadaId,
  jornadaCerrada,
  clientes,
}: {
  jornadaId: number;
  jornadaCerrada: boolean;
  clientes: Cliente[];
}) {
  const queryClient = useQueryClient();
  const [clienteId, setClienteId] = useState(0);
  const [pesoInput, setPesoInput] = useState("");

  const peladoQuery = useQuery({
    queryKey: ["pelado-disponible", jornadaId],
    queryFn: () => apiClient.getPeladoDisponible(jornadaId),
  });
  const disponible = peladoQuery.data?.disponible_kg ?? 0;
  const pesoNeto = Number(pesoInput) || 0;

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.distribuirPelado({
        jornada_id: jornadaId,
        cliente_id: clienteId,
        peso_neto: pesoNeto,
      }),
    onSuccess: async (response) => {
      toast.success(response.mensaje);
      setClienteId(0);
      setPesoInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pelado-disponible", jornadaId] }),
        queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornadaId] }),
        queryClient.invalidateQueries({ queryKey: ["metricas", jornadaId] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clienteId) {
      toast.error("Selecciona el cliente que recibirá el pelado");
      return;
    }
    if (pesoNeto <= 0) {
      toast.error("Ingresa un peso neto mayor a cero");
      return;
    }
    if (pesoNeto > disponible + 0.001) {
      toast.error(`El peso supera los ${disponible.toFixed(2)} kg disponibles`);
      return;
    }

    mutation.mutate();
  }

  return (
    <section className="panel mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Distribuir devoluciones de pelado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Asigna el peso neto devuelto a otro cliente. Se registra con 0 jabas y 0 kg de tara.
          </p>
        </div>
        <div className="rounded-2xl bg-orange-50 px-5 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pelado disponible</p>
          <p className="mt-1 text-2xl font-bold text-coronados-orange">{disponible.toFixed(2)} kg</p>
        </div>
      </div>

      {peladoQuery.isLoading ? (
        <div className="mt-5 h-28 animate-pulse rounded-2xl bg-slate-100" />
      ) : peladoQuery.isError ? (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {(peladoQuery.error as Error).message}
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Resumen label="Devuelto pelado" value={peladoQuery.data?.total_devuelto_kg ?? 0} />
            <Resumen label="Ya distribuido" value={peladoQuery.data?.total_distribuido_kg ?? 0} />
            <Resumen label="Saldo disponible" value={disponible} highlight />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="block">
              <span className="field-label">Cliente destino</span>
              <select
                className="field-input"
                value={clienteId}
                onChange={(event) => setClienteId(Number(event.target.value))}
                disabled={mutation.isPending || jornadaCerrada || disponible <= 0}
              >
                <option value={0}>Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="field-label">Peso neto a distribuir (kg)</span>
              <input
                type="number"
                min="0.01"
                max={disponible || undefined}
                step="0.01"
                className="field-input"
                value={pesoInput}
                onChange={(event) => setPesoInput(event.target.value)}
                placeholder="0.00"
                disabled={mutation.isPending || jornadaCerrada || disponible <= 0}
              />
            </label>

            <button
              type="submit"
              disabled={
                mutation.isPending || jornadaCerrada || disponible <= 0 || !clienteId || pesoNeto <= 0
              }
              className="primary-button flex items-center justify-center gap-2 md:mb-0 md:h-[50px]"
            >
              {mutation.isPending ? <IconLoader2 size={18} className="animate-spin" /> : <IconArrowRight size={18} />}
              Asignar
            </button>
          </form>

          {(peladoQuery.data?.distribuciones.length ?? 0) > 0 ? (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800">Distribuciones realizadas</h3>
              <div className="mt-3 space-y-2">
                {peladoQuery.data?.distribuciones.map((distribucion) => (
                  <div key={distribucion.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="font-medium text-slate-700">{distribucion.cliente_nombre}</span>
                    <span className="font-bold text-coronados-green">{distribucion.peso_neto.toFixed(2)} kg neto</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function Resumen({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${highlight ? "bg-green-50" : "bg-slate-50"}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-coronados-green" : "text-slate-900"}`}>
        {value.toFixed(2)} kg
      </p>
    </div>
  );
}
