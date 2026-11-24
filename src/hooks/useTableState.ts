import { useCallback, useState } from 'react';
import { getRowKeyId } from '../components/table/TableDataGrid';
import type { ColumnFilter, IDBRecordRow, SortState } from '../types/idb';

export function useTableState() {
  const [tableGlobalSearch, setTableGlobalSearch] = useState('');
  const [tableFilters, setTableFilters] = useState<ColumnFilter[]>([]);
  const [tableSort, setTableSort] = useState<SortState>({ column: null, direction: null });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(50);
  const [checkedKeyIds, setCheckedKeyIds] = useState<Set<string>>(() => new Set());

  const clearCheckedRows = useCallback(() => {
    setCheckedKeyIds(new Set());
  }, []);

  const toggleRowCheck = useCallback((row: IDBRecordRow) => {
    const id = getRowKeyId(row);
    if (id === null) return;
    setCheckedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllPageCheck = useCallback((pageRows: IDBRecordRow[], shouldCheck: boolean) => {
    setCheckedKeyIds((prev) => {
      const next = new Set(prev);
      for (const row of pageRows) {
        const id = getRowKeyId(row);
        if (id === null) continue;
        if (shouldCheck) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const resetTableState = useCallback(() => {
    setTableGlobalSearch('');
    setTableFilters([]);
    setTableSort({ column: null, direction: null });
    setTablePage(1);
    setCheckedKeyIds(new Set());
  }, []);

  return {
    tableGlobalSearch,
    setTableGlobalSearch,
    tableFilters,
    setTableFilters,
    tableSort,
    setTableSort,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    checkedKeyIds,
    clearCheckedRows,
    toggleRowCheck,
    toggleAllPageCheck,
    resetTableState,
  };
}
