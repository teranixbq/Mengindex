import { useCallback, useState } from 'react';
import type { PendingDeleteAction } from '../components/ConfirmDeleteModal';
import type { Translations } from '../lib/i18n';
import { readStoreRecords } from '../lib/idbAdapter';
import { executeParsedSql, filterRowsByWhere, parseSqlQuery } from '../lib/sqlEngine';
import type {
  DatabaseInfo,
  IDBRecordRow,
  QueryHistoryItem,
  SqlQueryResult,
} from '../types/idb';

const HISTORY_STORAGE_KEY = 'mengindex_sql_history_v1';
const DEFAULT_SQL =
  "SELECT orderId, status, totalAmount, shipping.city AS city\nFROM orders\nWHERE status IN ('paid', 'shipped')\nORDER BY totalAmount DESC\nLIMIT 25;";

function loadSavedHistory(): QueryHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function formatSafeStoreIdent(storeName: string): string {
  return /[^A-Za-z0-9_$]/.test(storeName) ? `\`${storeName}\`` : storeName;
}

interface UseSqlRunnerParams {
  activeDbInfo: DatabaseInfo | null;
  databases: DatabaseInfo[];
  selectedDb: string | null;
  selectedStore: string | null;
  storeRows: IDBRecordRow[];
  truncated: boolean;
  targetTabId: number | null;
  onClearSelectedRow: () => void;
  onRequestConfirmDelete: (action: PendingDeleteAction) => void;
  onExecuteDeleteRecords: (
    dbName: string,
    storeName: string,
    keys: unknown[],
    clearAll: boolean
  ) => Promise<number>;
  t: Translations;
}

export function useSqlRunner({
  activeDbInfo,
  databases,
  selectedDb,
  selectedStore,
  storeRows,
  truncated,
  targetTabId,
  onClearSelectedRow,
  onRequestConfirmDelete,
  onExecuteDeleteRecords,
  t,
}: UseSqlRunnerParams) {
  const [sqlText, setSqlText] = useState(DEFAULT_SQL);
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => loadSavedHistory());

  const appendHistory = useCallback(
    (query: string, dbName: string, rowCount: number, executionMs: number) => {
      const entry: QueryHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sql: query.trim(),
        dbName,
        timestamp: Date.now(),
        rowCount,
        executionMs,
      };
      setQueryHistory((prev) => {
        const next = [entry, ...prev.filter((item) => item.sql !== entry.sql)].slice(0, 30);
        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore quota errors
        }
        return next;
      });
    },
    []
  );

  const resetSqlResult = useCallback(() => {
    setSqlResult(null);
    setSqlError(null);
  }, []);

  const syncSqlForStore = useCallback((storeName: string, onlyIfEmpty = false) => {
    const template = `SELECT * FROM ${formatSafeStoreIdent(storeName)}\nLIMIT 50;`;
    if (onlyIfEmpty) setSqlText((prev) => (prev.trim() ? prev : template));
    else setSqlText(template);
  }, []);

  const handleExecuteSql = useCallback(
    async (query: string) => {
      setIsExecutingSql(true);
      setSqlError(null);
      onClearSelectedRow();

      try {
        const parsed = parseSqlQuery(query);
        const dbToUse = activeDbInfo || databases[0];
        if (!dbToUse) throw new Error(t.noDbSelectedError);

        if (parsed.type === 'SHOW_STORES') {
          setSqlResult(executeParsedSql(parsed, [], dbToUse.stores));
          return;
        }

        const targetStoreObj =
          dbToUse.stores.find((s) => s.name === parsed.fromStore) ||
          dbToUse.stores.find((s) => s.name.toLowerCase() === parsed.fromStore.toLowerCase());

        if (!targetStoreObj) {
          const available = dbToUse.stores.map((s) => s.name).join(', ');
          throw new Error(t.storeNotFoundError(parsed.fromStore, dbToUse.name, available));
        }

        const canReuseActive =
          dbToUse.name === selectedDb &&
          targetStoreObj.name === selectedStore &&
          storeRows.length > 0 &&
          !truncated;

        if (parsed.type === 'DELETE') {
          const t0 = performance.now();
          const clearAll = !parsed.where;
          let keysToDelete: unknown[] = [];
          let matchCount = 0;
          let scannedCount = targetStoreObj.recordCount;

          if (clearAll) {
            matchCount = targetStoreObj.recordCount;
            if (matchCount === 0) {
              const probe = await readStoreRecords(targetTabId, dbToUse.name, targetStoreObj.name, 1);
              matchCount = probe.totalCount;
              scannedCount = probe.totalCount;
            }
          } else {
            const dataset = canReuseActive
              ? storeRows
              : (await readStoreRecords(targetTabId, dbToUse.name, targetStoreObj.name, 50000)).rows;
            scannedCount = dataset.length;
            const matched = filterRowsByWhere(dataset, parsed.where);
            keysToDelete = matched.map((r) => r._idbKey).filter((k) => k !== undefined);
            matchCount = keysToDelete.length;
          }

          if (matchCount === 0) {
            const elapsed = Number((performance.now() - t0).toFixed(2));
            setSqlResult({
              columns: ['status', 'store', 'deleted_rows'],
              rows: [{ status: 'DELETED', store: targetStoreObj.name, deleted_rows: 0 }],
              rowCount: 1,
              scannedCount,
              executionMs: elapsed,
              sourceStore: targetStoreObj.name,
            });
            appendHistory(query, dbToUse.name, 0, elapsed);
            return;
          }

          onRequestConfirmDelete({
            dbName: dbToUse.name,
            storeName: targetStoreObj.name,
            keys: keysToDelete,
            count: matchCount,
            clearAll,
            sqlPreview: query.trim(),
            onConfirm: async () => {
              const execStart = performance.now();
              const deletedCount = await onExecuteDeleteRecords(
                dbToUse.name,
                targetStoreObj.name,
                keysToDelete,
                clearAll
              );
              const elapsed = Number((performance.now() - execStart).toFixed(2));
              setSqlResult({
                columns: ['status', 'store', 'deleted_rows'],
                rows: [{ status: 'DELETED', store: targetStoreObj.name, deleted_rows: deletedCount }],
                rowCount: 1,
                scannedCount,
                executionMs: elapsed,
                sourceStore: targetStoreObj.name,
              });
              appendHistory(query, dbToUse.name, deletedCount, elapsed);
            },
          });
          return;
        }

        const dataset = canReuseActive
          ? storeRows
          : (await readStoreRecords(targetTabId, dbToUse.name, targetStoreObj.name, 10000)).rows;

        const res = executeParsedSql(parsed, dataset, dbToUse.stores);
        setSqlResult(res);
        appendHistory(query, dbToUse.name, res.rowCount, res.executionMs);
      } catch (err) {
        setSqlResult(null);
        setSqlError(err instanceof Error ? err.message : t.sqlExecError);
      } finally {
        setIsExecutingSql(false);
      }
    },
    [
      activeDbInfo,
      appendHistory,
      databases,
      onClearSelectedRow,
      onExecuteDeleteRecords,
      onRequestConfirmDelete,
      selectedDb,
      selectedStore,
      storeRows,
      t,
      targetTabId,
      truncated,
    ]
  );

  const handleClearHistory = useCallback(() => {
    setQueryHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    sqlText,
    setSqlText,
    sqlResult,
    sqlError,
    isExecutingSql,
    queryHistory,
    handleExecuteSql,
    handleClearHistory,
    resetSqlResult,
    syncSqlForStore,
  };
}
