import { computed, watch, type WritableComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * useRutaMantenimiento.ts — Estado de navegación de Mantenimiento guardado en la ruta.
 *
 *   /:planta/mantenimiento/:area/:seccion/:vista
 *
 *   area       planta | maquinaria | inspeccion | tareas
 *   seccion    (planta/maquinaria) ordenes | almacen | gerencial | disponibilidad
 *              (tareas)            graficas | tabla | informe
 *   vista      ordenes:        graficas | detalle | informe
 *              almacen:        graficas | solicitudes
 *              disponibilidad: graficas | combustible | informe
 *
 * Ejemplos: /cuncia/mantenimiento/planta/ordenes/graficas
 *           /concretos/mantenimiento/maquinaria/disponibilidad/informe
 *           /acacias/mantenimiento/tareas/tabla
 *
 * Expone los mismos valores internos que ya usaban las vistas (dashboard/resumen/graficos…),
 * así el código de EquiposDashboard, DisponibilidadTab y TareasTab no cambia: solo de dónde
 * sale el estado. Cada cambio es una navegación real (historial, atrás/adelante, enlace).
 */

export type Area = 'planta' | 'maquinaria' | 'inspeccion' | 'tareas'
export type Panel = 'dashboard' | 'almacen' | 'gerencial' | 'disponibilidad'
export type VistaOT = 'resumen' | 'ordenes' | 'informe'
export type VistaAlmacen = 'graficos' | 'solicitudes'
export type VistaDisp = 'graficas' | 'combustible' | 'informe'
export type VistaTareas = 'graficas' | 'tabla' | 'informe'

interface Estado { area: Area; panel: Panel; ot: VistaOT; almacen: VistaAlmacen; disp: VistaDisp; tareas: VistaTareas }

const AREAS: Area[] = ['planta', 'maquinaria', 'inspeccion', 'tareas']
// Nombre en la URL ↔ valor interno
const PANEL_URL: Record<Panel, string> = { dashboard: 'ordenes', almacen: 'almacen', gerencial: 'gerencial', disponibilidad: 'disponibilidad' }
const OT_URL: Record<VistaOT, string> = { resumen: 'graficas', ordenes: 'detalle', informe: 'informe' }
const ALMACEN_URL: Record<VistaAlmacen, string> = { graficos: 'graficas', solicitudes: 'solicitudes' }
const DISP: VistaDisp[] = ['graficas', 'combustible', 'informe']
const TAREAS: VistaTareas[] = ['graficas', 'tabla', 'informe']

const DEFECTO: Estado = { area: 'planta', panel: 'dashboard', ot: 'resumen', almacen: 'graficos', disp: 'graficas', tareas: 'graficas' }

const inverso = <K extends string>(m: Record<K, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>
const PANEL_DE = inverso(PANEL_URL)
const OT_DE = inverso(OT_URL)
const ALMACEN_DE = inverso(ALMACEN_URL)

/** Lee la ruta; lo que falte o no sea válido toma el valor por defecto. */
export function leerEstado(segs: string[]): Estado {
  const e: Estado = { ...DEFECTO }
  const [a, s, v] = segs
  if (AREAS.includes(a as Area)) e.area = a as Area
  if (e.area === 'tareas') {
    if (TAREAS.includes(s as VistaTareas)) e.tareas = s as VistaTareas
    return e
  }
  if (e.area === 'inspeccion') return e
  if (PANEL_DE[s]) e.panel = PANEL_DE[s]
  if (e.panel === 'dashboard' && OT_DE[v]) e.ot = OT_DE[v]
  if (e.panel === 'almacen' && ALMACEN_DE[v]) e.almacen = ALMACEN_DE[v]
  if (e.panel === 'disponibilidad' && DISP.includes(v as VistaDisp)) e.disp = v as VistaDisp
  return e
}

/** Segmentos canónicos de la URL para un estado. */
export function segmentos(e: Estado): string[] {
  if (e.area === 'inspeccion') return ['inspeccion']
  if (e.area === 'tareas') return ['tareas', e.tareas]
  const panel = PANEL_URL[e.panel]
  if (e.panel === 'gerencial') return [e.area, panel]
  const vista = e.panel === 'dashboard' ? OT_URL[e.ot] : e.panel === 'almacen' ? ALMACEN_URL[e.almacen] : e.disp
  return [e.area, panel, vista]
}

export function useRutaMantenimiento(opciones: { normalizar?: boolean } = {}) {
  const route = useRoute()
  const router = useRouter()

  const segs = computed(() => {
    const p = route.params.segmentos
    return (Array.isArray(p) ? p : p ? [p] : []).map(String)
  })
  const estado = computed(() => leerEstado(segs.value))

  /** Ubicación (para RouterLink) del estado actual con los cambios indicados; conserva los filtros (?query) */
  function enlace(cambio: Partial<Estado>) {
    return { name: route.name!, params: { ...route.params, segmentos: segmentos({ ...estado.value, ...cambio }) }, query: route.query }
  }

  function ir(cambio: Partial<Estado>, reemplazar = false) {
    const loc = enlace(cambio)
    if (loc.params.segmentos.join('/') === segs.value.join('/')) return
    ;(reemplazar ? router.replace(loc) : router.push(loc)).catch(() => { /* navegación reemplazada */ })
  }

  // Deja la URL completa y válida (p. ej. /cuncia/mantenimiento → /cuncia/mantenimiento/planta/ordenes/graficas)
  if (opciones.normalizar) {
    watch(segs, s => {
      if (s.join('/') !== segmentos(estado.value).join('/')) ir({}, true)
    }, { immediate: true })
  }

  const campo = <K extends keyof Estado>(k: K): WritableComputedRef<Estado[K]> => computed({
    get: () => estado.value[k],
    set: v => ir({ [k]: v } as Partial<Estado>),
  })

  return {
    /** Planta · Maquinaria · Inspección · Tareas */
    area: campo('area'),
    /** Órdenes (dashboard) · Almacén · Gerencial · Disponibilidad */
    panel: campo('panel'),
    vistaOT: campo('ot'),
    vistaAlmacen: campo('almacen'),
    vistaDisp: campo('disp'),
    vistaTareas: campo('tareas'),
    enlace,
    ir,
  }
}
