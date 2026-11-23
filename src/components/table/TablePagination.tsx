import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Translations } from '../../lib/i18n';

interface TablePaginationProps {
  totalFiltered: number;
  safePage: number;
  totalPages: number;
  pageSize: number;
  onChangePageSize: (size: number) => void;
  onChangePage: (updater: number | ((prev: number) => number)) => void;
  t: Translations;
  locale: string;
}

export function TablePagination({
  totalFiltered,
  safePage,
  totalPages,
  pageSize,
  onChangePageSize,
  onChangePage,
  t,
  locale,
}: TablePaginationProps) {
  return (
    <div className="px-5 py-2.5 bg-[#111827] border-t border-[#1F2937] flex items-center justify-between gap-4 text-xs text-[#94A3B8]">
      <div className="font-mono tabular-nums">
        {totalFiltered === 0
          ? t.zeroRows
          : t.showingRange(
              ((safePage - 1) * pageSize + 1).toLocaleString(locale),
              Math.min(safePage * pageSize, totalFiltered).toLocaleString(locale),
              totalFiltered.toLocaleString(locale)
            )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs">
          <span>{t.perPage}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onChangePageSize(Number(e.target.value));
              onChangePage(1);
            }}
            className="bg-[#0B0F17] border border-[#1F2937] rounded px-2 py-1 text-xs font-mono text-[#F3F4F6] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangePage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label={t.prevPageAria}
            className="p-1.5 rounded border border-[#1F2937] text-[#CBD5E1] hover:bg-[#161F30] disabled:opacity-35 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono tabular-nums text-[#F3F4F6]">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChangePage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label={t.nextPageAria}
            className="p-1.5 rounded border border-[#1F2937] text-[#CBD5E1] hover:bg-[#161F30] disabled:opacity-35 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
