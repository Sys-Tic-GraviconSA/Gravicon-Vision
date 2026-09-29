/**
 * useBalanceProduccion.ts — Cruce de lo producido (m³, tabla diaria de la planta) con lo facturado
 * (toneladas por material, Novasoft). Funciones puras: la vista solo las dibuja.
 *
 * Unidad común: m³. Cada línea facturada se pasa a m³ equivalentes con el factor de su material
 * (m³ = toneladas ÷ factor t/m³), así no se inventa un factor promedio para la producción.
 * La producción no dice qué material salió de cada línea: el cruce es por fecha (día/semana/mes), no por material.
 *
 * Solo se cruzan días cerrados en las dos fuentes: desde que la facturación está completa (ver
 * inicioFacturacionCompleta) hasta el último día con producción cargada (sin pasar la última fecha facturada).
 */
import type { Familia, LineaFacturacion } from '../types/facturacion'
import { FAMILIAS } from './useFacturacion'

export type Agrupacion = 'dia' | 'semana' | 'mes'

export interface OpcionesBalance {
  /** Suma los traslados de inventario (subtipo 003) a lo que sale del patio */
  traslados: boolean
  /** Suma las donaciones (subtipo 952) a lo que sale del patio */
  donaciones: boolean
  /** Deja fuera los materiales que no pasan por la planta (se venden como se extraen) */
  soloProcesado: boolean
}

/** Materiales que se venden sin procesar: no salen de la producción de la planta */
export const MATERIALES_NO_PROCESADOS = ['MATERIAL DE RIO SIN PROCESAR']

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** m³ equivalentes de una línea facturada (0 en fletes) */
export const m3Equivalentes = (l: LineaFacturacion) => (l.factorMaterial ? l.toneladas / l.factorMaterial : 0)
export const esNoProcesado = (l: LineaFacturacion) => MATERIALES_NO_PROCESADOS.includes(l.producto)

export interface DiaProduccion { fecha: string; total: number; proyectado: number; porLinea: Record<string, number> }

/** Filas de la hoja diaria de producción → producción por fecha (m³) */
export function produccionPorDia(filas: Record<string, unknown>[], lineas: { key: string; label: string }[]): Map<string, DiaProduccion> {
  const out = new Map<string, DiaProduccion>()
  for (const r of filas) {
    const serial = Number(r['Fecha'])
    if (!Number.isFinite(serial) || serial <= 0) continue
    const fecha = new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10)
    const d = out.get(fecha) ?? { fecha, total: 0, proyectado: 0, porLinea: {} }
    d.total += Number(r['Total de M³']) || 0
    d.proyectado += Number(r['M³ Proyectado']) || 0
    for (const l of lineas) d.porLinea[l.label] = (d.porLinea[l.label] ?? 0) + (Number(r[l.key]) || 0)
    out.set(fecha, d)
  }
  return out
}

/** Clave y etiqueta del período de una fecha */
function periodo(fecha: string, a: Agrupacion): { clave: string; etiqueta: string } {
  const [y, m, d] = fecha.split('-').map(Number)
  if (a === 'mes') return { clave: fecha.slice(0, 7), etiqueta: `${MESES_CORTOS[m - 1]} ${y}` }
  if (a === 'semana') {
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))   // lunes de la semana
    const iso = dt.toISOString().slice(0, 10)
    return { clave: iso, etiqueta: `sem. ${iso.slice(8, 10)}/${iso.slice(5, 7)}` }
  }
  return { clave: fecha, etiqueta: `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}` }
}

export interface FilaBalance {
  clave: string
  etiqueta: string
  dias: number
  producido: number         // m³
  proyectado: number        // m³
  porLinea: Record<string, number>
  vendidoM3: number         // m³ equivalentes de lo vendido
  vendidoT: number
  trasladosM3: number
  donacionesM3: number
  salidaM3: number          // vendido + (traslados) + (donaciones) según opciones
  salidaT: number
  venta: number             // $ de las líneas vendidas incluidas
  diferencia: number        // producido − salida (m³): + se acumula en patio, − se consume inventario
  acumulado: number         // diferencia acumulada desde el inicio del cruce
  indice: number | null     // salida ÷ producido (%)
}

/**
 * Primer día desde el que la facturación está completa. El archivo puede traer líneas sueltas de fechas
 * anteriores a la carga real (p. ej. 4 líneas en julio y luego todo desde el 26 de agosto); cruzarlas con la
 * producción de esos días haría parecer que casi nada se vendió.
 * Regla: el primer día con al menos 25 % de las líneas de un día típico (mediana) y desde el cual al menos
 * el 80 % de los días de lunes a sábado tienen ventas.
 */
