import { ChevronDown, ChevronRight, Database, Globe, RefreshCw, Table2 } from 'lucide-react';
import { useState } from 'react';
import type { Translations } from '../lib/i18n';
import type { DatabaseInfo, TargetTabInfo } from '../types/idb';

interface SidebarProps {
  width: number;
  isResizing: boolean;
  onStartResize: (e: React.MouseEvent) => void;
  onResetWidth: () => void;
  t: Translations;
  locale: string;
  isExtensionMode: boolean;
  targetTab: TargetTabInfo;
  availableTabs: TargetTabInfo[];
  onSwitchTab: (tab: TargetTabInfo) => void;
  databases: DatabaseInfo[];
  selectedDb: string | null;
  selectedStore: string | null;
  onSelectStore: (dbName: string, storeName: string) => void;
  isLoadingCatalog: boolean;
  onRefreshCatalog: () => void;
  onSeedSample?: () => void;
  isSeeding?: boolean;
}

export function Sidebar({
  width,
  isResizing,
  onStartResize,
  onResetWidth,
  t,
  locale,
  isExtensionMode,
  targetTab,
  availableTabs,
  onSwitchTab,
  databases,
  selectedDb,
  selectedStore,
  onSelectStore,
  isLoadingCatalog,
  onRefreshCatalog,
  onSeedSample,
  isSeeding,
}: SidebarProps) {
  const [collapsedDbs, setCollapsedDbs] = useState<Record<string, boolean>>({});
  const [dbFilter, setDbFilter] = useState('');

  const toggleDb = (dbName: string) => {
    setCollapsedDbs((prev) => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  const normalizedFilter = dbFilter.trim().toLowerCase();
  const filteredDatabases = databases
    .map((db) => {
      if (!normalizedFilter) return db;
      const dbMatch = db.name.toLowerCase().includes(normalizedFilter);
      const matchingStores = db.stores.filter((s) => s.name.toLowerCase().includes(normalizedFilter));
      if (!dbMatch && matchingStores.length === 0) return null;
      return {
        ...db,
        stores: dbMatch ? db.stores : matchingStores,
      };
    })
    .filter((d): d is DatabaseInfo => d !== null);

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 bg-[#111827] border-r border-[#1F2937] flex flex-col h-full overflow-hidden"
    >
      {/* Target Tab / Origin Header */}
      <div className="p-4 border-b border-[#1F2937] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#94A3B8]">
            {isExtensionMode ? t.targetChromeTab : t.localIndexedDB}
          </span>
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={isLoadingCatalog}
            title={t.refreshDatabasesTitle}
            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#161F30] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isExtensionMode && availableTabs.length > 0 ? (
          <div className="space-y-1.5">
            <select
              aria-label={t.selectChromeTabAria}
              value={targetTab.tabId ?? ''}
              onChange={(e) => {
                const chosen = availableTabs.find((tab) => String(tab.tabId) === e.target.value);
                if (chosen) onSwitchTab(chosen);
              }}
              className="w-full bg-[#0B0F17] border border-[#1F2937] rounded-md px-2.5 py-2 text-xs text-[#F3F4F6] focus:outline-none focus:border-[#38BDF8] truncate"
            >
              {!availableTabs.some((tab) => tab.tabId === targetTab.tabId) && targetTab.tabId && (
                <option value={targetTab.tabId}>
                  {targetTab.origin} ({targetTab.title})
                </option>
              )}
              {availableTabs.map((tab) => (
                <option key={tab.tabId} value={tab.tabId ?? ''}>
                  {tab.origin} — {tab.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] font-mono text-[#94A3B8] truncate" title={targetTab.url}>
              Tab #{targetTab.tabId ?? '—'} · {targetTab.origin}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#F3F4F6]">
              <Globe className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="truncate" title={targetTab.origin}>
                {targetTab.origin}
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] truncate" title={targetTab.title}>
              {isExtensionMode ? targetTab.title : t.previewOriginSubtitle}
            </p>
          </div>
        )}
      </div>

      {/* Store Filter Input */}
      <div className="px-4 py-3 border-b border-[#1F2937]">
        <input
          type="text"
          value={dbFilter}
          onChange={(e) => setDbFilter(e.target.value)}
          placeholder={t.searchDbPlaceholder}
          aria-label={t.searchDbPlaceholder}
          className="w-full bg-[#0B0F17] border border-[#1F2937] rounded-md px-3 py-1.5 text-xs text-[#F3F4F6] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-colors"
        />
      </div>

      {/* Database & Object Store Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {isLoadingCatalog ? (
          <div className="space-y-2.5 px-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-1.5 animate-pulse">
                <div className="h-4 bg-[#161F30] rounded w-3/4" />
                <div className="h-3.5 bg-[#161F30]/60 rounded w-1/2 ml-5" />
              </div>
            ))}
          </div>
        ) : filteredDatabases.length === 0 ? (
          <div className="px-3 py-6 text-center space-y-3">
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {databases.length === 0 ? t.noDbFound : t.noDbMatch}
            </p>
            {!isExtensionMode && databases.length === 0 && onSeedSample && (
              <button
                type="button"
                onClick={onSeedSample}
                disabled={isSeeding}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-[#161F30] border border-[#1F2937] text-[#38BDF8] hover:border-[#38BDF8]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSeeding ? t.creatingDb : t.createSampleDb}
              </button>
            )}
          </div>
        ) : (
          filteredDatabases.map((db) => {
            const isCollapsed = Boolean(collapsedDbs[db.name]);
            return (
              <div key={db.name} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleDb(db.name)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left hover:bg-[#161F30] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    )}
                    <Database className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                    <span className="text-xs font-medium text-[#F3F4F6] truncate" title={db.name}>
                      {db.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[#64748B] shrink-0">
                    v{db.version}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="pl-5 space-y-0.5">
                    {db.error ? (
                      <p className="px-2 py-1 text-[11px] text-[#F87171]">{db.error}</p>
                    ) : db.stores.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-[#64748B]">{t.noObjectStore}</p>
                    ) : (
                      db.stores.map((store) => {
                        const isSelected = selectedDb === db.name && selectedStore === store.name;
                        return (
                          <button
                            key={store.name}
                            type="button"
                            onClick={() => onSelectStore(db.name, store.name)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#161F30] text-[#38BDF8]'
                                : 'text-[#CBD5E1] hover:bg-[#161F30]/70 hover:text-[#F3F4F6]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Table2
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelected ? 'text-[#38BDF8]' : 'text-[#64748B]'
                                }`}
                              />
                              <span className="text-xs font-mono truncate" title={store.name}>
                                {store.name}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-mono tabular-nums shrink-0 ${
                                isSelected ? 'text-[#38BDF8]' : 'text-[#64748B]'
                              }`}
                            >
                              {store.recordCount.toLocaleString(locale)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resizable Right Edge Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t.resizeSidebarHint}
        title={t.resizeSidebarHint}
        onMouseDown={onStartResize}
        onDoubleClick={onResetWidth}
        className={`absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize transition-colors z-20 ${
          isResizing ? 'bg-[#38BDF8]/70' : 'hover:bg-[#38BDF8]/40'
        }`}
      />
    </aside>
  );
}
