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
import { useViewportWidth } from '../../../composables/useViewportWidth'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarValueSpace } from '../../../utils/chartLayout'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData } from '../../../types'
import { colorPrincipal, fmtM3, fmtPct, ejeValor, ejeCategoria, leyenda, paleta, etiquetaValor, ROJO, GRIS } from '../../../utils/concretoCharts'

const props = defineProps<{ data: DashboardData }>()

const kpis = computed(() => props.data.kpis)
const { theme } = useTheme()
const viewportW = useViewportWidth()

/** Pareto: m³ por cliente (top 20) y % acumulado, con la referencia del 80% */
const paretoOpt = computed(() => {
  const clientes = props.data.clientes ?? []
  const total = props.data.kpis.totalVolDespachado || 1
  const t = theme.value
  let acum = 0
  const data = clientes.slice(0, 20).map(c => {
    acum += c.volDespachado
    return { nombre: c.cliente, volumen: +c.volDespachado.toFixed(1), acumulado: +((acum / total) * 100).toFixed(1) }
  })
  const n80 = data.findIndex(r => r.acumulado >= 80)
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: leyenda(t),
    grid: { left: 8, right: 8, bottom: 8, top: 40, containLabel: true },
    xAxis: ejeCategoria(t, data.map(r => r.nombre), { axisLabel: { fontWeight: 600, fontSize: 9, rotate: 40, interval: 0, overflow: 'truncate', width: 90, color: paleta(t).texto } }),
    yAxis: [
      ejeValor(t),
      ejeValor(t, '% acum.', { min: 0, max: 100, splitLine: { show: false }, axisLabel: { fontSize: 10, color: paleta(t).textoSuave, formatter: '{value}%' } }),
    ],
    series: [
      { name: 'Vol. m³', type: 'bar', barMaxWidth: 26, itemStyle: { color: colorPrincipal(t) },
        data: data.map((r, i) => ({ value: r.volumen, itemStyle: { color: n80 < 0 || i <= n80 ? colorPrincipal(t) : (t === 'light' ? '#93c5fd' : '#1e40af'), borderRadius: [2, 2, 0, 0] } })),
        tooltip: { valueFormatter: (v: unknown) => fmtM3(Number(v)) } },
      { name: '% acumulado', type: 'line', yAxisIndex: 1, data: data.map(r => r.acumulado), smooth: true, symbolSize: 6,
        lineStyle: { width: 2, color: ROJO }, itemStyle: { color: ROJO },
        tooltip: { valueFormatter: (v: unknown) => fmtPct(Number(v)) },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: GRIS },
          label: { formatter: '80% del volumen', position: 'insideStartTop', color: paleta(t).textoSuave, fontSize: 10, fontWeight: 'bold' }, data: [{ yAxis: 80 }] } },
    ],
  })
})

/** Mix de resistencias como barras horizontales ordenadas (m³ y participación) */
const mixResistenciasOpt = computed(() => {
  const resist = [...(props.data.resistencias ?? [])].sort((a, b) => b.volDespachado - a.volDespachado).slice(0, 12)
  const total = (props.data.resistencias ?? []).reduce((s, r) => s + r.volDespachado, 0) || 1
  const t = theme.value
  const names = resist.map(r => r.resistencia).reverse()
  const textos = resist.map(r => `${fmtM3(r.volDespachado, 0)} · ${fmtPct(r.volDespachado / total * 100)}`)
  const layout = hBarLayout(names, hBarValueSpace(textos, 60), viewportW.value)
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, valueFormatter: (v: unknown) => fmtM3(Number(v)) },
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: names, axisTick: { show: false }, axisLine: { show: false }, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: 'Vol. despachado', type: 'bar' as const, barMaxWidth: 18, data: resist.map(r => +r.volDespachado.toFixed(1)).reverse(),
      itemStyle: { color: colorPrincipal(t), borderRadius: [0, 3, 3, 0] },
      label: etiquetaValor(t, 'right', v => `${fmtM3(v, 0)} · ${fmtPct(v / total * 100)}`),
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
.charts-grid.cols-1 { grid-template-columns: 1fr; }
.charts-grid > * { min-width: 0; }
</style>