<template>
  <template v-if="route.path === '/login'">
    <router-view />
  </template>
  <template v-else>
    <div class="app-layout">
      <!-- Mobile Top Bar -->
      <header class="mobile-header">
        <button class="mobile-menu-btn" @click="collapsed = !collapsed" title="Menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <router-link to="/" class="mobile-logo" aria-label="Gravicon — inicio">
          <img :src="logoSrc" alt="Gravicon" />
        </router-link>
        <!-- Filtros de la vista (solo celular): abre el panel lateral derecho -->
        <button v-if="hayFiltros" class="mobile-menu-btn mobile-filtros-btn" :class="{ activos: filtrosActivos }" :aria-expanded="filtrosAbiertos" aria-label="Filtros" title="Filtros" @click="filtrosAbiertos = !filtrosAbiertos">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
        </button>
        <div v-else style="width: 36px;"></div>
      </header>

      <!-- Panel de filtros en celular: el recuadro de filtros de la vista se vuelve un panel derecho (style.css);
           aquí van el fondo, el título con «cerrar» y el botón para ver los resultados -->
      <template v-if="filtrosAbiertos">
        <div class="filtros-overlay" @click="filtrosAbiertos = false"></div>
        <div class="filtros-panel-head">
          <strong>Filtros</strong>
          <button class="filtros-cerrar" aria-label="Cerrar filtros" @click="filtrosAbiertos = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="filtros-panel-foot">
          <button class="filtros-ver" @click="filtrosAbiertos = false">Ver resultados</button>
        </div>
      </template>

      <!-- Overlay for Mobile Sidebar -->
      <div v-if="!collapsed" class="sidebar-overlay" @click="collapsed = true"></div>

      <aside class="sidebar" :class="{ collapsed }">
        <div class="sidebar-header">
          <router-link v-if="!collapsed" to="/" class="sidebar-brand" aria-label="Gravicon — inicio" @click="handleLinkClick">
            <img :src="logoSrc" alt="Gravicon" />
          </router-link>
          <img v-else :src="theme === 'dark' ? '/Logos/icono-g-blanco.png' : '/Logos/icono-g.png'" alt="Gravicon" class="sidebar-brand-icon" />
          <button class="collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? 'Expandir menú' : 'Colapsar menú'">
            <svg v-if="!collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <nav class="nav" data-guia="menu">
          <template v-for="sec in navSecciones" :key="sec.id">
            <button
              class="nav-section"
              :class="{ active: collapsed ? flyout === sec.id : openMenus[sec.id], actual: sec.actual }"
              :title="collapsed ? sec.label : undefined"
              :aria-expanded="collapsed ? flyout === sec.id : openMenus[sec.id]"
              @click="clickSeccion(sec.id, $event)"
            >
              <!-- Agregados: acopio (pila de material) con su banda transportadora -->
              <svg v-if="sec.id === 'agr'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M3.5 20c1.3-5.4 4.6-9.5 8.5-9.5s7.2 4.1 8.5 9.5"/><path d="M8.5 16.5h.01"/><path d="M12 15h.01"/><path d="M15.5 17h.01"/><path d="M2.5 3.5 12 7"/></svg>
              <!-- Concretos: camión mezclador (mixer) -->
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M15 18H8"/><path d="M4 18H2v-3h13"/><path d="M15 15V9h3l3 4v5h-2"/><ellipse cx="8" cy="9.5" rx="6" ry="3.4" transform="rotate(14 8 9.5)"/><path d="M5 7l1.5 5.3"/><path d="M9 7.5l1 5"/></svg>
              <span v-if="!collapsed">{{ sec.label }}</span>
              <svg v-if="!collapsed" class="chevron" :class="{ open: openMenus[sec.id] }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <!-- Barra expandida: plantas y sus módulos, plegables con animación -->
            <div v-if="!collapsed" class="nav-collapse" :class="{ open: openMenus[sec.id] }" :inert="!openMenus[sec.id]">
              <div class="nav-collapse-inner">
                <div class="nav-children">
                  <template v-for="pl in sec.plantas" :key="pl.id">
                    <!-- Agregados: cada planta con sus módulos debajo -->
                    <template v-if="sec.plantas.length > 1">
                      <div class="nav-planta" :class="{ actual: pl.actual }">
                        <router-link :to="`/${pl.id}`" class="nav-child nav-planta-link" :class="{ active: pl.actual }" @click="abrirPlanta(pl.id); handleLinkClick()">{{ pl.nombre }}</router-link>
                        <button class="nav-planta-toggle" :aria-expanded="!!openPlantas[pl.id]" :aria-label="`${openPlantas[pl.id] ? 'Ocultar' : 'Ver'} módulos de ${pl.nombre}`" @click="openPlantas[pl.id] = !openPlantas[pl.id]">
                          <svg class="chevron" :class="{ open: openPlantas[pl.id] }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                      <div class="nav-collapse" :class="{ open: openPlantas[pl.id] }" :inert="!openPlantas[pl.id]">
                        <div class="nav-collapse-inner">
                          <div class="nav-modulos">
                            <router-link v-for="m in pl.modulos" :key="m.id" :to="m.to" class="nav-modulo" :class="{ active: m.activo }" :aria-current="m.activo ? 'page' : undefined" @click="handleLinkClick">{{ m.label }}</router-link>
                          </div>
                        </div>
                      </div>
                    </template>
                    <!-- Concretos (una sola planta): los módulos van directo bajo la sección -->
                    <div v-else class="nav-modulos nav-modulos-directos">
                      <router-link v-for="m in pl.modulos" :key="m.id" :to="m.to" class="nav-modulo" :class="{ active: m.activo }" :aria-current="m.activo ? 'page' : undefined" @click="handleLinkClick">{{ m.label }}</router-link>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </nav>

        <!-- Barra colapsada: al tocar el ícono de una sección se abre un panel flotante con sus plantas y módulos -->
        <Teleport to="body">
          <Transition name="nav-flyout">
            <div v-if="collapsed && flyoutSeccion" ref="flyoutEl" class="nav-flyout" :style="flyoutPos" role="menu" :aria-label="flyoutSeccion.label">
              <div class="nav-flyout-title">{{ flyoutSeccion.label }}</div>
              <div v-for="pl in flyoutSeccion.plantas" :key="pl.id" class="nav-flyout-grupo">
                <router-link v-if="flyoutSeccion.plantas.length > 1" :to="`/${pl.id}`" class="nav-flyout-planta" :class="{ active: pl.actual }" role="menuitem" @click="cerrarFlyout">{{ pl.nombre }}</router-link>
                <router-link v-for="m in pl.modulos" :key="m.id" :to="m.to" class="nav-flyout-modulo" :class="{ active: m.activo, directo: flyoutSeccion.plantas.length === 1 }" role="menuitem" :aria-current="m.activo ? 'page' : undefined" @click="cerrarFlyout">{{ m.label }}</router-link>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Sidebar Footer with Avatar and Theme / Logout controls -->
        <div class="sidebar-footer" style="position:relative">
          <div class="user-info" v-if="!collapsed" @click="toggleUserMenu" style="cursor:pointer">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-details">
              <span class="user-name">{{ authStore.userEmail }}</span>
              <span class="user-role" style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; display:block;">{{ userRole }}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto; opacity:.5; flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div v-if="collapsed" class="user-avatar" @click="toggleUserMenu" style="cursor:pointer; margin:0 auto;">{{ userInitial }}</div>
          <div v-if="showUserMenu" class="user-menu">
            <div class="user-menu-header">
              <strong style="font-size:12px; display:block; overflow:hidden; text-overflow:ellipsis;">{{ authStore.userEmail }}</strong>
              <span class="role-badge" :class="userRole==='admin' || userRole==='superadmin' ? 'role-admin' : ''">{{ userRole }}</span>
            </div>
            <router-link to="/admin" class="user-menu-item" @click="closeUserMenu">Configuración</router-link>
            <button class="user-menu-item" style="width:100%; text-align:left; background:none; border:none;" @click="abrirGuia">Guía de inicio</button>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" @click="handleLogout" style="width:100%; text-align:left; background:none; border:none;">Cerrar sesión</button>
          </div>
          <div class="footer-actions" :class="{ collapsed }">
            <button class="theme-btn" @click="toggleTheme" :title="theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'">
              <svg v-if="theme === 'light'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <button class="logout-btn" @click="handleLogout" title="Cerrar sesión">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main" :class="{ collapsed }">
        <router-view v-slot="{ Component }">
          <transition name="slide" mode="out-in">
            <!-- Clave = primer tramo de la ruta (/cuncia, /concretos, /configuracion…): cambiar filtros (?query) o
                 pestañas internas no vuelve a montar la página; solo cambiar de planta o de módulo -->
            <component :is="Component" :key="route.path.split('/')[1] ?? ''" />
          </transition>
        </router-view>
      </main>

      <!-- Volver al inicio de la página: aparece al bajar, en todas las vistas -->
      <Transition name="subir">
        <button v-if="mostrarSubir" class="btn-subir" title="Volver arriba" aria-label="Volver al inicio de la página" @click="subir">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
      </Transition>

      <GuiaInicio />
    </div>
  </template>
