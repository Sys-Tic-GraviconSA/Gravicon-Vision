<template>
  <!-- Va dentro de PlantaLayout (/concretos), que ya pone el margen y el ancho máximo de la página -->
  <div class="produccion-view">
    <template v-if="store.loading">
      <SkeletonLoader variant="dashboard" :kpis="4" :charts="3" label="Cargando datos de concretos…" />
    </template>
    <template v-else-if="store.error">
      <div class="page-state error">
        <span class="error-icon">!</span>
        <div><strong>Error al cargar datos</strong><p>{{ store.error }}</p></div>
        <button class="retry-btn" @click="store.fetchData(true)">Reintentar</button>
      </div>
    </template>
    <template v-else-if="!rows.length">
      <div class="page-state"><span>No hay datos de concretos disponibles.</span></div>
    </template>
    <template v-else>
      <div class="sticky-top">
        <header class="page-header">
          <h2 class="page-title">
            Producción Concretos
            <span v-if="freshness" class="freshness-badge" :class="freshness.cls" :title="freshness.title">{{ freshness.label }}</span>
          </h2>
          <div class="header-actions">
            <div class="filter-group">
              <FilterBar :data="rows" date-field="Fecha" :showProvider="false" :from="fechaInicio" :to="fechaFin" @dateRangeFilter="onDateRangeFilter" />
              <MultiSelect v-model="selectedPlants" :options="plants" label="Plantas" icon="filter" />
              <MultiSelect v-model="selectedComerciales" :options="comerciales" label="Comercial" icon="user" />
              <MultiSelect v-model="selectedClientes" :options="clientes" label="Cliente" icon="user" searchable />
              <button v-if="hayFiltros" class="clear-filters" title="Quitar filtros" @click="limpiarFiltros">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Secciones: /concretos/produccion/planta/… y /concretos/produccion/proyeccion/… -->
        <RouteTabs variant="sub" :items="secciones" :activo="seccionActiva" aria-label="Sección" />
      </div>

      <RouteTabs variant="toggle" :items="vistas" :activo="vistaActiva" aria-label="Vista" replace />

      <!-- Cada combinación sección/vista es una ruta hija; recibe solo las props que usa -->
      <RouterView v-slot="{ Component }">
        <component :is="Component" v-bind="propsHija" />
      </RouterView>
    </template>
  </div>
</template>

/**
 * ProduccionView.vue — Producción de concreto premezclado (layout de /concretos/produccion).
 * Carga order_price, aplica los filtros globales (fechas, plantas, comercial, cliente; todos en la URL)
 * y renderiza la ruta hija de la sección y vista:
 *   /concretos/produccion/planta/graficas      → GraficasTab
 *   /concretos/produccion/planta/informe       → InformeTab
 *   /concretos/produccion/proyeccion/graficas  → ProyeccionGraficasTab
 *   /concretos/produccion/proyeccion/informe   → ProyeccionTab
 */
<script setup lang="ts">
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import { computed, onErrorCaptured, onMounted } from 'vue'
import { useQueryDate, useQuerySet } from '../../composables/useQueryState'
import { useConcretoStore } from '../../stores/concreto'
import { useClientesStore } from '../../stores'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import MultiSelect from '../../components/ui/MultiSelect.vue'
import { serialToDate, dateToSerial } from '../../utils/dates'

import RouteTabs from '../../components/ui/RouteTabs.vue'
import { SECCIONES_CONCRETOS, VISTAS_CONCRETOS } from '../../config/plantas'
import { useRoute } from 'vue-router'

onErrorCaptured((err, _vm, info) => {
  console.error('[ProduccionView Error]', err, info)
  try { console.error('STACK:', err.stack) } catch {}
  return false
})

const route = useRoute()
const store = useConcretoStore()
const clientesStore = useClientesStore()
onMounted(() => {
  store.fetchData()
  if (!clientesStore.data && !clientesStore.loading) clientesStore.fetchData()
})

const rows = computed(() => store.data?.rows ?? [])

const plants = computed(() => {
  const set = new Set<string>()
  for (const r of rows.value) set.add(String(r['Planta'] ?? ''))
  return [...set].sort()
})

// Las remisiones sin comercial se agrupan en una opción propia; antes pasaban siempre el filtro
const SIN_COMERCIAL = 'Sin comercial'
function comercialDe(r: Record<string, unknown>): string {
  return String(r['Comercial'] ?? '').trim() || SIN_COMERCIAL
}
const comerciales = computed(() => {
  const set = new Set<string>()
  for (const r of rows.value) set.add(comercialDe(r))
  return [...set].sort((a, b) => (a === SIN_COMERCIAL ? 1 : b === SIN_COMERCIAL ? -1 : a.localeCompare(b)))
})

