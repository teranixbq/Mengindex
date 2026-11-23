import { Plus, Search, X } from 'lucide-react';
import type { Translations } from '../../lib/i18n';
import type { ColumnFilter, FilterOperator } from '../../types/idb';

interface TableFilterBarProps {
  columns: string[];
  globalSearch: string;
  onChangeGlobalSearch: (val: string) => void;
  filters: ColumnFilter[];
  onAddFilter: () => void;
  onUpdateFilter: (id: string, patch: Partial<ColumnFilter>) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
  hasActiveFilter: boolean;
  t: Translations;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_null', label: 'is null' },
  { value: 'is_not_null', label: 'is not null' },
];

export function TableFilterBar({
  columns,
  globalSearch,
  onChangeGlobalSearch,
  filters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearAll,
  hasActiveFilter,
  t,
}: TableFilterBarProps) {
  return (
    <div className="px-5 py-3 bg-[#111827] border-b border-[#1F2937] space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => onChangeGlobalSearch(e.target.value)}
            placeholder={t.quickSearchPlaceholder}
            aria-label={t.quickSearchPlaceholder}
            className="w-full bg-[#0B0F17] border border-[#1F2937] rounded-md pl-8 pr-8 py-1.5 text-xs text-[#F3F4F6] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => onChangeGlobalSearch('')}
              aria-label={t.clearSearchAria}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F3F4F6] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onAddFilter}
          disabled={columns.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#F3F4F6] bg-[#161F30] border border-[#1F2937] hover:border-[#38BDF8]/50 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#38BDF8]" />
          {t.addColumnFilter}
        </button>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#F3F4F6] transition-colors whitespace-nowrap cursor-pointer"
          >
            {t.resetFilter}
          </button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="space-y-2 pt-1">
          {filters.map((filter, idx) => (
            <div key={filter.id} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[#64748B] w-11 shrink-0">
                {idx === 0 ? 'WHERE' : 'AND'}
              </span>
              <select
                aria-label={t.selectColumnAria}
                value={filter.column}
                onChange={(e) => onUpdateFilter(filter.id, { column: e.target.value })}
                className="bg-[#0B0F17] border border-[#1F2937] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F3F4F6] focus:outline-none focus:border-[#38BDF8]"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                aria-label={t.selectOperatorAria}
                value={filter.operator}
                onChange={(e) => onUpdateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                className="bg-[#0B0F17] border border-[#1F2937] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#38BDF8] focus:outline-none focus:border-[#38BDF8]"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => onUpdateFilter(filter.id, { value: e.target.value })}
                  placeholder={t.filterValuePlaceholder}
                  aria-label={t.filterValuePlaceholder}
                  className="bg-[#0B0F17] border border-[#1F2937] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F3F4F6] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] min-w-[180px]"
                />
              )}
              <button
                type="button"
                onClick={() => onRemoveFilter(filter.id)}
                aria-label={t.removeFilterAria}
                className="p-1.5 rounded text-[#64748B] hover:text-[#F87171] hover:bg-[#161F30] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
