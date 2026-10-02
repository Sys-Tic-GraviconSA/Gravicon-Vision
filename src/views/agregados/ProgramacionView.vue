<template>
  <div class="page-layout">
    <SkeletonLoader v-if="loading && !rows.length" variant="dashboard" :kpis="4" :charts="2" label="Cargando programación…" />
    <div class="page-state error" v-else-if="error">
      <span class="error-icon">!</span>
      <div><strong>Error al cargar datos</strong><p>{{ error }}</p></div>
      <button class="retry-btn" @click="fetchData(true)">Reintentar</button>
    </div>
    <div class="page-state" v-else-if="!rows.length">
      <span>No hay datos disponibles.</span>
    </div>
    <template v-else>
      <div class="sticky-top">
        <header class="page-header">
          <h2 class="page-title">Programación Agregados</h2>
          <div class="header-actions">
            <div class="filter-group">
              <FilterBar :data="tableSource" date-field="Fecha" :showProvider="false" :from="fechaInicio" :to="fechaFin" @dateRangeFilter="onDateRangeFilter" />
              <MultiSelect v-model="selectedMaterials" :options="materialOptions" label="Material" icon="filter" />
              <MultiSelect v-model="selectedTransports" :options="transportOptions" label="Transporte" icon="filter" />
              <MultiSelect v-model="selectedResponsables" :options="responsableOptions" label="Responsable" icon="user" />
            </div>
            <!-- «Limpiar» en la misma fila que «Actualizar» -->
            <button class="clear-filters" :class="{ oculto: !hasActiveFilters }" :tabindex="hasActiveFilters ? 0 : -1" :aria-hidden="!hasActiveFilters" title="Quitar filtros" @click="clearFilters">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Limpiar</span>
            </button>
            <button class="action-btn" :disabled="loading" title="Volver a leer la programación" @click="fetchData(true)">
              <svg class="icono-actualizar" :class="{ girando: loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {{ loading ? 'Actualizando…' : 'Actualizar' }}
            </button>
          </div>
        </header>
      </div>

      <!-- Empresa y unidad (fuera del encabezado fijo: al bajar solo quedan título y filtros) -->
        <nav class="tab-bar">
          <RouterLink v-for="t in tabs" :key="t.id" :to="{ params: { empresa: t.id } }" class="tab-btn" :class="{ active: activeTab === t.id }" :aria-current="activeTab === t.id ? 'page' : undefined">{{ t.label }}</RouterLink>
        </nav>

        <nav class="sub-tab-bar">
          <button v-for="u in unitOpts" :key="u" class="sub-tab-btn" :class="{ active: activeUnit === u }" @click="activeUnit = u">{{ u }}</button>
        </nav>

      <div class="kpi-row kpi-3">
        <KpiCard label="Registros" accent="#6366F1" icon="list">{{ unitFiltered.length }}</KpiCard>
        <KpiCard label="Total Programado" accent="#10B981" icon="layers">{{ fmt(unitTotal) }} <small>{{ activeUnit }}</small></KpiCard>
        <KpiCard label="Clientes" accent="#E8913A" icon="users">{{ unitClients }}</KpiCard>
      </div>

      <div v-for="mat in unitMaterialTables" :key="mat.material" class="material-section">
        <div class="section-header">
          <h3 class="section-title"><span class="title-bar"></span>{{ mat.material }}</h3>
          <span class="section-count">{{ mat.rows.length }} registros · {{ fmt(mat.total) }} {{ activeUnit }}</span>
        </div>
        <DataTable :title="mat.material" :data="mat.table" :page-size="999" searchable small fixed :columnWidths="colWidths" :highlightField="'_total'" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQueryDate, useQuerySet, NINGUNA } from '../../composables/useQueryState'
import { cargarConCache } from '../../stores/api'
import { useAuthStore } from '../../stores/auth'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import MultiSelect from '../../components/ui/MultiSelect.vue'

const colWidths: Record<string, string> = {
  'Fecha': '90px',
  'Cliente': '200px',
  'Cantidad': '100px',
  'Transporte': '150px',
  'Responsable': '150px',
}

const rows = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
// Empresa en la ruta: /:planta/programacion/:empresa
const route = useRoute()
const activeTab = computed(() => (route.params.empresa === 'cliente' ? 'cliente' : 'gravicon'))
const activeUnit = ref('')
// Filtros en la URL (como el resto de módulos): fechas y listas; sin marca = todos
const fechaInicio = useQueryDate('desde')
const fechaFin = useQueryDate('hasta')