</template>

<script setup lang="ts">
import { reactive, ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { PLANTAS, type PlantaId } from './config/plantas'
import { moduloVisible } from './router'
import { useTheme } from './composables/useTheme'
import { useGuiaInicio, GUIA_VERSION } from './composables/useGuiaInicio'
import GuiaInicio from './components/ui/GuiaInicio.vue'

const route = useRoute()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()
const logoSrc = computed(() => theme.value === 'dark' ? '/Logos/logo-blanco.webp' : '/Logos/logo-azul.webp')

const collapsed = ref(false)
const openMenus = reactive<Record<'agr' | 'concreto', boolean>>({ agr: true, concreto: true })

// Menú: Agregados (Cuncía, Acacías) y Concretos, cada planta con sus módulos (Producción, Despacho…).
// Solo se muestran los módulos permitidos (mismo criterio que las pestañas de PlantaLayout); una planta
// sin módulos visibles no aparece, y una sección sin plantas tampoco.
type SeccionId = 'agr' | 'concreto'
const SECCIONES: { id: SeccionId; label: string; plantas: PlantaId[] }[] = [
  { id: 'agr', label: 'Agregados', plantas: ['cuncia', 'acacias'] },
  { id: 'concreto', label: 'Concretos', plantas: ['concretos'] },
]
/** Planta y módulo de la ruta actual: /cuncia/produccion/… → ['cuncia', 'produccion'] */
const tramos = computed(() => route.path.split('/').filter(Boolean))
const navSecciones = computed(() => SECCIONES.map(sec => {
  const plantas = sec.plantas
    .filter(id => authStore.canView(id))
    .map(id => {
      const actual = tramos.value[0] === id
      const modulos = PLANTAS[id].modulos
        .filter(m => moduloVisible(id, m.id))
        .map(m => ({ id: m.id, label: m.label, to: { name: `${id}-${m.id}` }, activo: actual && tramos.value[1] === m.id }))
      return { id, nombre: PLANTAS[id].nombre, actual, modulos }
    })
    .filter(p => p.modulos.length)
  return { ...sec, plantas, actual: plantas.some(p => p.actual) }
}).filter(sec => sec.plantas.length))

// Plantas desplegadas (Agregados): la de la ruta actual se abre sola; las demás las abre el usuario
const openPlantas = reactive<Partial<Record<PlantaId, boolean>>>({})
function abrirPlanta(id: PlantaId) { openPlantas[id] = true }
watch(() => tramos.value[0], id => {
  if (!id || !(id in PLANTAS)) return
  // Al cambiar de planta queda desplegada solo la nueva (acordeón); dentro de la misma no se toca
  for (const k of Object.keys(openPlantas) as PlantaId[]) openPlantas[k] = false
  abrirPlanta(id as PlantaId)
  const sec = SECCIONES.find(s => s.plantas.includes(id as PlantaId))
  if (sec) openMenus[sec.id] = true
}, { immediate: true })

// ── Panel flotante con la barra colapsada ──
const flyout = ref<SeccionId | null>(null)
const flyoutEl = ref<HTMLElement | null>(null)
const flyoutTop = ref(0)
const flyoutSeccion = computed(() => navSecciones.value.find(s => s.id === flyout.value) ?? null)
const flyoutPos = computed(() => ({ top: `${flyoutTop.value}px`, left: 'calc(var(--sidebar-collapsed) + 8px)' }))
function cerrarFlyout() { flyout.value = null }
async function clickSeccion(id: SeccionId, e: MouseEvent) {
  if (!collapsed.value) { toggle(id); return }
  if (flyout.value === id) { cerrarFlyout(); return }
  flyout.value = id
  flyoutTop.value = (e.currentTarget as HTMLElement).getBoundingClientRect().top
  // Que no se salga por abajo de la ventana
  await nextTick()
  const alto = flyoutEl.value?.offsetHeight ?? 0
  flyoutTop.value = Math.max(8, Math.min(flyoutTop.value, window.innerHeight - alto - 8))
}
watch(() => route.path, cerrarFlyout)
watch(collapsed, cerrarFlyout)
function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') { cerrarFlyout(); filtrosAbiertos.value = false } }

function handleDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.sidebar-footer')) closeUserMenu()
  if (!target.closest('.nav-flyout') && !target.closest('.nav-section')) cerrarFlyout()
}
// ── Filtros en celular: panel lateral derecho ──
// La vista actual tiene filtros si existe su recuadro .filter-group en el encabezado; «activos» = su botón
// «Limpiar» está visible. Se revisa cuando cambia el contenido (MutationObserver, una vez por cuadro).
const hayFiltros = ref(false)
const filtrosActivos = ref(false)
const filtrosAbiertos = ref(false)
let observador: MutationObserver | null = null
let revisionPendiente = false
function revisarFiltros() {
  if (revisionPendiente) return
  revisionPendiente = true
  requestAnimationFrame(() => {
    revisionPendiente = false
    const grupo = document.querySelector('.main .sticky-top .filter-group')
    hayFiltros.value = !!grupo
    // «Limpiar» está junto a «Actualizar», fuera del recuadro de filtros
    filtrosActivos.value = !!grupo?.closest('.sticky-top')?.querySelector('.clear-filters:not(.oculto), .clear-btn:not(.oculto), .action-btn.clear:not(.oculto)')
    if (!grupo) filtrosAbiertos.value = false
  })
}
watch(filtrosAbiertos, v => document.body.classList.toggle('filtros-abiertos', v))
watch(() => route.path, () => { filtrosAbiertos.value = false; revisarFiltros() })

