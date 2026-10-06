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
  /** Unidad real de `cantidad` («sin unidad» ya resuelta): 't' o 'm³'; '' en fletes */
  unidad: 't' | 'm³' | ''
  factor: number
  factorPropio: boolean
  /**
   * t por m³ del material (aunque la línea venga en t); 0 en fletes. m³ equivalentes = toneladas ÷ factorMaterial.
   * Sin conversión (Acacías): 1 en las líneas en m³ y 0 en las líneas en t.
   */
  factorMaterial: number
  /** Cantidad de reporte: t en Cuncía (m³ × densidad); m³ en Acacías, sin convertir (0 en sus líneas en t). 0 en fletes */
  toneladas: number
  total: number
  cliente: string
  nit: string
  placa: string
  ficha: string
  tituloMinero: string
  /** Traslados: bodega a la que va el material (B15…B20 = plantas de Concretos); vacío si no aplica */
  bodegaDestino: string
}

export interface DatosFacturacion {
  planta: 'cuncia' | 'acacias'
  sucursal: string
  /** false en Acacías: no se convierte con densidades (`toneladas` son m³ y lo registrado en t va aparte) */
  convierte?: boolean
  /** Unidad de `toneladas`: 't' (Cuncía) o 'm³' (Acacías) */
  unidadReporte?: 't' | 'm³'
  archivo: { nombre: string; modificado: string | null }
  actualizado: string
  subtipos: Record<string, string>
  lineas: LineaFacturacion[]
}
