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
          <div class="date-presets">
            <button v-for="p in presets" :key="p.id" type="button" class="preset-btn" :class="{ active: presetActivo === p.id }" @click="aplicarPreset(p.id)">{{ p.label }}</button>
          </div>
          <div class="search-wrapper">
            <label class="date-row"><span class="date-label">Desde</span><input v-model="startDate" type="date" class="search-input" :max="endDate || undefined" /></label>
            <label class="date-row"><span class="date-label">Hasta</span><input v-model="endDate" type="date" class="search-input" :min="startDate || undefined" /></label>
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
  /** Modo controlado (opcional): fechas YYYY-MM-DD que el padre mantiene, p. ej. desde la URL */
  from?: string | null
  to?: string | null
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
const startDate = ref<string | null>(props.from || null)
const endDate = ref<string | null>(props.to || null)

// Modo controlado: si el padre cambia las fechas (URL, restablecer), se reflejan aquí
watch(() => [props.from, props.to], ([f, t]) => {
  if (f !== undefined && (f || null) !== startDate.value) startDate.value = f || null
  if (t !== undefined && (t || null) !== endDate.value) endDate.value = t || null
})

// Atajos de rango relativos a hoy
type PresetId = 'mes' | 'mesAnt' | '30d' | 'todo'
const presets: { id: PresetId; label: string }[] = [
  { id: 'mes', label: 'Este mes' }, { id: 'mesAnt', label: 'Mes anterior' }, { id: '30d', label: 'Últimos 30 días' }, { id: 'todo', label: 'Todo' },
]
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function rangoPreset(id: PresetId): [string | null, string | null] {
  const hoy = new Date()
  if (id === 'mes') return [isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), isoLocal(hoy)]
  if (id === 'mesAnt') return [isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 0))]
  if (id === '30d') { const d = new Date(hoy); d.setDate(d.getDate() - 29); return [isoLocal(d), isoLocal(hoy)] }
  return [null, null]
}
const presetActivo = computed(() => presets.find(p => {
  const [a, b] = rangoPreset(p.id)
  return a === startDate.value && b === endDate.value
})?.id ?? null)
function aplicarPreset(id: PresetId) {
  const [a, b] = rangoPreset(id)
  startDate.value = a
  endDate.value = b
  openDate.value = false
}

const mesesAbrev = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtBadgeDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (isNaN(d.getTime())) return iso
  return `${mesesAbrev[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,'0')}`
}
const badgeText = computed(() => {
  const s = startDate.value
  const e = endDate.value
  if (s && e) return `${fmtBadgeDate(s)} → ${fmtBadgeDate(e)}`
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
  startDate.value = null
  endDate.value = null

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

.date-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 8px 8px 10px; border-bottom: 1px solid var(--card-border); }
.preset-btn {
  padding: 6px 8px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
  border: 1px solid var(--card-border); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.preset-btn:hover { color: var(--text-primary); border-color: var(--card-border-hover); }
.preset-btn.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }

@media (max-width: 768px) {
  .dropdown-toggle { padding: 6px 10px; font-size: 12px; }
  .badge { display: none; }
  .clear-btn { padding: 5px 8px; font-size: 11px; }
  /* En celular el menú se ancla a la pantalla para no salirse por los lados */
  .dropdown-menu { position: fixed; left: 12px; right: 12px; top: auto; min-width: 0; margin-top: 6px; }
  .dropdown-menu.align-right { left: 12px; right: 12px; }
  .search-input { font-size: 16px; } /* evita el zoom automático de iOS al enfocar */
}
</style>
