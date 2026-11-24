import type { IDBRecordRow } from '../types/idb';

export type SuggestionKind = 'table' | 'column' | 'keyword' | 'function';

export interface FieldDescriptor {
  path: string;
  type: string;
}

export interface SqlSuggestion {
  label: string;
  insertText: string;
  kind: SuggestionKind;
  detail?: string;
  /** Optional caret offset from end of inserted text (e.g. -1 to place cursor inside parens) */
  cursorOffset?: number;
}

const SQL_KEYWORDS: { label: string; detail?: string }[] = [
  { label: 'SELECT' },
  { label: 'DELETE' },
  { label: 'DELETE FROM' },
  { label: 'DISTINCT' },
  { label: 'FROM' },
  { label: 'WHERE' },
  { label: 'AND' },
  { label: 'OR' },
  { label: 'NOT' },
  { label: 'ORDER BY' },
  { label: 'GROUP BY' },
  { label: 'ASC' },
  { label: 'DESC' },
  { label: 'LIMIT' },
  { label: 'OFFSET' },
  { label: 'AS' },
  { label: 'IN' },
  { label: 'NOT IN' },
  { label: 'LIKE' },
  { label: 'ILIKE' },
  { label: 'BETWEEN' },
  { label: 'IS NULL' },
  { label: 'IS NOT NULL' },
  { label: 'TRUE' },
  { label: 'FALSE' },
  { label: 'NULL' },
  { label: 'SHOW STORES' },
];

const SQL_FUNCTIONS: { label: string; insertText: string; detail: string; cursorOffset?: number }[] = [
  { label: 'COUNT(*)', insertText: 'COUNT(*)', detail: 'aggregate' },
  { label: 'COUNT()', insertText: 'COUNT()', detail: 'aggregate', cursorOffset: -1 },
  { label: 'SUM()', insertText: 'SUM()', detail: 'aggregate', cursorOffset: -1 },
  { label: 'AVG()', insertText: 'AVG()', detail: 'aggregate', cursorOffset: -1 },
  { label: 'MIN()', insertText: 'MIN()', detail: 'aggregate', cursorOffset: -1 },
  { label: 'MAX()', insertText: 'MAX()', detail: 'aggregate', cursorOffset: -1 },
];

