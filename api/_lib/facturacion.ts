import { getDrive, getSheets } from './google.js'
import { leerXlsx, type Celda } from './xlsx-reader.js'

/**
 * facturacion.ts — Facturación de agregados (exporte de Novasoft, hoja «Resultado»).
 *
 * Fuente: DRIVE_FACTURACION_AGREGADOS = ID del archivo en Drive, compartido con la cuenta de servicio.
 * - Hoja de cálculo de Google (lo normal): se lee con la API de Sheets, valores sin formato.
 * - Archivo Excel (.xlsx) en Drive: la API de Sheets no lo abre; se descarga con la API de Drive y se lee aquí.
 * El archivo trae también las sucursales de Concretos (C01, C02, C04); solo se usan 002 y 004.
 *
 * Reglas de negocio (las mismas del generador de informes de agregados, informes/generador/generar_agregados.py):
 * - Planta por sucursal: 002 = Cuncía, 004 = Acacías.
 * - Subtipo 952 (o documentos DON/ADO) = donación: no es venta. Subtipo 003 = traslado de inventario: sin valor ni cliente,
 *   no suma a la venta pero sí a las toneladas despachadas. El resto de subtipos con valor es venta.
 * - Todo se reporta en toneladas: lo registrado en m³ (M3/M4) se pasa a t con el factor de cada material.
 *   Si la sucursal ya vende en toneladas (hay líneas en TN), lo que viene sin unidad se toma como t; si no, como m³.
 * - Los fletes son un servicio: suman a la venta, no a las toneladas.
 */

export const SUCURSALES = { cuncia: '002', acacias: '004' } as const
export type PlantaFacturacion = keyof typeof SUCURSALES

/** Nombre de los subtipos conocidos del ERP */
export const SUBTIPOS: Record<string, string> = {
  '006': 'Venta',
  '950': 'Venta (950)',
  '952': 'Donación',
  '003': 'Traslado de inventario',
}

/** Factor m³ → t por material (tabla de planta, igual en Cuncía y Acacías) */
export const FACTORES_T_M3: Record<string, number> = {
  'ARENA LAVADA': 1.6, 'ARENA MANUFACTURADA': 1.6,
  'GRAVA DE 1': 1.4, 'GRAVA DE 3/4': 1.4, 'GRAVA DE 1/2': 1.5,
  'MATERIAL DE RIO SIN PROCESAR': 2.0, 'SUB-BASE GRANULAR': 2.0, 'BASE GRANULAR': 1.9,
}
/** Factor para materiales sin factor propio en la tabla (queda anotado en calidad del dato) */
export const FACTOR_T_M3_DEFECTO = 1.55

export type TipoLinea = 'venta' | 'donacion' | 'traslado'
export type Familia = 'Arena' | 'Grava' | 'Base y sub-base' | 'Material de río' | 'Piedra y otros' | 'Fletes'

export interface LineaFacturacion {
  fecha: string            // YYYY-MM-DD
  subtipo: string
  tipo: TipoLinea
  doc: string
  item: string
  descripcion: string
  familia: Familia
  producto: string         // descripción sin la unidad
  registrado: 't' | 'm³' | 'sin unidad' | 'servicio'
  cantidad: number         // tal como viene en el documento
  factor: number           // 1 si no se convierte
  factorPropio: boolean    // false si usa el factor por defecto
  factorMaterial: number   // t por m³ del material aunque la línea venga en t (para pasar t → m³ equivalentes); 0 en fletes
  toneladas: number        // 0 en fletes
  total: number            // precio total (sin IVA) del documento
  cliente: string
  nit: string
  placa: string
  ficha: string
  tituloMinero: string
}

export interface DatosFacturacion {
  planta: PlantaFacturacion
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  actualizado: string
  subtipos: Record<string, string>
  lineas: LineaFacturacion[]
}

/** Orden de las columnas en la respuesta compacta (el cliente la vuelve a convertir en objetos) */
export const COLUMNAS: (keyof LineaFacturacion)[] = [
  'fecha', 'subtipo', 'tipo', 'doc', 'item', 'descripcion', 'familia', 'producto', 'registrado',
  'cantidad', 'factor', 'factorPropio', 'factorMaterial', 'toneladas', 'total', 'cliente', 'nit', 'placa', 'ficha', 'tituloMinero',
]

/** Columnas de texto muy repetido: viajan como índice a un diccionario por columna */
const COLUMNAS_DICCIONARIO = new Set<keyof LineaFacturacion>([
  'fecha', 'subtipo', 'tipo', 'item', 'descripcion', 'familia', 'producto', 'registrado', 'cliente', 'nit', 'tituloMinero',
])

