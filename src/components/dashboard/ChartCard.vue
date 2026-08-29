<template>
  <div class="chart-card" :class="{ tall, loading: !hasData && !pendingOption }">
    <div class="chart-header">
      <div class="chart-header-text">
        <h3 class="chart-title">{{ title }}</h3>
        <p v-if="description" class="chart-desc">{{ description }}</p>
      </div>
      <div class="chart-actions" v-if="hasData">
        <button class="action-btn" title="Expandir" @click="openExpanded">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button class="action-btn" title="Copiar gráfica" @click="copyImage">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="action-btn" title="Exportar PNG" @click="downloadImage">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </div>
    <div class="chart-body">
      <EmptyState v-if="!hasData && !pendingOption" title="Sin datos disponibles" :description="'No hay datos para ' + title" />
      <v-chart
        v-if="hasData"
        :key="theme"
        ref="chartRef"
        :option="optRef"
        :theme="theme"
        autoresize
        class="chart"
        :class="{ clickable: clickable }"
        @click="onChartClick"
      />
    </div>

    <Teleport to="body">
      <div v-if="expanded" class="cc-modal-overlay" @click.self="expanded = false">
        <div class="cc-modal-panel">
          <div class="cc-modal-top">
            <div class="cc-modal-title">{{ title }}</div>
            <div class="cc-modal-limit-btns" v-if="expandOption">
              <button v-for="l in limitOptions" :key="l" class="cc-limit-btn" :class="{ active: expandLimit === l }" @click="expandLimit = l">{{ l >= 9999 ? 'Todos' : 'Top ' + l }}</button>
            </div>
            <button class="cc-modal-close" @click="expanded = false">✕</button>
          </div>
          <div class="cc-modal-chart-wrap">
            <v-chart v-if="modalOption" :option="modalOption" :theme="theme" autoresize class="cc-modal-chart" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

/**
 * ChartCard.vue — Componente envoltorio para gráficos ECharts.
 * - Renderiza un gráfico con vue-echarts dentro de una tarjeta estilizada
 * - Permite copiar al portapapeles o exportar como PNG
 * - Debounce de 16ms en la actualización de opciones para evitar parpadeos
 * - Limpia líneas de división de los ejes (splitLine) para un estilo más limpio
 */
<script setup lang="ts">
import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, TitleComponent,
  LegendComponent, DataZoomComponent, RadarComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import EmptyState from '../ui/EmptyState.vue'
import { useTheme } from '../../composables/useTheme'

// Registro manual de los componentes ECharts necesarios (tree-shaking)
use([
  CanvasRenderer, BarChart, LineChart, PieChart, RadarChart,
  GridComponent, TooltipComponent, TitleComponent, LegendComponent,
  DataZoomComponent, RadarComponent,
])

const props = withDefaults(defineProps<{
  title: string
  option: Record<string, unknown> | undefined | null
  expandOption?: Record<string, unknown> | undefined | null
  description?: string
  height?: number
  tall?: boolean
  clickable?: boolean
}>(), { tall: false, clickable: false })

const emit = defineEmits<{
  (e: 'chart-click', params: any): void
}>()

const expanded = ref(false)
const expandLimit = ref<number>(10)
const limitOptions = [10, 15, 20, 9999] as const

function openExpanded() { expandLimit.value = 10; expanded.value = true }

function sliceOption(opt: Record<string, unknown>, limit: number): Record<string, unknown> {
  if (limit >= 9999) return opt
  const result = { ...opt }
  const series = result.series as any[] | undefined
  if (!series || !Array.isArray(series)) return result
  const yAxis = result.yAxis as any
  if (yAxis && yAxis.data && Array.isArray(yAxis.data)) {
    const slicedLabels = yAxis.data.slice(0, limit)
    result.yAxis = { ...yAxis, data: slicedLabels }
    result.series = series.map((s: any) => ({
      ...s,
      data: Array.isArray(s.data) ? s.data.slice(0, limit) : s.data,
    }))
  } else {
    result.series = series.map((s: any) => ({
      ...s,
      data: Array.isArray(s.data) ? s.data.slice(0, limit) : s.data,
    }))
  }
  return result
}

const modalOption = computed(() => {
  if (!props.expandOption) return optRef.value
  return sliceOption(props.expandOption as Record<string, unknown>, expandLimit.value)
})

const { theme } = useTheme()

const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const chartHeight = computed(() => (props.height ?? 350) + 'px')
const optRef = shallowRef<Record<string, unknown> | undefined>(undefined)
const hasData = ref(false)
const pendingOption = ref(true)

