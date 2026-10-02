import { computed, type WritableComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

/**
 * useQueryState.ts — Estado de la vista guardado en la URL (?clave=valor).
 * Pestañas, sub-vistas y filtros sobreviven a recargar la página, a atrás/adelante
 * del navegador y se pueden compartir con un enlace.
 *
 * Los cambios usan router.replace (no llenan el historial) y conservan los demás
 * parámetros. Varios cambios en el mismo tick se agrupan en una sola navegación.
 */

let pendiente: Record<string, string | string[] | null> | null = null

function programar(router: ReturnType<typeof useRouter>, route: ReturnType<typeof useRoute>, key: string, value: string | string[] | null) {
  if (!pendiente) {
    pendiente = {}
    queueMicrotask(() => {
      const cambios = pendiente!
      pendiente = null
      const query: LocationQueryRaw = { ...route.query }
      for (const [k, v] of Object.entries(cambios)) {
        if (v === null || (Array.isArray(v) && !v.length)) delete query[k]
        else query[k] = v
      }
      router.replace({ query }).catch(() => { /* navegación cancelada por otra más reciente */ })
    })
  }
  pendiente[key] = value
}

/**
 * Parámetro de texto. Si el valor de la URL no está en `permitidos`, se usa el predeterminado.
 * Con el valor predeterminado el parámetro se quita de la URL para mantenerla limpia.
 */
export function useQueryParam<T extends string>(key: string, predeterminado: T, permitidos?: readonly T[]): WritableComputedRef<T> {
  const route = useRoute()
  const router = useRouter()
  return computed<T>({
    get() {
      const raw = route.query[key]
      const v = (Array.isArray(raw) ? raw[0] : raw) as T | null | undefined
      if (!v || (permitidos && !permitidos.includes(v))) return predeterminado
      return v
    },
    set(v) {
      programar(router, route, key, v === predeterminado ? null : v)
    },
  })
}

/**
 * Parámetro de fecha YYYY-MM-DD (vacío = sin valor). Ignora valores mal formados.
 */
export function useQueryDate(key: string): WritableComputedRef<string> {
  const route = useRoute()
  const router = useRouter()
  return computed<string>({
    get() {
      const raw = route.query[key]
      const v = String((Array.isArray(raw) ? raw[0] : raw) ?? '')
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''
    },
    set(v) {
      programar(router, route, key, v || null)
    },
  })
}

/** Valor en la URL que representa «ninguna opción marcada» (paso intermedio antes de elegir) */
export const NINGUNA = '-'

/**
 * Filtro de selección múltiple guardado como ?clave=a&clave=b.
 * Sin el parámetro = todas las opciones marcadas; al marcar todas se quita de la URL.
 * Ninguna marcada se guarda como ?clave=- para poder desmarcar «Todos» y luego elegir;
 * quien filtra debe tratar el conjunto vacío como «sin filtro».
 * @param opciones - Opciones disponibles; los valores de la URL que no existan se descartan.
 */
export function useQuerySet(key: string, opciones: () => string[]): WritableComputedRef<Set<string>> {
  const route = useRoute()
  const router = useRouter()
  return computed<Set<string>>({
    get() {
      const todas = opciones()
      const raw = route.query[key]
      if (raw === undefined || raw === null) return new Set(todas)
      const valores = (Array.isArray(raw) ? raw : [raw]).map(String)
      if (valores.length === 1 && valores[0] === NINGUNA) return new Set<string>()
      const validas = new Set(todas)
      const sel = new Set(valores.filter(v => validas.has(v)))
      // Si ninguna opción de la URL existe (datos cambiaron), se muestran todas
      return sel.size ? sel : new Set(todas)
    },
    set(sel: Set<string>) {
      const todas = opciones()
      const completa = sel.size === todas.length && todas.every(o => sel.has(o))
      programar(router, route, key, completa ? null : sel.size ? [...sel] : [NINGUNA])
    },
  })
}