/** Copia local al instante y luego datos del servidor; `force` (Reintentar) salta las cachés */
function fetchData(force = false) {
  return cargarConCache<{ rows?: any[] }>({
    url: `/api/programacion-agregados/data${force ? '?force=true' : ''}`, force,
    hayDatos: () => rows.value.length > 0, aplicar: j => { rows.value = j.rows ?? [] }, limpiar: () => { rows.value = [] },
    loading, error, etiqueta: 'programacion-agregados',
  })
}

onMounted(() => fetchData())

const fmt = (n: number) => n?.toLocaleString('es-CO', { maximumFractionDigits: 1 }) ?? '0'

function isoFromRow(r: any): string {
  return String(r['fecha_de_servicio'] ?? '').slice(0, 10)
}

function dateToSerial(iso: string): number {
  if (!iso) return 0
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000 + 25569
}

const tableSource = computed<any[]>(() =>
  rows.value.map(r => ({
    ...r,
    'Fecha': dateToSerial(isoFromRow(r)),
  }))
)

function onDateRangeFilter(range: { from: string | null; to: string | null }) {
  fechaInicio.value = range.from ?? ''
  fechaFin.value = range.to ?? ''
}

// Cada empresa es una vista con su permiso (…/programacion/gravicon | cliente): solo las permitidas
const authStore = useAuthStore()
const tabs = computed(() => [
  { id: 'gravicon' as const, label: 'Gravicon/Incondor' },
  { id: 'cliente' as const, label: 'Transporte Cliente' },
].filter(t => authStore.canView(`${route.path.split('/')[1]}/programacion/${t.id}`)))

// ── Filtros en cascada: cada lista muestra solo lo que existe con las fechas y los demás filtros marcados ──
const CAMPOS = { material: 'tipo_de_material', transporte: 'responsable_del_transporte', responsable: 'responsable_del_registro' } as const
type Filtro = keyof typeof CAMPOS
const valor = (r: any, f: Filtro) => String(r[CAMPOS[f]] ?? '').trim()
const marcadosUrl = (key: string): Set<string> | null => {
  const raw = route.query[key]
  if (raw === undefined || raw === null) return null
  const v = (Array.isArray(raw) ? raw : [raw]).map(String).filter(x => x !== NINGUNA)
  return v.length ? new Set(v) : null
}
const enFechas = computed(() => {
  const since = fechaInicio.value ? dateToSerial(fechaInicio.value) : -Infinity
  const until = fechaFin.value ? dateToSerial(fechaFin.value) : Infinity
  return tableSource.value.filter(r => { const v = Number(r['Fecha']); return !isNaN(v) && v >= since && v <= until })
})
/** Filas en las fechas que pasan los filtros marcados en la URL, menos el indicado (`salvo`) */
function filasPara(salvo?: Filtro) {
  const sel = (Object.keys(CAMPOS) as Filtro[]).filter(f => f !== salvo).map(f => [f, marcadosUrl(f)] as const)
  return enFechas.value.filter(r => sel.every(([f, m]) => !m || m.has(valor(r, f))))
}
const opciones = (f: Filtro) => [...new Set(filasPara(f).map(r => valor(r, f)).filter(Boolean))].sort()
const materialOptions = computed(() => opciones('material'))
const transportOptions = computed(() => opciones('transporte'))
const responsableOptions = computed(() => opciones('responsable'))
const selectedMaterials = useQuerySet('material', () => materialOptions.value)
const selectedTransports = useQuerySet('transporte', () => transportOptions.value)
const selectedResponsables = useQuerySet('responsable', () => responsableOptions.value)

const hasActiveFilters = computed(() => !!(fechaInicio.value || fechaFin.value) || (Object.keys(CAMPOS) as Filtro[]).some(f => !!marcadosUrl(f)))

function clearFilters() {
  fechaInicio.value = ''
  fechaFin.value = ''
  selectedMaterials.value = new Set(materialOptions.value)
  selectedTransports.value = new Set(transportOptions.value)
  selectedResponsables.value = new Set(responsableOptions.value)
}

// Datos: fechas y lo marcado en la URL (sin marca = todos)
const filtered = computed(() => filasPara())

