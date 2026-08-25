<template>
  <div class="root">
    <div class="kpi-section">
      <h4 class="kpi-section-title">Producción Total</h4>
      <div class="kpi-row">
        <KpiCard label="Total M³" accent="#3B82F6" icon="chart-bar">{{ fmt(kpis.total) }}</KpiCard>
        <KpiCard v-for="l in config.lines" :key="l.key" :label="l.label" :accent="config.palette[config.lines.indexOf(l)]" icon="layers">{{ fmt(lineTotal(l.key)) }}</KpiCard>
      </div>
    </div>

    <div class="kpi-section">
      <h4 class="kpi-section-title">Meta Mensual</h4>
      <div class="kpi-row kpi-row-3">
        <KpiCard label="Meta Mensual M³" accent="#8B5CF6" icon="target">{{ fmt(kpis.metaMensual) }}</KpiCard>
        <KpiCard label="Diferencia Meta" :accent="kpis.diferenciaMeta < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpis.diferenciaMeta >= 0 ? '+' : '' }}{{ fmt(kpis.diferenciaMeta) }}</KpiCard>
        <KpiCard label="% Cumpl. Meta" accent="#06B6D4" icon="check-circle">{{ kpis.cumplimientoMeta }}</KpiCard>
      </div>
    </div>

    <div class="kpi-section">
      <h4 class="kpi-section-title">Proyectado Diario</h4>
      <div class="kpi-row kpi-row-3">
        <KpiCard label="M³ Proyectado Diarios" accent="#EC4899" icon="trending-up">{{ fmt(kpis.proyectado) }}</KpiCard>
        <KpiCard label="Diferencia Proy." :accent="kpis.diferenciaProy < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpis.diferenciaProy >= 0 ? '+' : '' }}{{ fmt(kpis.diferenciaProy) }}</KpiCard>
        <KpiCard label="% Cumpl. Proy." accent="#F59E0B" icon="check-circle">{{ kpis.cumplimientoProy }}</KpiCard>
      </div>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Meta Mensual vs Producido" description="Comparación mensual entre meta y producción real" :option="metaVsProducidoOpt" />
      <ChartCard title="M³ Proyectado Diarios vs Producción" description="Comparación mensual entre producción y proyectada diaria" :option="proyectadoOpt" />
    </div>

    <div class="section-divider"></div>

    <div class="charts-grid cols-2">
      <ChartCard title="% Cumplimiento Meta" description="Porcentaje de cumplimiento mensual de la meta" :option="cumplimientoMetaOpt" />
      <ChartCard title="% Cumplimiento Proyectado" description="Porcentaje de cumplimiento mensual del proyectado diario" :option="cumplimientoProyOpt" />
    </div>

    <div class="charts-grid cols-1">
      <ChartCard :title="`Producción por ${config.lineLabel}`" :description="`Detalle mensual por ${config.lineLabel.toLowerCase()}`" :option="lineasOpt" :height="500" />
    </div>

    <div class="charts-grid cols-1">
      <ChartCard :title="`Distribución por ${config.lineLabel}`" :description="`Participación total por ${config.lineLabel.toLowerCase()}`" :option="totalLineaOpt" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import { serialToDate } from '../../utils/dates'
import { useTheme } from '../../composables/useTheme'
import { fmt } from '../../utils/format'

export interface PlantConfig {
  plantName: string
  lineLabel: string
  lines: { key: string; label: string }[]
  palette: string[]
}

const props = defineProps<{
  config: PlantConfig
  data: Record<string, unknown>[]
}>()

const { theme } = useTheme()
const chartTextColor = computed(() => theme.value === 'light' ? '#475569' : '#94a3b8')
const labelLine = computed(() => ({
  show: true,
  formatter: (p: any) => typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value,
  fontSize: 11,
  fontWeight: 600 as const,
  color: theme.value === 'light' ? '#334155' : '#e2e8f0',
  backgroundColor: theme.value === 'light' ? 'rgba(255,255,255,.92)' : 'rgba(11,15,26,.88)',
  padding: [2, 6] as [number, number],
  borderRadius: 4,
  overflow: 'breakAll' as const,
}))
const baseGrid = { left: 60, right: 30, bottom: 60, top: 50, containLabel: true }

