/**
 * useFacturacion.ts — Cálculos de la facturación de agregados (funciones puras).
 * Las mismas cifras alimentan Gráficas, Detalle e Informe, así nunca se contradicen.
 *
 * Definiciones (iguales al informe de ventas de agregados):
 * - Venta: líneas de tipo venta (incluye fletes). Donaciones y traslados no son venta.
 * - Toneladas vendidas: toneladas de las líneas de venta (los fletes no tienen toneladas).
 * - Toneladas despachadas: vendidas + traslados de inventario.
 * - Precio promedio por t: venta de material (sin fletes) ÷ toneladas vendidas.
 * - Remisión: documento (NUMERO DOC) distinto.
 */
import type { Familia, LineaFacturacion } from '../types/facturacion'

export const FAMILIAS: Familia[] = ['Arena', 'Grava', 'Base y sub-base', 'Material de río', 'Piedra y otros', 'Fletes']
export const COLOR_FAMILIA: Record<Familia, string> = {
  'Arena': '#F59E0B', 'Grava': '#3B82F6', 'Base y sub-base': '#8B5CF6',
  'Material de río': '#10B981', 'Piedra y otros': '#64748B', 'Fletes': '#EC4899',
}
export const COLOR_TIPO = { venta: '#3B82F6', traslado: '#94A3B8', donacion: '#10B981' } as const
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export const esVenta = (l: LineaFacturacion) => l.tipo === 'venta'
export const esMaterial = (l: LineaFacturacion) => l.familia !== 'Fletes'
const clave = (l: LineaFacturacion) => l.nit || l.cliente
const suma = (ls: LineaFacturacion[], f: (l: LineaFacturacion) => number) => ls.reduce((a, l) => a + f(l), 0)

/** «ARENA LAVADA» → «Arena lavada» */
export const nombreMaterial = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
/** Nombre de cliente en formato título, sin el relleno «NO APLICA» */
export const nombreCliente = (s: string) => (/^NO APLICA/i.test(s) || !s ? 'Sin cliente' : s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()))

