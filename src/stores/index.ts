import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { cargarConCache } from './api'
import type { SheetData } from './concreto'
import type { DatosFacturacion } from '../types/facturacion'

/*
 * Stores de datos del dashboard: Producción, Mantenimiento y Clientes.
 *
 * Cada store sigue el mismo patrón:
 * - shallowRef para los datos (evita reactividad profunda innecesaria)
 * - loading/error para estados de carga
 * - fetch*() vía cargarConCache: muestra al instante la copia local del navegador y la
 *   reemplaza con la respuesta del servidor; `force` (botón «Actualizar») salta las cachés
 */

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

  /** Carga datos diarios de Cuncia desde Supabase */
  function fetchCuncia(force = false) {
    return cargarConCache<SheetData>({
      url: `/api/produccion-agregados-cuncia/data${force ? '?force=true' : ''}`, force,
      hayDatos: () => !!cunciaData.value, aplicar: d => { cunciaData.value = d }, limpiar: () => { cunciaData.value = null },
      loading, error, etiqueta: 'produccion-cuncia',
    })
  }

  /** Carga datos diarios de Acacias desde Supabase */
  function fetchAcacias(force = false) {
    return cargarConCache<SheetData>({
      url: `/api/produccion-agregados-acacias/data${force ? '?force=true' : ''}`, force,
      hayDatos: () => !!acaciasData.value, aplicar: d => { acaciasData.value = d }, limpiar: () => { acaciasData.value = null },
      loading, error, etiqueta: 'produccion-acacias',
    })
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
  function fetchCuncia(forceRefresh = false) {
    return cargarConCache<SheetData>({
      url: `/api/mantenimiento-ot-cuncia/data${forceRefresh ? '?force=true' : ''}`, force: forceRefresh,
      hayDatos: () => !!cunciaData.value, aplicar: d => { cunciaData.value = d }, limpiar: () => { cunciaData.value = null },
      loading, error, etiqueta: 'mantenimiento-cuncia',
    })
  }

  /** Carga datos de mantenimiento de Acacias */
  function fetchAcacias(forceRefresh = false) {
    return cargarConCache<SheetData>({
      url: `/api/mantenimiento-ot-acacias/data${forceRefresh ? '?force=true' : ''}`, force: forceRefresh,
      hayDatos: () => !!acaciasData.value, aplicar: d => { acaciasData.value = d }, limpiar: () => { acaciasData.value = null },
      loading, error, etiqueta: 'mantenimiento-acacias',
    })
  }

  /** Carga datos de mantenimiento de Concretos */
  function fetchConcretos(forceRefresh = false) {
    return cargarConCache<SheetData>({
      url: `/api/mantenimiento-ot-concretos/data${forceRefresh ? '?force=true' : ''}`, force: forceRefresh,
      hayDatos: () => !!concretosData.value, aplicar: d => { concretosData.value = d }, limpiar: () => { concretosData.value = null },
      loading, error, etiqueta: 'mantenimiento-concretos',
    })
  }

  return { cunciaData, acaciasData, concretosData, loading, error, fetchCuncia, fetchAcacias, fetchConcretos }
})

/** Store: Llantas (FleetControl_Llantas) — inventario + inspecciones de llantas */
export const useLlantasStore = defineStore('llantas', () => {
  const data = shallowRef<{
    inventario: Record<string, unknown>[]
    inspecciones: Record<string, unknown>[]
    subInspecciones: Record<string, unknown>[]
    totalInventario: number
    totalInspecciones: number
  } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function fetchData(forceRefresh = false) {
    return cargarConCache<NonNullable<typeof data.value>>({
      url: `/api/llantas/data${forceRefresh ? '?force=true' : ''}`, force: forceRefresh,
      hayDatos: () => !!data.value, aplicar: d => { data.value = d }, limpiar: () => { data.value = null },
      loading, error, etiqueta: 'llantas',
    })
  }

  return { data, loading, error, fetchData }
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
  function fetchData(force = false) {
    return cargarConCache<NonNullable<typeof data.value>>({
      url: `/api/proyecciones-clientes/data${force ? '?force=true' : ''}`, force,
      hayDatos: () => !!data.value, aplicar: d => { data.value = d }, limpiar: () => { data.value = null },
      loading, error, etiqueta: 'clientes',
    })
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
    cronologia: Record<string, unknown>[]
    combustible: Record<string, unknown>[]
    totalPlacas: number
    totalTareas: number
    planta: string
  } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDisponibilidad(planta: string, forceRefresh = false) {
    const p = planta.toLowerCase()
    // Deduplicación: si ya tenemos datos para esta planta y no es force, no re-fetch
    if (!forceRefresh && data.value?.planta === p && (data.value?.placas?.length ?? 0) > 0) return
    return cargarConCache<any>({
      url: `/api/disponibilidad/data?planta=${p}${forceRefresh ? '&force=true' : ''}`, force: forceRefresh,
      hayDatos: () => data.value?.planta === p && (data.value?.placas?.length ?? 0) > 0,
      // Reasignar con nuevos arrays para garantizar reactividad profunda
      aplicar: d => {
        data.value = {
          ...d,
          placas: d?.placas ? [...d.placas] : [],
          tareas: d?.tareas ? [...d.tareas] : [],
          resumen: d?.resumen ? [...d.resumen] : [],
          cronologia: d?.cronologia ? [...d.cronologia] : [],
          combustible: d?.combustible ? [...d.combustible] : [],
        }
      },
      limpiar: () => { data.value = null },
      loading, error, etiqueta: 'disponibilidad-store',
    })
  }

  return { data, loading, error, fetchDisponibilidad }
})


/** Store: Facturación de agregados (Novasoft, Excel en Drive) — una entrada por planta */
export const useFacturacionStore = defineStore('facturacion', () => {
  const data = shallowRef<Partial<Record<'cuncia' | 'acacias', DatosFacturacion>>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Descarga la facturación de la planta; `force` pide al servidor releer el archivo de Drive */
  function fetchFacturacion(planta: 'cuncia' | 'acacias', force = false) {
    // Formato compacto del servidor: filas como listas y textos repetidos como índices a un diccionario.
    // La copia local guarda ese formato (más liviano) y se reconstruye igual al leerla.
    type Compacto = Omit<DatosFacturacion, 'lineas'> & { columnas: string[]; diccionarios: Record<string, string[]>; filas: unknown[][] }
    return cargarConCache<Compacto>({
      url: `/api/facturacion-agregados/data?planta=${planta}${force ? '&force=true' : ''}`, force,
      hayDatos: () => !!data.value[planta],
      aplicar: r => {
        const { columnas, diccionarios, filas, ...resto } = r
        const lineas = filas.map(f => Object.fromEntries(columnas.map((c, i) => {
          const v = f[i]
          if (diccionarios[c]) return [c, diccionarios[c][v as number]]
          return [c, c === 'factorPropio' ? v === 1 : v]
        }))) as unknown as DatosFacturacion['lineas']
        data.value = { ...data.value, [planta]: { ...resto, lineas } }
      },
      limpiar: () => { const { [planta]: _, ...resto } = data.value; data.value = resto },
      loading, error, etiqueta: 'facturacion',
    })
  }

  return { data, loading, error, fetchFacturacion }
})
