/**
 * plantas.ts — Configuración única de cada planta: nombre, módulos disponibles y,
 * para agregados, las líneas de producción. Las vistas y las rutas se arman desde aquí;
 * agregar una planta o un módulo no requiere copiar vistas.
 */
import type { PlantConfig } from '../views/agregados/ResumenTab.vue'

export type PlantaId = 'cuncia' | 'acacias' | 'concretos'
export type ModuloId = 'produccion' | 'facturacion' | 'programacion' | 'mantenimiento'

export interface Planta {
  id: PlantaId
  nombre: string
  negocio: 'Agregados' | 'Concretos'
  modulos: { id: ModuloId; label: string }[]
  /** Solo agregados: líneas de producción (columnas de la hoja diaria) */
  produccion?: PlantConfig
}

const PALETA_AGREGADOS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export const PLANTAS: Record<PlantaId, Planta> = {
  cuncia: {
    id: 'cuncia',
    nombre: 'Cuncía',
    negocio: 'Agregados',
    modulos: [
      { id: 'produccion', label: 'Producción' },
      { id: 'facturacion', label: 'Facturación' },
      { id: 'programacion', label: 'Programación' },
      { id: 'mantenimiento', label: 'Mantenimiento' },
    ],
    produccion: {
      plantName: 'Cuncia',
      lineLabel: 'Línea',
      // key = columna de la hoja; label = encabezado mostrado
      lines: [
        { key: 'Cañaveral', label: 'Cañaveral' },
        { key: 'Guayuriba', label: 'Guayuriba' },
        { key: 'Linea 3', label: 'Línea 3' },
      ],
      palette: PALETA_AGREGADOS,
    },
  },
  acacias: {
    id: 'acacias',
    nombre: 'Acacías',
    negocio: 'Agregados',
    modulos: [
      { id: 'produccion', label: 'Producción' },
      { id: 'facturacion', label: 'Facturación' },
      { id: 'programacion', label: 'Programación' },
      { id: 'mantenimiento', label: 'Mantenimiento' },
    ],
    produccion: {
      plantName: 'Acacias',
      lineLabel: 'Planta',
      lines: [
        { key: 'Planta 1', label: 'Planta 1' },
        { key: 'Planta 2', label: 'Planta 2' },
      ],
      palette: PALETA_AGREGADOS,
    },
  },
  concretos: {
    id: 'concretos',
    nombre: 'Concretos',
    negocio: 'Concretos',
    modulos: [
      { id: 'produccion', label: 'Producción' },
      { id: 'mantenimiento', label: 'Mantenimiento' },
    ],
  },
}

export const PLANTAS_AGREGADOS = ['cuncia', 'acacias'] as const

// ── Segmentos de ruta válidos (se usan en las rutas y en las vistas) ──

/** Vistas de producción de agregados: /cuncia/produccion/:vista */
export const VISTAS_PRODUCCION_AGREGADOS = [
  { id: 'graficas', label: 'Gráficas' },
  { id: 'detalles', label: 'Detalles' },
  { id: 'informe', label: 'Informe' },
] as const

/** Secciones y vistas de producción de concretos: /concretos/produccion/:seccion/:vista */
export const SECCIONES_CONCRETOS = [
  { id: 'planta', label: 'Producción Planta' },
  { id: 'proyeccion', label: 'Proyección Comercial' },
] as const
export const VISTAS_CONCRETOS = [
  { id: 'graficas', label: 'Gráficas' },
  { id: 'informe', label: 'Informe' },
] as const

/** Facturación de agregados (Novasoft): /:planta/facturacion/:vista */
export const VISTAS_FACTURACION = [
  { id: 'graficas', label: 'Gráficas' },
  { id: 'detalle', label: 'Detalle' },
  { id: 'informe', label: 'Informe' },
  { id: 'balance', label: 'Producción vs Facturación' },
] as const

/** Programación de agregados: /cuncia/programacion/:empresa */
export const EMPRESAS_PROGRAMACION = ['gravicon', 'cliente'] as const
