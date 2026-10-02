import { computed, watch, type WritableComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * useRutaMantenimiento.ts — Estado de navegación de Mantenimiento guardado en la ruta.
 *
 *   /:planta/mantenimiento/:area/:seccion/:vista
 *
 *   area       planta | maquinaria | tareas
 *   seccion    (planta/maquinaria) ordenes | almacen | gerencial | disponibilidad
 *              (Concretos)         combustible (planta y maquinaria) · llantas (solo maquinaria)
 *              (tareas)            graficas | tabla | informe
 *   vista      ordenes:        graficas | detalle | informe
 *              almacen:        graficas | solicitudes
 *              disponibilidad: graficas | informe
 *              llantas:        graficas | alertas | inventario | informe
 *   Enlaces viejos: /inspeccion, …/maquinaria/inspeccion (hoy Llantas), /combustible y …/disponibilidad/combustible llevan a maquinaria/…
 *   La sección de llantas se llama internamente «inspeccion» (su permiso sigue siendo …/mantenimiento/inspeccion).
 *
 * Ejemplos: /cuncia/mantenimiento/planta/ordenes/graficas
 *           /concretos/mantenimiento/maquinaria/disponibilidad/informe
 *           /acacias/mantenimiento/tareas/tabla
 *
 * Expone los mismos valores internos que ya usaban las vistas (dashboard/resumen/graficos…),
 * así el código de EquiposDashboard, DisponibilidadTab y TareasTab no cambia: solo de dónde
 * sale el estado. Cada cambio es una navegación real (historial, atrás/adelante, enlace).
 */

export type Area = 'planta' | 'maquinaria' | 'tareas'
export type Panel = 'dashboard' | 'almacen' | 'gerencial' | 'disponibilidad' | 'inspeccion' | 'combustible'
export type VistaOT = 'resumen' | 'ordenes' | 'informe'
export type VistaAlmacen = 'graficos' | 'solicitudes'
export type VistaDisp = 'graficas' | 'informe'
export type VistaTareas = 'graficas' | 'tabla' | 'informe'
export type VistaLlantas = 'graficas' | 'alertas' | 'inventario' | 'informe'

interface Estado { area: Area; panel: Panel; ot: VistaOT; almacen: VistaAlmacen; disp: VistaDisp; tareas: VistaTareas; llantas: VistaLlantas }

const AREAS: Area[] = ['planta', 'maquinaria', 'tareas']
// Nombre en la URL ↔ valor interno
const PANEL_URL: Record<Panel, string> = { dashboard: 'ordenes', almacen: 'almacen', gerencial: 'gerencial', disponibilidad: 'disponibilidad', inspeccion: 'llantas', combustible: 'combustible' }
/** Secciones sin vistas internas */
const SIN_VISTA: Panel[] = ['gerencial', 'combustible']
const OT_URL: Record<VistaOT, string> = { resumen: 'graficas', ordenes: 'detalle', informe: 'informe' }
const ALMACEN_URL: Record<VistaAlmacen, string> = { graficos: 'graficas', solicitudes: 'solicitudes' }
const DISP: VistaDisp[] = ['graficas', 'informe']
const TAREAS: VistaTareas[] = ['graficas', 'tabla', 'informe']
const LLANTAS: VistaLlantas[] = ['graficas', 'alertas', 'inventario', 'informe']

const DEFECTO: Estado = { area: 'planta', panel: 'dashboard', ot: 'resumen', almacen: 'graficos', disp: 'graficas', tareas: 'graficas', llantas: 'graficas' }

const inverso = <K extends string>(m: Record<K, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>
// «inspeccion» era el nombre anterior de la sección Llantas en la URL
const PANEL_DE: Record<string, Panel> = { ...inverso(PANEL_URL), inspeccion: 'inspeccion' }
const OT_DE = inverso(OT_URL)
const ALMACEN_DE = inverso(ALMACEN_URL)

/** Lee la ruta; lo que falte o no sea válido toma el valor por defecto. */
export function leerEstado(segs: string[]): Estado {
  const e: Estado = { ...DEFECTO }
  const [a, s, v] = segs
  // Enlaces viejos: Inspección y Combustible eran pestañas propias
  if (a === 'inspeccion' || a === 'combustible') return { ...e, area: 'maquinaria', panel: a }
  if (AREAS.includes(a as Area)) e.area = a as Area
  if (e.area === 'tareas') {
    if (TAREAS.includes(s as VistaTareas)) e.tareas = s as VistaTareas
    return e
  }
  if (PANEL_DE[s]) e.panel = PANEL_DE[s]
  // Combustible estuvo dentro de Disponibilidad: el enlace viejo lleva a Combustible de la misma área
  if (e.panel === 'disponibilidad' && v === 'combustible') return { ...e, panel: 'combustible' }
  // Llantas solo existe dentro de Maquinaria
  if (e.panel === 'inspeccion') return { ...e, area: 'maquinaria', llantas: LLANTAS.includes(v as VistaLlantas) ? v as VistaLlantas : 'graficas' }
  if (e.panel === 'dashboard' && OT_DE[v]) e.ot = OT_DE[v]
  if (e.panel === 'almacen' && ALMACEN_DE[v]) e.almacen = ALMACEN_DE[v]
  if (e.panel === 'disponibilidad' && DISP.includes(v as VistaDisp)) e.disp = v as VistaDisp
  return e
}

/** Segmentos canónicos de la URL para un estado. */
export function segmentos(e: Estado): string[] {
  if (e.area === 'tareas') return ['tareas', e.tareas]
  const panel = PANEL_URL[e.panel]
  if (SIN_VISTA.includes(e.panel)) return [e.area, panel]
  const vista = e.panel === 'dashboard' ? OT_URL[e.ot] : e.panel === 'almacen' ? ALMACEN_URL[e.almacen] : e.panel === 'inspeccion' ? e.llantas : e.disp
  return [e.area, panel, vista]
}

/**
 * Todas las ubicaciones canónicas de Mantenimiento de una planta, en el orden de preferencia
 * (el mismo de las pestañas). El router las usa para llevar al usuario a la primera vista permitida.
 */
export function estadosMantenimiento(concretos: boolean): string[][] {
  const out: string[][] = []
  for (const area of ['planta', 'maquinaria'] as const) {
    const base: Omit<Estado, 'panel'> = { ...DEFECTO, area }
    const paneles: Panel[] = ['dashboard', 'almacen', 'gerencial', 'disponibilidad',
      ...(concretos && area === 'maquinaria' ? ['inspeccion' as const] : []),
      ...(concretos ? ['combustible' as const] : [])]
    for (const panel of paneles) {
      const vistas: Partial<Estado>[] = panel === 'dashboard' ? (Object.keys(OT_URL) as VistaOT[]).map(ot => ({ ot }))
        : panel === 'almacen' ? (Object.keys(ALMACEN_URL) as VistaAlmacen[]).map(almacen => ({ almacen }))
        : panel === 'disponibilidad' ? DISP.map(disp => ({ disp }))
        : panel === 'inspeccion' ? LLANTAS.map(llantas => ({ llantas }))
        : [{}]
      for (const v of vistas) out.push(segmentos({ ...base, panel, ...v }))
    }
  }
  for (const tareas of TAREAS) out.push(segmentos({ ...DEFECTO, area: 'tareas', tareas }))
  return out
}

/**
 * Claves de permiso de una ubicación de Mantenimiento (segmentos de la URL): la ruta canónica
 * (los enlaces viejos, p. ej. …/maquinaria/inspeccion, se revisan como …/maquinaria/llantas/graficas)
 * y la clave general de Disponibilidad, Llantas (…/mantenimiento/inspeccion, nombre anterior) y Combustible.
 */
export function clavesMantenimiento(planta: string, segs: string[]): string[] {
  const canon = segmentos(leerEstado(segs))
  const generales = ([['disponibilidad', 'disponibilidad'], ['llantas', 'inspeccion'], ['combustible', 'combustible']] as const)
    .filter(([seg]) => canon[1] === seg)
    .map(([, clave]) => `${planta}/mantenimiento/${clave}`)
  return [`${planta}/mantenimiento/${canon.join('/')}`, ...generales]
}

/** ¿El usuario puede ver esa ubicación de Mantenimiento? (cada vista tiene su permiso) */
export function mantenimientoPermitido(planta: string, segs: string[]): boolean {
  const auth = useAuthStore()
  return clavesMantenimiento(planta, segs).every(k => auth.canView(k))
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

  /**
   * ¿Se muestra la pestaña que lleva a este cambio? Cada vista tiene su permiso:
   *  - área (Planta/Maquinaria/Tareas) o sección (Órdenes, Almacén…): si alguna de sus vistas está permitida
   *  - vista (Gráficas, Detalle, Informe…): si esa vista está permitida
   */
  function puede(cambio: Partial<Estado>): boolean {
    const planta = route.path.split('/')[1] ?? ''
    const destino = segmentos({ ...estado.value, ...cambio })
    const nivel = 'area' in cambio ? 1 : 'panel' in cambio ? 2 : destino.length
    const prefijo = destino.slice(0, nivel)
    return estadosMantenimiento(planta === 'concretos')
      .filter(c => prefijo.every((x, i) => c[i] === x))
      .some(c => mantenimientoPermitido(planta, c))
  }

  return {
    /** ¿Se muestra la pestaña de ese cambio? (permiso de cada vista) */
    puede,
    /** Planta · Maquinaria · Tareas */
    area: campo('area'),
    /** Órdenes (dashboard) · Almacén · Gerencial · Disponibilidad · Combustible · Llantas (solo Maquinaria) */
    panel: campo('panel'),
    vistaOT: campo('ot'),
    vistaAlmacen: campo('almacen'),
    vistaDisp: campo('disp'),
    vistaTareas: campo('tareas'),
    /** Llantas: Gráficas · Alertas · Inventario · Informe */
    vistaLlantas: campo('llantas'),
    enlace,
    ir,
  }
}
