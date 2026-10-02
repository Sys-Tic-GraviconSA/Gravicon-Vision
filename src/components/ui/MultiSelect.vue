<template>
  <div class="dropdown" ref="dropdownRef">
    <button class="dropdown-toggle" :class="{ active: isOpen }" @click="toggleOpen">
      <svg v-if="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect v-if="icon === 'calendar'" x="3" y="4" width="18" height="2" rx="1"/><rect v-if="icon === 'calendar'" x="7" y="10" width="10" height="2" rx="1"/><rect v-if="icon === 'calendar'" x="11" y="16" width="2" height="2" rx="1"/>
        <path v-if="icon === 'filter'" d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        <path v-if="icon === 'user'" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle v-if="icon === 'user'" cx="9" cy="7" r="4"/>
      </svg>
      <span>{{ label }}</span>
      <Transition name="ms-badge" mode="out-in"><span :key="`${modelValue.size}/${options.length}`" class="badge">{{ modelValue.size }}/{{ options.length }}</span></Transition>
      <svg class="chevron" :class="{ open: isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <Teleport to="body">
      <Transition name="ms-menu">
      <div
        v-if="isOpen"
        class="dropdown-menu"
        :class="{ 'align-right': alignRight }"
        :style="menuStyle"
        @click.stop
      >
        <div v-if="conBuscador" class="dropdown-search">
          <input ref="searchRef" v-model="busqueda" type="search" :placeholder="`Buscar ${label.toLowerCase()}…`" @keydown.esc="isOpen = false" />
        </div>
        <label v-if="!busqueda" class="dropdown-all" @click.prevent="toggleAll">
          <input type="checkbox" :checked="modelValue.size === options.length" :indeterminate="modelValue.size > 0 && modelValue.size < options.length" />
          <span>Todos</span>
        </label>
        <template v-else>
          <div class="dropdown-actions">
            <button type="button" @click="marcarVisibles(true)">Marcar {{ visibles.length }}</button>
            <button type="button" @click="soloVisibles">Solo estos</button>
          </div>
        </template>
        <div class="dropdown-list">
          <label class="dropdown-item" v-for="opt in visibles" :key="opt" @click.prevent="toggle(opt)">
            <input type="checkbox" :checked="modelValue.has(opt)" />
            <span>{{ opt }}</span>
          </label>
          <div v-if="!visibles.length" class="dropdown-empty">Sin resultados</div>
        </div>
      </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * Dropdown multi-selección con checkboxes.
 * Usa v-model con Set<string> para manejar selección, permite seleccionar
 * "Todos" o elementos individuales, y cierra al hacer clic fuera.
 * El menú se renderiza con position:fixed para que no salte al cambiar
 * el layout del header (badge / botón Limpiar).
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: Set<string>
  options: string[]
  label: string
  icon?: string
  /** Muestra buscador; por defecto se activa con más de 10 opciones */
  searchable?: boolean
}>(), { searchable: undefined })

const emit = defineEmits<{
  'update:modelValue': [value: Set<string>]
}>()

const isOpen = ref(false)
const busqueda = ref('')
const searchRef = ref<HTMLInputElement | null>(null)
const conBuscador = computed(() => props.searchable ?? props.options.length > 10)
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const visibles = computed(() => {
  const q = sinTildes(busqueda.value.trim())
  return q ? props.options.filter(o => sinTildes(o).includes(q)) : props.options
})
function marcarVisibles(v: boolean) {
  const next = new Set(props.modelValue)
  for (const o of visibles.value) v ? next.add(o) : next.delete(o)
  emit('update:modelValue', next)
}
function soloVisibles() {
  emit('update:modelValue', new Set(visibles.value))
}
const alignRight = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const menuPos = ref({ top: 0, left: 0, right: 0 })

const menuStyle = computed(() => {
  const style: Record<string, string> = {
    position: 'fixed',
    top: `${menuPos.value.top}px`,
    zIndex: '2000',
  }
  if (menuPos.value.left === 12 && menuPos.value.right === 12) {
    style.left = '12px'
    style.right = '12px'
  } else if (alignRight.value) {
    style.right = `${menuPos.value.right}px`
    style.left = 'auto'
  } else {
    style.left = `${menuPos.value.left}px`
    style.right = 'auto'
  }
  return style
})

function updateMenuPosition() {
  const rect = dropdownRef.value?.getBoundingClientRect()
  if (!rect) return
  // En celular el menú ocupa el ancho de la pantalla (con margen) bajo el botón
  if (window.innerWidth <= 768) {
    menuPos.value = { top: rect.bottom + 6, left: 12, right: 12 }
    alignRight.value = false
    return
  }
  menuPos.value = {
    top: rect.bottom + 6,
    left: rect.left,
    right: window.innerWidth - rect.right,
  }
  alignRight.value = rect.left + 220 > window.innerWidth
}

async function toggleOpen() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return
  busqueda.value = ''
  await nextTick()
  updateMenuPosition()
  // En celular no se enfoca: abriría el teclado y taparía la lista
  if (window.innerWidth > 768) searchRef.value?.focus()
}

