<template>
  <!-- Va dentro de ConcretosView, que ya pone el margen y el ancho máximo de la página -->
  <div class="produccion-view">
    <template v-if="store.loading">
      <div class="page-state"><div class="spinner" /><span>Cargando datos de concretos...</span></div>
    </template>
    <template v-else-if="store.error">
      <div class="page-state error">
        <span class="error-icon">!</span>
        <div><strong>Error al cargar datos</strong><p>{{ store.error }}</p></div>
        <button class="retry-btn" @click="store.fetchData">Reintentar</button>
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
              <FilterBar :data="rows" date-field="Fecha" :showProvider="false" @dateRangeFilter="onDateRangeFilter" />
              <MultiSelect v-model="selectedPlants" :options="plants" label="Plantas" icon="filter" />
              <MultiSelect v-model="selectedComerciales" :options="comerciales" label="Comercial" icon="user" />
            </div>
          </div>
        </header>

        <!-- Dos secciones (Producción Planta y Proyección Comercial), cada una con sus gráficas y su informe -->
        <nav class="tab-bar">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="tab-btn"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >{{ t.label }}</button>
        </nav>
      </div>

      <!-- Mismo selector de vista que Agregados y Mantenimiento -->
      <VistaToggle v-model="vista" :opciones="vistas" />

      <template v-if="tab === 'produccion'">
        <GraficasTab v-if="vista === 'graficas'" :rows="plantFilteredSheetData?.rows ?? []" :desde="fechaInicio" :hasta="fechaFin" />
        <InformeTab v-else :rows="plantFilteredSheetData?.rows ?? []" :corte="fechaFin" :total-count="store.data?.total" />
      </template>
      <template v-else>
        <ProyeccionGraficasTab v-if="vista === 'graficas'" :rows="plantFilteredSheetData?.rows ?? []" :corte="fechaFin" :plantas-filtro="plantasFiltro" />
        <ProyeccionTab v-else :rows="plantFilteredSheetData?.rows ?? []" :corte="fechaFin" />
      </template>
    </template>
  </div>
</template>

/**
 * ProduccionView.vue — Dashboard de producción de concreto premezclado.
 * Dos secciones, Producción Planta y Proyección Comercial, cada una con sus gráficas y su informe, y aplica filtros
 * globales (fechas, plantas, comercial). Usa useConcretoStore.
 */
<script setup lang="ts">
import { ref, computed, watch, onErrorCaptured, onMounted } from 'vue'
import { useConcretoStore } from '../../stores/concreto'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import MultiSelect from '../../components/ui/MultiSelect.vue'
import { serialToDate, dateToSerial } from '../../utils/dates'

import GraficasTab from './tabs/GraficasTab.vue'
import VistaToggle from '../../components/ui/VistaToggle.vue'
import InformeTab from './tabs/InformeTab.vue'
import ProyeccionTab from './tabs/ProyeccionTab.vue'
import ProyeccionGraficasTab from './tabs/ProyeccionGraficasTab.vue'

onErrorCaptured((err, _vm, info) => {
  console.error('[ProduccionView Error]', err, info)
  try { console.error('STACK:', err.stack) } catch {}
  return false
})

const store = useConcretoStore()
onMounted(() => { store.fetchData() })

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

const fechaInicio = ref('')
const fechaFin = ref('')
const selectedPlants = ref(new Set<string>())
const selectedComerciales = ref(new Set<string>())

watch(() => store.data, (d) => {
  if (d?.rows && Array.isArray(d.rows) && d.rows.length > 0) {
    const serials = d.rows.map(r => Number(r['Fecha'])).filter(v => typeof v === 'number' && !isNaN(v))
    if (serials.length) {
      const minD = serialToDate(Math.min(...serials))
      const maxD = serialToDate(Math.max(...serials))
      fechaInicio.value = `${minD.getUTCFullYear()}-${String(minD.getUTCMonth() + 1).padStart(2, '0')}-${String(minD.getUTCDate()).padStart(2, '0')}`
      fechaFin.value = `${maxD.getUTCFullYear()}-${String(maxD.getUTCMonth() + 1).padStart(2, '0')}-${String(maxD.getUTCDate()).padStart(2, '0')}`
    }
    selectedPlants.value = new Set(plants.value)
    selectedComerciales.value = new Set(comerciales.value)
  }
})

const filteredRows = computed(() => {
  const since = fechaInicio.value ? dateToSerial(fechaInicio.value) : -Infinity
  const until = fechaFin.value ? dateToSerial(fechaFin.value) : Infinity
  return rows.value.filter(r => {
    const v = r['Fecha']
    const fechaOk = typeof v === 'number' && v >= since && v <= until
    const plantOk = selectedPlants.value.size === 0 || selectedPlants.value.has(String(r['Planta'] ?? ''))
    const comercialOk = selectedComerciales.value.size === 0 || selectedComerciales.value.has(comercialDe(r))
    return fechaOk && plantOk && comercialOk
  })
})

// Los informes solo usan filtros de planta+comercial; la fecha fin es su corte
const plantFilteredSheetData = computed(() => {
  const d = store.data
  if (!d) return null
  const filtered = rows.value.filter(r => {
    const plantOk = selectedPlants.value.size === 0 || selectedPlants.value.has(String(r['Planta'] ?? ''))
    const comercialOk = selectedComerciales.value.size === 0 || selectedComerciales.value.has(comercialDe(r))
    return plantOk && comercialOk
  })
  return { headers: d.headers, rows: filtered, total: filtered.length }
})

// Plantas marcadas en el filtro (null = todas); las metas de proyección no vienen en order_price y se filtran aparte
const plantasFiltro = computed(() =>
  selectedPlants.value.size === 0 || selectedPlants.value.size === plants.value.length ? null : [...selectedPlants.value])

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

const tab = ref<'produccion' | 'proyeccion'>('produccion')
const tabs = [
  { id: 'produccion' as const, label: 'Producción Planta' },
  { id: 'proyeccion' as const, label: 'Proyección Comercial' },
]
const vista = ref('graficas')
const vistas = [
  { id: 'graficas', label: 'Gráficas' },
  { id: 'informe', label: 'Informe' },
]
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

.tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 24px;
  overflow-x: auto;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  padding: 2px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
  position: relative;
  border-radius: var(--radius-sm);
}

.tab-btn:hover {
  color: var(--text-primary);
  background: rgba(255,255,255,0.08);
}

.tab-btn.active {
  color: var(--accent);
  font-weight: 600;
  border-bottom-color: var(--accent);
  background: rgba(255,255,255,0.12);
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


@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .filter-group { width: 100%; }
  .tab-btn { padding: 8px 12px; font-size: 12px; }
}
</style>