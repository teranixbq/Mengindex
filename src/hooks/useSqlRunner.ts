import { useCallback, useState } from 'react';
import type { Translations } from '../lib/i18n';
import { readStoreRecords } from '../lib/idbAdapter';
import { executeParsedSql, parseSqlQuery } from '../lib/sqlEngine';
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
  targetTabId: number | null;
  onClearSelectedRow: () => void;
  t: Translations;
}

export function useSqlRunner({
  activeDbInfo,
  databases,
  selectedDb,
  selectedStore,
  storeRows,
  targetTabId,
  onClearSelectedRow,
  t,
}: UseSqlRunnerParams) {
  const [sqlText, setSqlText] = useState(DEFAULT_SQL);
  const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>(() => loadSavedHistory());

  const resetSqlResult = useCallback(() => {
    setSqlResult(null);
    setSqlError(null);
  }, []);

  const syncSqlForStore = useCallback((storeName: string, onlyIfEmpty = false) => {
    const template = `SELECT * FROM ${formatSafeStoreIdent(storeName)}\nLIMIT 50;`;
    if (onlyIfEmpty) {
      setSqlText((prev) => (prev.trim() ? prev : template));
    } else {
      setSqlText(template);
    }
  }, []);

  const handleExecuteSql = useCallback(
    async (query: string) => {
      setIsExecutingSql(true);
      setSqlError(null);
      onClearSelectedRow();

      try {
        const parsed = parseSqlQuery(query);
        const dbToUse = activeDbInfo || databases[0];
        if (!dbToUse) {
          throw new Error(t.noDbSelectedError);
        }

        if (parsed.type === 'SHOW_STORES') {
          const res = executeParsedSql(parsed, [], dbToUse.stores);
          setSqlResult(res);
          return;
        }

        const targetStoreObj =
          dbToUse.stores.find((s) => s.name === parsed.fromStore) ||
          dbToUse.stores.find((s) => s.name.toLowerCase() === parsed.fromStore.toLowerCase());

        if (!targetStoreObj) {
          const available = dbToUse.stores.map((s) => s.name).join(', ');
          throw new Error(t.storeNotFoundError(parsed.fromStore, dbToUse.name, available));
        }

        let dataset: IDBRecordRow[];
        if (
          dbToUse.name === selectedDb &&
          targetStoreObj.name === selectedStore &&
          storeRows.length > 0
        ) {
          dataset = storeRows;
        } else {
          const fetched = await readStoreRecords(
            targetTabId,
            dbToUse.name,
            targetStoreObj.name,
            10000
          );
          dataset = fetched.rows;
        }

        const res = executeParsedSql(parsed, dataset, dbToUse.stores);
        setSqlResult(res);

        const entry: QueryHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sql: query.trim(),
          dbName: dbToUse.name,
          timestamp: Date.now(),
          rowCount: res.rowCount,
          executionMs: res.executionMs,
        };
        setQueryHistory((prev) => {
          const deduped = prev.filter((item) => item.sql !== entry.sql);
          const next = [entry, ...deduped].slice(0, 30);
          try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore quota errors
          }
          return next;
        });
      } catch (err) {
        setSqlResult(null);
        setSqlError(err instanceof Error ? err.message : t.sqlExecError);
      } finally {
        setIsExecutingSql(false);
      }
    },
    [
      activeDbInfo,
      databases,
      onClearSelectedRow,
      selectedDb,
      selectedStore,
      storeRows,
      t,
      targetTabId,
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