function toggle(opt: string) {
  const next = new Set(props.modelValue)
  if (next.has(opt)) next.delete(opt)
  else next.add(opt)
  emit('update:modelValue', next)
  // Mantener posición fija tras el reflow del header
  nextTick(() => updateMenuPosition())
}

function toggleAll() {
  const allSelected = props.modelValue.size === props.options.length && props.options.length > 0
  const next = allSelected ? new Set<string>() : new Set(props.options)
  emit('update:modelValue', next)
  nextTick(() => updateMenuPosition())
}

function handleClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (dropdownRef.value?.contains(target)) return
  const menus = document.querySelectorAll('.dropdown-menu')
  for (const m of menus) {
    if (m.contains(target)) return
  }
  isOpen.value = false
}

function handleReposition() {
  if (isOpen.value) updateMenuPosition()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleReposition, true)
  window.addEventListener('resize', handleReposition)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleReposition, true)
  window.removeEventListener('resize', handleReposition)
})
</script>

<style scoped>
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
  /* Ancho fijo con cifras de igual ancho: al cambiar el conteo (p. ej. 470/470 → 89/89) los filtros no se corren */
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-variant-numeric: tabular-nums;
}

.chevron {
  transition: transform var(--transition-fast);
  opacity: 0.4;
}
.chevron.open { transform: rotate(180deg); }

@media (max-width: 768px) {
  .dropdown-toggle { padding: 5px 8px; font-size: 12px; }
  .badge { display: none; }
}
/* Animaciones suaves: el menú aparece con un fundido corto y el contador cambia sin saltos */
.ms-menu-enter-active { transition: opacity .16s ease, transform .18s cubic-bezier(.2, .8, .2, 1); }
.ms-menu-leave-active { transition: opacity .12s ease, transform .12s ease; }
.ms-menu-enter-from, .ms-menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
.ms-badge-enter-active { transition: opacity .2s ease, transform .2s cubic-bezier(.2, .8, .2, 1); }
.ms-badge-leave-active { transition: opacity .1s ease; }
.ms-badge-enter-from { opacity: 0; transform: translateY(3px); }
.ms-badge-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .ms-menu-enter-active, .ms-menu-leave-active, .ms-badge-enter-active, .ms-badge-leave-active { transition: none; }
}
</style>

<style>
/* Menú teletransportado al body: estilos globales acotados */
.dropdown-menu {
  min-width: 200px;
  max-width: calc(100vw - 24px);
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-xl, 0 12px 40px rgba(0,0,0,.12));
  padding: 4px;
  max-height: 340px;
  overflow-y: auto;
}
.dropdown-menu .dropdown-all,
.dropdown-menu .dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  transition: background 0.15s;
  user-select: none;
}
.dropdown-menu .dropdown-all:hover,
.dropdown-menu .dropdown-item:hover { background: var(--accent-light, #eff6ff); }
.dropdown-menu .dropdown-all input,
.dropdown-menu .dropdown-item input {
  accent-color: var(--accent, #3b82f6);
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.dropdown-menu .dropdown-all {
  border-bottom: 1px solid var(--card-border, #e2e8f0);
  margin-bottom: 2px;
  padding-bottom: 9px;
  font-weight: 600;
}
.dropdown-menu .dropdown-search { padding: 4px 4px 6px; position: sticky; top: -4px; background: var(--bg-elevated, #fff); z-index: 1; }
.dropdown-menu .dropdown-search input {
  width: 100%; box-sizing: border-box; padding: 7px 10px; font-size: 13px;
  border: 1px solid var(--card-border, #e2e8f0); border-radius: var(--radius-sm, 6px);
  background: var(--bg, #fff); color: var(--text-primary, #1e293b); outline: none;
}
.dropdown-menu .dropdown-search input:focus { border-color: var(--accent, #3b82f6); }
.dropdown-menu .dropdown-actions { display: flex; gap: 6px; padding: 2px 4px 6px; border-bottom: 1px solid var(--card-border, #e2e8f0); margin-bottom: 2px; }
.dropdown-menu .dropdown-actions button {
  flex: 1; padding: 5px 8px; font-size: 12px; font-weight: 600; cursor: pointer;
  border: none; border-radius: var(--radius-sm, 6px); background: var(--accent-light, #eff6ff); color: var(--accent, #3b82f6);
}
.dropdown-menu .dropdown-empty { padding: 12px 10px; font-size: 12px; color: var(--text-tertiary, #64748b); text-align: center; }
.dropdown-menu .dropdown-item span { overflow-wrap: anywhere; }
@media (min-width: 769px) {
  .dropdown-menu { max-width: 360px; }
}
@media (max-width: 768px) {
  .dropdown-menu { min-width: 0; max-height: 60vh; }
  .dropdown-menu .dropdown-all, .dropdown-menu .dropdown-item { padding: 10px; }
}
</style>
