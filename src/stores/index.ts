import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { useAuthStore } from './auth'
import type { SheetData } from './concreto'

/*
 * Stores de datos del dashboard: Producción, Mantenimiento y Clientes.
 *
 * Cada store sigue el mismo patrón:
 * - shallowRef para los datos (evita reactividad profunda innecesaria)
 * - loading/error para estados de carga
 * - fetch*() con try/catch para manejo de errores
 */

/**
 * Realiza una petición GET autenticada a la API propia del backend.
 * Agrega automáticamente el token JWT de Supabase en el header Authorization.
 * @typeParam T - Tipo esperado de la respuesta JSON
 * @param path - Ruta relativa del endpoint (ej. `/api/spreadsheets/...`)
 * @returns La respuesta parseada como JSON
 */
async function fetchApi<T>(path: string): Promise<T> {
  const token = useAuthStore().accessToken
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { headers })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/** Store: Producción (Cuncia y Acacias) — datos diarios de producción de M³ */
export const useProduccionStore = defineStore('produccion', () => {
  /** Datos diarios de la planta Cuncia */
  const cunciaData = shallowRef<SheetData | null>(null)
  /** Datos diarios de la planta Acacias */
  const acaciasData = shallowRef<SheetData | null>(null)
  /** Indicador de carga en progreso */
  const loading = ref(false)
  /** Mensaje de error si la carga falla */
  const error = ref<string | null>(null)

  /** Carga datos diarios de Cuncia desde Supabase (reemplaza Google Sheets) */
  async function fetchCuncia() {
    loading.value = true; error.value = null
    try {
      cunciaData.value = await fetchApi<SheetData>('/api/produccion-agregados-cuncia/data')
    } catch (e: any) { console.error('[produccion-cuncia]', e); error.value = e.message }
    finally { loading.value = false }
  }

  /** Carga datos diarios de Acacias desde Supabase (reemplaza Google Sheets) */
  async function fetchAcacias() {
    loading.value = true; error.value = null
    try {
      acaciasData.value = await fetchApi<SheetData>('/api/produccion-agregados-acacias/data')
    } catch (e: any) { console.error('[produccion-acacias]', e); error.value = e.message }
    finally { loading.value = false }
  }

  return { cunciaData, acaciasData, loading, error, fetchCuncia, fetchAcacias }
})

/** Store: Mantenimiento (Cuncia, Acacias y Concretos) — datos de órdenes de trabajo */
export const useMantenimientoStore = defineStore('mantenimiento', () => {
  /** Datos de mantenimiento de Cuncia */
  const cunciaData = shallowRef<SheetData | null>(null)
  /** Datos de mantenimiento de Acacias */
  const acaciasData = shallowRef<SheetData | null>(null)
  /** Datos de mantenimiento de Concretos */
  const concretosData = shallowRef<SheetData | null>(null)
  /** Indicador de carga en progreso */
  const loading = ref(false)
  /** Mensaje de error si la carga falla */
  const error = ref<string | null>(null)

  /** Carga datos de mantenimiento de Cuncia */
  async function fetchCuncia(forceRefresh = false) {
    loading.value = true; error.value = null
    try {
      const suffix = forceRefresh ? '?force=true' : ''
      cunciaData.value = await fetchApi<SheetData>(`/api/mantenimiento-ot-cuncia/data${suffix}`)
    } catch (e: any) { console.error('[mantenimiento-cuncia]', e); error.value = e.message }
    finally { loading.value = false }
  }

  /** Carga datos de mantenimiento de Acacias */
  async function fetchAcacias(forceRefresh = false) {
    loading.value = true; error.value = null
    try {
      const suffix = forceRefresh ? '?force=true' : ''
      acaciasData.value = await fetchApi<SheetData>(`/api/mantenimiento-ot-acacias/data${suffix}`)
    } catch (e: any) { console.error('[mantenimiento-acacias]', e); error.value = e.message }
    finally { loading.value = false }
  }

  /** Carga datos de mantenimiento de Concretos */
  async function fetchConcretos(forceRefresh = false) {
    loading.value = true; error.value = null
    try {
      const url = `/api/mantenimiento-ot-concretos/data${forceRefresh ? '?force=true' : ''}`
      concretosData.value = await fetchApi<SheetData>(url)
    } catch (e: any) { console.error('[mantenimiento-concretos]', e); error.value = e.message }
    finally { loading.value = false }
  }

  return { cunciaData, acaciasData, concretosData, loading, error, fetchCuncia, fetchAcacias, fetchConcretos }
})

