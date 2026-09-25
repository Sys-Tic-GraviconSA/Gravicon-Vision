/**
 * Remisiones de agregados (arena, grava) registradas en order_price como si fueran concreto.
 * No son concreto: se sacan del volumen de los informes de Concretos. Misma regla que
 * EquiposDashboard (isConcretoMezclaExcluida) y que el informe por correo (agregados_concreto.py).
 */
const MEZCLAS = new Set(['CA ARENA', 'CG2 GRAVA 1/2', 'CG4 GRAVA 3/4', 'CG1 GRAVA DE 1"'])
const RE_CODIGO = /^(CA |CG\d)/

export function esAgregado(mezcla: unknown, cliente: unknown, planta: unknown): boolean {
  const m = String(mezcla ?? '').trim().toUpperCase()
  if (MEZCLAS.has(m) || RE_CODIGO.test(m)) return true
  // Restrepo: ventas "RETIRA…" de grava o arena, o sin mezcla
  const c = String(cliente ?? '').toUpperCase()
  const p = String(planta ?? '').toLowerCase()
  return p.includes('restrepo') && c.includes('RETIRA') && (m === '' || m.includes('GRAVA') || m.includes('ARENA'))
}
