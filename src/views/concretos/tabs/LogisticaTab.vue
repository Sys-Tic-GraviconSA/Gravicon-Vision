<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Conductores" accent="#6366F1" icon="users">{{ totalConductores }}</KpiCard>
      <KpiCard label="Mixers Activos" accent="#10B981" icon="zap">{{ kpis.mixersActivos }}</KpiCard>
      <KpiCard label="Bombas Activas" accent="#8B5CF6" icon="activity">{{ bombasActivas }}</KpiCard>
      <KpiCard label="% Con Bombeo" accent="#06B6D4" icon="settings">{{ kpis.pctBombeo }}%</KpiCard>
      <KpiCard label="Viajes Total" accent="#F59E0B" icon="truck">{{ totalViajes }}</KpiCard>
      <KpiCard label="Volumen Total" accent="#EC4899" icon="package">{{ fmt(kpis.totalVolDespachado) }} M³</KpiCard>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Distribución Horaria" :option="horarioOpt" />
      <ChartCard title="Equipos de Bombeo" :option="bombasOpt" />
    </div>
  </div>
</template>

/**
 * LogisticaTab.vue — Tab de logística y flota.
 * Muestra análisis de mixers y conductores por volumen y viajes,
 * distribución de resistencias de concreto, y elementos transportados.
 */
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import { useViewportWidth } from '../../../composables/useViewportWidth'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarTooltip, hBarValueSpace } from '../../../utils/chartLayout'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData, PlantOpData } from '../../../types'

const props = defineProps<{ data: DashboardData; plantOp?: Record<string, PlantOpData> }>()

const kpis = computed(() => props.data.kpis)
const totalConductores = computed(() => (props.data.conductores ?? []).length)
const bombasActivas = computed(() => (props.data.bombas ?? []).length)
const totalViajes = computed(() => (props.data.conductores ?? []).reduce((s: number, c: any) => s + c.viajes, 0))

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }
const { theme } = useTheme()
const viewportW = useViewportWidth()

const labelStyle = computed(() => ({
  show: true,
  fontSize: 11,
  fontWeight: 600 as const,
  color: theme.value === 'light' ? '#374151' : '#e2e8f0',
  backgroundColor: theme.value === 'light' ? 'rgba(255,255,255,.85)' : 'rgba(30,41,59,.85)',
  padding: [2, 6],
  borderRadius: 4,
  formatter: (p: any) => p.value.toLocaleString('es-CO'),
}))
const baseGrid = { left: 60, right: 30, bottom: 60, top: 50, containLabel: true }

const tod = computed(() => props.plantOp?.Todas)

const horarioOpt = computed(() => {
  const horario = (tod.value?.horario ?? []).filter((h: any) => h.hora >= 4 && h.hora <= 17)
  return markRaw({
    color: ['#3B82F6', '#E8913A'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: horario.map((h: any) => h.label), axisLabel: { fontWeight: 600 as const, fontSize: 10 } },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [{
      type: 'line',
      data: horario.map((h: any) => h.volDespachado),
      areaStyle: { opacity: 0.2, color: '#3B82F6' },
      smooth: true, showSymbol: false,
      name: 'Vol. m³',
    }],
  })
})

const PIE_COLORS = ['#E8913A', '#3B82F6', '#22C55E', '#A855F7', '#06B6D4', '#EF4444', '#F59E0B', '#EC4899']

const bombasOpt = computed(() => {
  const bombas = props.data.bombas ?? []
  const names = bombas.map((b: any) => b.bomba).reverse()
  const valueTexts = bombas.map((b: any) => b.volBombeado.toLocaleString('es-CO'))
  const layout = hBarLayout(names, hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
    color: PIE_COLORS,
    tooltip: hBarTooltip(names, (v) => v.toLocaleString('es-CO') + ' m³'),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false } },
    yAxis: {
      type: 'category' as const,
      data: names,
      axisLabel: hBarAxisLabel(layout.labelSpace),
    },
    series: [{ type: 'bar', colorBy: 'data' as const, data: bombas.map((b: any) => b.volBombeado).reverse(), label: { ...labelStyle.value, position: 'right' as const } }],
  })
})
</script>

<style scoped>
.kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
@media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .kpi-row { grid-template-columns: 1fr; } }
.charts-grid { display: grid; gap: 22px; margin-top: 24px; min-width: 0; }
.charts-grid.cols-1 { grid-template-columns: 1fr; }
.charts-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.charts-grid > * { min-width: 0; }
</style>