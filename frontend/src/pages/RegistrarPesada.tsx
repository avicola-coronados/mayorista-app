import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../components/Layout";
import { apiClient } from "../services/api";

const DEFAULT_TARA_POR_JABA = 5.8;

type ModoPesada = "ingreso" | "partida";
type DestinoIngreso = "cliente" | "piso";

type FormState = {
  cliente_id: number;
  granja_id: number;
  jabas: string;
  tara_por_jaba: string;
  peso_bruto: string;
};

const initialState: FormState = {
  cliente_id: 0,
  granja_id: 0,
  jabas: "5",
  tara_por_jaba: DEFAULT_TARA_POR_JABA.toString(),
  peso_bruto: "",
};

export function RegistrarPesada({ modo }: { modo: ModoPesada }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialState);
  const [destinoIngreso, setDestinoIngreso] = useState<DestinoIngreso>("cliente");
  const [newClienteName, setNewClienteName] = useState("");
  const [showNewCliente, setShowNewCliente] = useState(false);
  const esPartida = modo === "partida";
  const requiereCliente = esPartida || destinoIngreso === "cliente";

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
  const pisoGranja = granjasQuery.data?.find(
    (granja) => granja.activo && granja.nombre.trim().toLowerCase() === "piso",
  );
  const granjasDisponibles = useMemo(
    () =>
      granjasQuery.data
        ?.filter((granja) => granja.activo)
        .filter((granja) => granja.nombre.trim().toLowerCase() !== "piso") ?? [],
    [granjasQuery.data],
  );
  const jabas = Number(form.jabas) || 0;
  const taraPorJaba = Number(form.tara_por_jaba) || 0;
  const pesoBruto = Number(form.peso_bruto) || 0;
  const taraTotal = useMemo(() => Number((jabas * taraPorJaba).toFixed(2)), [jabas, taraPorJaba]);
  const pesoNeto = useMemo(() => Number((pesoBruto - taraTotal).toFixed(2)), [pesoBruto, taraTotal]);
  const jornada = jornadaQuery.data;
  const pisoQuery = useQuery({
    queryKey: ["sobrante", jornada?.id],
    queryFn: () => apiClient.getSobrante(jornada!.id),
    enabled: esPartida && Boolean(jornada?.id),
  });
  const pisoDisponible = pisoQuery.data?.[0];
  const origen = !esPartida && destinoIngreso === "piso" ? "piso" : "partida";
  const granjaId = esPartida ? (pisoGranja?.id ?? 0) : form.granja_id;
  const clienteId = requiereCliente ? form.cliente_id || null : null;

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createLineaVenta({
        jornada_id: jornada!.id,
        cliente_id: clienteId,
        granja_id: granjaId,
        origen,
        jabas,
        peso_bruto: pesoBruto,
        tara_por_jaba: taraPorJaba,
      }),
    onSuccess: async () => {
      toast.success(esPartida ? "Partida guardada correctamente" : "Ingreso guardado correctamente");
      setForm(initialState);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["metricas", jornada?.id] }),
        queryClient.invalidateQueries({ queryKey: ["lineas-venta", jornada?.id] }),
        queryClient.invalidateQueries({ queryKey: ["sobrante", jornada?.id] }),
      ]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createClienteMutation = useMutation({
    mutationFn: () =>
      apiClient.createCliente({
        nombre: newClienteName.trim(),
        codigo: null,
        telefono: null,
        direccion: null,
      }),
    onSuccess: async (cliente) => {
      toast.success(`Cliente '${cliente.nombre}' creado`);
      setShowNewCliente(false);
      setNewClienteName("");
      setForm((current) => ({ ...current, cliente_id: cliente.id }));
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (jornadaQuery.isLoading || granjasQuery.isLoading || clientesQuery.isLoading) {
    return (
      <Layout title={esPartida ? "Registrar partida" : "Registrar ingreso"} subtitle="Cargando catálogos del día">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="panel h-[26rem] animate-pulse bg-slate-100" />
          <div className="panel h-[26rem] animate-pulse bg-slate-100" />
        </div>
      </Layout>
    );
  }

  if (jornadaQuery.isError || granjasQuery.isError || clientesQuery.isError) {
    return (
      <Layout title={esPartida ? "Registrar partida" : "Registrar ingreso"} subtitle="No se pudo preparar el formulario">
        <div className="panel border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-800">
          {(jornadaQuery.error as Error)?.message ||
            (clientesQuery.error as Error)?.message ||
            (granjasQuery.error as Error)?.message ||
            "Ocurrió un error al cargar los datos"}
        </div>
      </Layout>
    );
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

    if (requiereCliente && !form.cliente_id) {
      toast.error("Selecciona un cliente válido");
      return;
    }

    if (esPartida && !pisoGranja) {
      toast.error("No se encontró la granja Piso");
      return;
    }

    if (!esPartida && !form.granja_id) {
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

    if (esPartida && pesoNeto > (pisoDisponible?.peso_neto ?? 0)) {
      toast.error(`No hay suficiente mercadería en piso. Disponible: ${(pisoDisponible?.peso_neto ?? 0).toFixed(2)} kg`);
      return;
    }

    mutation.mutate();
  }

  function handleCreateCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newClienteName.trim().length < 2) {
      toast.error("El nombre del cliente debe tener al menos 2 caracteres");
      return;
    }

    createClienteMutation.mutate();
  }

  return (
    <Layout
      title={esPartida ? "Registrar partida" : "Registrar ingreso"}
      subtitle={
        esPartida
          ? "Asigna mercadería disponible en piso a un cliente"
          : selectedCliente
            ? `Cliente seleccionado: ${selectedCliente.nombre}`
            : destinoIngreso === "piso"
              ? "Registra mercadería sin cliente en piso"
              : "Registra un ingreso directo para un cliente"
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-5 sm:p-6">
          {esPartida && pisoQuery.isLoading ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-600">
              Consultando mercadería disponible en piso…
            </p>
          ) : esPartida && pisoDisponible ? (
            <p className="rounded-2xl bg-green-50 px-4 py-3 text-[13px] font-medium text-green-800">
              Disponible en piso: {pisoDisponible.peso_neto.toFixed(2)} kg · {pisoDisponible.jabas} jabas estimadas
            </p>
          ) : esPartida ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900">
              No hay mercadería disponible en piso.
            </p>
          ) : null}

          <div>
            <div className="mb-2 mt-5 flex items-center justify-between gap-3">
              <label htmlFor="cliente" className="field-label mb-0">
                Cliente
              </label>
              <button
                type="button"
                onClick={() => setShowNewCliente(true)}
                className="rounded-[8px] bg-coronados-green px-3 py-2 text-[12px] font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!esPartida && destinoIngreso === "piso"}
              >
                Nuevo cliente
              </button>
            </div>
            <select
              id="cliente"
              className="field-input"
              value={form.cliente_id}
              disabled={!esPartida && destinoIngreso === "piso"}
              onChange={(event) =>
                setForm((current) => ({ ...current, cliente_id: Number(event.target.value) }))
              }
            >
              <option value={0}>Selecciona un cliente existente</option>
              {clientesQuery.data?.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>

            {!esPartida ? (
              <div className="mt-3">
                <button
                  type="button"
                  className={`w-full rounded-[8px] border px-4 py-3 text-[14px] font-bold transition ${
                    destinoIngreso === "piso"
                      ? "border-coronados-green bg-green-50 text-coronados-green"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  aria-pressed={destinoIngreso === "piso"}
                  onClick={() => {
                    setDestinoIngreso((current) => (current === "piso" ? "cliente" : "piso"));
                    setForm((current) => ({ ...current, cliente_id: 0 }));
                  }}
                >
                  Piso
                </button>
                {destinoIngreso === "piso" ? (
                  <p className="mt-2 text-[12px] font-medium text-coronados-green">
                    El ingreso se guardará en piso sin cliente asignado.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            {esPartida ? (
              <div>
                <p className="field-label">Origen</p>
                <div className="field-input flex items-center bg-slate-50 font-semibold text-slate-700">Piso</div>
              </div>
            ) : (
              <div>
                <label htmlFor="granja" className="field-label">
                  Granja de origen
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
                  {granjasDisponibles.map((granja) => (
                    <option key={granja.id} value={granja.id}>
                      {granja.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              disabled={
                mutation.isPending ||
                jornada?.estado === "cerrada" ||
                (esPartida && (!pisoDisponible || pisoDisponible.peso_neto <= 0))
              }
            >
              {mutation.isPending ? "Guardando..." : esPartida ? "Guardar partida" : "Guardar ingreso"}
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

      {showNewCliente ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-slate-950">Nuevo cliente</h2>
              <button
                type="button"
                onClick={() => {
                  if (!createClienteMutation.isPending) {
                    setShowNewCliente(false);
                    setNewClienteName("");
                  }
                }}
                className="rounded-[8px] px-2 py-1 text-[20px] font-bold text-slate-500 transition hover:bg-slate-100"
                disabled={createClienteMutation.isPending}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCliente}>
              <label htmlFor="nuevo-cliente" className="field-label">
                Nombre del cliente
              </label>
              <input
                id="nuevo-cliente"
                className="field-input"
                autoFocus
                disabled={createClienteMutation.isPending}
                maxLength={100}
                placeholder="Ej: Mercado Central"
                value={newClienteName}
                onChange={(event) => setNewClienteName(event.target.value)}
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCliente(false);
                    setNewClienteName("");
                  }}
                  className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-[14px] font-bold text-slate-600 transition hover:bg-slate-50"
                  disabled={createClienteMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-[8px] bg-coronados-orange px-4 py-2 text-[14px] font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={createClienteMutation.isPending}
                >
                  {createClienteMutation.isPending ? "Creando..." : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
