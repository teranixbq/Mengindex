import { useMemo } from 'react';
import { computeColumnStats } from '../lib/exportUtils';
import type { Translations } from '../lib/i18n';
import type { IDBRecordRow, StoreSchema } from '../types/idb';

interface SchemaViewProps {
  dbName: string | null;
  storeSchema: StoreSchema | null;
  rows: IDBRecordRow[];
  t: Translations;
  locale: string;
}

export function SchemaView({ dbName, storeSchema, rows, t, locale }: SchemaViewProps) {
  const columnStats = useMemo(() => computeColumnStats(rows), [rows]);

  if (!dbName || !storeSchema) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-xs text-[#94A3B8]">{t.selectStoreSchema}</p>
      </div>
    );
  }

  const keyPathLabel = Array.isArray(storeSchema.keyPath)
    ? storeSchema.keyPath.join(', ')
    : storeSchema.keyPath || 'out-of-line';

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0B0F17]">
      {/* Compact Inline Metadata Bar */}
      <div className="px-5 py-2.5 bg-[#0E131F] border-b border-[#1F2937] flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono">
        <span className="text-[#F3F4F6] font-medium">
          {dbName} / {storeSchema.name}
        </span>
        <span className="text-[#94A3B8]">
          keyPath: <span className="text-[#38BDF8]">{keyPathLabel}</span>
        </span>
        <span className="text-[#94A3B8]">
          autoIncrement: <span className="text-[#E2E8F0]">{storeSchema.autoIncrement ? 'true' : 'false'}</span>
        </span>
        <span className="text-[#94A3B8] tabular-nums">
          records: <span className="text-[#E2E8F0]">{storeSchema.recordCount.toLocaleString(locale)}</span>
        </span>
        <span className="text-[#94A3B8] tabular-nums">
          indexes: <span className="text-[#E2E8F0]">{storeSchema.indexes.length}</span>
        </span>
      </div>

      {/* Dense Two-Section Structure Tables */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Columns */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-medium text-[#CBD5E1]">{t.columnsHeading}</h2>
            <span className="font-mono tabular-nums text-[#64748B]">
              {columnStats.length} {t.fieldsUnit}
            </span>
          </div>

          <div className="border border-[#1F2937] bg-[#111827] overflow-x-auto">
            {columnStats.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[#64748B]">{t.noRecords}</p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#0E131F] border-b border-[#1F2937]">
                  <tr className="text-[11px] font-mono text-[#64748B]">
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60">{t.colField}</th>
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60">{t.colType}</th>
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60 w-24">{t.colNullable}</th>
                    <th className="px-3 py-2 font-medium">{t.colSample}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/70 text-xs font-mono">
                  {columnStats.map((col) => (
                    <tr key={col.name} className="h-9 hover:bg-[#161F30] transition-colors">
                      <td className="px-3 py-1.5 text-[#F3F4F6] border-r border-[#1F2937]/40 whitespace-nowrap">
                        {col.name}
                      </td>
                      <td className="px-3 py-1.5 text-[#38BDF8] border-r border-[#1F2937]/40 whitespace-nowrap">
                        {col.types.join(' | ') || 'null'}
                      </td>
                      <td className="px-3 py-1.5 text-[#94A3B8] border-r border-[#1F2937]/40 whitespace-nowrap">
                        {col.nullCount > 0 ? 'YES' : 'NO'}
                      </td>
                      <td className="px-3 py-1.5 text-[#94A3B8] max-w-[360px] truncate" title={col.sampleValue}>
                        {col.sampleValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Indexes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-medium text-[#CBD5E1]">{t.indexesHeading}</h2>
            <span className="font-mono tabular-nums text-[#64748B]">{storeSchema.indexes.length}</span>
          </div>

          <div className="border border-[#1F2937] bg-[#111827] overflow-x-auto">
            {storeSchema.indexes.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[#64748B]">{t.noIndexes}</p>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#0E131F] border-b border-[#1F2937]">
                  <tr className="text-[11px] font-mono text-[#64748B]">
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60">{t.idxName}</th>
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60">{t.idxKeyPath}</th>
                    <th className="px-3 py-2 font-medium border-r border-[#1F2937]/60 w-24">{t.idxUnique}</th>
                    <th className="px-3 py-2 font-medium w-28">{t.idxMultiEntry}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/70 text-xs font-mono">
                  {storeSchema.indexes.map((idx) => (
                    <tr key={idx.name} className="h-9 hover:bg-[#161F30] transition-colors">
                      <td className="px-3 py-1.5 text-[#F3F4F6] border-r border-[#1F2937]/40 whitespace-nowrap">
                        {idx.name}
                      </td>
                      <td className="px-3 py-1.5 text-[#38BDF8] border-r border-[#1F2937]/40 whitespace-nowrap">
                        {Array.isArray(idx.keyPath) ? idx.keyPath.join(', ') : idx.keyPath}
                      </td>
                      <td className="px-3 py-1.5 text-[#94A3B8] border-r border-[#1F2937]/40">
                        {idx.unique ? 'true' : 'false'}
                      </td>
                      <td className="px-3 py-1.5 text-[#94A3B8]">
                        {idx.multiEntry ? 'true' : 'false'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
