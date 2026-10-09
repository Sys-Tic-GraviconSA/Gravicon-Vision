/**
 * useGraficasConcreto.ts — Estilo común de las gráficas de Concretos (Producción y Proyección).
 * Estilo minimalista: colores por planta, valores como texto discreto junto a la marca (sin cajas),
 * eje de valores sin números, sin sombras y leyenda con puntos pequeños. Se adapta al ancho de pantalla.
 */
import { computed, markRaw } from 'vue'
import { useTheme } from './useTheme'
import { useViewportWidth } from './useViewportWidth'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarValueSpace } from '../utils/chartLayout'
import { serialToDate } from '../utils/dates'

// ---------------------------------------------------------------- Constantes y formatos
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const ORDEN_PLANTAS = ['Villavicencio', 'Acacías', 'Restrepo', 'Puerto Concordia']

// Mismos colores de las gráficas de Mantenimiento: planta y paleta general.
// Un color fijo por planta en TODA la app (Concretos, Mantenimiento y bodegas de destino de los traslados de Despacho).
// Usme y Puerto Gaitán solo aparecen como bodega de destino (B15, B20).
export const COLOR_PLANTA: Record<string, string> = {
  'Villavicencio': '#ec4899', 'Acacías': '#38a9f8', 'Restrepo': '#3b4cb8', 'Puerto Concordia': '#10B981',
  'Usme': '#D97706', 'Puerto Gaitán': '#7C3AED',
}
export const PALETA = ['#15223c', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#A855F7']
export const COLOR_EXTRA = ['#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16']
export const AZUL = '#3B82F6'
export const FONT = 'Lato, sans-serif'

// Valores enteros por defecto (m³, galones, conteos); los porcentajes y razones piden sus decimales
export function fmtN(n: number, d = 0): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function cop(n: number): string { return '$ ' + fmtN(n, 0) }
/** Antes abreviaba («$ 86,6 M»); por pedido del usuario los costos van siempre completos, igual que cop() */
export function copCorto(n: number): string { return cop(n) }
export function pct(n: number, d = 1, signo = false): string { return (signo && n > 0 ? '+' : '') + fmtN(n, d) + '%' }
export function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
export function nombrePlanta(v: unknown): string {
  const s = String(v ?? '').replace(/^Planta\s+/i, '').trim()
  if (/^acacias$/i.test(s)) return 'Acacías'
  if (/concordia/i.test(s)) return 'Puerto Concordia'
  return s || 'Sin planta'
}
export function titulo(s: string): string { return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) }
export function ordenarPlantas(ps: Iterable<string>): string[] {
  return [...ps].sort((a, b) => (ORDEN_PLANTAS.indexOf(a) + 99) % 99 - (ORDEN_PLANTAS.indexOf(b) + 99) % 99 || a.localeCompare(b))
}

// ---------------------------------------------------------------- Condición comercial
/** Remisiones cargadas antes de que order_price trajera la condición comercial */
export const SIN_CONDICION = 'Sin dato'
/** «Contado», «Crédito a 30 días»…; vacío = «Sin dato» */
export function condicionComercial(v: unknown): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').replace(/\bdias\b/gi, 'días') || SIN_CONDICION
}
/** Contado primero, luego los créditos de menor a mayor plazo y al final «Sin dato» */
export function ordenCondicion(a: string, b: string): number {
  const peso = (c: string) => (c === SIN_CONDICION ? 3 : /^contado/i.test(c) ? 0 : /cr[ée]dito/i.test(c) ? 1 : 2)
  return peso(a) - peso(b) || a.localeCompare(b, 'es', { numeric: true })
}
/** Contado verde; crédito ámbar → rojo según el plazo; «Sin dato» gris */
export function COLOR_CONDICION(c: string): string {
  if (c === SIN_CONDICION) return '#94A3B8'
  if (/^contado/i.test(c)) return '#10B981'
  if (/cr[ée]dito/i.test(c)) { const dias = Number(c.match(/\d+/)?.[0] ?? 30); return dias <= 30 ? '#F59E0B' : dias <= 60 ? '#F97316' : '#EF4444' }
  return '#8B5CF6'
}
/** «Crédito a 30 días» → «Crédito 30 d» (columnas angostas) */
export const condicionCorta = (c: string) => c.replace(/cr[ée]dito a (\d+) d[ií]as/i, 'Crédito $1 d')