// Botón «Volver arriba»: visible después de bajar una pantalla aprox.
const mostrarSubir = ref(false)
function onScroll() { mostrarSubir.value = window.scrollY > 500 }
function subir() {
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' })
}
onMounted(() => {
  collapsed.value = window.innerWidth <= 768
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
  observador = new MutationObserver(revisarFiltros)
  observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  revisarFiltros()
})
onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
  observador?.disconnect()
  document.body.classList.remove('filtros-abiertos')
})

const userInitial = computed(() => authStore.userEmail.charAt(0).toUpperCase())
const userRole = computed(() => authStore.role)
const showUserMenu = ref(false)
function toggleUserMenu() { showUserMenu.value = !showUserMenu.value }
function closeUserMenu() { showUserMenu.value = false }

function toggle(key: 'agr' | 'concreto') {
  openMenus[key] = !openMenus[key]
}

function handleLinkClick() {
  if (window.innerWidth <= 768) {
    collapsed.value = true
  }
}

// ── Guía de inicio: se abre sola la primera vez y se repite desde el menú de usuario ──
const guia = useGuiaInicio()
const claveGuia = () => `guia-vista:${authStore.userEmail}`
function guiaVista(): boolean {
  if ((authStore.profile?.tourVersion ?? 0) >= GUIA_VERSION) return true
  // Respaldo local por si no se pudo guardar en el servidor
  try { return Number(localStorage.getItem(claveGuia())) >= GUIA_VERSION } catch { return false }
}
function iniciarGuia() {
  // Se marca como vista apenas se muestra (no al cerrarla): así sale una sola vez aunque el usuario
  // cierre la pestaña o salga sin terminarla. Se puede repetir desde el menú de usuario.
  try { localStorage.setItem(claveGuia(), String(GUIA_VERSION)) } catch { /* sin almacenamiento */ }
  if ((authStore.profile?.tourVersion ?? 0) < GUIA_VERSION) authStore.marcarTourVisto(GUIA_VERSION)
  guia.iniciar(() => {
    if (window.innerWidth <= 768) collapsed.value = true
  })
}
function abrirGuia() {
  closeUserMenu()
  iniciarGuia()
}
// Espera a tener el perfil, que no deba cambiar la contraseña y que esté en un tablero (no en Configuración)
let guiaProgramada = false
watch(() => [authStore.profile, authStore.mustChangePassword, route.name] as const, ([perfil, cambiarClave, nombre]) => {
  if (guiaProgramada || !perfil || cambiarClave || nombre === 'login' || nombre === 'configuracion' || guia.activa.value || guiaVista()) return
  guiaProgramada = true
  // Pequeña espera para que la vista termine de pintarse antes de señalar sus elementos
  setTimeout(() => { if (!guia.activa.value && !guiaVista()) iniciarGuia() }, 900)
}, { immediate: true })
// Al cerrar sesión se reinicia, para que el siguiente usuario en este navegador reciba su propia guía
watch(() => authStore.profile, perfil => {
  if (perfil) return
  guiaProgramada = false
  guia.activa.value = false
})
// En celular el menú lateral se abre solo en los pasos que lo señalan
watch(() => guia.paso.value, p => {
  if (!p || window.innerWidth > 768) return
  collapsed.value = !p.enMenu
})

