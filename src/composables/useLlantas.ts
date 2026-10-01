/**
 * useLlantas.ts — Modelo del «Macro Informe Analítico de Llantas» (hoja ESTRUCTURA) para Concretos.
 *
 * Toma el inventario e inspecciones de FleetControl_Llantas (useLlantasStore) y las OT de llantas de
 * Mantenimiento Concretos, aplica los filtros de arriba (fechas, planta, tipo, placa, marca) y calcula
 * lo que piden el tablero y el informe:
 *  - Estado vigente de cada llanta = su ÚLTIMA inspección dentro del rango de fechas.
 *  - Semáforo con los CRITERIOS de inspección por posición (hoja «CRITERIOS INSPECCIÓN LLANTAS»): según el grupo
 *    (direccional, segundo direccional, tracción, arrastre, OTR, liviano) cada uno tiene su remanente crítico y de
 *    atención y sus condiciones de descarte directo. Crítica = Cambio inmediato; atención = Cambio proyectado.
 *    Si el inspector marcó un cambio en el plan de acción, manda el más severo (PLAN_INSPECTOR_MANDA).
 *  - Velocidad de desgaste (mm/mes) = (remanente anterior − remanente actual) ÷ días entre mediciones × 30.
 *    Anterior = la inspección previa de la llanta o, si no hay, la profundidad inicial en su «Fecha inicial».
 *  - Presión: PSI 0 o vacío = sin medir; por debajo de PSI_MIN baja, por encima de PSI_MAX alta.
 *  - OT de llantas = órdenes con sub-orden del sistema «LLANTAS Y RINES» o actividad de llanta.
 * Todo se calcula en el cliente; Gráficas e Informe usan el mismo modelo para que las cifras coincidan.
 */
import { computed, type Ref } from 'vue'
import { serialToDate } from '../utils/dates'
import { nombrePlanta, ordenarPlantas } from './useGraficasConcreto'

// ---------------------------------------------------------------- Reglas (umbrales de la hoja ESTRUCTURA)
/** Remanente (mm) en o por debajo del cual la llanta se cambia de inmediato */
export const MM_INMEDIATO = 2
/** Remanente (mm) hasta el cual el cambio se proyecta (30-60 días) */
export const MM_PROYECTADO = 4
/** Rango de reencauche: remanente entre estos mm y sin cortes en la carcasa */
export const REENCAUCHE_MIN = 2.5
export const REENCAUCHE_MAX = 4
/** Desgaste acelerado («devoradores»): más de este valor en mm por mes */
export const DESGASTE_ALTO = 1
/** Diferencia transversal (hombro externo vs interno) que indica desgaste irregular */
export const DIF_TRANSVERSAL = 1.5
/** Presión de inflado correcta (PSI) para llantas de camión */
export const PSI_MIN = 90
export const PSI_MAX = 130
/** Carcasa vencida: más de estos años desde la fecha DOT */
export const DOT_ANIOS = 5
/** El plan de acción del inspector («Cambio inmediato / proyectado») puede subir la severidad del semáforo */
export const PLAN_INSPECTOR_MANDA = true
/** Días mínimos entre mediciones para que la velocidad de desgaste sea confiable */
const DIAS_MIN_DESGASTE = 15

export type Semaforo = 'inmediato' | 'proyectado' | 'bueno'
export type Presion = 'Correcta' | 'Baja' | 'Alta' | 'Sin medir'
export const SEMAFORO_LBL: Record<Semaforo, string> = { inmediato: 'Cambio inmediato', proyectado: 'Cambio proyectado', bueno: 'Buen estado' }
export const SEMAFORO_COLOR: Record<Semaforo, string> = { inmediato: '#EF4444', proyectado: '#F59E0B', bueno: '#10B981' }

// ---------------------------------------------------------------- Criterios de inspección (hoja «CRITERIOS INSPECCIÓN LLANTAS»)
/** Grupo de posición según el tipo de equipo y el eje: define el umbral de remanente y la acción */
export type CategoriaPosicion = 'Direccional' | 'Segundo direccional' | 'Tracción' | 'Arrastre' | 'OTR' | 'Liviano' | 'Repuesto'
export interface CriterioPosicion {
  posiciones: string
  funcion: string
  /** Pmín en o por debajo del cual la llanta queda CRÍTICA (inmovilización / cambio) */
  critico: number
  /** Pmín de atención (cambio proyectado) */
  atencion: number
  /** Condiciones de descarte directo (expresiones sobre «Condiciones irregulares») */
  descarte: { nombre: string; re: RegExp }[]
  prioridad: string
  accion: string
}
const LISA = { nombre: 'Lisa', re: /lisa|l[ií]mite de desgaste/i }
const CORTE = { nombre: 'Rasgada / cortada', re: /corte|rasgad/i }
const ALAMBRE = { nombre: 'Se le ve el alambre', re: /alambre|lona/i }
const NO_TIENE = { nombre: 'No tiene llanta', re: /no tiene llanta/i }
const HERNIA = { nombre: 'Hernia / deformación', re: /hernia|abultam|deformaci|huevo/i }
/**
 * Tabla de criterios por grupo de posición, tal como la hoja de criterios (umbrales en mm de remanente mínimo).
 * Para cambiar un umbral o una acción basta con editar esta tabla.
 */
export const CRITERIOS: Record<Exclude<CategoriaPosicion, 'Repuesto'>, CriterioPosicion> = {
  'Direccional': { posiciones: 'Posiciones 1 y 2 (eje direccional / delantero)', funcion: 'Eje direccional principal: maniobrabilidad, estabilidad y guiado',
    critico: 3, atencion: 4, descarte: [LISA, CORTE, ALAMBRE, NO_TIENE, HERNIA, { nombre: 'Desgaste irregular severo', re: /^$/ }],
    prioridad: 'Nivel 1 (Inmediata / Prioridad 0)', accion: 'Inmovilización y retiro inmediato. Prohibido el uso de reencauches o llantas con reparaciones en flancos.' },
  'Segundo direccional': { posiciones: 'Posiciones 3 y 4 (segundo eje direccional, 8x4)', funcion: 'Segundo eje direccional / guiado auxiliar: soporte de peso direccional',
    critico: 3, atencion: 4, descarte: [LISA, CORTE, ALAMBRE, NO_TIENE, HERNIA],
    prioridad: 'Nivel 1 (Inmediata)', accion: 'Retiro inmediato. No se admiten parches estructurales en flanco.' },
  'Tracción': { posiciones: 'Posiciones 3 a 10 (ejes de tracción / motrices)', funcion: 'Ejes motrices (pachas tándem): transmisión de torque y empuje de carga',
    critico: 3, atencion: MM_PROYECTADO, descarte: [LISA, CORTE, ALAMBRE, NO_TIENE, HERNIA],
    prioridad: 'Nivel 1 / Nivel 2', accion: 'Retiro para evaluación de carcasa. Apta para reencauche si la carcasa no presenta fatiga estructural.' },
  'Arrastre': { posiciones: 'Posiciones 7 a 18 (arrastre / remolques / volcos)', funcion: 'Ejes libres de arrastre: soporte de carga sin transmisión de torque',
    critico: 2, atencion: 3, descarte: [LISA, CORTE, ALAMBRE, NO_TIENE, HERNIA],
    prioridad: 'Nivel 2 (Próxima SOLPED)', accion: 'Desmonte e intervención. Posición final en la «cascada de vida útil» antes de la baja definitiva.' },
  'OTR': { posiciones: 'Posiciones 1 a 4 (equipos OTR / patio)', funcion: 'Ejes de operación OTR: tracción severa en terreno no preparado',
    critico: 5, atencion: 6, descarte: [{ nombre: 'Corte profundo en flanco', re: /corte|rasgad/i }, { nombre: 'Desprendimiento de tacos / banda', re: /desprend|taco/i }, { nombre: 'Fuga de aire por ceja', re: /fuga|ceja/i }, NO_TIENE, HERNIA],
    prioridad: 'Nivel 1 (Inmediata)', accion: 'Reparación vulcanizada OTR o cambio. La falla inmoviliza la producción de planta o cantera.' },
  'Liviano': { posiciones: 'Posiciones 1 a 4 (vehículos livianos)', funcion: 'Ejes únicos direccionales y de tracción liviana',
    critico: 2, atencion: 3, descarte: [LISA, { nombre: 'Deformación / huevo', re: /hernia|abultam|deformaci|huevo/i }, { nombre: 'Corte', re: /corte|rasgad/i }, NO_TIENE],
    prioridad: 'Nivel 1 (Inmediata)', accion: 'Cambio inmediato. Alto riesgo de aquaplaning y pérdida de adherencia.' },
}
/** Regla 1: factor de severidad para cualquier fallo en las posiciones 1 a 4 (escala a Urgencia absoluta / Prioridad 0) */
export const FACTOR_DIRECCIONAL = 1.5
/** Regla 2: remanente en el que una llanta de posición 1-2 debe pasar al eje de tracción */
export const ROTACION_MIN = 5
export const ROTACION_MAX = 6
/** Regla 2: profundidad de diseño de una llanta nueva para las posiciones 1-2 */
export const PROF_NUEVA_MIN = 15

/** Grupo de posición de la llanta según su tipo de equipo, su posición y su eje */
export function categoriaPosicion(tipo: string, posicion: string, eje: string, ejesEquipo: number, llantasEquipo: number): CategoriaPosicion {
  const pos = parseInt(posicion, 10)
  const nEje = parseInt(eje.replace(/\D+/g, ''), 10)
  if (!Number.isFinite(pos) && !Number.isFinite(nEje)) return 'Repuesto'
  const t = tipo.toUpperCase()
  if (/CAMIONETA|MOTO/.test(t)) return 'Liviano'
  if (/CARGADOR|EXCAVADORA|BOBCAT|MINICARGADOR|RETRO/.test(t)) return 'OTR'
  if (/VOLCO|REMOLQUE|TRAILER|TR[AÁ]ILER|CAMABAJA|BOMBA ESTACIONARIA/.test(t)) return 'Arrastre'
  // Tractocamión: más allá de la posición 10 (o del 4.º eje) es el remolque
  if (/TRACTO/.test(t) && ((pos > 10) || nEje >= 4)) return 'Arrastre'
  if (pos === 1 || pos === 2 || nEje === 1) return 'Direccional'
  // 8x4 (cuatro manos): 4 ejes o 12 llantas; el segundo eje también es direccional
  const ochoPorCuatro = ejesEquipo >= 4 || llantasEquipo >= 12
  if (ochoPorCuatro && (pos === 3 || pos === 4 || nEje === 2)) return 'Segundo direccional'
  return 'Tracción'
}

