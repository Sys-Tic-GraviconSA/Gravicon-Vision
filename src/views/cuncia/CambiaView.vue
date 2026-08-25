<template>
  <div class="page-layout">
    <header class="page-header">
      <h2 class="page-title">Cuncia</h2>
    </header>

    <nav class="tab-bar">
      <button v-for="t in tabs" :key="t.id" class="tab-btn" :class="{ active: activeTab === t.id }" @click="navigateTo(t.id)">{{ t.label }}</button>
    </nav>

    <!-- Tab: Producción -->
    <template v-if="activeTab === 'produccion'">
      <template v-if="store.loading">
        <div class="page-state"><div class="spinner" /><span>Cargando datos de Cuncia...</span></div>
      </template>
      <template v-else-if="store.error">
        <div class="page-state error">
          <span class="error-icon">!</span>
          <div><strong>Error al cargar datos</strong><p>{{ store.error }}</p></div>
          <button class="retry-btn" @click="store.fetchCuncia()">Reintentar</button>
        </div>
      </template>
      <template v-else-if="!diario.length">
        <div class="page-state"><span>No hay datos disponibles para Cuncia.</span></div>
      </template>
      <template v-else>
        <div class="sticky-top">
          <header class="page-header">
            <h2 class="page-title">Agregados Producción Cuncia</h2>
            <div class="header-actions">
              <div class="filter-group">
                <FilterBar :data="diario" date-field="Fecha" :showProvider="false" @dateRangeFilter="onDateRangeFilter" @clear="onClearFilters" />
              </div>
              <button class="action-btn" @click="loadData" :disabled="store.loading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                {{ store.loading ? 'Cargando...' : 'Actualizar' }}
              </button>
              <button v-if="hasActiveFilters" class="action-btn clear" @click="onClearFilters">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Limpiar
              </button>
            </div>
          </header>
        </div>
        <nav class="sub-tab-bar">
          <button class="sub-tab-btn" :class="{ active: prodTab === 'resumen' }" @click="prodTab = 'resumen'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Gráficas
          </button>
          <button class="sub-tab-btn" :class="{ active: prodTab === 'ordenes' }" @click="prodTab = 'ordenes'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Detalles
          </button>
        </nav>
        <ResumenTab v-if="prodTab === 'resumen'" :config="config" :data="filteredDiario" />
        <div v-else-if="prodTab === 'ordenes'" class="table-section">
          <div class="ots-section">
            <div class="ots-bar">
              <div class="ots-stats">
                <span><strong>{{ filteredDiario.length }}</strong> registros</span>
                <span class="ots-dot"></span>
                <span>Producción total <strong>{{ fmt(filteredDiario.reduce((s, r) => s + (Number(r['Total de M³']) || 0), 0)) }} m³</strong></span>
              </div>
              <div class="ots-actions">
                <input v-model="otFilterInput" class="ots-search" placeholder="Buscar..." />
              </div>
            </div>
            <DataTable title="Producción Cuncia — Detalle Diario" :data="filteredTableData" :page-size="20" :percentFields="['% Cumplimiento']" :semaphoreFields="['% Cumplimiento']" small selectColumns exportColumns />
          </div>
        </div>
      </template>
    </template>

    <!-- Tab: Programación -->
    <ProgramacionView v-if="activeTab === 'programacion'" />

    <!-- Tab: Mantenimiento -->
    <EquiposDashboard v-if="activeTab === 'mantenimiento'" planta="cuncia" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProduccionStore } from '../../stores'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import ResumenTab from '../agregados/ResumenTab.vue'
import ProgramacionView from '../agregados/ProgramacionView.vue'
import EquiposDashboard from '../EquiposDashboard.vue'
import { serialToDate } from '../../utils/dates'
import { fmt } from '../../utils/format'
import type { PlantConfig } from '../agregados/ResumenTab.vue'

const config: PlantConfig = {
  plantName: 'Cuncia',
  lineLabel: 'Línea',
  lines: [
    { key: 'Cañaveral', label: 'Cañaveral' },
    { key: 'Guayuriba', label: 'Guayuriba' },
    { key: 'Linea 3', label: 'Línea 3' },
  ],
  palette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
}

const route = useRoute()
const router = useRouter()
const store = useProduccionStore()

