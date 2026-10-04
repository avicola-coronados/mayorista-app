import { useState, type MouseEvent } from "react";
import { IconNote, IconPencil } from "@tabler/icons-react";
import { RegistrarDevolucionButton } from "./operario/RegistrarDevolucionSheet";
import type { ClienteDelDia, Devolucion, Granja, TipoDevolucion } from "../services/api";

type ClienteCardProps = {
  cliente: ClienteDelDia;
  devoluciones: Devolucion[];
  editingNota: number | null;
  isSavingNota: boolean;
  notaTexto: string;
  onCancelNota: () => void;
  onNotaTextoChange: (value: string) => void;
  onOpenNota: (linea: ClienteDelDia["lineas"][number]) => void;
  onSaveNota: (linea: ClienteDelDia["lineas"][number]) => void;
  granjas: Granja[];
  isSavingDetalle: boolean;
  onSaveDetalle: (
    linea: ClienteDelDia["lineas"][number],
    detalle: { granjaId: number; jabas: number; taraPorJaba: number },
  ) => Promise<void>;
  onRegistrarDevolucion?: () => void;
};

export function ClienteCard({
  cliente,
  devoluciones,
  editingNota,
  isSavingNota,
  notaTexto,
  onCancelNota,
  onNotaTextoChange,
  onOpenNota,
  onSaveNota,
  granjas,
  isSavingDetalle,
  onSaveDetalle,
  onRegistrarDevolucion,
}: ClienteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState<number | null>(null);
  const [detalleForm, setDetalleForm] = useState({ granjaId: 0, jabas: "", taraPorJaba: "" });
  const puedeRegistrarDevolucion = cliente.cliente.id != null && cliente.pesadas > 0 && onRegistrarDevolucion;
  const totalDevolucionesKg = devoluciones.reduce((acc, devolucion) => acc + devolucion.peso_neto, 0);
  const totalClienteAjustado = Math.max(cliente.total_kg - totalDevolucionesKg, 0);
  const totalJabas = cliente.lineas.reduce((total, linea) => total + linea.jabas, 0);

  function getTipoMeta(tipo: TipoDevolucion) {
    switch (tipo) {
      case "muerto":
        return { label: "Muerto", dotClass: "bg-[#E24B4A]", textClass: "text-[#C62828]" };
      case "pelado":
        return { label: "Pelado", dotClass: "bg-[#BA7517]", textClass: "text-[#BA7517]" };
      case "vivo":
        return { label: "Vivo", dotClass: "bg-coronados-green", textClass: "text-coronados-green" };
    }
  }

  return (
    <article className="panel relative overflow-hidden">
      {cliente.tiene_notas ? (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-[#EAF3DE] px-[10px] py-1 text-[11px] font-bold text-[#3B6D11]">
          Con notas
        </span>
      ) : null}
      <div className="px-5 py-4 pr-24">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900">{cliente.cliente.nombre}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {cliente.pesadas} pesada{cliente.pesadas === 1 ? "" : "s"} registrada
              {cliente.pesadas === 1 ? "" : "s"} · {totalJabas} jaba{totalJabas === 1 ? "" : "s"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-coronados-orange">
              {totalClienteAjustado.toFixed(2)} kg
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Total
            </p>
            {devoluciones.length > 0 ? (
              <p className="mt-1 text-[12px] font-medium text-neutral-500">
                {cliente.total_kg.toFixed(2)} - {totalDevolucionesKg.toFixed(2)} = {totalClienteAjustado.toFixed(2)} kg
              </p>
            ) : null}
          </div>
        </button>

        {puedeRegistrarDevolucion ? (
          <RegistrarDevolucionButton
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onRegistrarDevolucion();
            }}
          />
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="space-y-3">
            {cliente.lineas.map((linea) => {
              const isEditing = editingNota === linea.id;
              const isEditingDetalle = editingDetalle === linea.id;
              const granjasDisponibles = granjas.filter(
                (granja) =>
                  granja.activo &&
                  (linea.origen !== "piso" || granja.nombre.trim().toLowerCase() !== "piso"),
              );
              const jabasEditadas = Number(detalleForm.jabas);
              const taraPorJabaEditada = Number(detalleForm.taraPorJaba);
              const taraTotalEditada = Number((jabasEditadas * taraPorJabaEditada).toFixed(2));
              const pesoNetoEditado = Number((linea.peso_bruto - taraTotalEditada).toFixed(2));
              const detalleValido =
                Number.isInteger(jabasEditadas) &&
                jabasEditadas > 0 &&
                Number.isFinite(taraPorJabaEditada) &&
                taraPorJabaEditada > 0 &&
                pesoNetoEditado > 0;
              const detalleSinCambios =
                detalleForm.granjaId === linea.granja.id &&
                jabasEditadas === linea.jabas &&
                Math.abs(taraPorJabaEditada - linea.tara_por_jaba) < 0.001;

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
                      onClick={() => {
                        if (isEditingDetalle) {
                          setEditingDetalle(null);
                          return;
                        }
                        setEditingDetalle(linea.id);
                        setDetalleForm({
                          granjaId: linea.granja.id,
                          jabas: String(linea.jabas),
                          taraPorJaba: String(linea.tara_por_jaba),
                        });
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-[6px] border transition ${
                        isEditingDetalle
                          ? "border-coronados-green bg-coronados-green text-white"
                          : "border-slate-200 bg-transparent text-slate-400 hover:bg-slate-100"
                      }`}
                      title="Editar pesada"
                      aria-label="Editar pesada"
                    >
                      <IconPencil size={18} stroke={2.2} />
                    </button>
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

                {isEditingDetalle ? (
                  <form
                    className="mt-3 border-t border-slate-200 pt-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!detalleValido || detalleSinCambios) return;
                      try {
                        await onSaveDetalle(linea, {
                          granjaId: detalleForm.granjaId,
                          jabas: jabasEditadas,
                          taraPorJaba: taraPorJabaEditada,
                        });
                        setEditingDetalle(null);
                      } catch {
                        // La mutación muestra el error y mantiene abierto el editor.
                      }
                    }}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-[13px] font-semibold text-slate-700">
                        <span className="mb-2 block">Granja</span>
                        <select
                          className="field-input"
                          value={detalleForm.granjaId}
                          disabled={isSavingDetalle}
                          onChange={(event) =>
                            setDetalleForm((current) => ({ ...current, granjaId: Number(event.target.value) }))
                          }
                        >
                          {granjasDisponibles.map((granja) => (
                            <option key={granja.id} value={granja.id}>
                              {granja.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[13px] font-semibold text-slate-700">
                        <span className="mb-2 block">Jabas</span>
                        <input
                          className="field-input"
                          type="number"
                          min="1"
                          step="1"
                          value={detalleForm.jabas}
                          disabled={isSavingDetalle}
                          onChange={(event) =>
                            setDetalleForm((current) => ({ ...current, jabas: event.target.value }))
                          }
                        />
                      </label>
                      <label className="block text-[13px] font-semibold text-slate-700">
                        <span className="mb-2 block">Tara por jaba (kg)</span>
                        <input
                          className="field-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={detalleForm.taraPorJaba}
                          disabled={isSavingDetalle}
                          onChange={(event) =>
                            setDetalleForm((current) => ({ ...current, taraPorJaba: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] bg-white p-3 text-[13px] text-slate-600">
                      <p>Tara total: <strong>{Number.isFinite(taraTotalEditada) ? taraTotalEditada.toFixed(2) : "0.00"} kg</strong></p>
                      <p>Peso neto: <strong>{Number.isFinite(pesoNetoEditado) ? Math.max(0, pesoNetoEditado).toFixed(2) : "0.00"} kg</strong></p>
                    </div>
                    {!detalleValido ? (
                      <p className="mt-2 text-[12px] font-medium text-red-600">
                        Ingresa jabas y tara válidas; el peso neto debe ser mayor a cero.
                      </p>
                    ) : null}
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-[6px] border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                        disabled={isSavingDetalle}
                        onClick={() => setEditingDetalle(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-[6px] bg-coronados-green px-4 py-2 text-[13px] font-bold text-white hover:bg-green-700 disabled:opacity-60"
                        disabled={isSavingDetalle || !detalleValido || detalleSinCambios}
                      >
                        {isSavingDetalle ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                ) : null}

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

            {devoluciones.length > 0 ? (
              <div className="mt-1 rounded-[12px] border border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[13px] font-semibold text-neutral-800">Devoluciones</p>
                  <p className="text-[13px] font-bold text-neutral-950">
                    {totalDevolucionesKg.toFixed(2)} kg
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {devoluciones.map((devol) => {
                    const meta = getTipoMeta(devol.tipo);

                    return (
                      <div key={devol.id} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dotClass}`} />
                          <span className={`truncate text-[13px] font-medium ${meta.textClass}`}>{meta.label}</span>
                          <span className="truncate text-[11px] font-medium text-neutral-400">
                            {new Date(devol.created_at).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <span className="text-[13px] font-bold text-neutral-950">{devol.peso_neto.toFixed(2)} kg</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
