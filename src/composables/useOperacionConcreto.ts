/**
 * useOperacionConcreto.ts — Producción del día y tablas de operación de Concretos (funciones puras).
 * Las mismas cifras alimentan Producción Planta (Gráficas e Informe) y Proyección Comercial, así nunca se contradicen.
 *
 * - Producción del día: último día con despacho de concreto hasta la fecha de corte, frente al día anterior con despacho.
 * - Comerciales: pedidos (no_de_pedido de order_detail), remisiones, m³, venta de concreto, bombeo y venta total.
 * - Conductores de mixer: placas que manejó, viajes, m³ y tiempos promedio del viaje (order_detail):
 *     cargue = fin − inicio de cargue · ida = llegada a obra − salida de planta · en obra = salida − llegada a obra ·
 *     regreso = llegada a planta − salida de obra · ciclo = llegada a planta − salida de planta ·
 *     puntualidad = llegada a obra − hora programada (negativo = llegó antes).
 *   Cada tiempo se promedia solo con las remisiones que lo tienen registrado (por eso se muestra la cobertura).
 * - Bombeo: servicios de bombeo por bomba y operario.
 * Todo mide concreto; los agregados de Restrepo (arena, grava) no entran (ver esAgregado).
 */
import { serialToDate } from '../utils/dates'
import { esAgregado } from '../utils/agregadosConcreto'
import { fmtN, cop, copCorto, pct, nombrePlanta, titulo, ordenarPlantas, condicionComercial, ordenCondicion, COLOR_CONDICION } from './useGraficasConcreto'