const tabs = [
  { id: 'produccion', label: 'Producción' },
  { id: 'programacion', label: 'Programación' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
]

const activeTab = computed(() => {
  const path = route.path
  if (path.includes('/programacion')) return 'programacion'
  if (path.includes('/mantenimiento')) return 'mantenimiento'
  return 'produccion'
})

function navigateTo(tab: string) {
  if (tab === 'produccion') router.push('/cuncia')
  else router.push(`/cuncia/${tab}`)
}

const prodTab = ref('resumen')
const diario = computed(() => store.cunciaData?.rows ?? [])
const fechaInicio = ref('')
const fechaFin = ref('')

function dateToSerial(iso: string): number {
  if (!iso) return 0
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000 + 25569
}

onMounted(() => {
  if (activeTab.value === 'produccion') store.fetchCuncia()
})

watch(activeTab, (tab) => {
  if (tab === 'produccion' && !diario.value.length) store.fetchCuncia()
})

watch(diario, () => {
  fechaInicio.value = ''
  fechaFin.value = ''
}, { immediate: true })

const filteredDiario = computed(() => {
  const since = fechaInicio.value ? dateToSerial(fechaInicio.value) : -Infinity
  const until = fechaFin.value ? dateToSerial(fechaFin.value) : Infinity
  return diario.value.filter(r => {
    const v = Number(r['Fecha'])
    return typeof v === 'number' && !isNaN(v) && v >= since && v <= until
  })
})

const tableData = computed(() => {
  return filteredDiario.value.map(r => {
    const serial = Number(r['Fecha'])
    const dateStr = serial ? serialToDate(serial).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
    const total = Number(r['Total de M³']) || 0
    const proyectado = Number(r['M³ Proyectado']) || 0
    const diferencia = total - proyectado
    return {
      Fecha: dateStr,
      'Cañaveral': Number(r['Cañaveral']) || 0,
      'Guayuriba': Number(r['Guayuriba']) || 0,
      'Línea 3': Number(r['Linea 3']) || 0,
      'Total de M³': total,
      'M³ Proyectado': proyectado,
      'Diferencia': diferencia,
      '% Cumplimiento': r['% Cumplimiento'] ?? '',
    }
  })
})

const otFilterInput = ref('')
const filteredTableData = computed(() => {
  const q = otFilterInput.value.toLowerCase()
  if (!q) return tableData.value
  return tableData.value.filter(r =>
    Object.values(r).some(v => String(v).toLowerCase().includes(q))
  )
})

function onDateRangeFilter(range: { from: string | null; to: string | null }) {
  fechaInicio.value = range.from ?? ''
  fechaFin.value = range.to ?? ''
}

const hasActiveFilters = computed(() =>
  fechaInicio.value !== '' || fechaFin.value !== ''
)

function onClearFilters() {
  fechaInicio.value = ''
  fechaFin.value = ''
}

function loadData() {
  store.fetchCuncia()
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
}
.page-title { margin: 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }

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
.sub-tab-bar {
  display: flex;
  gap: 2px;
  margin-bottom: 20px;
}
.sub-tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sub-tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
.sub-tab-btn.active { color: var(--accent); background: rgba(255,255,255,0.1); font-weight: 600; }
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
  border-radius: var(--radius-sm);
}
.tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); }
.tab-btn.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--accent); background: rgba(255,255,255,0.12); }

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-group .dropdown-toggle,
.filter-group :deep(.dropdown-toggle) {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 6px 4px;
  box-shadow: none;
}
.filter-group .dropdown-toggle:hover,
.filter-group :deep(.dropdown-toggle:hover) {
  background: transparent;
  color: var(--accent);
}
.filter-group .badge,
.filter-group :deep(.badge) {
  background: transparent;
  padding: 0 4px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.action-btn:hover {
  background: rgba(59,130,246,.2);
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-btn.clear {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--card-border);
}
.action-btn.clear:hover {
  background: var(--bg-alt);
  color: var(--text-primary);
}
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
}
.table-section { margin-top: 24px; }
.ots-section { margin-top: 8px; }
.ots-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.ots-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ots-stats strong {
  color: var(--text-primary);
  font-weight: 700;
}
.ots-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: .4;
}
.ots-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ots-search {
  padding: 8px 12px 8px 32px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  background: var(--bg);
  color: var(--text-primary);
  font-size: 13px;
  min-width: 220px;
  outline: none;
  transition: border-color var(--transition-fast);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}
.ots-search:focus { border-color: var(--accent); }
.ots-search::placeholder { color: var(--text-tertiary); }

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

@media (max-width: 1024px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .filter-group { width: 100%; flex-wrap: wrap; }
}
</style>
