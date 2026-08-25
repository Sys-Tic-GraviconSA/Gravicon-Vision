<template>
  <div class="page-layout">
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

      <ResumenTab v-if="tab === 'resumen'" :data="DATA" :plant-op="PLANT_OP" />
      <DiarioTab v-else-if="tab === 'diario'" :data="DATA" :sheet-data="plantFilteredSheetData" :plant-op="PLANT_OP" />
      <PlantasTab v-else-if="tab === 'plantas'" :data="DATA" />
      <ComercialTab v-else-if="tab === 'comercial'" :data="DATA" />
      <ClientesTab v-else-if="tab === 'clientes'" :data="DATA" />
      <LogisticaTab v-else-if="tab === 'logistica'" :data="DATA" :plant-op="PLANT_OP" />
      <OperativoTab v-else-if="tab === 'operativo'" :data="DATA" :plant-op="PLANT_OP" />
    </template>
  </div>
</template>

/**
 * ProduccionView.vue — Dashboard de producción de concreto premezclado.
 * Orquesta tabs (Resumen, Diario, Plantas, Comercial, Clientes, Logística,
 * Operativo, Agregados) y aplica filtros globales (fechas, plantas, comercial).
 * Usa useConcretoStore, useDashboardData y useConcretoData.
 */
<script setup lang="ts">
import { ref, computed, watch, onErrorCaptured, onMounted } from 'vue'
import { useConcretoStore } from '../../stores/concreto'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import { useDashboardData } from '../../composables/useDashboardData'
import MultiSelect from '../../components/ui/MultiSelect.vue'
import { serialToDate, dateToSerial } from '../../utils/dates'

import ResumenTab from './tabs/ResumenTab.vue'
import DiarioTab from './tabs/DiarioTab.vue'
import PlantasTab from './tabs/PlantasTab.vue'
import ComercialTab from './tabs/ComercialTab.vue'
import ClientesTab from './tabs/ClientesTab.vue'
import LogisticaTab from './tabs/LogisticaTab.vue'
import OperativoTab from './tabs/OperativoTab.vue'

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

const comerciales = computed(() => {
  const set = new Set<string>()
  for (const r of rows.value) {
    const val = String(r['Comercial'] ?? '').trim()
    if (val) set.add(val)
  }
  return [...set].sort()
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
    const comercialVal = String(r['Comercial'] ?? '').trim()
    const comercialOk = selectedComerciales.value.size === 0 || !comercialVal || selectedComerciales.value.has(comercialVal)
    return fechaOk && plantOk && comercialOk
  })
})

const filteredSheetData = computed(() => {
  const d = store.data
  if (!d) return null
  return { headers: d.headers, rows: filteredRows.value, total: filteredRows.value.length }
})

// Separate filtered data for DiarioTab: only plant+commercial filters, NO date range
// DiarioTab handles its own date (hoy/ayer), so date-range must not restrict it
const plantFilteredSheetData = computed(() => {
  const d = store.data
  if (!d) return null
  const filtered = rows.value.filter(r => {
    const plantOk = selectedPlants.value.size === 0 || selectedPlants.value.has(String(r['Planta'] ?? ''))
    const comercialVal = String(r['Comercial'] ?? '').trim()
    const comercialOk = selectedComerciales.value.size === 0 || !comercialVal || selectedComerciales.value.has(comercialVal)
    return plantOk && comercialOk
  })
  return { headers: d.headers, rows: filtered, total: filtered.length }
})

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
  const m = DATA.value.meta
  if (!m?.fechaFin) return null
  const lag = daysBetween(m.fechaFin, todayBogotaKey())
  const updateLabel = m.lastUpdate ? new Date(m.lastUpdate).toLocaleString('es-CO') : ''
  if (lag <= 1) return { label: `Datos al día ${m.fechaFin}`, cls: 'fresh-ok', title: `Actualizado: ${updateLabel}` }
  if (lag <= 3) return { label: `Retraso ${lag} días`, cls: 'fresh-warn', title: `Último dato: ${m.fechaFin} · Actualizado: ${updateLabel}` }
  return { label: `Desactualizado ${lag} días`, cls: 'fresh-danger', title: `Último dato: ${m.fechaFin} · Actualizado: ${updateLabel}` }
})

const lastUpdateRef = computed(() => store.lastUpdate)
const { DATA, PLANT_OP } = useDashboardData(filteredSheetData, lastUpdateRef)

const tab = ref('resumen')
const tabs = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'diario', label: 'Diario' },
  { id: 'plantas', label: 'Plantas' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'logistica', label: 'Logística' },
  { id: 'operativo', label: 'Operativo' },
]
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px;
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