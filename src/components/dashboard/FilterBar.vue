<template>
  <div class="filter-bar">
    <div class="dropdown" ref="dateRef">
      <button class="dropdown-toggle" @click="toggleOpenDate">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x="16" y="2" x2="16" y2="6"/><line x="8" y="2" x2="8" y2="6"/><line x="3" y="10" x2="21" y2="10"/></svg>
        <span>Fechas</span>
        <span class="badge">{{ badgeText }}</span>
        <svg class="chevron" :class="{ open: openDate }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <transition name="fade">
        <div v-if="openDate" class="dropdown-menu" :class="{ 'align-right': dateAlignRight }">
          <div class="search-wrapper">
            <div class="date-row">
              <span class="date-label">Desde</span>
              <select v-model="startMonth" class="search-input sel-month">
                <option value="">Mes</option>
                <option v-for="m in meses" :key="'s-'+m.value" :value="m.value">{{ m.label }}</option>
              </select>
              <select v-model="startDay" class="search-input sel-day">
                <option value="">Día</option>
                <option v-for="d in 31" :key="'sd-'+d" :value="String(d).padStart(2,'0')">{{ String(d).padStart(2,'0') }}</option>
              </select>
            </div>
            <div class="date-row">
              <span class="date-label">Hasta</span>
              <select v-model="endMonth" class="search-input sel-month">
                <option value="">Mes</option>
                <option v-for="m in meses" :key="'e-'+m.value" :value="m.value">{{ m.label }}</option>
              </select>
              <select v-model="endDay" class="search-input sel-day">
                <option value="">Día</option>
                <option v-for="d in 31" :key="'ed-'+d" :value="String(d).padStart(2,'0')">{{ String(d).padStart(2,'0') }}</option>
              </select>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Provider filter dropdown -->
    <MultiSelect v-if="showProvider" v-model="selectedProviders" :options="providers" label="Proveedor" icon="filter" />
  </div>
</template>

/**
 * FilterBar.vue — Barra de filtros global del dashboard.
 * Permite filtrar por rango de fechas y por proveedor (MultiSelect).
 * Emite eventos normalizados para que los consumidores apliquen los filtros.
 */
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MultiSelect from '../ui/MultiSelect.vue'

const props = defineProps<{
  data: Record<string, unknown>[]
  dateField?: string
  showProvider?: boolean
}>()

const showProvider = props.showProvider ?? true

const emit = defineEmits<{
  dateRangeFilter: [range: { from: string | null; to: string | null }]
  filter: [range: { from: string | null; to: string | null }]
  proveedorFilter: [providers: Set<string>]
  clear: []
}>();

const openDate = ref(false)
const dateAlignRight = ref(false)
const dateRef = ref<HTMLElement | null>(null)
const startMonth = ref<string>("")
const startDay = ref<string>("")
const endMonth = ref<string>("")
const endDay = ref<string>("")

const meses = [
  { value: '01', label: 'Ene' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dic' },
]
function fmtMonthDay(m: string, d: string) {
  if (!m || !d) return null
  return `${m}-${d}`
}
const startDate = computed<string | null>(() => fmtMonthDay(startMonth.value, startDay.value))
const endDate = computed<string | null>(() => fmtMonthDay(endMonth.value, endDay.value))

const badgeText = computed(() => {
  const s = startDate.value
  const e = endDate.value
  if (s && e) {
    const sm = meses.find(x=>x.value===s.slice(0,2))?.label ?? s.slice(0,2)
    const em = meses.find(x=>x.value===e.slice(0,2))?.label ?? e.slice(0,2)
    return `${sm} ${s.slice(3)} → ${em} ${e.slice(3)}`
  }
  return 'Todas'
})

/** Evita que el menú se salga del viewport en pantallas angostas. */
async function toggleOpenDate() {
  openDate.value = !openDate.value
  if (!openDate.value) return
  await nextTick()
  const rect = dateRef.value?.getBoundingClientRect()
  if (!rect) return
  dateAlignRight.value = rect.left + 260 > window.innerWidth
}

watch([startDate, endDate], () => {
  const payload = { from: startDate.value, to: endDate.value };
  emit('dateRangeFilter', payload);
  emit('filter', payload);
})

// Compute distinct providers from data prop
const providers = computed(() => {
  const set = new Set<string>()
  for (const r of props.data) {
    const p = String(r['PROVEEDOR'] ?? '').trim()
    if (p) set.add(p)
  }
  return Array.from(set).sort()
})

// Selected providers stored as a Set; use an array for v-model binding
const selectedProviders = ref<Set<string>>(new Set())

watch(selectedProviders, (newSet) => {
  if (!showProvider) return
  emit('proveedorFilter', newSet)
})

function clearFilters(emitClear = true) {
  startMonth.value = ""
  startDay.value = ""
  endMonth.value = ""
  endDay.value = ""

  selectedProviders.value = new Set()
  openDate.value = false
  if (emitClear) emit('clear')
}
defineExpose({ clearFilters })

function handleClickOutside(e: MouseEvent) {
  if (dateRef.value && !dateRef.value.contains(e.target as Node)) openDate.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.dropdown { position: relative; }

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-alt);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.dropdown-toggle:hover {
  background: var(--accent-light);
  color: var(--accent);
}
.dropdown-toggle.active {
  background: var(--accent-light);
  color: var(--accent);
}
.dropdown-toggle svg { flex-shrink: 0; opacity: 0.6; }
.dropdown-toggle:hover svg { opacity: 1; }

.badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 1px 6px;
  background: var(--bg);
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.chevron {
  transition: transform var(--transition-fast);
  opacity: .4;
}
.chevron.open { transform: rotate(180deg); }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-width: calc(100vw - 24px);
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.05);
  padding: 4px;
  z-index: 999;
}
.dropdown-menu.align-right {
  left: auto;
  right: 0;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  flex-direction: column;
}
.date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.date-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  min-width: 36px;
  text-transform: uppercase;
}
.sel-month { flex: 1.2; }
.sel-day { flex: 0.8; min-width: 70px; }

.search-input {
  flex: 1;
  border: 1px solid var(--card-border);
  outline: none;
  font-size: 13px;
  font-family: inherit;
  background: var(--bg-alt);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast);
  width: 100%;
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-light);
}
.search-input::placeholder { color: var(--text-tertiary); }

.clear-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--accent-light);
  border: none;
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-weight: 600;
}
.clear-btn:hover { background: rgba(59,130,246,.15); }

/* Provider filter option styles */
.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.filter-option input {
  width: 14px;
  height: 14px;
}

@media (max-width: 768px) {
  .dropdown-toggle { padding: 5px 8px; font-size: 12px; }
  .badge { display: none; }
  .clear-btn { padding: 5px 8px; font-size: 11px; }
  .dropdown-menu { min-width: 200px; }
}
</style>
