import { getDrive } from './google.js'

/**
 * llantas-fotos.ts — Evidencia fotográfica de las inspecciones de llantas.
 *
 * La hoja Evidencia_Fotográfica_Inspeccion_Llantas_Concretos guarda en cada «Evidencia Fotográfica N» lo que
 * escriba la app de captura: una URL de Google Drive, el ID del archivo o la ruta del archivo
 * («Carpeta_Images/abc.Evidencia Fotográfica 1.153012.jpg»). La foto se busca en Drive con la cuenta de
 * servicio (la carpeta debe estar compartida con ella) y se entrega desde la API propia: así el navegador
 * no depende de dominios externos (la CSP solo permite imágenes propias, data: y blob:).
 */

const ID_DRIVE = /^[A-Za-z0-9_-]{25,}$/
/** Caché del valor de la hoja → ID de Drive (los nombres no cambian) */
const idPorValor = new Map<string, string | null>()

/** ID de Drive a partir del valor de la hoja (URL, ID o ruta del archivo) */
async function resolverId(valor: string): Promise<string | null> {
  const v = valor.trim()
  if (idPorValor.has(v)) return idPorValor.get(v)!
  let id: string | null = null
  const deUrl = v.match(/\/d\/([A-Za-z0-9_-]{25,})/) ?? v.match(/[?&]id=([A-Za-z0-9_-]{25,})/)
  if (deUrl) id = deUrl[1]
  else if (ID_DRIVE.test(v)) id = v
  else {
    // Ruta de la app: se busca por el nombre del archivo
    const nombre = v.split('/').pop()!.replace(/'/g, "\\'")
    if (nombre && /\.(jpe?g|png|webp|heic)$/i.test(nombre)) {
      const r = await getDrive().files.list({
        q: `name = '${nombre}' and trashed = false`, fields: 'files(id, mimeType)', pageSize: 1,
        supportsAllDrives: true, includeItemsFromAllDrives: true,
      })
      id = r.data.files?.[0]?.id ?? null
    }
  }
  idPorValor.set(v, id)
  return id
}

/** Descarga la foto (solo imágenes, máximo 15 MB) */
export async function leerFotoLlanta(valor: string): Promise<{ tipo: string; datos: Buffer } | null> {
  const id = await resolverId(valor)
  if (!id) return null
  const drive = getDrive()
  const meta = await drive.files.get({ fileId: id, fields: 'mimeType, size', supportsAllDrives: true })
  const tipo = meta.data.mimeType ?? ''
  if (!tipo.startsWith('image/') || Number(meta.data.size ?? 0) > 15 * 1024 * 1024) return null
  const r = await drive.files.get({ fileId: id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' })
  return { tipo, datos: Buffer.from(r.data as ArrayBuffer) }
}
