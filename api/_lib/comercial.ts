import { getSupabaseAdmin } from './auth-helpers.js'
import { loadFacturacion, SUCURSALES, type PlantaFacturacion } from './facturacion.js'

/**
 * comercial.ts — Datos del módulo Comercial: cotizaciones (leads), ofertas F227 y las compras de esos
 * clientes para el embudo posible cliente → oferta → aprobada → F227 → compra.
 *
 * - Leads: posibles_clientes_leads (+ líneas de concreto y de agregados). Hay leads de Concretos, de Agregados
 *   y duales («Concretos y Agregados»).
 * - F227: m_dulo_f227 (+ líneas de concreto). Oferta formal de concreto.
 * - Compras de concreto: order_detail (remisiones no canceladas) con el valor de order_price (por remisión).
 * - Compras de agregados: facturación Novasoft de Cuncía y Acacías (solo ventas). Si el archivo de Drive no se
 *   puede leer, el embudo de agregados queda sin la etapa de compra y se avisa (`avisos`).
 *
 * Las compras viajan agregadas por cliente (NIT normalizado) y día, en listas para no inflar la respuesta.
 * Los id_registro de Zoho pasan de 2^53: se piden como texto para no perder dígitos en JSON.
 */

/** NIT sin dígito de verificación ni puntuación: «900.123.456-7» → «900123456» */
export const normNit = (v: unknown) => String(v ?? '').split('-')[0].replace(/\D/g, '')

const LIMITE = 100000

export interface DatosComercial {
  leads: Record<string, unknown>[]
  leadsConcreto: Record<string, unknown>[]
  leadsAgregados: Record<string, unknown>[]
  f227: Record<string, unknown>[]
  f227Concreto: Record<string, unknown>[]
  /** [nit, fecha YYYY-MM-DD, m³, viajes, valor] por cliente y día */
  comprasConcreto: [string, string, number, number, number][]
  /** [nit, fecha YYYY-MM-DD, planta, valor] por cliente, día y planta; null si no se pudo leer la facturación */
  comprasAgregados: [string, string, PlantaFacturacion, number][] | null
  /** Nombre del cliente en las compras, por NIT (para mostrar y para el cruce por nombre) */
  nombres: Record<string, string>
  avisos: string[]
  actualizado: string
}

export async function loadComercial(force = false): Promise<DatosComercial> {
  const sb = getSupabaseAdmin() as any
  const [leads, leadsC, leadsA, f227, f227C, detalle, precios] = await Promise.all([
    sb.from('posibles_clientes_leads').select('id:id_registro::text,company,full_name,city,departamento,nit_cedula,planta,industria,' +
      'fecha_de_solicitud,fecha_envio_oferta,fecha_de_aprobacion,version,forma_de_pago,valor_total_de_la_factura_c,valor_total_de_la_factura_a,' +
      'representante_nombre').limit(LIMITE),
    sb.from('posibles_clientes_leads_productos_concretos').select('id:id_registro::text,serial_number,codigo,descripcion,cantidad_m3,valor_unitario,subtotal').limit(LIMITE),
    sb.from('posibles_clientes_leads_productos_agregados').select('id:id_registro::text,serial_number,material,medida,cantidad,valor_unitario').limit(LIMITE),
    sb.from('m_dulo_f227').select('id:id_registro::text,planta_de_concreto,name,consecutivo,consecutivo_manual,version,nit_o_cedula,ciudad,departamento,' +
      'distancia_km,canal_cliente,fecha_de_solicitud,fecha_envio_oferta,bombeo,segmento_del_cliente,fecha_de_aprobacion,observaciones_motivo_no_aprobacion,' +
      'porcentaje_de_iva,forma_de_pago,estado_f227,nombre_del_cliente,obra_del_cliente,representante_nombre').limit(LIMITE),
    sb.from('m_dulo_f227_productos_concretos').select('id:id_registro::text,serial_number,codigo,descripcion,cantidad_m3,valor_unitario,subtotal').limit(LIMITE),
    sb.from('order_detail').select('remision,identificacion,cliente,fecha,concreto_cantidad').neq('estado', 'Cancelado').limit(LIMITE),
    sb.from('order_price').select('remision,subtotal').limit(LIMITE),
  ])
  for (const r of [leads, leadsC, leadsA, f227, f227C, detalle, precios]) if (r.error) throw r.error

  const nombres: Record<string, string> = {}

  // Concreto: valor de cada remisión (order_price) sumado a su despacho (order_detail), por cliente y día
  const valorRemision = new Map<string, number>()
  for (const p of precios.data ?? []) valorRemision.set(String(p.remision), (valorRemision.get(String(p.remision)) ?? 0) + (Number(p.subtotal) || 0))
  const porDia = new Map<string, [string, string, number, number, number]>()
  for (const d of detalle.data ?? []) {
    const nit = normNit(d.identificacion)
    const fecha = String(d.fecha ?? '').slice(0, 10)
    if (!nit || !fecha) continue
    if (!nombres[nit] && d.cliente) nombres[nit] = String(d.cliente).trim()
    const k = `${nit}|${fecha}`
    const fila = porDia.get(k) ?? [nit, fecha, 0, 0, 0]
    fila[2] += Number(d.concreto_cantidad) || 0
    fila[3] += 1
    fila[4] += valorRemision.get(String(d.remision)) ?? 0
    porDia.set(k, fila)
  }
  const comprasConcreto = [...porDia.values()].map(f => [f[0], f[1], Math.round(f[2] * 100) / 100, f[3], Math.round(f[4])] as typeof f)

  // Agregados: ventas de Novasoft de las dos plantas (el archivo se descarga una vez para ambas)
  const avisos: string[] = []
  let comprasAgregados: DatosComercial['comprasAgregados'] = null
  try {
    const porDiaA = new Map<string, [string, string, PlantaFacturacion, number]>()
    for (const [i, planta] of (Object.keys(SUCURSALES) as PlantaFacturacion[]).entries()) {
      // Con «Actualizar» se descarga de nuevo solo para la primera planta; la segunda usa esa misma descarga
      const fac = await loadFacturacion(planta, force && i === 0)
      for (const l of fac.lineas) {
        if (l.tipo !== 'venta') continue
        const nit = normNit(l.nit)
        if (!nit) continue
        if (!nombres[nit] && l.cliente) nombres[nit] = l.cliente
        const k = `${nit}|${l.fecha}|${planta}`
        const fila = porDiaA.get(k) ?? [nit, l.fecha, planta, 0]
        fila[3] += l.total
        porDiaA.set(k, fila)
      }
    }
    comprasAgregados = [...porDiaA.values()].map(f => [f[0], f[1], f[2], Math.round(f[3])] as typeof f)
  } catch (err: any) {
    console.error('[comercial] facturación de agregados', err?.message ?? err)
    avisos.push('No se pudo leer la facturación de agregados (Novasoft): el embudo de agregados no muestra compras.')
  }

  return {
    leads: leads.data ?? [], leadsConcreto: leadsC.data ?? [], leadsAgregados: leadsA.data ?? [],
    f227: f227.data ?? [], f227Concreto: f227C.data ?? [],
    comprasConcreto, comprasAgregados, nombres, avisos,
    actualizado: new Date().toISOString(),
  }
}
