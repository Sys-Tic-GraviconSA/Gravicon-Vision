<template>
  <div>
    <div class="kpi-row">
      <KpiCard label="Total Volumen" accent="#6366F1" icon="package">{{ fmt(plantKpis.totalVol) }} M³</KpiCard>
      <KpiCard label="Despachos" accent="#10B981" icon="truck">{{ plantKpis.despachos }}</KpiCard>
      <KpiCard label="Promedio / Viaje" accent="#3B82F6" icon="trending-up">{{ plantKpis.promDespacho }} M³</KpiCard>
      <KpiCard label="Clientes Únicos" accent="#8B5CF6" icon="users">{{ plantKpis.clientes }}</KpiCard>
      <KpiCard label="Días Operación" accent="#F59E0B" icon="clock">{{ plantKpis.diasOp }}</KpiCard>
      <KpiCard label="% Con Bombeo" accent="#06B6D4" icon="activity">{{ plantKpis.pctBombeo }}%</KpiCard>
    </div>

    <div class="plant-filter">
      <button
        v-for="p in plantas"
        :key="p"
        class="filter-btn"
        :class="{ active: selectedPlanta === p }"
        :style="{ '--p-color': colorMap[p] }"
        @click="selectedPlanta = p"
      >{{ p === 'Todas' ? '⊕ Todas' : p }}</button>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Tendencia + Media Móvil 7d" :option="tendenciaOpt" />
      <ChartCard title="Evolución Semanal" :option="semanalOpt" />
      <ChartCard title="Patrón Día de Semana" :option="diaSemanaOpt" />
      <ChartCard title="Mapa de Calor Horario" :option="calorOpt" />
    </div>
  </div>
</template>

/**
 * OperativoTab.vue — Tab de operación detallada por planta.
 * Permite seleccionar una planta y visualizar KPIs operativos,
 * distribución horaria, tendencia diaria/semanal y análisis por día
 * de la semana. Usa los datos de PLANT_OP generados por useDashboardData.
 */
<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import type { DashboardData, PlantOpData } from '../../../types'
import { fmtDate } from '../../../composables/useDashboardData'
import { useTheme } from '../../../composables/useTheme'
import {
  colorPlanta, colorPrincipal, fmtNum, fmtM3, leyenda, ejeValor, ejeCategoria, etiquetaValor, lineaPromedio, AMBAR, VERDE,
} from '../../../utils/concretoCharts'

const props = defineProps<{
  data: DashboardData
  plantOp?: Record<string, PlantOpData>
}>()

const { theme } = useTheme()
const selectedPlanta = ref('Todas')
const plantas = ['Todas', 'Villavicencio', 'Acacias', 'Restrepo']
const colorMap = computed<Record<string, string>>(() => Object.fromEntries(
  plantas.map(p => [p, p === 'Todas' ? colorPrincipal(theme.value) : colorPlanta(p, theme.value)])))
const currentColor = computed(() => colorMap.value[selectedPlanta.value] || colorPrincipal(theme.value))

const plantData = computed(() => props.plantOp?.[selectedPlanta.value])
const plantKpis = computed(() => plantData.value?.kpis ?? { totalVol: 0, despachos: 0, clientes: 0, obras: 0, promDespacho: 0, diasOp: 0, pctBombeo: 0 })

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }
const gridBase = { left: 8, right: 8, bottom: 24, top: 40, containLabel: true }

/** Volumen diario con media móvil de 7 días y promedio del periodo */
const tendenciaOpt = computed(() => {
  const d = plantData.value?.diario ?? []
  const t = theme.value
  const c = currentColor.value
  const movAvg = d.map((_, i) => {
    const w = d.slice(Math.max(0, i - 6), i + 1)
    return +(w.reduce((s, v) => s + v.volDespachado, 0) / (w.length || 1)).toFixed(1)
  })
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, valueFormatter: (v: unknown) => fmtM3(Number(v)) },
    legend: leyenda(t),
    grid: { ...gridBase, bottom: d.length > 20 ? 50 : 24 },
    xAxis: ejeCategoria(t, d.map(r => fmtDate(r.fecha)), { axisLabel: { fontWeight: 600, fontSize: 9, rotate: d.length > 20 ? 45 : 0 } }),
    yAxis: ejeValor(t),
    series: [
      { name: 'Vol. diario', type: 'bar', barMaxWidth: 20, data: d.map(r => +r.volDespachado.toFixed(1)),
        itemStyle: { color: c, opacity: 0.45, borderRadius: [2, 2, 0, 0] }, markLine: lineaPromedio(t, 'Prom.', 1) },
      { name: 'Media móvil 7d', type: 'line', data: movAvg, smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: AMBAR }, itemStyle: { color: AMBAR } },
    ],
  })
})

