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

  // 9 hojas opcionales en paralelo (antes eran awaits secuenciales → más lento)
  const [plantasMaquinariaRes, personalInternoRes, solicitantesRes, proveedoresRes, sistemasRes, nombreSolicitanteRes, nombreQuienApruebaRes, solpedProcesoRes, solpedItemsRes] = await Promise.allSettled([
    getSheetData(maestroKey, 'Plantas/Maquinaria', forceRefresh),
    getSheetData(maestroKey, 'GRAVICON_INTERNO_OT', forceRefresh),
    getSheetData(maestroKey, 'SOLICITANTES_OT', forceRefresh),
    getSheetData(maestroKey, 'PROVEEDORES_OT', forceRefresh),
    getSheetData(maestroKey, 'SISTEMAS_OT', forceRefresh),
    getSheetData(maestroKey, 'NOMBRE_SOLICITANTE', forceRefresh),
    getSheetData(maestroKey, 'NOMBRE_QUIEN_APRUEBA', forceRefresh),
    getSheetData(maestroKey, 'SOLPED_PROCESO', forceRefresh),
    getSheetData(maestroKey, 'SOLPED_ITEMS', forceRefresh),
  ])

  const plantasMaquinariaSheet = plantasMaquinariaRes.status === 'fulfilled' ? plantasMaquinariaRes.value : { rows: [] as Record<string, unknown>[] }
  const personalInternoSheet = personalInternoRes.status === 'fulfilled' ? personalInternoRes.value : { rows: [] as Record<string, unknown>[] }
  const solicitantesSheet = solicitantesRes.status === 'fulfilled' ? solicitantesRes.value : { rows: [] as Record<string, unknown>[] }
  const proveedoresSheet = proveedoresRes.status === 'fulfilled' ? proveedoresRes.value : { rows: [] as Record<string, unknown>[] }
  const sistemasSheet = sistemasRes.status === 'fulfilled' ? sistemasRes.value : { rows: [] as Record<string, unknown>[] }
  const nombreSolicitanteSheet = nombreSolicitanteRes.status === 'fulfilled' ? nombreSolicitanteRes.value : { rows: [] as Record<string, unknown>[] }
  const nombreQuienApruebaSheet = nombreQuienApruebaRes.status === 'fulfilled' ? nombreQuienApruebaRes.value : { rows: [] as Record<string, unknown>[] }
  const solpedProcesoSheet = solpedProcesoRes.status === 'fulfilled' ? solpedProcesoRes.value : { rows: [] as Record<string, unknown>[] }
  const solpedItemsSheet = solpedItemsRes.status === 'fulfilled' ? solpedItemsRes.value : { rows: [] as Record<string, unknown>[] }

  const solicitantesMap = new Map<string, string>()
  for (const r of solicitantesSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['NOMBRE'] ?? '').trim()
    if (id && nombre) solicitantesMap.set(id, nombre)
  }

  const sistemasMap = new Map<string, string>()
  for (const r of sistemasSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['Sistemas_intervenir'] ?? '').trim()
    if (id && nombre) sistemasMap.set(id, nombre)
  }

  const nombreSolicitanteMap = new Map<string, string>()
  for (const r of nombreSolicitanteSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['NOMBRE Y APELLIDO'] ?? '').trim()
    if (id && nombre) nombreSolicitanteMap.set(id, nombre)
  }

  const nombreQuienApruebaMap = new Map<string, string>()
  for (const r of nombreQuienApruebaSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['NOMBRE Y APELLIDO'] ?? '').trim()
    if (id && nombre) nombreQuienApruebaMap.set(id, nombre)
  }

  const solpedProcesoMap = new Map<string, string>()
  for (const r of solpedProcesoSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['Proceso'] ?? '').trim()
    if (id && nombre) solpedProcesoMap.set(id, nombre)
  }

  const solpedItemsMap = new Map<string, string>()
  for (const r of solpedItemsSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['SOLPED_ITEMS'] ?? '').trim()
    if (id && nombre) solpedItemsMap.set(id, nombre)
  }

  const proveedoresMap = new Map<string, string>()
  for (const r of proveedoresSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    const nombre = String(r['Nombre_Proveedor'] ?? '').trim()
    if (id && nombre) proveedoresMap.set(id, nombre)
  }

  const personalInternoMap = new Map<string, { nombre: string; cargo: string; precio: number }>()
  for (const r of personalInternoSheet.rows) {
    const id = String(r['Id_Registro'] ?? '').trim()
    if (!id) continue
    const nombre = String(r['Nombre_Proveedor'] ?? '').trim()
    const cargo = String(r['CARGO'] ?? '').trim()
    const priceKey = ['Precio_Servicio', 'Precio', 'Valor', 'Tarifa', 'Costo'].find(k => r[k] !== undefined)
    const precio = priceKey ? (Number(r[priceKey]) || 0) : 0
    personalInternoMap.set(id, { nombre, cargo, precio })
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
    // En la hoja de Cuncía la columna de ID real de esta tabla está mal rotulada como
    // "Columna 5" en vez de "Sistema_a_intervenir" — se lee de ahí si la columna con el
    // nombre correcto no trae nada.
    const sistemaId = String(r['Sistema_a_intervenir'] ?? r['Columna 5'] ?? '').trim()
    subMap.get(id)!.push({
      sistema: sistemaId,
      sistemaTexto: sistemasMap.get(sistemaId) ?? '',
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
      descripcionTexto: solpedItemsMap.get(String(r['DESCRIPCIÓN'] ?? '').trim()) ?? '',
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
      procesoTexto: solpedProcesoMap.get(String(r['Proceso'] ?? '').trim()) ?? '',
      tipoCompra: String(r['Tipo de Compra'] ?? ''),
      centroCosto: String(r['CENTRO DE COSTO'] ?? ''),
      solicitante: String(r['Nombre del Solicitante'] ?? ''),
      solicitanteTexto: (() => { const v = String(r['Nombre del Solicitante'] ?? '').trim(); return nombreSolicitanteMap.get(v) || solicitantesMap.get(v) || v })(),
      cargSolicitante: String(r['Cargo del Solicitante'] ?? ''),
      aprueba: String(r['Nombre de quien aprueba'] ?? ''),
      apruebaTexto: nombreQuienApruebaMap.get(String(r['Nombre de quien aprueba'] ?? '').trim()) || String(r['Nombre de quien aprueba'] ?? '').trim(),
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

    const personalInvolucrado: { id: string; nombre: string; cargo: string; precio: number; costo: number }[] = []
    const costoServicios = Number(ot['Precio_Servicio']) || 0
    const costoPorPersona = ids.length > 0 ? costoServicios / ids.length : costoServicios

    for (const id of ids) {
      const info = personalInternoMap.get(id)
      personalInvolucrado.push({
        id,
        nombre: info?.nombre ?? '',
        cargo: info?.cargo ?? '',
        precio: info?.precio ?? 0,
        costo: costoPorPersona,
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
      'Tipo de Vehículo': vehiculoDescMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Tipo Vehículo': tipoVehiculoMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Placa del Vehículo': placaMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Vehiculo Descripción': vehiculoDescMap.get(String(ot['Planta/Maquinaria'] ?? '').trim()) || '',
      'Prioridad': String(ot['Prioridad'] ?? ''),
      'Solicitante': solicitantesMap.get(String(ot['Solicitante'] ?? '').trim()) || '',
      'Fuente_Novedad': String(ot['Fuente_Novedad'] ?? ''),
      'PROVEEDOR_ID': String(ot['Responsable_Proveedor'] ?? '').trim(),
      'PROVEEDOR': proveedoresMap.get(String(ot['Responsable_Proveedor'] ?? '').trim()) || String(ot['Responsable_Proveedor'] ?? ''),
      'Jornada': String(ot['Jornada'] ?? ''),
      'Personal': personalInvolucrado.map(p => p.nombre).filter(Boolean).join(', '),
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
      'Responsable Cierre': solicitantesMap.get(String(ot['Responsable_Cierre'] ?? '').trim()) || '',
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