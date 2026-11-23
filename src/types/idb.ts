export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface StoreSchema {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  recordCount: number;
  indexes: IndexSchema[];
}

export interface DatabaseInfo {
  name: string;
  version: number;
  stores: StoreSchema[];
  error?: string;
}

export interface TargetTabInfo {
  tabId: number | null;
  title: string;
  url: string;
  origin: string;
  restricted?: boolean;
  favIconUrl?: string;
}

export type IDBRecordRow = Record<string, unknown>;

export interface StoreReadResult {
  rows: IDBRecordRow[];
  totalCount: number;
  truncated: boolean;
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_null'
  | 'is_not_null';

export interface ColumnFilter {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

export interface SqlQueryResult {
  columns: string[];
  rows: IDBRecordRow[];
  rowCount: number;
  scannedCount: number;
  executionMs: number;
  sourceStore: string;
}

export interface QueryHistoryItem {
  id: string;
  sql: string;
  dbName: string;
  timestamp: number;
  rowCount: number;
  executionMs: number;
}

export interface ColumnStat {
  name: string;
  types: string[];
  nonNullCount: number;
  nullCount: number;
  fillRate: number;
  sampleValue: string;
}

export type ActiveView = 'table' | 'sql' | 'schema';
