/**
 * cacheLocal.ts — Copia local (IndexedDB) de las respuestas de la API para mostrar los datos
 * al instante al recargar, mientras se piden los actuales por detrás (stale-while-revalidate).
 *
 * Seguridad:
 * - Cada copia queda asociada al usuario (dueño). Si entra otro usuario en este navegador,
 *   se borra todo antes de leer o guardar.
 * - Se borra entera al cerrar sesión (auth.signOut → borrarCacheLocal).
 * - Nada dura más de MAX_EDAD; lo vencido se descarta.
 * Si IndexedDB no está disponible (modo privado, bloqueado), todo sigue funcionando sin copia local.
 */
const DB = 'gravicon-vision'
const STORE = 'respuestas'
const CLAVE_DUENO = '__dueno__'
const MAX_EDAD_MS = 7 * 24 * 60 * 60 * 1000

let dbPromise: Promise<IDBDatabase | null> | null = null

function abrir(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function operar<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return abrir().then(db => new Promise<T | undefined>(resolve => {
    if (!db) return resolve(undefined)
    try {
      const tx = db.transaction(STORE, modo)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req ? req.result : undefined)
      tx.onerror = () => resolve(undefined)
      tx.onabort = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  }))
}

/** Garantiza que la caché sea del usuario actual; si es de otro, la vacía */
async function asegurarDueno(usuario: string): Promise<void> {
  const dueno = await operar<string>('readonly', s => s.get(CLAVE_DUENO))
  if (dueno === usuario) return
  await operar('readwrite', s => { s.clear(); s.put(usuario, CLAVE_DUENO) })
}

/** Lee la copia guardada de `clave` para el usuario; undefined si no hay o está vencida */
export async function leerCacheLocal<T>(usuario: string, clave: string): Promise<T | undefined> {
  if (!usuario) return undefined
  await asegurarDueno(usuario)
  const e = await operar<{ ts: number; valor: T }>('readonly', s => s.get(clave))
  if (!e || Date.now() - e.ts > MAX_EDAD_MS) return undefined
  return e.valor
}

/** Guarda la respuesta de `clave` para el usuario */
export async function guardarCacheLocal(usuario: string, clave: string, valor: unknown): Promise<void> {
  if (!usuario) return
  await asegurarDueno(usuario)
  await operar('readwrite', s => { s.put({ ts: Date.now(), valor }, clave) })
}

/** Borra una entrada (p. ej. si el servidor negó el acceso) */
export async function borrarEntradaCacheLocal(clave: string): Promise<void> {
  await operar('readwrite', s => { s.delete(clave) })
}

/** Borra toda la copia local (al cerrar sesión) */
export async function borrarCacheLocal(): Promise<void> {
  await operar('readwrite', s => { s.clear() })
}
