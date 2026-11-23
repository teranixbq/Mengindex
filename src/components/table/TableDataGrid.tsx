import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from 'lucide-react';
import { formatCellValue } from '../../lib/exportUtils';
import type { Translations } from '../../lib/i18n';
import type { IDBRecordRow, SortState } from '../../types/idb';

interface TableDataGridProps {
  storeName: string;
  columns: string[];
  numericCols: Record<string, boolean>;
  rows: IDBRecordRow[];
  totalRowsUnfiltered: number;
  safePage: number;
  pageSize: number;
  sort: SortState;
  onSort: (col: string) => void;
  isLoading: boolean;
  hasActiveFilter: boolean;
  onClearAllFilters: () => void;
  selectedRow: IDBRecordRow | null;
  onSelectRow: (row: IDBRecordRow) => void;
  t: Translations;
}

export function TableDataGrid({
  storeName,
  columns,
  numericCols,
  rows,
  totalRowsUnfiltered,
  safePage,
  pageSize,
  sort,
  onSort,
  isLoading,
  hasActiveFilter,
  onClearAllFilters,
  selectedRow,
  onSelectRow,
  t,
}: TableDataGridProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-[#0B0F17] p-5 space-y-2">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="h-9 bg-[#111827] border border-[#1F2937]/60 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-[#0B0F17] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <Filter className="w-6 h-6 text-[#475569]" />
        <p className="text-sm font-medium text-[#F3F4F6]">
          {totalRowsUnfiltered === 0 ? t.emptyStoreMsg(storeName) : t.noFilterMatchMsg}
        </p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[#38BDF8] bg-[#111827] border border-[#1F2937] hover:border-[#38BDF8]/50 cursor-pointer"
          >
            {t.resetAllFilters}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0B0F17]">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-[#111827] border-b border-[#1F2937]">
          <tr>
            <th className="w-12 px-3 py-2.5 text-[11px] font-mono font-medium text-[#64748B] text-right border-r border-[#1F2937]/60 select-none">
              #
            </th>
            {columns.map((col) => {
              const isSorted = sort.column === col;
              const isNum = numericCols[col];
              return (
                <th
                  key={col}
                  className={`px-3 py-2.5 text-xs font-mono font-medium text-[#CBD5E1] border-r border-[#1F2937]/60 whitespace-nowrap select-none ${
                    isNum ? 'text-right' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col)}
                    className={`inline-flex items-center gap-1.5 hover:text-[#38BDF8] transition-colors cursor-pointer ${
                      isNum ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span>{col}</span>
                    {isSorted && sort.direction === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-[#38BDF8]" />
                    ) : isSorted && sort.direction === 'desc' ? (
                      <ArrowDown className="w-3 h-3 text-[#38BDF8]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#475569]" />
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1F2937]/70">
          {rows.map((row, idx) => {
            const absoluteIdx = (safePage - 1) * pageSize + idx + 1;
            const isSelected = selectedRow === row;
            return (
              <tr
                key={absoluteIdx}
                onClick={() => onSelectRow(row)}
                className={`h-[38px] transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#38BDF8]/12' : 'hover:bg-[#161F30]'
                }`}
              >
                <td className="px-3 py-2 text-[11px] font-mono tabular-nums text-[#64748B] text-right border-r border-[#1F2937]/40 select-none">
                  {absoluteIdx}
                </td>
                {columns.map((col) => {
                  const raw = row[col];
                  const formatted = formatCellValue(raw);
                  const isNum = numericCols[col];
                  const isNullish = raw === null || raw === undefined;
                  const isBool = typeof raw === 'boolean';
                  const isObj = typeof raw === 'object' && raw !== null;

                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 text-xs font-mono border-r border-[#1F2937]/40 max-w-[280px] truncate ${
                        isNum ? 'text-right tabular-nums' : 'text-left'
                      } ${
                        isNullish
                          ? 'text-[#64748B] italic'
                          : isBool
                            ? raw
                              ? 'text-[#4ADE80]'
                              : 'text-[#F87171]'
                            : isObj
                              ? 'text-[#7DD3FC]'
                              : 'text-[#E2E8F0]'
                      }`}
                      title={formatted}
                    >
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
