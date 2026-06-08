const DB_NAME = 'AppPanDB';
const DB_VERSION = 1;
const STORE_NAME = 'syncQueue';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getSyncQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      // Ordenar para que las más antiguas (por timestamp) salgan primero
      const sorted = (request.result || []).sort((a, b) => a.timestamp - b.timestamp);
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSyncTask(task) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(task);
    tx.oncomplete = () => {
      // Disparamos un evento custom para que React se entere inmediatamente
      window.dispatchEvent(new Event('syncQueueUpdated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSyncTask(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      window.dispatchEvent(new Event('syncQueueUpdated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
