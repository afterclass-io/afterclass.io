const DB_NAME = "afterclass-assistant";
const STORE = "sessions";

// Cached open promise: one connection per page lifetime instead
// of one open() per get/put/delete call. Reset on versionchange/close so a
// schema bump in another tab never wedges this tab on a stale handle.
let openP: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  openP ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        openP = null;
      };
      db.onclose = () => {
        openP = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      openP = null;
      reject(req.error ?? new Error("Failed to open IndexedDB"));
    };
  });
  return openP;
}

export async function idbGetAll<T>(): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to read sessions"));
  });
}

export async function idbPut<T extends { id: string }>(
  value: T,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to write session"));
  });
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to delete session"));
  });
}
