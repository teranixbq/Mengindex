import { Code2, Download, Trash2 } from 'lucide-react';
import type { Translations } from '../../lib/i18n';

interface TableHeaderBarProps {
  dbName: string;
  storeName: string;
  keyPathLabel: string;
  filteredCount: number;
  totalLoadedCount: number;
  totalStoreCount: number;
  truncated: boolean;
  hasActiveFilter: boolean;
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onOpenInSql: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  t: Translations;
  locale: string;
}

export function TableHeaderBar({
  dbName,
  storeName,
  keyPathLabel,
  filteredCount,
  totalLoadedCount,
  totalStoreCount,
  truncated,
  hasActiveFilter,
  selectedCount,
  onDeleteSelected,
  onClearSelection,
  onOpenInSql,
  onExportCsv,
  onExportJson,
  t,
  locale,
}: TableHeaderBarProps) {
  return (
    <div className="px-5 py-3 bg-[#0E131F] border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs min-w-0">
        <span className="text-[#94A3B8] truncate">{dbName}</span>
        <span aria-hidden="true" className="text-[#475569]">/</span>
        <span className="font-mono font-medium text-[#F3F4F6] truncate">{storeName}</span>
        <span aria-hidden="true" className="text-[#475569]">·</span>
        <span className="font-mono tabular-nums text-[#94A3B8]">
          {filteredCount.toLocaleString(locale)}
          {hasActiveFilter ? ` / ${totalLoadedCount.toLocaleString(locale)}` : ''} {t.rowsLabel}
        </span>
        <span aria-hidden="true" className="text-[#475569]">·</span>
        <span className="font-mono text-[#94A3B8]">keyPath: {keyPathLabel}</span>
        {truncated && (
          <>
            <span aria-hidden="true" className="text-[#475569]">·</span>
            <span className="text-[#F59E0B]">
              {t.showingTruncated(
                totalLoadedCount.toLocaleString(locale),
                totalStoreCount.toLocaleString(locale)
              )}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1.5 rounded-md text-xs text-[#94A3B8] hover:text-[#F3F4F6] transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.clearSelection}
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.deleteSelected(selectedCount.toLocaleString(locale))}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onOpenInSql}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#38BDF8] bg-[#111827] border border-[#1F2937] hover:border-[#38BDF8]/50 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          {t.openInSql}
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={filteredCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:text-[#F3F4F6] hover:border-[#334155] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
        <button
          type="button"
          onClick={onExportJson}
          disabled={filteredCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:text-[#F3F4F6] hover:border-[#334155] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          JSON
        </button>
      </div>
    </div>
  );
}
