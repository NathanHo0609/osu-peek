// Persists uploaded .osk files in IndexedDB so they survive page reloads and can be
// switched between without re-uploading. localStorage can't hold multi-MB skin files
// (its quota is a few MB total), so this uses IndexedDB instead, which comfortably
// stores binary Blobs.
const DB_NAME = 'osu-peek-skins'
const STORE_NAME = 'skins'
const DB_VERSION = 1

export interface StoredSkinMeta {
  id: string
  name: string
}

interface StoredSkin extends StoredSkinMeta {
  blob: Blob
  savedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSkin(name: string, blob: Blob): Promise<string> {
  const db = await openDb()
  const id = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const entry: StoredSkin = { id, name, blob, savedAt: Date.now() }
    tx.objectStore(STORE_NAME).put(entry)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function listSkins(): Promise<StoredSkinMeta[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => {
      const skins = (request.result as StoredSkin[]).sort((a, b) => a.savedAt - b.savedAt)
      resolve(skins.map((s) => ({ id: s.id, name: s.name })))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getSkinBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve((request.result as StoredSkin | undefined)?.blob)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSkin(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
