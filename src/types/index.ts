/** Metadatos del período de datos mostrado en el dashboard */
export interface MetaInfo {
  /** Fecha del primer registro disponible */
  fechaInicio: string
  /** Fecha del último registro disponible */
  fechaFin: string
  /** Marca de tiempo de la última actualización */
  lastUpdate?: string
  /** Período descriptivo (ej. "Ene 2024") */
  periodo?: string
  /** Lista de meses disponibles para filtro (YYYY-MM) */
  availableMonths?: string[]
}

/** Datos operativos desglosados para una planta específica */
export interface PlantOpData {
  /** Volumen y viajes por día */
  diario: { fecha: string; volDespachado: number; despachos: number }[]
  /** Distribución horaria (04:00 — 18:00) */
  horario: { hora: number; label: string; volDespachado: number; despachos: number }[]
  /** Resumen semanal con clientes activos y promedio por despacho */
  semanal: {
    semana: number; label: string; volDespachado: number; despachos: number
    clientesActivos: number; promDespacho: number
  }[]
  /** Comportamiento por día de la semana */
  diaSemana: { dia: string; diaNum: number; volDespachado: number; despachos: number; promVol: number }[]
  /** Indicadores clave de operación */
  kpis: {
    totalVol: number; despachos: number; clientes: number; obras: number
    promDespacho: number; diasOp: number; pctBombeo: number
  }
}

/** Datos completos del dashboard de concreto, agregados por planta, cliente, obra y más */
export interface DashboardData {
  /** Indicadores globales del período */
  kpis: {
    totalDespachos: number
    totalVolProgramado: number
    totalVolDespachado: number
    totalCancelado: number
    cumplimiento: number
    volPromDespacho: number
    clientesUnicos: number
    obrasActivas: number
    diasOperacion: number
    mixersActivos: number
    despachosConBombeo: number
    pctBombeo: number
    volBajoCO2: number
  }
  /** Resumen por planta */
  plantas: {
    planta: string
    despachos: number
    volProgramado: number
    volDespachado: number
    promDespacho: number
    clientesUnicos: number
    obrasActivas: number
    pctBombeo: number
  }[]
  /** Ranking de clientes por volumen despachado */
  clientes: {
    cliente: string
    volDespachado: number
    despachos: number
    plantas: string[]
    obras: number
    promDespacho: number
    pctBombeo: number
  }[]
  /** Desglose por tipo de mezcla/elemento */
  elementos: { elemento: string; volDespachado: number; despachos: number; pctTotal: number }[]
  /** Desglose por obra o frente de trabajo */
  obras: { obra: string; volDespachado: number; despachos: number; cliente: string; planta: string }[]
  /** Ranking de mixers por volumen y viajes */
  mixers: { mixer: string; volDespachado: number; viajes: number; promCarga: number }[]
  /** Desempeño de bombas de concreto */
  bombas: { bomba: string; volBombeado: number; servicios: number; operario?: string; bombeos?: number; volPorBombeo?: number }[]
  /** Rendimiento por conductor */
  conductores: { conductor: string; viajes: number; volTransportado: number }[]
  /** Distribución por resistencia del concreto (MPa) */
  resistencias: { resistencia: string; valor: number; volDespachado: number; despachos: number }[]
  /** Comparación con/sin bombeo por planta */
  bombeoPorPlanta: { planta: string; conBombeo: number; sinBombeo: number }[]
  /** Clientes desglosados por planta */
  clientesPorPlanta: {
    Acacias: { cliente: string; volDespachado: number; despachos: number }[]
    Restrepo: { cliente: string; volDespachado: number; despachos: number }[]
    Villavicencio: { cliente: string; volDespachado: number; despachos: number }[]
  }
  /** Tendencia semanal apilada por planta */
  semanalStacked: { semana: string; Acacias: number; Restrepo: number; Villavicencio: number }[]
  /** Metadatos del período de datos */
  meta: MetaInfo
  /** Datos agregados de material de arrastre (extraídos por separado) */
  agg?: {
    kpis: {
      totalVol: number
      despachos: number
      clientes: number
      promDespacho: number
    }
    clientes: { cliente: string; volDespachado: number; despachos: number }[]
    semanal: { semana: number; label: string; volDespachado: number; despachos: number }[]
    mezclas: { mezcla: string; volDespachado: number; despachos: number; pct: number }[]
  }
}