/** Evolución semanal: volumen y clientes activos */
const semanalOpt = computed(() => {
  const d = plantData.value?.semanal ?? []
  const t = theme.value
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: leyenda(t),
    grid: gridBase,
    xAxis: ejeCategoria(t, d.map(r => r.label)),
    yAxis: [ejeValor(t), ejeValor(t, 'Clientes', { splitLine: { show: false } })],
    series: [
      { name: 'Vol. m³', type: 'bar', barMaxWidth: 34, data: d.map(r => +r.volDespachado.toFixed(1)),
        itemStyle: { color: currentColor.value, borderRadius: [3, 3, 0, 0] }, label: etiquetaValor(t, 'top', v => fmtNum(v, 0)),
        tooltip: { valueFormatter: (v: unknown) => fmtM3(Number(v)) } },
      { name: 'Clientes activos', type: 'line', yAxisIndex: 1, data: d.map(r => r.clientesActivos), smooth: true, symbolSize: 6,
        lineStyle: { width: 2, color: VERDE }, itemStyle: { color: VERDE } },
    ],
  })
})

/** Patrón por día de semana: volumen promedio y despachos */
const diaSemanaOpt = computed(() => {
  const d = plantData.value?.diaSemana ?? []
  const t = theme.value
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: leyenda(t),
    grid: gridBase,
    xAxis: ejeCategoria(t, d.map(r => r.dia.slice(0, 3))),
    yAxis: [ejeValor(t), ejeValor(t, 'Despachos', { splitLine: { show: false } })],
    series: [
      { name: 'Vol. m³', type: 'bar', barMaxWidth: 36, data: d.map(r => +r.volDespachado.toFixed(1)),
        itemStyle: { color: currentColor.value, borderRadius: [3, 3, 0, 0] }, label: etiquetaValor(t, 'top', v => fmtNum(v, 0)),
        tooltip: { valueFormatter: (v: unknown) => fmtM3(Number(v)) } },
      { name: 'Despachos', type: 'line', yAxisIndex: 1, data: d.map(r => r.despachos), smooth: true, symbolSize: 6,
        lineStyle: { width: 2, color: AMBAR }, itemStyle: { color: AMBAR } },
    ],
  })
})

/** Mapa de calor horario: intensidad del color según el volumen de cada hora */
const calorOpt = computed(() => {
  const d = (plantData.value?.horario ?? []).filter(h => h.hora >= 4 && h.hora <= 17)
  const maxHora = Math.max(1, ...d.map(h => h.volDespachado))
  const t = theme.value
  const c = currentColor.value
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, valueFormatter: (v: unknown) => fmtM3(Number(v)) },
    grid: gridBase,
    xAxis: ejeCategoria(t, d.map(h => h.label)),
    yAxis: ejeValor(t),
    series: [{
      name: 'Vol. m³', type: 'bar', barMaxWidth: 30,
      data: d.map(h => ({ value: +h.volDespachado.toFixed(1), itemStyle: { color: c, opacity: 0.15 + (h.volDespachado / maxHora) * 0.85, borderRadius: [3, 3, 0, 0] } })),
      label: etiquetaValor(t, 'top', v => (v ? fmtNum(v, 0) : '')),
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
.plant-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.filter-btn {
  padding: 7px 16px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.filter-btn.active {
  background: color-mix(in srgb, var(--p-color, var(--accent)) 18%, transparent);
  border-color: var(--p-color, var(--accent));
  color: var(--p-color, var(--accent));
  font-weight: 700;
}
.filter-btn:hover { background: var(--bg-alt); }
</style>
