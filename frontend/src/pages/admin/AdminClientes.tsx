import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconClockExclamation,
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserOff,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import { apiClient, type Cliente, type ClientePayload } from "../../services/api";

type ModalState = {
  mode: "create" | "edit";
  cliente?: Cliente;
} | null;

export function AdminClientes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(9);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const clientesQuery = useQuery({
    queryKey: ["admin-clientes", debouncedSearch],
    queryFn: () => apiClient.getAdminClientes(debouncedSearch),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.jornada_activa?.estado === "abierta" && !modal ? 120000 : false;
    },
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteCliente(id),
    onSuccess: async () => {
      toast.success("Cliente eliminado");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = clientesQuery.data;
  const clientes = data?.clientes ?? [];
  const jornada = data?.jornada_activa;
  const clientesSinCompras = data?.resumen_inactivos.clientes_sin_compras ?? [];
  const alertKey = jornada ? `alert_clientes_inactivos_${formatCompactDate(jornada.fecha)}` : "";
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);

  useEffect(() => {
    if (alertKey) {
      setDismissedAlertKey(window.localStorage.getItem(alertKey));
    }
  }, [alertKey]);

  const showInactiveSection = Boolean(jornada && clientesSinCompras.length > 0);
  const showAlert = showInactiveSection && dismissedAlertKey !== "1";
  const visibleInactiveClients = clientesSinCompras.slice(0, visibleInactiveCount);
  const hiddenInactiveCount = Math.max(clientesSinCompras.length - visibleInactiveCount, 0);

  function dismissAlert() {
    if (!alertKey) {
      return;
    }

    window.localStorage.setItem(alertKey, "1");
    setDismissedAlertKey("1");
  }

  return (
    <AdminShell
      title="Clientes"
      subtitle="Gestiona los clientes compradores"
      actions={
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-6 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} stroke={2.4} />
          Nuevo cliente
        </button>
      }
    >
      <div className="p-[30px]">
        <div className="mb-5 flex items-center gap-3 max-md:flex-col max-md:items-stretch">
          <label className="flex h-10 w-full max-w-[400px] items-center gap-2 rounded-[8px] border border-coronados-green bg-white px-[14px] text-[14px] font-medium text-neutral-700 max-md:max-w-none">
            <IconSearch size={18} className="shrink-0 text-coronados-green" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o código..."
              value={search}
            />
          </label>
        </div>

        {clientesQuery.isLoading ? (
          <ClientesSkeleton />
        ) : clientesQuery.isError ? (
          <ErrorState
            message={(clientesQuery.error as Error)?.message ?? "No se pudo cargar la lista de clientes"}
            onRetry={() => clientesQuery.refetch()}
          />
        ) : (
          <>
            {showAlert ? (
              <section className="mb-5 flex items-start gap-3 rounded-[10px] border border-[#BA7517] bg-[#FFF3E0] px-[18px] py-[14px]">
                <IconAlertTriangle size={22} className="mt-0.5 shrink-0 text-[#BA7517]" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-bold text-[#BA7517]">
                    {clientesSinCompras.length} clientes sin compras hoy
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-[#8B6914]">
                    Los siguientes clientes no han realizado compras en la jornada actual ({jornada?.codigo})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="rounded-[6px] p-1 text-[#BA7517] transition hover:bg-black/5"
                  title="Cerrar alerta"
                >
                  <IconX size={18} />
                </button>
              </section>
            ) : null}

            {showInactiveSection ? (
              <section className="mb-5 overflow-hidden rounded-[12px] border border-neutral-200 bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <IconClockExclamation size={20} className="text-[#BA7517]" />
                    <h2 className="text-[14px] font-bold text-neutral-950">Clientes sin compras hoy</h2>
                  </div>
                  <span className="rounded-full bg-[#FFF3E0] px-[10px] py-1 text-[12px] font-bold text-[#BA7517]">
                    {clientesSinCompras.length} clientes
                  </span>
                </header>
                <div className="grid grid-cols-3 gap-px bg-neutral-200 max-lg:grid-cols-2 max-md:grid-cols-1">
                  {visibleInactiveClients.map((cliente) => (
                    <InactiveClientCard key={cliente.id} cliente={cliente} />
                  ))}
                </div>
                {hiddenInactiveCount > 0 ? (
                  <div className="border-t border-neutral-100 p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleInactiveCount((current) => current + 9)}
                      className="rounded-[8px] border border-[#BA7517]/40 px-4 py-2 text-[13px] font-bold text-[#BA7517] transition hover:bg-[#FFF3E0]"
                    >
                      Ver todos ({hiddenInactiveCount} más)
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {clientes.length === 0 ? (
              <EmptyState onCreate={() => setModal({ mode: "create" })} search={debouncedSearch} />
            ) : (
              <section className="grid gap-[14px]">
                {clientes.map((cliente) => (
                  <ClienteAdminCard
                    key={cliente.id}
                    cliente={cliente}
                    hasActiveJornada={Boolean(jornada)}
                    onDelete={() => setDeleteTarget(cliente)}
                    onEdit={() => setModal({ mode: "edit", cliente })}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {modal ? <ClienteModal modal={modal} onClose={() => setModal(null)} /> : null}
      {deleteTarget ? (
        <ConfirmDeleteModal
          cliente={deleteTarget}
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </AdminShell>
  );
}

function InactiveClientCard({
  cliente,
}: {
  cliente: { id: number; nombre: string; ultima_compra: string | null };
}) {
  return (
    <article className="flex min-w-0 items-center gap-[10px] bg-white px-4 py-[14px]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[13px] font-bold text-neutral-400">
        {getInitials(cliente.nombre)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-neutral-950">{cliente.nombre}</p>
        <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
          Última: {formatLastPurchase(cliente.ultima_compra)}
        </p>
      </div>
    </article>
  );
}

function ClienteAdminCard({
  cliente,
  hasActiveJornada,
  onDelete,
  onEdit,
}: {
  cliente: Cliente;
  hasActiveJornada: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const metadata = [
    cliente.codigo,
    `Creado: ${formatDate(cliente.created_at)}`,
    `${cliente.total_ventas ?? 0} ventas`,
    `${formatKg(cliente.total_kg_vendido ?? 0)} kg total`,
  ].filter(Boolean);

  return (
    <article
      className={`flex min-h-[96px] items-center justify-between gap-4 rounded-[12px] border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 ${
        cliente.activo ? "" : "opacity-60"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${
            cliente.activo ? "bg-[#E8F5E9] text-coronados-green" : "bg-[#F5F5F5] text-neutral-400"
          }`}
        >
          {getInitials(cliente.nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-medium text-neutral-950">{cliente.nombre}</h2>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">{metadata.join(" · ")}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-[14px] py-[6px] text-[12px] font-bold ${
              cliente.activo ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {cliente.activo ? "Activo" : "Inactivo"}
          </span>
          {hasActiveJornada && cliente.activo && cliente.compro_hoy ? (
            <span
              className="text-[11px] font-bold text-coronados-green"
              title={`Última compra: ${formatLastPurchase(cliente.ultima_compra, true)}`}
            >
              ✓ Compró hoy
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
          title="Editar cliente"
        >
          <IconEdit size={18} stroke={2.2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#C62828] transition hover:bg-red-50"
          title="Eliminar cliente"
        >
          <IconTrash size={18} stroke={2.2} />
        </button>
      </div>
    </article>
  );
}

function ClienteModal({ modal, onClose }: { modal: ModalState; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = modal?.mode === "edit";
  const clienteId = modal?.cliente?.id;
  const detailQuery = useQuery({
    queryKey: ["admin-cliente", clienteId],
    queryFn: () => apiClient.getCliente(clienteId!),
    enabled: isEdit && Boolean(clienteId),
  });
  const [form, setForm] = useState<Required<ClientePayload>>({
    nombre: modal?.cliente?.nombre ?? "",
    codigo: modal?.cliente?.codigo ?? null,
    telefono: modal?.cliente?.telefono ?? null,
    direccion: modal?.cliente?.direccion ?? null,
    activo: modal?.cliente?.activo ?? true,
  });

  useEffect(() => {
    if (detailQuery.data) {
      setForm({
        nombre: detailQuery.data.nombre,
        codigo: detailQuery.data.codigo ?? null,
        telefono: detailQuery.data.telefono ?? null,
        direccion: detailQuery.data.direccion ?? null,
        activo: detailQuery.data.activo,
      });
    }
  }, [detailQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => apiClient.createCliente(normalizePayload(form)),
    onSuccess: async (cliente) => {
      toast.success(`Cliente '${cliente.nombre}' creado exitosamente`);
      await queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateCliente(clienteId!, normalizePayload(form) as Required<ClientePayload>),
    onSuccess: async () => {
      toast.success("Cliente actualizado exitosamente");
      await queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const disabled = isPending || detailQuery.isLoading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.nombre.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    if (form.codigo && form.codigo.trim().length > 0 && form.codigo.trim().length < 3) {
      toast.error("El código debe tener al menos 3 caracteres");
      return;
    }

    if (form.telefono && !/^\d{7,15}$/.test(form.telefono.trim())) {
      toast.error("El teléfono debe tener entre 7 y 15 dígitos");
      return;
    }

    if (isEdit) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  }

  function updateField<Key extends keyof Required<ClientePayload>>(key: Key, value: Required<ClientePayload>[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-neutral-950">{isEdit ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
            disabled={isPending}
            title="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <TextField
            disabled={disabled}
            id="cliente-nombre"
            label="Nombre del cliente"
            maxLength={100}
            onChange={(value) => updateField("nombre", value)}
            placeholder="Ej: Mercado Central"
            required
            value={form.nombre}
          />
          <TextField
            disabled={disabled}
            id="cliente-codigo"
            label="Código de cliente (opcional)"
            maxLength={20}
            onChange={(value) => updateField("codigo", value)}
            placeholder="Ej: CLI-001"
            value={form.codigo ?? ""}
          />
          <TextField
            disabled={disabled}
            id="cliente-telefono"
            label="Teléfono (opcional)"
            maxLength={15}
            onChange={(value) => updateField("telefono", value.replace(/\D/g, ""))}
            placeholder="Ej: 987654321"
            type="tel"
            value={form.telefono ?? ""}
          />
          <label className="mb-4 block">
            <span className="mb-2 block text-[13px] font-medium text-neutral-700">Dirección (opcional)</span>
            <textarea
              className="min-h-[72px] w-full resize-y rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100"
              disabled={disabled}
              maxLength={200}
              onChange={(event) => updateField("direccion", event.target.value)}
              placeholder="Ej: Jr. Ayacucho 451, Lima"
              value={form.direccion ?? ""}
            />
          </label>

          {isEdit ? (
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-[8px] bg-neutral-50 p-[14px]">
              <input
                type="checkbox"
                checked={form.activo}
                disabled={disabled}
                onChange={(event) => updateField("activo", event.target.checked)}
                className="h-[18px] w-[18px] accent-coronados-orange"
              />
              <span className="flex-1 text-[14px] font-medium text-neutral-800">Cliente activo</span>
              <span title="Desactivar impide registrar nuevas ventas para este cliente">
                <IconInfoCircle size={18} className="text-neutral-400" />
              </span>
            </label>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-neutral-200 bg-white px-5 py-[10px] text-[14px] font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-[8px] bg-coronados-orange px-5 py-[10px] text-[14px] font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextField({
  disabled,
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label htmlFor={id} className="mb-4 block">
      <span className="mb-2 block text-[13px] font-medium text-neutral-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100"
        disabled={disabled}
        maxLength={maxLength}
        minLength={required ? 2 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ConfirmDeleteModal({
  cliente,
  isPending,
  onCancel,
  onConfirm,
}: {
  cliente: Cliente;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[450px] rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <IconAlertTriangle size={48} stroke={2.2} className="mb-3 text-coronados-orange" />
          <h2 className="text-[18px] font-medium text-neutral-950">¿Eliminar cliente?</h2>
        </div>
        <p className="mt-3 text-center text-[14px] font-medium leading-6 text-neutral-600">
          Esta acción no se puede deshacer. Las ventas existentes se mantendrán pero no podrás registrar nuevas ventas para {cliente.nombre}.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[8px] border border-neutral-200 bg-white px-5 py-[10px] text-[14px] font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[8px] bg-[#C62828] px-5 py-[10px] text-[14px] font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientesSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-[142px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
      <div className="grid gap-[14px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[96px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[12px] border border-red-100 bg-red-50 px-5 py-4">
      <p className="text-[14px] font-semibold text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-[8px] border border-red-200 bg-white px-4 py-2 text-[13px] font-bold text-red-800 transition hover:bg-red-100"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ onCreate, search }: { onCreate: () => void; search: string }) {
  return (
    <div className="rounded-[12px] border border-neutral-200 bg-white px-5 py-12 text-center">
      <IconUserOff size={64} stroke={1.7} className="mx-auto text-neutral-300" />
      <p className="mt-4 text-[18px] font-bold text-neutral-950">
        {search ? `No se encontraron clientes con "${search}"` : "No hay clientes registrados"}
      </p>
      <p className="mt-2 text-[14px] font-medium text-neutral-500">
        {search ? "Ajusta la búsqueda para ver resultados." : "Crea tu primer cliente para comenzar."}
      </p>
      {!search ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-6 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} />
          Nuevo cliente
        </button>
      ) : null}
    </div>
  );
}

function normalizePayload(form: Required<ClientePayload>): Required<ClientePayload> {
  return {
    nombre: form.nombre.trim(),
    codigo: form.codigo?.trim() || null,
    telefono: form.telefono?.trim() || null,
    direccion: form.direccion?.trim() || null,
    activo: form.activo,
  };
}

function getInitials(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return nombre.trim().slice(0, 2).toUpperCase();
}

function formatKg(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCompactDate(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${year}${month}${day}`;
}

function formatLastPurchase(value: string | null | undefined, withTime = false) {
  if (!value) {
    return "Sin compras";
  }

  const date = new Date(value);
  const now = new Date();
  const dateKey = date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const nowKey = now.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Lima" });

  const time = date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (dateKey === nowKey) {
    return withTime ? `Hoy ${time}` : "Hoy";
  }

  if (dateKey === yesterdayKey) {
    return "Ayer";
  }

  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}
