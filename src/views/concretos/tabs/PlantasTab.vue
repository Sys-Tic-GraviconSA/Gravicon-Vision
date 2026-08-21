<template>
  <div>
    <div class="kpi-row">
      <KpiCard v-for="plant in data.plantas" :key="plant.planta" :label="plant.planta" accent="#6366F1" icon="building">
        {{ fmt(plant.volDespachado) }} M³
        <template #meta>{{ plant.despachos }} despachos</template>
      </KpiCard>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Bombeo por Planta" :option="bombeoOpt" />
      <ChartCard title="Eficiencia por Planta" :option="eficienciaOpt" />
    </div>
  </div>
</template>

/**
 * PlantasTab.vue — Tab de comparativa por planta.
 * Muestra KPIs por planta, distribución semanal apilada, top clientes
 * por planta, y detalle de bombeo (con/sin bomba).
 */
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData } from '../../../types'

const props = defineProps<{ data: DashboardData }>()

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }
const { theme } = useTheme()

const plantas = computed(() => props.data.plantas ?? [])

const baseGrid = { left: 60, right: 30, bottom: 60, top: 50, containLabel: true }

const bombeoOpt = computed(() => {
  const bp = props.data.bombeoPorPlanta ?? []
  return markRaw({
    color: ['#E8913A', '#3B82F6'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: bp.map((p: any) => p.planta), axisLabel: { fontWeight: 600 as const } },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [
      { name: 'Con Bombeo m³', type: 'bar', stack: 's', data: bp.map((p: any) => p.conBombeo) },
      { name: 'Sin Bombeo m³', type: 'bar', stack: 's', data: bp.map((p: any) => p.sinBombeo), itemStyle: { color: '#3B82F6' } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const eficienciaOpt = computed(() => {
  const ps = plantas.value
  const maxProm = Math.max(...ps.map(p => p.promDespacho), 1)
  const maxClientes = Math.max(...ps.map(p => p.clientesUnicos), 1)
  const maxObras = Math.max(...ps.map(p => p.obrasActivas), 1)
  return markRaw({
    color: ['#E8913A', '#3B82F6', '#22C55E'],
    tooltip: {},
    legend: { bottom: 0, textStyle: { fontSize: 11, fontWeight: 600 } },
    radar: {
      indicator: [
        { name: 'Prom. m³/viaje', max: maxProm },
        { name: 'Clientes', max: maxClientes },
        { name: 'Obras', max: maxObras },
      ],
      center: ['50%', '55%'],
      radius: '65%',
      axisName: { fontWeight: 600 as const, fontSize: 11, color: theme.value === 'light' ? '#374151' : '#e2e8f0' },
      splitArea: { areaStyle: { color: theme.value === 'light' ? ['rgba(99,102,241,.03)', 'rgba(99,102,241,.06)'] : ['rgba(99,102,241,.05)', 'rgba(99,102,241,.1)'] } },
    },
    series: [{
      type: 'radar' as const,
      data: ps.map(p => ({
        value: [p.promDespacho, p.clientesUnicos, p.obrasActivas],
        name: p.planta,
        areaStyle: { opacity: 0.15 },
      })),
      symbol: 'none',
      lineStyle: { width: 2 },
    }],
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