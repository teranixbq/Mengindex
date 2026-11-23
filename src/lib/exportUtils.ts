import type { ColumnFilter, ColumnStat, IDBRecordRow } from '../types/idb';
import { getNestedValue } from './sqlEngine';

export function inferColumns(rows: IDBRecordRow[]): string[] {
  const seen = new Set<string>();
  const sample = rows.slice(0, 200);
  for (const row of sample) {
    for (const key of Object.keys(row)) {
      if (key !== '_idbKey') seen.add(key);
    }
  }
  const cols = Array.from(seen);
  // Put _idbKey at the front only if no natural id/key column exists or always if store is primitive
  if (sample.some((r) => '_idbKey' in r) && (cols.length === 0 || (cols.length === 1 && cols[0] === 'value'))) {
    return ['_idbKey', ...cols];
  }
  return cols;
}

export function formatCellValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NaN';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.__type) {
      return `${String(obj.__type)} (${obj.size ?? obj.byteLength ?? 0} B)`;
    }
    const keys = Object.keys(obj);
    if (keys.length <= 2) {
      return JSON.stringify(obj);
    }
    return `{${keys.slice(0, 2).join(', ')}, +${keys.length - 2}}`;
  }
  return String(value);
}

export function isNumericColumn(rows: IDBRecordRow[], col: string): boolean {
  let numCount = 0;
  let checked = 0;
  for (const r of rows.slice(0, 40)) {
    const v = r[col];
    if (v === null || v === undefined) continue;
    checked++;
    if (typeof v === 'number') numCount++;
  }
  return checked > 0 && numCount / checked >= 0.8;
}

export function applyFiltersToRows(
  rows: IDBRecordRow[],
  globalSearch: string,
  filters: ColumnFilter[]
): IDBRecordRow[] {
  const q = globalSearch.trim().toLowerCase();

  return rows.filter((row) => {
    // Global search across all fields
    if (q) {
      const hay = JSON.stringify(row).toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Structured column filters (AND logic)
    for (const f of filters) {
      if (!f.column) continue;
      const val = getNestedValue(row, f.column);

      if (f.operator === 'is_null') {
        if (val !== null && val !== undefined) return false;
        continue;
      }
      if (f.operator === 'is_not_null') {
        if (val === null || val === undefined) return false;
        continue;
      }

      if (f.value === '') continue;

      const strVal = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
      const target = f.value;

      switch (f.operator) {
        case 'contains':
          if (!strVal.toLowerCase().includes(target.toLowerCase())) return false;
          break;
        case 'equals':
          if (strVal.toLowerCase() !== target.toLowerCase()) return false;
          break;
        case 'not_equals':
          if (strVal.toLowerCase() === target.toLowerCase()) return false;
          break;
        case 'gt': {
          const n1 = Number(val);
          const n2 = Number(target);
          if (Number.isNaN(n1) || Number.isNaN(n2) ? strVal <= target : n1 <= n2) return false;
          break;
        }
        case 'gte': {
          const n1 = Number(val);
          const n2 = Number(target);
          if (Number.isNaN(n1) || Number.isNaN(n2) ? strVal < target : n1 < n2) return false;
          break;
        }
        case 'lt': {
          const n1 = Number(val);
          const n2 = Number(target);
          if (Number.isNaN(n1) || Number.isNaN(n2) ? strVal >= target : n1 >= n2) return false;
          break;
        }
        case 'lte': {
          const n1 = Number(val);
          const n2 = Number(target);
          if (Number.isNaN(n1) || Number.isNaN(n2) ? strVal > target : n1 > n2) return false;
          break;
        }
      }
    }

    return true;
  });
}

export function computeColumnStats(rows: IDBRecordRow[]): ColumnStat[] {
  const columns = inferColumns(rows);
  const total = rows.length;

  return columns.map((col) => {
    const types = new Set<string>();
    let nonNullCount = 0;
    let sampleValue = '—';

    for (const r of rows) {
      const v = r[col];
      if (v === null || v === undefined) continue;
      nonNullCount++;
      if (Array.isArray(v)) types.add('array');
      else types.add(typeof v);
      if (sampleValue === '—') {
        sampleValue = formatCellValue(v).slice(0, 64);
      }
    }

    return {
      name: col,
      types: Array.from(types),
      nonNullCount,
      nullCount: total - nonNullCount,
      fillRate: total > 0 ? Math.round((nonNullCount / total) * 100) : 0,
      sampleValue,
    };
  });
}

export function downloadAsJson(filename: string, rows: IDBRecordRow[]): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
  triggerBlobDownload(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

export function downloadAsCsv(filename: string, columns: string[], rows: IDBRecordRow[]): void {
  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(escapeCsv).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(','));
  const csv = [header, ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
