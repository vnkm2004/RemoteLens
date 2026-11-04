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

/**
 * Saves a full-resolution photo to IndexedDB local storage.
 * Handles both Blob and ArrayBuffer fallback for 100% device compatibility.
 */
export async function savePhotoLocally(photo) {
  try {
    const db = await openDatabase();
    const id = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = photo.timestamp || Date.now();
    const name = photo.name || `CAPTURE_${timestamp}.jpg`;
    const mimeType = photo.mimeType || photo.blob?.type || 'image/jpeg';
    const size = photo.size || photo.blob?.size || 0;

    const record = {
      ...photo,
      id,
      name,
      timestamp,
      mimeType,
      size,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const request = store.put(record);

      request.onsuccess = () => {
        console.log(`[Storage] Saved photo ${id} (${(size / (1024 * 1024)).toFixed(2)} MB) to IndexedDB`);
        resolve(record);
      };

      request.onerror = async (err) => {
        // Fallback for browsers that don't support direct Blob in IndexedDB
        console.warn('[Storage] Blob store failed, attempting ArrayBuffer fallback...', err);
        try {
          if (record.blob && typeof record.blob.arrayBuffer === 'function') {
            const buffer = await record.blob.arrayBuffer();
            const fallbackRecord = {
              ...record,
              arrayBuffer: buffer,
              blob: null,
            };
            const retryTx = db.transaction(STORE_NAME, 'readwrite');
            const retryStore = retryTx.objectStore(STORE_NAME);
            const retryReq = retryStore.put(fallbackRecord);
            retryReq.onsuccess = () => resolve(record);
            retryReq.onerror = () => reject(retryReq.error);
          } else {
            reject(request.error);
          }
        } catch (e) {
          reject(e);
        }
      };
    });
  } catch (err) {
    console.error('[Storage] Error saving photo to IndexedDB:', err);
    throw err;
  }
}

/**
 * Retrieves all stored photos from IndexedDB, newest first.
 * Automatically reconstructs Blobs from ArrayBuffers if stored in fallback mode.
 */
export async function getAllPhotosLocally() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      const rawList = request.result || [];
      const photos = rawList.map((item) => {
        let blob = item.blob;
        if (!blob && item.arrayBuffer) {
          blob = new Blob([item.arrayBuffer], { type: item.mimeType || 'image/jpeg' });
        }
        return {
          ...item,
          blob,
        };
      }).reverse(); // Sort newest first
      resolve(photos);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a photo from IndexedDB by ID.
 */
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

/**
 * Downloads a photo Blob to the device's Downloads/Files folder.
 * Dispatches a synthetic click on an anchor element with noopener.
 */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || `IMG_${Date.now()}.jpg`;
    a.setAttribute('download', filename || `IMG_${Date.now()}.jpg`);
    a.rel = 'noopener';
    document.body.appendChild(a);

    // Dispatch real click event
    const clickEvt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);

    setTimeout(() => {
      try {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 4000);
  } catch (err) {
    console.warn('[Storage] downloadBlob error:', err);
  }
}

/**
 * Native system sharing / saving: on mobile (Chrome Android, Safari iOS),
 * triggers the native OS share sheet where user can tap "Save image" or "Add to Photos".
 * Falls back to direct file download if share is unavailable or dismissed.
 */
export async function shareOrSavePhoto(blob, filename) {
  if (!blob) return false;
  const fileName = filename || `IMG_${Date.now()}.jpg`;
  try {
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'RemoteLens Photo',
        text: 'Lossless Remote Photo',
      });
      return true;
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.log('[Storage] Share dialog dismissed or unsupported:', e);
    }
  }

  // Fallback to browser file download
  downloadBlob(blob, fileName);
  return false;
}
