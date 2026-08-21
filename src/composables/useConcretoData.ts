import type { SheetData } from '../stores/concreto'
import { serialToDate } from '../utils/dates'

function fmtDate(serial: number): string {
  const d = new Date((serial - 25569) * 86400 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Fila tipada de concreto después del parseo desde SheetData */
export interface ConcretoRow {
  /** Fecha como string ISO (YYYY-MM-DD) */
  fecha: string
  /** Serial numérico de Excel para ordenamiento */
  fechaSerial: number
  /** Fecha como objeto Date */
  fechaDate: Date
  /** Nombre de la planta */
  planta: string
  /** Número de remisión */
  remision: number
  /** Nombre del cliente */
  cliente: string
  /** Nombre del proyecto/obra */
  proyecto: string
  /** Elemento constructivo */
  elemento: string
  /** Frente de trabajo */
  frente: string
  /** Nombre del comercial */
  comercial: string
  /** Identificador del mixer */
  mixer: string
  /** Nombre del conductor */
  conductor: string
  /** Tipo de mezcla de concreto */
  mezcla: string
  /** Cantidad en M³ */
  cant: number
  /** Tipo de servicio (bomba, etc.) */
  servicio: string
  /** Subtotal en pesos */
  subtotal: number
  /** Total del concreto en pesos */
  totalConcreto: number
  /** Hora programada (4-18, null si no disponible) */
  hora: number | null
  /** Nombre real de la bomba desde order_detail */
  bomba?: string
  /** Operario de la bomba desde order_detail */
  operario?: string
  /** Indica si es fila de agregado (arena/grava) */
  isAgg?: boolean
}

/** Parsea datos crudos de SheetData a filas tipadas ConcretoRow, detectando aglomerados */
export function parseRows(data: SheetData | null): ConcretoRow[] {
  if (!data?.rows) return []
  return data.rows.map(r => {
    const mezcla = String(r['Mezcla'] ?? '').toUpperCase()
    const cliente = String(r['Cliente'] ?? '')
    const planta = String(r['Planta'] ?? '').replace('Planta ', '')
    const isAgg = mezcla.includes('ARENA') || mezcla.includes('GRAVA') ||
      (planta === 'Restrepo' && cliente.toUpperCase().includes('RETIRA') &&
        (mezcla.length === 0 || mezcla.includes('GRAVA') || mezcla.includes('ARENA')))

    return {
      fecha: fmtDate(Number(r['Fecha']) || 0),
      fechaSerial: Number(r['Fecha']) || 0,
      fechaDate: serialToDate(Number(r['Fecha']) || 0),
      planta,
      remision: Number(r['Remisión']) || 0,
      cliente: String(r['Cliente'] ?? ''),
      proyecto: String(r['Proyecto'] ?? ''),
      frente: String(r['Frente'] ?? ''),
      comercial: String(r['Comercial'] ?? ''),
      elemento: String(r['Elemento'] ?? ''),
      mixer: String(r['Mixer'] ?? ''),
      conductor: String(r['Conductor'] ?? ''),
      mezcla: String(r['Mezcla'] ?? ''),
      cant: Number(r['Cant. Concreto']) || 0,
      servicio: String(r['Servicio'] ?? ''),
      subtotal: Number(r['Subtotal']) || 0,
      totalConcreto: Number(r['Total Concreto']) || 0,
      hora: r['Horario'] !== '' && r['Horario'] !== undefined ? Number(r['Horario']) : null,
      bomba: r['Bomba'] !== '' ? String(r['Bomba']) : undefined,
      operario: r['Operario'] !== '' ? String(r['Operario']) : undefined,
      isAgg
    }
  })
}
