/**
 * ZEROHUB UI — DB module
 * Thin wrapper around IndexedDB for storing download records,
 * history metadata and local Blob references.
 * localStorage is intentionally NOT used here — it is unsuitable
 * for anything beyond small key/value flags (see app.js "settings").
 */
const ZDB = (() => {
  const DB_NAME = 'zerohub-ui';
  const DB_VERSION = 1;
  const STORE = 'items';

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(mode) {
    const db = await open();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  return {
    async put(item) {
      const store = await tx('readwrite');
      return new Promise((resolve, reject) => {
        const r = store.put(item);
        r.onsuccess = () => resolve(item);
        r.onerror = () => reject(r.error);
      });
    },
    async get(id) {
      const store = await tx('readonly');
      return new Promise((resolve, reject) => {
        const r = store.get(id);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => reject(r.error);
      });
    },
    async delete(id) {
      const store = await tx('readwrite');
      return new Promise((resolve, reject) => {
        const r = store.delete(id);
        r.onsuccess = () => resolve(true);
        r.onerror = () => reject(r.error);
      });
    },
    async all() {
      const store = await tx('readonly');
      return new Promise((resolve, reject) => {
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    },
    /** Rough estimate of remaining browser storage, when supported. */
    async estimateQuota() {
      if (navigator.storage && navigator.storage.estimate) {
        try { return await navigator.storage.estimate(); } catch { return null; }
      }
      return null;
    }
  };
})();
