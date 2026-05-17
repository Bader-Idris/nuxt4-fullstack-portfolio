const DB_NAME = "push-notifications-db";
const DB_VERSION = 2;
const STORE_NAME = "pending-actions";

export const usePendingActions = () => {
  const openDB = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        return reject("IndexedDB is not supported.");
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
      };

      request.onsuccess = (event) =>
        resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event) =>
        reject("IndexedDB error: " + (event.target as IDBOpenDBRequest).error);
    });
  };

  const getAndClearPendingAction = async (): Promise<any | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const getAllKeysRequest = store.getAllKeys();

        getAllKeysRequest.onsuccess = () => {
          const keys = getAllKeysRequest.result;
          if (keys.length === 0) {
            resolve(null);
            return;
          }

          // Get the first action and then clear it
          const getRequest = store.get(keys[0]);
          getRequest.onsuccess = () => {
            const action = getRequest.result;
            store.delete(keys[0]); // Clear the action
            resolve(action);
          };
          getRequest.onerror = (event) =>
            reject(
              "Failed to get action: " + (event.target as IDBRequest).error,
            );
        };
        getAllKeysRequest.onerror = (event) =>
          reject("Failed to get keys: " + (event.target as IDBRequest).error);
      });
    } catch (error) {
      console.error("Error accessing pending actions:", error);
      return null;
    }
  };

  return { getAndClearPendingAction };
};