export interface AlertaLlanta {
  categoria: CategoriaPosicion
  criterio: CriterioPosicion | null
  nivel: 'Crítica' | 'Atención' | 'OK'
  /** Por qué: umbral de remanente superado o condición de descarte */
  motivos: string[]
  prioridad: string
  /** Regla 1: fallo en las posiciones 1 a 4 → Urgencia absoluta (Prioridad 0) */
  urgenciaAbsoluta: boolean
  /** Puntaje para ordenar: crítica 10, atención 5, × 1,5 en las posiciones 1 a 4 */
  severidad: number
  accion: string
  /** Regla 2: sugerencias de la cascada de posiciones */
  sugerencias: string[]
  /** Regla 3: llanta reencauchada o con reparación estructural montada en las posiciones 1 a 4 */
  bloqueoOt: string | null
}

export interface FiltrosLlantas {
  fechaInicio?: string
  fechaFin?: string
  /** Vacío = todas */
  plantas?: string[]
  tipos?: string[]
  placas?: string[]
  marcas?: string[]
}

type Fila = Record<string, unknown>
export interface Historial {
  idInspeccion: string; fecha: number; evaluador: string; lectura: number; unidad: string; psi: number
  profExterna: number; profCentral: number; profInterna: number; condiciones: string; planAccion: string; eje: string; posicion: string
}
export interface Inspeccion {
  id: string; fecha: number; iso: string; evaluador: string; lectura: number; unidad: string; psi: number
  ext: number; cen: number; int: number; remanente: number; condiciones: string[]; plan: string[]
}
export interface Llanta {
  id: string; serie: string; marca: string; modelo: string; dimension: string; planta: string; estado: string
  /** Rodando (montada), en almacén/taller (stock), dada de baja o sin estado en la hoja */
  ubicacionTipo: 'rodando' | 'stock' | 'baja' | 'sin estado'
  ubicacion: string; tipo: string; placa: string; eje: string; lado: string; posicion: string; aplicacion: string
  costo: number; fechaRegistro: number; fechaCompra: number; fechaInicial: number; profInicial: number
  dotTexto: string; dotFecha: Date | null; dotAnios: number | null
  historial: Historial[]
  /** Última inspección dentro del rango de fechas (null = sin inspección en el período) */
  insp: Inspeccion | null
  anterior: { fecha: number; remanente: number; fuente: 'inspección' | 'inicial' } | null
  /** mm por mes; null si no hay medición anterior válida */
  desgasteMes: number | null
  semaforo: Semaforo | null
  presion: Presion | null
  dano: boolean
  causa: 'Desgaste' | 'Daño' | null
  difTransversal: number
  /** Inspección que reporta «No tiene llanta» (posición vacía) */
  sinLlanta: boolean
  /** Lectura del equipo (km u horas) al montar la llanta */
  lecturaInicial: number; unidadInicial: string
  /** Eventos de la hoja Cronologia_Llantas_Concreos de esta llanta */
  crono: CronoLlanta[]
  equipoId: string
  /** Descripción del equipo en el maestro (p. ej. «MIXER: TTP243 7M3 MACK 2014 C019») */
  vehiculo: string
  /** Profundidades iniciales del inventario (mm) */
  profIniExt: number; profIniCen: number; profIniInt: number
  /** Último cambio de la hoja de cronología hasta la fecha de corte */
  ultimoCambio: CronoLlanta | null
  /** Evaluación con los criterios de inspección por posición (null = sin inspección en el período) */
  alerta: AlertaLlanta | null
}

// ---------------------------------------------------------------- Cronología
/** Registro de la hoja de cronología ya enlazado a la llanta (lo arma api/_lib/llantas.ts) */
export interface CronoLlanta {
  id: string; idFormulario: string; idLlanta: string; idInspeccion: string; hoja: string; fecha: number; usuario: string; accion: string
  tipo: TipoEvento; cambios: { campo: string; de: string; a: string }[]; detalle: string
}
export type TipoEvento = 'compra' | 'registro' | 'montaje' | 'inspeccion' | 'rotacion' | 'traslado' | 'desmontaje' | 'reencauche' | 'baja' | 'correccion' | 'modificacion' | 'ot'
export const EVENTO_LBL: Record<TipoEvento, string> = {
  compra: 'Compra', registro: 'Registro en inventario', montaje: 'Montaje', inspeccion: 'Inspección', rotacion: 'Rotación / cambio de posición',
  traslado: 'Cambio de placa', desmontaje: 'Desmontaje', reencauche: 'Reencauche', baja: 'Baja', correccion: 'Corrección de medición',
  modificacion: 'Actualización de datos', ot: 'OT de llantas',
}
export const EVENTO_COLOR: Record<TipoEvento, string> = {
  compra: '#0EA5E9', registro: '#64748B', montaje: '#10B981', inspeccion: '#3B82F6', rotacion: '#8B5CF6', traslado: '#A855F7',
  desmontaje: '#F59E0B', reencauche: '#06B6D4', baja: '#EF4444', correccion: '#F97316', modificacion: '#94A3B8', ot: '#EC4899',
}
/** Un hito de la línea de tiempo de una llanta */
export interface EventoLlanta {
  /** Serial de fecha (con fracción de hora); 0 = fecha no registrada */
  fecha: number
  tipo: TipoEvento
  titulo: string
  detalle: string
  placa: string
  posicion: string
  /** Remanente (mm), PSI y lectura del equipo en ese momento, si se conocen */
  mm: number | null
  psi: number | null
  lectura: number | null
  unidad: string
  responsable: string
  /** De dónde sale: la cronología oficial o reconstruido desde el inventario, las inspecciones o las OT */
  fuente: 'Cronología' | 'Inventario' | 'Inspección' | 'OT'
  idLlanta: string
  /** Campos del evento en formato «campo: de → a» (igual que la cronología de las OT) */
  cambios: CambioEvento[]
}
export interface CambioEvento { campo: string; de: string; a: string }
/** Vida útil y recorrido calculados con la línea de tiempo */
export interface VidaLlanta {
  /** Fecha de montaje (serial) usada como inicio de servicio */
  inicio: number
  fin: number
  diasServicio: number | null
  mmConsumidos: number | null
  recorrido: number | null
  unidad: string
  /** km (u horas) por mm de caucho */
  porMm: number | null
  /** mm perdidos por cada 1.000 km (u horas) */
  mmPorMil: number | null
  rotaciones: number
  /** Tramos placa/posición con su duración */
  posiciones: { placa: string; posicion: string; desde: number; hasta: number; dias: number }[]
  /** Meses que le quedan hasta el límite de cambio al ritmo de desgaste actual */
  vidaRestanteMeses: number | null
  /** km (u horas) que le quedan con su rendimiento por mm */
  vidaRestanteRecorrido: number | null
  /** Vida útil total estimada (servicio + restante), en meses */
  vidaTotalMeses: number | null
}

// ---------------------------------------------------------------- Normalización
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const txt = (v: unknown) => (v == null ? '' : String(v).trim())
export const isoDe = (serial: number) => (serial > 0 ? serialToDate(serial).toISOString().slice(0, 10) : '')
/** Serial de fecha creíble (entre 2000 y 2100); los registros con 158092, 241588… son digitaciones erradas */
export const fechaValida = (s: number) => s > 36526 && s < 73051

/** Marca normalizada (la hoja trae «KUMHO » / «KUHMO», «DOBLECOIN» / «DOUBLECOIN», sufijos «- REPUESTO»…) */
export function normMarca(m: unknown): string {
  let s = txt(m).toUpperCase()
  s = s.replace(/\s*[/-]\s*(REPUESTO|EMERGENCIA).*/i, '').replace(/\bREPUESTO\b/i, '').replace(/[\s/-]+$/, '').replace(/\s+/g, ' ').trim()
  const alias: Record<string, string> = {
    KUHMO: 'KUMHO', 'KUMHO KMD41': 'KUMHO', DOBLECOIN: 'DOUBLE COIN', DOUBLECOIN: 'DOUBLE COIN', 'DOBLECOIN RLB800': 'DOUBLE COIN',
    BRIDG: 'BRIDGESTONE', 'MULTIAXLE SESTANTE': 'SESTANTE', LANDI: 'LANDY',
  }
  return alias[s] || s || 'SIN MARCA'
}
/** Dimensión con el formato habitual (sin espacios; «11R/22.5» → «11R22.5») */
export function normDimension(d: unknown): string {
  const s = txt(d).toUpperCase().replace(/\s+/g, '').replace(/R\/(\d)/, 'R$1')
  return s || 'Sin dimensión'
}
/** Condiciones / planes separados por coma en la hoja → lista sin «Sin novedad» */
function lista(v: unknown): string[] {
  return txt(v).split(',').map(x => x.trim()).filter(Boolean)
}
const esDanoCritico = (c: string) => /corte|rasgad|hernia|abultam|alambre/i.test(c)
const esLimiteDesgaste = (c: string) => /l[ií]mite de desgaste|lisa/i.test(c)
/** Plan de acción que requiere hacer algo (no «ESTA BIEN») */
export const planAccionable = (p: string) => !/^est[aá] bien$/i.test(p.trim())

/** DOT: serial de fecha, «SSAA» (semana y año) o texto ilegible */
function leerDot(v: unknown): Date | null {
  if (typeof v === 'number' && fechaValida(v)) return serialToDate(v)
  const s = txt(v)
  const m = s.match(/^(\d{2})(\d{2})$/)
  if (m && +m[1] >= 1 && +m[1] <= 53) return new Date(Date.UTC(2000 + +m[2], 0, 1 + (+m[1] - 1) * 7))
  return null
}

function ubicacionTipo(estado: string): Llanta['ubicacionTipo'] {
  const e = estado.toUpperCase()
  if (!e) return 'sin estado'
  if (/DESECH|BAJA|CHATARR/.test(e)) return 'baja'
  if (/ALMAC|STOCK|TALLER|BODEGA|NUEVA|REENC/.test(e)) return 'stock'
  return 'rodando'
}