async function handleLogout() {
  await authStore.signOut()
  // Recarga completa: vacía de la memoria los datos de la sesión anterior (stores) antes del siguiente ingreso
  window.location.replace('/login')
}
</script>

<style>
.app-layout { display: flex; min-height: 100vh; }

.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  overflow: hidden;
  transition: width var(--transition-slow), background-color var(--transition-base), border-color var(--transition-base);
  border-right: 1px solid var(--card-border);
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }

.sidebar-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 48px;
  border-bottom: 1px solid var(--card-border);
  min-height: 64px;
  flex-shrink: 0;
}
.sidebar.collapsed .sidebar-header {
  padding: 12px 8px;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.sidebar-brand { display: flex; align-items: center; justify-content: center; min-width: 0; }
.sidebar:not(.collapsed) .collapse-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); }
.sidebar-brand img { height: 44px; width: auto; display: block; }
.sidebar-brand-icon { width: 28px; height: 28px; display: block; }

.collapse-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.collapse-btn:hover {
  background: var(--card-bg-hover);
  color: var(--sidebar-text-hover);
  border-color: var(--card-border-hover);
}

.nav {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar.collapsed .nav {
  padding: 10px 6px;
  align-items: center;
}

.nav-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  color: var(--sidebar-text);
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 450;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  position: relative;
}
.sidebar.collapsed .nav-section {
  justify-content: center;
  padding: 8px;
  width: 40px;
  border-radius: 8px;
}
.nav-section:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-section.active { color: var(--sidebar-text-hover); background: var(--sidebar-active); }
.nav-section svg { flex-shrink: 0; opacity: .6; }
.nav-section:hover svg,
.nav-section.active svg { opacity: 1; }

