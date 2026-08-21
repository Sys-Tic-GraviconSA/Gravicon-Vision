/** Convierte un serial numérico de Excel a objeto Date */
export function serialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000)
}

/** Convierte una fecha ISO (YYYY-MM-DD) a serial numérico de Excel */
export function dateToSerial(iso: string): number {
  if (!iso) return 0
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000 + 25569
}

/** Obtiene el número de semana del año desde un serial Excel */
export function getWeekNumber(serial: number): number {
  const d = serialToDate(serial)
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}