/** Remanente = la menor de las tres profundidades medidas */
const fmtMm = (v: unknown) => { const n = Number(v); return n > 0 ? n.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }
/** Campo de la cronología → columna del inventario normalizado (null = no afecta el inventario) */
function campoInventario(campo: string): string | null {
  const c = campo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/placa/.test(c)) return 'Placa'
  if (/\(eje\)|^eje/.test(c)) return 'Eje'
  if (/lado/.test(c)) return 'Lado'
  if (/posici/.test(c)) return 'Posición'
  if (/estado/.test(c)) return 'Estado'
  if (/planta/.test(c)) return 'Planta'
  if (/costo/.test(c)) return 'Costo Adquisición'
  if (/marca/.test(c)) return 'Marca'
  if (/dimensi/.test(c)) return 'Dimensión'
  if (/aplicaci/.test(c)) return 'Aplicación'
  if (/tipo de vehiculo/.test(c)) return 'Tipo de Vehículo'
  return null
}
/** Posiciones citadas en un texto de OT: «llanta #3», «llanta número 9», «posición 5», «#1 y #2» */
function posicionesEnTexto(t: string): string[] {
  const out = new Set<string>()
  for (const m of t.matchAll(/(?:llanta|posici[oó]n|pos\.?)\s*(?:n[uú]mero|no\.?|#)?\s*(\d{1,2})|#\s*(\d{1,2})/gi)) out.add(m[1] ?? m[2])
  return [...out]
}
const remanenteDe = (a: number, b: number, c: number) => { const v = [a, b, c].filter(x => x > 0); return v.length ? Math.min(...v) : 0 }

// ---------------------------------------------------------------- OT de llantas
export interface OtLlanta { nro: string; fecha: number; iso: string; placa: string; planta: string; proveedor: string; costo: number; estado: string; actividad: string; destino: string; condicion: string; posicion: string; descripcion: string }
export function esOtLlanta(r: Fila): boolean {
  const subs = (r['_subOrdenes'] as { sistemaTexto?: string }[] | undefined) ?? []
  // Del sistema «LLANTAS Y RINES» solo lo que toca la llanta (no rodamientos, pernos ni rines)
  return subs.some(s => /servicio llantero|neum[aá]tico|alineaci[oó]n|v[aá]lvula/i.test(String(s.sistemaTexto ?? ''))) || !!txt(r['Tipo Actividad Llanta'])
}

// ---------------------------------------------------------------- Modelo
export function useLlantas(
  data: Ref<Record<string, unknown> | null | undefined>,
  otRows: Ref<Fila[] | null | undefined>,
  filtros: Ref<FiltrosLlantas>,
) {
  const inventarioCrudo = computed(() => ((data.value?.inventario ?? []) as Fila[]))
  const inspeccionesCrudas = computed(() => ((data.value?.inspecciones ?? []) as Fila[]))
  const evidencias = computed(() => ((data.value?.evidencias ?? []) as Fila[]))
  const equiposMaestro = computed(() => ((data.value?.equipos ?? []) as Fila[]))
  /** Cronología oficial normalizada (vacía mientras la hoja no tenga registros) */
  const cronologia = computed<CronoLlanta[]>(() => ((data.value?.cronologia ?? []) as Fila[]).map(c => ({
    id: txt(c['Id']), idFormulario: txt(c['Id Formulario']), idLlanta: txt(c['Id Llanta']), idInspeccion: txt(c['Id Inspección']), hoja: txt(c['Hoja']), fecha: num(c['Fecha']),
    usuario: txt(c['Usuario']), accion: txt(c['Acción']), tipo: (txt(c['Tipo']) || 'modificacion') as TipoEvento,
    cambios: ((c['Cambios'] as CronoLlanta['cambios'] | undefined) ?? []), detalle: txt(c['Detalle']),
  })))
  const equipoPorId = computed(() => new Map(equiposMaestro.value.map(e => [txt(e['Equipo ID']), e])))
  /** Clasificación, prioridad de compra, acción y reglas especiales (1: severidad en pos. 1-4; 2: cascada; 3: bloqueo de OT) */
  function armarAlerta(categoria: CategoriaPosicion, crit: CriterioPosicion | null, nivel: AlertaLlanta['nivel'], motivos: string[], posicion: string,
    insp: Inspeccion | null, profInicial: number, id: string, placa: string, estado: string, fechaInicial: number, fechaRegistro: number): AlertaLlanta | null {
    if (!insp) return null
    const pos = parseInt(posicion, 10)
    const pos14 = pos >= 1 && pos <= 4
    const pos12 = pos === 1 || pos === 2
    const urgenciaAbsoluta = nivel === 'Crítica' && pos14
    const prioridadBase = crit?.prioridad ?? 'Nivel 2'
    const prioridad = nivel === 'OK' ? '—' : urgenciaAbsoluta ? 'Prioridad 0 (Urgencia absoluta)'
      : nivel === 'Atención' ? 'Programar (siguiente SOLPED)'
      : categoria === 'Tracción' ? (motivos.some(m => m.startsWith('Descarte')) ? 'Nivel 1 (Inmediata)' : 'Nivel 2 (Próxima SOLPED)') : prioridadBase
    const sugerencias: string[] = []
    if (pos12 && insp.remanente >= ROTACION_MIN && insp.remanente <= ROTACION_MAX)
      sugerencias.push(`Rotar al eje de tracción (P1-P2 con ${fmtMm(insp.remanente)} mm): seguirá en servicio hasta ${fmtMm(CRITERIOS['Tracción'].critico)} mm`)
    // Solo para montajes posteriores al cargue del inventario (la profundidad inicial del cargue es la de ese día, no la de montaje)
    if (pos12 && profInicial > 0 && profInicial < PROF_NUEVA_MIN && fechaInicial > fechaRegistro)
      sugerencias.push(`Las posiciones 1-2 son solo para llantas nuevas (${PROF_NUEVA_MIN}-18 mm); esta se montó con ${fmtMm(profInicial)} mm`)
    // Regla 3: reencauche o reparación estructural registrada (estado, cronología u OT de su posición)
    const reparada = /reenc/i.test(estado) || (cronoPorLlanta.value.get(id) ?? []).some(c => c.tipo === 'reencauche' || c.cambios.some(x => /reenc|vulcaniz/i.test(x.a)))
      || otLlantas.value.some(o => o.placa === placa && /vulcaniz|reencauch|reparaci[oó]n estructural/i.test(`${o.descripcion} ${o.destino}`) && /llant/i.test(o.descripcion + o.actividad)
        // La OT debe ser de esta posición (campo de posición o «llanta #3» / «posición 3» en la descripción)
        && (o.posicion === posicion || (!o.posicion && posicionesEnTexto(o.descripcion).includes(posicion))))
    const bloqueoOt = pos14 && reparada ? 'Llanta reencauchada o con reparación estructural en posición 1-4: la OT no se debe confirmar' : null
    return {
      categoria, criterio: crit, nivel, motivos, prioridad, urgenciaAbsoluta,
      severidad: (nivel === 'Crítica' ? 10 : nivel === 'Atención' ? 5 : 0) * (pos14 ? FACTOR_DIRECCIONAL : 1),
      accion: nivel === 'OK' ? (sugerencias.length ? 'Seguir la sugerencia de rotación' : 'Sin acción: mantener la rutina de inspección') : nivel === 'Atención' ? 'Programar el cambio en 30-60 días'
        : (crit?.accion ?? (motivos.some(m => /no tiene/i.test(m)) ? 'Reponer la llanta de repuesto' : 'Cambiar o reponer la llanta de repuesto')),
      sugerencias, bloqueoOt,
    }
  }
  const cronoPorLlanta = computed(() => {
    const m = new Map<string, CronoLlanta[]>()
    for (const c of cronologia.value) if (c.idLlanta) (m.get(c.idLlanta) ?? m.set(c.idLlanta, []).get(c.idLlanta)!).push(c)
    return m
  })

  const desde = computed(() => filtros.value.fechaInicio || '')
  const hasta = computed(() => filtros.value.fechaFin || '')
  const enRango = (iso: string) => !!iso && (!desde.value || iso >= desde.value) && (!hasta.value || iso <= hasta.value)

  // Llantas con su estado vigente (sin filtros de planta/placa todavía)
  /**
   * Inventario a la fecha de corte armado con la cronología (Cronologia_Llantas_Concreos): la fila del inventario
   * es el estado actual; los cambios registrados DESPUÉS del corte se deshacen (vuelve el valor «antes») y las
   * llantas creadas después del corte no cuentan. Sin filtro de fechas = estado actual con su último cambio.
   */
  const corteSerial = computed(() => (hasta.value ? Math.round(Date.parse(hasta.value) / 86400000) + 25569 + 1 : Infinity))
  function inventarioAlCorte(r: Fila): Fila | null {
    const cronos = cronoPorLlanta.value.get(txt(r['Id'])) ?? []
    if (!cronos.length) return r
    const corte = corteSerial.value
    if (cronos.some(c => c.tipo === 'registro' && c.fecha >= corte)) return null
    const fila: Fila = { ...r }
    for (const c of [...cronos].filter(x => x.fecha >= corte).sort((a, b) => b.fecha - a.fecha)) {
      for (const x of c.cambios) {
        const k = campoInventario(x.campo)
        if (k) fila[k] = k === 'Costo Adquisición' ? num(x.de.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) : x.de
      }
    }
    const previos = cronos.filter(x => x.fecha < corte).sort((a, b) => b.fecha - a.fecha)
    fila['_ultimoCambio'] = previos[0] ?? null
    return fila
  }

  const todas = computed<Llanta[]>(() => {
    const hoy = Date.now()
    return inventarioCrudo.value.map(inventarioAlCorte).filter((r): r is Fila => r !== null).map(r => {
      const historial = ((r['_historial'] as Historial[] | undefined) ?? []).map(h => ({ ...h, fecha: num(h.fecha) }))
      const enPeriodo = historial.filter(h => enRango(isoDe(h.fecha)))
      const u = enPeriodo[enPeriodo.length - 1] ?? null
      const insp: Inspeccion | null = u ? {
        id: txt(u.idInspeccion), fecha: u.fecha, iso: isoDe(u.fecha), evaluador: txt(u.evaluador), lectura: num(u.lectura), unidad: txt(u.unidad), psi: num(u.psi),
        ext: num(u.profExterna), cen: num(u.profCentral), int: num(u.profInterna),
        remanente: remanenteDe(num(u.profExterna), num(u.profCentral), num(u.profInterna)),
        condiciones: lista(u.condiciones).filter(c => !/^sin novedad/i.test(c)),
        plan: lista(u.planAccion),
      } : null
      const sinLlanta = !!insp && insp.condiciones.some(c => /no tiene llanta/i.test(c))

      // Medición anterior: inspección previa de la llanta o la profundidad inicial con su fecha
      const fechaInicial = num(r['Fecha Inicial'])
      const profInicial = num(r['Prof. Inicial'])
      let anterior: Llanta['anterior'] = null
      if (insp) {
        const previas = historial.filter(h => h.fecha < insp.fecha && remanenteDe(num(h.profExterna), num(h.profCentral), num(h.profInterna)) > 0)
        const p = previas[previas.length - 1]
        if (p) anterior = { fecha: p.fecha, remanente: remanenteDe(num(p.profExterna), num(p.profCentral), num(p.profInterna)), fuente: 'inspección' }
        else if (fechaValida(fechaInicial) && fechaInicial < insp.fecha && profInicial > 0) anterior = { fecha: fechaInicial, remanente: profInicial, fuente: 'inicial' }
      }
      const dias = insp && anterior ? insp.fecha - anterior.fecha : 0
      const desgasteMes = insp && anterior && insp.remanente > 0 && dias >= DIAS_MIN_DESGASTE ? ((anterior.remanente - insp.remanente) / dias) * 30 : null

      // Criterio de inspección según el grupo de posición (direccional, tracción, arrastre, OTR, liviano)
      const equipo = equipoPorId.value.get(txt(r['Equipo ID']))
      const posActual = (u?.posicion ? txt(u.posicion) : '') || txt(r['Posición'])
      const categoria = categoriaPosicion(txt(r['Tipo de Vehículo']) || txt(equipo?.['Tipo']), posActual, txt(r['Eje']), num(equipo?.['Ejes']), num(equipo?.['Llantas']))
      const crit = categoria === 'Repuesto' ? null : CRITERIOS[categoria]
      let semaforo: Semaforo | null = null
      let dano = false, causa: Llanta['causa'] = null
      const motivos: string[] = []
      let nivel: AlertaLlanta['nivel'] = 'OK'
      if (insp && (sinLlanta || insp.remanente > 0)) {
        dano = insp.condiciones.some(esDanoCritico)
        const critico = crit?.critico ?? MM_INMEDIATO, atencion = crit?.atencion ?? MM_PROYECTADO
        for (const d of crit?.descarte ?? [LISA, CORTE, ALAMBRE, NO_TIENE, HERNIA]) {
          const severo = d.nombre === 'Desgaste irregular severo'
            // Desgaste lateral reportado y diferencia entre hombros mayor al límite
            ? insp.condiciones.some(c => /lateral|unilateral/i.test(c)) && insp.ext > 0 && insp.int > 0 && Math.abs(insp.ext - insp.int) > DIF_TRANSVERSAL
            : insp.condiciones.some(c => d.re.test(c))
          if (severo) motivos.push(`Descarte directo: ${d.nombre.toLowerCase()}`)
        }
        if (!sinLlanta && insp.remanente <= critico) motivos.push(`Pmín ${fmtMm(insp.remanente)} mm ≤ ${fmtMm(critico)} mm${crit && crit.atencion > crit.critico && categoria !== 'Tracción' ? ' (inmovilización)' : ''}`)
        nivel = motivos.length ? 'Crítica' : !sinLlanta && insp.remanente <= atencion ? 'Atención' : 'OK'
        if (nivel === 'Atención') motivos.push(`Pmín ${fmtMm(insp.remanente)} mm ≤ ${fmtMm(atencion)} mm (atención)`)
        if (!sinLlanta) {
          semaforo = nivel === 'Crítica' ? 'inmediato' : nivel === 'Atención' ? 'proyectado' : 'bueno'
          // El plan del inspector puede subir la severidad (nunca bajarla)
          if (PLAN_INSPECTOR_MANDA) {
            if (semaforo !== 'inmediato' && insp.plan.some(p => /cambio inmediato/i.test(p))) { semaforo = 'inmediato'; motivos.push('El inspector marcó cambio inmediato') }
            else if (semaforo === 'bueno' && insp.plan.some(p => /cambio proyectado/i.test(p))) { semaforo = 'proyectado'; motivos.push('El inspector marcó cambio proyectado') }
          }
          if (semaforo === 'inmediato') causa = dano ? 'Daño' : 'Desgaste'
        }
      }
      const presion: Presion | null = !insp || sinLlanta ? null : insp.psi <= 0 ? 'Sin medir' : insp.psi < PSI_MIN ? 'Baja' : insp.psi > PSI_MAX ? 'Alta' : 'Correcta'

      const dotRaw = r['DOT']
      const dotFecha = leerDot(dotRaw)
      const estado = txt(r['Estado'])
      const tipoU = ubicacionTipo(estado)
      const placa = txt(r['Placa']).toUpperCase()
      return {
        id: txt(r['Id']), serie: txt(r['Nº Serie']), marca: normMarca(r['Marca']), modelo: txt(r['Modelo']), dimension: normDimension(r['Dimensión']),
        planta: nombrePlanta(r['Planta']), estado: estado || 'Sin estado', ubicacionTipo: tipoU,
        ubicacion: tipoU === 'rodando' || (tipoU === 'sin estado' && placa) ? placa || 'Sin placa' : tipoU === 'baja' ? 'Baja' : 'Almacén',
        tipo: txt(r['Tipo de Vehículo']).toUpperCase() || 'SIN TIPO', placa: placa || 'SIN PLACA',
        eje: txt(r['Eje']), lado: txt(r['Lado']), posicion: txt(r['Posición']), aplicacion: txt(r['Aplicación']),
        costo: num(r['Costo Adquisición']), fechaRegistro: num(r['Fecha Registro']), fechaCompra: num(r['Fecha Compra']),
        fechaInicial, profInicial,
        dotTexto: typeof dotRaw === 'number' ? (dotFecha ? isoDe(dotRaw) : String(dotRaw)) : txt(dotRaw),
        dotFecha, dotAnios: dotFecha ? (hoy - dotFecha.getTime()) / (365.25 * 86400000) : null,
        historial, insp, anterior, desgasteMes, semaforo, presion, dano, causa,
        difTransversal: insp && insp.ext > 0 && insp.int > 0 ? Math.abs(insp.ext - insp.int) : 0,
        sinLlanta,
        lecturaInicial: num(r['Lectura Inicial']), unidadInicial: txt(r['Unidad Inicial']),
        crono: cronoPorLlanta.value.get(txt(r['Id'])) ?? [],
        equipoId: txt(r['Equipo ID']),
        vehiculo: txt(r['Vehículo']),
        profIniExt: num(r['Prof. Externa']), profIniCen: num(r['Prof. Central']), profIniInt: num(r['Prof. Interna']),
        ultimoCambio: (r['_ultimoCambio'] as CronoLlanta | null | undefined) ?? null,
        alerta: armarAlerta(categoria, crit, semaforo === 'inmediato' ? 'Crítica' : semaforo === 'proyectado' ? 'Atención' : nivel, motivos, posActual, insp, profInicial, txt(r['Id']), placa, estado, fechaInicial, num(r['Fecha Registro'])),
      }
    })
  })

  // Filtros de arriba (vacío = todos)
  const set = (a?: string[]) => (a && a.length ? new Set(a) : null)
  const fPlanta = computed(() => set(filtros.value.plantas))
  const fTipo = computed(() => set(filtros.value.tipos))
  const fPlaca = computed(() => set(filtros.value.placas))
  const fMarca = computed(() => set(filtros.value.marcas))
  const pasa = (l: { planta: string; tipo: string; placa: string; marca?: string }) =>
    (!fPlanta.value || fPlanta.value.has(l.planta)) && (!fTipo.value || fTipo.value.has(l.tipo)) &&
    (!fPlaca.value || fPlaca.value.has(l.placa)) && (!fMarca.value || !l.marca || fMarca.value.has(l.marca))

  /** Llantas del inventario que cumplen los filtros */
  const llantas = computed(() => todas.value.filter(pasa))
  /** Llantas con inspección en el período (sin las posiciones vacías) */
  const inspeccionadas = computed(() => llantas.value.filter(l => l.insp && !l.sinLlanta))
  const plantas = computed(() => ordenarPlantas(new Set(llantas.value.map(l => l.planta).filter(p => p !== 'Sin planta'))))

  // Inspecciones (una por placa y ronda) dentro del rango y los filtros
  const inspecciones = computed(() => inspeccionesCrudas.value.map(r => ({
    id: txt(r['Id']), fecha: num(r['Fecha']), iso: isoDe(num(r['Fecha'])), evaluador: txt(r['Evaluador']), planta: nombrePlanta(r['Planta']),
    placa: txt(r['Placa']).toUpperCase(), tipo: txt(r['Tipo de Vehículo']).toUpperCase() || 'SIN TIPO', lectura: num(r['Lectura']), unidad: txt(r['Unidad']),
    llantasEquipo: num(r['Llantas del Equipo']), inspeccionadas: num(r['Llantas Inspeccionadas']), fotos: num(r['Fotos']), consecutivo: txt(r['Consecutivo']),
  })).filter(i => enRango(i.iso) && pasa(i)))

  // ---------------------------------------------------------------- OT de llantas (Mantenimiento Concretos)
  const otLlantas = computed<OtLlanta[]>(() => (otRows.value ?? []).filter(esOtLlanta).map(r => {
    const fecha = num(r['FECHA'])
    return {
      nro: txt(r['Nº Orden de Trabajo']), fecha, iso: isoDe(fecha), placa: txt(r['Placa del Vehículo']).toUpperCase(),
      planta: nombrePlanta(txt(r['Localización']).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())),
      proveedor: txt(r['PROVEEDOR']) || 'Sin proveedor', costo: num(r['Costo servicios']) + num(r['Costos Insumos']), estado: txt(r['Estado']),
      actividad: txt(r['Tipo Actividad Llanta']), destino: txt(r['Destino Llanta']), condicion: txt(r['Condición Llanta']), posicion: txt(r['Posición Llanta']), descripcion: txt(r['Descripción']),
    }
  }))
  // ---------------------------------------------------------------- Línea de tiempo de cada llanta
  /**
   * Historia de la llanta en orden cronológico. Usa la cronología oficial cuando existe (montajes, rotaciones,
   * cambios de placa o de estado, bajas, reencauches) y la completa con lo que sí está registrado: compra,
   * montaje inicial (fecha inicial y profundidad del inventario), cada inspección (mm, PSI, plan, evaluador),
   * cambios de posición detectados entre inspecciones y las OT de llantas de su placa desde el montaje.
   */
  const memoLinea = new WeakMap<Llanta, EventoLlanta[]>()
  function lineaTiempo(l: Llanta): EventoLlanta[] {
    const hecho = memoLinea.get(l)
    if (hecho) return hecho
    const ev: EventoLlanta[] = []
    const base = { placa: l.placa, posicion: l.posicion, mm: null, psi: null, lectura: null, unidad: '', responsable: '', idLlanta: l.id, cambios: [] as CambioEvento[] }
    const tiposCrono = new Set(l.crono.map(c => c.tipo))
    const c = (campo: string, a: unknown, de: unknown = ''): CambioEvento | null => (txt(a) || txt(de) ? { campo, de: txt(de), a: txt(a) || '—' } : null)
    const lista = (...xs: (CambioEvento | null)[]) => xs.filter((x): x is CambioEvento => !!x)
    const lect = (v: number, u: string) => (v > 0 ? `${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}${u ? ' ' + u : ''}` : '')
    if (fechaValida(l.fechaCompra)) ev.push({ ...base, fecha: l.fechaCompra, tipo: 'compra', titulo: 'Compra', fuente: 'Inventario',
      detalle: l.costo ? `Costo ${l.costo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}` : 'Sin costo registrado',
      cambios: lista(c('Llanta', `${l.marca} ${l.dimension}`), c('Costo', l.costo ? l.costo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : 'Sin costo registrado')) })
    // Montaje inicial: «Fecha inicial» con la profundidad y la lectura del equipo de ese día
    const inicio = fechaValida(l.fechaInicial) ? l.fechaInicial : 0
    const primeraPos = l.historial[0]?.posicion || l.posicion
    if (inicio && !tiposCrono.has('montaje')) ev.push({ ...base, fecha: inicio, tipo: 'montaje', titulo: 'Montaje inicial', posicion: primeraPos,
      detalle: `${l.aplicacion || 'Posición'} ${[l.eje, l.lado].filter(Boolean).join(' · ')}`.trim(), mm: l.profInicial || null,
      lectura: l.lecturaInicial || null, unidad: l.unidadInicial, fuente: 'Inventario',
      cambios: lista(c('Placa', l.placa), c('Posición', primeraPos ? `P${primeraPos}` : ''), c('Eje / lado', [l.eje, l.lado].filter(Boolean).join(' · ')),
        c('Profundidad inicial', l.profInicial ? `${fmtMm(l.profInicial)} mm` : ''), c('Lectura del equipo', lect(l.lecturaInicial, l.unidadInicial))) })
    if (fechaValida(l.fechaRegistro) && !l.crono.some(x => x.tipo === 'registro')) ev.push({ ...base, fecha: l.fechaRegistro, tipo: 'registro', titulo: 'Registro en inventario',
      detalle: `Serie ${l.serie || 'sin serie'} · ${l.marca} ${l.dimension}`, fuente: 'Inventario',
      cambios: lista(c('Serie', l.serie || 'sin serie'), c('Marca', l.marca), c('Dimensión', l.dimension), c('Estado', l.estado), c('Planta', l.planta)) })
    // Cronología oficial (campo de → a tal como lo registra la hoja)
    for (const x of l.crono) {
      const cambio = (re: RegExp) => x.cambios.find(y => re.test(y.campo.normalize('NFD').replace(/[̀-ͯ]/g, '')))
      const pos = cambio(/posici/i), placa = cambio(/placa/i)
      // La creación de la sub-inspección ya aparece como inspección (con sus mm y PSI)
      if (x.tipo === 'inspeccion' && l.historial.some(h => h.idInspeccion === x.idInspeccion)) continue
      ev.push({ ...base, fecha: x.fecha, tipo: x.tipo, titulo: x.accion || EVENTO_LBL[x.tipo], fuente: 'Cronología', responsable: x.usuario,
        placa: placa?.a || l.placa, posicion: pos?.a || '', cambios: x.cambios.map(y => ({ campo: y.campo, de: y.de, a: y.a || '—' })),
        detalle: x.cambios.length ? x.cambios.slice(0, 4).map(y => `${y.campo}: ${y.de || '—'} → ${y.a || '—'}`).join(' · ') : x.detalle || x.accion })
    }
    // Inspecciones: cada una frente a la medición anterior (profundidad, PSI, posición) y cambios de posición detectados
    let posAnterior = inicio ? primeraPos : ''
    let remAnterior = inicio && l.profInicial ? l.profInicial : 0
    let psiAnterior = 0
    for (const h of l.historial) {
      const rem = remanenteDe(num(h.profExterna), num(h.profCentral), num(h.profInterna))
      const cambioPos = !!(h.posicion && posAnterior && h.posicion !== posAnterior)
      if (cambioPos && !tiposCrono.has('rotacion'))
        ev.push({ ...base, fecha: h.fecha - 0.001, tipo: 'rotacion', titulo: 'Cambio de posición detectado', posicion: h.posicion, fuente: 'Inspección',
          detalle: `De la posición ${posAnterior} a la ${h.posicion} (detectado en la inspección)`, cambios: lista(c('Posición', `P${h.posicion}`, `P${posAnterior}`)) })
      ev.push({ ...base, fecha: h.fecha, tipo: 'inspeccion', titulo: 'Inspección', posicion: h.posicion || l.posicion, mm: rem || null, psi: num(h.psi) || null,
        lectura: num(h.lectura) || null, unidad: txt(h.unidad), responsable: txt(h.evaluador), fuente: 'Inspección',
        detalle: [`Ext ${fmtMm(h.profExterna)} · Cen ${fmtMm(h.profCentral)} · Int ${fmtMm(h.profInterna)} mm`, txt(h.condiciones), txt(h.planAccion) ? `Plan: ${txt(h.planAccion)}` : ''].filter(Boolean).join(' · '),
        cambios: lista(
          c('Profundidad', rem ? `${fmtMm(rem)} mm` : 'sin medir', remAnterior ? `${fmtMm(remAnterior)} mm` : ''),
          c('Ext / Cen / Int', `${fmtMm(h.profExterna)} / ${fmtMm(h.profCentral)} / ${fmtMm(h.profInterna)} mm`),
          c('PSI', num(h.psi) || 'sin medir', psiAnterior || ''),
          cambioPos && tiposCrono.has('rotacion') ? c('Posición', `P${h.posicion}`, `P${posAnterior}`) : null,
          c('Condición', txt(h.condiciones)), c('Plan de acción', txt(h.planAccion)), c('Lectura del equipo', lect(num(h.lectura), txt(h.unidad)))) })
      if (h.posicion) posAnterior = h.posicion
      if (rem) remAnterior = rem
      if (num(h.psi)) psiAnterior = num(h.psi)
    }
    // OT de llantas de la placa desde el montaje (de su posición o sin posición indicada)
    const desdeOt = inicio || (fechaValida(l.fechaRegistro) ? l.fechaRegistro : 0)
    for (const o of otLlantas.value) {
      if (o.placa !== l.placa || !o.fecha || o.fecha < desdeOt) continue
      const posOt = txt(o.posicion)
      if (posOt && l.posicion && posOt !== l.posicion) continue
      // Sin campo de posición pero con «llanta #3» en la descripción: solo para esas posiciones
      const citadas = posOt ? [] : posicionesEnTexto(o.descripcion)
      if (citadas.length && l.posicion && !citadas.includes(l.posicion)) continue
      ev.push({ ...base, fecha: o.fecha, tipo: 'ot', titulo: `OT ${o.nro}${o.actividad ? ' · ' + o.actividad : ''}`, fuente: 'OT', responsable: o.proveedor, posicion: posOt,
        detalle: `${o.descripcion || 'Servicio de llantas'}${posOt ? '' : ' (OT de la placa, sin posición indicada)'}${o.destino ? ` · Destino: ${o.destino}` : ''}`,
        cambios: lista(c('Actividad', o.actividad), c('Posición', posOt ? `P${posOt}` : 'sin posición (OT de la placa)'), c('Trabajo', o.descripcion || 'Servicio de llantas'),
          c('Destino de la llanta', o.destino), c('Condición', o.condicion), c('Estado OT', o.estado), c('Costo', o.costo ? o.costo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '')) })
    }
    // Baja sin fecha en la cronología: queda al final como estado actual
    if (l.ubicacionTipo === 'baja' && !tiposCrono.has('baja'))
      ev.push({ ...base, fecha: 0, tipo: 'baja', titulo: 'Dada de baja', detalle: `Estado actual: ${l.estado} (fecha no registrada)`, fuente: 'Inventario',
        cambios: lista(c('Estado', l.estado, 'En uso')) })
    const out = ev.sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity))
    memoLinea.set(l, out)
    return out
  }

  /** Remanente de cambio de la llanta según el criterio de su posición */
  const limiteMm = (l: Llanta) => l.alerta?.criterio?.critico ?? MM_INMEDIATO
  /** Vida útil, recorrido, rotaciones y tiempo por posición a partir de la línea de tiempo */
  const memoVida = new WeakMap<Llanta, VidaLlanta>()
  function vida(l: Llanta): VidaLlanta {
    const hecho = memoVida.get(l)
    if (hecho) return hecho
    const ev = lineaTiempo(l)
    const inicio = ev.find(e => e.tipo === 'montaje')?.fecha || (fechaValida(l.fechaInicial) ? l.fechaInicial : 0)
    const bajaEv = ev.find(e => e.tipo === 'baja' && e.fecha)
    const ultInsp = [...l.historial].reverse().find(h => remanenteDe(num(h.profExterna), num(h.profCentral), num(h.profInterna)) > 0)
    const hoySerial = Date.now() / 86400000 + 25569
    const fin = bajaEv?.fecha || (l.ubicacionTipo === 'baja' ? (ultInsp?.fecha ?? 0) : hoySerial)
    const diasServicio = inicio && fin > inicio ? fin - inicio : null
    const remActual = ultInsp ? remanenteDe(num(ultInsp.profExterna), num(ultInsp.profCentral), num(ultInsp.profInterna)) : 0
    const mmConsumidos = l.profInicial > 0 && remActual > 0 && l.profInicial >= remActual ? l.profInicial - remActual : null
    // Recorrido = lectura de la última inspección − lectura al montar (mismo equipo); se descartan lecturas incongruentes
    let recorrido: number | null = null
    const unidad = l.unidadInicial || txt(ultInsp?.unidad)
    if (ultInsp && num(ultInsp.lectura) > 0 && l.lecturaInicial > 0) {
      const d = num(ultInsp.lectura) - l.lecturaInicial
      const tope = unidad === 'h' ? 20000 : 300000
      if (d > 0 && d < tope) recorrido = d
    }
    const porMm = recorrido && mmConsumidos && mmConsumidos >= 0.5 ? recorrido / mmConsumidos : null
    const mmPorMil = recorrido && mmConsumidos !== null && recorrido >= 100 ? (mmConsumidos / recorrido) * 1000 : null
    // Tramos por posición: cada rotación o cambio de placa abre un tramo nuevo
    const cortes = ev.filter(e => (e.tipo === 'rotacion' || e.tipo === 'traslado' || e.tipo === 'montaje') && e.fecha)
    const posiciones: VidaLlanta['posiciones'] = []
    for (let i = 0; i < cortes.length; i++) {
      const desde = cortes[i].fecha, hasta = cortes[i + 1]?.fecha ?? fin
      posiciones.push({ placa: cortes[i].placa, posicion: cortes[i].posicion || l.posicion, desde, hasta, dias: Math.max(0, hasta - desde) })
    }
    const ritmo = l.desgasteMes !== null && l.desgasteMes > 0.05 ? l.desgasteMes : null
    const vidaRestanteMeses = ritmo && remActual > 0 && l.ubicacionTipo !== 'baja' ? Math.max(0, (remActual - limiteMm(l)) / ritmo) : null
    const out: VidaLlanta = {
      inicio, fin, diasServicio, mmConsumidos, recorrido, unidad, porMm, mmPorMil,
      rotaciones: ev.filter(e => e.tipo === 'rotacion').length,
      posiciones,
      vidaRestanteMeses,
      vidaRestanteRecorrido: porMm && remActual > limiteMm(l) ? (remActual - limiteMm(l)) * porMm : null,
      vidaTotalMeses: diasServicio !== null && vidaRestanteMeses !== null ? diasServicio / 30.44 + vidaRestanteMeses : null,
    }
    memoVida.set(l, out)
    return out
  }

  /** Cambios de todas las llantas (con los filtros de arriba) dentro del rango de fechas, del más reciente al más antiguo */
  // Una OT de la placa aparece en la historia de cada llanta, pero en el consolidado cuenta una sola vez
  const eventos = computed(() => {
    const otVistas = new Set<string>()
    return llantas.value.flatMap(l => lineaTiempo(l).filter(e => e.fecha > 0 && enRango(isoDe(Math.floor(e.fecha)))).map(e => ({ ...e, llanta: l })))
      .filter(e => {
        if (e.tipo !== 'ot') return true
        const k = `${e.placa}|${e.titulo}`
        if (otVistas.has(k)) return false
        otVistas.add(k); return true
      })
      .sort((a, b) => b.fecha - a.fecha)
  })
  const resumenCronologia = computed(() => {
    const porTipo = {} as Record<TipoEvento, number>
    for (const e of eventos.value) porTipo[e.tipo] = (porTipo[e.tipo] ?? 0) + 1
    const oficiales = eventos.value.filter(e => e.fuente === 'Cronología').length
    return { porTipo, total: eventos.value.length, oficiales, reconstruidos: eventos.value.length - oficiales, registrosHoja: cronologia.value.length }
  })
  /** Vida útil por marca: meses en servicio, recorrido por mm y vida total estimada */
  const vidaPorMarca = computed(() => {
    const m = new Map<string, VidaLlanta[]>()
    for (const l of inspeccionadas.value) (m.get(l.marca) ?? m.set(l.marca, []).get(l.marca)!).push(vida(l))
    const prom = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
    return [...m.entries()].map(([marca, vs]) => ({
      marca, n: vs.length,
      mesesServicio: prom(vs.map(v => (v.diasServicio !== null ? v.diasServicio / 30.44 : null))),
      vidaRestante: prom(vs.map(v => v.vidaRestanteMeses)),
      vidaTotal: prom(vs.map(v => v.vidaTotalMeses)),
      porMm: prom(vs.map(v => v.porMm)), nPorMm: vs.filter(v => v.porMm !== null).length,
      rotaciones: vs.reduce((a, v) => a + v.rotaciones, 0),
    })).filter(x => x.vidaTotal !== null || x.mesesServicio !== null).sort((a, b) => (b.vidaTotal ?? 0) - (a.vidaTotal ?? 0))
  })

  const placasInventario = computed(() => new Set(llantas.value.map(l => l.placa)))
  /** OT de llantas del período, de las placas que quedan con los filtros */
  const otPeriodo = computed(() => otLlantas.value.filter(o => enRango(o.iso) &&
    (!fPlanta.value || fPlanta.value.has(o.planta)) && (!fPlaca.value || fPlaca.value.has(o.placa)) &&
    (!fTipo.value || placasInventario.value.has(o.placa))))

  // ---------------------------------------------------------------- KPIs financieros y operativos
  const costosConValor = computed(() => llantas.value.filter(l => l.costo > 0))
  /** Costo promedio de una llanta (solo con costo de adquisición cargado) */
  const costoPromedio = computed(() => costosConValor.value.length ? costosConValor.value.reduce((a, l) => a + l.costo, 0) / costosConValor.value.length : 0)
  const valor = (l: Llanta) => l.costo || costoPromedio.value

  const financiero = computed(() => {
    const ls = llantas.value
    const compradas = ls.filter(l => enRango(isoDe(l.fechaCompra)))
    const bajas = ls.filter(l => l.ubicacionTipo === 'baja')
    const rodando = ls.filter(l => l.ubicacionTipo === 'rodando')
    const stock = ls.filter(l => l.ubicacionTipo === 'stock')
    const reencauche = ls.filter(l => /REENC/i.test(l.estado)).length + otPeriodo.value.filter(o => /REENC/i.test(o.destino)).length
    const otCosto = otPeriodo.value.reduce((a, o) => a + o.costo, 0)
    const compraCosto = compradas.reduce((a, l) => a + l.costo, 0)
    return {
      otCosto, otN: otPeriodo.value.length, compraCosto, compradas: compradas.length,
      inversion: otCosto + compraCosto,
      bajas: bajas.length, bajasValor: bajas.reduce((a, l) => a + valor(l), 0),
      rodando: rodando.length, rodandoValor: rodando.reduce((a, l) => a + valor(l), 0),
      stock: stock.length, stockValor: stock.reduce((a, l) => a + valor(l), 0),
      sinEstado: ls.filter(l => l.ubicacionTipo === 'sin estado').length,
      reencauche, conCosto: costosConValor.value.length, total: ls.length,
    }
  })

  // ---------------------------------------------------------------- Alertas por criterio de inspección
  /** Llantas con alerta (crítica, atención, sugerencia de rotación o bloqueo de OT), de mayor a menor severidad */
  const alertas = computed(() => llantas.value.filter(l => l.alerta && (l.alerta.nivel !== 'OK' || l.alerta.sugerencias.length || l.alerta.bloqueoOt))
    .sort((a, b) => b.alerta!.severidad - a.alerta!.severidad || (a.insp?.remanente ?? 0) - (b.insp?.remanente ?? 0)))
  const resumenAlertas = computed(() => {
    const ls = alertas.value
    const porCategoria: Record<string, { critica: number; atencion: number }> = {}
    for (const l of ls) {
      const c = (porCategoria[l.alerta!.categoria] ??= { critica: 0, atencion: 0 })
      if (l.alerta!.nivel === 'Crítica') c.critica++
      else if (l.alerta!.nivel === 'Atención') c.atencion++
    }
    return {
      urgencia: ls.filter(l => l.alerta!.urgenciaAbsoluta).length,
      nivel1: ls.filter(l => l.alerta!.nivel === 'Crítica' && !l.alerta!.urgenciaAbsoluta && /Nivel 1/.test(l.alerta!.prioridad)).length,
      nivel2: ls.filter(l => l.alerta!.nivel === 'Crítica' && /Nivel 2/.test(l.alerta!.prioridad) && !/Nivel 1/.test(l.alerta!.prioridad)).length,
      criticas: ls.filter(l => l.alerta!.nivel === 'Crítica').length,
      atencion: ls.filter(l => l.alerta!.nivel === 'Atención').length,
      rotaciones: ls.filter(l => l.alerta!.sugerencias.some(x => x.startsWith('Rotar'))).length,
      noNuevas: ls.filter(l => l.alerta!.sugerencias.some(x => x.startsWith('Las posiciones'))).length,
      bloqueos: ls.filter(l => l.alerta!.bloqueoOt).length,
      placasUrgencia: [...new Set(ls.filter(l => l.alerta!.urgenciaAbsoluta).map(l => l.placa))],
      porCategoria,
    }
  })

  // ---------------------------------------------------------------- Semáforo, presiones y volumen
  const semaforo = computed(() => {
    const c: Record<Semaforo, number> = { inmediato: 0, proyectado: 0, bueno: 0 }
    for (const l of inspeccionadas.value) if (l.semaforo) c[l.semaforo]++
    return c
  })
  const presiones = computed(() => {
    const c: Record<Presion, number> = { Correcta: 0, Baja: 0, Alta: 0, 'Sin medir': 0 }
    const porPlanta: Record<string, Record<Presion, number>> = {}
    for (const l of inspeccionadas.value) {
      if (!l.presion) continue
      c[l.presion]++
      ;(porPlanta[l.planta] ??= { Correcta: 0, Baja: 0, Alta: 0, 'Sin medir': 0 })[l.presion]++
    }
    const total = inspeccionadas.value.length
    const medidas = total - c['Sin medir']
    return { ...c, porPlanta, total, medidas, pctMedidas: total ? (medidas / total) * 100 : 0, pctCorrecta: medidas ? (c.Correcta / medidas) * 100 : 0 }
  })
  const volumen = computed(() => ({
    placas: new Set(inspeccionadas.value.map(l => l.placa)).size,
    llantas: inspeccionadas.value.length,
    inspecciones: inspecciones.value.length,
    rondas: new Set(inspecciones.value.map(i => i.consecutivo).filter(Boolean)).size,
    posicionesVacias: llantas.value.filter(l => l.sinLlanta).length,
  }))

  // ---------------------------------------------------------------- Brecha de compras y suministro
  /** OT de llantas cerradas de una placa en o después de una fecha (serial) */
  const otDespues = (placa: string, fecha: number, soloMontaje = false) => otLlantas.value.filter(o =>
    o.placa === placa && o.fecha >= Math.floor(fecha) && /cerrad/i.test(o.estado) && (!soloMontaje || /montar|montaje|cambio/i.test(o.actividad + ' ' + o.descripcion)))
  /** Llanta registrada en la misma placa y posición después de la inspección (ya se reemplazó) */
  const reemplazada = (l: Llanta) => !!l.insp && todas.value.some(o => o.id !== l.id && o.placa === l.placa && !!l.posicion && o.posicion === l.posicion &&
    Math.max(o.fechaCompra, o.fechaInicial, o.fechaRegistro) > l.insp!.fecha)

  const brecha = computed(() => {
    const pendientes = inspeccionadas.value.filter(l => l.semaforo === 'inmediato')
    // «Falsas alarmas»: la llanta ya se cambió (baja, otra llanta en su posición u OT de montaje posterior)
    const falsas = pendientes.filter(l => l.ubicacionTipo === 'baja' || reemplazada(l) || otDespues(l.placa, l.insp!.fecha, true).length > 0)
    const reales = pendientes.filter(l => !falsas.includes(l))
    return { pendientes, falsas, reales, ahorro: falsas.reduce((a, l) => a + valor(l), 0), compra: reales.reduce((a, l) => a + valor(l), 0) }
  })
  const suministro = computed(() => {
    const solicitadas = brecha.value.pendientes.length
    const atendidas = brecha.value.falsas.length
    return { solicitadas, atendidas, pct: solicitadas ? (atendidas / solicitadas) * 100 : 0, valorSolicitado: brecha.value.pendientes.reduce((a, l) => a + valor(l), 0) }
  })
  /** Cumplimiento de planes de acción: alertas de la última inspección con OT de llantas cerrada después */
  const planes = computed(() => {
    const alertas = inspeccionadas.value.filter(l => l.insp!.plan.some(planAccionable))
    const placasAlerta = new Map<string, number>()
    for (const l of alertas) placasAlerta.set(l.placa, Math.min(placasAlerta.get(l.placa) ?? Infinity, l.insp!.fecha))
    const atendidas = alertas.filter(l => otDespues(l.placa, l.insp!.fecha).length > 0)
    const placasAtendidas = [...placasAlerta.entries()].filter(([p, f]) => otDespues(p, f).length > 0).map(([p]) => p)
    const porPlan = new Map<string, number>()
    for (const l of alertas) for (const p of l.insp!.plan.filter(planAccionable)) porPlan.set(p, (porPlan.get(p) ?? 0) + 1)
    return {
      alertas: alertas.length, atendidas: atendidas.length, pct: alertas.length ? (atendidas.length / alertas.length) * 100 : 0,
      placas: placasAlerta.size, placasAtendidas: placasAtendidas.length,
      porPlan: [...porPlan.entries()].sort((a, b) => b[1] - a[1]),
    }
  })

  // ---------------------------------------------------------------- Análisis causal y desgaste
  const causas = computed(() => {
    const retiros = inspeccionadas.value.filter(l => l.semaforo === 'inmediato')
    const cuenta = (f: (l: Llanta) => boolean) => retiros.filter(f).length
    return [
      { causa: 'Profundidad ≤ 2 mm', grupo: 'Desgaste' as const, n: cuenta(l => l.insp!.remanente <= MM_INMEDIATO) },
      { causa: 'Límite de desgaste (lisa)', grupo: 'Desgaste' as const, n: cuenta(l => l.insp!.condiciones.some(esLimiteDesgaste)) },
      { causa: 'Corte / rasgadura', grupo: 'Daño' as const, n: cuenta(l => l.insp!.condiciones.some(c => /corte|rasgad/i.test(c))) },
      { causa: 'Hernia / abultamiento', grupo: 'Daño' as const, n: cuenta(l => l.insp!.condiciones.some(c => /hernia|abultam/i.test(c))) },
      { causa: 'Alambre a la vista', grupo: 'Daño' as const, n: cuenta(l => l.insp!.condiciones.some(c => /alambre/i.test(c))) },
      { causa: 'Marcada por el inspector', grupo: 'Desgaste' as const, n: cuenta(l => l.insp!.remanente > MM_INMEDIATO && !l.dano && !l.insp!.condiciones.some(esLimiteDesgaste)) },
    ].filter(c => c.n > 0)
  })
  const resumenCausal = computed(() => ({
    desgaste: inspeccionadas.value.filter(l => l.causa === 'Desgaste').length,
    dano: inspeccionadas.value.filter(l => l.causa === 'Daño').length,
  }))
  const conDesgaste = computed(() => inspeccionadas.value.filter(l => l.desgasteMes !== null))
  const desgasteProm = computed(() => conDesgaste.value.length ? conDesgaste.value.reduce((a, l) => a + (l.desgasteMes as number), 0) / conDesgaste.value.length : 0)
  /** «Devoradores»: llantas con desgaste por encima de DESGASTE_ALTO mm/mes */
  const devoradoras = computed(() => conDesgaste.value.filter(l => (l.desgasteMes as number) > DESGASTE_ALTO).sort((a, b) => (b.desgasteMes as number) - (a.desgasteMes as number)))
  /** Remanente que aumenta entre mediciones: error de toma */
  const desgasteNegativo = computed(() => conDesgaste.value.filter(l => (l.desgasteMes as number) < -0.2))

  const porMarca = computed(() => {
    const m = new Map<string, Llanta[]>()
    for (const l of inspeccionadas.value) {
      // Atípicos fuera: remanentes imposibles (0 o > 30 mm) y desgastes negativos
      if (l.insp!.remanente <= 0 || l.insp!.remanente > 30) continue
      ;(m.get(l.marca) ?? m.set(l.marca, []).get(l.marca)!).push(l)
    }
    return [...m.entries()].map(([marca, ls]) => {
      const des = ls.filter(l => l.desgasteMes !== null && (l.desgasteMes as number) >= 0)
      const rem = ls.reduce((a, l) => a + l.insp!.remanente, 0) / ls.length
      const dm = des.length ? des.reduce((a, l) => a + (l.desgasteMes as number), 0) / des.length : null
      return {
        marca, n: ls.length, remanente: rem, desgaste: dm, nDesgaste: des.length,
        // Meses que le quedan hasta el límite de cambio al ritmo de desgaste actual
        vidaMeses: dm && dm > 0.05 ? Math.max(0, (rem - MM_INMEDIATO) / dm) : null,
        inmediato: ls.filter(l => l.semaforo === 'inmediato').length,
      }
    }).sort((a, b) => b.n - a.n)
  })

  const patrones = computed(() => {
    const ls = inspeccionadas.value
    const cond = (re: RegExp) => ls.filter(l => l.insp!.condiciones.some(c => re.test(c))).length
    return [
      { patron: 'Desgaste lateral / unilateral (alineación)', n: cond(/lateral|unilateral/i), accion: 'Revisar alineación y suspensión' },
      { patron: 'Desgaste central (sobrepresión)', n: cond(/central|sobrepresi/i), accion: 'Ajustar presión de inflado' },
      { patron: `Diferencia transversal > ${DIF_TRANSVERSAL} mm (hombro ext. vs int.)`, n: ls.filter(l => l.difTransversal > DIF_TRANSVERSAL).length, accion: 'Revisar amortiguación / alineación' },
      { patron: 'Baja presión / desinflada', n: cond(/baja presi|desinfl/i), accion: 'Calibrar y revisar fugas' },
      { patron: 'Sin tapa de válvula', n: cond(/tapa/i), accion: 'Colocar tapa de válvula' },
    ]
  })

  // ---------------------------------------------------------------- Logística y compras
  /** Matriz Dimensión × Planta de las llantas en cambio inmediato */
  const requerimientos = computed(() => {
    const ls = inspeccionadas.value.filter(l => l.semaforo === 'inmediato')
    const ps = ordenarPlantas(new Set(ls.map(l => l.planta)))
    const m = new Map<string, Record<string, number>>()
    for (const l of ls) { const e = m.get(l.dimension) ?? {}; e[l.planta] = (e[l.planta] ?? 0) + 1; m.set(l.dimension, e) }
    const filas = [...m.entries()].map(([dimension, porPlanta]) => ({ dimension, porPlanta, total: Object.values(porPlanta).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
    return { plantas: ps, filas, total: ls.length }
  })
  const reencauche = computed(() => inspeccionadas.value
    .filter(l => l.insp!.remanente >= REENCAUCHE_MIN && l.insp!.remanente <= REENCAUCHE_MAX && !l.dano)
    .sort((a, b) => a.insp!.remanente - b.insp!.remanente))

  const composicion = computed(() => {
    const m = new Map<string, number>()
    for (const l of llantas.value) if (l.ubicacionTipo !== 'baja') m.set(l.dimension, (m.get(l.dimension) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })
  const proveedores = computed(() => {
    const m = new Map<string, { costo: number; n: number }>()
    for (const o of otPeriodo.value) { const e = m.get(o.proveedor) ?? { costo: 0, n: 0 }; e.costo += o.costo; e.n++; m.set(o.proveedor, e) }
    return [...m.entries()].map(([proveedor, e]) => ({ proveedor, ...e })).sort((a, b) => b.costo - a.costo)
  })

  // ---------------------------------------------------------------- Por placa (rankings y fichas)
  const evidenciasPorInsp = computed(() => {
    const m = new Map<string, string[]>()
    for (const e of evidencias.value) { const id = txt(e['Id Inspección']); m.set(id, [...(m.get(id) ?? []), ...((e['Fotos'] as string[] | undefined) ?? [])]) }
    return m
  })
  const porPlaca = computed(() => {
    const m = new Map<string, Llanta[]>()
    for (const l of inspeccionadas.value) (m.get(l.placa) ?? m.set(l.placa, []).get(l.placa)!).push(l)
    return [...m.entries()].map(([placa, ls]) => {
      const insps = inspecciones.value.filter(i => i.placa === placa).sort((a, b) => a.fecha - b.fecha)
      const ultima = insps[insps.length - 1]
      const previa = insps[insps.length - 2]
      const des = ls.filter(l => l.desgasteMes !== null)
      const desgaste = des.length ? des.reduce((a, l) => a + (l.desgasteMes as number), 0) / des.length : null
      const medidas = ls.filter(l => l.presion && l.presion !== 'Sin medir')
      const pctPresion = medidas.length ? (medidas.filter(l => l.presion === 'Correcta').length / ls.length) * 100 : 0
      const conDano = ls.filter(l => l.insp!.condiciones.some(c => /corte|rasgad|hernia|abultam|alambre/i.test(c))).length
      const plantaPrincipal = [...ls.reduce((acc, l) => acc.set(l.planta, (acc.get(l.planta) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      // Confiabilidad del dato (Trust Score): cada control cumplido suma
      const controles = [
        { control: 'Fecha de medición anterior válida', ok: ls.filter(l => l.anterior).length >= ls.length * 0.8 },
        { control: 'Lectura del equipo registrada y congruente', ok: !!ultima && ultima.lectura > 0 && (!previa || ultima.lectura >= previa.lectura) },
        { control: 'Presión medida en todas las llantas', ok: ls.every(l => l.presion !== 'Sin medir') },
        { control: 'Llantas inspeccionadas = llantas del equipo', ok: !!ultima && (!ultima.llantasEquipo || ultima.inspeccionadas >= ultima.llantasEquipo) },
        { control: 'Profundidades congruentes (no aumentan)', ok: !ls.some(l => (l.desgasteMes ?? 0) < -0.2) },
      ]
      const fotos = ultima ? evidenciasPorInsp.value.get(ultima.id) ?? [] : []
      return {
        placa, tipo: ls[0].tipo, planta: plantaPrincipal, llantas: ls,
        inmediato: ls.filter(l => l.semaforo === 'inmediato').length,
        proyectado: ls.filter(l => l.semaforo === 'proyectado').length,
        bueno: ls.filter(l => l.semaforo === 'bueno').length,
        desgaste, nDesgaste: des.length,
        pctPresion, conDano,
        // Índice de cuidado operacional: 50 % presiones correctas + 50 % llantas sin cortes ni desgarros
        cuidado: 0.5 * pctPresion + 0.5 * (1 - conDano / ls.length) * 100,
        fecha: ultima?.fecha ?? ls[0].insp!.fecha, evaluador: ultima?.evaluador ?? ls[0].insp!.evaluador,
        lectura: ultima?.lectura ?? 0, unidad: ultima?.unidad ?? '',
        llantasEquipo: ultima?.llantasEquipo ?? 0,
        controles, confianza: controles.filter(c => c.ok).length / controles.length,
        fotos,
        dotVencidas: ls.filter(l => (l.dotAnios ?? 0) > DOT_ANIOS).length,
      }
    })
  })
  const criticos = computed(() => [...porPlaca.value].filter(p => p.inmediato > 0 || p.proyectado > 0)
    .sort((a, b) => b.inmediato - a.inmediato || b.proyectado - a.proyectado || (b.desgaste ?? 0) - (a.desgaste ?? 0)))
  /** Placas con desgaste medido en al menos 3 llantas, de mayor a menor mm/mes */
  const rankingDesgaste = computed(() => porPlaca.value.filter(p => p.nDesgaste >= 3 && p.desgaste !== null).sort((a, b) => (b.desgaste as number) - (a.desgaste as number)))
  const rankingCuidado = computed(() => [...porPlaca.value].sort((a, b) => b.cuidado - a.cuidado))
  /** Fichas de intervención: las 10 placas más comprometidas (cambios y desgaste acelerado) */
  const top10 = computed(() => [...porPlaca.value]
    .map(p => ({ p, peso: p.inmediato * 100 + p.proyectado * 10 + Math.max(0, p.desgaste ?? 0) * 5 + p.conDano * 20 }))
    .filter(x => x.peso > 0).sort((a, b) => b.peso - a.peso).slice(0, 10).map(x => x.p))

  /** Plan de intervención por reglas (para la OT) */
  function planIntervencion(ls: Llanta[]): string[] {
    const out: string[] = []
    const pos = (f: (l: Llanta) => boolean) => ls.filter(f).map(l => l.posicion || '?').join(', ')
    const inm = ls.filter(l => l.semaforo === 'inmediato')
    if (inm.length) out.push(`Cambiar de inmediato ${inm.length === 1 ? 'la llanta' : `${inm.length} llantas`} (posición ${pos(l => l.semaforo === 'inmediato')}).`)
    if (ls.some(l => l.insp!.condiciones.some(c => /hernia|abultam/i.test(c)))) out.push(`Retirar ya la llanta con hernia (posición ${pos(l => l.insp!.condiciones.some(c => /hernia|abultam/i.test(c)))}): riesgo de estallido.`)
    if (ls.some(l => l.insp!.condiciones.some(c => /corte|rasgad/i.test(c)))) out.push(`Cortes en la banda (posición ${pos(l => l.insp!.condiciones.some(c => /corte|rasgad/i.test(c)))}): revisar vía, patio y conducción en obra.`)
    if (ls.some(l => l.insp!.condiciones.some(c => /lateral|unilateral/i.test(c)) || l.difTransversal > DIF_TRANSVERSAL)) out.push('Desgaste lateral o escalonado: revisar alineación, balanceo y amortiguación.')
    if (ls.some(l => l.insp!.condiciones.some(c => /central|sobrepresi/i.test(c)) || l.presion === 'Alta')) out.push('Desgaste central / presión alta: ajustar la presión de inflado.')
    if (ls.some(l => l.presion === 'Baja' || l.insp!.condiciones.some(c => /baja presi|desinfl/i.test(c)))) out.push('Presión baja: calibrar y revisar fugas o válvulas.')
    if (ls.some(l => l.insp!.condiciones.some(c => /tapa/i.test(c)) || l.insp!.plan.some(p => /tapa/i.test(p)))) out.push('Colocar las tapas de válvula faltantes.')
    if (ls.some(l => (l.desgasteMes ?? 0) > DESGASTE_ALTO)) out.push(`Desgaste acelerado (> ${DESGASTE_ALTO} mm/mes): revisar operación, carga y rotación.`)
    if (ls.some(l => l.insp!.plan.some(p => /rotaci/i.test(p)))) out.push('Programar rotación de llantas.')
    const proy = ls.filter(l => l.semaforo === 'proyectado').length
    if (proy) out.push(`Programar cambio de ${proy} ${proy === 1 ? 'llanta' : 'llantas'} en 30-60 días.`)
    return out.length ? out : ['Sin intervenciones: mantener la rutina de inspección.']
  }

  // ---------------------------------------------------------------- Calidad del dato
  const calidad = computed(() => {
    const placasInspeccionadas = new Set(inspecciones.value.map(i => i.placa))
    // Placas con llantas montadas que no se inspeccionaron en el período
    const sinInspeccion = [...llantas.value.filter(l => l.ubicacionTipo !== 'baja' && l.placa !== 'SIN PLACA')
      .reduce((m, l) => m.set(l.placa, { placa: l.placa, tipo: l.tipo, planta: l.planta, n: (m.get(l.placa)?.n ?? 0) + 1,
        ultima: Math.max(m.get(l.placa)?.ultima ?? 0, ...l.historial.map(h => h.fecha)) }), new Map<string, { placa: string; tipo: string; planta: string; n: number; ultima: number }>())
      .values()].filter(p => !placasInspeccionadas.has(p.placa)).sort((a, b) => b.n - a.n)
    const idsInventario = new Set(inventarioCrudo.value.map(r => txt(r['Id'])))
    const subs = ((data.value?.subInspecciones ?? []) as Fila[])
    const sinId = subs.filter(s => !idsInventario.has(txt(s['Id Llanta'])) && enRango(isoDe(num(s['Fecha']))))
    const sinSerie = llantas.value.filter(l => !l.serie || l.marca === 'SIN MARCA' || l.dimension === 'Sin dimensión')
    const fechaInicialMala = llantas.value.filter(l => l.insp && !l.anterior)
    const lecturaMala = inspecciones.value.filter(i => i.lectura <= 0 || !i.unidad)
    const incompletas = inspecciones.value.filter(i => i.llantasEquipo > 0 && i.inspeccionadas < i.llantasEquipo)
    const psiSinMedir = inspeccionadas.value.filter(l => l.presion === 'Sin medir')
    const dotIlegible = llantas.value.filter(l => l.ubicacionTipo !== 'baja' && !l.dotFecha)
    const variantesMarca = new Map<string, Set<string>>()
    for (const r of inventarioCrudo.value) { const n = normMarca(r['Marca']); const raw = txt(r['Marca']); if (raw && raw.toUpperCase() !== n) (variantesMarca.get(n) ?? variantesMarca.set(n, new Set()).get(n)!).add(raw) }
    return {
      sinInspeccion, sinId, sinSerie, fechaInicialMala, lecturaMala, incompletas, psiSinMedir, dotIlegible,
      sinCosto: llantas.value.filter(l => !l.costo).length, sinEstado: llantas.value.filter(l => l.ubicacionTipo === 'sin estado').length,
      variantesMarca: [...variantesMarca.entries()].map(([marca, v]) => ({ marca, variantes: [...v] })),
      fotos: evidencias.value.reduce((a, e) => a + ((e['Fotos'] as string[] | undefined)?.length ?? 0), 0),
      equiposMaestro: equiposMaestro.value.length,
    }
  })

  const hayInspecciones = computed(() => inspeccionadas.value.length > 0)
  const ultimaFecha = computed(() => Math.max(0, ...inspecciones.value.map(i => i.fecha)))

  return {
    todas, llantas, inspeccionadas, inspecciones, plantas, otLlantas, otPeriodo,
    cronologia, lineaTiempo, vida, eventos, resumenCronologia, vidaPorMarca, alertas, resumenAlertas,
    /** Fotos de evidencia de una inspección (valores de la hoja: URL, ID o ruta de Drive) */
    fotosInspeccion: (id: string) => evidenciasPorInsp.value.get(id) ?? [],
    costoPromedio, financiero, semaforo, presiones, volumen, brecha, suministro, planes,
    causas, resumenCausal, conDesgaste, desgasteProm, devoradoras, desgasteNegativo, porMarca, patrones,
    requerimientos, reencauche, composicion, proveedores,
    porPlaca, criticos, rankingDesgaste, rankingCuidado, top10, planIntervencion, calidad,
    hayInspecciones, ultimaFecha,
  }
}

/** Opciones de los filtros de arriba (Planta, Tipo, Placa, Marca) a partir del inventario */
export function opcionesLlantas(data: Record<string, unknown> | null | undefined) {
  const inv = ((data?.inventario ?? []) as Fila[])
  const uniq = (f: (r: Fila) => string) => [...new Set(inv.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    plantas: ordenarPlantas(new Set(inv.map(r => nombrePlanta(r['Planta'])).filter(p => p !== 'Sin planta'))),
    tipos: uniq(r => txt(r['Tipo de Vehículo']).toUpperCase()),
    placas: uniq(r => txt(r['Placa']).toUpperCase()),
    marcas: uniq(r => normMarca(r['Marca'])),
  }
}

/** Evento del consolidado (con su llanta) */
export type EventoConLlanta = EventoLlanta & { llanta: Llanta }
/**
 * Agrupa los eventos del mismo tipo, día y placa (la inspección de las 11 llantas de un mixer, el cargue del
 * inventario o una OT) en una sola entrada con sus posiciones y el rango de mm. Los cambios de la cronología
 * y las rotaciones quedan uno por llanta.
 */
export function agruparEventos(lista: EventoConLlanta[]) {
  const m = new Map<string, { e: EventoConLlanta; eventos: EventoConLlanta[]; llantas: Llanta[]; posiciones: string[]; mm: number[] }>()
  for (const e of lista) {
    const k = e.fuente === 'Cronología' || e.tipo === 'rotacion' ? `${e.tipo}|${e.fecha}|${e.idLlanta}` : `${e.tipo}|${Math.floor(e.fecha)}|${e.placa}|${e.tipo === 'ot' ? e.titulo : ''}`
    const g = m.get(k) ?? m.set(k, { e, eventos: [], llantas: [], posiciones: [], mm: [] }).get(k)!
    g.eventos.push(e)
    g.llantas.push(e.llanta)
    if (e.posicion && !g.posiciones.includes(e.posicion)) g.posiciones.push(e.posicion)
    if (e.mm !== null) g.mm.push(e.mm)
  }
  return [...m.values()]
}
