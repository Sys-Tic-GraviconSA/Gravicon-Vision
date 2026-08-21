/** Formatea un número con 1 decimal según locale es-CO (ej. "1.234,5") */
export function fmt(n: number): string {
  return n?.toLocaleString('es-CO', { maximumFractionDigits: 1 }) ?? '0'
}


/** Calcula el intervalo de ticks para un eje, limitando el número de marcas visibles */
export function tickInterval(len: number, n = 12): number {
  return Math.max(0, Math.ceil(len / n) - 1)
}
