import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from './auth'
import { dateToSerial } from '../utils/dates'

/**
 * useConcretoStore — Store para datos de concreto premezclado desde Supabase.
 *
 * Obtiene datos de las tablas order_price y order_detail, los combina en un
 * formato de hoja de cálculo (SheetData) para reutilizar los componentes de
 * visualización existentes (DataTable, gráficos, etc.).
 */

/** Formato de datos plano similar a hoja de cálculo para componentes de visualización */
export interface SheetData {
  headers: string[]
  rows: Record<string, unknown>[]
  total: number
}

/** Mapea los campos de la API de Supabase al formato plano de columnas del dashboard */
function mapRow(r: any): Record<string, unknown> {
  return {
    'Elemento': r.elemento,
    'Fecha': dateToSerial(r.fecha),
    'Planta': r.planta,
    'Remisión': Number(r.remision) || 0,
    'Facturado': r.facturado,
    'Código': r.codigo,
    'Cliente': r.cliente,
    'Proyecto': r.proyecto,
    'Frente': r.frente,
    'Comercial': r.comercial,
    'Mixer': r.mixer,
    'Conductor': r.conductor,
    'Precinto': r.precinto,
    'Mezcla': r.concreto_mezcla,
    'Cant. Concreto': Number(r.concreto_cantidad) || 0,
    'Precio Concreto': r.concreto_precio,
    'Lista Concreto': r.concreto_lista,
    '% Concreto': r.concreto_pct,
    'Total Concreto': Number(r.concreto_total) || 0,
    'Servicio': r.servicio_nombre,
    'Cant. Servicio': r.servicio_cantidad,
    'Precio Servicio': r.servicio_precio,
    'Lista Servicio': r.servicio_lista,
    '% Servicio': r.servicio_pct,
    'Total Servicio': r.servicio_total,
    'Aditivo': r.aditivo_nombre,
    'Cant. Aditivo': r.aditivo_cantidad,
    'Precio Aditivo': r.aditivo_precio,
    'Lista Aditivo': r.aditivo_lista,
    '% Aditivo': r.aditivo_pct,
    'Total Aditivo': r.aditivo_total,
    'Recargo': r.recargo_nombre,
    'Cant. Recargo': r.recargo_cantidad,
    'Precio Recargo': r.recargo_precio,
    'Lista Recargo': r.recargo_lista,
    '% Recargo': r.recargo_pct,
    'Total Recargo': r.recargo_total,
    'Subtotal': Number(r.subtotal) || 0,
    'Impuestos': r.impuestos,
  }
}

/** Cabeceras fijas que definen el orden de columnas en la tabla de concreto */
const HEADERS = [
  'Fecha', 'Planta', 'Remisión', 'Facturado', 'Código',
  'Cliente', 'Proyecto', 'Frente', 'Comercial', 'Elemento',
  'Mixer', 'Conductor', 'Precinto', 'Mezcla',
  'Cant. Concreto', 'Precio Concreto', 'Lista Concreto', '% Concreto', 'Total Concreto',
  'Servicio', 'Cant. Servicio', 'Precio Servicio', 'Lista Servicio', '% Servicio', 'Total Servicio',
  'Aditivo', 'Cant. Aditivo', 'Precio Aditivo', 'Lista Aditivo', '% Aditivo', 'Total Aditivo',
  'Recargo', 'Cant. Recargo', 'Precio Recargo', 'Lista Recargo', '% Recargo', 'Total Recargo',
  'Subtotal', 'Impuestos',
]

/** Obtiene datos de concreto desde el endpoint /api/concreto/data con autenticación JWT */
async function fetchConcretoData() {
  const token = useAuthStore().accessToken
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/concreto/data', { headers })
  if (!res.ok) throw new Error(`Concreto API: ${res.status}`)
  return res.json()
}

/** Store de concreto premezclado — datos combinados de order_price y order_detail */
export const useConcretoStore = defineStore('concreto', () => {
  /** Datos combinados en formato SheetData (incluye columna Horario) */
  const data = shallowRef<SheetData | null>(null)
  /** Indicador de carga en progreso */
  const loading = ref(false)
  /** Mensaje de error si la carga falla */
  const error = ref<string | null>(null)
  /** Timestamp de la última generación de datos desde la API */
  const lastUpdate = ref<string | null>(null)

  /** Carga datos combinados de order_price + order_detail con horario extraído */
  async function fetchData() {
    loading.value = true; error.value = null
    try {
      const result = await fetchConcretoData()
      const allPrice = result.price || []
      const allDetail = result.detail || []

      lastUpdate.value = result.generado || null

      // Extrae horario, bomba, operario de cada remisión desde la tabla de detalle
      const hourMap = new Map<string, number>()
      const bombaMap = new Map<string, string>()
      const operarioMap = new Map<string, string>()
      for (const d of allDetail) {
        const rem = String(d.remision)
        if (d.tiempos_hphora_programada && d.remision) {
          const h = parseInt(String(d.tiempos_hphora_programada).slice(0, 2), 10)
          if (!isNaN(h)) hourMap.set(rem, h)
        }
        if (d.bomba) bombaMap.set(rem, String(d.bomba))
        if (d.operario) operarioMap.set(rem, String(d.operario))
      }

      data.value = {
        headers: [...HEADERS, 'Horario', 'Bomba', 'Operario'],
        rows: allPrice.map((r: any) => ({
          ...mapRow(r),
          Horario: hourMap.get(String(r.remision)) ?? '',
          Bomba: bombaMap.get(String(r.remision)) ?? '',
          Operario: operarioMap.get(String(r.remision)) ?? '',
        })),
        total: result.count || allPrice.length,
      }
    } catch (e: any) { console.error('[concreto-store]', e); error.value = e.message }
    finally { loading.value = false }
  }

  return { data, loading, error, lastUpdate, fetchData }
})