export function fechaCorta(iso: string, conAnio = false): string {
  const d = new Date(iso + 'T00:00:00Z')
  const base = `${DIAS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return conAnio ? `${base}/${d.getUTCFullYear()}` : base
}
export function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

export interface Resumen {
  venta: number; ventaMaterial: number; fletes: number
  tVendidas: number; tTraslados: number; tDespachadas: number
  remisiones: number; clientes: number; lineas: number; precioT: number | null
  donaciones: { docs: number; t: number; valor: number; beneficiarios: number }
  traslados: { docs: number; t: number }
}

export function resumen(ls: LineaFacturacion[]): Resumen {
  const ventas = ls.filter(esVenta)
  const mat = ventas.filter(esMaterial)
  const don = ls.filter(l => l.tipo === 'donacion')
  const tras = ls.filter(l => l.tipo === 'traslado')
  const tVendidas = suma(mat, l => l.toneladas)
  const ventaMaterial = suma(mat, l => l.total)
  const tTraslados = suma(tras, l => l.toneladas)
  return {
    venta: suma(ventas, l => l.total), ventaMaterial, fletes: suma(ventas.filter(l => !esMaterial(l)), l => l.total),
    tVendidas, tTraslados, tDespachadas: tVendidas + tTraslados,
    remisiones: new Set(ventas.map(l => l.doc)).size,
    clientes: new Set(ventas.map(clave).filter(Boolean)).size,
    lineas: ventas.length,
    precioT: tVendidas ? ventaMaterial / tVendidas : null,
    donaciones: { docs: new Set(don.map(l => l.doc)).size, t: suma(don, l => l.toneladas), valor: suma(don, l => l.total), beneficiarios: new Set(don.map(clave)).size },
    traslados: { docs: new Set(tras.map(l => l.doc)).size, t: tTraslados },
  }
}

export interface FilaFamilia { familia: Familia; t: number; venta: number; remisiones: number; clientes: number; precioT: number | null; part: number }
export function porFamilia(ls: LineaFacturacion[]): FilaFamilia[] {
  const ventas = ls.filter(esVenta)
  const total = suma(ventas, l => l.total)
  return FAMILIAS.map(f => {
    const x = ventas.filter(l => l.familia === f)
    const t = suma(x, l => l.toneladas), venta = suma(x, l => l.total)
    return { familia: f, t, venta, remisiones: new Set(x.map(l => l.doc)).size, clientes: new Set(x.map(clave)).size,
      precioT: t ? venta / t : null, part: total ? venta / total * 100 : 0 }
  }).filter(r => r.venta || r.t)
}

export interface FilaMaterial {
  producto: string; familia: Familia; lineas: number; t: number; venta: number; part: number
  precioT: number | null; minT: number | null; maxT: number | null
}
/** Venta por material (sin fletes), con rango de precio por tonelada de sus líneas */
export function porMaterial(ls: LineaFacturacion[]): FilaMaterial[] {
  const ventas = ls.filter(l => esVenta(l) && esMaterial(l))
  const total = suma(ventas, l => l.total)
  const g = new Map<string, LineaFacturacion[]>()
  for (const l of ventas) g.set(l.producto, [...(g.get(l.producto) ?? []), l])
  return [...g.entries()].map(([producto, x]) => {
    const t = suma(x, l => l.toneladas), venta = suma(x, l => l.total)
    const precios = x.filter(l => l.toneladas > 0 && l.total > 0).map(l => l.total / l.toneladas)
    return { producto, familia: x[0].familia, lineas: x.length, t, venta, part: total ? venta / total * 100 : 0,
      precioT: t ? venta / t : null, minT: precios.length ? Math.min(...precios) : null, maxT: precios.length ? Math.max(...precios) : null }
  }).sort((a, b) => b.venta - a.venta)
}

export interface FilaToneladas {
  producto: string; registrado: string; cantidad: number; factor: string
  tVendidas: number; tTraslados: number; tDonadas: number; tDespachadas: number
}
/** Toneladas por producto: cómo se registró, el factor aplicado y el total despachado (venta + traslados) */
export function toneladasPorProducto(ls: LineaFacturacion[]): FilaToneladas[] {
  const g = new Map<string, LineaFacturacion[]>()
  for (const l of ls.filter(esMaterial)) g.set(l.producto, [...(g.get(l.producto) ?? []), l])
  return [...g.entries()].map(([producto, x]) => {
    const unidades = [...new Set(x.map(l => l.registrado))]
    const factores = [...new Set(x.filter(l => l.factor !== 1).map(l => l.factor))]
    const tV = suma(x.filter(esVenta), l => l.toneladas), tT = suma(x.filter(l => l.tipo === 'traslado'), l => l.toneladas)
    return {
      producto, registrado: unidades.join(' y '), cantidad: suma(x, l => l.cantidad),
      factor: factores.length ? factores.map(f => `× ${f.toLocaleString('es-CO')}`).join(', ') : '—',
      tVendidas: tV, tTraslados: tT, tDonadas: suma(x.filter(l => l.tipo === 'donacion'), l => l.toneladas), tDespachadas: tV + tT,
    }
  }).sort((a, b) => b.tDespachadas - a.tDespachadas)
}

export interface FilaCliente { cliente: string; nit: string; remisiones: number; t: number; venta: number; part: number; familias: Partial<Record<Familia, number>> }
export function porCliente(ls: LineaFacturacion[]): FilaCliente[] {
  const ventas = ls.filter(esVenta)
  const total = suma(ventas, l => l.total)
  const g = new Map<string, LineaFacturacion[]>()
  for (const l of ventas) g.set(clave(l), [...(g.get(clave(l)) ?? []), l])
  return [...g.values()].map(x => {
    const venta = suma(x, l => l.total)
    const familias: Partial<Record<Familia, number>> = {}
    for (const l of x) familias[l.familia] = (familias[l.familia] ?? 0) + l.total
    return { cliente: nombreCliente(x[0].cliente), nit: x[0].nit, remisiones: new Set(x.map(l => l.doc)).size,
      t: suma(x, l => l.toneladas), venta, part: total ? venta / total * 100 : 0, familias }
  }).sort((a, b) => b.venta - a.venta)
}

export interface FilaDia {
  fecha: string; venta: number; porFamilia: Partial<Record<Familia, number>>
  tVendidas: number; tTraslados: number; remisiones: number; clientes: number; acumulado: number
}
export function porDia(ls: LineaFacturacion[]): FilaDia[] {
  const fechas = [...new Set(ls.map(l => l.fecha))].sort()
  let acumulado = 0
  return fechas.map(fecha => {
    const dia = ls.filter(l => l.fecha === fecha)
    const ventas = dia.filter(esVenta)
    const venta = suma(ventas, l => l.total)
    acumulado += venta
    const porFamilia: Partial<Record<Familia, number>> = {}
    for (const l of ventas) porFamilia[l.familia] = (porFamilia[l.familia] ?? 0) + l.total
    return { fecha, venta, porFamilia, tVendidas: suma(ventas, l => l.toneladas),
      tTraslados: suma(dia.filter(l => l.tipo === 'traslado'), l => l.toneladas),
      remisiones: new Set(ventas.map(l => l.doc)).size, clientes: new Set(ventas.map(clave)).size, acumulado }
  })
}

export interface FilaAgrupada { nombre: string; familia: Familia | ''; docs: number; t: number; valor: number; ultimo: string }
/** Donaciones o traslados agrupados por material (o por beneficiario) */
export function agrupar(ls: LineaFacturacion[], por: 'producto' | 'cliente'): FilaAgrupada[] {
  const g = new Map<string, LineaFacturacion[]>()
  for (const l of ls) { const k = por === 'producto' ? l.producto : nombreCliente(l.cliente); g.set(k, [...(g.get(k) ?? []), l]) }
  return [...g.entries()].map(([nombre, x]) => ({
    nombre: por === 'producto' ? nombreMaterial(nombre) : nombre, familia: por === 'producto' ? x[0].familia : '' as const,
    docs: new Set(x.map(l => l.doc)).size, t: suma(x, l => l.toneladas), valor: suma(x, l => l.total),
    ultimo: x.map(l => l.fecha).sort().at(-1) ?? '',
  })).sort((a, b) => b.t - a.t)
}

/**
 * Cierre estimado del mes: lo vendido + promedio de los días con venta × días que faltan
 * (lunes a sábado; domingos solo si la planta vendió algún domingo).
 */
export function cierreEstimado(dias: FilaDia[], corte: string): { valor: number; faltan: number } {
  if (!dias.length) return { valor: 0, faltan: 0 }
  const [y, m, d] = corte.split('-').map(Number)
  const ult = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const esDom = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay() === 0
  const hab = dias.filter(x => !esDom(x.fecha)), dom = dias.filter(x => esDom(x.fecha))
  const pHab = hab.length ? hab.reduce((a, x) => a + x.venta, 0) / hab.length : 0
  const pDom = dom.length ? dom.reduce((a, x) => a + x.venta, 0) / dom.length : 0
  let faltanHab = 0, faltanDom = 0
  for (let i = d + 1; i <= ult; i++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    if (esDom(iso)) faltanDom++; else faltanHab++
  }
  const ya = dias.reduce((a, x) => a + x.venta, 0)
  return { valor: ya + pHab * faltanHab + (dom.length ? pDom * faltanDom : 0), faltan: faltanHab + (dom.length ? faltanDom : 0) }
}

export interface AvisoCalidad { nivel: 'alto' | 'medio' | 'bajo'; titulo: string; texto: string }
/** Hallazgos de calidad del dato (factores por defecto, precios dispersos, ventas sin valor o sin cliente) */
export function calidad(ls: LineaFacturacion[], fmtT: (n: number) => string, fmtCop: (n: number) => string): AvisoCalidad[] {
  const out: AvisoCalidad[] = []
  const sinFactor = ls.filter(l => !l.factorPropio)
  if (sinFactor.length) {
    const prods = [...new Set(sinFactor.map(l => nombreMaterial(l.producto)))]
    out.push({ nivel: 'medio', titulo: `${prods.length} ${prods.length === 1 ? 'material sin factor propio' : 'materiales sin factor propio'}`,
      texto: `${prods.join(', ')}: se pasaron de m³ a toneladas con el factor por defecto (× 1,55). Suman ${fmtT(sinFactor.reduce((a, l) => a + l.toneladas, 0))} t.` })
  }
  for (const m of porMaterial(ls)) {
    if (m.minT && m.maxT && m.maxT / m.minT >= 1.5) out.push({ nivel: 'bajo', titulo: `Precio disperso en ${nombreMaterial(m.producto)}`,
      texto: `El precio por tonelada va de ${fmtCop(m.minT)} a ${fmtCop(m.maxT)} (${(m.maxT / m.minT).toLocaleString('es-CO', { maximumFractionDigits: 1 })} veces). Revisar listas de precio o unidades registradas.` })
  }
  const sinValor = ls.filter(l => esVenta(l) && l.total <= 0)
  if (sinValor.length) out.push({ nivel: 'alto', titulo: `${sinValor.length} líneas de venta sin valor`,
    texto: `Documentos ${[...new Set(sinValor.map(l => l.doc))].slice(0, 8).join(', ')}${sinValor.length > 8 ? '…' : ''}: tienen cantidad pero precio total en cero.` })
  const sinCliente = ls.filter(l => esVenta(l) && !l.nit)
  if (sinCliente.length) out.push({ nivel: 'medio', titulo: `${sinCliente.length} líneas de venta sin NIT de cliente`, texto: 'No se pueden asociar a un cliente en los rankings.' })
  return out
}
