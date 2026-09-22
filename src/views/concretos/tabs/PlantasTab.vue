<template>
  <div>
    <div class="kpi-row">
      <KpiCard v-for="plant in data.plantas" :key="plant.planta" :label="plant.planta" :accent="colorPlanta(plant.planta, theme)" icon="building">
        {{ fmt(plant.volDespachado) }} M³
        <template #meta>{{ plant.despachos }} despachos</template>
      </KpiCard>
    </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Bombeo por Planta" :option="bombeoOpt" />
      <ChartCard title="Comparativo por Planta" :option="eficienciaOpt" />
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
import {
  colorPlanta, colorPrincipal, fmtNum, fmtM3, fmtPct, leyenda, ejeValor, ejeCategoria, paleta, tooltipEje, serieTotal,
} from '../../../utils/concretoCharts'

const props = defineProps<{ data: DashboardData }>()

function fmt(n: number) { return n?.toLocaleString('es-CO') ?? '0' }
const { theme } = useTheme()

const plantas = computed(() => props.data.plantas ?? [])

/** Con / sin bombeo por planta, con el % de bombeo en la barra y el total encima */
const bombeoOpt = computed(() => {
  const bp = props.data.bombeoPorPlanta ?? []
  const t = theme.value
  const totales = bp.map(p => p.conBombeo + p.sinBombeo)
  return markRaw({
    tooltip: tooltipEje(),
    legend: leyenda(t, { data: ['Con bombeo', 'Sin bombeo'] }),
    grid: { left: 8, right: 8, bottom: 24, top: 40, containLabel: true },
    xAxis: ejeCategoria(t, bp.map(p => p.planta), { axisLabel: { fontSize: 11, fontWeight: 'bold', color: paleta(t).texto } }),
    yAxis: ejeValor(t),
    series: [
      { name: 'Con bombeo', type: 'bar', stack: 's', barMaxWidth: 64, data: bp.map(p => +p.conBombeo.toFixed(1)),
        itemStyle: { color: colorPrincipal(t) },
        label: { show: true, position: 'inside', color: '#fff', fontSize: 10, fontWeight: 'bold',
          formatter: (x: any) => (totales[x.dataIndex] ? fmtPct(x.value / totales[x.dataIndex] * 100, 0) : '') } },
      { name: 'Sin bombeo', type: 'bar', stack: 's', data: bp.map(p => +p.sinBombeo.toFixed(1)),
        itemStyle: { color: t === 'light' ? '#cbd5e1' : '#334155', borderRadius: [3, 3, 0, 0] } },
      serieTotal(totales, t, 's'),
    ],
  })
})

/**
 * Comparativo por planta (reemplaza el radar): m³ promedio por viaje, clientes y obras,
 * cada indicador en su propio bloque para que las escalas no se mezclen.
 */
const eficienciaOpt = computed(() => {
  const ps = plantas.value
  const t = theme.value
  const metricas = [
    { nombre: 'm³ / viaje', val: (p: typeof ps[number]) => p.promDespacho, fmt: (v: number) => fmtNum(v, 1) },
    { nombre: 'Clientes', val: (p: typeof ps[number]) => p.clientesUnicos, fmt: (v: number) => fmtNum(v, 0) },
    { nombre: 'Obras', val: (p: typeof ps[number]) => p.obrasActivas, fmt: (v: number) => fmtNum(v, 0) },
  ]
  const ancho = 100 / metricas.length
  return markRaw({
    tooltip: { trigger: 'item' as const, formatter: (x: any) => `${x.seriesName}<br/><b>${x.name}</b>: ${x.data.txt}` },
    legend: leyenda(t, { data: ps.map(p => p.planta) }),
    title: metricas.map((m, i) => ({ text: m.nombre, left: `${i * ancho + ancho / 2}%`, top: 26, textAlign: 'center',
      textStyle: { fontSize: 11, fontWeight: 'bold', color: paleta(t).textoSuave } })),
    grid: metricas.map((_, i) => ({ left: `${i * ancho + 3}%`, width: `${ancho - 6}%`, top: 56, bottom: 10 })),
    xAxis: metricas.map((_, i) => ({ gridIndex: i, type: 'category' as const, data: [''], show: false })),
    yAxis: metricas.map((_, i) => ({ gridIndex: i, type: 'value' as const, show: false })),
    series: ps.flatMap(p => metricas.map((m, i) => ({
      name: p.planta, type: 'bar' as const, xAxisIndex: i, yAxisIndex: i, barMaxWidth: 30, barGap: '20%',
      itemStyle: { color: colorPlanta(p.planta, t), borderRadius: [3, 3, 0, 0] },
      data: [{ value: m.val(p), txt: m.nombre === 'm³ / viaje' ? fmtM3(m.val(p)) : m.fmt(m.val(p)) }],
      label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: paleta(t).texto, formatter: (x: any) => m.fmt(x.value) },
    }))),
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