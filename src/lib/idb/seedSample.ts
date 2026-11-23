/**
 * Seeds realistic local IndexedDB databases inside the browser preview origin
 * so users can immediately inspect tables, test filters, and run SQL queries.
 */
export async function seedSampleIndexedDB(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('ShopCoreOfflineDB', 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('orders')) {
        const store = db.createObjectStore('orders', { keyPath: 'orderId' });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_region', 'shipping.region', { unique: false });
        store.createIndex('by_created', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('customers')) {
        const store = db.createObjectStore('customers', { keyPath: 'id' });
        store.createIndex('by_email', 'email', { unique: true });
        store.createIndex('by_tier', 'tier', { unique: false });
      }
      if (!db.objectStoreNames.contains('products')) {
        const store = db.createObjectStore('products', { keyPath: 'sku' });
        store.createIndex('by_category', 'category', { unique: false });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['orders', 'customers', 'products'], 'readwrite');

      const orders = [
        { orderId: 'ORD-9041', customerId: 'CUS-101', status: 'paid', totalAmount: 1450000, currency: 'IDR', itemCount: 3, paymentMethod: 'qris', shipping: { city: 'Jakarta Selatan', region: 'DKI Jakarta', courier: 'JNE YES' }, createdAt: '2026-11-18T09:14:22Z' },
        { orderId: 'ORD-9042', customerId: 'CUS-104', status: 'shipped', totalAmount: 2890000, currency: 'IDR', itemCount: 2, paymentMethod: 'va_bca', shipping: { city: 'Bandung', region: 'Jawa Barat', courier: 'SiCepat' }, createdAt: '2026-11-18T11:42:10Z' },
        { orderId: 'ORD-9043', customerId: 'CUS-102', status: 'pending', totalAmount: 540000, currency: 'IDR', itemCount: 1, paymentMethod: 'qris', shipping: { city: 'Surabaya', region: 'Jawa Timur', courier: 'AnterAja' }, createdAt: '2026-11-19T08:05:49Z' },
        { orderId: 'ORD-9044', customerId: 'CUS-106', status: 'paid', totalAmount: 4120000, currency: 'IDR', itemCount: 5, paymentMethod: 'credit_card', shipping: { city: 'Jakarta Pusat', region: 'DKI Jakarta', courier: 'GoSend Instant' }, createdAt: '2026-11-19T14:28:11Z' },
        { orderId: 'ORD-9045', customerId: 'CUS-103', status: 'cancelled', totalAmount: 780000, currency: 'IDR', itemCount: 2, paymentMethod: 'va_mandiri', shipping: { city: 'Yogyakarta', region: 'DI Yogyakarta', courier: 'JNE REG' }, createdAt: '2026-11-20T07:51:03Z' },
        { orderId: 'ORD-9046', customerId: 'CUS-105', status: 'delivered', totalAmount: 3250000, currency: 'IDR', itemCount: 4, paymentMethod: 'va_bca', shipping: { city: 'Denpasar', region: 'Bali', courier: 'SiCepat' }, createdAt: '2026-11-20T16:12:40Z' },
        { orderId: 'ORD-9047', customerId: 'CUS-101', status: 'paid', totalAmount: 960000, currency: 'IDR', itemCount: 1, paymentMethod: 'qris', shipping: { city: 'Jakarta Selatan', region: 'DKI Jakarta', courier: 'JNE YES' }, createdAt: '2026-11-21T10:33:19Z' },
        { orderId: 'ORD-9048', customerId: 'CUS-107', status: 'shipped', totalAmount: 5380000, currency: 'IDR', itemCount: 6, paymentMethod: 'credit_card', shipping: { city: 'Medan', region: 'Sumatera Utara', courier: 'JNE YES' }, createdAt: '2026-11-21T19:02:55Z' },
        { orderId: 'ORD-9049', customerId: 'CUS-108', status: 'pending', totalAmount: 1190000, currency: 'IDR', itemCount: 2, paymentMethod: 'va_bni', shipping: { city: 'Semarang', region: 'Jawa Tengah', courier: 'AnterAja' }, createdAt: '2026-11-22T06:40:12Z' },
        { orderId: 'ORD-9050', customerId: 'CUS-104', status: 'delivered', totalAmount: 2150000, currency: 'IDR', itemCount: 3, paymentMethod: 'qris', shipping: { city: 'Bandung', region: 'Jawa Barat', courier: 'SiCepat' }, createdAt: '2026-11-22T13:18:04Z' },
      ];
      for (const order of orders) tx.objectStore('orders').put(order);

      const customers = [
        { id: 'CUS-101', name: 'Raka Pratama', email: 'raka.pratama@example.id', tier: 'enterprise', lifetimeSpend: 18400000, active: true, profile: { city: 'Jakarta', verified: true } },
        { id: 'CUS-102', name: 'Dina Wulandari', email: 'dina.w@example.id', tier: 'standard', lifetimeSpend: 2150000, active: true, profile: { city: 'Surabaya', verified: true } },
        { id: 'CUS-103', name: 'Budi Santoso', email: 'budi.santoso@example.id', tier: 'standard', lifetimeSpend: 780000, active: false, profile: { city: 'Yogyakarta', verified: false } },
        { id: 'CUS-104', name: 'Nadia Kusuma', email: 'nadia.k@example.id', tier: 'pro', lifetimeSpend: 9420000, active: true, profile: { city: 'Bandung', verified: true } },
        { id: 'CUS-105', name: 'I Made Wijaya', email: 'made.wijaya@example.id', tier: 'pro', lifetimeSpend: 7850000, active: true, profile: { city: 'Denpasar', verified: true } },
        { id: 'CUS-106', name: 'Farhan Hakim', email: 'farhan.hakim@example.id', tier: 'enterprise', lifetimeSpend: 24900000, active: true, profile: { city: 'Jakarta', verified: true } },
        { id: 'CUS-107', name: 'Siti Rahmawati', email: 'siti.rahma@example.id', tier: 'pro', lifetimeSpend: 11300000, active: true, profile: { city: 'Medan', verified: true } },
        { id: 'CUS-108', name: 'Arief Nugroho', email: 'arief.n@example.id', tier: 'standard', lifetimeSpend: 1190000, active: true, profile: { city: 'Semarang', verified: false } },
      ];
      for (const c of customers) tx.objectStore('customers').put(c);

      const products = [
        { sku: 'KBD-75-ALU', title: 'Mechanical Keyboard 75% Aluminum', category: 'peripherals', price: 1450000, stock: 24, rating: 4.9 },
        { sku: 'MON-27-4K', title: '27" IPS 4K Developer Display', category: 'monitors', price: 5380000, stock: 8, rating: 4.8 },
        { sku: 'HUB-TB4-PRO', title: 'Thunderbolt 4 Studio Dock', category: 'accessories', price: 2890000, stock: 15, rating: 4.7 },
        { sku: 'MSE-ERGO-WL', title: 'Wireless Vertical Precision Mouse', category: 'peripherals', price: 780000, stock: 42, rating: 4.6 },
        { sku: 'SSD-NVME-2T', title: 'NVMe External Enclosure 2TB', category: 'storage', price: 2150000, stock: 19, rating: 4.9 },
        { sku: 'MIC-USB-CARD', title: 'Dynamic USB-C Broadcast Mic', category: 'audio', price: 1190000, stock: 0, rating: 4.5 },
      ];
      for (const p of products) tx.objectStore('products').put(p);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('ClientTelemetryCache', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'eventId', autoIncrement: true });
        store.createIndex('by_synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains('feature_flags')) {
        db.createObjectStore('feature_flags', { keyPath: 'flagKey' });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['sync_queue', 'feature_flags'], 'readwrite');
      const syncStore = tx.objectStore('sync_queue');
      syncStore.put({ eventId: 1, action: 'checkout.submit', latencyMs: 142, synced: true, retries: 0, timestamp: '2026-11-22T10:01:12Z' });
      syncStore.put({ eventId: 2, action: 'inventory.prefetch', latencyMs: 88, synced: true, retries: 0, timestamp: '2026-11-22T10:03:44Z' });
      syncStore.put({ eventId: 3, action: 'cart.persist_offline', latencyMs: 315, synced: false, retries: 2, timestamp: '2026-11-22T10:09:15Z' });
      syncStore.put({ eventId: 4, action: 'analytics.flush', latencyMs: 520, synced: false, retries: 3, timestamp: '2026-11-22T10:15:02Z' });

      const flagStore = tx.objectStore('feature_flags');
      flagStore.put({ flagKey: 'offline_checkout_v2', enabled: true, rolloutPct: 100, updatedBy: 'release-bot' });
      flagStore.put({ flagKey: 'sql_query_cache', enabled: true, rolloutPct: 50, updatedBy: 'core-eng' });
      flagStore.put({ flagKey: 'background_sync_v3', enabled: false, rolloutPct: 10, updatedBy: 'platform' });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