const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Limpia las líneas de división de los ejes para un estilo visual más limpio
function cleanAxes(opt: Record<string, unknown>): Record<string, unknown> {
  const result = { ...opt }
  for (const key of ['xAxis', 'yAxis']) {
    const axis = result[key]
    if (axis) {
      const axes = Array.isArray(axis) ? axis : [axis]
      result[key] = axes.map((a: Record<string, unknown>) => ({
        ...a,
        splitLine: { show: false, ...((a.splitLine ?? {}) as Record<string, unknown>) },
      }))
      if (!Array.isArray(axis)) result[key] = (result[key] as unknown[])[0]
    }
  }
  return result
}

function getChartInstance() {
  return chartRef.value?.chart
}

function onChartClick(params: any) {
  if (props.clickable) emit('chart-click', params)
}

// Copia la gráfica como imagen PNG al portapapeles (fallback a descarga)
async function copyImage() {
  const instance = getChartInstance()
  if (!instance) return
  const backgroundColor = theme.value === 'light' ? '#ffffff' : '#0b0f1a'
  const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor })
  try {
    const blob = await (await fetch(url)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch (err) {
    console.error('[chart-card:clipboard]', err)
    downloadImage()
  }
}

// Descarga la gráfica como archivo PNG
function downloadImage() {
  const instance = getChartInstance()
  if (!instance) return
  const backgroundColor = theme.value === 'light' ? '#ffffff' : '#0b0f1a'
  const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor })
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title}.png`
  a.click()
}

// Observa cambios en la opción del gráfico y aplica debounce para evitar re-renderizados espurios
watch(() => props.option, (o) => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  pendingOption.value = true
  debounceTimer.value = setTimeout(() => {
    const opt = o ?? undefined
    optRef.value = opt ? cleanAxes({ ...opt }) : undefined
    hasData.value = Boolean(opt && opt.series && Array.isArray(opt.series) && opt.series.length > 0)
    pendingOption.value = false
  }, 16)
}, { immediate: true })

onBeforeUnmount(() => {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
})
</script>

<style scoped>
.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
  position: relative;
  backdrop-filter: blur(8px);
}
.chart-card:hover {
  box-shadow: var(--shadow-glass);
  border-color: var(--card-border-hover);
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.chart-header-text {
  min-width: 0;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -.2px;
}
.chart-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0;
  line-height: 1.4;
}
.chart-actions {
  display: flex;
  gap: 4px;
}
.action-btn {
  position: relative;
  background: none;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  cursor: pointer;
  padding: 5px;
  transition: all var(--transition-fast);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
}
.action-btn:hover {
  background: var(--accent-light);
  color: var(--accent);
  border-color: transparent;
}
.chart-body {
  min-height: 200px;
}
.chart {
  width: 100%;
  height: v-bind(chartHeight);
  max-height: 50vh;
}
.chart.clickable {
  cursor: pointer;
}
.chart-card.tall .chart {
  max-height: 65vh;
}

@media (max-width: 768px) {
  .chart-card {
    padding: 14px;
  }
  .chart {
    max-height: 52vh;
  }
}
</style>

<style>
/* Modal expandir gráfico (fuera de scoped porque se teleports a body) */
.cc-modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.cc-modal-panel {
  background: var(--bg, #fff);
  border-radius: 16px;
  width: 95vw; max-width: 95vw;
  height: 90vh; max-height: 90vh;
  position: relative;
  box-shadow: 0 25px 80px rgba(0,0,0,.5);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.cc-modal-close {
  width: 32px; height: 32px; border: 1px solid #d1d5db; border-radius: 50%;
  background: #fff; color: #374151;
  font-size: 15px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,.12);
  transition: all .2s; flex-shrink: 0; margin-left: 8px;
}
.cc-modal-close:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
.cc-modal-top {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px 12px; flex-shrink: 0;
  border-bottom: 1px solid var(--card-border, #e5e7eb);
}
.cc-modal-title {
  font-size: 16px; font-weight: 700; color: var(--text-primary, #1f2937);
  flex-shrink: 0;
}
.cc-modal-limit-btns {
  display: flex; gap: 4px; margin-left: auto;
}
.cc-limit-btn {
  padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--card-border, #d1d5db); background: transparent;
  color: var(--text-secondary, #6b7280); cursor: pointer;
  transition: all .15s;
}
.cc-limit-btn:hover { background: var(--accent-light, #ede9fe); color: var(--accent, #7c3aed); }
.cc-limit-btn.active { background: var(--accent, #7c3aed); color: #fff; border-color: var(--accent, #7c3aed); }
.cc-modal-chart-wrap {
  flex: 1; padding: 16px 20px 20px; min-height: 0;
}
.cc-modal-chart {
  width: 100%; height: 100%;
}
</style>
