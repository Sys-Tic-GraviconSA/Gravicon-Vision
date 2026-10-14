/**
 * useComercial.ts — Modelo del módulo Comercial: cotizaciones (leads), ofertas F227 y embudo hasta la compra.
 *
 * Reglas (validadas contra los datos de Supabase):
 * - Negocio del lead: «Concretos y Agregados» = Dual. Sin industria se deduce de la planta (CON-* / AGG-*) o de
 *   las líneas cotizadas (concreto y agregados = Dual).
 * - Valor cotizado = valor_total_de_la_factura_c (concreto) + valor_total_de_la_factura_a (agregados). Las líneas de
 *   agregados traen subtotal 0: el valor solo está en el encabezado.
 * - m³ de concreto = líneas de concreto (código C…/CON… o descripción «Concreto…», «C. …», «Mortero…»); los servicios
 *   (bombeo, stand by, incrementos) traen cantidad pero no son m³ de concreto. Se descartan las líneas atípicas
 *   (precio por m³ < $1.000 con más de 1.000 m³: cantidad y precio cruzados).
 * - Se descartan los leads de prueba: sin empresa y sin valor.
 * - Cruce con las compras por NIT sin dígito de verificación ni puntuación; si el NIT trae el dígito pegado (10 dígitos
 *   que empiezan por 8 o 9) se prueba también sin él. Sin NIT, por nombre exacto (sin tildes, puntuación ni SAS/LTDA).
 * - «Compró» = tiene compras del negocio cotizado (concreto: remisiones no canceladas; agregados: ventas Novasoft) desde
 *   la fecha de la primera solicitud. «Ya era cliente» = compró antes de esa fecha.
 */

export interface DatosComercial {
  leads: Record<string, unknown>[]
  leadsConcreto: Record<string, unknown>[]
  leadsAgregados: Record<string, unknown>[]
  f227: Record<string, unknown>[]
  f227Concreto: Record<string, unknown>[]
  /** [nit, fecha, m³, viajes, valor] */
  comprasConcreto: [string, string, number, number, number][]
  /** [nit, fecha, planta, valor]; null si no se pudo leer la facturación de agregados */
  comprasAgregados: [string, string, string, number][] | null
  nombres: Record<string, string>
  avisos: string[]
  actualizado: string
}

export type Negocio = 'Concretos' | 'Agregados' | 'Dual' | 'Sin definir'
export const NEGOCIOS: Negocio[] = ['Concretos', 'Agregados', 'Dual', 'Sin definir']
export const COLOR_NEGOCIO: Record<Negocio, string> = { Concretos: '#3B82F6', Agregados: '#F59E0B', Dual: '#8B5CF6', 'Sin definir': '#94A3B8' }
export const SIN_ASESOR = 'Sin asesor'
export const SIN_PLANTA = 'Sin planta'

const PLANTAS_LEAD: Record<string, string> = {
  'CON-A': 'Concretos Acacías', 'CON-V': 'Concretos Villavicencio', 'CON-R': 'Concretos Restrepo', 'CON-P': 'Concretos Puerto Concordia',
  'AGG-A': 'Agregados Acacías', 'AGG-C': 'Agregados Cuncía',
}
export function nombrePlantaLead(v: unknown): string {
  const k = String(v ?? '').trim()
  return PLANTAS_LEAD[k.toUpperCase()] ?? (k || SIN_PLANTA)
}

