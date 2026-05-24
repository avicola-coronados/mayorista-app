export type ClienteDetalleTab = "estado-cuenta" | "facturas-guias";

export function ClienteDetalleTabs({
  active,
  onChange,
}: {
  active: ClienteDetalleTab;
  onChange: (tab: ClienteDetalleTab) => void;
}) {
  const tabs: Array<{ id: ClienteDetalleTab; label: string }> = [
    { id: "estado-cuenta", label: "Estado de cuenta" },
    { id: "facturas-guias", label: "Facturas y guías" },
  ];

  return (
    <div className="mb-6 border-b border-neutral-200">
      <div className="flex gap-8">
        {tabs.map((tab) => {
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`-mb-px border-b-[3px] pb-3 text-[15px] font-bold transition ${
                isActive
                  ? "border-coronados-orange text-coronados-orange"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
