/**
 * cache.ts — Caché en memoria del servidor para lecturas que no dependen del usuario.
 *
 * - Guarda el resultado `ttlMs` milisegundos; mientras tanto se responde sin consultar la fuente.
 * - Si varias peticiones llegan a la vez con la caché vencida, comparten una sola consulta.
 * - `force` (botón «Actualizar» del frontend) ignora la caché y la renueva.
 * Los permisos se validan antes (requireView), así que compartir el resultado entre usuarios es seguro.
 * En Vercel cada instancia tiene su propia memoria: la caché ayuda mientras la instancia sigue viva.
 */
interface Entrada { ts: number; valor: unknown }

const entradas = new Map<string, Entrada>()
const enCurso = new Map<string, Promise<unknown>>()

/** TTL por defecto de las lecturas de Supabase (segundos, variable SUPABASE_CACHE_TTL) */
export const TTL_SUPABASE_MS = Number(process.env.SUPABASE_CACHE_TTL ?? 120) * 1000

export async function conCache<T>(clave: string, ttlMs: number, cargar: () => Promise<T>, force = false): Promise<T> {
  const e = entradas.get(clave)
  if (!force && e && Date.now() - e.ts < ttlMs) return e.valor as T
  const pendiente = enCurso.get(clave)
  if (pendiente) return pendiente as Promise<T>
  const p = cargar()
    .then(valor => { entradas.set(clave, { ts: Date.now(), valor }); return valor })
    .finally(() => enCurso.delete(clave))
  enCurso.set(clave, p)
  return p
}
