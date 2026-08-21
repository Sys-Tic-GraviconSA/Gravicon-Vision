<template>
  <div class="table-wrapper" :class="{ small }">
    <div class="table-header">
      <span class="table-title">{{ title }}</span>
      <slot name="header-extra" />
      <div class="table-header-right">
        <div class="search-wrapper" v-if="searchable">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Buscar..." class="search-input" />
        </div>
        <button class="export-btn" @click="props.onExport ? props.onExport() : exportExcel()" title="Exportar Excel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Excel
        </button>
        <div v-if="exportColumns" class="col-select" ref="colSelectRef">
          <button class="export-btn" @click="toggleColMenu" title="Elegir columnas a exportar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>
            Columnas
          </button>
          <div v-if="colMenuOpen" class="col-menu">
            <label v-for="c in rawCols" :key="c" class="col-item">
              <input type="checkbox" :checked="isColSelected(c)" @change="toggleExportCol(c)" />
              <span>{{ c }}</span>
            </label>
          </div>
        </div>
        <div v-if="selectColumns" class="col-select" ref="visSelectRef">
          <button class="export-btn" @click="visMenuOpen = !visMenuOpen" title="Elegir columnas visibles">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Ver
          </button>
          <div v-if="visMenuOpen" class="col-menu">
            <label v-for="c in rawCols" :key="c" class="col-item">
              <input type="checkbox" :checked="isColVisible(c)" @change="toggleVisibleCol(c)" />
              <span>{{ c }}</span>
            </label>
            <button class="col-menu-reset" @click="resetVisibleCols">Restablecer</button>
          </div>
        </div>
        <span class="table-count">{{ filteredData.length }} registros</span>
      </div>
    </div>
    <div v-if="filterFields.length" class="table-filters">
      <div v-for="f in filterFields" :key="f" class="dropdown" :ref="el => { if (el) dropdownRefs[f] = el as HTMLElement }">
        <button class="dropdown-toggle" @click="toggleDropdown(f)">
          <span style="font-size:13px;font-weight:700;color:var(--text-secondary)">{{ f }}</span>
          <span class="dropdown-summary">
            {{ selectedFilters[f]?.size ?? 0 }}/{{ fieldOptions[f]?.length ?? 0 }}
          </span>
          <span class="dropdown-arrow" :class="{ up: openDropdowns[f] }">▾</span>
        </button>
        <div v-if="openDropdowns[f]" class="dropdown-menu" :class="{ 'align-right': dropdownAlignRight[f] }">
          <label class="dropdown-all" @click.prevent="toggleAll(f)">
            <input type="checkbox" :checked="selectedFilters[f]?.size === fieldOptions[f]?.length" :indeterminate="selectedFilters[f]?.size > 0 && selectedFilters[f]?.size < fieldOptions[f]?.length" />
            <span>Todos</span>
          </label>
          <label class="dropdown-item" v-for="opt in fieldOptions[f]" :key="opt" @click.prevent="toggle(f, opt)">
            <input type="checkbox" :checked="selectedFilters[f]?.has(opt)" />
            <span>{{ opt }}</span>
          </label>
        </div>
      </div>
    </div>
    <div class="table-scroll">
      <table class="table" :class="{ fixed }">
        <thead>
          <tr>
            <th v-for="col in cols" :key="col" :style="colStyle(col)" @click="toggleSort(col)" class="sortable">
              {{ col }}
              <span v-if="sortField === col" class="sort-arrow">{{ sortDir === 'asc' ? ' ▲' : ' ▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in pageRows" :key="genRowKey(row, i)" :class="{ highlight: highlightField && row[highlightField], clickable }" @click="onRowClick(row)">
            <td v-for="col in cols" :key="col" :style="{ ...colStyle(col), ...semaphoreStyle(row[col], col) }">
              <span v-if="badgeFieldsSet.has(col) && row[col] !== '' && row[col] != null" class="chip" :style="chipStyle(row[col])">{{ formatVal(row[col], col) }}</span>
              <template v-else>{{ formatVal(row[col], col) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="pages > 1" class="table-pagination">
      <button :disabled="page <= 1" @click="page = 1" title="Primera">«</button>
      <button :disabled="page <= 1" @click="page--" title="Anterior">‹</button>
      <span>Pág {{ page }} de {{ pages }}</span>
      <button :disabled="page >= pages" @click="page++" title="Siguiente">›</button>
      <button :disabled="page >= pages" @click="page = pages" title="Última">»</button>
    </div>
  </div>
</template>

/**
 * DataTable.vue — Tabla genérica con ordenamiento, filtros por columna,
 * búsqueda global, paginación y exportación a CSV.
 * Soporta formato condicional: fechas desde serial Excel, semáforo (colores
 * según umbrales), columnas de porcentaje, y resaltado de filas.
 */
<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  data: Record<string, unknown>[]
  pageSize?: number
  excludeFields?: string[]
  filterFields?: string[]
  percentFields?: string[]
  semaphoreFields?: string[]
  small?: boolean
  highlightField?: string
  columnWidths?: Record<string, string>
  fixed?: boolean
  searchable?: boolean
  exportColumns?: boolean
  selectColumns?: boolean
  clickable?: boolean
  badgeFields?: string[]
  initiallyHidden?: string[]
  defaultVisible?: string[]
  onExport?: () => void
}>(), {
  pageSize: 15,
  searchable: true,
})

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
}>()

function onRowClick(row: Record<string, unknown>) {
  if (!props.clickable) return
  emit('rowClick', row)
}
const exportSelectedCols = ref<string[]>([])
const colMenuOpen = ref(false)
const colSelectRef = ref<HTMLElement | null>(null)

const visibleCols = ref<Set<string> | null>(null)
const visMenuOpen = ref(false)
const visSelectRef = ref<HTMLElement | null>(null)

const exportCols = computed(() =>
  exportSelectedCols.value.length ? exportSelectedCols.value : cols.value
)

function isColSelected(c: string): boolean {
  return exportCols.value.includes(c)
}
function toggleExportCol(c: string) {
  if (exportSelectedCols.value.includes(c)) {
    exportSelectedCols.value = exportSelectedCols.value.filter(x => x !== c)
  } else {
    exportSelectedCols.value = [...exportSelectedCols.value, c]
  }
}

function toggleColMenu() {
  if (!colMenuOpen.value && !exportSelectedCols.value.length) {
    exportSelectedCols.value = [...cols.value]
  }
  colMenuOpen.value = !colMenuOpen.value
}
function handleColClickOutside(e: MouseEvent) {
  if (colSelectRef.value && !colSelectRef.value.contains(e.target as Node)) colMenuOpen.value = false
  if (visSelectRef.value && !visSelectRef.value.contains(e.target as Node)) visMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', handleColClickOutside))
onUnmounted(() => document.removeEventListener('click', handleColClickOutside))

const filterFields = computed(() => props.filterFields ?? [])
const openDropdowns = reactive<Record<string, boolean>>({})
const dropdownAlignRight = reactive<Record<string, boolean>>({})
const dropdownRefs = ref<Record<string, HTMLElement | null>>({})
const selectedFilters = ref<Record<string, Set<string>>>({})

/** Evita que el menú de filtro se salga del viewport en pantallas angostas. */
async function toggleDropdown(f: string) {
  openDropdowns[f] = !openDropdowns[f]
  if (!openDropdowns[f]) return
  await nextTick()
  const rect = dropdownRefs.value[f]?.getBoundingClientRect()
  if (!rect) return
  dropdownAlignRight[f] = rect.left + 200 > window.innerWidth
}

const page = ref(1)
const perPage = computed(() => props.pageSize ?? 15)
const searchQuery = ref('')
const globalSearch = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (newVal) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    globalSearch.value = newVal
  }, 200)
})

