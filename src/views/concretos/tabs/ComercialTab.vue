<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Clientes Únicos" accent="#6366F1" icon="users">{{ kpis.clientesUnicos }}</KpiCard>
      <KpiCard label="Total Obras" accent="#10B981" icon="building">{{ kpis.obrasActivas }}</KpiCard>
      <KpiCard label="Despachos" accent="#8B5CF6" icon="truck">{{ kpis.totalDespachos }}</KpiCard>
      <KpiCard label="Mixers Activos" accent="#F59E0B" icon="zap">{{ kpis.mixersActivos }}</KpiCard>
      <KpiCard label="Vol. Promedio / Despacho" accent="#06B6D4" icon="package">{{ kpis.volPromDespacho }} M³</KpiCard>
      <KpiCard label="% Con Bombeo" accent="#EC4899" icon="activity">{{ kpis.pctBombeo }}%</KpiCard>
    </div>

    <div class="charts-grid cols-2" style="margin-top: 22px">
      <ChartCard title="Pareto de Concentración — Clientes" :option="paretoOpt" />
      <ChartCard title="Mix de Resistencias" :option="mixResistenciasOpt" />
    </div>
  </div>
</template>

/**
 * ComercialTab.vue — Tab de desempeño comercial.
 * Muestra ranking de comerciales por volumen, distribución por planta
 * y análisis de clientes asociados a cada comercial.
 */
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData } from '../../../types'

const props = defineProps<{ data: DashboardData }>()

const kpis = computed(() => props.data.kpis)
const { theme } = useTheme()

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

const paretoOpt = computed(() => {
  const clientes = props.data.clientes ?? []
  const total = props.data.kpis.totalVolDespachado || 1
  let acum = 0
  const data = clientes.slice(0, 20).map(c => {
    acum += c.volDespachado
    return { nombre: c.cliente, volumen: c.volDespachado, acumulado: +((acum / total) * 100).toFixed(1) }
  })
  return markRaw({
    color: ['#E8913A', '#EF4444'],
    tooltip: { trigger: 'axis' as const },
    grid: { ...baseGrid, bottom: 80 },
    xAxis: {
      type: 'category' as const,
      data: data.map(r => r.nombre),
      axisLabel: { fontWeight: 600 as const, fontSize: 9, rotate: 40, interval: 0, overflow: 'truncate', width: 80 },
    },
    yAxis: [
      { type: 'value' as const, axisLabel: { show: false } },
      { type: 'value' as const, axisLabel: { show: true, fontSize: 10, fontWeight: 600, formatter: '{value}%' }, min: 0, max: 100 },
    ],
    series: [
      { name: 'Vol. m³', type: 'bar', data: data.map(r => r.volumen), label: { ...labelStyle.value, show: false } },
      { name: '% Acumulado', type: 'line', yAxisIndex: 1, data: data.map(r => r.acumulado), smooth: true, showSymbol: true, symbolSize: 6, lineStyle: { width: 2 }, itemStyle: { color: '#EF4444' } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const PIE_COLORS = ['#E8913A', '#3B82F6', '#22C55E', '#A855F7', '#06B6D4', '#EF4444', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6']
const mixResistenciasOpt = computed(() => {
  const resist = props.data.resistencias ?? []
  return markRaw({
    color: PIE_COLORS,
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} m³ ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['35%', '70%'],
      center: ['50%', '55%'],
      data: resist.map(r => ({ name: r.resistencia, value: r.volDespachado })),
      label: { fontSize: 11, fontWeight: 600, color: theme.value === 'light' ? '#374151' : '#e2e8f0' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
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
.charts-grid.cols-1 { grid-template-columns: 1fr; }
.charts-grid > * { min-width: 0; }
</style>