function tabFilterFn(tabId: string): (r: Record<string, unknown>) => boolean {
  if (tabId === 'gravicon') return r => String(r['responsable_del_transporte'] ?? '').toLowerCase().includes('gravicon') || String(r['responsable_del_transporte'] ?? '').toLowerCase().includes('incondor')
  return r => {
    const t = String(r['responsable_del_transporte'] ?? '').toLowerCase()
    return !t.includes('gravicon') && !t.includes('incondor') && t.length > 0
  }
}

const tabFiltered = computed(() =>
  filtered.value.filter(tabFilterFn(activeTab.value))
)

const unitOpts = computed(() => {
  const set = new Set<string>()
  for (const r of tabFiltered.value) {
    const u = String(r['unidad_de_medida'] ?? '').trim()
    if (u) set.add(u)
  }
  const arr = [...set].sort()
  if (!activeUnit.value && arr.length) activeUnit.value = arr[0]
  return arr
})

const unitFiltered = computed(() =>
  tabFiltered.value.filter(r => String(r['unidad_de_medida'] ?? '').trim() === activeUnit.value)
)

const unitTotal = computed(() =>
  unitFiltered.value.reduce((s, r) => s + (Number(r['cantidad']) || 0), 0)
)

const unitClients = computed(() => {
  const set = new Set(unitFiltered.value.map(r => String(r['nombre_del_cliente_o_empresa'] ?? '')))
  return set.size
})

const unitMaterialTables = computed(() => {
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const r of unitFiltered.value) {
    const mat = String(r['tipo_de_material'] ?? 'Sin material')
    if (!groups.has(mat)) groups.set(mat, [])
    groups.get(mat)!.push(r)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([material, rows]) => {
    const daily = rows.map(r => {
      const d = r['fecha_de_servicio'] ? new Date((r['fecha_de_servicio'] as string) + 'T12:00:00') : null
      return {
        'Fecha': d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
        'Cliente': String(r['nombre_del_cliente_o_empresa'] ?? ''),
        'Cantidad': Number(r['cantidad']) || 0,
        'Transporte': String(r['responsable_del_transporte'] ?? ''),
        'Responsable': String(r['responsable_del_registro'] ?? ''),
      }
    })
    const st = daily.reduce((s, r) => s + r.Cantidad, 0)
    daily.push({
      _total: true,
      'Fecha': 'TOTAL',
      'Cliente': '',
      'Cantidad': st,
      'Transporte': '',
      'Responsable': '',
    } as (typeof daily[number] & { _total: boolean }))
    return { material, rows, total: st, table: daily }
  })
})
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
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
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

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  font-size: 11px;
  color: var(--danger);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-weight: 600;
}
.clear-btn:hover { background: var(--danger-light); border-color: var(--danger); }

.sub-tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  overflow-x: auto;
  background: rgba(255,255,255,0.04);
  border-radius: var(--radius-md);
  padding: 2px;
}
.sub-tab-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
  border-radius: var(--radius-sm);
}
.sub-tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
.sub-tab-btn.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--accent); }

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
a.tab-btn { text-decoration: none; display: inline-flex; align-items: center; }
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

.kpi-row { display: grid; gap: 14px; margin-bottom: 20px; }
.kpi-row > * { min-width: 0; }
.kpi-3 { grid-template-columns: repeat(3, 1fr); }
.kpi-row small { font-size: 11px; opacity: .7; }

.material-section { margin-bottom: 28px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px; }
.title-bar { width: 12px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.section-count { font-size: 11px; color: var(--text-tertiary); font-weight: 600; }

@media (max-width: 1024px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .filter-group { width: 100%; }
  .kpi-3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .kpi-3 { grid-template-columns: 1fr; }
  /* El título repite el módulo (ya visible arriba) y los márgenes dejaban un hueco antes de las pestañas */
  .page-title { display: none; }
  .page-header { margin-bottom: 12px; padding: 4px 0; }
  .tab-bar { margin-bottom: 12px; }
  .sub-tab-bar { margin-bottom: 14px; }
}
.clear-filters {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px;
  border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-tertiary);
  font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.clear-filters:hover { background: var(--danger-light); color: var(--danger); }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: none; border-radius: var(--radius-md);
  background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
}
.action-btn:hover:not(:disabled) { background: rgba(59, 130, 246, .2); }
.action-btn:disabled { opacity: .7; cursor: default; }
</style>
