/**
 * calidadDato.ts — Hallazgos de la sección «Control de calidad del dato» de los informes.
 * Mismo formato en todos (Despacho, Producción, Concretos, Proyección): una tarjeta por hallazgo,
 * con prioridad, texto con la acción a tomar y, si aplica, la tabla con el detalle para corregirlo.
 */
export interface TablaDq {
  cols: string[]
  filas: { celdas: string[]; total?: boolean; clases?: Record<number, string> }[]
  /** columna en letra monoespaciada (códigos) */
  mono?: number
  /** false: columnas de texto (no alinear a la derecha) */
  der?: boolean
  /** columnas de texto largo (observaciones, clientes): a la izquierda y con salto de línea */
  izq?: number[]
}
export interface Hallazgo { nivel: 'alto' | 'medio' | 'info'; titulo: string; texto: string; tabla?: TablaDq }

const ORDEN = { alto: 0, medio: 1, info: 2 } as const
/** Ordena por prioridad (alta, revisar, informativo) conservando el orden dentro de cada nivel */
export const porPrioridad = (hs: Hallazgo[]) => [...hs].sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel])
export const etiquetaNivel = (n: Hallazgo['nivel']) => (n === 'alto' ? 'Prioridad alta' : n === 'medio' ? 'Revisar' : 'Informativo')
export const pillNivel = (n: Hallazgo['nivel']) => (n === 'alto' ? 'p-rojo' : n === 'medio' ? 'p-ambar' : 'p-gris')