/**
 * Respuesta compacta: filas como listas en el orden de COLUMNAS y los textos repetidos como índices a
 * `diccionarios[columna]`. Con miles de líneas por mes, un objeto por línea con sus textos completos
 * crece rápido hacia el límite de 4,5 MB por respuesta de Vercel.
 */
export function compactar(d: DatosFacturacion) {
  const { lineas, ...resto } = d
  const r4 = (n: number) => Math.round(n * 10000) / 10000
  const diccionarios: Record<string, string[]> = {}
  const indices: Record<string, Map<string, number>> = {}
  for (const c of COLUMNAS_DICCIONARIO) { diccionarios[c] = []; indices[c] = new Map() }
  const indice = (c: string, v: string) => {
    let i = indices[c].get(v)
    if (i === undefined) { i = diccionarios[c].length; diccionarios[c].push(v); indices[c].set(v, i) }
    return i
  }
  return {
    ...resto,
    columnas: COLUMNAS,
    diccionarios,
    filas: lineas.map(l => COLUMNAS.map(c => {
      const v = l[c]
      if (COLUMNAS_DICCIONARIO.has(c)) return indice(c, String(v))
      return typeof v === 'number' ? r4(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v
    })),
  }
}

const txt = (v: Celda) => (v instanceof Date ? v.toISOString() : String(v ?? '')).replace(/\s+/g, ' ').trim()
/**
 * Códigos del ERP (sucursal, subtipo) con 3 dígitos: en la Hoja de Google llegan como número (2, 6),
 * en el Excel como texto ('002', '006'). Los alfanuméricos (C01) se pasan a mayúsculas.
 */
const codigo = (v: Celda) => { const s = txt(v).toUpperCase(); return /^\d+$/.test(s) ? s.padStart(3, '0') : s }
/** Número de serie de fecha de Sheets/Excel (días desde 1899-12-30) → YYYY-MM-DD */
const serialAIso = (n: number) => new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10)
const numero = (v: Celda) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')) || 0)

export function familia(desc: string): Familia {
  const d = desc.toUpperCase()
  if (d.includes('FLETE')) return 'Fletes'
  if (d.startsWith('ARENA')) return 'Arena'
  if (d.startsWith('GRAVA')) return 'Grava'
  if (d.includes('BASE')) return 'Base y sub-base'
  if (d.includes('MATERIAL DE RIO') || d.includes('ZARANDEADO')) return 'Material de río'
  return 'Piedra y otros'
}

function unidadOrigen(desc: string): 'TN' | 'M3' | 'SIN' | 'servicio' {
  const d = desc.toUpperCase()
  if (d.includes('FLETE')) return 'servicio'
  if (/\b(TN|TON)\b/.test(d)) return 'TN'
  if (/\bM[34]\b/.test(d)) return 'M3'
  return 'SIN'
}

/** 'ARENA LAVADA TN' / 'ARENA LAVADA M3' → 'ARENA LAVADA' */
const producto = (desc: string) => desc.replace(/\s+(M3|M4|TN|TON)$/i, '').trim()

function fechaIso(v: Celda): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') return serialAIso(v)
  const s = txt(v)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  return s.slice(0, 10)
}

