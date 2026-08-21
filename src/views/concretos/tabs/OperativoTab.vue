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
        :style="{ '--p-color': colorMap[p] || '#E8913A' }"
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

const props = defineProps<{
  data: DashboardData
  plantOp?: Record<string, PlantOpData>
}>()

const selectedPlanta = ref('Todas')
const plantas = ['Todas', 'Acacias', 'Restrepo', 'Villavicencio']
const colorMap: Record<string, string> = { Todas: '#E8913A', Acacias: '#E8913A', Restrepo: '#3B82F6', Villavicencio: '#22C55E' }
const currentColor = computed(() => colorMap[selectedPlanta.value] || '#E8913A')

const plantData = computed(() => props.plantOp?.[selectedPlanta.value])
const plantKpis = computed(() => plantData.value?.kpis ?? { totalVol: 0, despachos: 0, clientes: 0, obras: 0, promDespacho: 0, diasOp: 0, pctBombeo: 0 })

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }

const baseGrid = { left: 60, right: 30, bottom: 60, top: 50, containLabel: true }

const tendenciaOpt = computed(() => {
  const d = plantData.value?.diario ?? []
  const movAvg = d.map((x: any, i: number) => {
    const w = d.slice(Math.max(0, i - 6), i + 1)
    const avg = w.reduce((s: number, v: any) => s + v.volDespachado, 0) / (w.length || 1)
    return { ...x, mediaMovil: Math.round(avg) }
  })
  const c = currentColor.value
  return markRaw({
    color: [c, c],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: {
      type: 'category' as const,
      data: movAvg.map((r: any) => fmtDate(r.fecha)),
      axisLabel: { fontWeight: 600 as const, fontSize: 9, rotate: movAvg.length > 20 ? 45 : 0 },
    },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    series: [
      { name: 'Vol. Diario', type: 'bar', data: movAvg.map((r: any) => r.volDespachado), itemStyle: { opacity: 0.35, color: c } },
      { name: 'Media 7d', type: 'line', data: movAvg.map((r: any) => r.mediaMovil), smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: c } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const semanalOpt = computed(() => {
  const d = plantData.value?.semanal ?? []
  const c = currentColor.value
  return markRaw({
    color: [c, '#22C55E'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: d.map((r: any) => r.label), axisLabel: { fontWeight: 600 as const, fontSize: 11 } },
    yAxis: [
      { type: 'value' as const, axisLabel: { show: false } },
      { type: 'value' as const, axisLabel: { show: false } },
    ],
    series: [
      { name: 'Vol. m³', type: 'bar', data: d.map((r: any) => r.volDespachado), itemStyle: { opacity: 0.6, color: c } },
      { name: 'Clientes Activos', type: 'line', yAxisIndex: 1, data: d.map((r: any) => r.clientesActivos), smooth: true, showSymbol: false, lineStyle: { width: 2, color: '#22C55E' } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const diaSemanaOpt = computed(() => {
  const d = plantData.value?.diaSemana ?? []
  const c = currentColor.value
  return markRaw({
    color: [c, '#06B6D4'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: d.map((r: any) => r.dia.slice(0, 3)), axisLabel: { fontWeight: 600 as const } },
    yAxis: [
      { type: 'value' as const, axisLabel: { show: false } },
      { type: 'value' as const, axisLabel: { show: false } },
    ],
    series: [
      { name: 'Vol. m³', type: 'bar', data: d.map((r: any) => r.volDespachado), itemStyle: { opacity: 0.7, color: c } },
      { name: '# Despachos', type: 'line', yAxisIndex: 1, data: d.map((r: any) => r.despachos), smooth: true, showSymbol: false },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600 } },
  })
})

const calorOpt = computed(() => {
  const d = (plantData.value?.horario ?? []).filter((h: any) => h.hora >= 4 && h.hora <= 17)
  const maxHora = Math.max(1, ...d.map((h: any) => h.volDespachado))
  const c = currentColor.value
  return markRaw({
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: d.map((h: any) => h.label), axisLabel: { fontWeight: 600 as const, fontSize: 10 } },
    yAxis: { type: 'value' as const, axisLabel: { show: false } },
    grid: baseGrid,
    series: [{
      type: 'bar',
      data: d.map((h: any) => ({
        value: h.volDespachado,
        itemStyle: {
          color: c,
          opacity: 0.1 + (h.volDespachado / maxHora) * 0.8,
        },
      })),
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        fontWeight: 600 as const,
        color: '#374151',
        formatter: (p: any) => p.value.toLocaleString('es-CO'),
      },
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
