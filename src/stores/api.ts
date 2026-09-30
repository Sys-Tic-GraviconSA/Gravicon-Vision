/**
 * api.ts — Peticiones autenticadas a la API propia y carga con copia local.
 */
import type { Ref } from 'vue'
import { useAuthStore } from './auth'
import { leerCacheLocal, guardarCacheLocal, borrarEntradaCacheLocal } from '../utils/cacheLocal'

/** Error de la API con su código HTTP */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

/**
 * GET autenticado a la API propia (agrega el token JWT de Supabase).
 * El navegador guarda la respuesta y la revalida con ETag: si no cambió, el servidor responde 304 sin cuerpo.
 */
export async function fetchApi<T>(path: string): Promise<T> {
  const token = useAuthStore().accessToken
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { headers })
  if (!res.ok) {
    let msg = `API error: ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* respuesta sin JSON */ }
    throw new ApiError(msg, res.status)
  }
  return res.json()
}

interface OpcionesCarga<T> {
  /** Endpoint (puede llevar ?force=true; la clave de la copia local lo ignora) */
  url: string
  /** Pedido explícito del usuario (botón «Actualizar»): muestra el estado de carga y no usa la copia local */
  force?: boolean
  /** ¿El store ya tiene datos en pantalla para esta consulta? */
  hayDatos: () => boolean
  /** Pone la respuesta (de la copia local o del servidor) en el store */
  aplicar: (d: T) => void
  /** Quita los datos si el servidor niega el acceso (permiso retirado) */
  limpiar?: () => void
  loading: Ref<boolean>
  error: Ref<string | null>
  etiqueta: string
}

/**
 * Carga con copia local (stale-while-revalidate):
 * 1. Si no hay datos en pantalla, muestra al instante la copia guardada en este navegador.
 * 2. Pide los datos actuales al servidor y los reemplaza (y guarda la copia).
 * `loading` solo se activa cuando no hay nada que mostrar o el usuario pidió actualizar; la
 * revalidación por detrás es silenciosa y, si falla (sin red), se siguen viendo los datos guardados.
 */
export async function cargarConCache<T>(o: OpcionesCarga<T>): Promise<void> {
  const auth = useAuthStore()
  const usuario = auth.user?.id ?? ''
  const clave = o.url.replace(/([?&])force=true&?/, '$1').replace(/[?&]$/, '')
  o.error.value = null

  if (!o.force && !o.hayDatos()) {
    const guardado = await leerCacheLocal<T>(usuario, clave)
    if (guardado !== undefined && !o.hayDatos()) {
      try { o.aplicar(guardado) } catch { await borrarEntradaCacheLocal(clave) }
    }
  }

  const silencioso = !o.force && o.hayDatos()
  if (!silencioso) o.loading.value = true
  try {
    const d = await fetchApi<T>(o.url)
    o.aplicar(d)
    void guardarCacheLocal(usuario, clave, d)
  } catch (e: any) {
    console.error(`[${o.etiqueta}]`, e)
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      // Sin acceso: no se debe seguir mostrando la copia guardada
      void borrarEntradaCacheLocal(clave)
      o.limpiar?.()
      o.error.value = e.message
    } else if (!silencioso || !o.hayDatos()) {
      o.error.value = e.message
    }
  } finally {
    if (!silencioso) o.loading.value = false
  }
}