const sortField = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

const percentFieldsSet = computed(() => new Set(props.percentFields ?? []))
const semaphoreFieldsSet = computed(() => new Set(props.semaphoreFields ?? []))
const badgeFieldsSet = computed(() => new Set(props.badgeFields ?? []))

/** Color estable por valor (hash → hue) para chips de badges. */
function chipHue(v: unknown): number {
  const s = String(v ?? '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}
/** Colores fijos para valores conocidos (caso-insensitive). */
const CHIP_COLORS: Record<string, [string, string]> = {
  urgente: ['#dc2626', 'rgba(220,38,38,.13)'],
  normal: ['#059669', 'rgba(5,150,105,.13)'],
  cerrada: ['#059669', 'rgba(5,150,105,.14)'],
  finalizada: ['#059669', 'rgba(5,150,105,.14)'],
  abierta: ['#ef4444', 'rgba(239,68,68,.14)'],
  pendiente: ['#f59e0b', 'rgba(245,158,11,.14)'],
  'en proceso': ['#0891b2', 'rgba(8,145,178,.14)'],
}
function chipStyle(v: unknown): Record<string, string> {
  const key = String(v ?? '').toLowerCase()
  const special = CHIP_COLORS[key]
  if (special) {
    return { background: special[1], color: special[0], border: `1px solid ${special[0]}40` }
  }
  const h = chipHue(v)
  return {
    background: `hsla(${h}, 70%, 50%, 0.14)`,
    color: `hsl(${h}, 65%, 30%)`,
    border: `1px solid hsla(${h}, 70%, 50%, 0.28)`,
  }
}

const colWidths = computed(() => new Map(Object.entries(props.columnWidths ?? {})))

const colStyle = (col: string): Record<string, string | undefined> => {
  const w = colWidths.value.get(col)
  if (!w) return {}
  const minW = w.includes('px') ? w : undefined
  return { width: w, minWidth: minW }
}

const exclude = computed(() => {
  const s = new Set(props.excludeFields ?? [])
  if (props.highlightField) s.add(props.highlightField)
  return s
})
const rawCols = computed(() => {
  if (props.data.length === 0) return []
  return Object.keys(props.data[0]).filter((k) => !exclude.value.has(k))
})
const cols = computed(() => {
  if (!visibleCols.value) return rawCols.value
  return rawCols.value.filter((c) => visibleCols.value!.has(c))
})

watch(rawCols, (list) => {
  if (!list.length || visibleCols.value) return
  if (props.defaultVisible?.length) {
    visibleCols.value = new Set(list.filter((c) => props.defaultVisible!.includes(c)))
  } else {
    const hidden = new Set(props.initiallyHidden ?? [])
    if (hidden.size) visibleCols.value = new Set(list.filter((c) => !hidden.has(c)))
  }
}, { immediate: true })

function isColVisible(c: string): boolean {
  return visibleCols.value ? visibleCols.value.has(c) : true
}
function toggleVisibleCol(c: string) {
  const s = visibleCols.value ?? new Set(rawCols.value)
  if (s.has(c)) s.delete(c)
  else s.add(c)
  visibleCols.value = new Set(s)
}
function resetVisibleCols() {
  visibleCols.value = null
  visMenuOpen.value = false
}

const fieldOptions = computed(() => {
  const options: Record<string, string[]> = {}
  for (const f of filterFields.value) {
    const set = new Set<string>()
    for (const r of props.data) {
      const val = formatVal(r[f], f)
      set.add(val)
    }
    options[f] = [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }
  return options
})

watch(fieldOptions, (newOptions) => {
  const nextFilters = { ...selectedFilters.value }
  for (const f of filterFields.value) {
    const opts = newOptions[f] || []
    if (!nextFilters[f]) {
      nextFilters[f] = new Set(opts)
    } else {
      const currentSelected = nextFilters[f]
      const nextSelected = new Set<string>()
      for (const val of currentSelected) {
        if (opts.includes(val)) {
          nextSelected.add(val)
        }
      }
      if (nextSelected.size === 0) {
        nextFilters[f] = new Set(opts)
      } else {
        nextFilters[f] = nextSelected
      }
    }
  }
  selectedFilters.value = nextFilters
}, { immediate: true, deep: true })

function toggle(f: string, val: string) {
  const next = new Set(selectedFilters.value[f] ?? [])
  if (next.has(val)) { next.delete(val) } else { next.add(val) }
  selectedFilters.value = { ...selectedFilters.value, [f]: next }
}

function toggleAll(f: string) {
  const opts = fieldOptions.value[f] || []
  const next = (selectedFilters.value[f]?.size === opts.length) ? new Set<string>() : new Set(opts)
  selectedFilters.value = { ...selectedFilters.value, [f]: next }
}

function genRowKey(row: Record<string, unknown>, i: number) {
  const vals = Object.values(row).slice(0, 3)
  return vals.map(v => String(v ?? '')).join('|') + '_' + i
}

function toggleSort(col: string) {
  if (sortField.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = col
    sortDir.value = 'asc'
  }
}

function handleClickOutside(e: MouseEvent) {
  for (const f of filterFields.value) {
    const el = dropdownRefs.value[f]
    if (el && !el.contains(e.target as Node)) {
      openDropdowns[f] = false
    }
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

const filteredData = computed(() => {
  let d = props.data
  for (const f of filterFields.value) {
    const selected = selectedFilters.value[f]
    const opts = fieldOptions.value[f] || []
    if (selected && selected.size < opts.length) {
      d = d.filter(r => {
        const val = formatVal(r[f], f)
        return selected.has(val)
      })
    }
  }
  if (globalSearch.value) {
    const q = globalSearch.value.toLowerCase()
    d = d.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)))
  }
  if (sortField.value) {
    d = [...d].sort((a, b) => {
      const va = a[sortField.value!]
      const vb = b[sortField.value!]
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' ? va - Number(vb) : String(va).localeCompare(String(vb))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return d
})

const pages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / perPage.value)))

watch(() => props.data, () => { page.value = 1 })

const pageRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredData.value.slice(start, start + perPage.value)
})