export function inicioFacturacionCompleta(lineas: LineaFacturacion[], hasta: string): string | null {
  const porDia = new Map<string, number>()
  for (const l of lineas) if (l.tipo === 'venta' && l.fecha <= hasta) porDia.set(l.fecha, (porDia.get(l.fecha) ?? 0) + 1)
  const dias = [...porDia.keys()].sort()
  if (!dias.length) return null
  const conteos = [...porDia.values()].sort((a, b) => a - b)
  const mediana = conteos[Math.floor(conteos.length / 2)]
  const esHabil = (f: string) => new Date(f + 'T00:00:00Z').getUTCDay() !== 0
  for (const c of dias) {
    if ((porDia.get(c) ?? 0) < mediana * 0.25) continue
    let habiles = 0, conVenta = 0
    for (let d = new Date(c + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
      const f = d.toISOString().slice(0, 10)
      if (!esHabil(f)) continue
      habiles++
      if (porDia.has(f)) conVenta++
    }
    if (!habiles || conVenta / habiles >= 0.8) return c
  }
  return dias[0]
}

export interface Balance {
  /** Primera fecha facturada del archivo (incluye líneas sueltas) y cuántas líneas quedaron antes del inicio completo */
  primeraFacturada: string
  lineasSueltas: number
  desde: string
  hasta: string
  /** Última fecha con producción cargada y última facturada (para explicar el corte) */
  ultProduccion: string
  ultFacturacion: string
  filas: FilaBalance[]
  total: FilaBalance
  porFamiliaM3: { familia: Familia; m3: number; t: number }[]
  excluidoM3: number
  excluidoT: number
}

export function calcularBalance(
  lineas: LineaFacturacion[], produccion: Map<string, DiaProduccion>, op: OpcionesBalance, agrupacion: Agrupacion,
): Balance | null {
  const conProd = [...produccion.values()].filter(d => d.total > 0).map(d => d.fecha).sort()
  const facturadas = lineas.map(l => l.fecha).sort()
  if (!conProd.length || !facturadas.length) return null
  const ultProduccion = conProd.at(-1)!, ultFacturacion = facturadas.at(-1)!
  const hasta = ultProduccion < ultFacturacion ? ultProduccion : ultFacturacion
  const desde = inicioFacturacionCompleta(lineas, hasta) ?? facturadas[0]
  if (hasta < desde) return null
  const lineasSueltas = lineas.filter(l => l.tipo === 'venta' && l.fecha < desde).length

  const enRango = (f: string) => f >= desde && f <= hasta
  const materiales = lineas.filter(l => enRango(l.fecha) && l.familia !== 'Fletes')
  const excluidas = op.soloProcesado ? materiales.filter(esNoProcesado) : []
  const cuenta = materiales.filter(l => !(op.soloProcesado && esNoProcesado(l)))

  const vacia = (clave: string, etiqueta: string): FilaBalance => ({
    clave, etiqueta, dias: 0, producido: 0, proyectado: 0, porLinea: {}, vendidoM3: 0, vendidoT: 0, trasladosM3: 0, donacionesM3: 0,
    salidaM3: 0, salidaT: 0, venta: 0, diferencia: 0, acumulado: 0, indice: null,
  })
  const grupos = new Map<string, FilaBalance>()
  const grupo = (fecha: string) => {
    const p = periodo(fecha, agrupacion)
    let g = grupos.get(p.clave)
    if (!g) { g = vacia(p.clave, p.etiqueta); grupos.set(p.clave, g) }
    return g
  }

  // Todos los días del rango (aunque un día no tenga producción o no tenga venta)
  for (let d = new Date(desde + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
    const f = d.toISOString().slice(0, 10)
    const g = grupo(f)
    g.dias++
    const p = produccion.get(f)
    if (p) {
      g.producido += p.total; g.proyectado += p.proyectado
      for (const [k, v] of Object.entries(p.porLinea)) g.porLinea[k] = (g.porLinea[k] ?? 0) + v
    }
  }
  for (const l of cuenta) {
    const g = grupo(l.fecha), m3 = m3Equivalentes(l)
    if (l.tipo === 'venta') { g.vendidoM3 += m3; g.vendidoT += l.toneladas; g.venta += l.total }
    else if (l.tipo === 'traslado') g.trasladosM3 += m3
    else g.donacionesM3 += m3
    const sale = l.tipo === 'venta' || (l.tipo === 'traslado' && op.traslados) || (l.tipo === 'donacion' && op.donaciones)
    if (sale) { g.salidaM3 += m3; g.salidaT += l.toneladas }
  }

  const filas = [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave))
  let acumulado = 0
  for (const f of filas) {
    f.diferencia = f.producido - f.salidaM3
    acumulado += f.diferencia
    f.acumulado = acumulado
    f.indice = f.producido ? (f.salidaM3 / f.producido) * 100 : null
  }

  const total = vacia('total', 'Total')
  for (const f of filas) {
    for (const k of ['dias', 'producido', 'proyectado', 'vendidoM3', 'vendidoT', 'trasladosM3', 'donacionesM3', 'salidaM3', 'salidaT', 'venta'] as const) total[k] += f[k]
    for (const [k, v] of Object.entries(f.porLinea)) total.porLinea[k] = (total.porLinea[k] ?? 0) + v
  }
  total.diferencia = total.producido - total.salidaM3
  total.acumulado = total.diferencia
  total.indice = total.producido ? (total.salidaM3 / total.producido) * 100 : null

  const salen = cuenta.filter(l => l.tipo === 'venta' || (l.tipo === 'traslado' && op.traslados) || (l.tipo === 'donacion' && op.donaciones))
  const porFamiliaM3 = FAMILIAS.filter(f => f !== 'Fletes').map(familia => {
    const x = salen.filter(l => l.familia === familia)
    return { familia, m3: x.reduce((a, l) => a + m3Equivalentes(l), 0), t: x.reduce((a, l) => a + l.toneladas, 0) }
  }).filter(f => f.m3 > 0)

  return {
    primeraFacturada: facturadas[0], lineasSueltas,
    desde, hasta, ultProduccion, ultFacturacion, filas, total, porFamiliaM3,
    excluidoM3: excluidas.filter(l => l.tipo === 'venta').reduce((a, l) => a + m3Equivalentes(l), 0),
    excluidoT: excluidas.filter(l => l.tipo === 'venta').reduce((a, l) => a + l.toneladas, 0),
  }
}
