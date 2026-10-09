import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { cargarConCache } from './api'
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
    'Condición Comercial': r.condicion_comercial,
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
    'Otros': r.otros_concepto,
    'Cant. Otros': r.otros_cantidad,
    'Precio Otros': r.otros_precio,
    'Lista Otros': r.otros_lista,
    '% Otros': r.otros_pct,
    'Total Otros': r.otros_total,
    'Subtotal': Number(r.subtotal) || 0,
    'Impuestos': r.impuestos,
  }
}

/** Cabeceras fijas que definen el orden de columnas en la tabla de concreto */
const HEADERS = [
  'Fecha', 'Planta', 'Remisión', 'Facturado', 'Código',
  'Cliente', 'Proyecto', 'Frente', 'Comercial', 'Condición Comercial', 'Elemento',
  'Mixer', 'Conductor', 'Precinto', 'Mezcla',
  'Cant. Concreto', 'Precio Concreto', 'Lista Concreto', '% Concreto', 'Total Concreto',
  'Servicio', 'Cant. Servicio', 'Precio Servicio', 'Lista Servicio', '% Servicio', 'Total Servicio',
  'Aditivo', 'Cant. Aditivo', 'Precio Aditivo', 'Lista Aditivo', '% Aditivo', 'Total Aditivo',
  'Recargo', 'Cant. Recargo', 'Precio Recargo', 'Lista Recargo', '% Recargo', 'Total Recargo',
  'Otros', 'Cant. Otros', 'Precio Otros', 'Lista Otros', '% Otros', 'Total Otros',
  'Subtotal', 'Impuestos',
]

/** Columnas que vienen de order_detail: pedido y horas del viaje del mixer */
const DETALLE_VIAJE = ['Pedido', 'Hora Programada', 'Inicio Cargue', 'Fin Cargue', 'Salida Planta', 'Llegada Obra', 'Salida Obra', 'Llegada Planta']

/** Store de concreto premezclado — datos combinados de order_price y order_detail */
export const useConcretoStore = defineStore('concreto', () => {
  /** Datos combinados en formato SheetData (incluye columna Horario) */
  const data = shallowRef<SheetData | null>(null)
  /** Viajes cancelados o reubicados (filas tipo hoja, como `data.rows`) */
  const cancelados = shallowRef<Record<string, unknown>[]>([])
  /** Indicador de carga en progreso */
  const loading = ref(false)
  /** Mensaje de error si la carga falla */
  const error = ref<string | null>(null)
  /** Timestamp de la última generación de datos desde la API */
  const lastUpdate = ref<string | null>(null)

  /** Combina order_price + order_detail: horario, bomba y operario de cada remisión */
  function aplicar(result: { price?: any[]; detail?: any[]; cancelados?: any[]; count?: number; generado?: string }) {
    const allPrice = result.price || []
    // Viajes cancelados o reubicados (order_detail con estado «Cancelado»), con las mismas columnas que usan los filtros
    cancelados.value = (result.cancelados || []).map((d: any) => ({
      'Fecha': dateToSerial(d.fecha), 'Planta': d.planta, 'Remisión': Number(d.remision) || 0, 'Pedido': d.no_de_pedido ? String(d.no_de_pedido) : '',
      'Cliente': d.cliente, 'Proyecto': d.obra, 'Comercial': d.comercial, 'Mixer': d.mixer, 'Conductor': d.conductor,
      'Mezcla': d.concreto_mezcla, 'Cant. Concreto': Number(d.concreto_cantidad) || 0, 'Observaciones': d.observaciones ?? '',
    }))
    const allDetail = result.detail || []
    lastUpdate.value = result.generado || null

    const hourMap = new Map<string, number>()
    const bombaMap = new Map<string, string>()
    const operarioMap = new Map<string, string>()
    const detMap = new Map<string, Record<string, string>>()
    const hhmm = (v: unknown) => (v ? String(v).slice(0, 5) : '')
    for (const d of allDetail) {
      const rem = String(d.remision)
      if (d.tiempos_hphora_programada && d.remision) {
        const h = parseInt(String(d.tiempos_hphora_programada).slice(0, 2), 10)
        if (!isNaN(h)) hourMap.set(rem, h)
      }
      if (d.bomba) bombaMap.set(rem, String(d.bomba))
      if (d.operario) operarioMap.set(rem, String(d.operario))
      // Pedido y horas del viaje (HH:MM) para las tablas de comerciales, conductores y bombeo
      detMap.set(rem, {
        'Pedido': d.no_de_pedido ? String(d.no_de_pedido) : '',
        'Hora Programada': hhmm(d.tiempos_hphora_programada),
        'Inicio Cargue': hhmm(d.tiempos_icinicio_de_cargue),
        'Fin Cargue': hhmm(d.tiempos_fcfin_de_cargue),
        'Salida Planta': hhmm(d.tiempos_spsalida_de_planta),
        'Llegada Obra': hhmm(d.tiempos_llollegada_a_obra),
        'Salida Obra': hhmm(d.tiempos_sosalida_de_obra),
        'Llegada Planta': hhmm(d.tiempos_llpllegada_a_planta),
      })
    }

    data.value = {
      headers: [...HEADERS, 'Horario', 'Bomba', 'Operario', ...DETALLE_VIAJE],
      rows: allPrice.map((r: any) => ({
        ...mapRow(r),
        Horario: hourMap.get(String(r.remision)) ?? '',
        Bomba: bombaMap.get(String(r.remision)) ?? '',
        Operario: operarioMap.get(String(r.remision)) ?? '',
        ...(detMap.get(String(r.remision)) ?? {}),
      })),
      total: result.count || allPrice.length,
    }
  }

  /** Carga los datos de concreto (copia local al instante + servidor); `force` salta las cachés */
  function fetchData(force = false) {
    return cargarConCache({
      url: `/api/concreto/data${force ? '?force=true' : ''}`, force,
      hayDatos: () => !!data.value, aplicar, limpiar: () => { data.value = null; cancelados.value = [] },
      loading, error, etiqueta: 'concreto-store',
    })
  }

  return { data, cancelados, loading, error, lastUpdate, fetchData }
})
