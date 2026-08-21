<template>
  <div class="dropdown" ref="dropdownRef">
    <button class="dropdown-toggle" :class="{ active: isOpen }" @click="toggleOpen">
      <svg v-if="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect v-if="icon === 'calendar'" x="3" y="4" width="18" height="2" rx="1"/><rect v-if="icon === 'calendar'" x="7" y="10" width="10" height="2" rx="1"/><rect v-if="icon === 'calendar'" x="11" y="16" width="2" height="2" rx="1"/>
        <path v-if="icon === 'filter'" d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        <path v-if="icon === 'user'" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle v-if="icon === 'user'" cx="9" cy="7" r="4"/>
      </svg>
      <span>{{ label }}</span>
      <span class="badge">{{ modelValue.size }}/{{ options.length }}</span>
      <svg class="chevron" :class="{ open: isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <transition name="fade">
      <div v-if="isOpen" class="dropdown-menu" :class="{ 'align-right': alignRight }">
        <label class="dropdown-all" @click.prevent="toggleAll">
          <input type="checkbox" :checked="modelValue.size === options.length" :indeterminate="modelValue.size > 0 && modelValue.size < options.length" />
          <span>Todos</span>
        </label>
        <label class="dropdown-item" v-for="opt in options" :key="opt" @click.prevent="toggle(opt)">
          <input type="checkbox" :checked="modelValue.has(opt)" />
          <span>{{ opt }}</span>
        </label>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
/**
 * Dropdown multi-selección con checkboxes.
 * Usa v-model con Set<string> para manejar selección, permite seleccionar
 * "Todos" o elementos individuales, y cierra al hacer clic fuera.
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: Set<string>
  options: string[]
  label: string
  icon?: string
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: Set<string>]
}>()

const isOpen = ref(false)
const alignRight = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

/** Evita que el menú se salga del viewport en pantallas angostas: si no cabe a la derecha del botón, lo alinea por la derecha. */
async function toggleOpen() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return
  await nextTick()
  const rect = dropdownRef.value?.getBoundingClientRect()
  if (!rect) return
  alignRight.value = rect.left + 220 > window.innerWidth
}

function toggle(opt: string) {
  const next = new Set(props.modelValue)
  if (next.has(opt)) {
    if (next.size > 1) next.delete(opt)
  } else {
    next.add(opt)
  }
  emit('update:modelValue', next)
}

function toggleAll() {
  const next = props.modelValue.size === props.options.length
    ? new Set(props.options.length > 0 ? [props.options[0]] : [])
    : new Set(props.options)
  emit('update:modelValue', next)
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
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
  min-width: 20px;
  text-align: center;
}

.chevron {
  transition: transform var(--transition-fast);
  opacity: 0.4;
}
.chevron.open { transform: rotate(180deg); }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  max-width: calc(100vw - 24px);
  background: var(--bg-elevated);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  padding: 4px;
  z-index: 1000;
  max-height: 280px;
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
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
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
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.dropdown-all {
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 2px;
  padding-bottom: 9px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .dropdown-toggle { padding: 5px 8px; font-size: 12px; }
  .badge { display: none; }
  .dropdown-menu { min-width: 180px; }
}
</style>
