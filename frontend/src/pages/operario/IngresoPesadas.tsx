import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IconLoader2, IconLock } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { ConfirmDialog } from "../../components/operario/ConfirmDialog";
import { OperarioGuiaLineasTable } from "../../components/operario/OperarioGuiaLineasTable";
import {
  initialPesadaForm,
  lineaToFormValues,
  PesadaForm,
  type PesadaFormValues,
} from "../../components/operario/PesadaForm";
import { apiClient, type OperadorGuia, type OperadorGuiaLinea } from "../../services/api";

export function IngresoPesadas() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const autoOpenedRef = useRef(false);
  const preselectedClienteId = (location.state as { clienteId?: number } | null)?.clienteId;
  const [clienteId, setClienteId] = useState(0);
  const [guia, setGuia] = useState<OperadorGuia | null>(null);
  const [form, setForm] = useState<PesadaFormValues>(initialPesadaForm);
  const [editingLineaId, setEditingLineaId] = useState<number | null>(null);
  const [newClienteName, setNewClienteName] = useState("");
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OperadorGuiaLinea | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const jornadaQuery = useQuery({
    queryKey: ["jornada-activa"],
    queryFn: apiClient.getJornadaActiva,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: apiClient.getClientes,
  });

  const precioQuery = useQuery({
    queryKey: ["precio-vigente"],
    queryFn: apiClient.getPrecioVigente,
    enabled: Boolean(guia),
    staleTime: 60_000,
  });

  const openGuiaMutation = useMutation({
    mutationFn: async (selectedClienteId: number) => {
      const activa = await apiClient.getGuiaActiva(selectedClienteId);

      if (activa.guia) {
        return activa.guia;
      }

      return apiClient.createGuia(selectedClienteId);
    },
    onSuccess: (nextGuia) => {
      setGuia(nextGuia);
      resetForm();
      toast.success(`Guía ${nextGuia.numero} lista para pesadas`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveLineaMutation = useMutation({
    mutationFn: async () => {
      if (!guia) {
        throw new Error("No hay guía activa");
      }

      const payload = {
        jabas: Number(form.jabas),
        peso_bruto: Number(form.pesoBruto),
        tara: Number(form.tara),
        devolucion_kg: Number(form.devolucion) || 0,
        peladuria: Number(form.peladuria) || 0,
      };

      if (editingLineaId) {
        return apiClient.updateLineaGuia(guia.id, editingLineaId, payload);
      }

      return apiClient.addLineaGuia(guia.id, payload);
    },
    onSuccess: (nextGuia) => {
      setGuia(nextGuia);
      resetForm();
      toast.success(editingLineaId ? "Pesada actualizada" : "Pesada agregada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteLineaMutation = useMutation({
    mutationFn: (lineaId: number) => {
      if (!guia) {
        throw new Error("No hay guía activa");
      }

      return apiClient.deleteLineaGuia(guia.id, lineaId);
    },
    onSuccess: (nextGuia) => {
      setGuia(nextGuia);
      setDeleteTarget(null);

      if (editingLineaId) {
        resetForm();
      }

      toast.success("Pesada eliminada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeleteTarget(null);
    },
  });

  const cerrarGuiaMutation = useMutation({
    mutationFn: () => {
      if (!guia) {
        throw new Error("No hay guía activa");
      }

      return apiClient.cerrarGuia(guia.id);
    },
    onSuccess: async () => {
      setConfirmClose(false);
      toast.success("Guía cerrada correctamente");
      await queryClient.invalidateQueries({ queryKey: ["guias-jornada"] });
      navigate("/operario/guias");
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setConfirmClose(false);
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
      setClienteId(cliente.id);
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      openGuiaMutation.mutate(cliente.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const jornada = jornadaQuery.data;
  const selectedCliente = clientesQuery.data?.find((cliente) => cliente.id === clienteId);
  const precioKg = precioQuery.data?.precio_kg ?? precioQuery.data?.precio ?? 0;
  const loadingCatalogos = jornadaQuery.isLoading || clientesQuery.isLoading;

  useEffect(() => {
    if (
      preselectedClienteId &&
      preselectedClienteId > 0 &&
      !guia &&
      !autoOpenedRef.current &&
      !loadingCatalogos &&
      jornada?.estado === "abierta"
    ) {
      autoOpenedRef.current = true;
      setClienteId(preselectedClienteId);
      openGuiaMutation.mutate(preselectedClienteId);
    }
  }, [preselectedClienteId, guia, loadingCatalogos, jornada?.estado]);

  function resetForm() {
    setForm(initialPesadaForm);
    setEditingLineaId(null);
  }

  function handleClienteContinue() {
    if (!clienteId) {
      toast.error("Selecciona un cliente");
      return;
    }

    openGuiaMutation.mutate(clienteId);
  }

  function handleSaveLinea() {
    saveLineaMutation.mutate();
  }

  function handleEditLinea(linea: OperadorGuiaLinea) {
    setEditingLineaId(linea.id);
    setForm(lineaToFormValues(linea));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCreateCliente(event: FormEvent) {
    event.preventDefault();

    if (newClienteName.trim().length < 2) {
      toast.error("El nombre del cliente debe tener al menos 2 caracteres");
      return;
    }

    createClienteMutation.mutate();
  }

  function handleChangeCliente() {
    setGuia(null);
    resetForm();
  }

  if (loadingCatalogos) {
    return (
      <Layout title="Ingreso de pesadas" subtitle="Cargando jornada y clientes">
        <div className="h-[320px] animate-pulse rounded-[12px] bg-white/80" />
      </Layout>
    );
  }

  if (jornadaQuery.isError || clientesQuery.isError) {
    return (
      <Layout title="Ingreso de pesadas" subtitle="Error al cargar datos">
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-6 text-[14px] text-red-700">
          {(jornadaQuery.error as Error)?.message || (clientesQuery.error as Error)?.message}
        </div>
      </Layout>
    );
  }

  if (!jornada || jornada.estado === "cerrada") {
    return (
      <Layout title="Ingreso de pesadas" subtitle="Jornada no disponible">
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-6 text-[14px] font-medium text-amber-900">
          No hay jornada abierta. Solicita a administración que abra la jornada del día.
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Ingreso de pesadas"
      subtitle={
        guia
          ? `${guia.cliente.nombre} · ${guia.numero}`
          : selectedCliente
            ? `Cliente: ${selectedCliente.nombre}`
            : "Selecciona un cliente para abrir su guía"
      }
      statusBadge={`Jornada ${jornada.codigo}`}
      statusTone="open"
    >
      {!guia ? (
        <section className="mx-auto max-w-2xl rounded-[12px] border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-[18px] font-bold text-neutral-950">1. Cliente</h3>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">
            Se abrirá la guía en borrador de la jornada actual o se creará una nueva.
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="cliente-guia" className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">
                Cliente
              </label>
              <button
                type="button"
                onClick={() => setShowNewCliente(true)}
                className="rounded-[8px] bg-coronados-green px-3 py-2 text-[12px] font-bold text-white transition hover:bg-green-700"
              >
                Nuevo cliente
              </button>
            </div>
            <select
              id="cliente-guia"
              className="operario-input"
              value={clienteId}
              onChange={(event) => setClienteId(Number(event.target.value))}
            >
              <option value={0}>Selecciona un cliente</option>
              {clientesQuery.data?.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleClienteContinue}
            disabled={!clienteId || openGuiaMutation.isPending}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-coronados-orange px-6 text-[15px] font-bold text-white transition enabled:hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {openGuiaMutation.isPending ? <IconLoader2 size={20} className="animate-spin" /> : null}
            Continuar con guía
          </button>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <section className="rounded-[12px] border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Guía activa</p>
                  <p className="text-[18px] font-bold text-neutral-950">{guia.cliente.nombre}</p>
                  <p className="text-[13px] font-medium text-neutral-500">{guia.numero}</p>
                </div>
                <span className="rounded-full bg-[#FFF4EF] px-3 py-1 text-[11px] font-bold uppercase text-coronados-orange">
                  Borrador
                </span>
              </div>
              <button
                type="button"
                onClick={handleChangeCliente}
                className="mt-3 text-[13px] font-bold text-coronados-orange hover:underline"
              >
                Cambiar cliente
              </button>
            </section>

            {guia.editable ? (
              <PesadaForm
                values={form}
                onChange={setForm}
                precioKg={precioKg}
                editingLineaId={editingLineaId}
                saving={saveLineaMutation.isPending}
                onSubmit={handleSaveLinea}
                onClear={resetForm}
              />
            ) : (
              <div className="rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-[14px] font-medium text-neutral-600">
                Esta guía ya está cerrada.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                disabled={!guia.editable || guia.lineas.length === 0 || cerrarGuiaMutation.isPending}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-coronados-orange px-6 text-[15px] font-bold text-white transition enabled:hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {cerrarGuiaMutation.isPending ? <IconLoader2 size={20} className="animate-spin" /> : <IconLock size={18} />}
                Cerrar guía
              </button>
              <Link
                to="/operario/guias"
                className="inline-flex h-12 items-center justify-center rounded-[8px] border border-neutral-200 px-6 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                Ver guías del día
              </Link>
            </div>
          </div>

          <OperarioGuiaLineasTable
            guia={guia}
            editingLineaId={editingLineaId}
            deletingLineaId={deleteLineaMutation.isPending ? deleteLineaMutation.variables : null}
            onEdit={handleEditLinea}
            onDelete={setDeleteTarget}
          />
        </div>
      )}

      {showNewCliente ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form
            onSubmit={handleCreateCliente}
            className="w-full max-w-md rounded-[12px] bg-white p-6 shadow-xl"
          >
            <h3 className="text-[18px] font-bold text-neutral-950">Nuevo cliente</h3>
            <input
              className="operario-input mt-4"
              value={newClienteName}
              onChange={(event) => setNewClienteName(event.target.value)}
              placeholder="Nombre del cliente"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewCliente(false)}
                className="rounded-[8px] border border-neutral-200 px-4 py-2.5 text-[14px] font-bold text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createClienteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
              >
                {createClienteMutation.isPending ? <IconLoader2 size={18} className="animate-spin" /> : null}
                Crear y continuar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Eliminar pesada"
        message="¿Eliminar esta pesada?"
        confirmLabel="Eliminar"
        loading={deleteLineaMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteLineaMutation.mutate(deleteTarget.id)}
      />

      <ConfirmDialog
        open={confirmClose}
        title="Cerrar guía"
        message="¿Cerrar guía? No podrás agregar más pesadas."
        confirmLabel="Cerrar guía"
        confirmTone="primary"
        loading={cerrarGuiaMutation.isPending}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => cerrarGuiaMutation.mutate()}
      />
    </Layout>
  );
}
