import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserOff,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import {
  apiClient,
  type UserRole,
  type UsuarioAdmin,
  type UsuarioCreatePayload,
  type UsuarioUpdatePayload,
} from "../../services/api";
import { useAuthStore } from "../../store/authStore";

type ModalState =
  | {
      mode: "create" | "edit";
      usuario?: UsuarioAdmin;
    }
  | null;

const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "admin", label: "Admin", description: "Acceso total al sistema" },
  { value: "operario", label: "Operario", description: "Registro operativo diario" },
  { value: "cajero", label: "Cajero", description: "Caja y cobros" },
  { value: "oficina", label: "Oficina", description: "Gestión administrativa" },
];

export function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const usuariosQuery = useQuery({
    queryKey: ["admin-usuarios", debouncedSearch],
    queryFn: () => apiClient.getUsuarios(debouncedSearch),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteUsuario(id),
    onSuccess: async () => {
      toast.success("Usuario eliminado");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const usuarios = usuariosQuery.data?.usuarios ?? [];

  return (
    <AdminShell
      title="Usuarios"
      subtitle="Gestiona accesos y roles del sistema"
      actions={
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-6 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} stroke={2.4} />
          Nuevo usuario
        </button>
      }
    >
      <div className="p-[30px]">
        <div className="mb-5 flex items-center gap-3 max-md:flex-col max-md:items-stretch">
          <label className="flex h-10 w-full max-w-[420px] items-center gap-2 rounded-[8px] border border-coronados-green bg-white px-[14px] text-[14px] font-medium text-neutral-700 max-md:max-w-none">
            <IconSearch size={18} className="shrink-0 text-coronados-green" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario, nombre o email..."
              value={search}
            />
          </label>
        </div>

        {usuariosQuery.isLoading ? (
          <UsuariosSkeleton />
        ) : usuariosQuery.isError ? (
          <ErrorState
            message={(usuariosQuery.error as Error)?.message ?? "No se pudo cargar la lista de usuarios"}
            onRetry={() => usuariosQuery.refetch()}
          />
        ) : usuarios.length === 0 ? (
          <EmptyState onCreate={() => setModal({ mode: "create" })} search={debouncedSearch} />
        ) : (
          <section className="grid gap-[14px]">
            {usuarios.map((usuario) => (
              <UsuarioCard
                key={usuario.id}
                usuario={usuario}
                onDelete={() => setDeleteTarget(usuario)}
                onEdit={() => setModal({ mode: "edit", usuario })}
              />
            ))}
          </section>
        )}
      </div>

      {modal ? <UsuarioModal modal={modal} onClose={() => setModal(null)} /> : null}
      {deleteTarget ? (
        <ConfirmDeleteModal
          usuario={deleteTarget}
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </AdminShell>
  );
}

function UsuarioCard({
  onDelete,
  onEdit,
  usuario,
}: {
  onDelete: () => void;
  onEdit: () => void;
  usuario: UsuarioAdmin;
}) {
  const role = roleOptions.find((option) => option.value === usuario.role);
  const metadata = [
    usuario.nombre || "Sin nombre",
    usuario.email,
    `Creado: ${formatDate(usuario.created_at)}`,
    usuario.updater ? `Actualizado por ${usuario.updater.nombre ?? usuario.updater.username}` : null,
  ].filter(Boolean);

  return (
    <article
      className={`flex min-h-[96px] items-center justify-between gap-4 rounded-[12px] border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 ${
        usuario.activo ? "" : "opacity-60"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${
            usuario.activo ? "bg-[#E8F5E9] text-coronados-green" : "bg-[#F5F5F5] text-neutral-400"
          }`}
        >
          {getInitials(usuario.nombre || usuario.username)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-medium text-neutral-950">{usuario.username}</h2>
          <p className="mt-1 text-[13px] font-medium text-neutral-500">{metadata.join(" · ")}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-[#FEF0EB] px-[14px] py-[6px] text-[12px] font-bold text-coronados-orange">
            {role?.label ?? usuario.role}
          </span>
          <span
            className={`rounded-full px-[14px] py-[6px] text-[12px] font-bold ${
              usuario.activo ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {usuario.activo ? "Activo" : "Inactivo"}
          </span>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
          title="Editar usuario"
        >
          <IconEdit size={18} stroke={2.2} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#C62828] transition hover:bg-red-50"
          title="Eliminar usuario"
        >
          <IconTrash size={18} stroke={2.2} />
        </button>
      </div>
    </article>
  );
}

function UsuarioModal({ modal, onClose }: { modal: ModalState; onClose: () => void }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isEdit = modal?.mode === "edit";
  const usuarioId = modal?.usuario?.id;
  const detailQuery = useQuery({
    queryKey: ["admin-usuario", usuarioId],
    queryFn: () => apiClient.getUsuario(usuarioId!),
    enabled: isEdit && Boolean(usuarioId),
  });
  const [form, setForm] = useState({
    username: modal?.usuario?.username ?? "",
    password: "",
    nombre: modal?.usuario?.nombre ?? "",
    email: modal?.usuario?.email ?? "",
    role: modal?.usuario?.role ?? ("operario" as UserRole),
    activo: modal?.usuario?.activo ?? true,
  });

  useEffect(() => {
    if (detailQuery.data) {
      setForm({
        username: detailQuery.data.username,
        password: "",
        nombre: detailQuery.data.nombre ?? "",
        email: detailQuery.data.email ?? "",
        role: detailQuery.data.role,
        activo: detailQuery.data.activo,
      });
    }
  }, [detailQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => apiClient.createUsuario(normalizeCreatePayload(form)),
    onSuccess: async (usuario) => {
      toast.success(`Usuario '${usuario.username}' creado exitosamente`);
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateUsuario(usuarioId!, normalizeUpdatePayload(form)),
    onSuccess: async () => {
      toast.success("Usuario actualizado exitosamente");
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const disabled = isPending || detailQuery.isLoading;
  const editingSelf = isEdit && currentUser?.id === usuarioId;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.username.trim().length < 3) {
      toast.error("El usuario debe tener al menos 3 caracteres");
      return;
    }

    if (!isEdit && form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (isEdit && form.password && form.password.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email inválido");
      return;
    }

    if (isEdit) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5">
      <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-neutral-950">{isEdit ? "Editar usuario" : "Nuevo usuario"}</h2>
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
            id="usuario-username"
            label="Usuario"
            maxLength={50}
            onChange={(value) => setForm((current) => ({ ...current, username: value }))}
            placeholder="Ej: cajero01"
            required
            value={form.username}
          />
          <TextField
            disabled={disabled}
            id="usuario-nombre"
            label="Nombre real (opcional)"
            maxLength={100}
            onChange={(value) => setForm((current) => ({ ...current, nombre: value }))}
            placeholder="Ej: María Administradora"
            value={form.nombre}
          />
          <TextField
            disabled={disabled}
            id="usuario-email"
            label="Email (opcional)"
            maxLength={120}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="Ej: usuario@coronados.com"
            type="email"
            value={form.email}
          />
          <TextField
            disabled={disabled}
            id="usuario-password"
            label={isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
            maxLength={100}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder={isEdit ? "Dejar vacío para mantener la actual" : "Mínimo 8 caracteres"}
            required={!isEdit}
            type="password"
            value={form.password}
          />

          <fieldset className="mb-4">
            <legend className="mb-2 text-[13px] font-medium text-neutral-700">Rol</legend>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {roleOptions.map((option) => {
                const selected = form.role === option.value;

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-[10px] border p-3 transition ${
                      selected ? "border-coronados-green bg-[#E8F5E9]" : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={selected}
                      disabled={disabled}
                      onChange={() => setForm((current) => ({ ...current, role: option.value }))}
                      className="sr-only"
                    />
                    <span className={`block text-[14px] font-bold ${selected ? "text-coronados-green" : "text-neutral-900"}`}>
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[12px] font-medium text-neutral-500">{option.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {isEdit ? (
            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-[8px] bg-neutral-50 p-[14px]">
              <input
                type="checkbox"
                checked={form.activo}
                disabled={disabled || editingSelf}
                onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
                className="h-[18px] w-[18px] accent-coronados-orange"
              />
              <span className="flex-1 text-[14px] font-medium text-neutral-800">
                Usuario activo
                {editingSelf ? <span className="ml-2 text-[12px] text-neutral-500">(tu cuenta no se puede desactivar aquí)</span> : null}
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

function ConfirmDeleteModal({
  isPending,
  onCancel,
  onConfirm,
  usuario,
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  usuario: UsuarioAdmin;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const deletingSelf = currentUser?.id === usuario.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[450px] rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <IconAlertTriangle size={48} stroke={2.2} className="mb-3 text-coronados-orange" />
          <h2 className="text-[18px] font-medium text-neutral-950">¿Eliminar usuario?</h2>
        </div>
        <p className="mt-3 text-center text-[14px] font-medium leading-6 text-neutral-600">
          Se desactivará el acceso de {usuario.username}. El historial de auditoría se mantendrá.
        </p>
        {deletingSelf ? (
          <p className="mt-3 rounded-[8px] bg-red-50 px-3 py-2 text-center text-[13px] font-bold text-red-700">
            No puedes eliminar tu propio usuario.
          </p>
        ) : null}
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
            disabled={isPending || deletingSelf}
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
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

function UsuariosSkeleton() {
  return (
    <div className="grid gap-[14px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-[96px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
      ))}
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
        {search ? `No se encontraron usuarios con "${search}"` : "No hay usuarios registrados"}
      </p>
      <p className="mt-2 text-[14px] font-medium text-neutral-500">
        {search ? "Ajusta la búsqueda para ver resultados." : "Crea el primer usuario del sistema."}
      </p>
      {!search ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-6 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} />
          Nuevo usuario
        </button>
      ) : null}
    </div>
  );
}

function normalizeCreatePayload(form: {
  email: string;
  nombre: string;
  password: string;
  role: UserRole;
  username: string;
}): UsuarioCreatePayload {
  return {
    username: form.username.trim(),
    password: form.password,
    nombre: form.nombre.trim() || null,
    email: form.email.trim() || null,
    role: form.role,
  };
}

function normalizeUpdatePayload(form: {
  activo: boolean;
  email: string;
  nombre: string;
  password: string;
  role: UserRole;
  username: string;
}): UsuarioUpdatePayload {
  return {
    username: form.username.trim(),
    password: form.password || null,
    nombre: form.nombre.trim() || null,
    email: form.email.trim() || null,
    role: form.role,
    activo: form.activo,
  };
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.trim().slice(0, 2).toUpperCase();
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
