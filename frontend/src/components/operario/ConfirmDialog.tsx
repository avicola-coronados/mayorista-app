import type { ReactNode } from "react";
import { IconLoader2 } from "@tabler/icons-react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmTone = "danger",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  confirmTone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  const confirmClass =
    confirmTone === "primary"
      ? "bg-coronados-green hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-[12px] bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
        <h3 className="text-[18px] font-bold text-neutral-950">{title}</h3>
        <div className="mt-2 text-[14px] font-medium text-neutral-600">{message}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-[8px] border border-neutral-200 px-4 py-2.5 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-bold text-white transition disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? <IconLoader2 size={18} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
