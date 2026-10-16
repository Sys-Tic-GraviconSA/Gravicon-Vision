/**
 * useProyeccionClientes.ts — Ejecutado de la proyección de clientes desde las remisiones de Concreto 4.0, la misma
 * fuente que la proyección de planta (ya no la columna cantidad_m3 de proyecciones_clientes, que Zoho actualiza tarde).
 *
 * De proyecciones_clientes solo se toma la meta (m3_proyectado). Por mes y planta:
 *   Cliente proyectado  → m³ de las remisiones del mismo cliente y la misma obra (Proyecto), nombres comparados sin
 *                         espacios ni puntuación
 *   «Cliente / Calle»   → m³ de las remisiones de la planta que no son de ningún cliente + obra proyectado
 *   Cliente de Calle    → esas mismas remisiones agrupadas por cliente y obra (reemplazan las filas de Zoho)
 */

export interface FilaProyeccion { mes: string; planta: string; cliente: string; obra: string; tipo: string; meta: number; real: number }
export interface RemisionProyeccion { iso: string; planta: string; cliente: string; obra: string; m3: number }

const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const esCalle = (r: FilaProyeccion) => norm(r.cliente) === 'CLIENTE' && norm(r.obra) === 'CALLE'

/**
 * Recalcula `real` de las filas de proyección con las remisiones (hasta `hasta` YYYY-MM-DD, si se indica).
 * Solo se calculan los meses y plantas que tienen proyección; `mes` puede venir como YYYY-MM o YYYY-MM-DD.
 */
export function proyeccionConRemisiones(filas: FilaProyeccion[], remisiones: RemisionProyeccion[], hasta?: string): FilaProyeccion[] {
  // Remisiones por mes y planta
  const rem = new Map<string, RemisionProyeccion[]>()
  for (const r of remisiones) {
    if (hasta && r.iso > hasta) continue
    const k = `${r.iso.slice(0, 7)}|${r.planta}`
    const l = rem.get(k)
    if (l) l.push(r)
    else rem.set(k, [r])
  }

  // Filas proyectadas por mes y planta (las de calle de Zoho se reemplazan)
  const grupos = new Map<string, FilaProyeccion[]>()
  for (const f of filas) {
    if (f.tipo !== 'Proyectado') continue
    const k = `${f.mes.slice(0, 7)}|${f.planta}`
    const l = grupos.get(k)
    if (l) l.push(f)
    else grupos.set(k, [f])
  }

  const out: FilaProyeccion[] = []
  for (const [k, proy] of grupos) {
    const rs = rem.get(k) ?? []
    const porObra = new Map<string, number>()
    for (const r of rs) {
      const ko = `${norm(r.cliente)}|${norm(r.obra)}`
      porObra.set(ko, (porObra.get(ko) ?? 0) + r.m3)
    }
    // Cada cliente + obra proyectado toma sus remisiones una sola vez (si Zoho lo repite, la segunda fila queda en 0)
    const usadas = new Set<string>()
    const clientes = proy.filter(f => !esCalle(f)).map(f => {
      const ko = `${norm(f.cliente)}|${norm(f.obra)}`
      const real = usadas.has(ko) ? 0 : porObra.get(ko) ?? 0
      usadas.add(ko)
      return { ...f, real }
    })
    // Lo que no es de ningún proyectado es calle
    const calle = new Map<string, FilaProyeccion>()
    const mes = proy[0].mes, planta = proy[0].planta
    for (const r of rs) {
      if (usadas.has(`${norm(r.cliente)}|${norm(r.obra)}`)) continue
      const kc = `${norm(r.cliente)}|${norm(r.obra)}`
      const c = calle.get(kc) ?? { mes, planta, cliente: r.cliente, obra: r.obra, tipo: 'Cliente de Calle', meta: 0, real: 0 }
      c.real += r.m3
      calle.set(kc, c)
    }
    const totalCalle = [...calle.values()].reduce((a, c) => a + c.real, 0)
    const filaCalle = proy.find(esCalle)
    out.push(...clientes)
    if (filaCalle) out.push({ ...filaCalle, real: totalCalle })
    else if (totalCalle > 0) out.push({ mes, planta, cliente: 'Cliente', obra: 'Calle', tipo: 'Proyectado', meta: 0, real: totalCalle })
    out.push(...[...calle.values()].sort((a, b) => b.real - a.real))
  }
  return out
}
