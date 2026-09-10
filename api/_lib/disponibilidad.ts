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
      // 1. Cargar las 3 hojas oficiales + maestro en paralelo (antes eran 2/3 waterfall stages → ~400-600ms extra)
      const plantasMaqPromise = SPREADSHEETS[maestroKey]
        ? getSheetData(maestroKey, 'Plantas/Maquinaria', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] }))
        : Promise.resolve({ rows: [] as Record<string, unknown>[] })
      const personalPromise = p === 'cuncia' && SPREADSHEETS[maestroKey]
        ? getSheetData(maestroKey, 'GRAVICON_INTERNO_OT', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] }))
        : Promise.resolve({ rows: [] as Record<string, unknown>[] })
      const proveedoresPromise = SPREADSHEETS[maestroKey]
        ? getSheetData(maestroKey, 'PROVEEDORES_OT', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] }))
        : Promise.resolve({ rows: [] as Record<string, unknown>[] })

      const [placasSheet, tareasSheet, resumenSheet, plantasMaq, personalSheet, proveedoresSheet] = await Promise.all([
        getSheetData(key, 'Reporte Placa Disponibilidad', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] })),
        getSheetData(key, 'Tareas Seguimiento', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] })),
        getSheetData(key, 'Resumen Diario Disponibilidad', forceRefresh).catch(() => ({ rows: [] as Record<string, unknown>[] })),
        plantasMaqPromise,
        personalPromise,
        proveedoresPromise,
      ])

      // Maestro de proveedores: Id_Registro → Nombre_Proveedor (misma hoja que usan las OT)
      const proveedoresMap = new Map<string, string>()
      for (const r of proveedoresSheet.rows) {
        const id = String(r['Id_Registro'] ?? '').trim()
        const nombre = String(r['Nombre_Proveedor'] ?? '').trim()
        if (id && nombre) {
          proveedoresMap.set(id, nombre)
          proveedoresMap.set(id.toUpperCase(), nombre)
        }
      }

      const maestroMap = new Map<string, Record<string, unknown>>()
      for (const m of plantasMaq.rows) {
        const id = String(m['Id_Registro'] ?? '').trim()
        const placa = String(m['PLACA'] ?? '').trim()
        if (id) maestroMap.set(id, m)
        if (placa) maestroMap.set(placa, m)
      }

      tareas = tareasSheet.rows
      resumen = resumenSheet.rows

      // 2b. Enriquecer tareas: resolver Placa ID → Placa_Texto usando maestroMap
      for (const t of tareas) {
        const idRef = String(t['Placa'] ?? t['PLACA'] ?? '').trim()
        const placaTexto = String(t['Placa_Texto'] ?? '').trim()
        const maestro = maestroMap.get(idRef) || maestroMap.get(placaTexto) || maestroMap.get(idRef.toUpperCase()) || maestroMap.get(placaTexto.toUpperCase()) || {}
        const resolvedPlaca = placaTexto || String(maestro['PLACA'] ?? maestro['Placa_Texto'] ?? '')
        if (resolvedPlaca) {
          t['Placa_Texto'] = resolvedPlaca
        }
      }

      // 2c. Resolver IDs de Responsable → nombre via GRAVICON_INTERNO_OT (solo Cuncía, ya cargado en paralelo)
      if (p === 'cuncia' && personalSheet.rows.length > 0) {
        const personalMap = new Map<string, string>()
        for (const r of personalSheet.rows) {
          const id = String(r['Id_Registro'] ?? '').trim()
          const nombre = String(r['Nombre_Proveedor'] ?? '').trim()
          if (id && nombre) personalMap.set(id, nombre)
        }
        // Enriquecer tareas: resolver Responsable ID → nombre
        for (const t of tareas) {
          const respId = String(t['Responsable'] ?? '').trim()
          if (respId && personalMap.has(respId)) {
            t['Nombre_Responsable'] = personalMap.get(respId)
          }
        }
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

        // Proveedor: la hoja de disponibilidad guarda el ID (ej. PROV-003). Se resuelve al
        // mismo Nombre_Proveedor que usan las OT para que el filtro de Proveedor haga match.
        const provIdRaw = String(r['Proveedor'] ?? r['Proveedor_ID'] ?? r['PROVEEDOR'] ?? '').trim()
        const provTextoRaw = String(r['Proveedor_Texto'] ?? '').trim()
        const provNombre = provTextoRaw
          || proveedoresMap.get(provIdRaw)
          || proveedoresMap.get(provIdRaw.toUpperCase())
          || provIdRaw

        const finalPlacaTexto = placaTexto || String(maestro['PLACA'] ?? idRef)
        const finalTipo = String(r['Tipo de Vehiculos'] || maestro['TIPO'] || 'MAQUINARIA').trim()
        // Área de Trabajo del maestro: PLANTA | MAQUINARIA | DUAL — clasifica el activo
        const areaTrabajo = String(
          maestro['Área de Trabajo'] || maestro['Area de Trabajo'] || maestro['AREA DE TRABAJO'] || ''
        ).trim()

        return {
          ...r,
          Placa_Texto: finalPlacaTexto,
          'Tipo de Vehiculos': finalTipo,
          'Área de Trabajo': areaTrabajo,
          Localizacion: rawLoc,
          Supervisor: r['Supervisor_Texto'] || r['Supervisor'] || '—',
          Proveedor_ID: provIdRaw,
          Proveedor_Texto: provNombre,
        }
      })
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
