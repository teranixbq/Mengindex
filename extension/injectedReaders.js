/**
 * Functions injected into the target Chrome tab's MAIN world via chrome.scripting.executeScript.
 * Each function must remain self-contained (no outer closures) because Chrome serializes it.
 */

export async function injectedListDatabases() {
  if (typeof indexedDB === 'undefined') {
    return { ok: false, error: 'IndexedDB is not available on this page.' };
  }
  if (typeof indexedDB.databases !== 'function') {
    return {
      ok: false,
      error: 'This browser does not support indexedDB.databases(). Please use a recent Chrome version.',
    };
  }

  const dbs = await indexedDB.databases();
  const catalog = [];

  for (const dbMeta of dbs) {
    if (!dbMeta || !dbMeta.name) continue;
    const dbName = dbMeta.name;

    try {
      const dbInfo = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(req.error || new Error(`Failed to open database ${dbName}`));
        req.onblocked = () => reject(new Error(`Database ${dbName} is currently blocked.`));
        req.onsuccess = async () => {
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames);
          const stores = [];

          if (storeNames.length > 0) {
            try {
              const tx = db.transaction(storeNames, 'readonly');
              for (const storeName of storeNames) {
                const store = tx.objectStore(storeName);
                const count = await new Promise((resCount) => {
                  try {
                    const countReq = store.count();
                    countReq.onsuccess = () => resCount(countReq.result || 0);
                    countReq.onerror = () => resCount(0);
                  } catch {
                    resCount(0);
                  }
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
            } catch {
              for (const storeName of storeNames) {
                stores.push({
                  name: storeName,
                  keyPath: null,
                  autoIncrement: false,
                  recordCount: 0,
                  indexes: [],
                });
              }
            }
          }

          const result = { name: db.name, version: db.version, stores };
          db.close();
          resolve(result);
        };
      });

      catalog.push(dbInfo);
    } catch (err) {
      catalog.push({
        name: dbName,
        version: dbMeta.version || 1,
        stores: [],
        error: err?.message || 'Failed to read database schema',
      });
    }
  }

  catalog.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, databases: catalog };
}

export async function injectedReadStore(dbName, storeName, maxRows) {
  const limit = typeof maxRows === 'number' && maxRows > 0 ? maxRows : 5000;

  function serializeValue(val, depth = 0) {
    if (depth > 8) return '[Max Depth]';
    if (val === null || val === undefined) return val;
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') return val;
    if (t === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof RegExp) return val.toString();
    if (typeof Blob !== 'undefined' && val instanceof Blob) {
      return {
        __type: val instanceof File ? 'File' : 'Blob',
        name: val instanceof File ? val.name : undefined,
        size: val.size,
        mimeType: val.type || 'application/octet-stream',
      };
    }
    if (val instanceof ArrayBuffer) {
      return { __type: 'ArrayBuffer', byteLength: val.byteLength };
    }
    if (ArrayBuffer.isView(val)) {
      return { __type: val.constructor?.name || 'TypedArray', byteLength: val.byteLength };
    }
    if (val instanceof Map) {
      const obj = {};
      for (const [k, v] of val.entries()) obj[String(k)] = serializeValue(v, depth + 1);
      return obj;
    }
    if (val instanceof Set) {
      return Array.from(val).map((item) => serializeValue(item, depth + 1));
    }
    if (Array.isArray(val)) {
      return val.map((item) => serializeValue(item, depth + 1));
    }
    if (t === 'object') {
      const out = {};
      for (const key of Object.keys(val)) out[key] = serializeValue(val[key], depth + 1);
      return out;
    }
    return String(val);
  }

  return new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onerror = () => resolve({ ok: false, error: req.error?.message || `Failed to open ${dbName}` });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve({ ok: false, error: `Object store "${storeName}" not found in "${dbName}".` });
        return;
      }

      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const rows = [];
        let totalCount = 0;

        const countReq = store.count();
        countReq.onsuccess = () => {
          totalCount = countReq.result || 0;
        };

        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (!cursor || rows.length >= limit) {
            db.close();
            resolve({
              ok: true,
              rows,
              totalCount: Math.max(totalCount, rows.length),
              truncated: rows.length >= limit && totalCount > limit,
            });
            return;
          }

          const rawVal = cursor.value;
          const key = serializeValue(cursor.key);

          if (
            rawVal &&
            typeof rawVal === 'object' &&
            !Array.isArray(rawVal) &&
            !(rawVal instanceof Date) &&
            !(rawVal instanceof Blob)
          ) {
            const serialized = serializeValue(rawVal);
            if (!('_idbKey' in serialized)) serialized._idbKey = key;
            rows.push(serialized);
          } else {
            rows.push({ _idbKey: key, value: serializeValue(rawVal) });
          }

          cursor.continue();
        };

        cursorReq.onerror = () => {
          db.close();
          resolve({ ok: false, error: cursorReq.error?.message || 'Failed to read store records.' });
        };
      } catch (err) {
        db.close();
        resolve({ ok: false, error: err?.message || 'IndexedDB transaction failed.' });
      }
    };
  });
}
