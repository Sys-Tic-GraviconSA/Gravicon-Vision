/**
 * useGraficasConcreto.ts — Estilo común de las gráficas de Concretos (Producción y Proyección).
 * Mismo lenguaje visual de las gráficas de Mantenimiento (EquiposDashboard): colores por planta,
 * valores en "píldora" sobre las marcas, eje de valores sin números y leyenda con círculos.
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
export const emphasis = { focus: 'series' as const, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }

// Con muchos períodos se muestran los últimos VENTANA y una barra para desplazarse
export const VENTANA = 31

// ---------------------------------------------------------------- Estilo dependiente del tema
export function useEstiloGraficas() {
  const { theme } = useTheme()
  const viewportW = useViewportWidth()
  const isLight = computed(() => theme.value === 'light')
  const chartTextColor = computed(() => (isLight.value ? '#475569' : '#94a3b8'))

  // Etiqueta de valor en "píldora" sobre la marca, como en las gráficas de Mantenimiento
  const labelPill = computed(() => ({
    show: true,
    fontSize: 11,
    fontWeight: 600 as const,
    fontFamily: FONT,
    color: isLight.value ? '#334155' : '#e2e8f0',
    backgroundColor: isLight.value ? 'rgba(255,255,255,.92)' : 'rgba(11,15,26,.88)',
    padding: [2, 6] as [number, number],
    borderRadius: 4,
  }))
  // Etiqueta blanca dentro de los segmentos de barras apiladas
  const labelDentro = { show: true, position: 'inside' as const, fontSize: 10, fontWeight: 600 as const, fontFamily: FONT, color: '#fff' }

  function base() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: FONT },
      animation: true,
      animationDuration: 650,
      animationEasing: 'cubicOut' as const,
    }
  }
  function leyenda(data: unknown[], extra: Record<string, unknown> = {}) {
    return {
      top: 8, left: 12, itemGap: 18, icon: 'circle', itemWidth: 10, itemHeight: 10,
      textStyle: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
      data, ...extra,
    }
  }
  function ejeX(data: string[], extra: Record<string, unknown> = {}) {
    return {
      type: 'category' as const, data,
      axisLine: { lineStyle: { color: isLight.value ? '#e2e8f0' : 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11, margin: 12 },
      ...extra,
    }
  }
  // Eje de valores sin números: los valores van como etiquetas sobre las marcas
  function ejeY(extra: Record<string, unknown> = {}) {
    return {
      type: 'value' as const,
      axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: isLight.value ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', type: 'dashed' as const } },
      max: (v: { max: number }) => Math.ceil((v.max || 1) * 1.18),
      ...extra,
    }
  }
  // Siempre se envían los dos dataZoom (apagados si sobran) para que al cambiar de Día a Mes
  // ECharts no conserve la ventana anterior al fusionar la opción.
  function zoom(n: number) {
    const usar = n > VENTANA
    const rango = usar ? { startValue: n - VENTANA, endValue: n - 1 } : { start: 0, end: 100 }
    return {
      dataZoom: [
        { type: 'inside' as const, xAxisIndex: 0, disabled: !usar, zoomOnMouseWheel: false, moveOnMouseWheel: true, ...rango },
        { type: 'slider' as const, xAxisIndex: 0, show: usar, height: 18, bottom: 8, brushSelect: false,
          borderColor: 'transparent', backgroundColor: isLight.value ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
          fillerColor: isLight.value ? 'rgba(59,130,246,0.18)' : 'rgba(96,165,250,0.22)', dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          textStyle: { color: chartTextColor.value, fontSize: 10 }, ...rango },
      ],
      gridBottom: usar ? 50 : 30,
    }
  }
  // Barras horizontales con el layout compartido de Mantenimiento (utils/chartLayout)
  function barrasH(etiquetas: string[], series: any[], textosValor: string[], tooltip: Record<string, unknown>, conLeyenda: boolean) {
    const layout = hBarLayout(etiquetas, hBarValueSpace(textosValor, 56), viewportW.value)
    return {
      ...base(),
      tooltip,
      grid: { ...hBarGrid(layout.labelSpace, layout.valueSpace), top: conLeyenda ? 44 : 20, bottom: 10 },
      xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false }, max: (v: { max: number }) => v.max * 1.02 },
      yAxis: { type: 'category' as const, inverse: true, data: etiquetas, axisTick: { show: false }, axisLine: { show: false },
        axisLabel: { ...hBarAxisLabel(layout.labelSpace), color: chartTextColor.value, fontFamily: FONT } },
      series,
    }
  }

  return { isLight, chartTextColor, labelPill, labelDentro, base, leyenda, ejeX, ejeY, zoom, barrasH }
}
