import { createRouter, createWebHistory, type RouteRecordRaw, type RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { PLANTAS, PLANTAS_AGREGADOS, SECCIONES_CONCRETOS, VISTAS_CONCRETOS, VISTAS_FACTURACION, VISTAS_PRODUCCION_AGREGADOS, type PlantaId } from '../config/plantas'

/**
 * Mapa de rutas. Cada vista tiene su propia URL, así recargar, atrás/adelante y
 * compartir un enlace llevan exactamente a la misma pantalla.
 *
 *   /cuncia | /acacias
 *     /produccion/graficas | detalles | informe
 *     /facturacion/graficas | detalle | informe | balance   (Novasoft; balance = producción vs facturación)
 *     /programacion/gravicon | cliente
 *     /mantenimiento/:area/:seccion/:vista          (ver composables/useRutaMantenimiento)
 *   /concretos
 *     /produccion/planta | proyeccion / graficas | informe
 *     /mantenimiento/:area/:seccion/:vista
 *   /clientes
 *   /configuracion
 *
 * Los filtros (fechas, plantas, clientes…) van como ?query y se conservan al cambiar de vista.
 * El permiso de cada pantalla es su ruta (p. ej. cuncia/mantenimiento/planta), igual que las
 * claves que se administran en Configuración.
 */

const PlantaLayout = () => import('../layouts/PlantaLayout.vue')
const EquiposDashboard = () => import('../views/EquiposDashboard.vue')

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guest?: boolean
    /** Título de la pestaña del navegador */
    titulo?: string | ((to: RouteLocationNormalized) => string)
    /** Permisos extra, además de los que salen de la ruta */
    permisosExtra?: (to: RouteLocationNormalized) => string[]
  }
}

/** Primera ruta hija permitida para el usuario (para redirigir /cuncia → /cuncia/produccion/graficas). */
function primeraPermitida(planta: PlantaId, modulos: string[]) {
  const auth = useAuthStore()
  // Sin perfil cargado todavía, el primero; el guard revisa el permiso después
  if (!auth.profile) return { name: `${planta}-${modulos[0]}` }
  const m = modulos.find(x => auth.canView(`${planta}/${x}`))
  // Sin ningún módulo permitido se va a Configuración (evita un ciclo de redirecciones)
  return m ? { name: `${planta}-${m}` } : { name: 'configuracion' }
}

/**
 * Primera vista permitida de un grupo. `rutas` = [clave de permiso, nombre de ruta].
 * Si no hay ninguna, Configuración (así una redirección nunca apunta a algo bloqueado y no hay ciclos).
 */
function primeraVista(rutas: [string, string][]) {
  const auth = useAuthStore()
  if (!auth.profile) return { name: rutas[0][1] }
  const r = rutas.find(([clave]) => auth.canView(clave))
  return r ? { name: r[1] } : { name: 'configuracion' }
}

/** Ruta de Mantenimiento (misma pantalla para las tres plantas). */
function rutaMantenimiento(planta: PlantaId): RouteRecordRaw {
  return {
    path: 'mantenimiento/:segmentos(.*)*',
    name: `${planta}-mantenimiento`,
    component: EquiposDashboard,
    props: { planta },
    meta: {
      titulo: `Mantenimiento ${PLANTAS[planta].nombre}`,
      // Disponibilidad es una sección, pero su permiso se administra aparte
      permisosExtra: to => (String(to.params.segmentos ?? '').includes('disponibilidad') ? [`${planta}/mantenimiento/disponibilidad`] : []),
    },
  }
}

function rutasAgregados(planta: 'cuncia' | 'acacias'): RouteRecordRaw {
  const nombre = PLANTAS[planta].nombre
  return {
    path: `/${planta}`,
    component: PlantaLayout,
    props: { planta },
    meta: { requiresAuth: true },
    children: [
      { path: '', name: planta, redirect: () => primeraPermitida(planta, ['produccion', 'facturacion', 'programacion', 'mantenimiento']) },
      {
        path: 'produccion',
        component: () => import('../views/agregados/AgregadosProduccionView.vue'),
        props: { planta },
        children: [
          { path: '', name: `${planta}-produccion`, redirect: () => primeraVista(VISTAS_PRODUCCION_AGREGADOS.map(v => [`${planta}/produccion/${v.id}`, `${planta}-produccion-${v.id}`])) },
          ...VISTAS_PRODUCCION_AGREGADOS.map(v => ({
            path: v.id,
            name: `${planta}-produccion-${v.id}`,
            component: v.id === 'graficas' ? () => import('../views/agregados/ResumenTab.vue')
              : v.id === 'detalles' ? () => import('../views/agregados/DetalleProduccionTab.vue')
              : () => import('../views/agregados/InformeProduccionTab.vue'),
            meta: { titulo: `Producción ${nombre} · ${v.label}` },
          })),
        ],
      },
      {
        path: 'facturacion',
        component: () => import('../views/agregados/facturacion/FacturacionView.vue'),
        props: { planta },
        children: [
          { path: '', name: `${planta}-facturacion`, redirect: () => primeraVista(VISTAS_FACTURACION.map(v => [`${planta}/facturacion/${v.id}`, `${planta}-facturacion-${v.id}`])) },
          ...VISTAS_FACTURACION.map(v => ({
            path: v.id,
            name: `${planta}-facturacion-${v.id}`,
            component: v.id === 'graficas' ? () => import('../views/agregados/facturacion/FacturacionGraficasTab.vue')
              : v.id === 'detalle' ? () => import('../views/agregados/facturacion/FacturacionDetalleTab.vue')
              : v.id === 'balance' ? () => import('../views/agregados/facturacion/FacturacionBalanceTab.vue')
              : () => import('../views/agregados/facturacion/FacturacionInformeTab.vue'),
            meta: { titulo: `Facturación ${nombre} · ${v.label}` },
          })),
        ],
      },
      {
        path: 'programacion/:empresa(gravicon|cliente)?',
        name: `${planta}-programacion`,
        component: () => import('../views/agregados/ProgramacionView.vue'),
        meta: { titulo: `Programación ${nombre}` },
      },
      rutaMantenimiento(planta),
    ],
  }
}

