/**
 * Tipos de la facturación de agregados (respuesta de /api/facturacion-agregados/data).
 * Reflejan api/_lib/facturacion.ts; las toneladas, familia y tipo ya vienen calculados del servidor.
 */
export type TipoLinea = 'venta' | 'donacion' | 'traslado'
export type Familia = 'Arena' | 'Grava' | 'Base y sub-base' | 'Material de río' | 'Piedra y otros' | 'Fletes'

export interface LineaFacturacion {
  fecha: string
  subtipo: string
  tipo: TipoLinea
  doc: string
  item: string
  descripcion: string
  familia: Familia
  producto: string
  registrado: 't' | 'm³' | 'sin unidad' | 'servicio'
  cantidad: number
  factor: number
  factorPropio: boolean
  /** t por m³ del material (aunque la línea venga en t); 0 en fletes. m³ equivalentes = toneladas ÷ factorMaterial */
  factorMaterial: number
  toneladas: number
  total: number
  cliente: string
  nit: string
  placa: string
  ficha: string
  tituloMinero: string
}

export interface DatosFacturacion {
  planta: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  actualizado: string
  subtipos: Record<string, string>
  lineas: LineaFacturacion[]
}
