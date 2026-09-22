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
import { colorPrincipal, fmtNum, fmtM3, leyenda, ejeValor, ejeCategoria, etiquetaValor, AMBAR, VERDE } from '../../../utils/concretoCharts'
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

const tod = computed(() => props.plantOp?.Todas)

/** Distribución horaria: volumen por hora (barras), despachos (línea) y hora pico marcada */
const horarioOpt = computed(() => {
  const horario = (tod.value?.horario ?? []).filter(h => h.hora >= 4 && h.hora <= 17)
  const t = theme.value
  const vals = horario.map(h => +h.volDespachado.toFixed(1))
  const pico = Math.max(0, ...vals)
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: leyenda(t),
    grid: { left: 8, right: 8, bottom: 24, top: 40, containLabel: true },
    xAxis: ejeCategoria(t, horario.map(h => h.label)),
    yAxis: [ejeValor(t), ejeValor(t, 'Despachos', { splitLine: { show: false } })],
    series: [
      { name: 'Vol. m³', type: 'bar', barMaxWidth: 30,
        data: vals.map(v => ({ value: v, itemStyle: { color: v === pico && pico > 0 ? AMBAR : colorPrincipal(t), borderRadius: [3, 3, 0, 0] } })),
        label: etiquetaValor(t, 'top', v => (v ? fmtNum(v, 0) : '')),
        tooltip: { valueFormatter: (v: unknown) => fmtM3(Number(v)) } },
      { name: 'Despachos', type: 'line', yAxisIndex: 1, data: horario.map(h => h.despachos), smooth: true, symbolSize: 6,
        lineStyle: { width: 2, color: VERDE }, itemStyle: { color: VERDE } },
    ],
  })
})

/** Equipos de bombeo: m³ bombeados y número de servicios */
const bombasOpt = computed(() => {
  const bombas = props.data.bombas ?? []
  const t = theme.value
  const names = bombas.map(b => b.bomba).reverse()
  const textos = bombas.map(b => `${fmtM3(b.volBombeado, 0)} · ${b.bombeos ?? b.servicios} serv.`)
  const layout = hBarLayout(names, hBarValueSpace(textos, 60), viewportW.value)
  const rev = [...bombas].reverse()
  return markRaw({
    tooltip: hBarTooltip(names, (v) => fmtM3(v)),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: names, axisTick: { show: false }, axisLine: { show: false }, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      type: 'bar', barMaxWidth: 20, data: rev.map(b => +b.volBombeado.toFixed(1)),
      itemStyle: { color: colorPrincipal(t), borderRadius: [0, 3, 3, 0] },
      label: etiquetaValor(t, 'right', (v, i) => `${fmtM3(v, 0)} · ${rev[i].bombeos ?? rev[i].servicios} serv.`),
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