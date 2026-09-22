<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Total Clientes" accent="#6366F1" icon="users">{{ clientes.length }}</KpiCard>
      <KpiCard label="Vol. Total" accent="#10B981" icon="package">{{ fmt(totalVol) }} M³</KpiCard>
      <KpiCard label="Promedio / Cliente" accent="#F59E0B" icon="trending-up">{{ fmt(promedioCliente) }} M³</KpiCard>
    </div>

    <div class="charts-grid cols-2-1">
      <ChartCard title="Top 10 Clientes por Volumen" :option="topClientesOpt" tall />
      <ChartCard title="Clientes por Planta" :option="clientesPlantaOpt" tall />
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
import { colorPlanta, colorPrincipal, fmtM3, fmtPct, leyenda, paleta, etiquetaValor } from '../../../utils/concretoCharts'
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

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }

/** Top 10 clientes: un solo color, con m³ y participación sobre el total */
const topClientesOpt = computed(() => {
  const top = clientes.value.slice(0, 10)
  const t = theme.value
  const total = totalVol.value || 1
  const names = top.map(c => c.cliente).reverse()
  const textos = top.map(c => `${fmtM3(c.volDespachado, 0)} · ${fmtPct(c.volDespachado / total * 100)}`)
  const layout = hBarLayout(names, hBarValueSpace(textos, 60), viewportW.value)
  return markRaw({
    tooltip: hBarTooltip(names, (v) => fmtM3(v)),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: names, axisTick: { show: false }, axisLine: { show: false }, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      type: 'bar' as const, barMaxWidth: 22,
      data: top.map((c, i) => ({ value: +c.volDespachado.toFixed(1), itemStyle: { color: i < 3 ? colorPrincipal(t) : (t === 'light' ? '#3b5b9a' : '#3b82f6'), borderRadius: [0, 3, 3, 0] } })).reverse(),
      label: etiquetaValor(t, 'right', v => `${fmtM3(v, 0)} · ${fmtPct(v / total * 100)}`),
    }],
  })
})

/** Clientes por planta: dona con el color de cada planta y el total al centro */
const clientesPlantaOpt = computed(() => {
  const cp = props.data.clientesPorPlanta
  if (!cp) return markRaw({ series: [] })
  const t = theme.value
  const labels = ['Villavicencio', 'Acacias', 'Restrepo'] as const
  const data = labels.map(p => ({ name: p, value: cp[p]?.length ?? 0, itemStyle: { color: colorPlanta(p, t) } }))
  const total = data.reduce((s, d) => s + d.value, 0)
  return markRaw({
    tooltip: { trigger: 'item' as const, formatter: (x: any) => `${x.name}: <b>${x.value}</b> clientes (${fmtPct(x.percent)})` },
    legend: leyenda(t, { top: 'bottom', right: 'center', orient: 'vertical',
      formatter: (n: string) => { const d = data.find(x => x.name === n); return `${n}  ${d?.value ?? 0} · ${fmtPct(total ? (d?.value ?? 0) / total * 100 : 0, 0)}` } }),
    title: { text: String(total), subtext: 'CLIENTES', left: 'center', top: '33%',
      textStyle: { fontSize: 24, fontWeight: 900, color: paleta(t).texto }, subtextStyle: { fontSize: 10, fontWeight: 'bold', color: paleta(t).textoSuave } },
    series: [{
      type: 'pie' as const, radius: ['46%', '68%'], center: ['50%', '42%'], data,
      label: { show: false },
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
.charts-grid.cols-2-1 { grid-template-columns: 2fr 1fr; }
@media (max-width: 1024px) { .charts-grid.cols-2-1 { grid-template-columns: 1fr; } }
.charts-grid > * { min-width: 0; }
</style>