/** Convierte las filas del Excel en líneas normalizadas de una sucursal, con toneladas y tipo. */
export function normalizar(filas: Record<string, Celda>[], sucursal: string): LineaFacturacion[] {
  const propias = filas.filter(f => codigo(f['SUCURSAL']) === sucursal)
  const base = propias.map(f => {
    let descripcion = txt(f['Descripcion'] ?? f['DESCRIPCION']).toUpperCase()
    // Descripciones vacías o solo con símbolos (p. ej. «|»): se nombran por el ítem para poder identificarlas
    if (!/[A-Z0-9]/.test(descripcion)) descripcion = `SIN DESCRIPCIÓN (ÍTEM ${txt(f['ITEM']).toUpperCase() || '—'})`
    return { f, descripcion, und: unidadOrigen(descripcion) }
  })
  // ¿La sucursal vende en toneladas? Entonces lo que viene sin unidad ya está en t
  const nativoT = base.some(b => b.und === 'TN')

  return base.map(({ f, descripcion, und }) => {
    const subtipo = codigo(f['SUBTIPO'])
    const doc = txt(f['NUMERO DOC'])
    const cantidad = numero(f['CANTIDAD'])
    const prod = producto(descripcion)
    const convierte = und === 'M3' || (und === 'SIN' && !nativoT)
    const factorPropio = prod in FACTORES_T_M3
    const factor = convierte ? (FACTORES_T_M3[prod] ?? FACTOR_T_M3_DEFECTO) : 1
    const tipo: TipoLinea = subtipo === '952' || /^(DON|ADO)/i.test(doc) ? 'donacion' : subtipo === '003' ? 'traslado' : 'venta'
    const nit = txt(f['CLIENTE'])
    return {
      fecha: fechaIso(f['FECHA']),
      subtipo,
      tipo,
      doc,
      item: txt(f['ITEM']).toUpperCase(),
      descripcion,
      familia: familia(descripcion),
      producto: prod,
      registrado: und === 'servicio' ? 'servicio' : und === 'TN' ? 't' : und === 'M3' ? 'm³' : 'sin unidad',
      cantidad,
      factor,
      factorPropio: !convierte || factorPropio,
      factorMaterial: und === 'servicio' ? 0 : (FACTORES_T_M3[prod] ?? FACTOR_T_M3_DEFECTO),
      toneladas: und === 'servicio' ? 0 : cantidad * factor,
      total: numero(f['PRECIO TOTAL']),
      cliente: tipo === 'traslado' ? '' : txt(f['NOMBRE CLIENTE']),
      nit: nit === '0' ? '' : nit,
      placa: txt(f['PLACA VEHICULO']).toUpperCase(),
      ficha: txt(f['FICHA']),
      tituloMinero: txt(f['TITULO MINERO']),
    } satisfies LineaFacturacion
  }).filter(l => l.fecha)
}

// ── Descarga con caché ──
const TTL_MS = Number(process.env.CACHE_TTL ?? 300) * 1000
interface ArchivoEnCache { ts: number; archivo: DatosFacturacion['archivo']; filas: Record<string, Celda>[] }
let cache: ArchivoEnCache | null = null
let enCurso: Promise<ArchivoEnCache> | null = null

const HOJA = 'Resultado'
const MIME_SHEET = 'application/vnd.google-apps.spreadsheet'

async function descargar(): Promise<ArchivoEnCache> {
  const fileId = process.env.DRIVE_FACTURACION_AGREGADOS
  if (!fileId) throw Object.assign(new Error('Falta configurar DRIVE_FACTURACION_AGREGADOS'), { status: 503 })
  const meta = await getDrive().files.get({ fileId, fields: 'name,mimeType,modifiedTime', supportsAllDrives: true })
  const archivo = { nombre: meta.data.name ?? 'Facturación', modificado: meta.data.modifiedTime ?? null }

  if (meta.data.mimeType === MIME_SHEET) {
    // Hoja de Google: valores crudos (números y fechas como número de serie) de la hoja «Resultado», o la primera
    const sheets = getSheets()
    const libro = await sheets.spreadsheets.get({ spreadsheetId: fileId, fields: 'sheets.properties.title' })
    const titulos = (libro.data.sheets ?? []).map(s => s.properties?.title ?? '')
    const hoja = titulos.includes(HOJA) ? HOJA : titulos[0]
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: fileId, range: `'${hoja}'`, valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER',
    })
    const [encabezado = [], ...valores] = (res.data.values ?? []) as Celda[][]
    const cols = encabezado.map(h => String(h ?? '').trim())
    const filas = valores
      .filter(r => r.some(v => v !== '' && v !== null && v !== undefined))
      .map(r => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? null])) as Record<string, Celda>)
    return { ts: Date.now(), archivo, filas }
  }

  // Excel (.xlsx) guardado en Drive
  const media = await getDrive().files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
  const { filas } = leerXlsx(new Uint8Array(media.data as ArrayBuffer), HOJA)
  return { ts: Date.now(), archivo, filas }
}

/** Facturación de una planta; el archivo se descarga una vez cada CACHE_TTL segundos (o con force). */
export async function loadFacturacion(planta: PlantaFacturacion, force = false): Promise<DatosFacturacion> {
  let actual = cache
  if (force || !actual || Date.now() - actual.ts > TTL_MS) {
    enCurso ??= descargar().finally(() => { enCurso = null })
    actual = cache = await enCurso
  }
  const sucursal = SUCURSALES[planta]
  return {
    planta,
    sucursal,
    archivo: actual.archivo,
    actualizado: new Date(actual.ts).toISOString(),
    subtipos: SUBTIPOS,
    lineas: normalizar(actual.filas, sucursal),
  }
}
