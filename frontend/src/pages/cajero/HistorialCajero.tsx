import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconAlertCircle, IconClockHour4, IconDownload } from "@tabler/icons-react";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import {
  apiClient,
  type HistorialRegistro,
  type HistorialTipoRegistro,
  type HistorialTotales,
} from "../../services/api";

const emptyTotales: HistorialTotales = {
  efectivo: 0,
  depositoValidado: 0,
  depositoPendiente: 0,
  totalCobrado: 0,
};

const tipoBadgeConfig: Record<
  HistorialTipoRegistro,
  { label: string; dot: string; bg: string; text: string }
> = {
  efectivo: { label: "Efectivo", dot: "#2E8B3A", bg: "#F0FAF1", text: "#1A5C22" },
  deposito_validado: { label: "Dep. validado", dot: "#4A7EC7", bg: "#EEF3FB", text: "#2A4E8A" },
  deposito_pendiente: { label: "Dep. pendiente", dot: "#B08000", bg: "#FFFBEA", text: "#7A5C00" },
  guia: { label: "Guía", dot: "#888780", bg: "#F1EFE8", text: "#444441" },
  devolucion: { label: "Devolución", dot: "#E8471A", bg: "#FAECE7", text: "#712B13" },
};

export function HistorialCajero() {
  const hoyISO = useMemo(() => toISODate(new Date()), []);
  const defaultDesde = useMemo(() => getFirstDayOfMonthISO(), []);

  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(hoyISO);

  const params = useMemo(
    () => ({
      ...(clienteId ? { cliente: Number(clienteId) } : {}),
      desde,
      hasta,
    }),
    [clienteId, desde, hasta],
  );

  const historialQuery = useQuery({
    queryKey: ["cajero-historial", params],
    queryFn: () => apiClient.getHistorialCajero(params),
    staleTime: 30000,
  });

  const registros = historialQuery.data?.registros ?? [];
  const clientes = historialQuery.data?.clientes ?? [];
  const totales = historialQuery.data?.totales ?? emptyTotales;

  const grupos = useMemo(() => groupRegistrosByFecha(registros), [registros]);

  function handleDesdeChange(value: string) {
    if (!value) {
      return;
    }

    setDesde(value);
    if (value > hasta) {
      setHasta(value);
    }
  }

  function handleHastaChange(value: string) {
    if (!value || value > hoyISO) {
      return;
    }

    setHasta(value);
    if (value < desde) {
      setDesde(value);
    }
  }

  function handleLimpiar() {
    setClienteId("");
    setDesde(defaultDesde);
    setHasta(hoyISO);
  }

  function handleExportar() {
    const header = ["Fecha", "Hora", "Cliente", "Tipo", "Detalle", "Monto"];
    const rows = registros.map((registro) => [
      registro.fecha,
      registro.hora,
      registro.cliente,
      labelTipoExport(registro.tipo),
      registro.detalle,
      formatMontoExport(registro),
    ]);

    const csvLines = [
      header.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      desde && hasta ? `historial-${desde}-${hasta}.csv` : "historial-completo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <CajeroShell title="Historial" subtitle="Todo el historial">
      <div className="flex min-h-[calc(100vh-73px)] flex-col p-[30px]">
        <header className="mb-5 flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <p className="text-[12px] font-medium text-neutral-500">Todo el historial</p>
            <h2 className="mt-1 text-[20px] font-medium text-neutral-950">Historial</h2>
          </div>
          <button
            type="button"
            onClick={handleExportar}
            disabled={registros.length === 0}
            className="inline-flex shrink-0 items-center gap-2 rounded-[8px] border border-neutral-300 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconDownload size={16} stroke={2} />
            Exportar CSV
          </button>
        </header>

        <section className="mb-4 rounded-[10px] border border-neutral-300/80 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3.5">
            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-[12px] font-medium text-neutral-600">Cliente</span>
              <select
                value={clienteId}
                onChange={(event) => setClienteId(event.target.value)}
                className="w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-coronados-orange focus:ring-1 focus:ring-coronados-orange"
              >
                <option value="">Todos los clientes</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-[12px] font-medium text-neutral-600">Desde</span>
              <input
                type="date"
                max={hasta}
                value={desde}
                onChange={(event) => handleDesdeChange(event.target.value)}
                className="w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-coronados-orange focus:ring-1 focus:ring-coronados-orange"
              />
            </label>

            <label className="min-w-[140px] flex-1">
              <span className="mb-1 block text-[12px] font-medium text-neutral-600">Hasta</span>
              <input
                type="date"
                min={desde}
                max={hoyISO}
                value={hasta}
                onChange={(event) => handleHastaChange(event.target.value)}
                className="w-full rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-coronados-orange focus:ring-1 focus:ring-coronados-orange"
              />
            </label>

            <button
              type="button"
              onClick={handleLimpiar}
              className="shrink-0 rounded-[8px] border border-neutral-300 bg-transparent px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Limpiar
            </button>
          </div>
        </section>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-neutral-500">{registros.length} registros encontrados</p>
          <p className="text-[13px] font-medium text-neutral-800">
            Total cobrado:{" "}
            <span className="text-coronados-green">{formatCurrency(totales.totalCobrado)}</span>
          </p>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-neutral-300/80 bg-white">
          {historialQuery.isError ? (
            <ErrorState message={(historialQuery.error as Error).message} />
          ) : historialQuery.isLoading ? (
            <LoadingState />
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#F9F9F9]">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left text-[12px] font-medium text-neutral-500">
                        Fecha
                      </th>
                      <th className="px-3.5 py-2.5 text-left text-[12px] font-medium text-neutral-500">
                        Cliente
                      </th>
                      <th className="px-3.5 py-2.5 text-left text-[12px] font-medium text-neutral-500">
                        Tipo
                      </th>
                      <th className="px-3.5 py-2.5 text-left text-[12px] font-medium text-neutral-500">
                        Detalle
                      </th>
                      <th className="px-3.5 py-2.5 text-right text-[12px] font-medium text-neutral-500">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <IconClockHour4 size={32} className="mx-auto text-neutral-300" stroke={1.2} />
                          <p className="mt-3 text-[14px] text-neutral-500">
                            Sin registros para los filtros seleccionados
                          </p>
                          <p className="mt-1 text-[13px] text-neutral-400">
                            Intentá ampliar el rango de fechas o seleccionar otro cliente
                          </p>
                        </td>
                      </tr>
                    ) : (
                      grupos.map((grupo) => (
                        <GrupoFilas key={grupo.fecha} fecha={grupo.fecha} registros={grupo.items} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {registros.length > 0 ? (
                <footer className="flex shrink-0 flex-wrap items-center justify-end gap-5 border-t border-neutral-300/80 bg-white px-4 py-2.5">
                  <FooterTotal label="Efectivo cobrado" tone="green" value={formatCurrency(totales.efectivo)} />
                  <FooterTotal
                    label="Depósitos validados"
                    tone="blue"
                    value={formatCurrency(totales.depositoValidado)}
                  />
                  <FooterTotal
                    label="Pendiente validación"
                    tone="orange"
                    value={formatCurrency(totales.depositoPendiente)}
                  />
                  <div className="border-l border-neutral-300/80 pl-5">
                    <FooterTotal
                      label="Total cobrado"
                      tone="green"
                      value={formatCurrency(totales.totalCobrado)}
                      large
                    />
                  </div>
                </footer>
              ) : null}
            </>
          )}
        </section>
      </div>
    </CajeroShell>
  );
}

function GrupoFilas({ fecha, registros }: { fecha: string; registros: HistorialRegistro[] }) {
  return (
    <>
      <tr className="bg-[#F9F9F9]">
        <td
          colSpan={5}
          className="px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-500"
        >
          {formatSeparatorDate(fecha)}
        </td>
      </tr>
      {registros.map((registro) => (
        <HistorialRow key={registro.id} registro={registro} />
      ))}
    </>
  );
}

function HistorialRow({ registro }: { registro: HistorialRegistro }) {
  const badge = tipoBadgeConfig[registro.tipo];

  return (
    <tr className="border-b border-neutral-200/80 transition hover:bg-[#F9F9F9]">
      <td className="px-3.5 py-[11px] text-[12px] text-neutral-500">{registro.hora}</td>
      <td className="px-3.5 py-[11px] text-[14px] font-medium text-neutral-950">{registro.cliente}</td>
      <td className="px-3.5 py-[11px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-[20px] px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: badge.dot }} />
          {badge.label}
        </span>
      </td>
      <td className="px-3.5 py-[11px] text-[13px] text-neutral-500">{registro.detalle}</td>
      <td className="px-3.5 py-[11px] text-right text-[14px] font-medium">{formatMontoCell(registro)}</td>
    </tr>
  );
}

function FooterTotal({
  label,
  large = false,
  tone,
  value,
}: {
  label: string;
  large?: boolean;
  tone: "green" | "blue" | "orange";
  value: string;
}) {
  const color =
    tone === "green" ? "text-coronados-green" : tone === "blue" ? "text-[#4A7EC7]" : "text-coronados-orange";

  return (
    <div className="text-right">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className={`font-medium ${color} ${large ? "text-[16px]" : "text-[14px]"}`}>{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-[14px] text-neutral-500">
      Cargando historial...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
      <IconAlertCircle size={24} className="text-red-600" />
      <p className="text-[14px] text-red-700">{message}</p>
    </div>
  );
}

function groupRegistrosByFecha(registros: HistorialRegistro[]) {
  const grupos: { fecha: string; items: HistorialRegistro[] }[] = [];

  for (const registro of registros) {
    const ultimo = grupos[grupos.length - 1];

    if (!ultimo || ultimo.fecha !== registro.fecha) {
      grupos.push({ fecha: registro.fecha, items: [registro] });
      continue;
    }

    ultimo.items.push(registro);
  }

  return grupos;
}

function formatMontoCell(registro: HistorialRegistro) {
  if (registro.tipo === "devolucion") {
    return <span className="text-coronados-orange">− {registro.montoKg?.toFixed(2) ?? "0.00"} kg</span>;
  }

  if (registro.tipo === "deposito_pendiente") {
    return <span className="text-[#B08000]">{formatCurrency(registro.monto ?? 0)}</span>;
  }

  if (registro.tipo === "efectivo" || registro.tipo === "deposito_validado") {
    return <span className="text-coronados-green">{formatCurrency(registro.monto ?? 0)}</span>;
  }

  return <span className="text-neutral-950">{formatCurrency(registro.monto ?? 0)}</span>;
}

function formatMontoExport(registro: HistorialRegistro) {
  if (registro.tipo === "devolucion") {
    return `− ${registro.montoKg?.toFixed(2) ?? "0.00"} kg`;
  }

  return formatCurrency(registro.monto ?? 0);
}

function labelTipoExport(tipo: HistorialTipoRegistro) {
  return tipoBadgeConfig[tipo].label;
}

function formatSeparatorDate(iso: string) {
  const date = parseISODate(iso);
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    currency: "PEN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function getFirstDayOfMonthISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}
