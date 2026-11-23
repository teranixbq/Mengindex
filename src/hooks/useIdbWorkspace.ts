import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Translations } from '../lib/i18n';
import {
  getInitialTargetFromUrl,
  listDatabases,
  listInspectableTabs,
  readStoreRecords,
  seedSampleIndexedDB,
} from '../lib/idbAdapter';
import { extractStoreFields, type FieldDescriptor } from '../lib/sqlAutocomplete';
import type {
  ColumnFilter,
  DatabaseInfo,
  IDBRecordRow,
  SortState,
  TargetTabInfo,
} from '../types/idb';

interface UseIdbWorkspaceParams {
  extensionMode: boolean;
  t: Translations;
  showToast: (message: string, kind?: 'info' | 'error') => void;
  onSyncSqlForStore: (storeName: string, onlyIfEmpty?: boolean) => void;
  onTabSwitched: () => void;
}

export function useIdbWorkspace({
  extensionMode,
  t,
  showToast,
  onSyncSqlForStore,
  onTabSwitched,
}: UseIdbWorkspaceParams) {
  const [targetTab, setTargetTab] = useState<TargetTabInfo>(() => getInitialTargetFromUrl());
  const [availableTabs, setAvailableTabs] = useState<TargetTabInfo[]>([]);

  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [storeRows, setStoreRows] = useState<IDBRecordRow[]>([]);
  const [storeFieldsCache, setStoreFieldsCache] = useState<Record<string, FieldDescriptor[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Persisted Table View state across view tab switches
  const [tableGlobalSearch, setTableGlobalSearch] = useState('');
  const [tableFilters, setTableFilters] = useState<ColumnFilter[]>([]);
  const [tableSort, setTableSort] = useState<SortState>({ column: null, direction: null });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(50);

  const [selectedRow, setSelectedRow] = useState<IDBRecordRow | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const activeDbInfo = useMemo(
    () => databases.find((d) => d.name === selectedDb) || null,
    [databases, selectedDb]
  );

  const activeStoreSchema = useMemo(
    () => activeDbInfo?.stores.find((s) => s.name === selectedStore) || null,
    [activeDbInfo, selectedStore]
  );

  const activeDbFieldsMap = useMemo(() => {
    if (!selectedDb) return {};
    const prefix = `${selectedDb}::`;
    const map: Record<string, FieldDescriptor[]> = {};
    for (const [key, fields] of Object.entries(storeFieldsCache)) {
      if (key.startsWith(prefix)) {
        map[key.slice(prefix.length)] = fields;
      }
    }
    return map;
  }, [selectedDb, storeFieldsCache]);

  const resetTableFilterState = useCallback(() => {
    setTableGlobalSearch('');
    setTableFilters([]);
    setTableSort({ column: null, direction: null });
    setTablePage(1);
  }, []);

  const fetchStoreData = useCallback(
    async (tabId: number | null, dbName: string, storeName: string) => {
      setIsLoadingStore(true);
      setStoreError(null);
      setSelectedRow(null);
      try {
        const res = await readStoreRecords(tabId, dbName, storeName, 5000);
        setStoreRows(res.rows);
        setTotalCount(res.totalCount);
        setTruncated(res.truncated);
        const extracted = extractStoreFields(res.rows);
        setStoreFieldsCache((prev) => ({
          ...prev,
          [`${dbName}::${storeName}`]: extracted,
        }));
      } catch (err) {
        setStoreRows([]);
        setTotalCount(0);
        setTruncated(false);
        setStoreError(err instanceof Error ? err.message : t.loadStoreError);
      } finally {
        setIsLoadingStore(false);
      }
    },
    [t.loadStoreError]
  );

  const refreshCatalog = useCallback(
    async (tabToInspect: TargetTabInfo, autoSeedIfEmpty = false) => {
      setIsLoadingCatalog(true);
      setCatalogError(null);
      setStoreError(null);

      try {
        if (extensionMode) {
          const tabs = await listInspectableTabs().catch(() => []);
          setAvailableTabs(tabs);
        }

        let dbs = await listDatabases(tabToInspect.tabId);
        if (!extensionMode && autoSeedIfEmpty && dbs.length === 0) {
          await seedSampleIndexedDB();
          dbs = await listDatabases(null);
        }

        setDatabases(dbs);

        if (dbs.length === 0) {
          setSelectedDb(null);
          setSelectedStore(null);
          setStoreRows([]);
          setTotalCount(0);
          return;
        }

        const currentValid =
          selectedDb &&
          selectedStore &&
          dbs.some((d) => d.name === selectedDb && d.stores.some((s) => s.name === selectedStore));

        let nextDb = currentValid ? selectedDb : null;
        let nextStore = currentValid ? selectedStore : null;

        if (!nextDb || !nextStore) {
          const firstWithStore = dbs.find((d) => d.stores.length > 0) || dbs[0];
          nextDb = firstWithStore.name;
          nextStore = firstWithStore.stores[0]?.name || null;
        }

        setSelectedDb(nextDb);
        setSelectedStore(nextStore);

        if (nextDb && nextStore) {
          onSyncSqlForStore(nextStore, true);
          await fetchStoreData(tabToInspect.tabId, nextDb, nextStore);
        } else {
          setStoreRows([]);
          setTotalCount(0);
        }
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : t.loadCatalogError);
        setDatabases([]);
        setStoreRows([]);
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    [extensionMode, fetchStoreData, onSyncSqlForStore, selectedDb, selectedStore, t.loadCatalogError]
  );

  useEffect(() => {
    refreshCatalog(targetTab, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectStore = useCallback(
    (dbName: string, storeName: string) => {
      const isDifferentStore = dbName !== selectedDb || storeName !== selectedStore;
      setSelectedDb(dbName);
      setSelectedStore(storeName);
      if (isDifferentStore) {
        resetTableFilterState();
      }
      onSyncSqlForStore(storeName, false);
      fetchStoreData(targetTab.tabId, dbName, storeName);
    },
    [fetchStoreData, onSyncSqlForStore, resetTableFilterState, selectedDb, selectedStore, targetTab.tabId]
  );

  const handleSwitchTab = useCallback(
    (nextTab: TargetTabInfo) => {
      setTargetTab(nextTab);
      setSelectedDb(null);
      setSelectedStore(null);
      setStoreFieldsCache({});
      resetTableFilterState();
      onTabSwitched();
      refreshCatalog(nextTab, false);
    },
    [onTabSwitched, refreshCatalog, resetTableFilterState]
  );

  const handleEnsureStoreFields = useCallback(
    (storeName: string) => {
      if (!selectedDb) return;
      const cacheKey = `${selectedDb}::${storeName}`;
      if (storeFieldsCache[cacheKey]) return;
      readStoreRecords(targetTab.tabId, selectedDb, storeName, 60)
        .then((res) => {
          const fields = extractStoreFields(res.rows);
          setStoreFieldsCache((prev) => ({ ...prev, [cacheKey]: fields }));
        })
        .catch(() => {
          // Ignore background prefetch errors
        });
    },
    [selectedDb, storeFieldsCache, targetTab.tabId]
  );

  const handleSeedSample = useCallback(async () => {
    setIsSeeding(true);
    try {
      await seedSampleIndexedDB();
      await refreshCatalog(targetTab, false);
      showToast(t.sampleReadyToast);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.sampleErrorToast, 'error');
    } finally {
      setIsSeeding(false);
    }
  }, [refreshCatalog, showToast, t.sampleErrorToast, t.sampleReadyToast, targetTab]);

  return {
    targetTab,
    availableTabs,
    databases,
    selectedDb,
    selectedStore,
    activeDbInfo,
    activeStoreSchema,
    activeDbFieldsMap,
    isLoadingCatalog,
    catalogError,
    storeRows,
    totalCount,
    truncated,
    isLoadingStore,
    storeError,
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
    selectedRow,
    setSelectedRow,
    isSeeding,
    refreshCatalog,
    handleSelectStore,
    handleSwitchTab,
    handleEnsureStoreFields,
    handleSeedSample,
  };
}
