/**
 * Generador de archivos .xlsx (Office Open XML) sin dependencias externas.
 * Construye el paquete ZIP en modo STORE (sin compresión) con los XML mínimos
 * que Excel y LibreOffice reconocen: hojas, cadenas inline y números.
 */

interface XlsxCell { s: boolean; v: string }
interface XlsxRow { cells: XlsxCell[] }
interface XlsxSheet { name: string; rows: XlsxRow[] }

/** Escapa texto para usarlo dentro de un nodo XML. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function crc32(buf: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function encodeStr(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Convierte un índice de columna (0-based) a letras de Excel (A, B, …, Z, AA…). */
function colLetter(i: number): string {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function sheetXml(sheet: XlsxSheet): string {
  const rowsXml = sheet.rows.map((row, ri) => {
    const cellsXml = row.cells.map((cell, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`
      if (cell.s) {
        return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(cell.v)}</t></is></c>`
      }
      return `<c r="${ref}"><v>${cell.v}</v></c>`
    }).join('')
    return `<row r="${ri + 1}">${cellsXml}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`
}

function contentTypesXml(sheetCount: number): string {
  const overrides = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
}

function workbookRelsXml(sheetCount: number): string {
  const rels = Array.from({ length: sheetCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
}

function workbookXml(sheets: XlsxSheet[]): string {
  const sheetsXml = sheets.map((s, i) =>
    `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetsXml}</sheets></workbook>`
}

interface ZipEntry { name: string; data: Uint8Array }

function writeZip(entries: ZipEntry[]): Blob {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = encodeStr(entry.name)
    const crc = crc32(entry.data)
    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04034b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 0x0800, true)
    header.setUint16(8, 0, true)
    header.setUint16(10, 0, true)
    header.setUint16(12, 0, true)
    header.setUint32(14, crc, true)
    header.setUint32(18, entry.data.length, true)
    header.setUint32(22, entry.data.length, true)
    header.setUint16(26, nameBuf.length, true)
    header.setUint16(28, 0, true)

    chunks.push(new Uint8Array(header.buffer), nameBuf, entry.data)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, 0, true)
    cd.setUint16(14, 0, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, entry.data.length, true)
    cd.setUint32(24, entry.data.length, true)
    cd.setUint16(28, nameBuf.length, true)
    cd.setUint16(30, 0, true)
    cd.setUint16(32, 0, true)
    cd.setUint16(34, 0, true)
    cd.setUint16(36, 0, true)
    cd.setUint32(38, 0, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), nameBuf)

    offset += 30 + nameBuf.length + entry.data.length
  }

  const centralData = concatBytes(central)
  const centralSize = centralData.length
  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(4, 0, true)
  eocd.setUint16(6, 0, true)
  eocd.setUint16(8, entries.length, true)
  eocd.setUint16(10, entries.length, true)
  eocd.setUint32(12, centralSize, true)
  eocd.setUint32(16, offset, true)
  eocd.setUint16(20, 0, true)

  const all = concatBytes([...chunks, centralData, new Uint8Array(eocd.buffer)])
  return new Blob([all.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

/**
 * Convierte valores crudos a celdas: números y fechas-serial como numéricos,
 * todo lo demás como texto.
 */
function toCells(values: unknown[]): XlsxCell[] {
  return values.map(v => {
    if (typeof v === 'number' && isFinite(v)) return { s: false, v: String(v) }
    if (typeof v === 'string' && v !== '' && /^[-+]?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v)) {
      return { s: false, v: v }
    }
    return { s: true, v: String(v ?? '') }
  })
}

/**
 * Construye un libro Excel (.xlsx) a partir de hojas definidas como
 * encabezados + filas de valores crudos.
 * @param sheets - [{ name, headers: string[], rows: unknown[][] }]
 * @returns Blob descargable de un archivo .xlsx.
 */
export function buildXlsx(sheets: { name: string; headers: string[]; rows: unknown[][] }[]): Blob {
  const xSheets: XlsxSheet[] = sheets.map(s => ({
    name: s.name,
    rows: [toCells(s.headers), ...s.rows.map(r => toCells(r))].map(cells => ({ cells })),
  }))

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encodeStr(contentTypesXml(xSheets.length)) },
    { name: '_rels/.rels', data: encodeStr(relsXml()) },
    { name: 'xl/workbook.xml', data: encodeStr(workbookXml(xSheets)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encodeStr(workbookRelsXml(xSheets.length)) },
    ...xSheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: encodeStr(sheetXml(s)) })),
  ]

  return writeZip(entries)
}

/** Descarga un Blob xlsx con el nombre dado. */
export function downloadXlsx(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
