// Локальное хранилище на IndexedDB: записи альбома (с фото) и настройки.
const NAME = 'alder';
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('entries', { keyPath: 'id' });
        d.createObjectStore('meta');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out.result);
    t.onerror = () => rej(t.error);
  });
}

export const entries = {
  all: () => tx('entries', 'readonly', (s) => s.getAll()),
  put: (e) => tx('entries', 'readwrite', (s) => s.put(e)),
  del: (id) => tx('entries', 'readwrite', (s) => s.delete(id)),
  clear: () => tx('entries', 'readwrite', (s) => s.clear()),
};

export const meta = {
  get: (k) => tx('meta', 'readonly', (s) => s.get(k)),
  set: (k, v) => tx('meta', 'readwrite', (s) => s.put(v, k)),
};

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
