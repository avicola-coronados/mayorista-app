import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconEdit,
  IconHome,
  IconInfoCircle,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AdminShell } from "../../components/AdminShell";
import { apiClient, type Granja } from "../../services/api";

type ModalMode = "create" | "edit";

type ModalState = {
  mode: ModalMode;
  granja?: Granja;
} | null;

export function AdminGranjas() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Granja | null>(null);
  const granjasQuery = useQuery({
    queryKey: ["granjas"],
    queryFn: apiClient.getGranjas,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteGranja(id),
    onSuccess: async () => {
      toast.success("Granja eliminada");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["granjas"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const granjas = granjasQuery.data ?? [];

  return (
    <AdminShell
      title="Granjas"
      subtitle="Gestiona las granjas proveedoras"
      actions={
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="inline-flex items-center gap-2 rounded-[8px] bg-coronados-green px-6 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
        >
          <IconPlus size={18} stroke={2.4} />
          Nueva granja
        </button>
      }
    >
      <div className="p-[30px]">
        {granjasQuery.isLoading ? (
          <GranjasSkeleton />
        ) : granjasQuery.isError ? (
          <ErrorState
            message={(granjasQuery.error as Error)?.message ?? "No se pudo cargar la lista de granjas"}
            onRetry={() => granjasQuery.refetch()}
          />
        ) : (
          <section className="grid gap-[14px]">
            {granjas.map((granja) => (
              <GranjaCard
                key={granja.id}
                granja={granja}
                onDelete={() => setDeleteTarget(granja)}
                onEdit={() => setModal({ mode: "edit", granja })}
              />
            ))}
          </section>
        )}
      </div>

      {modal ? <GranjaModal modal={modal} onClose={() => setModal(null)} /> : null}

      {deleteTarget ? (
        <ConfirmDeleteModal
          granja={deleteTarget}
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      ) : null}
    </AdminShell>
  );
}

function GranjaCard({
  granja,
  onDelete,
  onEdit,
}: {
  granja: Granja;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const createdAt = granja.created_at
    ? new Date(granja.created_at).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  return (
    <article
      className={`flex min-h-[90px] items-center justify-between gap-4 rounded-[12px] border border-neutral-200 bg-white p-5 ${
        granja.activo ? "" : "opacity-60"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          granja.activo ? "bg-[#E8F5E9] text-coronados-green" : "bg-[#F5F5F5] text-neutral-500"
        }`}
      >
        <IconHome size={24} stroke={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[16px] font-medium text-neutral-950">{granja.nombre}</h2>
        <p className="mt-1 text-[13px] font-medium text-neutral-500">
          Creada: {createdAt} · {granja.total_entregas ?? 0} entregas registradas
        </p>
      </div>

      <span
        className={`rounded-full px-[14px] py-[6px] text-[12px] font-bold ${
          granja.activo ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        {granja.activo ? "Activa" : "Inactiva"}
      </span>

      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 items-center justify-center rounded-[8px] text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        title="Editar granja"
      >
        <IconEdit size={18} stroke={2.2} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#C62828] transition hover:bg-red-50"
        title="Eliminar granja"
      >
        <IconTrash size={18} stroke={2.2} />
      </button>
    </article>
  );
}

function GranjaModal({ modal, onClose }: { modal: ModalState; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = modal?.mode === "edit";
  const granjaId = modal?.granja?.id;
  const detailQuery = useQuery({
    queryKey: ["admin-granja", granjaId],
    queryFn: () => apiClient.getGranja(granjaId!),
    enabled: isEdit && Boolean(granjaId),
  });
  const [nombre, setNombre] = useState(modal?.granja?.nombre ?? "");
  const [activo, setActivo] = useState(modal?.granja?.activo ?? true);

  useEffect(() => {
    if (detailQuery.data) {
      setNombre(detailQuery.data.nombre);
      setActivo(detailQuery.data.activo);
    }
  }, [detailQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => apiClient.createGranja({ nombre: nombre.trim() }),
    onSuccess: async (data) => {
      toast.success(`Granja '${data.nombre}' creada exitosamente`);
      await queryClient.invalidateQueries({ queryKey: ["granjas"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => apiClient.updateGranja(granjaId!, { nombre: nombre.trim(), activo }),
    onSuccess: async () => {
      toast.success("Granja actualizada exitosamente");
      await queryClient.invalidateQueries({ queryKey: ["granjas"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const disabled = isPending || detailQuery.isLoading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nombre.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }

    if (isEdit) {
      updateMutation.mutate();
      return;
    }

    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[480px] rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-neutral-950">{isEdit ? "Editar granja" : "Nueva granja"}</h2>
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
          <label htmlFor="granja-nombre" className="text-[13px] font-medium text-neutral-700">
            Nombre de la granja
          </label>
          <input
            id="granja-nombre"
            className="mt-2 w-full rounded-[8px] border border-neutral-200 px-[14px] py-[10px] text-[14px] font-medium text-neutral-950 outline-none transition focus:border-coronados-orange focus:ring-4 focus:ring-orange-100"
            disabled={disabled}
            maxLength={50}
            minLength={2}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej: Redondos 3"
            required
            value={nombre}
          />

          {isEdit ? (
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-[8px] bg-neutral-50 p-[14px]">
              <input
                type="checkbox"
                checked={activo}
                disabled={disabled}
                onChange={(event) => setActivo(event.target.checked)}
                className="h-[18px] w-[18px] accent-coronados-orange"
              />
              <span className="flex-1 text-[14px] font-medium text-neutral-800">Granja activa</span>
              <span title="Desactivar impide registrar nuevas pesadas desde esta granja">
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

function ConfirmDeleteModal({
  granja,
  isPending,
  onCancel,
  onConfirm,
}: {
  granja: Granja;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[480px] rounded-[12px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <IconAlertTriangle size={48} stroke={2.2} className="mb-3 text-orange-500" />
          <h2 className="text-[18px] font-medium text-neutral-950">¿Eliminar granja?</h2>
        </div>
        <p className="mt-3 text-center text-[14px] font-medium leading-6 text-neutral-600">
          Esta acción no se puede deshacer. Las pesadas existentes se mantendrán pero no podrás registrar nuevas desde esta granja.
        </p>
        <div className="mt-6 flex justify-end gap-3">
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

function GranjasSkeleton() {
  return (
    <div className="grid gap-[14px]">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-[90px] animate-pulse rounded-[12px] border border-neutral-200 bg-white" />
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