function inferValueType(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Recursively extracts top-level and nested dot-path attributes (up to depth 3)
 * from sample records of an IndexedDB object store.
 */
export function extractStoreFields(rows: IDBRecordRow[]): FieldDescriptor[] {
  const fieldTypes = new Map<string, Set<string>>();

  const visit = (obj: Record<string, unknown>, prefix: string, depth: number) => {
    for (const key of Object.keys(obj)) {
      if (key === '_idbKey' && prefix === '' && Object.keys(obj).length > 2) continue;
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      const t = inferValueType(val);

      let set = fieldTypes.get(fullPath);
      if (!set) {
        set = new Set<string>();
        fieldTypes.set(fullPath, set);
      }
      if (val !== null && val !== undefined) {
        set.add(t);
      }

      if (
        depth < 3 &&
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        !('__type' in (val as Record<string, unknown>))
      ) {
        visit(val as Record<string, unknown>, fullPath, depth + 1);
      }
    }
  };

  for (const row of rows.slice(0, 80)) {
    if (row && typeof row === 'object') {
      visit(row, '', 1);
    }
  }

  return Array.from(fieldTypes.entries()).map(([path, types]) => ({
    path,
    type: types.size > 0 ? Array.from(types).slice(0, 2).join('|') : 'any',
  }));
}

/**
 * Extracts the target store name referenced after FROM in the current SQL query.
 */
export function detectFromStoreInSql(sql: string): string | null {
  const match = sql.match(/\bFROM\s+(?:[`"]([^`"]+)[`"]|([A-Za-z_$][A-Za-z0-9_$-]*))/i);
  if (!match) return null;
  return match[1] || match[2] || null;
}

export interface TokenRange {
  start: number;
  end: number;
  prefix: string;
}

export function getTokenRangeAtCursor(sql: string, cursorPos: number): TokenRange {
  let start = cursorPos;
  while (start > 0 && /[A-Za-z0-9_$.`]/.test(sql[start - 1])) {
    start--;
  }
  return {
    start,
    end: cursorPos,
    prefix: sql.slice(start, cursorPos),
  };
}

function detectClauseContext(sqlBeforeToken: string): 'from' | 'column' | 'operator' | 'general' {
  const trimmed = sqlBeforeToken.trimEnd();
  if (!trimmed) return 'general';

  // Immediately after FROM
  if (/\bFROM\s*$/i.test(trimmed)) {
    return 'from';
  }

  // After SELECT, WHERE, AND, OR, NOT, ORDER BY, GROUP BY, comma, or opening paren
  if (
    /\b(SELECT|DISTINCT|WHERE|AND|OR|NOT|BY)\s*$/i.test(trimmed) ||
    /[,(]\s*$/.test(trimmed)
  ) {
    return 'column';
  }

  // After a comparison or identifier in WHERE/ORDER
  if (/\bWHERE\s+[\w.`"]+$/i.test(trimmed)) {
    return 'operator';
  }

  return 'general';
}

export function getSqlSuggestions(
  sql: string,
  cursorPos: number,
  stores: string[],
  fields: FieldDescriptor[],
  manualTrigger = false
): { range: TokenRange; items: SqlSuggestion[] } {
  const range = getTokenRangeAtCursor(sql, cursorPos);
  const rawPrefix = range.prefix.replace(/^`/, '');
  const prefixLower = rawPrefix.toLowerCase();
  const beforeToken = sql.slice(0, range.start);
  const context = detectClauseContext(beforeToken);

  // Don't auto-pop inside single-quoted string literals
  const singleQuotesBefore = (beforeToken.match(/'/g) || []).length;
  if (singleQuotesBefore % 2 === 1) {
    return { range, items: [] };
  }

  // Require at least 1 typed char unless triggered manually (Ctrl+Space) or right after FROM / dot
  const afterDot = rawPrefix.endsWith('.');
  if (!manualTrigger && rawPrefix.length === 0 && context !== 'from' && !afterDot) {
    return { range, items: [] };
  }

  const candidates: (SqlSuggestion & { priority: number })[] = [];

  const scoreMatch = (target: string, basePriority: number): number | null => {
    const t = target.toLowerCase();
    if (!prefixLower) return basePriority;
    if (t === prefixLower) return null; // Already completely typed
    if (t.startsWith(prefixLower)) return basePriority + 100;
    if (t.includes(prefixLower)) return basePriority + 40;
    return null;
  };

  // 1. Tables / Object Stores
  const tablePriority = context === 'from' ? 500 : 120;
  for (const store of stores) {
    const score = scoreMatch(store, tablePriority);
    if (score !== null) {
      const needsQuote = /[^A-Za-z0-9_$]/.test(store);
      candidates.push({
        label: store,
        insertText: needsQuote ? `\`${store}\`` : store,
        kind: 'table',
        detail: 'store',
        priority: score,
      });
    }
  }

  // 2. Attributes / Columns (including nested dot-paths)
  const colPriority = context === 'column' || afterDot ? 450 : context === 'from' ? 50 : 240;
  for (const field of fields) {
    const score = scoreMatch(field.path, colPriority);
    if (score !== null) {
      candidates.push({
        label: field.path,
        insertText: field.path,
        kind: 'column',
        detail: field.type,
        priority: score,
      });
    }
  }

  // 3. Aggregate Functions (skip when right after FROM or typing nested dot path)
  if (context !== 'from' && !rawPrefix.includes('.')) {
    const fnPriority = context === 'column' ? 320 : 180;
    for (const fn of SQL_FUNCTIONS) {
      const score = scoreMatch(fn.label, fnPriority);
      if (score !== null) {
        candidates.push({
          label: fn.label,
          insertText: fn.insertText,
          kind: 'function',
          detail: fn.detail,
          cursorOffset: fn.cursorOffset,
          priority: score,
        });
      }
    }
  }

  // 4. SQL Keywords (skip when typing nested dot path)
  if (!rawPrefix.includes('.')) {
    const kwPriority = context === 'general' || context === 'operator' ? 300 : context === 'from' ? 40 : 190;
    for (const kw of SQL_KEYWORDS) {
      const score = scoreMatch(kw.label, kwPriority);
      if (score !== null) {
        candidates.push({
          label: kw.label,
          insertText: kw.label,
          kind: 'keyword',
          detail: 'SQL',
          priority: score,
        });
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));

  return {
    range,
    items: candidates.slice(0, 10).map(({ priority: _p, ...rest }) => rest),
  };
}
