/** Variables del desempeño mensual por placa (mapa de calor de la flota de Concretos). */
export type VariableFlota =
  | 'viajes' | 'm3' | 'disp' | 'taller' | 'mant' | 'mantM3' | 'comb' | 'gal'
  | 'combM3' | 'costoGal' | 'galHr' | 'hrGal' | 'total' | 'totalM3'

/** Una placa en un mes. `null` = no hay registro de esa fuente («sin dato»), distinto de 0. */
export interface FilaFlota {
  placa: string
  /** YYYY-MM */
  mes: string
  tipo: string
  valores: Record<VariableFlota, number | null>
}
