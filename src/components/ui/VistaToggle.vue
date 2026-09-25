<template>
  <div class="almacen-view-toggle" role="group" aria-label="Vista">
    <button
      v-for="o in opciones"
      :key="o.id"
      class="av-btn"
      :class="{ active: modelValue === o.id }"
      @click="emit('update:modelValue', o.id)"
    >
      <svg v-if="iconoDe(o) === 'graficas'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <svg v-else-if="iconoDe(o) === 'lista'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      <svg v-else-if="iconoDe(o) === 'informe'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      {{ o.label }}
    </button>
    <slot />
  </div>
</template>

/**
 * VistaToggle.vue — Selector de vista (Gráficas · Detalle · Informe) con el mismo aspecto
 * de los selectores de Mantenimiento (.av-btn), para usarlo igual en todos los módulos.
 * El ícono sale del id: 'graficas'/'resumen' → barras, 'informe' → documento, el resto → lista.
 * El slot permite agregar botones al final (p. ej. «Descargar PDF»).
 */
<script setup lang="ts">
defineProps<{
  modelValue: string
  opciones: { id: string; label: string; icono?: 'graficas' | 'lista' | 'informe' }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

function iconoDe(o: { id: string; icono?: string }): string {
  if (o.icono) return o.icono
  if (o.id === 'graficas' || o.id === 'resumen') return 'graficas'
  if (o.id === 'informe') return 'informe'
  return 'lista'
}
</script>

<style scoped>
.almacen-view-toggle {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.av-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--bg-alt);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.av-btn:hover {
  border-color: var(--card-border-hover);
  color: var(--text-primary);
}
.av-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
