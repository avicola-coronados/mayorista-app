import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconBuildingBank,
  IconCash,
  IconClock,
  IconDownload,
  IconPrinter,
} from "@tabler/icons-react";
import { CajeroShell } from "../../components/cajero/CajeroShell";
import {
  apiClient,
  type PagoDelDiaItem,
  type PagoDelDiaTipo,
  type PagosDelDiaResumen,
} from "../../services/api";
import { useAuthStore } from "../../store/authStore";

type FiltroPago = "todos" | "efectivo" | "validados" | "pendientes";

type FranjaHoraria = "manana" | "tarde" | "noche";

const emptyResumen: PagosDelDiaResumen = {
  totalCobrado: 0,
  totalEfectivo: 0,
  countEfectivo: 0,
  totalValidado: 0,
  countValidado: 0,
  totalPendiente: 0,
  countPendiente: 0,
  clientesQuePagaron: 0,
};

const franjaLabels: Record<FranjaHoraria, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};

export function PagosDelDiaCajero() {
  const hoy = useMemo(() => new Date(), []);
  const fechaISO = useMemo(() => toISODate(hoy), [hoy]);
  const [filtro, setFiltro] = useState<FiltroPago>("todos");
  const printRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const cajeroNombre = user?.nombre || user?.username || "Cajero";

  const pagosQuery = useQuery({
    queryKey: ["cajero-pagos-dia", fechaISO],
    queryFn: () => apiClient.getPagosDelDia({ fecha: fechaISO }),
    staleTime: 30000,
  });

  const resumen = pagosQuery.data?.resumen ?? emptyResumen;
  const pagos = pagosQuery.data?.pagos ?? [];

  const pagosFiltrados = useMemo(() => {
    if (filtro === "todos") {
      return pagos;
    }

    if (filtro === "efectivo") {
      return pagos.filter((pago) => pago.tipo === "efectivo");
    }

    if (filtro === "validados") {
      return pagos.filter((pago) => pago.tipo === "deposito_validado");
    }

    return pagos.filter((pago) => pago.tipo === "deposito_pendiente");
  }, [filtro, pagos]);

  const distribucion = useMemo(() => {
    const total =
      resumen.totalEfectivo + resumen.totalValidado + resumen.totalPendiente || 1;

    return {
      efectivoPct: (resumen.totalEfectivo / total) * 100,
      validadoPct: (resumen.totalValidado / total) * 100,
      pendientePct: (resumen.totalPendiente / total) * 100,
    };
  }, [resumen]);

  const gruposFranja = useMemo(() => {
    if (filtro !== "todos") {
      return null;
    }

    const grupos: Record<FranjaHoraria, PagoDelDiaItem[]> = {
      manana: [],
      tarde: [],
      noche: [],
    };

    for (const pago of pagosFiltrados) {
      grupos[getFranjaHoraria(pago.hora)].push(pago);
    }

    return grupos;
  }, [filtro, pagosFiltrados]);

  function handleExportar() {
    const rows = pagosFiltrados.map((pago) => ({
      Cliente: pago.cliente,
      Tipo: labelTipoPago(pago.tipo),
      Banco: pago.banco ?? "",
      "N° Operación": pago.nroOperacion ?? "",
      Hora: pago.hora,
      Monto: pago.monto.toFixed(2),
      Observación: pago.observacion ?? "",
    }));

    const header = ["Cliente", "Tipo", "Banco", "N° Operación", "Hora", "Monto", "Observación"];
    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => {
            const value = row[key as keyof typeof row] ?? "";
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consolidado-pagos-${fechaISO}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImprimir() {
    window.print();
  }

  const contadorTexto = getContadorTexto(filtro, pagosFiltrados.length);

  return (
    <>
      <div className="print:hidden">
        <CajeroShell title="Pagos del día" subtitle={formatLongDate(hoy)}>
          <div className="p-[30px]">
            <header className="mb-6 flex items-start justify-between gap-4 max-md:flex-col">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-neutral-500">{formatLongDate(hoy)}</p>
                <h2 className="mt-1 text-[20px] font-medium text-neutral-950">Pagos del día</h2>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportar}
                  disabled={pagosFiltrados.length === 0}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-neutral-300 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconDownload size={16} stroke={2} />
                  Exportar
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  disabled={pagos.length === 0}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-4 py-2 text-[13px] font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconPrinter size={16} stroke={2} />
                  Imprimir consolidado
                </button>
              </div>
            </header>

            {pagosQuery.isError ? (
              <ErrorState message={(pagosQuery.error as Error).message} />
            ) : pagosQuery.isLoading ? (
              <LoadingState />
            ) : pagos.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <section className="mb-5 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">
                  <MetricCard
                    label="Total cobrado hoy"
                    subtext="Efectivo + depósitos validados"
                    tone="green"
                    value={formatCurrency(resumen.totalCobrado)}
                  />
                  <MetricCard
                    label="En efectivo"
                    subtext={`${resumen.countEfectivo} pagos registrados`}
                    tone="green"
                    value={formatCurrency(resumen.totalEfectivo)}
                  />
                  <MetricCard
                    label="En depósitos validados"
                    subtext={`${resumen.countValidado} depósitos confirmados`}
                    tone="blue"
                    value={formatCurrency(resumen.totalValidado)}
                  />
                  <MetricCard
                    label="Pendiente de validación"
                    subtext={`${resumen.countPendiente} depósitos por confirmar`}
                    tone="orange"
                    value={formatCurrency(resumen.totalPendiente)}
                  />
                </section>

                <section className="mb-5 rounded-[10px] border border-neutral-300/80 bg-white p-4">
                  <h3 className="text-[13px] font-medium text-neutral-950">Distribución de pagos del día</h3>
                  <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-[4px]">
                    {resumen.totalEfectivo > 0 ? (
                      <div
                        className="h-full bg-coronados-green"
                        style={{ width: `${distribucion.efectivoPct}%` }}
                      />
                    ) : null}
                    {resumen.totalValidado > 0 ? (
                      <div className="h-full bg-[#4A7EC7]" style={{ width: `${distribucion.validadoPct}%` }} />
                    ) : null}
                    {resumen.totalPendiente > 0 ? (
                      <div className="h-full bg-[#F5DFA0]" style={{ width: `${distribucion.pendientePct}%` }} />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-5">
                      <LegendItem color="#2E8B3A" label="Efectivo" value={formatCurrency(resumen.totalEfectivo)} />
                      <LegendItem
                        color="#4A7EC7"
                        label="Depósito validado"
                        value={formatCurrency(resumen.totalValidado)}
                      />
                      <LegendItem
                        color="#F5DFA0"
                        label="Pendiente validación"
                        value={formatCurrency(resumen.totalPendiente)}
                      />
                    </div>
                    <LegendItem
                      color="#E8471A"
                      label="Clientes que pagaron"
                      value={String(resumen.clientesQuePagaron)}
                    />
                  </div>
                </section>

                <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <FilterPill
                      active={filtro === "todos"}
                      activeClassName="bg-coronados-orange text-white"
                      count={pagos.length}
                      label="Todos"
                      onClick={() => setFiltro("todos")}
                    />
                    <FilterPill
                      active={filtro === "efectivo"}
                      activeClassName="bg-coronados-green text-white"
                      count={resumen.countEfectivo}
                      label="Efectivo"
                      onClick={() => setFiltro("efectivo")}
                    />
                    <FilterPill
                      active={filtro === "validados"}
                      activeClassName="bg-[#4A7EC7] text-white"
                      count={resumen.countValidado}
                      label="Validados"
                      onClick={() => setFiltro("validados")}
                    />
                    <FilterPill
                      active={filtro === "pendientes"}
                      activeClassName="bg-[#B08000] text-white"
                      count={resumen.countPendiente}
                      label="Pendientes"
                      onClick={() => setFiltro("pendientes")}
                    />
                  </div>
                  <p className="text-[13px] text-neutral-500">{contadorTexto}</p>
                </section>

                <section className="space-y-3">
                  {pagosFiltrados.length === 0 ? (
                    <div className="rounded-[10px] border border-neutral-300/80 bg-white px-6 py-10 text-center text-[14px] text-neutral-500">
                      No hay pagos para el filtro seleccionado.
                    </div>
                  ) : filtro === "todos" && gruposFranja ? (
                    (["manana", "tarde", "noche"] as FranjaHoraria[]).map((franja) => {
                      const items = gruposFranja[franja];

                      if (items.length === 0) {
                        return null;
                      }

                      return (
                        <div key={franja}>
                          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-neutral-500">
                            {franjaLabels[franja]}
                          </p>
                          <div className="space-y-2">
                            {items.map((pago) => (
                              <PagoCard key={pago.id} pago={pago} />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    pagosFiltrados.map((pago) => <PagoCard key={pago.id} pago={pago} />)
                  )}
                </section>
              </>
            )}
          </div>
        </CajeroShell>
      </div>

      <div ref={printRef} className="hidden p-8 print:block">
        <PrintConsolidado
          cajeroNombre={cajeroNombre}
          fecha={formatLongDate(hoy)}
          fechaHoraGenerado={formatDateTime(new Date())}
          pagos={pagos}
          resumen={resumen}
        />
      </div>
    </>
  );
}

function PrintConsolidado({
  cajeroNombre,
  fecha,
  fechaHoraGenerado,
  pagos,
  resumen,
}: {
  cajeroNombre: string;
  fecha: string;
  fechaHoraGenerado: string;
  pagos: PagoDelDiaItem[];
  resumen: PagosDelDiaResumen;
}) {
  return (
    <div className="text-[12px] text-neutral-900">
      <div className="mb-6 flex items-center gap-3 border-b border-neutral-300 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-coronados-green text-[8px] font-bold text-coronados-green">
          CA
        </div>
        <div>
          <p className="text-[18px] font-bold">Coronados Avícola</p>
          <p className="text-neutral-600">{fecha}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <PrintMetric label="Total cobrado hoy" value={formatCurrency(resumen.totalCobrado)} />
        <PrintMetric label="En efectivo" value={formatCurrency(resumen.totalEfectivo)} />
        <PrintMetric label="Depósitos validados" value={formatCurrency(resumen.totalValidado)} />
        <PrintMetric label="Pendiente validación" value={formatCurrency(resumen.totalPendiente)} />
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-400">
            <th className="py-2 pr-2">Cliente</th>
            <th className="py-2 pr-2">Tipo</th>
            <th className="py-2 pr-2">Banco</th>
            <th className="py-2 pr-2">N° Operación</th>
            <th className="py-2 pr-2">Hora</th>
            <th className="py-2 pr-2 text-right">Monto</th>
            <th className="py-2">Observación</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((pago) => (
            <tr key={pago.id} className="border-b border-neutral-200">
              <td className="py-2 pr-2">{pago.cliente}</td>
              <td className="py-2 pr-2">{labelTipoPago(pago.tipo)}</td>
              <td className="py-2 pr-2">{pago.banco ?? "—"}</td>
              <td className="py-2 pr-2">{pago.nroOperacion ?? "—"}</td>
              <td className="py-2 pr-2">{pago.hora}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(pago.monto)}</td>
              <td className="py-2">{pago.observacion ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-8 text-[11px] text-neutral-600">
        Generado por {cajeroNombre} · {fechaHoraGenerado}
      </p>
    </div>
  );
}

function PrintMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-300 p-2">
      <p className="text-[10px] text-neutral-600">{label}</p>
      <p className="text-[14px] font-semibold">{value}</p>
    </div>
  );
}

function PagoCard({ pago }: { pago: PagoDelDiaItem }) {
  const config = getPagoVisual(pago.tipo);
  const Icon = config.icon;

  return (
    <article className="flex items-center gap-3 rounded-[10px] border border-neutral-300/80 bg-white px-4 py-3.5">
      <div
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: config.iconBg }}
      >
        <Icon size={18} stroke={2} style={{ color: config.iconColor }} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-neutral-950">{pago.cliente}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className="rounded-[6px] px-2 py-0.5 text-[12px] font-medium"
            style={{ backgroundColor: config.badgeBg, color: config.badgeText }}
          >
            {config.badgeLabel}
          </span>
          {pago.observacion ? (
            <span className="text-[12px] text-neutral-500">{pago.observacion}</span>
          ) : null}
        </div>
        {pago.tipo !== "efectivo" && (pago.banco || pago.nroOperacion) ? (
          <p className="mt-1 text-[11px]" style={{ color: config.detailColor }}>
            {pago.banco}
            {pago.banco && pago.nroOperacion ? " · " : ""}
            {pago.nroOperacion ? `N° ${pago.nroOperacion}` : ""}
            {pago.tipo === "deposito_pendiente" && pago.horaEnviado
              ? ` · enviado ${pago.horaEnviado}`
              : null}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p
          className="text-[16px] font-medium"
          style={{ color: pago.tipo === "deposito_pendiente" ? "#B08000" : undefined }}
        >
          {formatCurrency(pago.monto)}
        </p>
        <p className="text-[12px] text-neutral-500">{pago.hora}</p>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  subtext,
  tone,
  value,
}: {
  label: string;
  subtext: string;
  tone: "green" | "blue" | "orange";
  value: string;
}) {
  const valueColor =
    tone === "green" ? "text-coronados-green" : tone === "blue" ? "text-[#4A7EC7]" : "text-coronados-orange";

  return (
    <div className="rounded-[10px] border border-neutral-300/80 bg-white px-4 py-3.5">
      <p className="text-[12px] text-neutral-500">{label}</p>
      <p className={`mt-1 text-[22px] font-medium leading-tight ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[12px] text-neutral-500">{subtext}</p>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-neutral-600">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
      <span className="font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

function FilterPill({
  active,
  activeClassName,
  count,
  label,
  onClick,
}: {
  active: boolean;
  activeClassName: string;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] px-3.5 py-1.5 text-[13px] font-medium transition ${
        active ? activeClassName : "border border-neutral-300 bg-white text-neutral-500"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-neutral-300/80 bg-white px-6 py-16 text-center">
      <IconCash className="text-neutral-300" size={56} stroke={1.2} />
      <h3 className="mt-4 text-[18px] font-medium text-neutral-900">Sin pagos registrados hoy</h3>
      <p className="mt-2 max-w-md text-[14px] text-neutral-500">
        Los pagos aparecerán aquí a medida que se registren en la jornada.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[10px] border border-neutral-300/80 bg-white px-6 py-16 text-center text-[14px] text-neutral-500">
      Cargando pagos del día...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-4 text-[14px] text-red-700">
      <IconAlertCircle size={20} />
      {message}
    </div>
  );
}

function getPagoVisual(tipo: PagoDelDiaTipo) {
  if (tipo === "efectivo") {
    return {
      icon: IconCash,
      iconBg: "#F0FAF1",
      iconColor: "#2E8B3A",
      badgeBg: "#F0FAF1",
      badgeText: "#1A5C22",
      badgeLabel: "Efectivo",
      detailColor: "#2E8B3A",
    };
  }

  if (tipo === "deposito_validado") {
    return {
      icon: IconBuildingBank,
      iconBg: "#EEF3FB",
      iconColor: "#4A7EC7",
      badgeBg: "#EEF3FB",
      badgeText: "#2A4E8A",
      badgeLabel: "Depósito validado",
      detailColor: "#4A7EC7",
    };
  }

  return {
    icon: IconClock,
    iconBg: "#FFFBEA",
    iconColor: "#B08000",
    badgeBg: "#FFFBEA",
    badgeText: "#7A5C00",
    badgeLabel: "Pendiente validación",
    detailColor: "#B08000",
  };
}

function getFranjaHoraria(hora: string): FranjaHoraria {
  const [hourPart] = hora.split(":");
  const hour = Number.parseInt(hourPart, 10);

  if (hour < 12) {
    return "manana";
  }

  if (hour < 18) {
    return "tarde";
  }

  return "noche";
}

function getContadorTexto(filtro: FiltroPago, count: number) {
  if (filtro === "efectivo") {
    return `${count} pagos en efectivo`;
  }

  if (filtro === "validados") {
    return `${count} depósitos validados`;
  }

  if (filtro === "pendientes") {
    return `${count} depósitos pendientes de validación`;
  }

  return `${count} pagos registrados hoy`;
}

function labelTipoPago(tipo: PagoDelDiaTipo) {
  if (tipo === "efectivo") {
    return "Efectivo";
  }

  if (tipo === "deposito_validado") {
    return "Depósito validado";
  }

  return "Pendiente validación";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    currency: "PEN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date) {
  return date.toLocaleString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