// Filtros guardados en la URL: sobreviven a recargar y se pueden compartir con un enlace
const fechaInicio = useQueryDate('desde')
const fechaFin = useQueryDate('hasta')
const selectedPlants = useQuerySet('planta', () => plants.value)
const selectedComerciales = useQuerySet('comercial', () => comerciales.value)

// Clientes: los de order_price más los proyectados que aún no tienen despachos
// (se comparan sin espacios ni puntuación, igual que el cruce del informe de proyección)
const clienteDe = (r: Record<string, unknown>) => String(r['Cliente'] ?? '').trim() || 'Sin cliente'
const normCliente = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
const clientes = computed(() => {
  const porNorm = new Map<string, string>()
  for (const r of rows.value) { const c = clienteDe(r); if (!porNorm.has(normCliente(c))) porNorm.set(normCliente(c), c) }
  for (const r of (clientesStore.allRows ?? []) as Record<string, unknown>[]) {
    const c = String(r.nombre_cliente ?? '').trim()
    const k = normCliente(c)
    // «CLIENTE / CALLE» es la fila genérica de clientes de calle, no un cliente real
    if (c && k !== 'CLIENTE' && !porNorm.has(k)) porNorm.set(k, c)
  }
  return [...porNorm.values()].sort((a, b) => a.localeCompare(b))
})
const selectedClientes = useQuerySet('cliente', () => clientes.value)

// Rango de fechas de los datos: es el rango por defecto cuando la URL no trae fechas
const rangoDatos = computed(() => {
  const serials = rows.value.map(r => Number(r['Fecha'])).filter(v => Number.isFinite(v) && v > 0)
  if (!serials.length) return { desde: '', hasta: '' }
  const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  return { desde: iso(serialToDate(Math.min(...serials))), hasta: iso(serialToDate(Math.max(...serials))) }
})
const fechaEfectivaInicio = computed(() => fechaInicio.value || rangoDatos.value.desde)
const fechaEfectivaFin = computed(() => fechaFin.value || rangoDatos.value.hasta)

// Sin opciones marcadas = sin filtro (paso intermedio al desmarcar «Todos» para elegir unas pocas)
const pasa = (sel: Set<string>, v: string) => sel.size === 0 || sel.has(v)
const filtroPlanta = (r: Record<string, unknown>) => pasa(selectedPlants.value, String(r['Planta'] ?? ''))
const filtroComercial = (r: Record<string, unknown>) => pasa(selectedComerciales.value, comercialDe(r))
const filtroCliente = (r: Record<string, unknown>) => pasa(selectedClientes.value, clienteDe(r))

const filteredRows = computed(() => {
  const since = fechaEfectivaInicio.value ? dateToSerial(fechaEfectivaInicio.value) : -Infinity
  const until = fechaEfectivaFin.value ? dateToSerial(fechaEfectivaFin.value) : Infinity
  return rows.value.filter(r => {
    const v = r['Fecha']
    return typeof v === 'number' && v >= since && v <= until && filtroPlanta(r) && filtroComercial(r) && filtroCliente(r)
  })
})

const hayFiltros = computed(() => !!(fechaInicio.value || fechaFin.value)
  || !esTodo(selectedPlants.value, plants.value)
  || !esTodo(selectedComerciales.value, comerciales.value)
  || !esTodo(selectedClientes.value, clientes.value))
function limpiarFiltros() {
  fechaInicio.value = ''
  fechaFin.value = ''
  selectedPlants.value = new Set(plants.value)
  selectedComerciales.value = new Set(comerciales.value)
  selectedClientes.value = new Set(clientes.value)
}

// Los informes usan planta + comercial + cliente; la fecha fin es su corte
const plantFilteredSheetData = computed(() => {
  const d = store.data
  if (!d) return null
  const filtered = rows.value.filter(r => filtroPlanta(r) && filtroComercial(r) && filtroCliente(r))
  return { headers: d.headers, rows: filtered, total: filtered.length }
})

// Plantas marcadas en el filtro (null = todas); las metas de proyección no vienen en order_price y se filtran aparte
const esTodo = (sel: Set<string>, opciones: string[]) => sel.size === 0 || sel.size === opciones.length
const plantasFiltro = computed(() =>
  esTodo(selectedPlants.value, plants.value) ? null : [...selectedPlants.value])
// Clientes marcados (null = todos); la proyección los cruza por nombre con proyecciones_clientes
const clientesFiltro = computed(() =>
  esTodo(selectedClientes.value, clientes.value) ? null : [...selectedClientes.value])

function onDateRangeFilter(range: { from: string | null; to: string | null }) {
  fechaInicio.value = range.from ?? ''
  fechaFin.value = range.to ?? ''
}

function todayBogotaKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function daysBetween(from: string, to: string): number {
  const t1 = Date.parse(`${from}T00:00:00-05:00`)
  const t2 = Date.parse(`${to}T00:00:00-05:00`)
  return Math.floor((t2 - t1) / (24 * 60 * 60 * 1000))
}

const freshness = computed(() => {
  const serials = filteredRows.value.map(r => Number(r['Fecha'])).filter(v => !isNaN(v))
  if (!serials.length) return null
  const d = serialToDate(Math.max(...serials))
  const m = { fechaFin: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` }
  const updateLabel = store.lastUpdate ? new Date(store.lastUpdate).toLocaleString('es-CO') : ''
  const lag = daysBetween(m.fechaFin, todayBogotaKey())
  if (lag <= 1) return { label: `Datos al día ${m.fechaFin}`, cls: 'fresh-ok', title: `Actualizado: ${updateLabel}` }
  if (lag <= 3) return { label: `Retraso ${lag} días`, cls: 'fresh-warn', title: `Último dato: ${m.fechaFin} · Actualizado: ${updateLabel}` }
  return { label: `Desactualizado ${lag} días`, cls: 'fresh-danger', title: `Último dato: ${m.fechaFin} · Actualizado: ${updateLabel}` }
})

// ── Sección y vista: rutas hijas /concretos/produccion/:seccion/:vista ──
// Los nombres de ruta son concretos-produccion-<seccion>-<vista>; al cambiar se conservan los filtros (?query)
const partesRuta = computed(() => String(route.name ?? '').replace('concretos-produccion-', '').split('-'))
const seccionActiva = computed(() => partesRuta.value[0] ?? 'planta')
const vistaActiva = computed(() => partesRuta.value[1] ?? 'graficas')
const secciones = computed(() => SECCIONES_CONCRETOS.map(s => ({
  id: s.id, label: s.label, to: { name: `concretos-produccion-${s.id}-${vistaActiva.value}`, query: route.query },
})))
const vistas = computed(() => VISTAS_CONCRETOS.map(v => ({
  id: v.id, label: v.label, to: { name: `concretos-produccion-${seccionActiva.value}-${v.id}`, query: route.query },
})))

const propsHija = computed(() => {
  const rows = plantFilteredSheetData.value?.rows ?? []
  switch (route.name) {
    case 'concretos-produccion-planta-graficas':
      return { rows, desde: fechaEfectivaInicio.value, hasta: fechaEfectivaFin.value }
    case 'concretos-produccion-planta-informe':
      return { rows, corte: fechaEfectivaFin.value, totalCount: store.data?.total }
    default:
      return { rows, corte: fechaEfectivaFin.value, plantasFiltro: plantasFiltro.value, clientesFiltro: clientesFiltro.value }
  }
})
</script>

<style scoped>
.produccion-view { min-width: 0; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 0;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
}

.page-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 15px;
  flex-direction: column;
}
.page-state.error {
  color: var(--danger);
  background: var(--danger-light);
  border-radius: var(--radius-lg);
  margin: 20px 0;
}
.error-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
}
.page-state.error p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
.retry-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  font-weight: 600;
}
.retry-btn:hover { background: var(--danger); color: #fff; }
.spinner {
  width: 24px; height: 24px;
  border: 3px solid var(--card-border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.freshness-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  letter-spacing: .3px;
  cursor: help;
}
.freshness-badge.fresh-ok {
  background: rgba(34,197,94,.15);
  color: #22C55E;
  border: 1px solid rgba(34,197,94,.3);
}
.freshness-badge.fresh-warn {
  background: rgba(232,145,58,.15);
  color: #E8913A;
  border: 1px solid rgba(232,145,58,.3);
}
.freshness-badge.fresh-danger {
  background: rgba(239,68,68,.15);
  color: #EF4444;
  border: 1px solid rgba(239,68,68,.3);
}


.filter-group { flex-wrap: wrap; }
.clear-filters {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px;
  border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-tertiary);
  font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all var(--transition-fast);
}
.clear-filters:hover { background: var(--danger-light); color: var(--danger); }

@media (max-width: 768px) {
  /* En celular el encabezado no se queda fijo: ocuparía media pantalla */
  .sticky-top { position: static; }
  .page-header { flex-direction: column; align-items: stretch; gap: 8px; padding: 4px 0; }
  .page-title { font-size: 17px; flex-wrap: wrap; }
  .header-actions { width: 100%; }
  .filter-group { position: static; width: 100%; box-sizing: border-box; padding: 6px; gap: 4px; }
  .filter-group > * { flex: 1 1 auto; }
}
</style>