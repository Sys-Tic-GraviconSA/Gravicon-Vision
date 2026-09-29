/**
 * useGraficasConcreto.ts — Estilo común de las gráficas de Concretos (Producción y Proyección).
 * Estilo minimalista: colores por planta, valores como texto discreto junto a la marca (sin cajas),
 * eje de valores sin números, sin sombras y leyenda con puntos pequeños. Se adapta al ancho de pantalla.
 */
import { computed, markRaw } from 'vue'
import { useTheme } from './useTheme'
import { useViewportWidth } from './useViewportWidth'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarValueSpace } from '../utils/chartLayout'

// ---------------------------------------------------------------- Constantes y formatos
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const ORDEN_PLANTAS = ['Villavicencio', 'Acacías', 'Restrepo', 'Puerto Concordia']

// Mismos colores de las gráficas de Mantenimiento: planta y paleta general
export const COLOR_PLANTA: Record<string, string> = {
  'Villavicencio': '#ec4899', 'Acacías': '#38a9f8', 'Restrepo': '#3b4cb8', 'Puerto Concordia': '#10B981',
}
export const PALETA = ['#15223c', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#A855F7']
export const COLOR_EXTRA = ['#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16']
export const AZUL = '#3B82F6'
export const FONT = 'Lato, sans-serif'

export function fmtN(n: number, d = 1): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function cop(n: number): string { return '$ ' + fmtN(n, 0) }
export function copCorto(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return '$ ' + fmtN(n / 1e9, 1) + ' mil M'
  if (a >= 1e6) return '$ ' + fmtN(n / 1e6, 1) + ' M'
  if (a >= 1e3) return '$ ' + fmtN(n / 1e3, 0) + ' mil'
  return '$ ' + fmtN(n, 0)
}
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
  function zoom(n: number) {
    const v = ventana.value
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
