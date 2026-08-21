<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Total Volumen" accent="#6366F1" icon="layers">{{ fmt(totalVol) }} M³</KpiCard>
      <KpiCard label="Despachos" accent="#10B981" icon="truck">{{ kpis.totalDespachos.toLocaleString('es-CO') }}</KpiCard>
      <KpiCard label="Clientes Únicos" accent="#8B5CF6" icon="users">{{ kpis.clientesUnicos }}</KpiCard>
      <KpiCard label="Obras Activas" accent="#F59E0B" icon="building">{{ kpis.obrasActivas }}</KpiCard>
      <KpiCard label="% Con Bombeo" accent="#06B6D4" icon="activity">{{ kpis.pctBombeo }}%</KpiCard>
      <KpiCard label="Mixers Activos" accent="#EC4899" icon="zap">{{ kpis.mixersActivos }}</KpiCard>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Producción Semanal por Planta" :option="semanalOpt" />
      <ChartCard title="Tendencia Diaria" :option="tendenciaOpt" />
      <ChartCard title="Por Elemento Estructural" :option="elementosOpt" />
      <ChartCard title="Patrón por Día de Semana" :option="diaSemanaOpt" />
    </div>
  </div>
</template>

/**
 * ResumenTab.vue — Tab de resumen general del dashboard de concreto.
 * Muestra KPIs globales, distribución por planta, mix de mezclas,
 * top clientes (Pareto), tendencia diaria/semanal y evolución mensual.
 */
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData, PlantOpData } from '../../../types'
import { tickInterval } from '../../../utils/format'
import { fmtDate } from '../../../composables/useDashboardData'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarTooltip, hBarValueSpace } from '../../../utils/chartLayout'
import { useViewportWidth } from '../../../composables/useViewportWidth'

const props = defineProps<{
  data: DashboardData
  meta?: DashboardData['meta']
  plantOp?: Record<string, PlantOpData>
}>()

const kpis = computed(() => props.data.kpis)
const totalVol = computed(() => kpis.value.totalVolDespachado)

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

const PIE_COLORS = ['#E8913A', '#3B82F6', '#22C55E', '#A855F7', '#06B6D4', '#EF4444', '#F59E0B', '#EC4899']
const baseGrid = { left: 60, right: 30, bottom: 60, top: 50, containLabel: true }

const semanalOpt = computed(() => {
  const data = props.data.semanalStacked ?? []
  const interval = tickInterval(data.length, 10)
  return markRaw({
    color: ['#6366F1', '#10B981', '#F59E0B'],
    tooltip: { trigger: 'axis' as const },
    grid: { ...baseGrid, bottom: data.length > 15 ? 80 : 60 },
    xAxis: {
      type: 'category' as const,
      data: data.map((r: any) => r.semana),
      axisLabel: { fontWeight: 600 as const, rotate: data.length > 15 ? 45 : 0, interval, fontSize: 10 },
    },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [
      { name: 'Villavicencio', type: 'bar', stack: 'total', data: data.map((r: any) => r.Villavicencio), areaStyle: { opacity: 0.25 } },
      { name: 'Acacias', type: 'bar', stack: 'total', data: data.map((r: any) => r.Acacias), areaStyle: { opacity: 0.25 } },
      { name: 'Restrepo', type: 'bar', stack: 'total', data: data.map((r: any) => r.Restrepo), radius: [4, 4, 0, 0], areaStyle: { opacity: 0.25 } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const tod = computed(() => props.plantOp?.Todas)
const tendenciaOpt = computed(() => {
  const diario = tod.value?.diario ?? []
  return markRaw({
    color: ['#E8913A'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: {
      type: 'category' as const,
      data: diario.map((r: any) => fmtDate(r.fecha)),
      axisLabel: { fontWeight: 600 as const, fontSize: 9, rotate: diario.length > 20 ? 45 : 0 },
    },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [{
      type: 'line', data: diario.map((r: any) => r.volDespachado),
      areaStyle: { opacity: 0.2, color: '#E8913A' },
      smooth: true, showSymbol: false,
    }],
  })
})

const elementosOpt = computed(() => {
  const elem = (props.data.elementos ?? []).slice(0, 8)
  const names = elem.map((r: any) => r.elemento)
  const valueTexts = elem.map((r: any) => r.volDespachado.toLocaleString('es-CO'))
  const layout = hBarLayout(names, hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
    color: PIE_COLORS,
    tooltip: hBarTooltip(names, (v) => v.toLocaleString('es-CO')),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false } },
    yAxis: { type: 'category' as const, data: names.reverse(), axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      type: 'bar' as const,
      data: elem.map((r: any) => r.volDespachado).reverse(),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { ...labelStyle.value, position: 'right' as const },
    }],
  })
})

const diaSemanaOpt = computed(() => {
  const ds = tod.value?.diaSemana ?? []
  return markRaw({
    color: ['#3B82F6', '#E8913A'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: ds.map((r: any) => r.dia), axisLabel: { fontWeight: 600 as const } },
    yAxis: [
      { type: 'value' as const, axisLabel: { show: false } },
      { type: 'value' as const, axisLabel: { show: false } },
    ],
    series: [
      { name: 'Vol. m³', type: 'bar', data: ds.map((r: any) => r.volDespachado), label: { ...labelStyle.value, show: false } },
      { name: '# Despachos', type: 'line', yAxisIndex: 1, data: ds.map((r: any) => r.despachos), smooth: true, showSymbol: false },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})
</script>

<style scoped>
.kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
@media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .kpi-row { grid-template-columns: 1fr; } }
.charts-grid { display: grid; gap: 22px; margin-top: 24px; min-width: 0; }
.charts-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.charts-grid > * { min-width: 0; }
</style>