import { Clock, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Translations } from '../lib/i18n';
import { detectFromStoreInSql, type FieldDescriptor } from '../lib/sqlAutocomplete';
import type { DatabaseInfo, IDBRecordRow, QueryHistoryItem, SqlQueryResult } from '../types/idb';
import { SqlEditorPane } from './sql/SqlEditorPane';
import { SqlHistoryPanel } from './sql/SqlHistoryPanel';
import { SqlResultsGrid } from './sql/SqlResultsGrid';

interface SqlWorkbenchProps {
  activeDb: DatabaseInfo | null;
  selectedStore: string | null;
  storeFieldsMap: Record<string, FieldDescriptor[]>;
  onEnsureStoreFields: (storeName: string) => void;
  sqlText: string;
  onChangeSql: (sql: string) => void;
  onExecuteSql: (sql: string) => Promise<void>;
  isExecuting: boolean;
  result: SqlQueryResult | null;
  error: string | null;
  history: QueryHistoryItem[];
  onClearHistory: () => void;
  selectedRow: IDBRecordRow | null;
  onSelectRow: (row: IDBRecordRow) => void;
  t: Translations;
  locale: string;
}

export function SqlWorkbench({
  activeDb,
  selectedStore,
  storeFieldsMap,
  onEnsureStoreFields,
  sqlText,
  onChangeSql,
  onExecuteSql,
  isExecuting,
  result,
  error,
  history,
  onClearHistory,
  selectedRow,
  onSelectRow,
  t,
  locale,
}: SqlWorkbenchProps) {
  const [showHistory, setShowHistory] = useState(false);

  const storeNames = useMemo(() => activeDb?.stores.map((s) => s.name) || [], [activeDb]);

  const inferredStoreName = useMemo(() => {
    const fromStore = detectFromStoreInSql(sqlText);
    if (fromStore && activeDb) {
      const matched = activeDb.stores.find(
        (s) => s.name === fromStore || s.name.toLowerCase() === fromStore.toLowerCase()
      );
      if (matched) return matched.name;
    }
    return selectedStore || activeDb?.stores[0]?.name || null;
  }, [sqlText, activeDb, selectedStore]);

  useEffect(() => {
    if (inferredStoreName && !storeFieldsMap[inferredStoreName]) {
      onEnsureStoreFields(inferredStoreName);
    }
  }, [inferredStoreName, storeFieldsMap, onEnsureStoreFields]);

  const activeFields = useMemo(
    () => (inferredStoreName ? storeFieldsMap[inferredStoreName] || [] : []),
    [inferredStoreName, storeFieldsMap]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <div className="bg-[#111827] border-b border-[#1F2937] flex flex-col shrink-0">
        <div className="px-5 py-2.5 border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-medium text-[#F3F4F6]">{t.sqlConsole}</span>
            {activeDb && (
              <>
                <span aria-hidden="true" className="text-[#475569]">·</span>
                <span className="font-mono text-[#94A3B8] truncate">
                  {t.databasePrefix} {activeDb.name}
                </span>
              </>
            )}
            {inferredStoreName && (
              <>
                <span aria-hidden="true" className="text-[#475569]">·</span>
                <span className="font-mono text-[#64748B] truncate">{inferredStoreName}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                showHistory
                  ? 'bg-[#161F30] text-[#38BDF8] border-[#38BDF8]/50'
                  : 'bg-[#0B0F17] text-[#CBD5E1] border-[#1F2937] hover:text-[#F3F4F6]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {t.history} ({history.length})
            </button>
            <button
              type="button"
              onClick={() => onExecuteSql(sqlText)}
              disabled={isExecuting || !activeDb}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-[#38BDF8] text-[#0B0F17] hover:bg-[#7DD3FC] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isExecuting ? t.running : t.runQuery}
            </button>
          </div>
        </div>

        <div className="flex min-h-[168px] max-h-[260px]">
          <SqlEditorPane
            sqlText={sqlText}
            onChangeSql={onChangeSql}
            onExecuteSql={onExecuteSql}
            storeNames={storeNames}
            activeFields={activeFields}
            t={t}
          />
          {showHistory && (
            <SqlHistoryPanel
              history={history}
              onSelectQuery={(sql) => {
                onChangeSql(sql);
                onExecuteSql(sql);
              }}
              onClearHistory={onClearHistory}
              t={t}
            />
          )}
        </div>
      </div>

      <SqlResultsGrid
        result={result}
        error={error}
        selectedRow={selectedRow}
        onSelectRow={onSelectRow}
        t={t}
        locale={locale}
      />
    </div>
  );
}
