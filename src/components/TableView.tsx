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
import { getRowKeyId, TableDataGrid } from './table/TableDataGrid';
import { TableFilterBar } from './table/TableFilterBar';
import { TableHeaderBar } from './table/TableHeaderBar';
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
  checkedKeyIds: Set<string>;
  onToggleRowCheck: (row: IDBRecordRow) => void;
  onToggleAllPageCheck: (pageRows: IDBRecordRow[], shouldCheck: boolean) => void;
  onClearCheckedRows: () => void;
  onRequestDeleteRows: (rowsToDelete: IDBRecordRow[]) => void;
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
  checkedKeyIds,
  onToggleRowCheck,
  onToggleAllPageCheck,
  onClearCheckedRows,
  onRequestDeleteRows,
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

  const checkedRows = useMemo(
    () =>
      rows.filter((r) => {
        const id = getRowKeyId(r);
        return id !== null && checkedKeyIds.has(id);
      }),
    [rows, checkedKeyIds]
  );

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
      <TableHeaderBar
        dbName={dbName}
        storeName={storeSchema.name}
        keyPathLabel={keyPathLabel}
        filteredCount={filteredRows.length}
        totalLoadedCount={rows.length}
        totalStoreCount={totalCount}
        truncated={truncated}
        hasActiveFilter={hasActiveFilter}
        selectedCount={checkedRows.length}
        onDeleteSelected={() => onRequestDeleteRows(checkedRows)}
        onClearSelection={onClearCheckedRows}
        onOpenInSql={() => onOpenInSql(buildSqlFromTableFilters(storeSchema, filters, sort, numericCols))}
        onExportCsv={() => downloadAsCsv(`${dbName}_${storeSchema.name}`, columns, sortedRows)}
        onExportJson={() => downloadAsJson(`${dbName}_${storeSchema.name}`, sortedRows)}
        t={t}
        locale={locale}
      />

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
        checkedKeyIds={checkedKeyIds}
        onToggleRowCheck={onToggleRowCheck}
        onToggleAllPageCheck={onToggleAllPageCheck}
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