function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

/** Calcula la meta mensual total: un solo valor por mes (no suma filas duplicadas) */
function calcMetaMensualTotal(data: Record<string, unknown>[]): number {
  const metaByMonth = new Map<string, number>()
  for (const row of data) {
    const fecha = Number(row['Fecha'])
    if (!fecha) continue
    const key = monthLabel(serialToDate(fecha))
    const val = Number(row['Meta Mensual M³']) || 0
    if (!metaByMonth.has(key)) metaByMonth.set(key, val)
  }
  let sum = 0
  for (const v of metaByMonth.values()) sum += v
  return sum
}

/** Calcula el proyectado diario total (suma de todas las filas) */
function calcProyectadoTotal(data: Record<string, unknown>[]): number {
  return data.reduce((s, row) => s + (Number(row['M³ Proyectado']) || 0), 0)
}

const kpis = computed(() => {
  const r = props.data
  const total = r.reduce((s, row) => s + (Number(row['Total de M³']) || 0), 0)
  const proyectado = calcProyectadoTotal(r)
  const metaMensual = calcMetaMensualTotal(r)
  const diferenciaMeta = total - metaMensual
  const diferenciaProy = total - proyectado
  const cumplimientoMeta = metaMensual > 0 ? (total / metaMensual) * 100 : 0
  const cumplimientoProy = proyectado > 0 ? (total / proyectado) * 100 : 0
  return {
    total, proyectado, metaMensual,
    diferenciaMeta, diferenciaProy,
    cumplimientoMeta: cumplimientoMeta.toFixed(1) + '%',
    cumplimientoProy: cumplimientoProy.toFixed(1) + '%',
  }
})

function lineTotal(key: string): number {
  return props.data.reduce((s, row) => s + (Number(row[key]) || 0), 0)
}

const monthlyAgg = computed(() => {
  const map = new Map<string, { lineData: number[]; total: number; proy: number; metaMensual: number; first: number }>()
  for (const r of props.data) {
    const fecha = Number(r['Fecha'])
    if (!fecha) continue
    const key = monthLabel(serialToDate(fecha))
    const e = map.get(key)
    const vals = props.config.lines.map(l => Number(r[l.key]) || 0)
    if (e) {
      for (let i = 0; i < vals.length; i++) e.lineData[i] += vals[i]
      e.total += Number(r['Total de M³']) || 0
      e.proy += Number(r['M³ Proyectado']) || 0
      if (fecha < e.first) e.first = fecha
    } else {
      map.set(key, { lineData: [...vals], total: Number(r['Total de M³']) || 0, proy: Number(r['M³ Proyectado']) || 0, metaMensual: Number(r['Meta Mensual M³']) || 0, first: fecha })
    }
  }
  const sorted = [...map.entries()].sort((a, b) => a[1].first - b[1].first)
  const labels: string[] = []
  const totalArr: number[] = []
  const proyArr: number[] = []
  const metaMensualArr: number[] = []
  const diffMetaArr: number[] = []
  const diffProyArr: number[] = []
  const cumpleMetaArr: number[] = []
  const cumpleProyArr: number[] = []
  const lineData: number[][] = props.config.lines.map(() => [])
  for (const [k, v] of sorted) {
    labels.push(k)
    totalArr.push(v.total)
    proyArr.push(v.proy)
    metaMensualArr.push(v.metaMensual)
    diffMetaArr.push(v.total - v.metaMensual)
    diffProyArr.push(v.total - v.proy)
    cumpleMetaArr.push(v.metaMensual > 0 ? (v.total / v.metaMensual) * 100 : 0)
    cumpleProyArr.push(v.proy > 0 ? (v.total / v.proy) * 100 : 0)
    for (let i = 0; i < v.lineData.length; i++) lineData[i].push(v.lineData[i])
  }
  return { labels, totalArr, proyArr, metaMensualArr, diffMetaArr, diffProyArr, cumpleMetaArr, cumpleProyArr, lineData }
})

