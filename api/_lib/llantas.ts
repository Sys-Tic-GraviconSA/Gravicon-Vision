import { getSheetData } from './sheets.js'

/**
 * Construye los datos de gestión de llantas (FleetControl_Llantas) para el
 * dashboard e informe. Enlaza, por ID, el inventario con sus inspecciones y el
 * detalle llanta a llanta — mismo patrón que buildMantenimientoOtRows (OT ↔ Sub_OT).
 *
 *   Inspec_Llantas_Concretros_Prin.Id_registro  ←  Inspec_Llantas.Id_Inspec_Llantas_Pri   (ronda de inspección: consecutivo y planta)
 *   Inspec_Llantas.Id_registro                  ←  Sub_Inspec_Llantas.Id_Inspec_Llantas   (una placa dentro de la ronda)
 *   Inventario_Llantas.Id_registro              ←  Sub_Inspec_Llantas.Id_Llanta           (una llanta puede tener N sub-inspecciones)
 *   Inspec_Llantas.Id_registro                  ←  Evidencia_Fotográfica.Id_Inspec_Llantas (fotos de la inspección)
 *
 * El campo «Placa» de las hojas trae el Id_Registro del maestro ("EQ/MAQ-035"), no la placa real:
 * se resuelve con el maestro de equipos de Concretos (hoja Plantas/Maquinaria), igual que en las OT.
 * La lectura del equipo viene en «Valor de Registro» con su «Unidad de Registro» (Kilometro / Horometro).
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
/** Serial de fecha de la hoja (la API entrega serial con UNFORMATTED_VALUE); texto «dd/mm/aaaa» también se acepta. 0 = sin fecha. */
function serial(v: unknown): number {
  if (typeof v === 'number') return v
  const s = txt(v)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(1899, 11, 30)) / 86400000)
  const n = Number(s)
  return isNaN(n) ? 0 : n
}
/** Unidad de la lectura del equipo: km u horas */
function unidad(v: unknown): string {
  const s = txt(v).toLowerCase()
  return s.startsWith('kil') ? 'km' : s.startsWith('hor') ? 'h' : ''
}

export interface CambioCrono { campo: string; de: string; a: string }
/**
 * Detalle_Cambio de la cronología → lista de cambios. Mismo formato que la cronología de las OT de Concretos:
 * JSON {"evento", "cambios": {campo: {antes, despues}}} o {"datos_iniciales": {campo: valor}}; a veces llega
 * truncado (",KEY_FINAL}"), así que si el JSON no es válido se extraen los pares con expresiones regulares.
 * También acepta el texto «Cambios detectados: campo: de -> a • …».
 */
export function parseCambios(detalle: string): CambioCrono[] {
  const t = detalle.trim()
  if (!t) return []
  const out: CambioCrono[] = []
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t.replace(/,\s*KEY_FINAL\s*}\s*$/, '}'))
      if (o?.cambios && typeof o.cambios === 'object') {
        for (const [campo, v] of Object.entries(o.cambios as Record<string, { antes?: unknown; despues?: unknown }>))
          out.push({ campo, de: txt(v?.antes), a: txt(v?.despues) })
      } else if (o?.datos_iniciales && typeof o.datos_iniciales === 'object') {
        for (const [campo, v] of Object.entries(o.datos_iniciales as Record<string, unknown>)) if (txt(v)) out.push({ campo, de: '', a: txt(v) })
      }
      return out.filter(c => c.de !== c.a)
    } catch {
      const re = /"([^"]+)"\s*:\s*\{\s*"antes"\s*:\s*"([^"]*)"\s*,\s*"despues"\s*:\s*"([^"]*)"/g
      let m: RegExpExecArray | null
      while ((m = re.exec(t)) !== null) out.push({ campo: m[1], de: m[2].trim(), a: m[3].trim() })
      if (!out.length) {
        const ini = t.match(/"datos_iniciales"\s*:\s*\{([\s\S]*)$/)
        const re2 = /"([^"]+)"\s*:\s*"([^"]*)"/g
        if (ini) while ((m = re2.exec(ini[1])) !== null) if (m[2].trim()) out.push({ campo: m[1], de: '', a: m[2].trim() })
      }
      return out.filter(c => c.de !== c.a)
    }
  }
  const m = t.match(/Cambios(?:\s*detectados)?:\s*(.*)$/s)
  if (!m) return []
  for (const parte of m[1].split('•').map(x => x.trim()).filter(Boolean)) {
    const i = parte.indexOf(':')
    if (i < 0) continue
    const resto = parte.slice(i + 1).trim()
    const f = resto.indexOf('->')
    out.push({ campo: parte.slice(0, i).trim(), de: f >= 0 ? resto.slice(0, f).trim() : '', a: f >= 0 ? resto.slice(f + 2).trim() : resto })
  }
  return out
}

