<template>
  <nav :class="`rt rt-${variant}`" :aria-label="ariaLabel">
    <RouterLink
      v-for="t in items"
      :key="t.id"
      :to="t.to"
      :replace="replace"
      class="rt-item"
      :class="{ active: t.id === activo }"
      :aria-current="t.id === activo ? 'page' : undefined"
    >
      <svg v-if="variant === 'toggle' && iconoDe(t) === 'graficas'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <svg v-else-if="variant === 'toggle' && iconoDe(t) === 'informe'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <svg v-else-if="variant === 'toggle' && iconoDe(t) === 'lista'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      <span>{{ t.label }}</span>
    </RouterLink>
    <slot />
  </nav>
</template>

<script setup lang="ts">
/**
 * RouteTabs.vue — Navegación por pestañas hecha con enlaces reales (RouterLink).
 * Cada pestaña es una ruta: funciona recargar, atrás/adelante, abrir en otra pestaña
 * del navegador y compartir el enlace.
 *
 * Variantes (mismo aspecto que tenían los botones de cada nivel):
 * - tabs:   módulos de una planta (Producción · Programación · Mantenimiento)
 * - sub:    secciones dentro de un módulo (Órdenes · Almacén · Gerencial…)
 * - toggle: vista del contenido (Gráficas · Detalles · Informe), con ícono
 *
 * `activo` lo decide quien usa el componente porque cada nivel compara un segmento distinto de la ruta.
 */
import type { RouteLocationRaw } from 'vue-router'

export interface RouteTab {
  id: string
  label: string
  to: RouteLocationRaw
  icono?: 'graficas' | 'lista' | 'informe'
}

withDefaults(defineProps<{
  items: RouteTab[]
  activo: string
  variant?: 'tabs' | 'sub' | 'toggle'
  ariaLabel?: string
  /** Reemplaza la entrada del historial en vez de agregar una (para cambios de vista menores) */
  replace?: boolean
}>(), { variant: 'tabs', ariaLabel: 'Secciones', replace: false })

function iconoDe(t: RouteTab): string {
  if (t.icono) return t.icono
  if (t.id === 'graficas' || t.id === 'resumen') return 'graficas'
  if (t.id === 'informe') return 'informe'
  return 'lista'
}
</script>

<style scoped>
.rt { display: flex; min-width: 0; }
.rt-item { text-decoration: none; white-space: nowrap; transition: all var(--transition-fast); display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.rt-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Pestañas de módulo */
.rt-tabs {
  gap: 4px; margin-bottom: 20px; padding: 3px; overflow-x: auto; scrollbar-width: none;
  background: var(--bg-alt); border: 1px solid var(--card-border); border-radius: var(--radius-md);
}
.rt-tabs::-webkit-scrollbar { display: none; }
.rt-tabs .rt-item {
  padding: 8px 18px; border-radius: var(--radius-sm);
  color: var(--text-tertiary); font-size: 14px; font-weight: 500;
}
.rt-tabs .rt-item:hover { color: var(--text-primary); background: var(--card-bg-hover); }
.rt-tabs .rt-item.active { color: var(--accent); background: var(--card-bg); font-weight: 600; box-shadow: var(--shadow-sm); }

/* Secciones dentro de un módulo */
.rt-sub { gap: 2px; margin-bottom: 18px; border-bottom: 1px solid var(--card-border); overflow-x: auto; scrollbar-width: none; }
.rt-sub::-webkit-scrollbar { display: none; }
.rt-sub .rt-item {
  padding: 9px 14px; margin-bottom: -1px; border-bottom: 2px solid transparent;
  color: var(--text-tertiary); font-size: 13px; font-weight: 500;
}
.rt-sub .rt-item:hover { color: var(--text-primary); }
.rt-sub .rt-item.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

/* Vista del contenido (mismo aspecto que los selectores .av-btn de Mantenimiento) */
.rt-toggle { gap: 6px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.rt-toggle .rt-item {
  padding: 8px 16px; border: 1px solid var(--card-border); border-radius: var(--radius-md);
  background: var(--bg-alt); color: var(--text-secondary); font-size: 13px; font-weight: 600;
}
.rt-toggle .rt-item:hover { border-color: var(--card-border-hover); color: var(--text-primary); }
.rt-toggle .rt-item.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }

@media (max-width: 768px) {
  .rt-tabs { margin-bottom: 12px; }
  .rt-tabs .rt-item { flex: 1; padding: 8px 10px; font-size: 13px; }
  /* Con 4 o más módulos no caben en una fila: cuadrícula de 2 columnas en vez de cortarlos */
  .rt-tabs:has(> .rt-item:nth-child(4)) { flex-wrap: wrap; overflow: visible; }
  .rt-tabs:has(> .rt-item:nth-child(4)) .rt-item { flex: 1 1 calc(50% - 4px); }
  .rt-sub { margin-bottom: 12px; }
  .rt-sub .rt-item { padding: 8px 10px; font-size: 12px; }
  /* Vistas: se reparten a lo ancho y, si son 4 o más, en 2 columnas (antes se cortaba la última) */
  .rt-toggle { margin-bottom: 14px; flex-wrap: wrap; }
  .rt-toggle .rt-item { flex: 1 1 0; min-width: 0; padding: 7px 10px; font-size: 12px; white-space: normal; text-align: center; line-height: 1.25; }
  .rt-toggle:has(> .rt-item:nth-child(4)) .rt-item { flex: 1 1 calc(50% - 3px); }
}
</style>
