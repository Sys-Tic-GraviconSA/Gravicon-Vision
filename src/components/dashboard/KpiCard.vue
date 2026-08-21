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
  to?: string
  icon?: string
  trend?: { value: number; direction: 'up' | 'down' }
}>(), {
  accent: '#3b82f6',
})

const router = useRouter()
const accentStyle = computed(() => ({ '--accent': props.accent }))
const iconName = computed(() => props.icon || '')
const trendClass = computed(() => props.trend?.direction === 'up' ? 'trend-up' : 'trend-down')

function navigate() {
  if (props.to) router.push(props.to)
}
</script>

<style scoped>
.kpi-card {
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
  min-height: 110px;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
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
  color: var(--accent);
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
</style>
