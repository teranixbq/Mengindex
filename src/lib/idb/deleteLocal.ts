export function deleteLocalStoreRecords(
  dbName: string,
  storeName: string,
  keys: unknown[],
  clearAll = false
): Promise<{ deletedCount: number }> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName);
    req.onerror = () => reject(req.error || new Error(`Failed to open ${dbName}`));
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        reject(new Error(`Object store "${storeName}" not found in "${dbName}".`));
        return;
      }

      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let deletedCount = 0;

        if (clearAll) {
          const cReq = store.count();
          cReq.onsuccess = () => {
            deletedCount = cReq.result || 0;
            store.clear();
          };
        } else {
          for (const key of keys) {
            store.delete(key as IDBValidKey);
            deletedCount++;
          }
        }

        tx.oncomplete = () => {
          db.close();
          resolve({ deletedCount });
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error('Failed to delete records.'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || new Error('Delete transaction was aborted.'));
        };
      } catch (err) {
        db.close();
        reject(err instanceof Error ? err : new Error('IndexedDB delete transaction failed.'));
      }
    };
  });
}