/** Store: Clientes / Proyección — datos de proyecciones por cliente desde Supabase */
export const useClientesStore = defineStore('clientes', () => {
  /** Datos crudos de proyecciones */
  const data = shallowRef<{ rows: Record<string, unknown>[]; total: number } | null>(null)
  /** Indicador de carga en progreso */
  const loading = ref(false)
  /** Mensaje de error si la carga falla */
  const error = ref<string | null>(null)

  /** Obtiene los datos desde el endpoint /api/proyecciones-clientes/data */
  async function fetchData() {
    loading.value = true; error.value = null
    try {
      data.value = await fetchApi('/api/proyecciones-clientes/data')
    } catch (e: any) { console.error('[clientes]', e); error.value = e.message }
    finally { loading.value = false }
  }

  /** Todos los registros sin filtrar */
  const allRows = computed(() => data.value?.rows ?? [])

  /** Solo filas cuyo tipo es "Proyectado" */
  const proyectadoRows = computed(() =>
    allRows.value.filter(r => String(r.tipo ?? '') === 'Proyectado')
  )

  /** Lista única de nombres de plantas disponibles, ordenada alfabéticamente */
  const plantas = computed(() => {
    const set = new Set(proyectadoRows.value.map(r => String(r.planta ?? '')))
    return [...set].filter(Boolean).sort()
  })

  /** Suma total de M³ reales (cantidad_m3) en registros proyectados */
  const totalReal = computed(() =>
    proyectadoRows.value.reduce((s, r) => s + (Number(r.cantidad_m3) || 0), 0)
  )

  /** Suma total de M³ proyectados (m3_proyectado) */
  const totalProyectado = computed(() =>
    proyectadoRows.value.reduce((s, r) => s + (Number(r.m3_proyectado) || 0), 0)
  )

  /** Diferencia total: real - proyectado */
  const totalDiferencia = computed(() =>
    proyectadoRows.value.reduce((s, r) => s + (Number(r.diferencia) || 0), 0)
  )

  // Metas mensuales y ritmo esperado (basado en fecha actual)
  const hoy = new Date()
  /** Días transcurridos del mes actual */
  const diasTranscurridos = hoy.getDate()
  /** Total de días del mes actual */
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()

  /** Meta de M³ esperada según el avance del mes (lineal) */
  const ritmoEsperado = computed(() =>
    totalProyectado.value * (diasTranscurridos / diasDelMes)
  )

  /** Desviación entre el real acumulado y el ritmo esperado */
  const desviacionRitmo = computed(() =>
    totalReal.value - ritmoEsperado.value
  )

  /** Totales de real y proyectado agregados por mes */
  const resumenMensual = computed(() => {
    const rows = allRows.value
    if (!rows.length) return []
    type MesEntry = { real: number; proy: number }
    const map = new Map<string, MesEntry>()
    for (const r of rows) {
      const fecha = new Date(String(r.fecha ?? ''))
      if (isNaN(fecha.getTime())) continue
      const mes = fecha.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
      const cur = map.get(mes) ?? { real: 0, proy: 0 }
      cur.real += Number(r.cantidad_m3) || 0
      cur.proy += Number(r.m3_proyectado) || 0
      map.set(mes, cur)
    }
    return [...map.entries()].map(([mes, v]) => ({ mes, ...v }))
  })

  return {
    data, loading, error, fetchData,
    allRows, proyectadoRows, plantas,
    totalReal, totalProyectado, totalDiferencia,
    ritmoEsperado, desviacionRitmo,
    diasTranscurridos, diasDelMes,
    resumenMensual,
  }
})
/** Store: Disponibilidad de Flota (Cuncia, Acacias y Concretos) */
export const useDisponibilidadStore = defineStore('disponibilidad', () => {
  // Usar ref (no shallowRef) para que Vue detecte cambios en arrays internos
  const data = ref<{
    placas: Record<string, unknown>[]
    tareas: Record<string, unknown>[]
    resumen: Record<string, unknown>[]
    totalPlacas: number
    totalTareas: number
    planta: string
  } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDisponibilidad(planta: string, forceRefresh = false) {
    loading.value = true
    error.value = null
    try {
      const p = planta.toLowerCase()
      const d = await fetchApi<any>(`/api/disponibilidad/data?planta=${p}${forceRefresh ? '&force=true' : ''}`)
      // Reasignar con nuevos arrays para garantizar reactividad profunda
      data.value = {
        ...d,
        placas: d?.placas ? [...d.placas] : [],
        tareas: d?.tareas ? [...d.tareas] : [],
        resumen: d?.resumen ? [...d.resumen] : [],
      }
    } catch (e: any) {
      console.error('[disponibilidad-store]', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetchDisponibilidad }
})