const metaVsProducidoOpt = computed(() => {
  return markRaw({
    color: ['#8B5CF6', props.config.palette[0]],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let s = `<b>${params[0].axisValue}</b><br/>`
        let meta = 0, real = 0
        params.forEach((p: any) => {
          const v = typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value
          s += `<span style="color:${p.color}">${p.seriesName}:</span> ${v} m³<br/>`
          if (p.seriesName === 'Meta Mensual M³') meta += p.value
          if (p.seriesName === 'Total M³') real += p.value
        })
        const diff = real - meta
        const diffColor = diff >= 0 ? '#10B981' : '#EF4444'
        s += `<span style="color:${diffColor}"><b>Diferencia:</b> ${diff >= 0 ? '+' : ''}${diff.toLocaleString('es-CO')} m³</span><br/>`
        if (meta > 0) {
          const pct = (real / meta * 100)
          const pctColor = pct >= 100 ? '#10B981' : '#F59E0B'
          s += `<span style="color:${pctColor}"><b>Cumplimiento:</b> ${pct.toFixed(1)}%</span>`
        }
        return s
      },
    },
    grid: baseGrid,
  xAxis: { type: 'category' as const, data: monthlyAgg.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, rotate: 45, fontSize: 11 } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  series: [
    { name: 'Meta Mensual M³', type: 'line', smooth: true, data: monthlyAgg.value.metaMensualArr, areaStyle: { opacity: 0.25 }, label: labelLine.value },
    { name: 'Total M³', type: 'line', smooth: true, data: monthlyAgg.value.totalArr, areaStyle: { opacity: 0.25 }, label: labelLine.value },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  })
})

const proyectadoOpt = computed(() => {
  return markRaw({
    color: [props.config.palette[0], props.config.palette[3]],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let s = `<b>${params[0].axisValue}</b><br/>`
        let real = 0, proy = 0
        params.forEach((p: any) => {
          const v = typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value
          s += `<span style="color:${p.color}">${p.seriesName}:</span> ${v} m³<br/>`
          if (p.seriesName === 'Total M³') real += p.value
          if (p.seriesName === 'M³ Proyectado Diarios') proy += p.value
        })
        const diff = real - proy
        const diffColor = diff >= 0 ? '#10B981' : '#EF4444'
        s += `<span style="color:${diffColor}"><b>Diferencia:</b> ${diff >= 0 ? '+' : ''}${diff.toLocaleString('es-CO')} m³</span><br/>`
        if (proy > 0) {
          const pct = (real / proy * 100)
          const pctColor = pct >= 100 ? '#10B981' : '#F59E0B'
          s += `<span style="color:${pctColor}"><b>Cumplimiento:</b> ${pct.toFixed(1)}%</span>`
        }
        return s
      },
    },
    grid: baseGrid,
  xAxis: { type: 'category' as const, data: monthlyAgg.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, rotate: 45, fontSize: 11 } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  series: [
    { name: 'Total M³', type: 'line', smooth: true, data: monthlyAgg.value.totalArr, areaStyle: { opacity: 0.25 }, label: labelLine.value },
    { name: 'M³ Proyectado Diarios', type: 'line', smooth: true, data: monthlyAgg.value.proyArr, areaStyle: { opacity: 0.25 }, label: labelLine.value },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  })
})

