type MetricCardProps = {
  label: string;
  value: string;
  tone?: "orange" | "green";
};

export function MetricCard({ label, value, tone = "orange" }: MetricCardProps) {
  const toneClasses =
    tone === "green"
      ? "from-green-50 to-white text-coronados-green"
      : "from-orange-50 to-white text-coronados-orange";

  return (
    <article className={`panel bg-gradient-to-br ${toneClasses} p-5`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </article>
  );
}