export interface CondicionCliente {
  /** Condición con más m³ */
  principal: string
  /** m³ por condición, de mayor a menor */
  partes: { condicion: string; m3: number; pct: number }[]
  mixta: boolean
}
/**
 * Condición comercial de cada cliente según sus remisiones (clave = `clave(cliente)`).
 * Usa las remisiones del rango [desde, hasta]; si el cliente no tiene ninguna allí, toma todas las que tenga.
 */
export function condicionPorCliente(rows: Record<string, unknown>[], clave: (cliente: unknown) => string, desde = '', hasta = ''): Map<string, CondicionCliente> {
  const enRango = new Map<string, Map<string, number>>(), todas = new Map<string, Map<string, number>>()
  const sumar = (m: Map<string, Map<string, number>>, k: string, c: string, v: number) => {
    let x = m.get(k); if (!x) m.set(k, (x = new Map()))
    x.set(c, (x.get(c) ?? 0) + v)
  }
  for (const r of rows) {
    const f = r['Fecha']
    if (typeof f !== 'number' || !f) continue
    const k = clave(r['Cliente']), c = condicionComercial(r['Condición Comercial'])
    if (!k || c === SIN_CONDICION) continue
    const v = num(r['Cant. Concreto']) || 1e-6
    sumar(todas, k, c, v)
    const iso = serialToDate(f).toISOString().slice(0, 10)
    if ((!desde || iso >= desde) && (!hasta || iso <= hasta)) sumar(enRango, k, c, v)
  }
  const out = new Map<string, CondicionCliente>()
  for (const [k, base] of todas) {
    const m = enRango.get(k) ?? base
    const tot = [...m.values()].reduce((a, v) => a + v, 0)
    const partes = [...m.entries()].map(([condicion, m3]) => ({ condicion, m3, pct: tot ? m3 / tot * 100 : 0 }))
      .sort((a, b) => b.m3 - a.m3 || ordenCondicion(a.condicion, b.condicion))
    out.set(k, { principal: partes[0].condicion, partes, mixta: partes.length > 1 })
  }
  return out
}

export interface ResumenCondicion { condicion: string; m3: number; venta: number; rem: number; porPlanta: Map<string, { m3: number; venta: number; rem: number }> }
/** m³, venta y remisiones por condición comercial, con el desglose por planta */
export function resumirCondicion(rs: { condicion: string; planta: string; m3: number; venta: number }[]): ResumenCondicion[] {
  const map = new Map<string, ResumenCondicion>()
  for (const r of rs) {
    let e = map.get(r.condicion)
    if (!e) map.set(r.condicion, (e = { condicion: r.condicion, m3: 0, venta: 0, rem: 0, porPlanta: new Map() }))
    e.m3 += r.m3; e.venta += r.venta; e.rem++
    const p = e.porPlanta.get(r.planta) ?? { m3: 0, venta: 0, rem: 0 }
    p.m3 += r.m3; p.venta += r.venta; p.rem++
    e.porPlanta.set(r.planta, p)
  }
  return [...map.values()].sort((a, b) => ordenCondicion(a.condicion, b.condicion))
}

export const punto = (c: string) => `<span style="color:${c}">●</span>`
export const m3Lbl = (v: number) => fmtN(v, 0)
export const vacio = (o: Record<string, unknown>, hay: boolean) => (hay ? markRaw(o) : null)
// Al pasar el mouse se atenúan las demás series; sin sombras para mantener el trazo limpio
export const emphasis = { focus: 'series' as const }

// Con muchos períodos se muestran los últimos VENTANA y una barra para desplazarse (menos en celular)
export const VENTANA = 31
export const VENTANA_MOVIL = 10
/** Ancho (px) por debajo del cual las gráficas usan el modo compacto de celular */
export const ANCHO_MOVIL = 640

