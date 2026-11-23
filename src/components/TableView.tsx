import { Code2, Download } from 'lucide-react';
import { useMemo } from 'react';
import {
  applyFiltersToRows,
  downloadAsCsv,
  downloadAsJson,
  inferColumns,
  isNumericColumn,
} from '../lib/exportUtils';
import type { Translations } from '../lib/i18n';
import { getNestedValue } from '../lib/sqlEngine';
import type { ColumnFilter, IDBRecordRow, SortState, StoreSchema } from '../types/idb';
import { buildSqlFromTableFilters } from './table/buildSqlFromFilters';
import { TableDataGrid } from './table/TableDataGrid';
import { TableFilterBar } from './table/TableFilterBar';
import { TablePagination } from './table/TablePagination';

interface TableViewProps {
  dbName: string | null;
  storeSchema: StoreSchema | null;
  rows: IDBRecordRow[];
  totalCount: number;
  truncated: boolean;
  isLoading: boolean;
  error: string | null;
  selectedRow: IDBRecordRow | null;
  onSelectRow: (row: IDBRecordRow) => void;
  onOpenInSql: (sql: string) => void;
  onSeedSample?: () => void;
  isExtensionMode: boolean;
  globalSearch: string;
  onChangeGlobalSearch: (val: string) => void;
  filters: ColumnFilter[];
  onChangeFilters: (updater: ColumnFilter[] | ((prev: ColumnFilter[]) => ColumnFilter[])) => void;
  sort: SortState;
  onChangeSort: (updater: SortState | ((prev: SortState) => SortState)) => void;
  page: number;
  onChangePage: (updater: number | ((prev: number) => number)) => void;
  pageSize: number;
  onChangePageSize: (size: number) => void;
  t: Translations;
  locale: string;
}

export function TableView({
  dbName,
  storeSchema,
  rows,
  totalCount,
  truncated,
  isLoading,
  error,
  selectedRow,
  onSelectRow,
  onOpenInSql,
  onSeedSample,
  isExtensionMode,
  globalSearch,
  onChangeGlobalSearch,
  filters,
  onChangeFilters,
  sort,
  onChangeSort,
  page,
  onChangePage,
  pageSize,
  onChangePageSize,
  t,
  locale,
}: TableViewProps) {
  const columns = useMemo(() => inferColumns(rows), [rows]);

  const numericCols = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const c of columns) map[c] = isNumericColumn(rows, c);
    return map;
  }, [columns, rows]);

  const filteredRows = useMemo(
    () => applyFiltersToRows(rows, globalSearch, filters),
    [rows, globalSearch, filters]
  );

  const sortedRows = useMemo(() => {
    if (!sort.column || !sort.direction) return filteredRows;
    const col = sort.column;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const va = getNestedValue(a, col);
      const vb = getNestedValue(b, col);
      if (va === vb) return 0;
      if (va === null || va === undefined) return -1 * dir;
      if (vb === null || vb === undefined) return 1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filteredRows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-[#111827] border border-[#DC2626]/40 rounded-lg p-6 space-y-2">
          <p className="text-xs font-semibold text-[#F87171]">{t.readErrorTitle}</p>
          <p className="text-sm text-[#CBD5E1] leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!dbName || !storeSchema) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-semibold text-[#F3F4F6]">{t.selectStoreTitle}</h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{t.selectStoreDesc}</p>
          {!isExtensionMode && onSeedSample && (
            <button
              type="button"
              onClick={onSeedSample}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#38BDF8] text-[#0B0F17] hover:bg-[#7DD3FC] transition-colors cursor-pointer"
            >
              {t.seedSampleBtn}
            </button>
          )}
        </div>
      </div>
    );
  }

  const keyPathLabel = Array.isArray(storeSchema.keyPath)
    ? storeSchema.keyPath.join(', ')
    : storeSchema.keyPath || 'out-of-line';
  const hasActiveFilter = globalSearch.trim().length > 0 || filters.length > 0;

  const clearAllFilters = () => {
    onChangeGlobalSearch('');
    onChangeFilters([]);
    onChangeSort({ column: null, direction: null });
    onChangePage(1);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <div className="px-5 py-3 bg-[#0E131F] border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-[#94A3B8] truncate">{dbName}</span>
          <span aria-hidden="true" className="text-[#475569]">/</span>
          <span className="font-mono font-medium text-[#F3F4F6] truncate">{storeSchema.name}</span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span className="font-mono tabular-nums text-[#94A3B8]">
            {filteredRows.length.toLocaleString(locale)}
            {hasActiveFilter ? ` / ${rows.length.toLocaleString(locale)}` : ''} {t.rowsLabel}
          </span>
          <span aria-hidden="true" className="text-[#475569]">·</span>
          <span className="font-mono text-[#94A3B8]">keyPath: {keyPathLabel}</span>
          {truncated && (
            <>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span className="text-[#F59E0B]">
                {t.showingTruncated(rows.length.toLocaleString(locale), totalCount.toLocaleString(locale))}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenInSql(buildSqlFromTableFilters(storeSchema, filters, sort, numericCols))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#38BDF8] bg-[#111827] border border-[#1F2937] hover:border-[#38BDF8]/50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            {t.openInSql}
          </button>
          <button
            type="button"
            onClick={() => downloadAsCsv(`${dbName}_${storeSchema.name}`, columns, sortedRows)}
            disabled={sortedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:text-[#F3F4F6] hover:border-[#334155] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => downloadAsJson(`${dbName}_${storeSchema.name}`, sortedRows)}
            disabled={sortedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#CBD5E1] bg-[#111827] border border-[#1F2937] hover:text-[#F3F4F6] hover:border-[#334155] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      <TableFilterBar
        columns={columns}
        globalSearch={globalSearch}
        onChangeGlobalSearch={(val) => {
          onChangeGlobalSearch(val);
          onChangePage(1);
        }}
        filters={filters}
        onAddFilter={() => {
          onChangeFilters((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              column: columns[0] || '',
              operator: 'contains',
              value: '',
            },
          ]);
          onChangePage(1);
        }}
        onUpdateFilter={(id, patch) => {
          onChangeFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
          onChangePage(1);
        }}
        onRemoveFilter={(id) => {
          onChangeFilters((prev) => prev.filter((f) => f.id !== id));
          onChangePage(1);
        }}
        onClearAll={clearAllFilters}
        hasActiveFilter={hasActiveFilter}
        t={t}
      />

      <TableDataGrid
        storeName={storeSchema.name}
        columns={columns}
        numericCols={numericCols}
        rows={paginatedRows}
        totalRowsUnfiltered={rows.length}
        safePage={safePage}
        pageSize={pageSize}
        sort={sort}
        onSort={(col) =>
          onChangeSort((prev) => {
            if (prev.column !== col) return { column: col, direction: 'asc' };
            if (prev.direction === 'asc') return { column: col, direction: 'desc' };
            return { column: null, direction: null };
          })
        }
        isLoading={isLoading}
        hasActiveFilter={hasActiveFilter}
        onClearAllFilters={clearAllFilters}
        selectedRow={selectedRow}
        onSelectRow={onSelectRow}
        t={t}
      />

      <TablePagination
        totalFiltered={sortedRows.length}
        safePage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        onChangePageSize={onChangePageSize}
        onChangePage={onChangePage}
        t={t}
        locale={locale}
      />
    </div>
  );
}
