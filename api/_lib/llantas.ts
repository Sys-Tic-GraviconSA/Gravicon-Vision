import { getSheetData } from './sheets.js'

/**
 * Construye los datos de gestión de llantas (FleetControl_Llantas) para el
 * dashboard e informe. Enlaza, por ID, el inventario con sus inspecciones y el
 * detalle llanta a llanta — mismo patrón que buildMantenimientoOtRows (OT ↔ Sub_OT).
 *
 *   Inventario_Llantas.Id_registro  ─┐
 *   Sub_Inspec_Llantas.Id_Llanta  ───┘  (una llanta puede tener N sub-inspecciones)
 *   Sub_Inspec_Llantas.Id_Inspec_Llantas  →  Inspec_Llantas.Id_registro
 *
 * Compartido entre la API serverless (Vercel) y la ruta Express para que dev y
 * prod se comporten igual.
 */

/** Convierte "10,9" / "10.9" / 10.9 a número; vacío → 0. */
function num(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).trim()
  // formato es-CO: "1.234,5" → 1234.5 ; pero "10,9" → 10.9 y "10.9" → 10.9
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s)
  return isNaN(n) ? 0 : n
}
function txt(v: unknown): string {
  return v == null ? '' : String(v).trim()
}
/** Serial de fecha (o el valor crudo si ya es texto legible). */
function fechaSort(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export interface LlantasData {
  inventario: Record<string, unknown>[]
  inspecciones: Record<string, unknown>[]
  subInspecciones: Record<string, unknown>[]
  totalInventario: number
  totalInspecciones: number
}

export async function buildLlantasData(forceRefresh = false): Promise<LlantasData> {
  const [invSheet, inspSheet, subInspSheet] = await Promise.all([
    getSheetData('llantas', 'Inventario_Llantas_Concretros', forceRefresh),
    getSheetData('llantas', 'Inspec_Llantas_Concretros', forceRefresh),
    getSheetData('llantas', 'Sub_Inspec_Llantas_Concretros', forceRefresh),
  ])

  // Maestro de equipos (menú): el campo "Placa" del inventario trae el Id_Registro
  // ("EQ/MAQ-035"), no la placa real — se resuelve aquí igual que en las OT.
  let plantasMaquinariaRows: Record<string, unknown>[] = []
  try {
    const res = await getSheetData('maestro_concretos', 'Plantas/Maquinaria', forceRefresh)
    plantasMaquinariaRows = res.rows
  } catch { /* opcional: si falla, se usan los IDs crudos */ }

  interface EquipoInfo { placa: string; vehiculo: string; tipo: string; marca: string; modelo: string; localizacion: string; ejes: number; numLlantas: number }
  const equipoMap = new Map<string, EquipoInfo>()
  for (const r of plantasMaquinariaRows) {
    const id = txt(r['Id_Registro'])
    if (!id) continue
    equipoMap.set(id, {
      placa: txt(r['PLACA']),
      vehiculo: txt(r['VEHICULO']),
      tipo: txt(r['TIPO']),
      marca: txt(r['MARCA']),
      modelo: txt(r['MODELO']),
      localizacion: txt(r['Localizacion']),
      ejes: num(r['Ejes']),
      numLlantas: num(r['Numero de Llantas']),
    })
  }
  const resolvePlaca = (raw: string) => {
    const e = equipoMap.get(txt(raw))
    return e?.placa || raw
  }

  // --- Sub-inspecciones normalizadas + índice por inspección y por llanta ---
  const subInspecciones = subInspSheet.rows.map(r => ({
    'Id': txt(r['Id_registro']),
    'Id Inspección': txt(r['Id_Inspec_Llantas']),
    'Id Llanta': txt(r['Id_Llanta']),
    'Fecha': r['Fecha de registro'] ?? '',
    'Marca': txt(r['Marca']).toUpperCase(),
    'Dimensión': txt(r['Dimensión']),
    'PSI': num(r['PSI']),
    'Prof. Externa': num(r['Prof. externa (Mm)']),
    'Prof. Central': num(r['Prof. central (Mm)']),
    'Prof. Interna': num(r['Prof. interna (Mm)']),
    'Condiciones Irregulares': txt(r['Condiciones irregulares']),
    'Plan de Acción': txt(r['Plan de acción']),
    '_raw': r,
  }))

  const subByInsp = new Map<string, Record<string, unknown>[]>()
  const subByLlanta = new Map<string, Record<string, unknown>[]>()
  for (const s of subInspecciones) {
    if (s['Id Inspección']) {
      if (!subByInsp.has(s['Id Inspección'])) subByInsp.set(s['Id Inspección'], [])
      subByInsp.get(s['Id Inspección'])!.push(s)
    }
    if (s['Id Llanta']) {
      if (!subByLlanta.has(s['Id Llanta'])) subByLlanta.set(s['Id Llanta'], [])
      subByLlanta.get(s['Id Llanta'])!.push(s)
    }
  }

  // --- Inspecciones normalizadas, cada una con sus sub-inspecciones ---
  const inspecciones = inspSheet.rows.map(r => {
    const id = txt(r['Id_registro'])
    return {
      'Id': id,
      'Fecha': r['Fecha de registro'] ?? '',
      'Evaluador': txt(r['Nombre evaluador']),
      'Planta': txt(r['Planta']),
      'Equipo ID': txt(r['Placa']),
      'Placa': resolvePlaca(txt(r['Placa'])).toUpperCase(),
      'Kilometraje': num(r['Kilometraje']),
      '_subInspec': subByInsp.get(id) ?? [],
      '_raw': r,
    }
  })
  const inspById = new Map(inspecciones.map(i => [i['Id'], i]))

  // --- Inventario normalizado, cada llanta con su historial de inspecciones ---
  const inventario = invSheet.rows.map(r => {
    const id = txt(r['Id_registro'])
    const profExt = num(r['Prof. inicial externa (Mm)'])
    const profCen = num(r['Prof. inicial central (Mm)'])
    const profInt = num(r['Prof. inicial interna (Mm)'])
    const profs = [profExt, profCen, profInt].filter(v => v > 0)

    // Historial: cada sub-inspección de esta llanta enriquecida con datos de su inspección padre.
    const historial = (subByLlanta.get(id) ?? [])
      .map(s => {
        const insp = inspById.get(String(s['Id Inspección'] ?? ''))
        return {
          fecha: s['Fecha'] || insp?.['Fecha'] || '',
          evaluador: insp?.['Evaluador'] ?? '',
          kilometraje: insp?.['Kilometraje'] ?? 0,
          psi: s['PSI'],
          profExterna: s['Prof. Externa'],
          profCentral: s['Prof. Central'],
          profInterna: s['Prof. Interna'],
          condiciones: s['Condiciones Irregulares'],
          planAccion: s['Plan de Acción'],
        }
      })
      .sort((a, b) => fechaSort(a.fecha) - fechaSort(b.fecha))

    const ult = historial[historial.length - 1] ?? null
    const profActual = ult
      ? [ult.profExterna, ult.profCentral, ult.profInterna].filter(v => Number(v) > 0).map(Number)
      : profs

    const equipoId = txt(r['Placa'])
    const eq = equipoMap.get(equipoId)

    return {
      'Id': id,
      'Nº Serie': txt(r['No. serie']),
      'Fecha Registro': r['Fecha de registro'] ?? '',
      'Fecha Compra': r['Fecha de Compra'] ?? '',
      'Marca': txt(r['Marca']).toUpperCase(),
      'Modelo': txt(r['Modelo']),
      'Dimensión': txt(r['Dimensión']),
      'DOT': txt(r['Fecha de fabricación (dot)']),
      'Costo Adquisición': num(r['Costo adquisición']),
      'Planta': txt(r['Planta']),
      'Estado': txt(r['Estado de inventario']),
      'Aplicación': txt(r['Tipo de aplicación']),
      'Tipo de Vehículo': (txt(r['Tipo de Vehiculo']) || eq?.tipo || '').toUpperCase(),
      'Equipo ID': equipoId,
      'Placa': (eq?.placa || equipoId).toUpperCase(),
      'Vehículo': eq?.vehiculo ?? '',
      'Localización': eq?.localizacion ?? '',
      'Eje': txt(r['Posición en el vehiculo (Eje)']),
      'Lado': txt(r['Posición en el vehiculo (Lado)']),
      'Prof. Externa': profExt,
      'Prof. Central': profCen,
      'Prof. Interna': profInt,
      'Prof. Mínima': profActual.length ? Math.min(...profActual) : (profs.length ? Math.min(...profs) : 0),
      'Fecha Inicial': r['Fecha inicial'] ?? '',
      'Inspecciones': historial.length,
      '_historial': historial,
      '_cronologia': [] as unknown[], // reservado: la hoja tendrá cronología más adelante
      '_raw': r,
    }
  })

  return {
    inventario,
    inspecciones,
    subInspecciones,
    totalInventario: inventario.length,
    totalInspecciones: inspecciones.length,
  }
}