const cumplimientoMetaOpt = computed(() => {
  return markRaw({
    color: ['#06B6D4'],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0]
        const v = typeof p.value === 'number' ? p.value.toFixed(1) : p.value
        return `<b>${p.axisValue}</b><br/><span style="color:${p.color}">${p.seriesName}:</span> ${v}%`
      },
    },
    grid: baseGrid,
  xAxis: { type: 'category' as const, data: monthlyAgg.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, rotate: 45, fontSize: 11 } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    series: [{
      name: '% Cumpl. Meta',
      type: 'line', smooth: true, data: monthlyAgg.value.cumpleMetaArr, areaStyle: { opacity: 0.25 },
      label: { ...labelLine.value, formatter: (p: any) => p.value.toFixed(1) + '%' },
    }],
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  })
})

const cumplimientoProyOpt = computed(() => {
  return markRaw({
    color: ['#F59E0B'],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0]
        const v = typeof p.value === 'number' ? p.value.toFixed(1) : p.value
        return `<b>${p.axisValue}</b><br/><span style="color:${p.color}">${p.seriesName}:</span> ${v}%`
      },
    },
    grid: baseGrid,
  xAxis: { type: 'category' as const, data: monthlyAgg.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, rotate: 45, fontSize: 11 } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    series: [{
      name: '% Cumpl. Proy.',
      type: 'line', smooth: true, data: monthlyAgg.value.cumpleProyArr, areaStyle: { opacity: 0.25 },
      label: { ...labelLine.value, formatter: (p: any) => p.value.toFixed(1) + '%' },
    }],
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  })
})

const lineasOpt = computed(() => {
  const m = monthlyAgg.value
  const series = props.config.lines.map((l, i) => ({
    name: l.label,
    type: 'line' as const,
    smooth: true,
    data: m.lineData[i],
    areaStyle: { opacity: 0.25 },
    label: labelLine.value,
  }))
  return markRaw({
    color: props.config.palette,
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let s = `<b>${params[0].axisValue}</b><br/>`
        params.forEach((p: any) => {
          const v = typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value
          s += `<span style="color:${p.color}">${p.seriesName}:</span> ${v} m³<br/>`
        })
        const sum = params.reduce((a: number, p: any) => a + (typeof p.value === 'number' ? p.value : 0), 0)
        s += `<b>Total:</b> ${sum.toLocaleString('es-CO')} m³`
        return s
      },
    },
    grid: baseGrid,
  xAxis: { type: 'category' as const, data: m.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, rotate: 45, fontSize: 11 } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    series,
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  })
})

const totalLineaOpt = computed(() => {
  const totals = props.config.lines.map(l => lineTotal(l.key))
  const data = props.config.lines.map((l, i) => ({ name: l.label, value: totals[i] }))
  return markRaw({
    color: props.config.palette,
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => {
        const v = typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value
        return `${p.name}: ${v} m³ (${p.percent}%)`
      },
    },
    legend: { type: 'scroll' as const, orient: 'vertical' as const, right: 10, top: 10, textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 } },
    graphic: [],
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['38%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: theme.value === 'light' ? '#fff' : '#1e293b', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => p.percent + '%', fontSize: 10 },
      data,
    }],
  })
})
</script>

<style scoped>
.kpi-section { margin-bottom: 16px; }
.kpi-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 2px;
}
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.kpi-row-3 { grid-template-columns: repeat(3, 1fr); }
.charts-grid { display: grid; gap: 22px; margin-top: 16px; min-width: 0; }
.charts-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.charts-grid.cols-1 { grid-template-columns: 1fr; }
.charts-grid > * { min-width: 0; }
.kpi-row > * { min-width: 0; }
.root { min-width: 0; }
.section-divider { height: 1px; background: var(--card-border); margin: 24px 0; opacity: 0.5; }
@media (max-width: 1200px) {
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
  .kpi-row-3 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
  .kpi-row-3 { grid-template-columns: repeat(3, 1fr); }
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .kpi-row-3 { grid-template-columns: repeat(2, 1fr); }
}
</style>