// ---------------------------------------------------------------- Estilo dependiente del tema
export function useEstiloGraficas() {
  const { theme } = useTheme()
  const viewportW = useViewportWidth()
  const isLight = computed(() => theme.value === 'light')
  const chartTextColor = computed(() => (isLight.value ? '#64748b' : '#94a3b8'))
  /** Color «tinta» para totales y series neutras: azul marino en claro, gris claro en oscuro (el marino no se ve) */
  const tinta = computed(() => (isLight.value ? '#15223c' : '#cbd5e1'))
  const movil = computed(() => viewportW.value < ANCHO_MOVIL)
  /** Períodos visibles a la vez en las tendencias: menos en celular para que las barras no queden de 2 px */
  const ventana = computed(() => (movil.value ? VENTANA_MOVIL : VENTANA))

  // Etiqueta de valor: texto discreto sin caja ni fondo (el nombre se conserva por compatibilidad)
  const labelPill = computed(() => ({
    show: true,
    fontSize: movil.value ? 10 : 11,
    fontWeight: 600 as const,
    fontFamily: FONT,
    color: isLight.value ? '#475569' : '#cbd5e1',
    distance: 4,
  }))
  // Etiqueta blanca dentro de los segmentos de barras apiladas
  const labelDentro = { show: true, position: 'inside' as const, fontSize: 10, fontWeight: 600 as const, fontFamily: FONT, color: '#fff' }

  function base() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: FONT },
      animation: true,
      animationDuration: 400,
      animationEasing: 'cubicOut' as const,
      // Al cambiar filtros las barras, líneas y donas pasan suavemente de un valor al otro
      animationDurationUpdate: 550,
      animationEasingUpdate: 'cubicInOut' as const,
    }
  }
  function leyenda(data: unknown[], extra: Record<string, unknown> = {}) {
    return {
      top: 4, left: 4, itemGap: movil.value ? 10 : 16, icon: 'circle', itemWidth: 8, itemHeight: 8,
      // En celular la leyenda se desplaza en una sola línea en vez de tapar la gráfica
      type: movil.value ? 'scroll' as const : 'plain' as const, pageIconSize: 10,
      textStyle: { fontFamily: FONT, fontWeight: 500 as const, color: chartTextColor.value, fontSize: movil.value ? 10 : 11 },
      data, ...extra,
    }
  }
  function ejeX(data: string[], extra: Record<string, unknown> = {}) {
    return {
      type: 'category' as const, data,
      axisLine: { lineStyle: { color: isLight.value ? '#e2e8f0' : 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontWeight: 500 as const, color: chartTextColor.value, fontSize: movil.value ? 10 : 11, margin: 10, hideOverlap: true },
      ...extra,
    }
  }
  // Eje de valores sin números: los valores van como etiquetas sobre las marcas
  function ejeY(extra: Record<string, unknown> = {}) {
    return {
      type: 'value' as const,
      axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      splitLine: { show: false },
      max: (v: { max: number }) => Math.ceil((v.max || 1) * 1.18),
      ...extra,
    }
  }
  // Siempre se envían los dos dataZoom (apagados si sobran) para que al cambiar de Día a Mes
  // ECharts no conserve la ventana anterior al fusionar la opción.
  /** `maxVisible`: cuántos puntos se ven a la vez (por defecto la ventana normal); menos para cifras largas como pesos completos */
  function zoom(n: number, maxVisible?: number) {
    const v = maxVisible ?? ventana.value
    const usar = n > v
    const rango = usar ? { startValue: n - v, endValue: n - 1 } : { start: 0, end: 100 }
    return {
      dataZoom: [
        { type: 'inside' as const, xAxisIndex: 0, disabled: !usar, zoomOnMouseWheel: false, moveOnMouseWheel: true, ...rango },
        { type: 'slider' as const, xAxisIndex: 0, show: usar, height: 14, bottom: 6, brushSelect: false, showDetail: false,
          borderColor: 'transparent', backgroundColor: isLight.value ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
          fillerColor: isLight.value ? 'rgba(59,130,246,0.18)' : 'rgba(96,165,250,0.22)', dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          textStyle: { color: chartTextColor.value, fontSize: 10 }, ...rango },
      ],
      gridBottom: usar ? 40 : 24,
    }
  }
  // Barras horizontales con el layout compartido de Mantenimiento (utils/chartLayout)
  function barrasH(etiquetas: string[], series: any[], textosValor: string[], tooltip: Record<string, unknown>, conLeyenda: boolean) {
    const layout = hBarLayout(etiquetas, hBarValueSpace(textosValor, 56), viewportW.value)
    return {
      ...base(),
      tooltip,
      grid: { ...hBarGrid(layout.labelSpace, layout.valueSpace), top: conLeyenda ? 32 : 12, bottom: 8 },
      xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false }, max: (v: { max: number }) => v.max * 1.02 },
      yAxis: { type: 'category' as const, inverse: true, data: etiquetas, axisTick: { show: false }, axisLine: { show: false },
        axisLabel: { ...hBarAxisLabel(layout.labelSpace), color: chartTextColor.value, fontFamily: FONT } },
      series,
    }
  }

  return { isLight, chartTextColor, tinta, labelPill, labelDentro, base, leyenda, ejeX, ejeY, zoom, barrasH, movil, ventana }
}
