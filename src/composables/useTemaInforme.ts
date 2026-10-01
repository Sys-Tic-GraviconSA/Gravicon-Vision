/**
 * useTemaInforme.ts — Gráficas de los informes en tema oscuro.
 *
 * Las gráficas de los informes se definen con colores para papel blanco (son los del PDF).
 * En pantalla con tema oscuro, `tema(opcion)` devuelve una copia de la opción con esos colores
 * cambiados por sus equivalentes para fondo oscuro (textos claros, rejillas tenues, el azul marino
 * a gris claro). Mientras se genera el PDF (`capturandoPdf`), las gráficas vuelven a los colores
 * de papel, así el PDF sale siempre igual.
 */
import { computed, ref } from 'vue'
import { useTheme } from './useTheme'

/** true mientras se captura un informe para el PDF (lo ponen descargarInformePdf y los informes de Concretos) */
export const capturandoPdf = ref(false)

// Color para papel blanco → color para fondo oscuro (claves en minúscula)
const MAPA: Record<string, string> = {
  // textos y etiquetas
  '#0f172a': '#f1f5f9', '#1e293b': '#e2e8f0', '#334155': '#e2e8f0', '#475569': '#cbd5e1',
  '#64748b': '#a3b1c6', '#1e3a8a': '#93c5fd',
  // azul marino de la marca (títulos, series «Arena», totales): sobre oscuro no se vería
  '#172954': '#cbd5e1', '#15223c': '#cbd5e1',
  // rejillas, ejes y barras de referencia grises
  '#eef2f7': 'rgba(255,255,255,0.07)', '#f1f5f9': 'rgba(255,255,255,0.07)', '#e2e8f0': 'rgba(255,255,255,0.12)',
  '#cbd5e1': '#475569', '#94a3b8': '#7c8aa0', '#666': '#a3b1c6', '#666666': '#a3b1c6', '#e0d8ec': 'rgba(255,255,255,0.08)',
  // El blanco no se cambia: son textos dentro de barras de color y bordes de puntos
}
const TEXTO_OSCURO = '#cbd5e1'

function adaptar(v: unknown): unknown {
  if (typeof v === 'string') return MAPA[v.toLowerCase()] ?? v
  if (Array.isArray(v)) return v.map(adaptar)
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) out[k] = adaptar(x)
    return out
  }
  return v // funciones (formatters), números y demás quedan igual
}

export function useTemaInforme() {
  const { theme } = useTheme()
  const oscuro = computed(() => theme.value === 'dark' && !capturandoPdf.value)
  /** Opción de ECharts lista para el tema actual (en claro y durante el PDF, la misma de papel) */
  function tema<T>(opcion: T): T {
    if (!oscuro.value || !opcion || typeof opcion !== 'object') return opcion
    const o = adaptar(opcion) as Record<string, unknown>
    // Texto por defecto claro (ECharts usa gris oscuro si la opción no fija color)
    o.textStyle = { ...(o.textStyle as object ?? {}), color: (o.textStyle as { color?: string } | undefined)?.color ?? TEXTO_OSCURO }
    o.backgroundColor = 'transparent'
    return o as T
  }
  return { oscuro, tema }
}