.chevron { margin-left: auto; transition: transform var(--transition-base); opacity: .3; }
.chevron.open { transform: rotate(180deg); }

/* Barra colapsada: la sección de la ruta actual queda marcada aunque no tenga texto */
.sidebar.collapsed .nav-section.actual { color: var(--sidebar-text-hover); background: var(--sidebar-active); }
.sidebar.collapsed .nav-section.actual svg { opacity: 1; }

/* Plegar/desplegar con animación de altura (grid 0fr → 1fr, sin medir en JS) */
.nav-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows var(--transition-base), opacity var(--transition-base);
}
.nav-collapse.open { grid-template-rows: 1fr; opacity: 1; }
.nav-collapse-inner { min-height: 0; overflow: hidden; }

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 30px;
  padding-bottom: 6px;
}

/* Planta (Cuncía, Acacías): enlace + botón para ver sus módulos */
.nav-planta { display: flex; align-items: center; gap: 2px; }
.nav-planta-link { flex: 1; min-width: 0; }
/* La planta actual se marca solo con el texto: el fondo queda para el módulo activo */
.nav-planta .nav-planta-link.active { background: none; font-weight: 600; }
.nav-planta .nav-planta-link.active:hover { background: var(--sidebar-hover); }
.nav-planta-toggle {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 6px;
  color: var(--sidebar-text); cursor: pointer; flex-shrink: 0;
  transition: all var(--transition-fast);
}
.nav-planta-toggle:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-planta-toggle .chevron { margin-left: 0; opacity: .8; }
.nav-planta-toggle:focus-visible,
.nav-modulo:focus-visible,
.nav-child:focus-visible,
.nav-section:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

