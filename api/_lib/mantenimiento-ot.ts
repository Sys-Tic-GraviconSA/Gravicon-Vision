import { getSheetData } from './sheets.js'

export type MantenimientoPlanta = 'CUNCIA' | 'ACACIAS' | 'CONCRETOS'

/**
 * Construye las filas de Órdenes de Trabajo con sus sub-órdenes, SOPLED,
 * sub-SOPLED y cronología, a partir de los spreadsheets de OT y del maestro
 * de Plantas/Maquinaria. Compartido entre la API serverless (Vercel) y la
 * ruta Express para que dev y prod se comporten igual.
 *
 * @param otKey - Clave del spreadsheet de OT (ej. 'ordenes_ot_cuncia').
 * @param maestroKey - Clave del spreadsheet maestro (ej. 'maestro_cuncia').
 * @param planta - Nombre de la planta que etiquetará cada fila ('CUNCIA' | 'ACACIAS').
 * @returns Filas normalizadas del dashboard de OT.
 */
export async function buildMantenimientoOtRows(otKey: string, maestroKey: string, planta: MantenimientoPlanta, forceRefresh = false): Promise<Record<string, unknown>[]> {
  const [ordenesOt, subOrdenesOt, sopledSheet, subSopledSheet, cronologiaSheet] = await Promise.all([
    getSheetData(otKey, 'Ordenes_Ot', forceRefresh),
    getSheetData(otKey, 'Sub_Ordenes_Ot', forceRefresh),
    getSheetData(otKey, 'Sopled', forceRefresh),
    getSheetData(otKey, 'Sub_Sopled', forceRefresh),
    getSheetData(otKey, 'Cronologia', forceRefresh),
  ])

  let plantasMaquinariaSheet = { rows: [] as Record<string, unknown>[] }
  try {
    plantasMaquinariaSheet = await getSheetData(maestroKey, 'Plantas/Maquinaria', forceRefresh)
  } catch { /* hoja no disponible aún */ }

  let personalInternoSheet = { rows: [] as Record<string, unknown>[] }
  try {
    personalInternoSheet = await getSheetData(maestroKey, 'GRAVICON_INTERNO_OT', forceRefresh)
  } catch { /* hoja no disponible aún */ }

  let solicitantesSheet = { rows: [] as Record<string, unknown>[] }
  try {
    solicitantesSheet = await getSheetData(otKey, 'SOLICITANTES_OT', forceRefresh)
  } catch { /* hoja no disponible aún */ }

  const solicitantesMap = new Map<string, string>()
  for (const r of solicitantesSheet.rows) {
    const id = String(r['ID'] ?? '').trim()
    const nombre = String(r['Nombre'] ?? '').trim()
    if (id && nombre) solicitantesMap.set(id, nombre)
  }

  const personalInternoMap = new Map<string, { nombre: string; cargo: string; precio: number }>()
  const personalInternoByName = new Map<string, { nombre: string; cargo: string; precio: number }>()
  for (const r of personalInternoSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    if (!id) continue
    const nombre = String(r['Nombre_Proveedor'] ?? '').trim()
    const cargo = String(r['CARGO'] ?? '').trim()
    const priceKey = ['Precio_Servicio', 'Precio', 'Valor', 'Tarifa', 'Costo'].find(k => r[k] !== undefined)
    const precio = priceKey ? (Number(r[priceKey]) || 0) : 0
    const info = { nombre, cargo, precio }
    personalInternoMap.set(id, info)
    if (nombre) personalInternoByName.set(nombre.toLowerCase(), info)
  }

  const placaMap = new Map<string, string>()
  const vehiculoDescMap = new Map<string, string>()
  const tipoVehiculoMap = new Map<string, string>()
  for (const r of plantasMaquinariaSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const placa = String(r['PLACA'] ?? '').trim()
    const vehiculo = String(r['VEHICULO'] ?? '').trim()
    const tipo = String(r['TIPO'] ?? '').trim()
    if (id && placa) placaMap.set(id, placa)
    if (id && vehiculo) vehiculoDescMap.set(id, vehiculo)
    if (id && tipo) tipoVehiculoMap.set(id, tipo)
  }

  const subMap = new Map<string, { sistema: string; sistemaTexto: string; descripcion: string }[]>()
  for (const r of subOrdenesOt.rows) {
    const id = String(r['ID_OT'] ?? '')
    if (!id) continue
    if (!subMap.has(id)) subMap.set(id, [])
    subMap.get(id)!.push({
      sistema: String(r['Sistema_a_intervenir'] ?? '').trim(),
      sistemaTexto: String(r['Sistema_a_intervenir_Texto'] ?? '').trim(),
      descripcion: String(r['Descripción_Trabajo'] ?? '').trim(),
    })
  }

  const subSopledMap = new Map<string, { idItem: string; cantidad: number; referencia: string; descripcion: string; descripcionTexto: string; und: string; observacion: string; motivoNoSalida: string }[]>()
  for (const r of subSopledSheet.rows) {
    const id = String(r['ID_OT_SOLPED'] ?? '')
    if (!id) continue
    if (!subSopledMap.has(id)) subSopledMap.set(id, [])
    subSopledMap.get(id)!.push({
      idItem: String(r['ID_Ot_Sub_SOLPED'] ?? '').trim(),
      cantidad: Number(r['CANTIDAD']) || 0,
      referencia: String(r['REFERENCIA'] ?? '').trim(),
      descripcion: String(r['DESCRIPCIÓN'] ?? '').trim(),
      descripcionTexto: String(r['DESCRIPCIÓN_Texto'] ?? '').trim(),
      und: String(r['UNID DE MEDIDA'] ?? '').trim(),
      observacion: String(r['OBSERVACIÓN'] ?? '').trim(),
      motivoNoSalida: String(r['Motivo_de_No_Salida'] ?? '').trim(),
    })
  }

  const sopledByOt = new Map<string, {
    idSopled: string; noPedido: string; fecha: unknown; hora: unknown; enlacePdf: string;
    proceso: string; procesoTexto: string; tipoCompra: string; centroCosto: string;
    solicitante: string; solicitanteTexto: string; cargSolicitante: string;
    aprueba: string; apruebaTexto: string; cargoAprueba: string;
    fechaGeneracion: unknown; fechaEmision: unknown;
    _subSopled: { idItem: string; cantidad: number; referencia: string; descripcion: string; descripcionTexto: string; und: string; observacion: string; motivoNoSalida: string }[];
  }[]>()
  for (const r of sopledSheet.rows) {
    const otId = String(r['ID_OT'] ?? '')
    if (!otId) continue
    if (!sopledByOt.has(otId)) sopledByOt.set(otId, [])
    const sopId = String(r['ID_OT_SOLPED'] ?? '')
    sopledByOt.get(otId)!.push({
      idSopled: sopId,
      noPedido: String(r['No. Pedido'] ?? ''),
      fecha: r['Fecha_Registro'],
      hora: typeof r['Hora_Registro'] === 'number' ? r['Hora_Registro'] : null,
      enlacePdf: String(r['Enlace_Pdf'] ?? ''),
      proceso: String(r['Proceso'] ?? ''),
      procesoTexto: String(r['Proceso_Texto'] ?? ''),
      tipoCompra: String(r['Tipo de Compra'] ?? ''),
      centroCosto: String(r['CENTRO DE COSTO'] ?? ''),
      solicitante: String(r['Nombre del Solicitante'] ?? ''),
      solicitanteTexto: String(r['Nombre del Solicitante_Texto'] ?? ''),
      cargSolicitante: String(r['Cargo del Solicitante'] ?? ''),
      aprueba: String(r['Nombre de quien aprueba'] ?? ''),
      apruebaTexto: String(r['Nombre de quien aprueba_Texto'] ?? ''),
      cargoAprueba: String(r['Cargo de quien aprueba'] ?? ''),
      fechaGeneracion: r['Fecha_de_Generacion'],
      fechaEmision: r['Fecha_de_Emision_Correo'],
      _subSopled: subSopledMap.get(sopId) ?? [],
    })
  }

  const cronoByOt = new Map<string, {
    fecha: unknown; hora: unknown; usuario: string; accion: string; detalle: string;
  }[]>()
  for (const r of cronologiaSheet.rows) {
    const otId = String(r['ID_OT'] ?? '')
    if (!otId) continue
    if (!cronoByOt.has(otId)) cronoByOt.set(otId, [])
    cronoByOt.get(otId)!.push({
      fecha: r['Fecha_Evento'],
      hora: typeof r['Hora_Evento'] === 'number' ? r['Hora_Evento'] : null,
      usuario: String(r['Usuario_Cambio'] ?? ''),
      accion: String(r['Tipo_Accion'] ?? ''),
      detalle: String(r['Detalle_Cambio'] ?? ''),
    })
  }
  for (const arr of cronoByOt.values()) {
    arr.sort((a, b) => (Number(b.fecha) + (Number(b.hora) || 0)) - (Number(a.fecha) + (Number(a.hora) || 0)))
  }

  const rows: Record<string, unknown>[] = []
  for (const ot of ordenesOt.rows) {
    const subs = subMap.get(String(ot['ID_OT'] ?? '')) ?? []
    const sops = sopledByOt.get(String(ot['ID_OT'] ?? '')) ?? []
    const cronos = cronoByOt.get(String(ot['ID_OT'] ?? '')) ?? []
    const obsParts: string[] = []
    const obsCierre = String(ot['Observaciones_Anexo_Cierre'] ?? '').trim()
    if (obsCierre) obsParts.push(obsCierre)
    for (const s of subs) {
      if (s.descripcion) obsParts.push(s.descripcion)
    }

    const ids = String(ot['Personal_Intervención'] ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const names = String(ot['Personal_Intervención_Texto'] ?? '').split(',').map(s => s.trim()).filter(Boolean)

    const personalInvolucrado: { id: string; nombre: string; cargo: string; precio: number; costo: number }[] = []
    const costoServicios = Number(ot['Precio_Servicio']) || 0

    const maxLength = Math.max(ids.length, names.length)
    const costoPorPersona = maxLength > 0 ? costoServicios / maxLength : costoServicios

    for (let i = 0; i < maxLength; i++) {
      const id = ids[i] || ''
      const nameFromOt = names[i] || ''
      
      let nombre = nameFromOt
      let cargo = ''
      let precio = 0

      if (id && personalInternoMap.has(id)) {
        const info = personalInternoMap.get(id)!
        nombre = info.nombre || nombre
        cargo = info.cargo
        precio = info.precio
      } else if (nameFromOt) {
        const info = personalInternoByName.get(nameFromOt.toLowerCase())
        if (info) {
          nombre = info.nombre
          cargo = info.cargo
          precio = info.precio
        }
      }

      personalInvolucrado.push({
        id,
        nombre,
        cargo,
        precio,
        costo: costoPorPersona
      })
    }

    rows.push({
      '_rowKey': String(ot['ID_OT'] ?? ''),
      'Nº Orden de Trabajo': ot['C_Orden_OT'],
      'FECHA': ot['Fecha_Registro'],
      'Hora': typeof ot['Hora_Registro'] === 'number' ? ot['Hora_Registro'] : null,
      'PLANTA': planta,
      'Localización': String(ot['Localización'] ?? '').trim(),
      'Estado': String(ot['Estado'] ?? ''),
      'Tipo de Mantenimiento': String(ot['Tipo de Mantenimiento'] ?? ''),
      'Tipo de OT': String(ot['Tipo de OT'] ?? ''),
      'Tipo de Vehículo': String(ot['Planta/Maquinaria_Texto'] ?? ''),
      'Tipo Vehículo': tipoVehiculoMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Placa del Vehículo': placaMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Vehiculo Descripción': vehiculoDescMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Prioridad': String(ot['Prioridad'] ?? ''),
      'Solicitante': String(ot['Solicitante_Texto'] ?? ''),
      'Fuente_Novedad': String(ot['Fuente_Novedad'] ?? ''),
      'PROVEEDOR': String(ot['Responsable_Proveedor'] ?? ''),
      'PROVEEDOR_ID': String(ot['Responsable_Proveedor'] ?? '').trim(),
      'Personal': String(ot['Personal_Intervención_Texto'] ?? ''),
      'Duración (horas)': typeof ot['Duración_Estimada'] === 'number' ? Math.round(ot['Duración_Estimada'] * 24 * 100) / 100 : null,
      'Tipo Trabajo': String(ot['Tipo_de_Trabajo'] ?? ''),
      'Clase Mantenimiento': String(ot['Clase_Mantenimiento'] ?? ''),
      'Costo servicios': costoServicios,
      'Costos Insumos': Number(ot['Precio_Insumos']) || 0,
      'Fecha Recepción': ot['Fecha_Hora_Recepción'],
      'Fecha Cierre': ot['Fecha_Hora_Cierre'],
      'Horómetro': ot['Horómetro'] != null && ot['Horómetro'] !== '' ? ot['Horómetro'] : null,
      'Descripción': String(ot['DESCRIPCIÓN _DE_LA_ACTIVIDAD'] ?? '').trim(),
      'Observaciones Cierre': String(ot['Observaciones_Anexo_Cierre'] ?? '').trim(),
      'Marca Llanta': String(ot['MARCA_LLANTA'] ?? ''),
      'Tipo Actividad Llanta': String(ot['TIPO_DE_ACTIVIDAD'] ?? ''),
      'Destino Llanta': String(ot['DESTINO_LLANTA_DESMONTADA'] ?? ''),
      'Condición Llanta': String(ot['CONDICIÓN_DE LA_LLANTA'] ?? ''),
      'Posición Llanta': String(ot['POSICIÓN_LLANTA'] ?? ''),
      'Requiere Pedido': String(ot['¿REQUIERE SOLICITUD DE PEDIDO/ALMACEN?'] ?? ''),
      'Motivo No Ejecución': String(ot['Motivo de No Ejecución'] ?? ''),
      'Responsable Cierre': solicitantesMap.get(String(ot['Responsable_Cierre'] ?? '').trim()) || String(ot['Responsable_Cierre_Texto'] ?? ''),
      'Fecha Generación': ot['Fecha_Generacion'],
      'Enlace PDF': String(ot['Enlace_PDF'] ?? ''),
      'Observaciones': obsParts.join(' | '),
      '_subOrdenes': subs,
      '_sopled': sops,
      '_cronologia': cronos,
      '_personalDetalles': personalInvolucrado,
    })
  }

  return rows
}