function pctVal(v: number, col: string): number {
  return percentFieldsSet.value.has(col) ? v * 100 : v
}

function semaphoreStyle(v: unknown, col: string): Record<string, string> {
  if (!semaphoreFieldsSet.value.has(col) || typeof v !== 'number') return {}
  const val = pctVal(v, col)
  if (val >= 100) return { color: '#10B981', fontWeight: '700' }
  if (val >= 90) return { color: '#F59E0B', fontWeight: '700' }
  return { color: '#EF4444', fontWeight: '700' }
}

function formatVal(v: unknown, col: string): string {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'number') {
    if (col.toLowerCase().includes('fecha') || col.toLowerCase().includes('fecha ')) {
      const d = new Date((v - 25569) * 86400 * 1000)
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })
    }
    const val = pctVal(v, col)
    const formatted = val.toLocaleString('es-CO')
    return percentFieldsSet.value.has(col) ? formatted + ' %' : formatted
  }
  return String(v)
}

function escapeCsv(val: string): string {
  if (/^[=+\-@]/.test(val)) return `"${val}"`
  if (/[,"\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`
  return val
}

function exportExcel() {
  const headers = exportCols.value
  const rows = filteredData.value.map(r => headers.map(h => escapeCsv(formatVal(r[h], h))))
  const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${props.title}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  transition: box-shadow var(--transition-base);
  max-width: 100%;
  backdrop-filter: blur(8px);
}
.table-wrapper:hover {
  box-shadow: var(--shadow-glass);
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--card-border);
  flex-wrap: wrap;
  gap: 8px;
}
.table-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.table-title { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -.3px; }
.table-count { font-size: 11px; font-weight: 600; color: var(--text-tertiary); background: var(--bg-alt); padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.col-select { position: relative; }
.col-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 220px;
  max-width: 320px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.05);
  padding: 6px;
  z-index: 999;
}
.col-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: background var(--transition-fast);
}
.col-item:hover { background: var(--accent-light); color: var(--accent); }
.col-item input { accent-color: var(--accent); }
.col-menu-reset {
  width: 100%;
  margin-top: 6px;
  padding: 7px 8px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: none;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.col-menu-reset:hover { color: var(--accent); border-color: var(--accent); }
.table-filters { display: flex; gap: 8px; padding: 10px 20px; border-bottom: 1px solid var(--card-border); flex-wrap: wrap; }
.dropdown { position: relative; }
.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: var(--bg-alt);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 140px;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}
.dropdown-toggle:hover { background: var(--accent-light); color: var(--accent); }
.dropdown-summary { font-size: 11px; font-weight: 600; color: var(--text-tertiary); }
.dropdown-arrow { font-size: 9px; transition: transform var(--transition-fast); color: var(--text-tertiary); }
.dropdown-arrow.up { transform: rotate(180deg); }
.dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  min-width: 200px;
  max-width: calc(100vw - 24px);
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: var(--shadow-xl);
  padding: 4px;
  z-index: 1000;
  max-height: 260px;
  overflow-y: auto;
}
.dropdown-menu.align-right {
  left: auto;
  right: 0;
}
.dropdown-all,
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  transition: background var(--transition-fast);
  user-select: none;
}
.dropdown-all:hover,
.dropdown-item:hover { background: var(--accent-light); }
.dropdown-all input,
.dropdown-item input {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
  cursor: pointer;
}
.dropdown-all { border-bottom: 1px solid var(--card-border); margin-bottom: 2px; padding-bottom: 8px; font-weight: 600; }

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg-alt);
  border-radius: 8px;
  color: var(--text-tertiary);
}
.search-input {
  border: none;
  outline: none;
  font-size: 12px;
  font-family: inherit;
  background: transparent;
  color: var(--text-primary);
  width: 140px;
}
.search-input::placeholder { color: var(--text-tertiary); }

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.export-btn:hover {
  background: var(--accent-light);
  border-color: transparent;
}

