export function ClienteResumenCards({
  facturado,
  pagado,
  saldoPendiente,
}: {
  facturado: number;
  pagado: number;
  saldoPendiente: number;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricCard label="Total facturado" value={formatCurrency(facturado)} />
      <MetricCard label="Total pagado" value={formatCurrency(pagado)} tone="green" />
      <MetricCard label="Saldo pendiente" value={formatCurrency(saldoPendiente)} tone="orange" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "orange";
}) {
  const valueColor =
    tone === "green"
      ? "text-coronados-green"
      : tone === "orange"
        ? "text-coronados-orange"
        : "text-neutral-950";

  return (
    <div className="rounded-[12px] border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-neutral-400">{label}</p>
      <p className={`mt-2 text-[22px] font-semibold leading-tight ${valueColor}`}>{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    currency: "PEN",
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}
