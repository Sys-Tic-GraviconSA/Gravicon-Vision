import { unzipSync, strFromU8 } from 'fflate'

/**
 * xlsx-reader.ts — Lector mínimo de archivos .xlsx (Office Open XML), sin dependencias pesadas.
 * Lee la primera hoja (o la indicada) y devuelve filas como objetos { encabezado: valor }.
 *
 * Soporta: cadenas compartidas, cadenas en línea, números, booleanos y fechas
 * (celdas numéricas con formato de fecha → Date UTC). Suficiente para exportes de ERP
 * (Novasoft) que son tablas planas con encabezado en la primera fila.
 */

export type Celda = string | number | boolean | Date | null

const XML_ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
const desescapar = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-f]+);/gi, (m, _n, dec, hex) =>
  dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : XML_ENT[m.toLowerCase()] ?? m)

/** Texto de un nodo <si> o <is>: concatena todos los <t> (incluye texto enriquecido en <r>) */
function textoDe(xml: string): string {
  let out = ''
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1]
  return desescapar(out)
}

/** "B12" → índice de columna 1 (base 0) */
function columna(ref: string): number {
  const letras = ref.match(/^[A-Z]+/)![0]
  let n = 0
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

// Formatos de número de Excel que son fechas: ids integrados 14–22 y 45–47, o formatos propios con d/m/y/h
const FECHA_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])
function estilosFecha(stylesXml: string | undefined): Set<number> {
  const out = new Set<number>()
  if (!stylesXml) return out
  const propios = new Map<number, string>()
  for (const m of stylesXml.matchAll(/<numFmt\s+numFmtId="(\d+)"\s+formatCode="([^"]*)"/g)) propios.set(Number(m[1]), desescapar(m[2]))
  const cellXfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? ''
  let i = 0
  for (const m of cellXfs.matchAll(/<xf\b([^>]*?)\/?>/g)) {
    const id = Number(m[1].match(/numFmtId="(\d+)"/)?.[1] ?? 0)
    const fmt = propios.get(id)
    // En formatos propios se ignora lo que va entre comillas o corchetes (texto y colores)
    if (FECHA_IDS.has(id) || (fmt && /[dmyh]/i.test(fmt.replace(/"[^"]*"|\[[^\]]*\]/g, '')))) out.add(i)
    i++
  }
  return out
}

/** Número de serie de Excel (sistema 1900) → Date UTC */
function serialAFecha(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400000))
}

/**
 * Lee un .xlsx y devuelve las filas de una hoja como objetos.
 * @param datos - Contenido binario del archivo.
 * @param hoja - Nombre de la hoja; por defecto la primera.
 */
export function leerXlsx(datos: Uint8Array, hoja?: string): { hoja: string; encabezados: string[]; filas: Record<string, Celda>[] } {
  const zip = unzipSync(datos)
  const leer = (ruta: string) => (zip[ruta] ? strFromU8(zip[ruta]) : undefined)

  // Hojas del libro y su archivo (workbook.xml + relaciones)
  const wb = leer('xl/workbook.xml') ?? ''
  const rels = leer('xl/_rels/workbook.xml.rels') ?? ''
  const destino = new Map<string, string>()
  for (const m of rels.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) destino.set(m[1], m[2])
  for (const m of rels.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g)) destino.set(m[2], m[1])
  const hojas = [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)].map(m => ({ nombre: desescapar(m[1]), rid: m[2] }))
  const elegida = (hoja ? hojas.find(h => h.nombre === hoja) : hojas[0]) ?? hojas[0]
  if (!elegida) throw new Error('El archivo no tiene hojas')
  const target = (destino.get(elegida.rid) ?? 'worksheets/sheet1.xml').replace(/^\/?xl\//, '').replace(/^\//, '')
  const sheetXml = leer(`xl/${target}`)
  if (!sheetXml) throw new Error(`No se encontró la hoja «${elegida.nombre}»`)

  const compartidas = [...(leer('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textoDe(m[1]))
  const fechas = estilosFecha(leer('xl/styles.xml'))

  const matriz: Celda[][] = []
  for (const fila of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const valores: Celda[] = []
    for (const c of fila[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], cuerpo = c[2] ?? ''
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1]
      const tipo = attrs.match(/\bt="(\w+)"/)?.[1]
      const estilo = Number(attrs.match(/\bs="(\d+)"/)?.[1] ?? -1)
      const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let valor: Celda = null
      if (tipo === 's' && v !== undefined) valor = compartidas[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = textoDe(cuerpo)
      else if (tipo === 'str') valor = v !== undefined ? desescapar(v) : ''
      else if (tipo === 'b') valor = v === '1'
      else if (v !== undefined) {
        const n = Number(v)
        valor = fechas.has(estilo) ? serialAFecha(n) : n
      }
      valores[ref ? columna(ref) : valores.length] = valor
    }
    matriz.push(valores)
  }

  const encabezados = (matriz[0] ?? []).map(h => String(h ?? '').trim())
  const filas = matriz.slice(1)
    .filter(r => r.some(v => v !== null && v !== undefined && v !== ''))
    .map(r => Object.fromEntries(encabezados.map((h, i) => [h, r[i] ?? null])))
  return { hoja: elegida.nombre, encabezados, filas }
}
