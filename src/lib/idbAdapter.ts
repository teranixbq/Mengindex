import type { DatabaseInfo, IDBRecordRow, StoreReadResult, TargetTabInfo } from '../types/idb';
import { deleteLocalStoreRecords } from './idb/deleteLocal';
import { serializeLocalValue } from './idb/serialize';

export { seedSampleIndexedDB } from './idb/seedSample';

interface ChromeRuntimeLike {
  id?: string;
  sendMessage: (
    message: Record<string, unknown>,
    callback?: (response: Record<string, unknown>) => void
  ) => Promise<Record<string, unknown>> | void;
  lastError?: { message?: string };
}

declare global {
  interface Window {
    chrome?: {
      runtime?: ChromeRuntimeLike;
    };
  }
}

export function isChromeExtensionMode(): boolean {
  return typeof window !== 'undefined' && Boolean(window.chrome?.runtime?.id);
}

export function getInitialTargetFromUrl(): TargetTabInfo {
  const params = new URLSearchParams(window.location.search);
  const tabIdRaw = params.get('tabId');
  const tabId = tabIdRaw && !Number.isNaN(Number(tabIdRaw)) ? Number(tabIdRaw) : null;
  const url = params.get('url') || window.location.href;
  const origin = params.get('origin') || window.location.origin;
  const title = params.get('title') || (isChromeExtensionMode() ? 'Active Chrome Tab' : 'Local Browser IndexedDB');

  return { tabId, url, origin, title };
}

