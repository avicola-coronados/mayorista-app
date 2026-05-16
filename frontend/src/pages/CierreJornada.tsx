import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Layout } from "../components/Layout";
import { apiClient } from "../services/api";

export function CierreJornada() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [desperdicio, setDesperdicio] = useState("0");
  const [muertero, setMuertero] = useState("0");

  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const metricasQuery = useQuery({
    queryKey: ["metricas", jornadaQuery.data?.id],
    queryFn: () => apiClient.getMetricas(jornadaQuery.data!.id),
    enabled: Boolean(jornadaQuery.data?.id),
  });

  const jornada = jornadaQuery.data;
  const metricas = metricasQuery.data;
  const desperdicioKg = Number(desperdicio) || 0;
  const muerteroKg = Number(muertero) || 0;

  const merma = useMemo(() => {
    if (!metricas) {
      return 0;
    }

    return Number(
      (
        metricas.entrada_total_kg -
        metricas.vendido_total_kg +
        metricas.devoluciones_total_kg -
        desperdicioKg -
        muerteroKg
      ).toFixed(2),
    );
  }, [desperdicioKg, metricas, muerteroKg]);

  const mermaPorcentaje = useMemo(() => {
    if (!metricas?.entrada_total_kg) {
      return 0;
    }

    return Number(((merma / metricas.entrada_total_kg) * 100).toFixed(2));
  }, [merma, metricas?.entrada_total_kg]);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.cerrarJornada(jornada!.id, {
        desperdicio_kg: desperdicioKg,
        muertero_kg: muerteroKg,
      }),
    onSuccess: async (data) => {
      toast.success(`Jornada cerrada. Merma ${data.merma_kg.toFixed(2)} kg`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jornada-activa"] }),
        queryClient.invalidateQueries({ queryKey: ["metricas", jornada?.id] }),
      ]);
      navigate("/");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (jornadaQuery.isLoading || metricasQuery.isLoading) {
    return (
      <Layout title="Cerrar jornada" subtitle="Calculando resumen del día">
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="panel h-[24rem] animate-pulse bg-slate-100" />
          <div className="panel h-[24rem] animate-pulse bg-slate-100" />
        </div>
      </Layout>
    );
  }

  if (jornadaQuery.isError || metricasQuery.isError || !jornada || !metricas) {
    return (
      <Layout title="Cerrar jornada" subtitle="No se pudo preparar el cierre">
        <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
          {(jornadaQuery.error as Error)?.message ||
            (metricasQuery.error as Error)?.message ||
            "No se pudo cargar la información necesaria para cerrar la jornada"}
        </div>
      </Layout>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!jornada || !metricas) {
      toast.error("No se pudo cargar la jornada");
      return;
    }

    if (jornada.estado === "cerrada") {
      toast.error("La jornada ya está cerrada");
      return;
    }

    if (desperdicioKg < 0 || muerteroKg < 0) {
      toast.error("Desperdicio y muertero deben ser positivos");
      return;
    }

    if (desperdicioKg + muerteroKg > metricas.entrada_total_kg) {
      toast.error("Desperdicio y muertero no pueden exceder la entrada total");
      return;
    }

    if (mermaPorcentaje > 2 && desperdicioKg + muerteroKg === 0) {
      const highMermaConfirmed = window.confirm("El piso disponible es alto. ¿Estás seguro de cerrar sin desperdicio ni muertero?");

      if (!highMermaConfirmed) {
        return;
      }
    }

    const confirmed = window.confirm("¿Confirmas el cierre de la jornada actual?");

    if (!confirmed) {
      return;
    }

    mutation.mutate();
  }

  return (
    <Layout title="Cerrar jornada" subtitle="Consolida merma, desperdicio y muertero del día">
      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Resumen del día</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label="Total entrada" value={`${(metricas?.entrada_total_kg ?? 0).toFixed(2)} kg`} />
            <SummaryRow label="Total vendido" value={`${(metricas?.vendido_total_kg ?? 0).toFixed(2)} kg`} />
            <SummaryRow
              label="Total devoluciones"
              value={`${(metricas?.devoluciones_total_kg ?? 0).toFixed(2)} kg`}
            />
            <SummaryRow label="Piso disponible inicial" value={`${(metricas?.piso_disponible_kg ?? 0).toFixed(2)} kg`} />
          </div>

          <div className="mt-6">
            <label htmlFor="desperdicio" className="field-label">
              Desperdicio (kg)
            </label>
            <input
              id="desperdicio"
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={desperdicio}
              onChange={(event) => setDesperdicio(event.target.value)}
            />
          </div>

          <div className="mt-5">
            <label htmlFor="muertero" className="field-label">
              Muertero (kg)
            </label>
            <input
              id="muertero"
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={muertero}
              onChange={(event) => setMuertero(event.target.value)}
            />
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Merma calculada
            </p>
            <div className="mt-4 rounded-[2rem] bg-slate-950 px-6 py-7 text-white">
              <p className="text-sm text-slate-400">Merma total</p>
              <p className="mt-2 text-5xl font-bold">{merma.toFixed(2)} kg</p>
              <p className="mt-4 text-sm text-slate-300">Porcentaje de merma</p>
              <p className="mt-2 text-2xl font-semibold text-orange-300">{mermaPorcentaje.toFixed(2)}%</p>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Fórmula aplicada: entrada total - vendido + devoluciones - desperdicio - muertero.
            </p>

            <button
              type="submit"
              className="primary-button mt-5 w-full"
              disabled={mutation.isPending || jornada?.estado === "cerrada"}
            >
              {jornada?.estado === "cerrada"
                ? "Jornada cerrada"
                : mutation.isPending
                  ? "Cerrando..."
                  : "Cerrar jornada"}
            </button>
          </div>
        </section>
      </form>
    </Layout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}