const txt = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const fecha = (v: unknown) => { const s = String(v ?? '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '' }

/** NIT sin dígito de verificación ni puntuación (mismo criterio del servidor); menos de 5 dígitos no es un NIT */
export function normNit(v: unknown): string {
  const n = String(v ?? '').split('-')[0].replace(/\D/g, '')
  return n.length >= 5 ? n : ''
}
/** Claves de cruce de un NIT: la normalizada y, si parece traer el dígito de verificación pegado, también sin él */
export function clavesNit(v: unknown): string[] {
  const n = normNit(v)
  if (!n) return []
  return n.length === 10 && /^[89]/.test(n) && !String(v).includes('-') ? [n, n.slice(0, 9)] : [n]
}
/** Nombre para cruzar: sin tildes, puntuación ni la razón social (SAS, LTDA, SA) */
export function normNombre(v: unknown): string {
  return String(v ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, '').replace(/\b(S ?A ?S|SAS|LTDA|S ?A|E ?U)\b/g, '').replace(/\s+/g, '')
}

export function esLineaConcreto(codigo: unknown, descripcion: unknown): boolean {
  return /^(C|CON)\d/i.test(txt(codigo)) || /^(concreto|c\.\s*\w|mortero)/i.test(txt(descripcion))
}

export interface LineaCotizada { producto: string; codigo: string; cantidad: number; precio: number; subtotal: number; concreto: boolean; atipica: boolean }

export interface Lead {
  id: string
  empresa: string
  contacto: string
  ciudad: string
  nit: string
  nits: string[]
  nombreKey: string
  planta: string
  negocio: Negocio
  asesor: string
  solicitud: string
  envio: string
  aprobacion: string
  /** Fecha para filtrar y agrupar: la solicitud o, si falta, el envío de la oferta */
  fecha: string
  version: string
  formaPago: string
  valor: number
  valorConcreto: number
  valorAgregados: number
  m3: number
  enviada: boolean
  aprobada: boolean
  lineasConcreto: LineaCotizada[]
  lineasAgregados: LineaCotizada[]
}

export interface OfertaF227 {
  id: string
  consecutivo: string
  cliente: string
  obra: string
  nit: string
  nits: string[]
  nombreKey: string
  planta: string
  asesor: string
  canal: string
  segmento: string
  bombeo: string
  formaPago: string
  estado: string
  motivo: string
  solicitud: string
  envio: string
  aprobacion: string
  fecha: string
  distancia: number
  m3: number
  valor: number
  aprobada: boolean
  lineas: LineaCotizada[]
}

function agrupar<T extends Record<string, unknown>>(filas: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const f of filas) { const k = String(f.id ?? ''); const l = m.get(k); if (l) l.push(f); else m.set(k, [f]) }
  return m
}
function lineasConcreto(filas: Record<string, unknown>[] = []): LineaCotizada[] {
  return filas
    .sort((a, b) => num(a.serial_number) - num(b.serial_number))
    .map(l => {
      const codigo = txt(l.codigo), desc = txt(l.descripcion)
      const cantidad = num(l.cantidad_m3), precio = num(l.valor_unitario)
      return {
        producto: desc || codigo || 'Sin descripción', codigo, cantidad, precio, subtotal: num(l.subtotal),
        concreto: esLineaConcreto(codigo, desc), atipica: precio > 0 && precio < 1000 && cantidad > 1000,
      }
    })
}
const m3De = (ls: LineaCotizada[]) => ls.reduce((a, l) => a + (l.concreto && !l.atipica ? l.cantidad : 0), 0)

export function construirLeads(d: DatosComercial): { leads: Lead[]; descartados: number; atipicas: number } {
  const lc = agrupar(d.leadsConcreto)
  const la = agrupar(d.leadsAgregados)
  let descartados = 0, atipicas = 0
  const leads: Lead[] = []
  for (const r of d.leads) {
    const id = String(r.id ?? '')
    const empresa = txt(r.company)
    const valorConcreto = num(r.valor_total_de_la_factura_c), valorAgregados = num(r.valor_total_de_la_factura_a)
    if (!empresa && !(valorConcreto + valorAgregados)) { descartados++; continue }
    const lineasC = lineasConcreto(lc.get(id))
    atipicas += lineasC.filter(l => l.atipica).length
    const lineasA: LineaCotizada[] = (la.get(id) ?? [])
      .sort((a, b) => num(a.serial_number) - num(b.serial_number))
      .map(l => ({ producto: txt(l.material) || 'Sin material', codigo: txt(l.medida), cantidad: num(l.cantidad), precio: num(l.valor_unitario), subtotal: 0, concreto: false, atipica: false }))
    const plantaCod = txt(r.planta).toUpperCase()
    const industria = txt(r.industria).toLowerCase()
    let negocio: Negocio
    if (industria.includes('concreto') && industria.includes('agregado')) negocio = 'Dual'
    else if (industria === 'concretos') negocio = 'Concretos'
    else if (industria === 'agregados') negocio = 'Agregados'
    else {
      const c = lineasC.length > 0 || plantaCod.startsWith('CON'), a = lineasA.length > 0 || plantaCod.startsWith('AGG')
      negocio = c && a ? 'Dual' : c ? 'Concretos' : a ? 'Agregados' : 'Sin definir'
    }
    const solicitud = fecha(r.fecha_de_solicitud), envio = fecha(r.fecha_envio_oferta), aprobacion = fecha(r.fecha_de_aprobacion)
    leads.push({
      id, empresa: empresa || txt(r.full_name) || 'Sin nombre', contacto: txt(r.full_name), ciudad: txt(r.city),
      nit: txt(r.nit_cedula), nits: clavesNit(r.nit_cedula), nombreKey: normNombre(empresa),
      planta: nombrePlantaLead(r.planta), negocio, asesor: txt(r.representante_nombre) || SIN_ASESOR,
      solicitud, envio, aprobacion, fecha: solicitud || envio,
      version: txt(r.version), formaPago: txt(r.forma_de_pago) || 'Sin dato',
      valor: valorConcreto + valorAgregados, valorConcreto, valorAgregados,
      m3: m3De(lineasC), enviada: !!envio, aprobada: !!aprobacion,
      lineasConcreto: lineasC, lineasAgregados: lineasA,
    })
  }
  return { leads, descartados, atipicas }
}

export function construirF227(d: DatosComercial): OfertaF227[] {
  const lc = agrupar(d.f227Concreto)
  return d.f227.map(r => {
    const id = String(r.id ?? '')
    const lineas = lineasConcreto(lc.get(id))
    const estado = txt(r.estado_f227)
    const solicitud = fecha(r.fecha_de_solicitud), envio = fecha(r.fecha_envio_oferta), aprobacion = fecha(r.fecha_de_aprobacion)
    const aprobada = !!aprobacion || (/aprob/i.test(estado) && !/no\s*aprob|rechaz/i.test(estado))
    const cliente = txt(r.nombre_del_cliente) || txt(r.name) || 'Sin nombre'
    return {
      id, consecutivo: txt(r.consecutivo) || txt(r.consecutivo_manual), cliente, obra: txt(r.obra_del_cliente),
      nit: txt(r.nit_o_cedula), nits: clavesNit(r.nit_o_cedula), nombreKey: normNombre(cliente),
      planta: nombrePlantaLead(r.planta_de_concreto), asesor: txt(r.representante_nombre) || SIN_ASESOR,
      canal: txt(r.canal_cliente) || 'Sin dato', segmento: txt(r.segmento_del_cliente) || 'Sin dato', bombeo: txt(r.bombeo) || 'Sin dato',
      formaPago: txt(r.forma_de_pago) || 'Sin dato', estado: estado || (aprobada ? 'Aprobada' : 'Sin estado'),
      motivo: txt(r.observaciones_motivo_no_aprobacion),
      solicitud, envio, aprobacion, fecha: solicitud || envio,
      distancia: num(r.distancia_km), m3: m3De(lineas), valor: lineas.reduce((a, l) => a + l.subtotal, 0), aprobada, lineas,
    }
  })
}

// ── Compras ──

interface Compra { fecha: string; m3: number; valor: number }
export interface IndiceCompras {
  concreto: Map<string, Compra[]>
  agregados: Map<string, Compra[]> | null
  /** Nombre normalizado → NIT (solo nombres que corresponden a un único NIT) */
  porNombre: Map<string, string>
  nombres: Record<string, string>
  desdeConcreto: string
  desdeAgregados: string
}

export function indexarCompras(d: DatosComercial): IndiceCompras {
  const concreto = new Map<string, Compra[]>()
  let desdeConcreto = ''
  for (const [nit, f, m3, , valor] of d.comprasConcreto) {
    const l = concreto.get(nit) ?? []
    l.push({ fecha: f, m3, valor })
    concreto.set(nit, l)
    if (!desdeConcreto || f < desdeConcreto) desdeConcreto = f
  }
  let agregados: Map<string, Compra[]> | null = null
  let desdeAgregados = ''
  if (d.comprasAgregados) {
    agregados = new Map()
    for (const [nit, f, , valor] of d.comprasAgregados) {
      const l = agregados.get(nit) ?? []
      l.push({ fecha: f, m3: 0, valor })
      agregados.set(nit, l)
      if (!desdeAgregados || f < desdeAgregados) desdeAgregados = f
    }
  }
  const porNombre = new Map<string, string>()
  const repetidos = new Set<string>()
  for (const [nit, nombre] of Object.entries(d.nombres)) {
    const k = normNombre(nombre)
    if (!k) continue
    if (porNombre.has(k) && porNombre.get(k) !== nit) repetidos.add(k)
    else porNombre.set(k, nit)
  }
  for (const k of repetidos) porNombre.delete(k)
  return { concreto, agregados, porNombre, nombres: d.nombres, desdeConcreto, desdeAgregados }
}

export interface ResumenCompra { primera: string; valor: number; m3: number; dias: number; antes: boolean }
function resumir(compras: Compra[] | undefined, desde: string): ResumenCompra | null {
  if (!compras?.length) return null
  let primera = '', valor = 0, m3 = 0, dias = 0, antes = false
  for (const c of compras) {
    if (desde && c.fecha < desde) { antes = true; continue }
    if (!primera || c.fecha < primera) primera = c.fecha
    valor += c.valor; m3 += c.m3; dias++
  }
  return { primera, valor, m3, dias, antes }
}

// ── Embudo por cliente ──

export type Cruce = 'NIT' | 'Nombre' | 'Sin cruce'

export interface ClienteEmbudo {
  key: string
  nombre: string
  nit: string
  negocio: Negocio
  asesor: string
  planta: string
  primeraSolicitud: string
  cotizaciones: number
  valorCotizado: number
  m3Cotizado: number
  enviada: boolean
  aprobada: boolean
  f227: number
  f227Aprobada: boolean
  cruce: Cruce
  compro: boolean
  yaEraCliente: boolean
  primeraCompra: string
  diasACompra: number | null
  valorComprado: number
  m3Comprado: number
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const masFrecuente = (xs: string[]) => {
  const c = new Map<string, number>()
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

/**
 * Agrupa las cotizaciones por cliente (NIT o, sin NIT, nombre) y marca cada etapa del embudo.
 * `f227` se cruza por NIT o nombre con el cliente; las compras, por el negocio cotizado.
 */
export function construirEmbudo(leads: Lead[], f227: OfertaF227[], idx: IndiceCompras): ClienteEmbudo[] {
  const grupos = new Map<string, Lead[]>()
  for (const l of leads) {
    const k = l.nits[0] ?? (l.nombreKey ? `N:${l.nombreKey}` : `L:${l.id}`)
    const g = grupos.get(k); if (g) g.push(l); else grupos.set(k, [l])
  }
  const f227PorClave = new Map<string, OfertaF227[]>()
  for (const o of f227) for (const k of [...o.nits, o.nombreKey ? `N:${o.nombreKey}` : '']) {
    if (!k) continue
    const g = f227PorClave.get(k); if (g) g.push(o); else f227PorClave.set(k, [o])
  }

  return [...grupos.entries()].map(([key, ls]) => {
    const nits = [...new Set(ls.flatMap(l => l.nits))]
    const nombreKey = ls.find(l => l.nombreKey)?.nombreKey ?? ''
    const negocios = new Set(ls.map(l => l.negocio))
    const negocio: Negocio = negocios.has('Dual') || (negocios.has('Concretos') && negocios.has('Agregados')) ? 'Dual'
      : negocios.has('Concretos') ? 'Concretos' : negocios.has('Agregados') ? 'Agregados' : 'Sin definir'
    const fechas = ls.map(l => l.fecha).filter(Boolean).sort()
    const primeraSolicitud = fechas[0] ?? ''

    // Cruce con las compras: NIT (con o sin dígito de verificación) y, si no hay NIT, nombre
    let cruce: Cruce = 'Sin cruce'
    let claves = nits
    if (nits.length) cruce = 'NIT'
    else if (nombreKey && idx.porNombre.has(nombreKey)) { cruce = 'Nombre'; claves = [idx.porNombre.get(nombreKey)!] }
    const usaConcreto = negocio !== 'Agregados'
    const usaAgregados = negocio !== 'Concretos' && !!idx.agregados
    const compras: ResumenCompra[] = []
    for (const k of claves) {
      if (usaConcreto) { const r = resumir(idx.concreto.get(k), primeraSolicitud); if (r) compras.push(r) }
      if (usaAgregados) { const r = resumir(idx.agregados!.get(k), primeraSolicitud); if (r) compras.push(r) }
    }
    const despues = compras.filter(c => c.primera)
    const primeraCompra = despues.map(c => c.primera).sort()[0] ?? ''

    const ofertas = [...new Map([...nits, nombreKey ? `N:${nombreKey}` : '']
      .flatMap(k => (k ? f227PorClave.get(k) ?? [] : [])).map(o => [o.id, o])).values()]

    return {
      key,
      nombre: ls[0].empresa,
      nit: ls.find(l => l.nit)?.nit ?? '',
      negocio,
      asesor: masFrecuente(ls.map(l => l.asesor)),
      planta: masFrecuente(ls.map(l => l.planta)),
      primeraSolicitud,
      cotizaciones: ls.length,
      valorCotizado: ls.reduce((a, l) => a + l.valor, 0),
      m3Cotizado: ls.reduce((a, l) => a + l.m3, 0),
      enviada: ls.some(l => l.enviada),
      aprobada: ls.some(l => l.aprobada),
      f227: ofertas.length,
      f227Aprobada: ofertas.some(o => o.aprobada),
      cruce,
      compro: !!primeraCompra,
      yaEraCliente: compras.some(c => c.antes),
      primeraCompra,
      diasACompra: primeraCompra && primeraSolicitud ? diasEntre(primeraSolicitud, primeraCompra) : null,
      valorComprado: despues.reduce((a, c) => a + c.valor, 0),
      m3Comprado: despues.reduce((a, c) => a + c.m3, 0),
    }
  })
}

// ── Utilidades de indicadores ──

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
/** Días de respuesta (solicitud → envío de la oferta), solo los que tienen ambas fechas en orden */
export function diasRespuesta(xs: { solicitud: string; envio: string }[]): number[] {
  return xs.filter(x => x.solicitud && x.envio && x.envio >= x.solicitud).map(x => diasEntre(x.solicitud, x.envio))
}
export const tasa = (parte: number, total: number) => (total ? parte / total * 100 : 0)
/** Millones de pesos con un decimal: 2.248.000.000 → «$ 2.248,0 M» */
export function millones(n: number): string {
  return '$ ' + (n / 1e6).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'
}