const COMPONENTES_CONCRETOS: Record<string, () => Promise<unknown>> = {
  'planta-graficas': () => import('../views/concretos/tabs/GraficasTab.vue'),
  'planta-informe': () => import('../views/concretos/tabs/InformeTab.vue'),
  'proyeccion-graficas': () => import('../views/concretos/tabs/ProyeccionGraficasTab.vue'),
  'proyeccion-informe': () => import('../views/concretos/tabs/ProyeccionTab.vue'),
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true, titulo: 'Iniciar sesión' },
  },
  { path: '/', name: 'inicio', redirect: { name: 'cuncia' }, meta: { requiresAuth: true } },

  ...PLANTAS_AGREGADOS.map(rutasAgregados),

  {
    path: '/concretos',
    component: PlantaLayout,
    props: { planta: 'concretos' },
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'concretos', redirect: () => primeraPermitida('concretos', ['produccion', 'mantenimiento']) },
      {
        path: 'produccion',
        component: () => import('../views/concretos/ProduccionView.vue'),
        children: [
          {
            path: '', name: 'concretos-produccion',
            redirect: () => primeraVista(SECCIONES_CONCRETOS.flatMap(s => VISTAS_CONCRETOS.map(v =>
              [`concretos/produccion/${s.id}/${v.id}`, `concretos-produccion-${s.id}-${v.id}`] as [string, string]))),
          },
          ...SECCIONES_CONCRETOS.flatMap(s => [
            { path: s.id, redirect: () => primeraVista(VISTAS_CONCRETOS.map(v => [`concretos/produccion/${s.id}/${v.id}`, `concretos-produccion-${s.id}-${v.id}`])) },
            ...VISTAS_CONCRETOS.map(v => ({
              path: `${s.id}/${v.id}`,
              name: `concretos-produccion-${s.id}-${v.id}`,
              component: COMPONENTES_CONCRETOS[`${s.id}-${v.id}`],
              meta: { titulo: `${s.label} · ${v.label}` },
            })),
          ]),
        ],
      },
      rutaMantenimiento('concretos'),
    ],
  },

  { path: '/clientes', name: 'clientes', component: () => import('../views/ClientesView.vue'), meta: { requiresAuth: true, titulo: 'Clientes' } },
  { path: '/configuracion', name: 'configuracion', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, titulo: 'Configuración' } },
  { path: '/admin', redirect: { name: 'configuracion' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Cambiar de pestaña dentro de un módulo no mueve el scroll; cambiar de módulo vuelve arriba
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    const modulo = (r: RouteLocationNormalized) => r.path.split('/').slice(0, 3).join('/')
    if (modulo(to) === modulo(from)) return false
    return { top: 0 }
  },
})

/** Vistas principales en orden de preferencia para redirigir cuando una está bloqueada. */
const HOME_CANDIDATES = ['cuncia', 'acacias', 'concretos', 'clientes']

/** Solo rutas internas: evita redirecciones abiertas tipo //sitio-externo.com */
const esRutaInterna = (p: string | undefined) => !!p && /^\/(?![/\\])/.test(p)

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isAuthenticated) {
    const redirect = to.query.redirect as string | undefined
    return esRutaInterna(redirect) ? redirect! : { name: 'inicio' }
  }

  if (auth.isAuthenticated && to.meta.requiresAuth) {
    await auth.loadProfile()
    if (!auth.isAuthenticated) return { name: 'login' }
    // Contraseña temporal: no se puede navegar hasta cambiarla
    if (auth.mustChangePassword && to.name !== 'configuracion') return { name: 'configuracion' }

    // Permiso = la ruta (canView revisa también los niveles superiores) + permisos extra de la ruta
    const clave = to.path.replace(/^\/+|\/+$/g, '')
    const extra = to.matched.flatMap(r => r.meta.permisosExtra?.(to) ?? [])
    if (clave && clave !== 'configuracion' && (!auth.canView(clave) || extra.some(k => !auth.canView(k)))) {
      const fallback = HOME_CANDIDATES.find(k => auth.canView(k))
      return fallback ? `/${fallback}` : { name: 'configuracion' }
    }
  }
  return true
})

// Título de la pestaña del navegador según la vista
router.afterEach((to) => {
  const t = [...to.matched].reverse().find(r => r.meta.titulo)?.meta.titulo
  const titulo = typeof t === 'function' ? t(to) : t
  document.title = titulo ? `${titulo} · Gravicon` : 'Dashboard Producción — Gravicon'
})

export default router
