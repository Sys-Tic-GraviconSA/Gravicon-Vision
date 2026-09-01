import { getSupabaseAdmin } from './auth-helpers.js'

export interface ProduccionDiaria {
  headers: string[]
  rows: Record<string, unknown>[]
  total: number
}

const EXCEL_EPOCH_OFFSET = 25569

function dateToSerial(iso: string | null): number {
  if (!iso) return 0
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000 + EXCEL_EPOCH_OFFSET
}

const CUNCIA_HEADERS = ['Fecha', 'Total de M³', 'Cañaveral', 'Guayuriba', 'Linea 3', 'M³ Proyectado', 'Meta Mensual M³', 'PROVEEDOR', '% Cumplimiento', 'ID_Registro']
const ACACIAS_HEADERS = ['Fecha', 'Total de M³', 'Planta 1', 'Planta 2', 'M³ Proyectado', 'Meta Mensual M³', 'PROVEEDOR', '% Cumplimiento', 'ID_Registro']

/**
 * Producción de agregados de Cuncia desde Supabase (tabla
 * produccion_agregados_cuncia). Devuelve filas con la estructura que espera el
 * frontend (Total de M³, líneas, proyectado, observaciones).
 */
export async function loadCunciaProduccion(): Promise<ProduccionDiaria> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('produccion_agregados_cuncia')
    .select('*')
    .order('fecha', { ascending: true })
    .limit(100000)
  if (error) throw error
  const rows = ((data ?? []) as Record<string, unknown>[]).map(r => {
    const obs = String(r.observacion ?? r.observaciones ?? r.Observacion ?? r.Observaciones ?? '').trim()
    return {
      'Fecha': dateToSerial(String(r.fecha ?? '')),
      'Total de M³': Number(r.total_m3) || 0,
      'Cañaveral': Number(r.canaveral) || 0,
      'Guayuriba': Number(r.guayuriba) || 0,
      'Linea 3': Number(r.linea_3) || 0,
      'M³ Proyectado': Number(r.m3_proyectado) || 0,
      'Meta Mensual M³': Number(r.m3_meta_mensual) || 0,
      'PROVEEDOR': '',
      '% Cumplimiento': Number(r.porcentaje_cumplimiento) || 0,
      'ID_Registro': r.id_registro ?? '',
      'observacion': obs,
      'Observación': obs,
      'Observaciones': obs,
    }
  })
  return { headers: CUNCIA_HEADERS, rows, total: rows.length }
}

/**
 * Producción de agregados de Acacias desde Supabase (tabla
 * produccion_agregados_acacias). Devuelve filas con la estructura que espera el
 * frontend (Total de M³, Plantas, proyectado, observaciones).
 */
export async function loadAcaciasProduccion(): Promise<ProduccionDiaria> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('produccion_agregados_acacias')
    .select('*')
    .order('fecha', { ascending: true })
    .limit(100000)
  if (error) throw error
  const rows = ((data ?? []) as Record<string, unknown>[]).map(r => {
    const obs = String(r.observacion ?? r.observaciones ?? r.Observacion ?? r.Observaciones ?? '').trim()
    return {
      'Fecha': dateToSerial(String(r.fecha ?? '')),
      'Total de M³': Number(r.total_m3) || 0,
      'Planta 1': Number(r.planta_1) || 0,
      'Planta 2': Number(r.planta_2) || 0,
      'M³ Proyectado': Number(r.m3_proyectado) || 0,
      'Meta Mensual M³': Number(r.m3_meta_mensual) || 0,
      'PROVEEDOR': r.agregados ?? '',
      '% Cumplimiento': Number(r.porcentaje_cumplimiento) || 0,
      'ID_Registro': r.id_registro ?? '',
      'observacion': obs,
      'Observación': obs,
      'Observaciones': obs,
    }
  })
  return { headers: ACACIAS_HEADERS, rows, total: rows.length }
}