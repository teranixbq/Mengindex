import type { ColumnFilter, SortState, StoreSchema } from '../../types/idb';

export function buildSqlFromTableFilters(
  storeSchema: StoreSchema | null,
  filters: ColumnFilter[],
  sort: SortState,
  numericCols: Record<string, boolean>
): string {
  if (!storeSchema) return '';
  const storeId = /[^A-Za-z0-9_$]/.test(storeSchema.name) ? `\`${storeSchema.name}\`` : storeSchema.name;
  const clauses: string[] = [];

  for (const f of filters) {
    if (!f.column) continue;
    const col = f.column;
    if (f.operator === 'is_null') {
      clauses.push(`${col} IS NULL`);
      continue;
    }
    if (f.operator === 'is_not_null') {
      clauses.push(`${col} IS NOT NULL`);
      continue;
    }
    if (!f.value) continue;

    const numVal = Number(f.value);
    const isNum = !Number.isNaN(numVal) && f.value.trim() !== '' && numericCols[col];
    const literal = isNum ? String(numVal) : `'${f.value.replace(/'/g, "''")}'`;

    switch (f.operator) {
      case 'contains':
        clauses.push(`${col} ILIKE '%${f.value.replace(/'/g, "''")}%'`);
        break;
      case 'equals':
        clauses.push(`${col} = ${literal}`);
        break;
      case 'not_equals':
        clauses.push(`${col} != ${literal}`);
        break;
      case 'gt':
        clauses.push(`${col} > ${literal}`);
        break;
      case 'gte':
        clauses.push(`${col} >= ${literal}`);
        break;
      case 'lt':
        clauses.push(`${col} < ${literal}`);
        break;
      case 'lte':
        clauses.push(`${col} <= ${literal}`);
        break;
    }
  }

  let sql = `SELECT * FROM ${storeId}`;
  if (clauses.length > 0) sql += `\nWHERE ${clauses.join('\n  AND ')}`;
  if (sort.column && sort.direction) sql += `\nORDER BY ${sort.column} ${sort.direction.toUpperCase()}`;
  sql += `\nLIMIT 100;`;
  return sql;
}
