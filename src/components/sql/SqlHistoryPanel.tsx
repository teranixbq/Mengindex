import { Trash2 } from 'lucide-react';
import type { Translations } from '../../lib/i18n';
import type { QueryHistoryItem } from '../../types/idb';

interface SqlHistoryPanelProps {
  history: QueryHistoryItem[];
  onSelectQuery: (sql: string) => void;
  onClearHistory: () => void;
  t: Translations;
}

export function SqlHistoryPanel({
  history,
  onSelectQuery,
  onClearHistory,
  t,
}: SqlHistoryPanelProps) {
  return (
    <div className="w-72 bg-[#111827] border-l border-[#1F2937] flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2 border-b border-[#1F2937] flex items-center justify-between">
        <span className="text-xs font-medium text-[#CBD5E1]">{t.queryHistoryTitle}</span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#F87171] cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            {t.clearHistory}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-[#1F2937]">
        {history.length === 0 ? (
          <p className="p-3 text-xs text-[#64748B]">{t.noHistory}</p>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectQuery(item.sql)}
              className="w-full text-left p-2.5 hover:bg-[#161F30] transition-colors space-y-1 cursor-pointer"
            >
              <p className="text-[11px] font-mono text-[#E2E8F0] line-clamp-2">{item.sql}</p>
              <p className="text-[10px] font-mono tabular-nums text-[#64748B]">
                {item.dbName} · {item.rowCount} {t.rowsLabel} · {item.executionMs} ms
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
