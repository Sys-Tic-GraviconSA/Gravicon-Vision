/**
 * chartLayout.ts — Helpers de layout reutilizables para gráficos ECharts de
 * barras horizontales.
 *
 * El problema que resuelven: cuando las categorías del eje Y tienen nombres de
 * longitudes muy distintas, un `grid.left` fijo deja las barras desplazadas
 * (demasiado espacio con etiquetas cortas, o etiquetas cortadas con las largas).
 *
 * La solución:
 * - El ancho de etiquetas se calcula según la longitud real, pero SIEMPRE con
 *   un tope responsive (`hBarLabelCap`): una etiqueta larga nunca amplía el
 *   espacio izquierdo más allá del tope.
 * - Las etiquetas que superan el espacio reservado se truncan con ellipsis
 *   (`hBarAxisLabel`) y el nombre completo se muestra en el tooltip.
 * - El espacio de valores a la derecha se calcula a partir de los textos reales
 *   (`hBarValueSpace`) para que nunca se corten.
 * - `grid.containLabel` queda en `false` (vía `hBarGrid`): ECharts respeta
 *   exactamente `grid.left` y no vuelve a medir el texto completo de las
 *   etiquetas, que es lo que desplazaba las barras hacia la derecha.
 */

/** Ancho estimado en px de un texto para la fuente usada en los ejes (sans, ~11px). */
export function estimateTextWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    w += ch.charCodeAt(0) > 255 ? 10.5 : 6.2
  }
  return w
}

/**
 * Tope responsive del ancho de etiquetas (en px) según el ancho del viewport.
 * Desktop: ~150–170, tablet: ~108–138, pantallas pequeñas: ~92.
 */
export function hBarLabelCap(viewportW: number): number {
  if (viewportW >= 1440) return 170
  if (viewportW >= 1200) return 150
  if (viewportW >= 992) return 138
  if (viewportW >= 768) return 122
  if (viewportW >= 480) return 108
  return 92
}

/**
 * Espacio en px reservado a la derecha (para los valores al final de las barras),
 * calculado a partir de los textos reales que se van a mostrar.
 * @param texts Textos formateados de los valores (ej. "1.234").
 * @param min Espacio mínimo garantizado.
 */
export function hBarValueSpace(texts: string[], min = 20): number {
  const maxPx = texts.reduce((m, t) => Math.max(m, estimateTextWidth(t)), 0)
  return Math.max(maxPx + 14, min)
}

/**
 * Layout reutilizable para gráficos de barras horizontales.
 * @param labels Etiquetas del eje Y (categorías).
 * @param valueSpace Espacio en px reservado a la derecha para los valores.
 * @param viewportW Ancho actual del viewport (para el tope responsive).
 */
export function hBarLayout(labels: string[], valueSpace: number, viewportW: number) {
  const longestPx = labels.reduce((m, l) => Math.max(m, estimateTextWidth(l)), 0)
  const labelSpace = Math.min(longestPx + 14, hBarLabelCap(viewportW))
  return { labelSpace, valueSpace: Math.max(valueSpace, 16) }
}

/**
 * Grid para barras horizontales. `containLabel: false` garantiza que ECharts
 * use exactamente `left` (el espacio de etiquetas) y no amplíe el margen según
 * el texto completo. Se suma un pequeño margen para la separación de etiquetas.
 */
export function hBarGrid(labelSpace: number, valueSpace: number) {
  return {
    left: labelSpace + 10,
    right: valueSpace,
    bottom: 30,
    top: 20,
    containLabel: false as const,
    splitLine: { show: false },
  }
}

/** Configuración de etiquetas del eje Y que trunca con ellipsis las muy largas. */
export function hBarAxisLabel(maxPx: number) {
  return {
    fontWeight: 600 as const,
    fontSize: 11,
    width: maxPx,
    overflow: 'truncate' as const,
    ellipsis: '…',
  }
}

/**
 * Tooltip para barras horizontales que muestra el nombre COMPLETO de la
 * categoría (aunque el eje lo trunque) y los valores de la fila.
 * @param labels Etiquetas completas del eje Y.
 * @param valueFmt Formateador opcional del valor.
 */
export function hBarTooltip(labels: string[], valueFmt?: (v: number) => string) {
  return {
    trigger: 'axis' as const,
    formatter: (params: any) => {
      const arr = Array.isArray(params) ? params : [params]
      const p = arr[0]
      const full = labels[p.dataIndex] ?? p.name ?? ''
      const fmt = valueFmt ?? ((v: number) => v.toLocaleString('es-CO'))
      const rows = arr
        .map((x: any) => `${x.marker ?? ''} ${x.seriesName}: <b>${fmt(Number(x.value) || 0)}</b>`)
        .join('<br/>')
      return `<b>${full}</b><br/>${rows}`
    },
  }
}
