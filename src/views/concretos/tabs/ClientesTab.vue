<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Total Clientes" accent="#6366F1" icon="users">{{ clientes.length }}</KpiCard>
      <KpiCard label="Vol. Total" accent="#10B981" icon="package">{{ fmt(totalVol) }} M³</KpiCard>
      <KpiCard label="Promedio / Cliente" accent="#F59E0B" icon="trending-up">{{ fmt(promedioCliente) }} M³</KpiCard>
    </div>

    <div class="charts-grid cols-1">
      <ChartCard title="Top 10 Clientes por Volumen" :option="topClientesOpt" tall />
    </div>
    <div class="charts-grid cols-2" style="margin-top:22px">
      <ChartCard title="Clientes por Planta" :option="clientesPlantaOpt" />
    </div>

    <div style="margin-top: 24px;">
      <DataTable
        title="Detalle de Clientes"
        :data="clientesTable"
        :page-size="999"
        small
        :highlightField="'_total'"
      />
    </div>
  </div>
</template>

/**
 * ClientesTab.vue — Tab de análisis de clientes.
 * Muestra ranking de clientes por volumen, distribución por planta,
 * y detalle de obras y despachos por cliente.
 */
<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import { useViewportWidth } from '../../../composables/useViewportWidth'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarTooltip, hBarValueSpace } from '../../../utils/chartLayout'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import DataTable from '../../../components/dashboard/DataTable.vue'
import type { DashboardData } from '../../../types'

const props = defineProps<{ data: DashboardData }>()

const clientes = computed(() => props.data.clientes ?? [])
const clientesTable = computed(() => {
  const d = clientes.value
  if (!d.length) return d
  const total = d.reduce((s, c) => s + c.volDespachado, 0)
  return [...d, { _total: true, cliente: 'TOTAL', volDespachado: total } as any]
})
const totalVol = computed(() => clientes.value.reduce((s, c) => s + c.volDespachado, 0))
const promedioCliente = computed(() =>
  clientes.value.length ? totalVol.value / clientes.value.length : 0
)

const { theme } = useTheme()
const viewportW = useViewportWidth()
const PIE_COLORS = ['#E8913A', '#3B82F6', '#22C55E', '#A855F7', '#06B6D4', '#EF4444', '#F59E0B', '#EC4899']

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

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }

const topClientesOpt = computed(() => {
  const top = clientes.value.slice(0, 10)
  const names = top.map(c => c.cliente).reverse()
  const valueTexts = top.map(c => c.volDespachado.toLocaleString('es-CO'))
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
    series: [{
      type: 'bar' as const,
      colorBy: 'data' as const,
      data: top.map(c => c.volDespachado).reverse(),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { ...labelStyle.value, position: 'right' as const },
    }],
  })
})

const clientesPlantaOpt = computed(() => {
  const cp = props.data.clientesPorPlanta
  if (!cp) return markRaw({ series: [] })
  const labels = ['Acacias', 'Restrepo', 'Villavicencio']
  const data = labels.map(p => ({
    name: p,
    value: (cp as Record<string, { volDespachado: number }[]>)[p]?.length ?? 0,
  }))
  return markRaw({
    color: PIE_COLORS,
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} clientes ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      center: ['50%', '55%'],
      data,
      label: { fontSize: 12, fontWeight: 600, color: theme.value === 'light' ? '#374151' : '#e2e8f0' },
    }],
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
