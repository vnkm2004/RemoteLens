// IndexedDB storage for full-resolution uncompressed photos
const DB_NAME = 'RemoteLensDB';
const DB_VERSION = 1;
const STORE_NAME = 'captured_photos';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhotoLocally(photo) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Photo object format:
    // {
    //   id: string,
    //   blob: Blob,
    //   name: string,
    //   mimeType: string,
    //   width: number,
    //   height: number,
    //   size: number,
    //   timestamp: number,
    //   sourceDevice: string
    // }
    const request = store.put(photo);

    request.onsuccess = () => resolve(photo);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPhotosLocally() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const photos = (request.result || []).reverse();
      resolve(photos);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhotoLocally(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename || `IMG_${Date.now()}.jpg`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

