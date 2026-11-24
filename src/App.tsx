import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDeleteModal, type PendingDeleteAction } from './components/ConfirmDeleteModal';
import { RowInspector } from './components/RowInspector';
import { SchemaView } from './components/SchemaView';
import { Sidebar } from './components/Sidebar';
import { SqlWorkbench } from './components/SqlWorkbench';
import { TableView } from './components/TableView';
import { TopBar } from './components/TopBar';
import { useIdbWorkspace } from './hooks/useIdbWorkspace';
import { useSidebarResize } from './hooks/useSidebarResize';
import { useSqlRunner } from './hooks/useSqlRunner';
import {
  getLocaleForLanguage,
  LANGUAGE_STORAGE_KEY,
  loadSavedLanguage,
  TRANSLATIONS,
  type Language,
} from './lib/i18n';
import { isChromeExtensionMode } from './lib/idbAdapter';
import type { ActiveView, IDBRecordRow } from './types/idb';

export default function App() {
  const extensionMode = useMemo(() => isChromeExtensionMode(), []);
  const [activeView, setActiveView] = useState<ActiveView>('table');

  const [language, setLanguage] = useState<Language>(() => loadSavedLanguage());
  const t = TRANSLATIONS[language];
  const locale = getLocaleForLanguage(language);

  const handleChangeLanguage = useCallback((nextLang: Language) => {
    setLanguage(nextLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage failures
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  }, [language]);

  const [toast, setToast] = useState<{ kind: 'info' | 'error'; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((message: string, kind: 'info' | 'error' = 'info') => {
    setToast({ message, kind });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3400);
  }, []);

  const {
    sidebarWidth,
    isResizingSidebar,
    handleStartSidebarResize,
    handleResetSidebarWidth,
  } = useSidebarResize();

  const syncSqlRef = useRef<(storeName: string, onlyIfEmpty?: boolean) => void>(() => {});
  const resetSqlRef = useRef<() => void>(() => {});

  const handleSyncSqlBridge = useCallback((storeName: string, onlyIfEmpty?: boolean) => {
    syncSqlRef.current(storeName, onlyIfEmpty);
  }, []);

  const handleTabSwitchedBridge = useCallback(() => {
    resetSqlRef.current();
  }, []);

  const workspace = useIdbWorkspace({
    extensionMode,
    t,
    locale,
    showToast,
    onSyncSqlForStore: handleSyncSqlBridge,
    onTabSwitched: handleTabSwitchedBridge,
  });

  const clearSelectedRow = useCallback(() => {
    workspace.setSelectedRow(null);
  }, [workspace.setSelectedRow]);

  const sql = useSqlRunner({
    activeDbInfo: workspace.activeDbInfo,
    databases: workspace.databases,
    selectedDb: workspace.selectedDb,
    selectedStore: workspace.selectedStore,
    storeRows: workspace.storeRows,
    truncated: workspace.truncated,
    targetTabId: workspace.targetTab.tabId,
    onClearSelectedRow: clearSelectedRow,
    onRequestConfirmDelete: setPendingDelete,
    onExecuteDeleteRecords: workspace.handleDeleteRecords,
    t,
  });

  syncSqlRef.current = sql.syncSqlForStore;
  resetSqlRef.current = sql.resetSqlResult;

  const handleOpenInSql = useCallback(
    (generatedSql: string) => {
      sql.setSqlText(generatedSql);
      setActiveView('sql');
      sql.handleExecuteSql(generatedSql);
    },
    [sql]
  );

  const handleRequestDeleteRows = useCallback(
    (rowsToDelete: IDBRecordRow[]) => {
      if (!workspace.selectedDb || !workspace.selectedStore) return;
      const keys = rowsToDelete.map((r) => r._idbKey).filter((k) => k !== undefined);
      if (keys.length === 0) return;

      const dbName = workspace.selectedDb;
      const storeName = workspace.selectedStore;
      setPendingDelete({
        dbName,
        storeName,
        keys,
        count: keys.length,
        clearAll: false,
        onConfirm: async () => {
          await workspace.handleDeleteRecords(dbName, storeName, keys, false);
        },
      });
    },
    [workspace.handleDeleteRecords, workspace.selectedDb, workspace.selectedStore]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await pendingDelete.onConfirm();
      setPendingDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.deleteFailedError, 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete, showToast, t.deleteFailedError]);

  return (
    <div
      className={`h-screen w-screen flex flex-col bg-[#0B0F17] text-[#F3F4F6] overflow-hidden ${
        isResizingSidebar ? 'select-none' : ''
      }`}
    >
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        language={language}
        onChangeLanguage={handleChangeLanguage}
        t={t}
        isRefreshing={workspace.isLoadingCatalog || workspace.isLoadingStore}
        onRefresh={() => workspace.refreshCatalog(workspace.targetTab, false)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          width={sidebarWidth}
          isResizing={isResizingSidebar}
          onStartResize={handleStartSidebarResize}
          onResetWidth={handleResetSidebarWidth}
          t={t}
          locale={locale}
          isExtensionMode={extensionMode}
          targetTab={workspace.targetTab}
          availableTabs={workspace.availableTabs}
          onSwitchTab={workspace.handleSwitchTab}
          databases={workspace.databases}
          selectedDb={workspace.selectedDb}
          selectedStore={workspace.selectedStore}
          onSelectStore={workspace.handleSelectStore}
          isLoadingCatalog={workspace.isLoadingCatalog}
          onRefreshCatalog={() => workspace.refreshCatalog(workspace.targetTab, false)}
          onSeedSample={extensionMode ? undefined : workspace.handleSeedSample}
          isSeeding={workspace.isSeeding}
        />

        <main className="flex-1 flex min-w-0 min-h-0 overflow-hidden">
          {activeView === 'table' && (
            <TableView
              dbName={workspace.selectedDb}
              storeSchema={workspace.activeStoreSchema}
              rows={workspace.storeRows}
              totalCount={workspace.totalCount}
              truncated={workspace.truncated}
              isLoading={workspace.isLoadingCatalog || workspace.isLoadingStore}
              error={workspace.catalogError || workspace.storeError}
              selectedRow={workspace.selectedRow}
              onSelectRow={workspace.setSelectedRow}
              checkedKeyIds={workspace.checkedKeyIds}
              onToggleRowCheck={workspace.toggleRowCheck}
              onToggleAllPageCheck={workspace.toggleAllPageCheck}
              onClearCheckedRows={workspace.clearCheckedRows}
              onRequestDeleteRows={handleRequestDeleteRows}
              onOpenInSql={handleOpenInSql}
              onSeedSample={extensionMode ? undefined : workspace.handleSeedSample}
              isExtensionMode={extensionMode}
              globalSearch={workspace.tableGlobalSearch}
              onChangeGlobalSearch={workspace.setTableGlobalSearch}
              filters={workspace.tableFilters}
              onChangeFilters={workspace.setTableFilters}
              sort={workspace.tableSort}
              onChangeSort={workspace.setTableSort}
              page={workspace.tablePage}
              onChangePage={workspace.setTablePage}
              pageSize={workspace.tablePageSize}
              onChangePageSize={workspace.setTablePageSize}
              t={t}
              locale={locale}
            />
          )}

          {activeView === 'sql' && (
            <SqlWorkbench
              activeDb={workspace.activeDbInfo}
              selectedStore={workspace.selectedStore}
              storeFieldsMap={workspace.activeDbFieldsMap}
              onEnsureStoreFields={workspace.handleEnsureStoreFields}
              sqlText={sql.sqlText}
              onChangeSql={sql.setSqlText}
              onExecuteSql={sql.handleExecuteSql}
              isExecuting={sql.isExecutingSql}
              result={sql.sqlResult}
              error={sql.sqlError}
              history={sql.queryHistory}
              onClearHistory={sql.handleClearHistory}
              selectedRow={workspace.selectedRow}
              onSelectRow={workspace.setSelectedRow}
              t={t}
              locale={locale}
            />
          )}

          {activeView === 'schema' && (
            <SchemaView
              dbName={workspace.selectedDb}
              storeSchema={workspace.activeStoreSchema}
              rows={workspace.storeRows}
              t={t}
              locale={locale}
            />
          )}

          {(activeView === 'table' || activeView === 'sql') && workspace.selectedRow && (
            <RowInspector
              row={workspace.selectedRow}
              onClose={() => workspace.setSelectedRow(null)}
              onDeleteRow={
                activeView === 'table'
                  ? (row) => handleRequestDeleteRows([row])
                  : undefined
              }
              t={t}
            />
          )}
        </main>
      </div>

      <ConfirmDeleteModal
        pending={pendingDelete}
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        t={t}
        locale={locale}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-md border text-xs leading-relaxed shadow-lg ${
            toast.kind === 'error'
              ? 'bg-[#111827] border-[#DC2626]/50 text-[#FCA5A5]'
              : 'bg-[#111827] border-[#38BDF8]/40 text-[#F3F4F6]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