function sendExtensionMessage<T extends Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = window.chrome?.runtime;
    if (!runtime?.sendMessage) {
      reject(new Error('Chrome Extension runtime is not available.'));
      return;
    }

    try {
      const maybePromise = runtime.sendMessage(payload, (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message || 'Failed to reach service worker.'));
          return;
        }
        resolve((response || {}) as T);
      });

      if (maybePromise && typeof (maybePromise as Promise<Record<string, unknown>>).then === 'function') {
        (maybePromise as Promise<Record<string, unknown>>)
          .then((res) => resolve((res || {}) as T))
          .catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export async function listInspectableTabs(): Promise<TargetTabInfo[]> {
  if (!isChromeExtensionMode()) return [];
  const res = await sendExtensionMessage<{ ok: boolean; tabs?: TargetTabInfo[]; error?: string }>({
    type: 'LIST_TABS',
  });
  if (!res.ok) throw new Error(res.error || 'Failed to load Chrome tab list.');
  return res.tabs || [];
}

export async function listDatabases(tabId: number | null): Promise<DatabaseInfo[]> {
  if (isChromeExtensionMode()) {
    if (!tabId) {
      throw new Error('No target tab selected. Choose a tab or click the extension icon on a webpage.');
    }
    const res = await sendExtensionMessage<{ ok: boolean; databases?: DatabaseInfo[]; error?: string }>({
      type: 'LIST_DATABASES',
      tabId,
    });
    if (!res.ok) throw new Error(res.error || 'Failed to inspect IndexedDB from Chrome tab.');
    return res.databases || [];
  }

  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') {
    throw new Error('This browser does not support indexedDB.databases().');
  }

  const dbs = await indexedDB.databases();
  const catalog: DatabaseInfo[] = [];

  for (const dbMeta of dbs) {
    if (!dbMeta.name) continue;
    const dbName = dbMeta.name;
    try {
      const info = await new Promise<DatabaseInfo>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(req.error || new Error(`Failed to open ${dbName}`));
        req.onsuccess = async () => {
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames);
          const stores: DatabaseInfo['stores'] = [];

          if (storeNames.length > 0) {
            const tx = db.transaction(storeNames, 'readonly');
            for (const storeName of storeNames) {
              const store = tx.objectStore(storeName);
              const count = await new Promise<number>((resCount) => {
                const cReq = store.count();
                cReq.onsuccess = () => resCount(cReq.result || 0);
                cReq.onerror = () => resCount(0);
              });
              const indexes = Array.from(store.indexNames).map((idxName) => {
                const idx = store.index(idxName);
                return {
                  name: idx.name,
                  keyPath: idx.keyPath,
                  unique: idx.unique,
                  multiEntry: idx.multiEntry,
                };
              });
              stores.push({
                name: storeName,
                keyPath: store.keyPath,
                autoIncrement: store.autoIncrement,
                recordCount: count,
                indexes,
              });
            }
          }

          const result: DatabaseInfo = { name: db.name, version: db.version, stores };
          db.close();
          resolve(result);
        };
      });
      catalog.push(info);
    } catch (err) {
      catalog.push({
        name: dbName,
        version: dbMeta.version || 1,
        stores: [],
        error: err instanceof Error ? err.message : 'Failed to read database schema',
      });
    }
  }

  return catalog.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readStoreRecords(
  tabId: number | null,
  dbName: string,
  storeName: string,
  limit = 5000
): Promise<StoreReadResult> {
  if (isChromeExtensionMode()) {
    if (!tabId) throw new Error('Target tab is not selected.');
    const res = await sendExtensionMessage<{
      ok: boolean;
      rows?: IDBRecordRow[];
      totalCount?: number;
      truncated?: boolean;
      error?: string;
    }>({
      type: 'READ_STORE',
      tabId,
      dbName,
      storeName,
      limit,
    });
    if (!res.ok) throw new Error(res.error || `Failed to read object store "${storeName}".`);
    return {
      rows: res.rows || [],
      totalCount: res.totalCount ?? (res.rows?.length || 0),
      truncated: Boolean(res.truncated),
    };
  }

  return new Promise<StoreReadResult>((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onerror = () => reject(req.error || new Error(`Failed to open ${dbName}`));
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        reject(new Error(`Object store "${storeName}" not found in "${dbName}".`));
        return;
      }

      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const rows: IDBRecordRow[] = [];
      let totalCount = 0;

      const cReq = store.count();
      cReq.onsuccess = () => {
        totalCount = cReq.result || 0;
      };

      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (ev) => {
        const cursor = (ev.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor || rows.length >= limit) {
          db.close();
          resolve({
            rows,
            totalCount: Math.max(totalCount, rows.length),
            truncated: rows.length >= limit && totalCount > limit,
          });
          return;
        }

        const rawVal = cursor.value;
        const key = serializeLocalValue(cursor.key);
        if (
          rawVal &&
          typeof rawVal === 'object' &&
          !Array.isArray(rawVal) &&
          !(rawVal instanceof Date) &&
          !(rawVal instanceof Blob)
        ) {
          const serialized = serializeLocalValue(rawVal) as IDBRecordRow;
          if (!('_idbKey' in serialized)) serialized._idbKey = key;
          rows.push(serialized);
        } else {
          rows.push({ _idbKey: key, value: serializeLocalValue(rawVal) });
        }
        cursor.continue();
      };
      cursorReq.onerror = () => {
        db.close();
        reject(cursorReq.error || new Error('Failed to read IndexedDB cursor.'));
      };
    };
  });
}

export async function deleteStoreRecords(
  tabId: number | null,
  dbName: string,
  storeName: string,
  keys: unknown[],
  clearAll = false
): Promise<{ deletedCount: number }> {
  if (isChromeExtensionMode()) {
    if (!tabId) throw new Error('Target tab is not selected.');
    const res = await sendExtensionMessage<{
      ok: boolean;
      deletedCount?: number;
      error?: string;
    }>({
      type: 'DELETE_RECORDS',
      tabId,
      dbName,
      storeName,
      keys,
      clearAll,
    });
    if (!res.ok) throw new Error(res.error || `Failed to delete records from "${storeName}".`);
    return { deletedCount: res.deletedCount ?? keys.length };
  }

  return deleteLocalStoreRecords(dbName, storeName, keys, clearAll);
}