/* Módulos de una planta: lista con guía vertical; el activo se marca con la barra de acento */
.nav-modulos {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 4px 12px;
  padding-left: 8px;
  border-left: 1px solid var(--card-border);
}
.nav-modulos-directos { margin-left: 0; }
.nav-modulo {
  position: relative;
  display: block;
  padding: 5px 10px;
  color: var(--sidebar-text);
  text-decoration: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 450;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all var(--transition-fast);
}
.nav-modulo:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-modulo.active { color: var(--accent); background: var(--sidebar-active); font-weight: 600; }
.nav-modulo.active::before {
  content: '';
  position: absolute;
  left: -9px; top: 6px; bottom: 6px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

/* Panel flotante (barra colapsada) */
.nav-flyout {
  position: fixed;
  z-index: 300;
  min-width: 190px;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 6px;
  /* Fondo sólido en ambos temas (--card-bg es translúcido en el oscuro) */
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
}
.nav-flyout-title {
  padding: 6px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.nav-flyout-grupo + .nav-flyout-grupo { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--card-border); }
.nav-flyout-planta,
.nav-flyout-modulo {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  text-decoration: none;
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.nav-flyout-planta { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.nav-flyout-modulo { padding-left: 20px; font-size: 13px; font-weight: 450; color: var(--text-secondary); }
.nav-flyout-modulo.directo { padding-left: 10px; }
.nav-flyout-planta:hover,
.nav-flyout-modulo:hover { background: var(--card-bg-hover); color: var(--text-primary); }
.nav-flyout-planta.active { color: var(--accent); }
.nav-flyout-modulo.active { color: var(--accent); background: var(--accent-light); font-weight: 600; }
.nav-flyout-enter-active,
.nav-flyout-leave-active { transition: opacity var(--transition-fast), transform var(--transition-fast); }
.nav-flyout-enter-from,
.nav-flyout-leave-to { opacity: 0; transform: translateX(-4px); }

@media (prefers-reduced-motion: reduce) {
  .nav-collapse,
  .nav-flyout-enter-active,
  .nav-flyout-leave-active { transition: none; }
}

.nav-child {
  display: block;
  padding: 6px 12px;
  color: var(--sidebar-text);
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 450;
  transition: all var(--transition-fast);
  position: relative;
}
.nav-child:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-child.active { color: var(--sidebar-text-hover); background: var(--sidebar-active); }

.sidebar-footer {
  border-top: 1px solid var(--card-border);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  transition: all var(--transition-base);
}
.sidebar.collapsed .sidebar-footer {
  padding: 12px 8px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details { overflow: hidden; }

.user-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.user-menu {
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  margin-bottom: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 10;
}
.sidebar.collapsed .user-menu {
  left: 56px;
  bottom: 12px;
  right: auto;
  width: 220px;
}
.user-menu-header {
  padding: 8px 10px;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 4px;
}
.role-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-alt);
  color: var(--text-secondary);
}
.role-badge.role-admin {
  background: #1e293b;
  color: #fff;
}
.user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background .15s;
}
.user-menu-item:hover {
  background: var(--card-bg-hover);
}
.user-menu-divider {
  height: 1px;
  background: var(--card-border);
  margin: 4px 0;
}

.footer-actions {
  display: flex;
  gap: 6px;
}
.footer-actions.collapsed {
  flex-direction: column;
  width: 100%;
  align-items: center;
}

.theme-btn,
.logout-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.theme-btn:hover {
  background: var(--card-bg-hover);
  color: var(--sidebar-text-hover);
  border-color: var(--card-border-hover);
}

.logout-btn:hover {
  color: var(--danger);
  border-color: var(--danger-light);
  background: var(--danger-light);
}

/* Volver arriba (abajo a la derecha, en todas las páginas) */
.btn-subir {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 150;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}
.btn-subir:hover { color: var(--accent); border-color: var(--accent); transform: translateY(-2px); }
.btn-subir:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.subir-enter-active, .subir-leave-active { transition: opacity var(--transition-base), transform var(--transition-base); }
.subir-enter-from, .subir-leave-to { opacity: 0; transform: translateY(8px); }

.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  /* Sin esto el <main> (ítem flex) crece hasta el ancho mínimo de su contenido y en celular
     la página se corta a la derecha; las tablas anchas ya traen su propio scroll horizontal */
  min-width: 0;
  min-height: 100vh;
  transition: margin-left var(--transition-slow), background-color var(--transition-base);
  position: relative;
}
.main.collapsed { margin-left: var(--sidebar-collapsed); }