export interface RemOp {
  iso: string; planta: string; cliente: string; obra: string; comercial: string; pedido: string; remision: string
  m3: number; totalConc: number; servicio: boolean; servM3: number; servTotal: number; subtotal: number; agregado: boolean
  mixer: string; conductor: string; bomba: string; operario: string
  /** Contado, Crédito a 30 días… */
  condicion: string
  /** Minutos del día (null si no está registrado) */
  t: { prog: number | null; ic: number | null; fc: number | null; sp: number | null; llo: number | null; so: number | null; llp: number | null }
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const minutos = (v: unknown): number | null => {
  const m = String(v ?? '').match(/^(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Normaliza las filas del store de concreto (order_price + order_detail) */
export function normalizarRemisiones(rows: Record<string, unknown>[]): RemOp[] {
  return rows.filter(r => typeof r['Fecha'] === 'number' && r['Fecha']).map(r => {
    const mezcla = String(r['Mezcla'] ?? '').trim()
    return {
      iso: serialToDate(r['Fecha'] as number).toISOString().slice(0, 10),
      planta: nombrePlanta(r['Planta']),
      cliente: titulo(String(r['Cliente'] ?? '').trim()) || 'Sin cliente',
      obra: String(r['Proyecto'] ?? '').trim(),
      comercial: titulo(String(r['Comercial'] ?? '').trim()) || 'Sin comercial',
      pedido: String(r['Pedido'] ?? '').trim(),
      remision: String(r['Remisión'] ?? ''),
      m3: num(r['Cant. Concreto']), totalConc: num(r['Total Concreto']),
      servicio: !!String(r['Servicio'] ?? '').trim(), servM3: num(r['Cant. Servicio']), servTotal: num(r['Total Servicio']),
      subtotal: num(r['Subtotal']),
      agregado: esAgregado(mezcla, r['Cliente'], r['Planta']),
      mixer: String(r['Mixer'] ?? '').trim().toUpperCase(),
      conductor: titulo(String(r['Conductor'] ?? '').trim()),
      bomba: String(r['Bomba'] ?? '').trim().toUpperCase(),
      operario: titulo(String(r['Operario'] ?? '').trim()),
      condicion: condicionComercial(r['Condición Comercial']),
      t: {
        prog: minutos(r['Hora Programada']), ic: minutos(r['Inicio Cargue']), fc: minutos(r['Fin Cargue']), sp: minutos(r['Salida Planta']),
        llo: minutos(r['Llegada Obra']), so: minutos(r['Salida Obra']), llp: minutos(r['Llegada Planta']),
      },
    }
  })
}

/** Diferencia en minutos entre dos horas del mismo viaje (cruza medianoche); null si falta o no es creíble (> 12 h) */
function dif(a: number | null, b: number | null, permitirNegativo = false): number | null {
  if (a === null || b === null) return null
  let d = b - a
  if (!permitirNegativo && d < 0) d += 1440
  return Math.abs(d) > 720 ? null : d
}
const prom = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null }
/** 75 → «1 h 15 min», 40 → «40 min» */
export function duracion(min: number | null): string {
  if (min === null || !Number.isFinite(min)) return '—'
  const m = Math.round(Math.abs(min)), s = min < 0 ? '−' : ''
  return m >= 60 ? `${s}${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${s}${m} min`
}

// ---------------------------------------------------------------- Despacho del día
interface Dia { m3: number; venta: number; rem: number; bombM3: number; bombServ: number; porCond: Record<string, { m3: number; venta: number }> }
const delDia = (x: RemOp[]): Dia => {
  const porCond: Dia['porCond'] = {}
  for (const r of x) { const c = (porCond[r.condicion] ??= { m3: 0, venta: 0 }); c.m3 += r.m3; c.venta += r.subtotal }
  return {
    m3: x.reduce((a, r) => a + r.m3, 0), venta: x.reduce((a, r) => a + r.subtotal, 0), rem: x.length,
    bombM3: x.filter(r => r.servicio).reduce((a, r) => a + r.servM3, 0), bombServ: x.filter(r => r.servicio).length, porCond,
  }
}
export interface DespachoDia { iso: string; antes: string; hoy: Dia; ayer: Dia; porPlanta: { planta: string; hoy: Dia; ayer: Dia }[] }
/** Último día con despacho de concreto entre `desde` y `hasta`, frente al día anterior con despacho */
export function despachoDelDia(rs: RemOp[], hasta: string, desde = '', plantas: string[] = []): DespachoDia {
  const conc = rs.filter(r => !r.agregado)
  const iso = [...new Set(conc.filter(r => (!hasta || r.iso <= hasta) && (!desde || r.iso >= desde)).map(r => r.iso))].sort().at(-1) ?? ''
  const antes = [...new Set(conc.filter(r => r.iso < iso).map(r => r.iso))].sort().at(-1) ?? ''
  const hoy = conc.filter(r => r.iso === iso), ayer = conc.filter(r => r.iso === antes)
  const lista = plantas.length ? plantas : ordenarPlantas(new Set([...hoy, ...ayer].map(r => r.planta)))
  return {
    iso, antes, hoy: delDia(hoy), ayer: delDia(ayer),
    porPlanta: lista.map(p => ({ planta: p, hoy: delDia(hoy.filter(r => r.planta === p)), ayer: delDia(ayer.filter(r => r.planta === p)) })),
  }
}

/** Fila de KPIs del día: despacho, facturado, remisiones y bombeo, cada uno con variación y diferencia frente al día anterior */
export function kpisDelDia(d: DespachoDia, color: (p: string) => string) {
  const tend = (a: number, b: number) => {
    const v = b ? (a / b - 1) * 100 : null
    return v === null || Math.abs(v) < 0.05 ? undefined : { value: Number(Math.abs(v).toFixed(1)), direction: (v >= 0 ? 'up' : 'down') as 'up' | 'down' }
  }
  const gris = (t: string) => `<span style='color:var(--text-tertiary);font-size:10px'>${t}</span>`
  // Valor del día por planta; la flecha de la tarjeta es la variación frente al día anterior con despacho
  const tarjeta = (label: string, icon: string, accent: string, val: (x: Dia) => number, f: (v: number) => string, extra?: (x: Dia) => string) => ({
    label, icon, accent, value: f(val(d.hoy)), trend: tend(val(d.hoy), val(d.ayer)),
    detail: d.porPlanta.map(x => `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(x.planta)}'></span>` +
      `<span class='kpi-label-int' style='color:${color(x.planta)}'>${x.planta}</span> <strong>${f(val(x.hoy))}</strong>` +
      (extra ? ' ' + gris(extra(x.hoy)) : '') + `</div>`).join(''),
  })
  const m3 = (v: number) => `${fmtN(v)} m³`
  return [
    tarjeta('Despacho del Día', 'package', '#1D4ED8', x => x.m3, m3),
    tarjeta('Facturado del Día', 'dollar', '#2563EB', x => x.venta, copCorto),
    tarjeta('Remisiones del Día', 'list', '#8B5CF6', x => x.rem, v => fmtN(v, 0), x => `${fmtN(x.rem ? x.m3 / x.rem : 0)} m³/rem.`),
    tarjeta('Bombeo del Día', 'zap', '#06B6D4', x => x.bombM3, m3, x => `${fmtN(x.bombServ, 0)} serv.`),
    // Una tarjeta por condición comercial del día (contado, crédito…): venta y m³ por planta
    ...[...new Set([...Object.keys(d.hoy.porCond), ...Object.keys(d.ayer.porCond)])].sort(ordenCondicion).map(c => {
      const v = (x: Dia) => x.porCond[c] ?? { m3: 0, venta: 0 }
      const t = tarjeta(`${c} del Día`, /^contado/i.test(c) ? 'dollar' : /cr[ée]dito/i.test(c) ? 'clock' : 'alert-circle', COLOR_CONDICION(c),
        x => v(x).venta, copCorto, x => `${fmtN(v(x).m3)} m³`)
      t.detail += `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>${pct(d.hoy.venta ? v(d.hoy).venta / d.hoy.venta * 100 : 0)} de lo facturado · ${fmtN(v(d.hoy).m3)} m³</div>`
      return t
    }),
  ]
}

// ---------------------------------------------------------------- Tablas
/** Tabla genérica: la pintan igual el tablero (gt-table) y los informes (table-wrap) */
export interface TablaOp {
  /** r: número (a la derecha) · w: texto largo que puede partirse en varias líneas */
  cols: { t: string; r?: boolean; w?: boolean }[]
  /** span: filas que ocupa la primera celda (agrupada por planta); 0 = la cubre la fila de arriba. subtotal: fila de subtotal del grupo */
  filas: { celdas: string[]; color?: string; span?: number; subtotal?: boolean }[]
  total?: string[]
  nota?: string
}

/** Agrupa filas por planta (orden fijo de plantas): la planta va una sola vez en la primera columna y cada grupo cierra con su subtotal */
function agruparPorPlanta<T extends { planta: string; celdas: string[] }>(filas: T[], subtotal: (planta: string) => string[], limitePorPlanta = 0): TablaOp['filas'] {
  const out: TablaOp['filas'] = []
  for (const p of ordenarPlantas(new Set(filas.map(f => f.planta)))) {
    let g = filas.filter(f => f.planta === p)
    const resto = limitePorPlanta && g.length > limitePorPlanta ? g.length - limitePorPlanta : 0
    if (resto) g = g.slice(0, limitePorPlanta)
    g.forEach((f, i) => out.push({ celdas: [p, ...f.celdas], color: p, span: i === 0 ? g.length + 1 : 0 }))
    out.push({ celdas: ['', `Subtotal ${p}${resto ? ` (incluye ${resto} más)` : ''}`, ...subtotal(p)], color: p, span: 0, subtotal: true })
  }
  return out
}

/** Comerciales: pedidos, remisiones, clientes, m³, venta de concreto, $/m³, bombeo y venta total */
export function tablaComerciales(rs: RemOp[]): TablaOp {
  const conc = rs.filter(r => !r.agregado)
  const g = new Map<string, RemOp[]>()
  for (const r of conc) g.set(r.comercial, [...(g.get(r.comercial) ?? []), r])
  const fila = (x: RemOp[]) => {
    const m3 = x.reduce((a, r) => a + r.m3, 0), conc$ = x.reduce((a, r) => a + r.totalConc, 0)
    const bomb = x.filter(r => r.servicio), venta = x.reduce((a, r) => a + r.subtotal, 0)
    return { m3, venta, celdas: [
      fmtN(new Set(x.map(r => r.pedido || `rem-${r.remision}`)).size, 0), fmtN(x.length, 0), fmtN(new Set(x.map(r => r.cliente)).size, 0),
      fmtN(m3), cop(conc$), m3 ? cop(conc$ / m3) : '—',
      `${fmtN(bomb.length, 0)} · ${fmtN(bomb.reduce((a, r) => a + r.servM3, 0))} m³`, cop(bomb.reduce((a, r) => a + r.servTotal, 0)), cop(venta),
    ] }
  }
  const totalVenta = conc.reduce((a, r) => a + r.subtotal, 0)
  const filas = [...g.entries()].map(([k, x]) => ({ k, ...fila(x) })).sort((a, b) => b.venta - a.venta)
  const t = fila(conc)
  return {
    cols: [{ t: 'Comercial' }, { t: 'Pedidos', r: true }, { t: 'Remisiones', r: true }, { t: 'Clientes', r: true }, { t: 'm³', r: true }, { t: 'Venta concreto', r: true },
      { t: '$ / m³', r: true }, { t: 'Bombeos', r: true }, { t: 'Venta bombeo', r: true }, { t: 'Venta total', r: true }, { t: 'Part.', r: true }],
    filas: filas.map(f => ({ celdas: [f.k, ...f.celdas, totalVenta ? `${fmtN(f.venta / totalVenta * 100)}%` : '—'] })),
    total: ['Total', ...t.celdas, '100,0%'],
    nota: 'Pedidos = número de pedido distinto (order_detail). Venta total = subtotal sin IVA (concreto, bombeo, aditivos y recargos).',
  }
}

/** Conductores de mixer agrupados por su planta principal: placas, viajes, m³ y tiempo promedio de viaje (salida → llegada a planta) */
export function tablaConductores(rs: RemOp[], limitePorPlanta = 0): TablaOp {
  // «Cliente retira»: el cliente se lleva el concreto en su vehículo, no es un conductor de la empresa
  const conc = rs.filter(r => !r.agregado && r.conductor && !/cliente/i.test(r.conductor))
  const g = new Map<string, RemOp[]>()
  for (const r of conc) g.set(r.conductor, [...(g.get(r.conductor) ?? []), r])
  const celdas = (x: RemOp[]) => [fmtN(x.length), fmtN(x.reduce((a, r) => a + r.m3, 0)), duracion(prom(x.map(r => dif(r.t.sp, r.t.llp))))]
  const filas = [...g.entries()].map(([k, x]) => {
    const placas = new Map<string, number>(), plantas = new Map<string, number>()
    for (const r of x) { if (r.mixer) placas.set(r.mixer, (placas.get(r.mixer) ?? 0) + 1); plantas.set(r.planta, (plantas.get(r.planta) ?? 0) + r.m3) }
    const planta = [...plantas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    return { planta, m3: x.reduce((a, r) => a + r.m3, 0), celdas: [k, [...placas.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p).join(', ') || '—', ...celdas(x)] }
  }).sort((a, b) => b.m3 - a.m3)
  // Subtotal de la planta: los viajes de sus conductores (por planta principal)
  const plantaDe = new Map(filas.map(f => [f.celdas[0], f.planta]))
  return {
    cols: [{ t: 'Planta' }, { t: 'Conductor' }, { t: 'Placa(s)', w: true }, { t: 'Viajes', r: true }, { t: 'm³', r: true }, { t: 'Tiempo de viaje', r: true }],
    filas: agruparPorPlanta(filas, p => ['', ...celdas(conc.filter(r => plantaDe.get(r.conductor) === p))], limitePorPlanta),
    total: ['Total', '', '', ...celdas(conc)],
    nota: (limitePorPlanta ? `Hasta ${limitePorPlanta} conductores por planta (el subtotal incluye a todos). ` : '') +
      'Tiempo de viaje: promedio desde la salida de planta hasta la llegada de vuelta a planta, en los viajes que tienen las dos horas. No incluye «Cliente retira».',
  }
}

/** Servicios de bombeo agrupados por planta: bomba, operarios, servicios, m³ y venta */
export function tablaBombeo(rs: RemOp[]): TablaOp {
  const serv = rs.filter(r => !r.agregado && r.servicio)
  const g = new Map<string, RemOp[]>()
  for (const r of serv) { const k = `${r.planta}|${r.bomba || 'Sin bomba asignada'}`; g.set(k, [...(g.get(k) ?? []), r]) }
  const celdas = (x: RemOp[]) => {
    const m3 = x.reduce((a, r) => a + r.servM3, 0), venta = x.reduce((a, r) => a + r.servTotal, 0)
    return [fmtN(x.length), fmtN(m3), cop(venta), m3 ? cop(venta / m3) : '—', fmtN(new Set(x.map(r => r.cliente)).size)]
  }
  const filas = [...g.entries()].map(([k, x]) => {
    const [planta, bomba] = k.split('|')
    const ops = new Map<string, number>()
    for (const r of x) if (r.operario) ops.set(r.operario, (ops.get(r.operario) ?? 0) + 1)
    return { planta, m3: x.reduce((a, r) => a + r.servM3, 0),
      celdas: [bomba, [...ops.entries()].sort((a, b) => b[1] - a[1]).map(([o]) => o).join(', ') || '—', ...celdas(x)] }
  }).sort((a, b) => b.m3 - a.m3)
  return {
    cols: [{ t: 'Planta' }, { t: 'Bomba' }, { t: 'Operario(s)', w: true }, { t: 'Servicios', r: true }, { t: 'm³ bombeados', r: true },
      { t: 'Venta bombeo', r: true }, { t: '$ / m³', r: true }, { t: 'Clientes', r: true }],
    filas: agruparPorPlanta(filas, p => ['', ...celdas(serv.filter(r => r.planta === p))]),
    total: ['Total', '', '', ...celdas(serv)],
    nota: 'Remisiones con servicio de bombeo, por la planta que despachó; la bomba y el operario vienen de order_detail.',
  }
}

// ---------------------------------------------------------------- Cancelaciones y reubicaciones
export interface Cancelado { iso: string; planta: string; cliente: string; obra: string; m3: number; tipo: 'Cancelación' | 'Reubicación'; motivo: string; tema: string; conductor: string; mixer: string }
/** Tema del motivo escrito en observaciones (para saber qué causa domina) */
function temaDe(motivo: string): string {
  const m = motivo.toLowerCase()
  if (/lluvia|clima|invierno/.test(m)) return 'Clima'
  if (/vara|varad|da[ñn]|falla|error de (estacionaria|bomba)|autobomba|estacionaria|mixer|motor|llanta/.test(m)) return 'Falla de equipo'
  if (/program/.test(m)) return 'Error de programación'
  if (/list|obra|cliente|acceso|no (pudo|puede) entrar|no entr/.test(m)) return 'Obra o cliente no listo'
  return 'Otro'
}
export function normalizarCancelados(rows: Record<string, unknown>[]): Cancelado[] {
  return rows.filter(r => typeof r['Fecha'] === 'number' && r['Fecha']).map(r => {
    const obs = String(r['Observaciones'] ?? '').trim()
    const m = obs.match(/^(Reubicaci[oó]n|Cancelaci[oó]n)\s*:\s*(.*)$/i)
    const motivo = (m ? m[2] : obs).replace(/^se (reubica|cancela) (el )?(viaje|despacho|pedido)\s*/i, '').trim() || 'Sin motivo registrado'
    return {
      iso: serialToDate(r['Fecha'] as number).toISOString().slice(0, 10), planta: nombrePlanta(r['Planta']),
      cliente: titulo(String(r['Cliente'] ?? '').trim()) || 'Sin cliente', obra: titulo(String(r['Proyecto'] ?? '').trim()),
      m3: num(r['Cant. Concreto']), tipo: m && /reubic/i.test(m[1]) ? 'Reubicación' : 'Cancelación',
      motivo: motivo.charAt(0).toUpperCase() + motivo.slice(1), tema: temaDe(motivo),
      conductor: titulo(String(r['Conductor'] ?? '').trim()), mixer: String(r['Mixer'] ?? '').trim().toUpperCase(),
    }
  })
}
/** Resumen: total, cancelaciones, reubicaciones, m³ y el tema que más se repite */
export function resumenCancelados(cs: Cancelado[]) {
  const temas = new Map<string, { n: number; m3: number }>()
  for (const c of cs) { const e = temas.get(c.tema) ?? { n: 0, m3: 0 }; e.n++; e.m3 += c.m3; temas.set(c.tema, e) }
  const porTema = [...temas.entries()].map(([tema, v]) => ({ tema, ...v })).sort((a, b) => b.n - a.n || b.m3 - a.m3)
  return {
    total: cs.length, m3: cs.reduce((a, c) => a + c.m3, 0),
    cancelaciones: cs.filter(c => c.tipo === 'Cancelación').length, reubicaciones: cs.filter(c => c.tipo === 'Reubicación').length,
    porTema, dominante: porTema[0] ?? null,
  }
}
/** Tabla de viajes cancelados o reubicados, agrupada por planta, del más reciente al más antiguo */
export function tablaCancelados(cs: Cancelado[]): TablaOp {
  const corta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
  const filas = [...cs].sort((a, b) => b.iso.localeCompare(a.iso)).map(c => ({
    planta: c.planta, celdas: [corta(c.iso), c.obra ? `${c.cliente} · ${c.obra}` : c.cliente, c.tipo, c.tema, c.motivo, fmtN(c.m3)],
  }))
  const sub = (p: string) => { const x = cs.filter(c => c.planta === p); return ['', '', '', `${x.length} ${x.length === 1 ? 'viaje' : 'viajes'}`, fmtN(x.reduce((a, c) => a + c.m3, 0))] }
  return {
    cols: [{ t: 'Planta' }, { t: 'Fecha' }, { t: 'Cliente · obra', w: true }, { t: 'Tipo' }, { t: 'Tema' }, { t: 'Motivo', w: true }, { t: 'm³', r: true }],
    filas: agruparPorPlanta(filas, sub),
    total: ['Total', '', '', '', '', `${cs.length} viajes`, fmtN(cs.reduce((a, c) => a + c.m3, 0))],
    nota: 'Viajes con estado «Cancelado» en order_detail. El tipo y el motivo salen de las observaciones; el tema agrupa motivos parecidos.',
  }
}

/** Clientes agrupados por planta (la planta que despachó): obras, remisiones, m³, venta, $/m³ y participación en la planta */
export function tablaClientes(rs: RemOp[], limitePorPlanta = 0): TablaOp {
  const conc = rs.filter(r => !r.agregado)
  const g = new Map<string, RemOp[]>()
  for (const r of conc) { const k = `${r.planta}|${r.cliente}`; g.set(k, [...(g.get(k) ?? []), r]) }
  const m3Planta = new Map<string, number>()
  for (const r of conc) m3Planta.set(r.planta, (m3Planta.get(r.planta) ?? 0) + r.m3)
  const celdas = (x: RemOp[], planta?: string) => {
    const m3 = x.reduce((a, r) => a + r.m3, 0), conc$ = x.reduce((a, r) => a + r.totalConc, 0), venta = x.reduce((a, r) => a + r.subtotal, 0)
    const base = planta ? (m3Planta.get(planta) ?? 0) : conc.reduce((a, r) => a + r.m3, 0)
    return [fmtN(x.length), fmtN(m3), cop(venta), m3 ? cop(conc$ / m3) : '—', base ? `${fmtN(m3 / base * 100, 1)}%` : '—']
  }
  const filas = [...g.entries()].map(([k, x]) => {
    const [planta, cliente] = k.split('|')
    const obras = [...new Set(x.map(r => titulo(r.obra)).filter(Boolean))]
    return { planta, m3: x.reduce((a, r) => a + r.m3, 0),
      celdas: [cliente, obras.slice(0, 3).join(', ') + (obras.length > 3 ? ` y ${obras.length - 3} más` : '') || '—', ...celdas(x, planta)] }
  }).sort((a, b) => b.m3 - a.m3)
  return {
    cols: [{ t: 'Planta' }, { t: 'Cliente', w: true }, { t: 'Obras', w: true }, { t: 'Remisiones', r: true }, { t: 'm³', r: true },
      { t: 'Venta', r: true }, { t: '$ / m³', r: true }, { t: 'Part. planta', r: true }],
    filas: agruparPorPlanta(filas, p => ['', ...celdas(conc.filter(r => r.planta === p), p)], limitePorPlanta),
    total: ['Total', '', '', ...celdas(conc)],
    nota: (limitePorPlanta ? `Los ${limitePorPlanta} clientes con más m³ de cada planta (el subtotal incluye a todos). ` : '') + 'Concreto sin agregados; $ / m³ solo del concreto, venta con servicios.',
  }
}

/** Resumen por causa (tema) de los viajes cancelados o reubicados: viajes, participación y m³ */
export function tablaCausasCancelacion(cs: Cancelado[]): TablaOp {
  const r = resumenCancelados(cs)
  return {
    cols: [{ t: 'Causa' }, { t: 'Viajes', r: true }, { t: 'Part.', r: true }, { t: 'Cancelaciones', r: true }, { t: 'Reubicaciones', r: true }, { t: 'm³', r: true }],
    filas: r.porTema.map(t => {
      const x = cs.filter(c => c.tema === t.tema)
      return { celdas: [t.tema, fmtN(t.n), r.total ? `${fmtN(t.n / r.total * 100, 1)}%` : '—', fmtN(x.filter(c => c.tipo === 'Cancelación').length),
        fmtN(x.filter(c => c.tipo === 'Reubicación').length), fmtN(t.m3)] }
    }),
    total: ['Total', fmtN(r.total), '100%', fmtN(r.cancelaciones), fmtN(r.reubicaciones), fmtN(r.m3)],
  }
}
