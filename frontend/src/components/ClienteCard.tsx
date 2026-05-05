import { useState } from "react";
import type { ClienteDelDia } from "../services/api";

type ClienteCardProps = {
  cliente: ClienteDelDia;
};

export function ClienteCard({ cliente }: ClienteCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900">{cliente.cliente.nombre}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {cliente.pesadas} pesada{cliente.pesadas === 1 ? "" : "s"} registradas
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-coronados-orange">
            {cliente.total_kg.toFixed(2)} kg
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Total
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="space-y-3">
            {cliente.lineas.map((linea) => (
              <div
                key={linea.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {linea.origen === "partida" ? "Partida" : "Piso"} · {linea.granja.nombre}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(linea.created_at).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <p className="text-lg font-bold text-slate-900">{linea.peso_neto.toFixed(2)} kg</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <p>Jabas: {linea.jabas}</p>
                  <p>Peso bruto: {linea.peso_bruto.toFixed(2)} kg</p>
                  <p>Tara total: {linea.tara.toFixed(2)} kg</p>
                  <p>
                    Tara por jaba: {linea.tara_por_jaba.toFixed(2)} kg
                    {linea.usa_tara_personalizada ? " ajustada" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
