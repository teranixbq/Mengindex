import { AlertCircle, Download } from 'lucide-react';
import { useMemo } from 'react';
import { downloadAsCsv, downloadAsJson, formatCellValue, isNumericColumn } from '../../lib/exportUtils';
import type { Translations } from '../../lib/i18n';
import type { IDBRecordRow, SqlQueryResult } from '../../types/idb';

interface SqlResultsGridProps {
  result: SqlQueryResult | null;
  error: string | null;
  selectedRow: IDBRecordRow | null;
  onSelectRow: (row: IDBRecordRow) => void;
  t: Translations;
  locale: string;
}

export function SqlResultsGrid({
  result,
  error,
  selectedRow,
  onSelectRow,
  t,
  locale,
}: SqlResultsGridProps) {
  const numericCols = useMemo(() => {
    if (!result) return {};
    const map: Record<string, boolean> = {};
    for (const c of result.columns) {
      map[c] = isNumericColumn(result.rows, c);
    }
    return map;
  }, [result]);

  return (
    <>
      <div className="px-5 py-2.5 bg-[#111827] border-b border-[#1F2937] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          {error ? (
            <span className="inline-flex items-center gap-1.5 text-[#F87171] font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {t.sqlErrorBadge}
            </span>
          ) : result ? (
            <div className="flex items-center gap-2 font-mono tabular-nums text-[#94A3B8]">
              <span className="text-[#4ADE80] font-medium">{t.sqlSuccess}</span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span className="text-[#F3F4F6]">
                {result.rowCount.toLocaleString(locale)} {t.rowsLabel}
              </span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span>
                {t.scannedLabel} {result.scannedCount.toLocaleString(locale)}
              </span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span>{result.executionMs} ms</span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span>
                {t.storePrefix} {result.sourceStore}
              </span>
            </div>
          ) : (
            <span className="text-[#64748B]">{t.readyToRun}</span>
          )}
        </div>

        {result && result.rows.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadAsCsv(`query_${result.sourceStore}`, result.columns, result.rows)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#CBD5E1] bg-[#0B0F17] border border-[#1F2937] hover:text-[#F3F4F6] cursor-pointer"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => downloadAsJson(`query_${result.sourceStore}`, result.rows)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#CBD5E1] bg-[#0B0F17] border border-[#1F2937] hover:text-[#F3F4F6] cursor-pointer"
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-[#0B0F17]">
        {error ? (
          <div className="p-6">
            <div className="max-w-2xl bg-[#111827] border border-[#DC2626]/40 rounded-lg p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F87171]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t.sqlErrorHeading}</span>
              </div>
              <p className="text-xs font-mono text-[#E2E8F0] leading-relaxed">{error}</p>
            </div>
          </div>
        ) : !result ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <p className="text-sm text-[#64748B]">
              {t.sqlEmptyHint} <span className="font-mono text-[#CBD5E1]">{t.runQuery}</span>{' '}
              {t.sqlEmptyHintOr} <span className="font-mono text-[#CBD5E1]">Ctrl/Cmd + Enter</span>.
            </p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <p className="text-sm text-[#94A3B8]">{t.zeroResultRows}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#111827] border-b border-[#1F2937]">
              <tr>
                <th className="w-12 px-3 py-2 text-[11px] font-mono font-medium text-[#64748B] text-right border-r border-[#1F2937]/60">
                  #
                </th>
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className={`px-3 py-2 text-xs font-mono font-medium text-[#CBD5E1] border-r border-[#1F2937]/60 whitespace-nowrap ${
                      numericCols[col] ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/70">
              {result.rows.map((row, idx) => {
                const isSelected = selectedRow === row;
                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectRow(row)}
                    className={`h-[38px] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#38BDF8]/12' : 'hover:bg-[#161F30]'
                    }`}
                  >
                    <td className="px-3 py-2 text-[11px] font-mono tabular-nums text-[#64748B] text-right border-r border-[#1F2937]/40">
                      {idx + 1}
                    </td>
                    {result.columns.map((col) => {
                      const raw = row[col];
                      const formatted = formatCellValue(raw);
                      const isNullish = raw === null || raw === undefined;
                      const isBool = typeof raw === 'boolean';
                      const isObj = typeof raw === 'object' && raw !== null;
                      return (
                        <td
                          key={col}
                          className={`px-3 py-2 text-xs font-mono border-r border-[#1F2937]/40 max-w-[300px] truncate ${
                            numericCols[col] ? 'text-right tabular-nums' : 'text-left'
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
        )}
      </div>
    </>
  );
}
