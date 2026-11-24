export type Language = 'en' | 'id' | 'zh';

export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'mengindex_lang_v1';

export const LANGUAGE_OPTIONS: { code: Language; short: string; label: string; locale: string }[] = [
  { code: 'en', short: 'EN', label: 'English', locale: 'en-US' },
  { code: 'id', short: 'ID', label: 'Bahasa Indonesia', locale: 'id-ID' },
  { code: 'zh', short: '中文', label: '简体中文', locale: 'zh-CN' },
];

export function loadSavedLanguage(): Language {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'en' || raw === 'id' || raw === 'zh') return raw;
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_LANGUAGE;
}

export function getLocaleForLanguage(lang: Language): string {
  return LANGUAGE_OPTIONS.find((opt) => opt.code === lang)?.locale || 'en-US';
}

export interface Translations {
  navTableView: string;
  navSqlQuery: string;
  navSchema: string;
  refreshTab: string;
  syncing: string;
  switchLanguage: string;

  targetChromeTab: string;
  localIndexedDB: string;
  refreshDatabasesTitle: string;
  selectChromeTabAria: string;
  previewOriginSubtitle: string;
  searchDbPlaceholder: string;
  noDbFound: string;
  noDbMatch: string;
  createSampleDb: string;
  creatingDb: string;
  noObjectStore: string;
  resizeSidebarHint: string;

  readErrorTitle: string;
  selectStoreTitle: string;
  selectStoreDesc: string;
  seedSampleBtn: string;
  rowsLabel: string;
  showingTruncated: (loaded: string, total: string) => string;
  openInSql: string;
  quickSearchPlaceholder: string;
  clearSearchAria: string;
  addColumnFilter: string;
  resetFilter: string;
  resetAllFilters: string;
  selectColumnAria: string;
  selectOperatorAria: string;
  filterValuePlaceholder: string;
  removeFilterAria: string;
  emptyStoreMsg: (storeName: string) => string;
  noFilterMatchMsg: string;
  zeroRows: string;
  showingRange: (start: string, end: string, total: string) => string;
  perPage: string;
  prevPageAria: string;
  nextPageAria: string;

  sqlConsole: string;
  databasePrefix: string;
  history: string;
  runQuery: string;
  running: string;
  queryHistoryTitle: string;
  clearHistory: string;
  noHistory: string;
  sqlErrorBadge: string;
  sqlErrorHeading: string;
  sqlSuccess: string;
  scannedLabel: string;
  storePrefix: string;
  readyToRun: string;
  sqlEmptyHint: string;
  sqlEmptyHintOr: string;
  zeroResultRows: string;
  sqlPlaceholder: string;

  selectStoreSchema: string;
  columnsHeading: string;
  fieldsUnit: string;
  noRecords: string;
  colField: string;
  colType: string;
  colNullable: string;
  colSample: string;
  indexesHeading: string;
  noIndexes: string;
  idxName: string;
  idxKeyPath: string;
  idxUnique: string;
  idxMultiEntry: string;

  inspectorTitle: string;
  treeView: string;
  rawJson: string;
  copyAllJsonTitle: string;
  closeInspectorAria: string;
  jsonCopied: string;
  pathCopied: (path: string) => string;
  copyPathTitle: (path: string) => string;

  sampleReadyToast: string;
  sampleErrorToast: string;
  loadCatalogError: string;
  loadStoreError: string;
  noDbSelectedError: string;
  storeNotFoundError: (store: string, db: string, available: string) => string;
  sqlExecError: string;

  deleteSelected: (count: string) => string;
  clearSelection: string;
  selectAllRowsAria: string;
  selectRowAria: string;
  deleteRowTitle: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: (count: string, store: string) => string;
  confirmDeleteClearAllWarning: string;
  confirmDeleteBtn: (count: string) => string;
  deletingLabel: string;
  cancelLabel: string;
  deletedSuccessToast: (count: string, store: string) => string;
  deleteFailedError: string;
}
