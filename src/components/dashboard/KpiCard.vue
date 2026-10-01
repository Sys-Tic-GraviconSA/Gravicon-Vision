<template>
  <div class="kpi-card" :class="{ clickable: !!to }" :style="accentStyle" @click="navigate">
    <div class="kpi-icon" v-if="iconName">
      <Icon :name="iconName" :size="20" />
    </div>
    <div class="kpi-body">
      <span class="kpi-label">{{ label }}</span>
      <span class="kpi-value" :class="{ pulse: pulse }">
        <slot>{{ value }}</slot>
        <span v-if="unit" class="kpi-unit">{{ unit }}</span>
      </span>
      <div v-if="detail" class="kpi-detail" v-html="detail"></div>
      <div v-if="trend" class="kpi-trend" :class="trendClass">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="trend.direction === 'up'" points="18 15 12 9 6 15"/>
          <polyline v-else points="6 9 12 15 18 9"/>
        </svg>
        <span>{{ trend.value }}%</span>
      </div>
    </div>
    <div v-if="meta" class="kpi-meta">{{ meta }}</div>
  </div>
</template>

/**
 * KpiCard.vue — Tarjeta de indicador KPI con ícono, valor, tendencia, meta
 * y navegación opcional. Renderiza una barra de acento superior de color
 * configurable y efecto de pulso para valores en vivo.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const props = withDefaults(defineProps<{
  label: string
  value?: string
  unit?: string
  accent?: string
  pulse?: boolean
  meta?: string
  detail?: string
  to?: string
  icon?: string
  trend?: { value: number; direction: 'up' | 'down' }
}>(), {
  accent: '#3b82f6',
})

const router = useRouter()
/**
 * Acento en tema oscuro: los colores muy oscuros (azul marino, grafito) se pierden sobre el fondo,
 * así que se aclaran mezclándolos con blanco. En tema claro y en la captura PDF se usa el color original.
 */
function aclarar(hex: string): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (lum >= 0.3) return hex
  const mezcla = (c: number) => Math.round(c + (255 - c) * 0.6)
  return `rgb(${mezcla(r)}, ${mezcla(g)}, ${mezcla(b)})`
}
const accentStyle = computed(() => ({ '--acc-claro': props.accent, '--acc-oscuro': aclarar(props.accent) }))
const iconName = computed(() => props.icon || '')
const trendClass = computed(() => props.trend?.direction === 'up' ? 'trend-up' : 'trend-down')

function navigate() {
  if (props.to) router.push(props.to)
}
</script>

<style scoped>
/* Acento según el tema (ver aclarar()); la captura PDF siempre usa el color original */
[data-theme="dark"] .kpi-card { --acc: var(--acc-oscuro); }
[data-theme="dark"] .pdf-capturing .kpi-card { --acc: var(--acc-claro); }

.kpi-card {
  --acc: var(--acc-claro);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
  backdrop-filter: blur(8px);
  min-height: 125px;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--acc);
  opacity: 0.6;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glass);
  border-color: var(--card-border-hover);
  background: var(--card-bg-hover);
}

.kpi-card.clickable {
  cursor: pointer;
}

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--acc);
}

.kpi-body {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  display: block;
  font-size: 10px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
}

.kpi-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.15;
  letter-spacing: -0.4px;
  font-variant-numeric: tabular-nums;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
}

.kpi-value.pulse {
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.kpi-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 8px;
  line-height: 1.4;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.kpi-detail :deep(.kpi-detail-row) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 1px;
}
/* El valor nunca se parte por dentro («$ 11.998.849.992»): si no cabe, pasa entero a la línea siguiente */
.kpi-detail :deep(.kpi-detail-row strong) { white-space: nowrap; }
.kpi-detail :deep(.kpi-label-int), .kpi-detail :deep(.kpi-label-ext) { white-space: nowrap; }

.kpi-detail :deep(.kpi-dot) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kpi-detail :deep(.kpi-label-int),
.kpi-detail :deep(.kpi-label-ext) {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 22px;
}

.kpi-detail :deep(.kpi-label-int) { color: #3B82F6; }
.kpi-detail :deep(.kpi-label-ext) { color: #10B981; }

.kpi-detail :deep(strong) {
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 11.5px;
}

.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
}

.trend-up {
  color: var(--success);
  background: var(--success-light);
}

.trend-down {
  color: var(--danger);
  background: var(--danger-light);
}

.kpi-meta {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
  background: var(--bg-alt);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

@media (max-width: 640px) {
  /* Sin alto mínimo: las tarjetas con solo un número no dejan espacio vacío */
  .kpi-card { padding: 14px 16px; gap: 12px; min-height: 0; }
  .kpi-icon { width: 34px; height: 34px; }
}
</style>
