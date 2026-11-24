import type { IDBRecordRow, SqlQueryResult } from '../../types/idb';
import type { ParsedQuery, SelectItem, WhereExpr } from './parser';

export function getNestedValue(row: IDBRecordRow, path: string): unknown {
  if (path in row) return row[path];
  if (!path.includes('.')) return undefined;
  const parts = path.split('.');
  let current: unknown = row;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchLike(actual: unknown, pattern: unknown, caseInsensitive: boolean): boolean {
  if (actual === null || actual === undefined) return false;
  const escaped = String(pattern ?? '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, caseInsensitive ? 'i' : '').test(String(actual));
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const numA = Number(a);
  const numB = Number(b);
  if (
    typeof a !== 'boolean' &&
    typeof b !== 'boolean' &&
    a !== '' &&
    b !== '' &&
    !Number.isNaN(numA) &&
    !Number.isNaN(numB)
  ) {
    return numA - numB;
  }
  return String(a).localeCompare(String(b));
}

function evalWhere(expr: WhereExpr, row: IDBRecordRow): boolean {
  switch (expr.kind) {
    case 'or':
      return evalWhere(expr.left, row) || evalWhere(expr.right, row);
    case 'and':
      return evalWhere(expr.left, row) && evalWhere(expr.right, row);
    case 'not':
      return !evalWhere(expr.expr, row);
    case 'null': {
      const v = getNestedValue(row, expr.field);
      const isNull = v === null || v === undefined;
      return expr.negated ? !isNull : isNull;
    }
    case 'in': {
      const v = getNestedValue(row, expr.field);
      const matched = expr.values.some((c) => v === c || String(v) === String(c));
      return expr.negated ? !matched : matched;
    }
    case 'between': {
      const v = getNestedValue(row, expr.field);
      if (v === null || v === undefined) return false;
      const inRange = compareValues(v, expr.low) >= 0 && compareValues(v, expr.high) <= 0;
      return expr.negated ? !inRange : inRange;
    }
    case 'compare': {
      const v = getNestedValue(row, expr.field);
      switch (expr.op) {
        case '=':
          if (typeof v === 'boolean' && typeof expr.value === 'boolean') return v === expr.value;
          if (typeof v === 'number' && typeof expr.value === 'number') return v === expr.value;
          return v === expr.value || (v !== null && v !== undefined && String(v) === String(expr.value));
        case '!=':
        case '<>':
          return !(v === expr.value || (v !== null && v !== undefined && String(v) === String(expr.value)));
        case '>':
          return v !== null && v !== undefined && compareValues(v, expr.value) > 0;
        case '>=':
          return v !== null && v !== undefined && compareValues(v, expr.value) >= 0;
        case '<':
          return v !== null && v !== undefined && compareValues(v, expr.value) < 0;
        case '<=':
          return v !== null && v !== undefined && compareValues(v, expr.value) <= 0;
        case 'LIKE':
          return matchLike(v, expr.value, false);
        case 'ILIKE':
          return matchLike(v, expr.value, true);
        case 'NOT_LIKE':
          return !matchLike(v, expr.value, false);
        case 'NOT_ILIKE':
          return !matchLike(v, expr.value, true);
        default:
          return false;
      }
    }
  }
}

export function filterRowsByWhere(rows: IDBRecordRow[], where?: WhereExpr): IDBRecordRow[] {
  return where ? rows.filter((r) => evalWhere(where, r)) : rows;
}

function computeAggregate(
  fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
  arg: string,
  groupRows: IDBRecordRow[]
): unknown {
  if (fn === 'COUNT') {
    if (arg === '*') return groupRows.length;
    return groupRows.filter((r) => {
      const v = getNestedValue(r, arg);
      return v !== null && v !== undefined;
    }).length;
  }

  const vals = groupRows
    .map((r) => getNestedValue(r, arg))
    .filter((v) => v !== null && v !== undefined);
  if (vals.length === 0) return null;

  if (fn === 'SUM' || fn === 'AVG') {
    const nums = vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return 0;
    const total = nums.reduce((acc, n) => acc + n, 0);
    return fn === 'SUM' ? Number(total.toFixed(4)) : Number((total / nums.length).toFixed(4));
  }

  if (fn === 'MIN') return vals.reduce((m, c) => (compareValues(c, m) < 0 ? c : m), vals[0]);
  if (fn === 'MAX') return vals.reduce((m, c) => (compareValues(c, m) > 0 ? c : m), vals[0]);
  return null;
}

export function executeParsedSql(
  parsed: ParsedQuery,
  rows: IDBRecordRow[],
  storeList?: { name: string; recordCount: number; keyPath: string | string[] | null }[]
): SqlQueryResult {
  const t0 = performance.now();

  if (parsed.type === 'SHOW_STORES') {
    const outRows: IDBRecordRow[] = (storeList || []).map((s) => ({
      store_name: s.name,
      record_count: s.recordCount,
      key_path: Array.isArray(s.keyPath) ? s.keyPath.join(', ') : s.keyPath ?? '(out-of-line)',
    }));
    return {
      columns: ['store_name', 'record_count', 'key_path'],
      rows: outRows,
      rowCount: outRows.length,
      scannedCount: outRows.length,
      executionMs: Number((performance.now() - t0).toFixed(2)),
      sourceStore: 'CATALOG',
    };
  }

  if (parsed.type === 'DELETE') {
    throw new Error('DELETE queries must be executed through the delete runner.');
  }

  const scannedCount = rows.length;
  const filtered = filterRowsByWhere(rows, parsed.where);
  const hasAgg = parsed.selectItems.some((item) => item.kind === 'agg');
  const isGrouped = parsed.groupBy.length > 0 || hasAgg;

  let projected: IDBRecordRow[] = [];
  let columns: string[] = [];

  if (isGrouped) {
    const groups = new Map<string, IDBRecordRow[]>();
    if (parsed.groupBy.length === 0) {
      groups.set('__ALL__', filtered);
    } else {
      for (const r of filtered) {
        const key = JSON.stringify(parsed.groupBy.map((g) => getNestedValue(r, g) ?? null));
        const list = groups.get(key);
        if (list) list.push(r);
        else groups.set(key, [r]);
      }
    }

    for (const item of parsed.selectItems) {
      if (item.kind === 'agg') {
        columns.push(item.alias || `${item.fn.toLowerCase()}_${item.arg === '*' ? 'all' : item.arg}`);
      } else if (item.kind === 'column') {
        columns.push(item.alias || item.path);
      }
    }

    for (const groupRows of groups.values()) {
      const sample = groupRows[0] || {};
      const outRow: IDBRecordRow = {};
      for (const item of parsed.selectItems) {
        if (item.kind === 'agg') {
          const colName = item.alias || `${item.fn.toLowerCase()}_${item.arg === '*' ? 'all' : item.arg}`;
          outRow[colName] = computeAggregate(item.fn, item.arg, groupRows);
        } else if (item.kind === 'column') {
          outRow[item.alias || item.path] = getNestedValue(sample, item.path);
        }
      }
      projected.push(outRow);
    }
  } else {
    const hasStar = parsed.selectItems.some((item) => item.kind === 'star');
    const explicitItems = parsed.selectItems.filter(
      (item): item is Extract<SelectItem, { kind: 'column' }> => item.kind === 'column'
    );

    if (hasStar) {
      const keyOrder = new Set<string>();
      for (const r of filtered) {
        for (const k of Object.keys(r)) keyOrder.add(k);
      }
      for (const item of explicitItems) keyOrder.add(item.alias || item.path);
      columns = Array.from(keyOrder);
      projected = filtered.map((r) => {
        if (explicitItems.length === 0) return r;
        const copy: IDBRecordRow = { ...r };
        for (const item of explicitItems) copy[item.alias || item.path] = getNestedValue(r, item.path);
        return copy;
      });
    } else {
      columns = explicitItems.map((item) => item.alias || item.path);
      projected = filtered.map((r) => {
        const out: IDBRecordRow = {};
        for (const item of explicitItems) out[item.alias || item.path] = getNestedValue(r, item.path);
        return out;
      });
    }
  }

  if (parsed.distinct) {
    const seen = new Set<string>();
    projected = projected.filter((r) => {
      const sig = JSON.stringify(r);
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  if (parsed.orderBy.length > 0) {
    projected = [...projected].sort((a, b) => {
      for (const ord of parsed.orderBy) {
        const cmp = compareValues(getNestedValue(a, ord.field), getNestedValue(b, ord.field));
        if (cmp !== 0) return ord.direction === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  const start = parsed.offset ?? 0;
  const end = parsed.limit !== undefined ? start + parsed.limit : undefined;
  const finalRows = start > 0 || end !== undefined ? projected.slice(start, end) : projected;

  return {
    columns,
    rows: finalRows,
    rowCount: finalRows.length,
    scannedCount,
    executionMs: Number((performance.now() - t0).toFixed(2)),
    sourceStore: parsed.fromStore,
  };
}
