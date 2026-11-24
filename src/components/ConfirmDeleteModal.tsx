import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Translations } from '../lib/i18n';

export interface PendingDeleteAction {
  dbName: string;
  storeName: string;
  keys: unknown[];
  count: number;
  clearAll: boolean;
  sqlPreview?: string;
  onConfirm: () => Promise<void>;
}

interface ConfirmDeleteModalProps {
  pending: PendingDeleteAction | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: Translations;
  locale: string;
}

export function ConfirmDeleteModal({
  pending,
  isDeleting,
  onCancel,
  onConfirm,
  t,
  locale,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pending, isDeleting, onCancel]);

  if (!pending) return null;

  const formattedCount = pending.count.toLocaleString(locale);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-lg shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F2937] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0" />
            <h2 id="confirm-delete-title" className="text-sm font-semibold text-[#F8FAFC]">
              {t.confirmDeleteTitle}
            </h2>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161F30] disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {t.confirmDeleteBody(formattedCount, `${pending.dbName} / ${pending.storeName}`)}
          </p>

          {pending.clearAll && (
            <div className="px-3 py-2 rounded bg-[#DC2626]/12 border border-[#DC2626]/40 text-xs text-[#FCA5A5]">
              {t.confirmDeleteClearAllWarning}
            </div>
          )}

          {pending.sqlPreview && (
            <pre className="p-2.5 rounded bg-[#0B0F17] border border-[#1F2937] text-[11px] font-mono text-[#E2E8F0] overflow-x-auto max-h-28">
              {pending.sqlPreview}
            </pre>
          )}
        </div>

        <div className="px-5 py-3 bg-[#0E131F] border-t border-[#1F2937] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:border-[#334155] hover:text-[#F8FAFC] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {t.cancelLabel}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#EF4444] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {isDeleting ? t.deletingLabel : t.confirmDeleteBtn(formattedCount)}
          </button>
        </div>
      </div>
    </div>
  );
}
