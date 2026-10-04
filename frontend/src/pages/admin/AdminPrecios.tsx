import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCurrencyDollar, IconDeviceFloppy, IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import { apiClient, type PrecioHistorial } from "../../services/api";

const PRECIO_DEFAULT = 5;
const EMPTY_HISTORIAL: PrecioHistorial[] = [];

export function AdminPrecios() {
  const queryClient = useQueryClient();
  const fechaHoy = getLimaDateKey();
  const [precioGeneral, setPrecioGeneral] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [preciosCliente, setPreciosCliente] = useState<Record<number, string>>({});

  const historialQuery = useQuery({
    queryKey: ["precios-historial"],
    queryFn: () => apiClient.getHistorialPrecios(),
  });
  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: apiClient.getClientes,
  });

  const historial = historialQuery.data ?? EMPTY_HISTORIAL;
  const precioGeneralVigente = historial.find(
    (precio) => precio.cliente_id == null && precio.vigente,
  );
  const valorGeneral = precioGeneralVigente?.precio ?? PRECIO_DEFAULT;
  const preciosVigentesPorCliente = useMemo(
    () =>
      new Map(
        historial
          .filter((precio) => precio.cliente_id != null && precio.vigente)
          .map((precio) => [precio.cliente_id!, precio]),
      ),
    [historial],
  );
  const terminoBusqueda = normalizar(busqueda);
  const clientes = (clientesQuery.data ?? []).filter((cliente) =>
    normalizar(cliente.nombre).includes(terminoBusqueda),
  );

  useEffect(() => {
    if (precioGeneralVigente) {
      setPrecioGeneral(precioGeneralVigente.precio.toFixed(2));
    } else if (historialQuery.isSuccess) {
      setPrecioGeneral(PRECIO_DEFAULT.toFixed(2));
    }
  }, [historialQuery.isSuccess, precioGeneralVigente?.id]);

  const guardarPrecio = useMutation({
    mutationFn: (payload: { precio: number; cliente_id: number | null }) =>
      apiClient.createPrecio({ ...payload, fecha_desde: fechaHoy }),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.cliente_id == null
          ? "Precio general actualizado"
          : "Precio del cliente actualizado",
      );
      await queryClient.invalidateQueries({ queryKey: ["precios-historial"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function guardarGeneral() {
    const precio = Number(precioGeneral);
    if (!Number.isFinite(precio) || precio <= 0) {
      toast.error("Ingresa un precio mayor a cero");
      return;
    }
    guardarPrecio.mutate({ precio, cliente_id: null });
  }

  function guardarCliente(clienteId: number, precioActual: number) {
    const precio = Number(preciosCliente[clienteId] ?? precioActual);
    if (!Number.isFinite(precio) || precio <= 0) {
      toast.error("Ingresa un precio mayor a cero");
      return;
    }
    guardarPrecio.mutate({ precio, cliente_id: clienteId });
  }

  return (
    <AdminShell title="Precios" subtitle="Precio diario general y tarifas por cliente">
      <div className="space-y-6 p-[30px]">
        {historialQuery.isError || clientesQuery.isError ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
            {(historialQuery.error as Error)?.message ??
              (clientesQuery.error as Error)?.message ??
              "No se pudo cargar la configuración de precios"}
          </div>
        ) : null}

        <section className="rounded-[12px] border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                Precio general del día
              </p>
              <h2 className="mt-1 text-[20px] font-medium text-neutral-950">{formatDate(fechaHoy)}</h2>
              <p className="mt-1 text-[13px] text-neutral-500">
                Se aplica a los clientes que no tengan un precio propio.
              </p>
            </div>
            <div className="flex items-end gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-600">Soles por kg</span>
                <div className="flex h-11 items-center rounded-[8px] border border-neutral-200 bg-white px-3 focus-within:border-coronados-orange">
                  <span className="mr-2 font-medium text-neutral-500">S/</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={precioGeneral}
                    onChange={(event) => setPrecioGeneral(event.target.value)}
                    aria-label="Precio general del día"
                    className="w-28 bg-transparent text-[18px] font-medium text-neutral-950 outline-none"
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={guardarGeneral}
                disabled={guardarPrecio.isPending}
                className="flex h-11 items-center gap-2 rounded-[8px] bg-coronados-green px-4 text-[14px] font-medium text-white disabled:opacity-50"
              >
                <IconDeviceFloppy size={17} />
                Guardar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[12px] border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-medium text-neutral-950">Precios por cliente</h2>
              <p className="mt-1 text-[13px] text-neutral-500">
                Un precio propio tiene prioridad sobre el precio general.
              </p>
            </div>
            <div className="flex h-10 w-full max-w-sm items-center gap-2 rounded-[8px] border border-neutral-200 px-3 focus-within:border-coronados-orange">
              <IconSearch size={17} className="text-neutral-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar cliente..."
                aria-label="Buscar cliente"
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
              />
            </div>
          </div>

          {clientesQuery.isLoading || historialQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-[10px] bg-neutral-100" />
          ) : clientes.length === 0 ? (
            <p className="rounded-[10px] bg-neutral-50 px-4 py-8 text-center text-[14px] text-neutral-500">
              No se encontraron clientes.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {clientes.map((cliente) => {
                const precioPropio = preciosVigentesPorCliente.get(cliente.id);
                const precioAplicado = precioPropio?.precio ?? valorGeneral;
                const value = preciosCliente[cliente.id] ?? precioAplicado.toFixed(2);

                return (
                  <div key={cliente.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-[220px]">
                      <p className="text-[14px] font-medium text-neutral-950">{cliente.nombre}</p>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        {precioPropio ? "Precio propio vigente" : "Usa el precio general"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 items-center rounded-[8px] border border-neutral-200 px-3 focus-within:border-coronados-orange">
                        <span className="mr-2 text-[13px] text-neutral-500">S/</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={value}
                          onChange={(event) =>
                            setPreciosCliente((current) => ({
                              ...current,
                              [cliente.id]: event.target.value,
                            }))
                          }
                          aria-label={`Precio para ${cliente.nombre}`}
                          className="w-24 bg-transparent text-[15px] font-medium outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => guardarCliente(cliente.id, precioAplicado)}
                        disabled={guardarPrecio.isPending}
                        className="h-10 rounded-[8px] border border-coronados-green px-3 text-[13px] font-medium text-coronados-green transition hover:bg-green-50 disabled:opacity-50"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
            <IconCurrencyDollar size={20} className="text-coronados-orange" />
            <h2 className="text-[17px] font-medium text-neutral-950">Historial de precios</h2>
          </div>
          <HistorialPrecios historial={historial} loading={historialQuery.isLoading} />
        </section>
      </div>
    </AdminShell>
  );
}

function HistorialPrecios({ historial, loading }: { historial: PrecioHistorial[]; loading: boolean }) {
  if (loading) {
    return <div className="m-5 h-36 animate-pulse rounded-[10px] bg-neutral-100" />;
  }

  if (historial.length === 0) {
    return <p className="px-5 py-8 text-center text-[14px] text-neutral-500">Aún no hay precios registrados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-neutral-50 text-[11px] uppercase text-neutral-500">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Fecha</th>
            <th className="px-5 py-3 text-left font-medium">Aplicación</th>
            <th className="px-5 py-3 text-right font-medium">Precio</th>
            <th className="px-5 py-3 text-center font-medium">Estado</th>
            <th className="px-5 py-3 text-left font-medium">Registrado por</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((precio) => (
            <tr key={precio.id} className="border-t border-neutral-100 text-[13px]">
              <td className="px-5 py-3 text-neutral-700">{formatDate(precio.fecha_desde)}</td>
              <td className="px-5 py-3 font-medium text-neutral-950">
                {precio.cliente?.nombre ?? "Precio general"}
              </td>
              <td className="px-5 py-3 text-right font-medium text-coronados-orange">
                S/ {precio.precio.toFixed(2)}/kg
              </td>
              <td className="px-5 py-3 text-center">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  precio.vigente ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}>
                  {precio.vigente ? "Vigente" : "Anterior"}
                </span>
              </td>
              <td className="px-5 py-3 text-neutral-600">
                {precio.creado_por.nombre ?? precio.creado_por.username}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function getPrecioClienteVigente(historial: PrecioHistorial[], clienteId: number) {
  return historial.find((precio) => precio.cliente_id === clienteId && precio.vigente);
}

function normalizar(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es-PE");
}

function getLimaDateKey() {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00.000Z`));
}
