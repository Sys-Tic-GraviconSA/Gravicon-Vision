/**
 * concretoCharts.ts — Estilo común de las gráficas de Producción Concretos.
 * Mismos colores por planta que el Informe Comercial, cifras en formato es-CO,
 * tooltips con unidades y ayudas para totales en barras apiladas y promedios.
 */
import type { Theme } from '../composables/useTheme'

/** Color fijo por planta (tema claro = colores del Informe Comercial) */
const PLANTA_CLARO: Record<string, string> = {
  Villavicencio: '#172954', Acacias: '#2563eb', 'Acacías': '#2563eb', Restrepo: '#93c5fd', 'Puerto Concordia': '#10b981',
}
/** En oscuro el navy no contrasta: se usan tonos más claros de la misma familia */
const PLANTA_OSCURO: Record<string, string> = {
  Villavicencio: '#60a5fa', Acacias: '#3b82f6', 'Acacías': '#3b82f6', Restrepo: '#bfdbfe', 'Puerto Concordia': '#34d399',
}
const EXTRA = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#ef4444']

export function colorPlanta(planta: string, theme: Theme): string {
  const map = theme === 'light' ? PLANTA_CLARO : PLANTA_OSCURO
  if (map[planta]) return map[planta]
  const h = [...planta].reduce((a, c) => a + c.charCodeAt(0), 0)
  return EXTRA[h % EXTRA.length]
}

/** Color principal de serie única (navy en claro, azul en oscuro) */
export function colorPrincipal(theme: Theme): string {
  return theme === 'light' ? '#172954' : '#60a5fa'
}

export const VERDE = '#16a34a'
export const ROJO = '#dc2626'
export const AMBAR = '#f59e0b'
export const GRIS = '#64748b'

export function fmtNum(n: number, d = 1): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: d })
}
export function fmtM3(n: number, d = 1): string { return fmtNum(n, d) + ' m³' }
export function fmtPct(n: number, d = 1): string { return fmtNum(n, d) + '%' }

/** Colores de texto, ejes y fondos de etiqueta según el tema */
export function paleta(theme: Theme) {
  const claro = theme === 'light'
  return {
    texto: claro ? '#1e293b' : '#e2e8f0',
    textoSuave: claro ? '#64748b' : '#94a3b8',
    rejilla: claro ? '#e2e8f0' : 'rgba(255,255,255,.08)',
    fondoEtiqueta: claro ? 'rgba(255,255,255,.9)' : 'rgba(15,23,42,.85)',
  }
}

/** Leyenda arriba a la derecha, igual que en el informe */
export function leyenda(theme: Theme, extra: Record<string, unknown> = {}) {
  return { top: 0, right: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 11, fontWeight: 600, color: paleta(theme).textoSuave }, ...extra }
}

/** Eje de valores discreto con rejilla punteada */
export function ejeValor(theme: Theme, nombre = 'm³', extra: Record<string, unknown> = {}) {
  const p = paleta(theme)
  return {
    type: 'value' as const,
    name: nombre,
    nameTextStyle: { color: p.textoSuave, fontSize: 10, fontWeight: 'bold' as const },
    axisLine: { show: false }, axisTick: { show: false },
    splitLine: { show: true, lineStyle: { color: p.rejilla, type: 'dashed' as const } },
    axisLabel: { fontSize: 10, color: p.textoSuave, formatter: (v: number) => fmtNum(v, 0) },
    ...extra,
  }
}

/** Eje de categorías con etiquetas en negrita */
export function ejeCategoria(theme: Theme, data: string[], extra: Record<string, unknown> = {}) {
  return {
    type: 'category' as const, data,
    axisTick: { show: false },
    axisLabel: { fontSize: 10, fontWeight: 'bold' as const, color: paleta(theme).texto },
    ...extra,
  }
}

/** Tooltip de eje con valores formateados */
export function tooltipEje(unidad = 'm³', d = 1) {
  return {
    trigger: 'axis' as const,
    axisPointer: { type: 'shadow' as const },
    valueFormatter: (v: unknown) => (v == null || v === '' ? '—' : `${fmtNum(Number(v), d)}${unidad ? ' ' + unidad : ''}`),
  }
}

/**
 * Serie "fantasma" que dibuja el total encima de una pila de barras.
 * Se agrega al final de las series apiladas con el mismo `stack`.
 */
export function serieTotal(totales: number[], theme: Theme, stack = 't', posicion: 'top' | 'right' = 'top', d = 0) {
  return {
    name: 'Total', type: 'bar' as const, stack, data: totales.map(() => 0),
    tooltip: { show: false }, legendHoverLink: false,
    label: {
      show: true, position: posicion, distance: 4,
      formatter: (x: { dataIndex: number }) => (totales[x.dataIndex] ? fmtNum(totales[x.dataIndex], d) : ''),
      color: paleta(theme).texto, fontSize: 10, fontWeight: 'bold' as const,
    },
  }
}

/** Línea punteada de promedio (markLine) */
export function lineaPromedio(theme: Theme, etiqueta = 'Promedio', d = 0) {
  return {
    silent: true, symbol: 'none',
    lineStyle: { type: 'dashed' as const, color: GRIS, width: 1.2 },
    label: { position: 'insideEndTop' as const, color: paleta(theme).textoSuave, fontSize: 10, fontWeight: 'bold' as const,
      formatter: (x: { value: number }) => `${etiqueta} ${fmtNum(x.value, d)}` },
    data: [{ type: 'average' as const }],
  }
}

/** Etiqueta de valor al final de una barra horizontal/vertical */
export function etiquetaValor(theme: Theme, posicion: 'top' | 'right' | 'inside', formatter: (v: number, i: number) => string) {
  return {
    show: true, position: posicion, distance: 4,
    formatter: (x: { value: number; dataIndex: number }) => formatter(Number(x.value), x.dataIndex),
    color: posicion === 'inside' ? '#fff' : paleta(theme).texto, fontSize: 10, fontWeight: 'bold' as const,
  }
}
