/**
 * useGuiaInicio.ts — Guía de inicio (recorrido paso a paso) para usuarios nuevos.
 *
 * - Se abre sola la primera vez que el usuario entra (después de cambiar la contraseña temporal).
 * - Se puede omitir en cualquier paso; terminarla u omitirla la marca como vista en el servidor
 *   (app_metadata.tour_version), así no se repite en otro navegador o equipo.
 * - Se vuelve a abrir desde el menú de usuario → «Guía de inicio».
 * - Cada paso señala un elemento por selector; si no existe en la pantalla actual (p. ej. el
 *   usuario no tiene ese módulo), el paso se salta solo.
 *
 * Para mostrar la guía otra vez a todos después de un cambio grande, subir GUIA_VERSION.
 */
import { computed, ref } from 'vue'

export const GUIA_VERSION = 1

export type Lado = 'derecha' | 'izquierda' | 'abajo' | 'arriba'

export interface PasoGuia {
  id: string
  titulo: string
  texto: string
  /** Selectores CSS, en orden de preferencia; se usa el primero visible. Sin objetivo = tarjeta centrada. */
  objetivo?: string[]
  lado?: Lado
  /** El elemento está en el menú lateral: en celular se abre el menú durante el paso */
  enMenu?: boolean
}

export const PASOS_GUIA: PasoGuia[] = [
  {
    id: 'bienvenida',
    titulo: 'Bienvenido a Gravicon Vision',
    texto: 'En un minuto le mostramos cómo moverse por el tablero: plantas, módulos, filtros, gráficas e informes. Puede omitir la guía cuando quiera y volver a verla desde su menú de usuario.',
  },
  {
    id: 'menu',
    titulo: 'Plantas y negocios',
    texto: 'Desde este menú entra a cada planta: <b>Agregados</b> (Cuncía y Acacías) y <b>Concretos</b>. Solo aparecen las plantas que su usuario tiene habilitadas.',
    objetivo: ['[data-guia="menu"]'],
    lado: 'derecha',
    enMenu: true,
  },
  {
    id: 'colapsar',
    titulo: 'Más espacio para trabajar',
    texto: 'Contraiga el menú para ver las gráficas y tablas más grandes. Con el mismo botón lo vuelve a abrir.',
    objetivo: ['.collapse-btn'],
    lado: 'derecha',
    enMenu: true,
  },
  {
    id: 'modulos',
    titulo: 'Módulos de la planta',
    texto: 'Producción, Despacho, Programación y Mantenimiento. Cada pestaña tiene su propia dirección: si recarga la página, sigue exactamente donde estaba.',
    objetivo: ['.rt-tabs'],
    lado: 'abajo',
  },
  {
    id: 'secciones',
    titulo: 'Secciones del módulo',
    texto: 'Algunos módulos se dividen en secciones, por ejemplo Producción Planta y Proyección Comercial en Concretos, u Órdenes y Disponibilidad en Mantenimiento.',
    objetivo: ['.rt-sub'],
    lado: 'abajo',
  },
  {
    id: 'filtros',
    titulo: 'Filtros de fecha',
    texto: 'Elija el período que quiere analizar. Los filtros quedan guardados en la dirección de la página: se conservan al cambiar de vista y, si comparte el enlace, la otra persona ve lo mismo.',
    objetivo: ['.filter-bar', '.filter-group', '.icb-actions'],
    lado: 'abajo',
  },
  {
    id: 'vistas',
    titulo: 'Gráficas, detalle e informe',
    texto: '<b>Gráficas</b>: el tablero visual. <b>Detalle</b>: la tabla registro por registro, con buscador y exportación a Excel. <b>Informe</b>: el documento oficial listo para descargar en PDF.',
    objetivo: ['.rt-toggle'],
    lado: 'abajo',
  },
  {
    id: 'indicadores',
    titulo: 'Indicadores',
    texto: 'Cada tarjeta resume un indicador del período elegido. Debajo del valor principal verá el desglose (por línea, planta o familia).',
    objetivo: ['.kpi-card'],
    lado: 'abajo',
  },
  {
    id: 'graficas',
    titulo: 'Herramientas de cada gráfica',
    texto: 'Amplíe la gráfica a pantalla completa, cópiela como imagen para pegarla en un correo o chat, o descárguela. Pase el mouse sobre las barras para ver el detalle de cada valor.',
    objetivo: ['.chart-actions'],
    lado: 'izquierda',
  },
  {
    id: 'tema',
    titulo: 'Tema claro u oscuro',
    texto: 'Cambie entre tema claro y oscuro según su preferencia. Los informes en PDF siempre salen en blanco, listos para imprimir.',
    objetivo: ['.theme-btn'],
    lado: 'derecha',
    enMenu: true,
  },
  {
    id: 'cuenta',
    titulo: 'Su cuenta',
    texto: 'Aquí abre su menú: <b>Configuración</b> (cambiar contraseña), <b>Guía de inicio</b> para volver a ver este recorrido y <b>Cerrar sesión</b>.',
    objetivo: ['.sidebar-footer .user-info', '.sidebar-footer .user-avatar'],
    lado: 'derecha',
    enMenu: true,
  },
  {
    id: 'final',
    titulo: '¡Todo listo!',
    texto: `Un par de cosas más:<ul><li>Recargar la página nunca lo saca de la vista en la que está.</li><li>Si comparte el enlace de una vista, se abre con los mismos filtros.</li><li>Puede repetir esta guía cuando quiera desde su menú de usuario.</li></ul>`,
  },
]

// Estado compartido (un solo recorrido para toda la app)
const activa = ref(false)
const indice = ref(0)
/** Índices de los pasos que aplican en la pantalla actual (se calcula al empezar) */
const disponibles = ref<number[]>(PASOS_GUIA.map((_, i) => i))
let alCerrar: ((terminada: boolean) => void) | null = null

export function useGuiaInicio() {
  const paso = computed(() => (activa.value ? PASOS_GUIA[indice.value] ?? null : null))

  function iniciar(onCerrar?: (terminada: boolean) => void) {
    alCerrar = onCerrar ?? null
    disponibles.value = PASOS_GUIA.map((_, i) => i)
    indice.value = 0
    activa.value = true
  }
  function cerrar(terminada: boolean) {
    if (!activa.value) return
    activa.value = false
    const cb = alCerrar
    alCerrar = null
    cb?.(terminada)
  }
  /** Avanza (+1) o retrocede (-1) saltando los pasos que no aplican; al pasar del último, termina */
  function mover(delta: 1 | -1) {
    let n = indice.value + delta
    while (n >= 0 && n < PASOS_GUIA.length && !disponibles.value.includes(n)) n += delta
    if (n >= PASOS_GUIA.length) return cerrar(true)
    if (n < 0) return
    indice.value = n
  }
  /** Deja solo los pasos cuyo elemento existe (los del menú lateral siempre aplican) */
  function filtrar(existe: (p: PasoGuia) => boolean) {
    disponibles.value = PASOS_GUIA.map((p, i) => (!p.objetivo || p.enMenu || existe(p) ? i : -1)).filter(i => i >= 0)
  }
  // Numeración «Paso X de Y» sin contar la bienvenida ni el cierre
  const intermedios = computed(() => disponibles.value.filter(i => PASOS_GUIA[i].objetivo))
  const numero = computed(() => intermedios.value.indexOf(indice.value) + 1)
  const totalPasos = computed(() => intermedios.value.length)

  return { activa, indice, paso, total: PASOS_GUIA.length, numero, totalPasos, iniciar, cerrar, mover, filtrar }
}
