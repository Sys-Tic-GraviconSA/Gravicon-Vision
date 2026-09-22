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
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarValueSpace } from '../../../utils/chartLayout'
import { useViewportWidth } from '../../../composables/useViewportWidth'
import {
  colorPlanta, colorPrincipal, fmtNum, fmtM3, fmtPct, leyenda, ejeValor, ejeCategoria, tooltipEje,
  serieTotal, lineaPromedio, etiquetaValor, VERDE, ROJO, AMBAR,
} from '../../../utils/concretoCharts'

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
const PLANTAS = ['Villavicencio', 'Acacias', 'Restrepo'] as const

/** Producción semanal apilada por planta, con el total de la semana encima */
const semanalOpt = computed(() => {
  const data = props.data.semanalStacked ?? []
  const t = theme.value
  const interval = tickInterval(data.length, 10)
  const totales = data.map(r => PLANTAS.reduce((s, p) => s + (Number(r[p]) || 0), 0))
  return markRaw({
    tooltip: tooltipEje(),
    legend: leyenda(t, { data: [...PLANTAS] }),
    grid: { left: 8, right: 8, bottom: data.length > 15 ? 50 : 24, top: 40, containLabel: true },
    xAxis: ejeCategoria(t, data.map(r => r.semana), { axisLabel: { fontWeight: 600, rotate: data.length > 15 ? 45 : 0, interval, fontSize: 10 } }),
    yAxis: ejeValor(t),
    series: [
      ...PLANTAS.map((p, i) => ({
        name: p, type: 'bar', stack: 't', barMaxWidth: 34, data: data.map(r => +(Number(r[p]) || 0).toFixed(1)),
        itemStyle: { color: colorPlanta(p, t), borderRadius: i === PLANTAS.length - 1 ? [3, 3, 0, 0] : 0 },
      })),
      ...(data.length <= 18 ? [serieTotal(totales, t)] : []),
    ],
  })
})

const tod = computed(() => props.plantOp?.Todas)

/** Tendencia diaria: barras del día, promedio del periodo y máximo/mínimo marcados */
const tendenciaOpt = computed(() => {
  const diario = tod.value?.diario ?? []
  const t = theme.value
  const c = colorPrincipal(t)
  const vals = diario.map(r => +r.volDespachado.toFixed(1))
  const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  return markRaw({
    tooltip: tooltipEje(),
    grid: { left: 8, right: 16, bottom: diario.length > 20 ? 50 : 24, top: 30, containLabel: true },
    xAxis: ejeCategoria(t, diario.map(r => fmtDate(r.fecha)), { axisLabel: { fontWeight: 600, fontSize: 9, rotate: diario.length > 20 ? 45 : 0 } }),
    yAxis: ejeValor(t),
    series: [{
      name: 'Vol. despachado', type: 'bar', barMaxWidth: 22,
      data: vals.map(v => ({ value: v, itemStyle: { color: v >= prom ? c : (t === 'light' ? '#93c5fd' : '#1e40af'), borderRadius: [2, 2, 0, 0] } })),
      markLine: lineaPromedio(t, 'Promedio', 1),
      markPoint: {
        symbolSize: 38, label: { fontSize: 9, fontWeight: 'bold', formatter: (x: any) => fmtNum(x.value, 0) },
        data: [{ type: 'max', name: 'Máximo', itemStyle: { color: VERDE } }, { type: 'min', name: 'Mínimo', itemStyle: { color: ROJO } }],
      },
    }],
  })
})

/** Elementos estructurales: barras horizontales con m³ y participación */
const elementosOpt = computed(() => {
  const elem = (props.data.elementos ?? []).slice(0, 10)
  const t = theme.value
  const total = (props.data.elementos ?? []).reduce((s, e) => s + e.volDespachado, 0) || 1
  const names = elem.map(r => r.elemento).reverse()
  const textos = elem.map(r => `${fmtM3(r.volDespachado, 0)} · ${fmtPct(r.volDespachado / total * 100)}`)
  const layout = hBarLayout(names, hBarValueSpace(textos, 60), viewportW.value)
  const vals = elem.map(r => r.volDespachado).reverse()
  return markRaw({
    tooltip: tooltipEje(),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, show: false },
    yAxis: { type: 'category' as const, data: names, axisTick: { show: false }, axisLine: { show: false }, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: 'Vol. despachado', type: 'bar' as const, barMaxWidth: 20, data: vals,
      itemStyle: { color: colorPrincipal(t), borderRadius: [0, 3, 3, 0] },
      label: etiquetaValor(t, 'right', v => `${fmtM3(v, 0)} · ${fmtPct(v / total * 100)}`),
    }],
  })
})

/** Día de semana: volumen (barras) y número de despachos (línea) */
const diaSemanaOpt = computed(() => {
  const ds = tod.value?.diaSemana ?? []
  const t = theme.value
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: leyenda(t),
    grid: { left: 8, right: 8, bottom: 24, top: 40, containLabel: true },
    xAxis: ejeCategoria(t, ds.map(r => r.dia)),
    yAxis: [ejeValor(t), ejeValor(t, 'Despachos', { splitLine: { show: false } })],
    series: [
      { name: 'Vol. m³', type: 'bar', barMaxWidth: 36, data: ds.map(r => +r.volDespachado.toFixed(1)),
        itemStyle: { color: colorPrincipal(t), borderRadius: [3, 3, 0, 0] },
        label: etiquetaValor(t, 'top', v => fmtNum(v, 0)),
        tooltip: { valueFormatter: (v: unknown) => fmtM3(Number(v)) } },
      { name: 'Despachos', type: 'line', yAxisIndex: 1, data: ds.map(r => r.despachos), smooth: true, symbolSize: 7,
        lineStyle: { width: 2.5, color: AMBAR }, itemStyle: { color: AMBAR } },
    ],
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