/** Tipo de evento de la línea de tiempo según la hoja, la acción y los campos que cambiaron */
export type TipoEvento = 'registro' | 'inspeccion' | 'montaje' | 'desmontaje' | 'rotacion' | 'traslado' | 'reencauche' | 'baja' | 'correccion' | 'modificacion'
function tipoEvento(hoja: string, accion: string, cambios: CambioCrono[]): TipoEvento {
  const esInspeccion = /inspec/i.test(hoja)
  if (/cre|registr/i.test(accion)) return esInspeccion ? 'inspeccion' : 'registro'
  const campo = (re: RegExp) => cambios.find(c => re.test(c.campo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  const estado = campo(/estado/i)
  if (estado && /desech|baja|chatarr/i.test(estado.a)) return 'baja'
  if (estado && /reenc/i.test(estado.a)) return 'reencauche'
  if (campo(/placa/i)) return 'traslado'
  if (estado && /uso|montad/i.test(estado.a)) return 'montaje'
  if (estado && /almac|taller|stock|bodega/i.test(estado.a)) return 'desmontaje'
  if (campo(/posici|eje|lado/i)) return 'rotacion'
  if (campo(/prof|psi/i)) return 'correccion'
  return 'modificacion'
}

export interface LlantasData {
  inventario: Record<string, unknown>[]
  inspecciones: Record<string, unknown>[]
  subInspecciones: Record<string, unknown>[]
  rondas: Record<string, unknown>[]
  evidencias: Record<string, unknown>[]
  cronologia: Record<string, unknown>[]
  /** Equipos del maestro de Concretos con llantas (para detectar placas sin inspección) */
  equipos: Record<string, unknown>[]
  totalInventario: number
  totalInspecciones: number
}

/** Hoja opcional: si no existe o falla, se trabaja sin ella */
async function hojaOpcional(nombre: string, force: boolean): Promise<Record<string, unknown>[]> {
  try { return (await getSheetData('llantas', nombre, force)).rows } catch { return [] }
}

export async function buildLlantasData(forceRefresh = false): Promise<LlantasData> {
  const [invSheet, inspSheet, subInspSheet, rondasRows, evidRows, cronoRows] = await Promise.all([
    getSheetData('llantas', 'Inventario_Llantas_Concretros', forceRefresh),
    getSheetData('llantas', 'Inspec_Llantas_Concretros', forceRefresh),
    getSheetData('llantas', 'Sub_Inspec_Llantas_Concretros', forceRefresh),
    hojaOpcional('Inspec_Llantas_Concretros_Prin', forceRefresh),
    hojaOpcional('Evidencia_Fotográfica_Inspeccion_Llantas_Concretos', forceRefresh),
    hojaOpcional('Cronologia_Llantas_Concreos', forceRefresh),
  ])

  // Maestro de equipos (menú): el campo "Placa" de las hojas trae el Id_Registro
  // ("EQ/MAQ-035"), no la placa real — se resuelve aquí igual que en las OT.
  let plantasMaquinariaRows: Record<string, unknown>[] = []
  try {
    const res = await getSheetData('maestro_concretos', 'Plantas/Maquinaria', forceRefresh)
    plantasMaquinariaRows = res.rows
  } catch { /* opcional: si falla, se usan los IDs crudos */ }

  interface EquipoInfo { placa: string; vehiculo: string; tipo: string; marca: string; modelo: string; localizacion: string; ejes: number; numLlantas: number; noDisponible: boolean }
  const equipoMap = new Map<string, EquipoInfo>()
  for (const r of plantasMaquinariaRows) {
    const id = txt(r['Id_Registro'])
    if (!id) continue
    equipoMap.set(id, {
      placa: txt(r['PLACA']).toUpperCase(),
      vehiculo: txt(r['VEHICULO']),
      tipo: txt(r['TIPO']).toUpperCase(),
      marca: txt(r['MARCA']),
      modelo: txt(r['MODELO']),
      localizacion: txt(r['Localizacion']),
      ejes: num(r['Ejes']),
      numLlantas: num(r['Numero de Llantas']),
      noDisponible: r['No Disponible'] === true || txt(r['No Disponible']).toUpperCase() === 'TRUE',
    })
  }
  const resolvePlaca = (raw: string) => equipoMap.get(txt(raw))?.placa || txt(raw).toUpperCase()

  // --- Rondas de inspección (hoja _Prin): consecutivo, fecha y planta ---
  const rondas = rondasRows.map(r => ({
    'Id': txt(r['Id_registro']),
    'Consecutivo': txt(r['Consecutivo']),
    'Fecha': serial(r['Fecha de registro']),
    'Planta': txt(r['Planta']),
  }))
  const rondaById = new Map(rondas.map(r => [r['Id'], r]))

  // --- Evidencias fotográficas por inspección ---
  const evidencias = evidRows.map(r => ({
    'Id': txt(r['Id_registro']),
    'Id Inspección': txt(r['Id_Inspec_Llantas']),
    'Fecha': serial(r['Fecha de registro']),
    'Fotos': [r['Evidencia Fotográfica 1'], r['Evidencia Fotográfica 2'], r['Evidencia Fotográfica 3']].map(txt).filter(Boolean),
  }))

  // --- Sub-inspecciones normalizadas + índice por inspección y por llanta ---
  const subInspecciones = subInspSheet.rows.map(r => ({
    'Id': txt(r['Id_registro']),
    'Id Inspección': txt(r['Id_Inspec_Llantas']),
    'Id Llanta': txt(r['Id_Llanta']),
    'Fecha': serial(r['Fecha de registro']),
    'Equipo ID': txt(r['Placa']),
    'Placa': resolvePlaca(txt(r['Placa'])),
    'Marca': txt(r['Marca']).toUpperCase(),
    'Dimensión': txt(r['Dimensión']),
    'PSI': num(r['PSI']),
    'Prof. Externa': num(r['Prof. externa (Mm)']),
    'Prof. Central': num(r['Prof. central (Mm)']),
    'Prof. Interna': num(r['Prof. interna (Mm)']),
    'Condiciones Irregulares': txt(r['Condiciones irregulares']),
    'Plan de Acción': txt(r['Plan de acción']),
    'Eje': txt(r['Posición en el vehiculo (Eje)']),
    'Posición': txt(r['Posición en el vehiculo']),
    'Requiere Foto': txt(r['¿Requiere Evidencia Fotográfica?']),
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

  // --- Inspecciones (una por placa y ronda), cada una con sus sub-inspecciones ---
  const inspecciones = inspSheet.rows.map(r => {
    const id = txt(r['Id_registro'])
    const equipoId = txt(r['Placa'])
    const eq = equipoMap.get(equipoId)
    const ronda = rondaById.get(txt(r['Id_Inspec_Llantas_Pri']))
    return {
      'Id': id,
      'Id Ronda': txt(r['Id_Inspec_Llantas_Pri']),
      'Consecutivo': ronda?.['Consecutivo'] ?? '',
      'Fecha': serial(r['Fecha de registro']),
      'Evaluador': txt(r['Nombre evaluador']),
      'Planta': txt(r['Planta']),
      'Equipo ID': equipoId,
      'Placa': resolvePlaca(equipoId),
      'Tipo de Vehículo': eq?.tipo ?? '',
      'Llantas del Equipo': eq?.numLlantas ?? 0,
      'Unidad': unidad(r['Unidad de Registro']),
      'Lectura': num(r['Valor de Registro']),
      'Llantas Inspeccionadas': subByInsp.get(id)?.length ?? 0,
      'Fotos': evidencias.filter(e => e['Id Inspección'] === id).reduce((a, e) => a + e['Fotos'].length, 0),
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
          idInspeccion: s['Id Inspección'],
          // La fecha de la inspección padre manda (la sub-inspección puede quedar con la fecha de la ronda)
          fecha: Number(insp?.['Fecha'] || s['Fecha'] || 0),
          evaluador: insp?.['Evaluador'] ?? '',
          lectura: insp?.['Lectura'] ?? 0,
          unidad: insp?.['Unidad'] ?? '',
          psi: s['PSI'],
          profExterna: s['Prof. Externa'],
          profCentral: s['Prof. Central'],
          profInterna: s['Prof. Interna'],
          condiciones: s['Condiciones Irregulares'],
          planAccion: s['Plan de Acción'],
          eje: s['Eje'],
          posicion: s['Posición'],
        }
      })
      .sort((a, b) => a.fecha - b.fecha)

    const ult = historial[historial.length - 1] ?? null
    const profActual = ult
      ? [ult.profExterna, ult.profCentral, ult.profInterna].filter(v => Number(v) > 0).map(Number)
      : profs

    const equipoId = txt(r['Placa'])
    const eq = equipoMap.get(equipoId)

    return {
      'Id': id,
      'Nº Serie': txt(r['No. serie']),
      'Fecha Registro': serial(r['Fecha de registro']),
      'Fecha Compra': serial(r['Fecha de Compra']),
      'Marca': txt(r['Marca']).toUpperCase(),
      'Modelo': txt(r['Modelo']),
      'Dimensión': txt(r['Dimensión']),
      // DOT: serial de fecha, «semana/año» o texto (p. ej. «NO SE LOGRA VISUALIZAR POR DESGASTE»)
      'DOT': typeof r['Fecha de fabricación (dot)'] === 'number' ? r['Fecha de fabricación (dot)'] : txt(r['Fecha de fabricación (dot)']),
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
      'Posición': txt(r['Posición en el vehiculo']),
      'Prof. Externa': profExt,
      'Prof. Central': profCen,
      'Prof. Interna': profInt,
      'Prof. Inicial': profs.length ? Math.min(...profs) : 0,
      'Prof. Mínima': profActual.length ? Math.min(...profActual) : (profs.length ? Math.min(...profs) : 0),
      'Fecha Inicial': serial(r['Fecha inicial']),
      'Unidad Inicial': unidad(r['Unidad de Registro']),
      'Lectura Inicial': num(r['Valor de Registro']),
      'Inspecciones': historial.length,
      '_historial': historial,
    }
  })

  // Cronología de cambios (hoja Cronologia_Llantas_Concreos): un registro por creación o modificación de un
  // formulario (Inventario, Inspección o Sub-inspección). Se enlaza a la llanta: Inventario → Id_registro de la
  // llanta; Sub-inspección → su Id_Llanta; Inspección (placa) → todas las llantas de esa placa en el cliente.
  const subById = new Map(subInspecciones.map(s => [s['Id'], s]))
  const inspIdSet = new Set(inspecciones.map(i => i['Id']))
  const invIdSet = new Set(inventario.map(l => l['Id']))
  const cronologia = cronoRows.map(r => {
    const idForm = txt(r['Id_Formulario'])
    const hoja = txt(r['Hoja'])
    const accion = txt(r['Tipo_Accion'])
    const cambios = parseCambios(txt(r['Detalle_Cambio'])).map(c => {
      // Placa en la cronología viene como Id del maestro ("EQ/MAQ-035"): se muestra la placa real
      if (/placa/i.test(c.campo)) return { ...c, de: c.de ? resolvePlaca(c.de) : '', a: c.a ? resolvePlaca(c.a) : '' }
      return c
    })
    const sub = subById.get(idForm)
    const idLlanta = invIdSet.has(idForm) ? idForm : sub ? String(sub['Id Llanta'] ?? '') : ''
    const idInspeccion = inspIdSet.has(idForm) ? idForm : sub ? String(sub['Id Inspección'] ?? '') : ''
    return {
      'Id': txt(r['ID_Historial']),
      'Id Formulario': idForm,
      'Id Llanta': idLlanta,
      'Id Inspección': idInspeccion,
      'Hoja': hoja,
      'Fecha': serial(r['Fecha_Evento']) + (typeof r['Hora_Evento'] === 'number' ? r['Hora_Evento'] : 0),
      'Usuario': txt(r['Usuario_Cambio']),
      'Acción': accion,
      'Tipo': tipoEvento(hoja, accion, cambios),
      'Cambios': cambios,
      'Detalle': cambios.length ? '' : txt(r['Detalle_Cambio']).slice(0, 300),
    }
  })

  // Equipos de Maquinaria con llantas según el maestro (para «placas sin inspección»)
  const equipos = [...equipoMap.entries()]
    .filter(([, e]) => e.numLlantas > 0)
    .map(([id, e]) => ({ 'Equipo ID': id, 'Placa': e.placa, 'Tipo': e.tipo, 'Localización': e.localizacion, 'Llantas': e.numLlantas, 'Ejes': e.ejes, 'No Disponible': e.noDisponible }))

  return {
    inventario,
    inspecciones,
    subInspecciones,
    rondas,
    evidencias,
    cronologia,
    equipos,
    totalInventario: inventario.length,
    totalInspecciones: inspecciones.length,
  }
}