.mobile-header {
  display: none;
}

@media (max-width: 768px) {
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    background: var(--sidebar-bg);
    border-bottom: 1px solid var(--card-border);
    padding: 0 16px;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 90;
    backdrop-filter: blur(8px);
  }
  
  .mobile-menu-btn {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 6px;
    transition: background-color var(--transition-fast);
  }
  .mobile-menu-btn:hover {
    background: var(--sidebar-hover);
  }
  
  /* Solo el logo de la barra móvil (el estilo de App.vue es global: sin el prefijo afectaba al logo del login) */
  .mobile-header .mobile-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; }
  .mobile-header .mobile-logo img { height: 34px; width: auto; display: block; }

  /* Celular: áreas táctiles más altas en el menú */
  .nav-child { padding: 9px 12px; }
  .nav-modulo { padding: 9px 10px; font-size: 13px; }
  .nav-planta-toggle { width: 36px; height: 36px; }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 190;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 200;
    width: var(--sidebar-width);
    transition: transform var(--transition-slow), background-color var(--transition-base);
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width);
    border-right: none;
  }
  
  .sidebar.collapsed .collapse-btn {
    display: none;
  }
  
  .main {
    margin-left: 0 !important;
    margin-top: 56px;
  }
  
  .main.collapsed {
    margin-left: 0 !important;
  }
}

@media (max-width: 768px) {
  .btn-subir { right: 16px; bottom: 16px; width: 40px; height: 40px; }

  /* Botón «Filtros» de la barra superior; el punto indica que hay filtros aplicados */
  .mobile-filtros-btn { position: relative; }
  .mobile-filtros-btn.activos::after {
    content: ''; position: absolute; top: 6px; right: 6px; width: 8px; height: 8px;
    border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 2px var(--sidebar-bg);
  }
  .filtros-overlay { position: fixed; inset: 0; z-index: 1390; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(3px); }
  .filtros-panel-head,
  .filtros-panel-foot {
    position: fixed; right: 0; z-index: 1410; width: min(340px, 88vw); box-sizing: border-box;
    display: flex; align-items: center; background: var(--bg-elevated);
  }
  .filtros-panel-head { top: 0; height: 56px; padding: 0 8px 0 16px; justify-content: space-between; border-bottom: 1px solid var(--card-border); color: var(--text-primary); font-size: 15px; }
  .filtros-panel-foot { bottom: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--card-border); }
  .filtros-cerrar { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; background: none; border-radius: 8px; color: var(--text-secondary); cursor: pointer; }
  .filtros-cerrar:hover { background: var(--card-bg-hover); color: var(--text-primary); }
  .filtros-ver { width: 100%; padding: 11px; border: none; border-radius: 8px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; }
}
/* En computador el botón y el panel de filtros no existen */
@media (min-width: 769px) {
  .mobile-filtros-btn, .filtros-overlay, .filtros-panel-head, .filtros-panel-foot { display: none !important; }
}

@media print {
  .btn-subir,
  .sidebar,
  .mobile-header,
  .sidebar-overlay,
  .collapse-btn,
  .almacen-view-toggle,
  .informe-control-bar,
  .informe-bar {
    display: none !important;
  }
  .main {
    margin-left: 0 !important;
    margin-top: 0 !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .app-layout {
    display: block !important;
  }
}
</style>
