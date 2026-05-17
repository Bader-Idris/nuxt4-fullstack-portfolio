const DB_NAME = "push-notifications-db";
const DB_VERSION = 2;
const STORE_NAME = "pending-actions";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject("IndexedDB error: " + event.target.errorCode);
    };
  });
}

async function saveAction(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(action);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject("Failed to save action: " + event.target.errorCode);
    };
  });
}

self.addEventListener("push", function (event) {
  const data = event.data.json();

  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/favicon-16x16.png",
    data: { url: data.url || "/dashboard" }, // The URL to open on click
  });

  // If there's a specific action in the payload, save it.
  if (data.data && data.data.action) {
    promiseChain.then(() => saveAction(data.data));
  }

  event.waitUntil(promiseChain);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const urlToOpen = new URL(
          event.notification.data.url,
          self.location.origin,
        ).href;

        for (const client of clientList) {
          if (client.url.startsWith(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});