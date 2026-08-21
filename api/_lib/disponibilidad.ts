import { getSheetData } from './sheets.js'
import { SPREADSHEETS } from './google.js'

export async function loadDisponibilidadData(planta: string, forceRefresh = false) {
  let placas: Record<string, unknown>[] = []
  let tareas: Record<string, unknown>[] = []
  let resumen: Record<string, unknown>[] = []

  const p = planta.toLowerCase()
  const key = `ordenes_ot_${p}`
  const maestroKey = `maestro_${p}`

  try {
    const spreadsheetId = SPREADSHEETS[key]
    if (spreadsheetId) {
      // 1. Cargar las hojas oficiales de Disponibilidad directamente del spreadsheet de la planta
      const [placasSheet, tareasSheet, resumenSheet] = await Promise.all([
        getSheetData(key, 'Reporte Placa Disponibilidad', forceRefresh).catch(() => ({ rows: [] })),
        getSheetData(key, 'Tareas Seguimiento', forceRefresh).catch(() => ({ rows: [] })),
        getSheetData(key, 'Resumen Diario Disponibilidad', forceRefresh).catch(() => ({ rows: [] })),
      ])

      // 2. Cargar Maestro para enriquecer datos de maquinaria (Localización, tipo, etc.)
      let plantasMaq = { rows: [] as Record<string, unknown>[] }
      try {
        if (SPREADSHEETS[maestroKey]) {
          plantasMaq = await getSheetData(maestroKey, 'Plantas/Maquinaria', forceRefresh)
        }
      } catch {}

      const maestroMap = new Map<string, Record<string, unknown>>()
      for (const m of plantasMaq.rows) {
        const id = String(m['Id_Registro'] ?? '').trim()
        const placa = String(m['PLACA'] ?? '').trim()
        if (id) maestroMap.set(id, m)
        if (placa) maestroMap.set(placa, m)
      }

      // 3. Normalizar y enriquecer las filas de Reporte Placa Disponibilidad
      placas = placasSheet.rows.map(r => {
        const idRef = String(r['Placa'] ?? '').trim()
        const placaTexto = String(r['Placa_Texto'] ?? '').trim()
        const maestro = maestroMap.get(idRef) || maestroMap.get(placaTexto) || maestroMap.get(idRef.toUpperCase()) || maestroMap.get(placaTexto.toUpperCase()) || {}

        const rawLoc = String(
          r['Localizacion'] ||
          r['Localización'] ||
          r['Ubicacion'] ||
          r['Ubicación'] ||
          maestro['Localizacion'] ||
          maestro['Localización'] ||
          maestro['LOCALIZACION'] ||
          maestro['LOCALIZACIÓN'] ||
          maestro['Ubicacion'] ||
          maestro['Ubicación'] ||
          maestro['Área de Trabajo'] ||
          maestro['Area de Trabajo'] ||
          'Planta'
        ).trim()

        const finalPlacaTexto = placaTexto || String(maestro['PLACA'] ?? idRef)
        const finalTipo = String(r['Tipo de Vehiculos'] || maestro['TIPO'] || 'MAQUINARIA').trim()

        return {
          ...r,
          Placa_Texto: finalPlacaTexto,
          'Tipo de Vehiculos': finalTipo,
          Localizacion: rawLoc,
          Supervisor: r['Supervisor_Texto'] || r['Supervisor'] || '—',
          Proveedor_Texto: r['Proveedor_Texto'] || r['Proveedor'] || '',
        }
      })

      tareas = tareasSheet.rows
      resumen = resumenSheet.rows
    }
  } catch (e) {
    console.error('[disponibilidad-load]', e)
  }

  return {
    placas,
    tareas,
    resumen,
    totalPlacas: placas.length,
    totalTareas: tareas.length,
    planta: p,
  }
}