.table-scroll { overflow-x: auto; max-width: 100%; }
.table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
.table thead { position: sticky; top: 0; }
.table th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  border-bottom: 2px solid var(--card-border);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .6px;
  background: var(--bg-alt);
  cursor: pointer;
  user-select: none;
}
.table th:first-child { border-radius: var(--radius-lg) 0 0 0; }
.table th:last-child { border-radius: 0 var(--radius-lg) 0 0; }
.table tbody tr:last-child td:first-child { border-radius: 0 0 0 var(--radius-lg); }
.table tbody tr:last-child td:last-child { border-radius: 0 0 var(--radius-lg) 0; }
.table th:hover { color: var(--accent); }
.sort-arrow { font-size: 10px; }
.table td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--card-border);
  color: var(--text-primary);
  white-space: nowrap;
  transition: background var(--transition-fast);
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2px;
  white-space: nowrap;
  line-height: 1.4;
}
.table tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--text-secondary) 5%, transparent); }
.table tbody tr:hover td { background: var(--accent-light); }
.table tbody tr:hover { background: var(--accent-light); }
.table tbody tr.clickable { cursor: pointer; }
.table tbody tr:last-child td { border-bottom: none; }
.table-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--card-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.table-pagination button {
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: var(--bg-alt);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
  line-height: 1;
}
.table-pagination button:hover:not(:disabled) { background: var(--accent-light); color: var(--accent); }
.table-pagination button:disabled { opacity: .3; cursor: default; }
.table.fixed { table-layout: fixed; }
.table.fixed td,
.table.fixed th { overflow: hidden; text-overflow: ellipsis; }
.small .table { font-size: 10px; }
.small .table th { padding: 6px 8px; font-size: 10px; }
.small .table td { padding: 5px 8px; }
.small .table-title { font-size: 15px; }
.small .table-header { padding: 10px 14px; }
.small .table-pagination { padding: 8px; font-size: 11px; }
.highlight { background: var(--bg-alt); }
.highlight td { font-weight: 700; color: var(--text-primary); }
.highlight:hover { background: var(--card-bg-hover); }

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 14px;
    gap: 10px;
  }
  .table-header-right {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .table-filters {
    padding: 10px 14px;
    flex-direction: column;
  }
  .table-filters .dropdown {
    width: 100%;
  }
  .table-filters .dropdown-toggle {
    min-width: 0;
    width: 100%;
  }
  .col-menu {
    min-width: 0;
    width: calc(100vw - 56px);
    max-width: calc(100vw - 28px);
    right: auto;
    left: 0;
  }
  .dropdown-menu {
    width: calc(100vw - 28px);
    max-width: calc(100vw - 28px);
  }
}

@media (max-width: 480px) {
  .table-header-right {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .table-header-right .search-wrapper {
    grid-column: 1 / -1;
  }
  .table-header-right .export-btn,
  .table-header-right .col-select {
    min-width: 0;
  }
  .table-count {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .table-pagination {
    flex-wrap: wrap;
  }
}
</style>
