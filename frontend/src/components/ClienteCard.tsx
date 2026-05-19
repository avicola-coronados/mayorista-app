import { useState } from "react";
import { IconNote } from "@tabler/icons-react";
import type { ClienteDelDia } from "../services/api";

type ClienteCardProps = {
  cliente: ClienteDelDia;
  editingNota: number | null;
  isSavingNota: boolean;
  notaTexto: string;
  onCancelNota: () => void;
  onNotaTextoChange: (value: string) => void;
  onOpenNota: (linea: ClienteDelDia["lineas"][number]) => void;
  onSaveNota: (linea: ClienteDelDia["lineas"][number]) => void;
};

export function ClienteCard({
  cliente,
  editingNota,
  isSavingNota,
  notaTexto,
  onCancelNota,
  onNotaTextoChange,
  onOpenNota,
  onSaveNota,
}: ClienteCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="panel relative overflow-hidden">
      {cliente.tiene_notas ? (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-[#EAF3DE] px-[10px] py-1 text-[11px] font-bold text-[#3B6D11]">
          Con notas
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 pr-24 text-left"
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
            {cliente.lineas.map((linea) => {
              const isEditing = editingNota === linea.id;

              return (
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

                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold text-slate-900">{linea.peso_neto.toFixed(2)} kg</p>
                    <button
                      type="button"
                      onClick={() => onOpenNota(linea)}
                      className={`flex h-9 w-9 items-center justify-center rounded-[6px] border transition ${
                        linea.tiene_nota
                          ? "border-coronados-orange bg-coronados-orange text-white"
                          : "border-slate-200 bg-transparent text-slate-400 hover:bg-slate-100"
                      }`}
                      title={linea.tiene_nota ? "Editar nota" : "Agregar nota"}
                    >
                      <IconNote size={18} stroke={2.2} />
                    </button>
                  </div>
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

                {linea.nota && !isEditing ? (
                  <div className="mt-3 rounded-[8px] border-l-[3px] border-coronados-orange bg-[#F9F9F9] px-3 py-[10px] text-[13px] font-medium text-slate-600">
                    {linea.nota}
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <textarea
                      className="min-h-[80px] w-full resize-y rounded-[8px] border border-slate-200 px-3 py-[10px] text-[14px] font-medium text-slate-900 outline-none transition focus:border-slate-400"
                      autoFocus
                      disabled={isSavingNota}
                      onChange={(event) => onNotaTextoChange(event.target.value)}
                      placeholder="Escribe observaciones sobre esta pesada..."
                      value={notaTexto}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={onCancelNota}
                        className="rounded-[6px] border border-slate-200 bg-transparent px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                        disabled={isSavingNota}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveNota(linea)}
                        className="rounded-[6px] bg-coronados-green px-4 py-2 text-[13px] font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSavingNota}
                      >
                        {isSavingNota ? "Guardando..." : linea.nota && !notaTexto.trim() ? "Eliminar nota" : "Guardar nota"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
