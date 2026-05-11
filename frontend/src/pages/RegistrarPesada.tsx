import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../components/Layout";
import { apiClient } from "../services/api";

const DEFAULT_TARA_POR_JABA = 5.8;

type FormState = {
  cliente_id: number;
  granja_id: number;
  origen: "partida" | "piso";
  jabas: string;
  tara_por_jaba: string;
  peso_bruto: string;
};

const initialState: FormState = {
  cliente_id: 0,
  granja_id: 0,
  origen: "partida",
  jabas: "",
  tara_por_jaba: DEFAULT_TARA_POR_JABA.toString(),
  peso_bruto: "",
};

export function RegistrarPesada() {
  const queryClient = useQueryClient();
  const [clienteSearch, setClienteSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialState);

  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: apiClient.getClientes,
  });

  const granjasQuery = useQuery({
    queryKey: ["granjas"],
    queryFn: apiClient.getGranjas,
  });

  const selectedCliente = clientesQuery.data?.find((cliente) => cliente.id === form.cliente_id);
  const jabas = Number(form.jabas) || 0;
  const taraPorJaba = Number(form.tara_por_jaba) || 0;
  const pesoBruto = Number(form.peso_bruto) || 0;
  const taraTotal = useMemo(() => Number((jabas * taraPorJaba).toFixed(2)), [jabas, taraPorJaba]);
  const pesoNeto = useMemo(() => Number((pesoBruto - taraTotal).toFixed(2)), [pesoBruto, taraTotal]);
  const jornada = jornadaQuery.data;

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createLineaVenta({
        jornada_id: jornada!.id,
        cliente_id: form.cliente_id,
        granja_id: form.granja_id,
        origen: form.origen,
        jabas,
        peso_bruto: pesoBruto,
        tara_por_jaba: taraPorJaba,
      }),
    onSuccess: async () => {
      toast.success("Pesada guardada correctamente");
      setForm(initialState);
      setClienteSearch("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["metricas", jornada?.id] }),
        queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornada?.id] }),
      ]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (jornadaQuery.isLoading || clientesQuery.isLoading || granjasQuery.isLoading) {
    return (
      <Layout title="Registrar pesada" subtitle="Cargando catálogos del día">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="panel h-[26rem] animate-pulse bg-slate-100" />
          <div className="panel h-[26rem] animate-pulse bg-slate-100" />
        </div>
      </Layout>
    );
  }

  if (jornadaQuery.isError || clientesQuery.isError || granjasQuery.isError) {
    return (
      <Layout title="Registrar pesada" subtitle="No se pudo preparar el formulario">
        <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
          {(jornadaQuery.error as Error)?.message ||
            (clientesQuery.error as Error)?.message ||
            (granjasQuery.error as Error)?.message ||
            "Ocurrió un error al cargar los datos"}
        </div>
      </Layout>
    );
  }

  function handleClienteChange(value: string) {
    setClienteSearch(value);
    const matched = clientesQuery.data?.find(
      (cliente) => cliente.nombre.toLowerCase() === value.trim().toLowerCase(),
    );

    setForm((current) => ({
      ...current,
      cliente_id: matched?.id ?? 0,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!jornada) {
      toast.error("No se encontró una jornada activa");
      return;
    }

    if (jornada.estado === "cerrada") {
      toast.error("La jornada ya está cerrada");
      return;
    }

    if (!form.cliente_id) {
      toast.error("Selecciona un cliente válido");
      return;
    }

    if (!form.granja_id) {
      toast.error("Selecciona una granja");
      return;
    }

    if (jabas <= 0 || taraPorJaba <= 0 || pesoBruto <= 0) {
      toast.error("Ingresa valores positivos para jabas, tara y peso bruto");
      return;
    }

    if (pesoNeto <= 0) {
      toast.error("El peso neto debe ser mayor a cero");
      return;
    }

    mutation.mutate();
  }

  return (
    <Layout
      title="Registrar pesada"
      subtitle={selectedCliente ? `Cliente seleccionado: ${selectedCliente.nombre}` : "Registra una venta del día"}
    >
      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-5 sm:p-6">
          <div>
            <label htmlFor="cliente" className="field-label">
              Cliente
            </label>
            <input
              id="cliente"
              list="clientes-list"
              className="field-input"
              placeholder="Escribe para buscar cliente"
              value={clienteSearch}
              onChange={(event) => handleClienteChange(event.target.value)}
            />
            <datalist id="clientes-list">
              {clientesQuery.data?.map((cliente) => (
                <option key={cliente.id} value={cliente.nombre} />
              ))}
            </datalist>
          </div>

          <div className="mt-5">
            <label htmlFor="granja" className="field-label">
              Granja
            </label>
            <select
              id="granja"
              className="field-input"
              value={form.granja_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, granja_id: Number(event.target.value) }))
              }
            >
              <option value={0}>Selecciona una granja</option>
              {granjasQuery.data?.filter((granja) => granja.activo).map((granja) => (
                <option key={granja.id} value={granja.id}>
                  {granja.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <span className="field-label">Origen</span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "partida", label: "Partida" },
                { value: "piso", label: "Piso" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 text-center font-semibold transition ${
                    form.origen === option.value
                      ? "border-coronados-orange bg-orange-50 text-coronados-orange"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="origen"
                    checked={form.origen === option.value}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        origen: option.value as "partida" | "piso",
                      }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="jabas" className="field-label">
                Jabas
              </label>
              <input
                id="jabas"
                type="number"
                min="1"
                step="1"
                className="field-input"
                placeholder="0"
                value={form.jabas}
                onChange={(event) =>
                  setForm((current) => ({ ...current, jabas: event.target.value }))
                }
              />
            </div>

            <div>
              <label htmlFor="tara_por_jaba" className="field-label">
                Tara por jaba (kg)
              </label>
              <input
                id="tara_por_jaba"
                type="number"
                min="0.1"
                step="0.1"
                className="field-input"
                value={form.tara_por_jaba}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tara_por_jaba: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="peso_bruto" className="field-label">
              Peso bruto (kg)
            </label>
            <input
              id="peso_bruto"
              type="number"
              min="0.1"
              step="0.01"
              className="field-input"
              placeholder="0.00"
              value={form.peso_bruto}
              onChange={(event) =>
                setForm((current) => ({ ...current, peso_bruto: event.target.value }))
              }
            />
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Cálculo en vivo
            </p>
            <div className="mt-4 rounded-3xl bg-orange-50 p-5">
              <p className="text-sm text-slate-500">Tara total</p>
              <p className="mt-2 text-4xl font-bold text-coronados-orange">
                {taraTotal.toFixed(2)} kg
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {jabas} jabas × {taraPorJaba.toFixed(2)} kg/jaba
              </p>
            </div>

            <div className="mt-4 rounded-3xl bg-green-50 p-5">
              <p className="text-sm text-slate-500">Peso neto</p>
              <p
                className={`mt-2 text-4xl font-bold ${
                  pesoNeto > 0 ? "text-coronados-green" : "text-red-600"
                }`}
              >
                {pesoNeto.toFixed(2)} kg
              </p>
              <p className="mt-2 text-sm text-slate-500">Peso bruto - tara total</p>
            </div>

            <button
              type="submit"
              className="primary-button mt-5 w-full"
              disabled={mutation.isPending || jornada?.estado === "cerrada"}
            >
              {mutation.isPending ? "Guardando..." : "Guardar pesada"}
            </button>
          </div>

          <div className="panel border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Regla crítica</p>
            <p className="mt-2">
              La tara por jaba es editable. Si cambias jabas o tara por jaba, el sistema recalcula
              la tara total y el peso neto antes de guardar.
            </p>
          </div>
        </section>
      </form>
    </Layout>
  );
}
