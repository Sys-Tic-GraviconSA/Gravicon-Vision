<template>
  <div class="prod-graficas">
    <div v-if="!dias.length" class="vacio">No hay registros de producción en el rango seleccionado.</div>

    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Cumplimiento por mes</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Meta Mensual vs. Producido" description="Barra gris: meta del mes · barra azul: producido; encima, el % de cumplimiento" :option="optMeta" :height="320" />
        <ChartCard title="Proyectado Diario vs. Producido" description="Suma del proyectado diario del mes frente a lo producido; encima, el % de cumplimiento" :option="optProyectado" :height="320" />
      </div>
      <div class="charts-grid cols-1">
        <ChartCard title="% de Cumplimiento por Mes" description="Cumplimiento de la meta mensual y del proyectado diario; la línea punteada es el 100%" :option="optCumplimiento" :height="300" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Producción por {{ config.lineLabel.toLowerCase() }}</h3>
      <div class="charts-grid cols-2">
        <ChartCard :title="`Producción Mensual por ${config.lineLabel}`" :description="`m³ de cada ${config.lineLabel.toLowerCase()} por mes, barras lado a lado`" :option="optLineasMes" :height="340" />
        <ChartCard :title="`Participación por ${config.lineLabel}`" :description="`Aporte de cada ${config.lineLabel.toLowerCase()} al total producido del período`" :option="optParticipacion" :height="340" />
      </div>

      <template v-if="dias.length > 1">
        <h3 class="section-title"><span class="title-bar"></span>Tendencia diaria</h3>
        <div class="charts-grid cols-1">
          <ChartCard title="Producción Diaria vs. Proyectado" :description="`m³ por día: verde si alcanzó el proyectado del día, azul si quedó por debajo · línea: proyectado diario · punteada: promedio de ${m3Lbl(promedio)} m³`" :option="optDiaria" :height="360" />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumenTab.vue — Gráficas de producción de una planta de agregados (/:planta/produccion/graficas).
 * Mismo estilo de Facturación, Concretos y Mantenimiento (useEstiloGraficas): KPIs con desglose,
 * títulos de sección, barras lado a lado con los valores encima y tooltips con puntos de color.
 * Recibe las filas diarias ya filtradas por el filtro de fechas de AgregadosProduccionView.
 */
import { computed } from 'vue'
import { use } from 'echarts/core'
import { LabelLayout } from 'echarts/features'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import { serialToDate } from '../../utils/dates'
import { donaCentro } from '../../utils/chartLayout'
import {
  MESES_CORTOS, AZUL, FONT, fmtN, pct, punto, m3Lbl, vacio, emphasis, useEstiloGraficas,
} from '../../composables/useGraficasConcreto'

// LabelLayout oculta las etiquetas que se montan cuando hay muchos días
use([LabelLayout])

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

const { isLight, chartTextColor, tinta, labelPill, labelDentro, base, leyenda, ejeX, ejeY, zoom, movil } = useEstiloGraficas()
const VERDE = '#16A34A', AMBAR = '#F59E0B', ROJO = '#DC2626'
const C_META = '#8B5CF6', C_PROY = '#EC4899'
const gris = computed(() => (isLight.value ? '#cbd5e1' : '#334155'))
const colorLinea = (i: number) => props.config.palette[i % props.config.palette.length]
const sg = (n: number) => (n > 0 ? '+' : '') + fmtN(n, 0)
const colorCump = (c: number) => (c >= 100 ? VERDE : c >= 80 ? AMBAR : ROJO)

// ---------------------------------------------------------------- Datos por día y por mes
interface Dia { serial: number; fecha: Date; total: number; proy: number; lineas: number[] }
interface Mes { key: string; label: string; total: number; proy: number; meta: number; lineas: number[]; dias: number }

const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const etiquetaMes = (d: Date) => `${MESES_CORTOS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`
const etiquetaDia = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const fechaLarga = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const dias = computed<Dia[]>(() => props.data
  .filter(r => Number(r['Fecha']))
  .map(r => {
    const serial = Number(r['Fecha'])
    return {
      serial, fecha: serialToDate(serial),
      total: Number(r['Total de M³']) || 0,
      proy: Number(r['M³ Proyectado']) || 0,
      lineas: props.config.lines.map(l => Number(r[l.key]) || 0),
    }
  })
  .sort((a, b) => a.serial - b.serial))

// La meta mensual se repite en cada fila del mes: se toma una sola vez por mes (misma regla del informe)
const meses = computed<Mes[]>(() => {
  const map = new Map<string, Mes>()
  for (const r of props.data) {
    const serial = Number(r['Fecha'])
    if (!serial) continue
    const d = serialToDate(serial)
    const key = claveMes(d)
    let m = map.get(key)
    if (!m) {
      m = { key, label: etiquetaMes(d), total: 0, proy: 0, meta: Number(r['Meta Mensual M³']) || 0, lineas: props.config.lines.map(() => 0), dias: 0 }
      map.set(key, m)
    }
    m.total += Number(r['Total de M³']) || 0
    m.proy += Number(r['M³ Proyectado']) || 0
    m.dias++
    props.config.lines.forEach((l, i) => { m!.lineas[i] += Number(r[l.key]) || 0 })
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
})

const T = computed(() => {
  const total = dias.value.reduce((a, d) => a + d.total, 0)
  const proy = dias.value.reduce((a, d) => a + d.proy, 0)
  const meta = meses.value.reduce((a, m) => a + m.meta, 0)
  const lineas = props.config.lines.map((_, i) => dias.value.reduce((a, d) => a + d.lineas[i], 0))
  return {
    total, proy, meta, lineas,
    cumpMeta: meta > 0 ? total / meta * 100 : 0,
    cumpProy: proy > 0 ? total / proy * 100 : 0,
    conProduccion: dias.value.filter(d => d.total > 0).length,
  }
})
const promedio = computed(() => (dias.value.length ? T.value.total / dias.value.length : 0))
const mejorDia = computed(() => dias.value.reduce<Dia | null>((m, d) => (!m || d.total > m.total ? d : m), null))

// ---------------------------------------------------------------- KPIs
const fila = (color: string, label: string, valor: string) =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-label-int' style='color:${color}'>${label}</span> <strong>${valor}</strong></div>`

const kpis = computed(() => {
  const t = T.value
  const detLineas = props.config.lines.map((l, i) =>
    fila(colorLinea(i), l.label, `${fmtN(t.lineas[i], 0)} m³ <span style='color:var(--text-tertiary)'>(${pct(t.total ? t.lineas[i] / t.total * 100 : 0)})</span>`)).join('')
  const md = mejorDia.value
  return [
    { label: 'Total Producido', value: `${fmtN(t.total, 0)} m³`, icon: 'chart-bar', accent: AZUL, detail: detLineas },
    { label: 'Promedio Diario', value: `${fmtN(promedio.value, 0)} m³`, icon: 'activity', accent: '#0EA5E9',
      detail: fila('#0EA5E9', 'Días registrados', fmtN(dias.value.length, 0)) + fila('#0EA5E9', 'Con producción', fmtN(t.conProduccion, 0)) +
        (md ? fila(tinta.value, 'Mejor día', `${fmtN(md.total, 0)} m³ (${etiquetaDia(md.fecha)})`) : '') },
    { label: 'Cumplimiento Meta', value: t.meta ? pct(t.cumpMeta) : '—', icon: 'target', accent: C_META,
      detail: fila(C_META, 'Meta mensual', `${fmtN(t.meta, 0)} m³`) + fila(t.total - t.meta >= 0 ? VERDE : ROJO, 'Diferencia', `${sg(t.total - t.meta)} m³`) },
    { label: 'Cumplimiento Proyectado', value: t.proy ? pct(t.cumpProy) : '—', icon: 'trending-up', accent: C_PROY,
      detail: fila(C_PROY, 'Proyectado', `${fmtN(t.proy, 0)} m³`) + fila(t.total - t.proy >= 0 ? VERDE : ROJO, 'Diferencia', `${sg(t.total - t.proy)} m³`) },
  ]
})

// ---------------------------------------------------------------- Cumplimiento por mes
/** Barras de referencia (gris) frente a lo producido (azul) con el % de cumplimiento encima */
function opcionVsProducido(nombreRef: string, ref: (m: Mes) => number) {
  const ms = meses.value
  const cump = (m: Mes) => (ref(m) > 0 ? m.total / ref(m) * 100 : 0)
  const z = zoom(ms.length)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const m = ms[ps[0].dataIndex]
        return `<b>${m.label}</b><br/>${punto(gris.value)} ${nombreRef}: <b>${fmtN(ref(m), 0)} m³</b><br/>${punto(AZUL)} Producido: <b>${fmtN(m.total, 0)} m³</b><br/>` +
          `${punto(m.total - ref(m) >= 0 ? VERDE : ROJO)} Diferencia: <b>${sg(m.total - ref(m))} m³</b>` +
          (ref(m) > 0 ? `<br/>${punto(colorCump(cump(m)))} Cumplimiento: <b>${pct(cump(m))}</b>` : '') } },
    legend: leyenda([{ name: nombreRef, itemStyle: { color: gris.value } }, { name: 'Producido', itemStyle: { color: AZUL } }]),
    grid: { left: 12, right: 20, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(ms.map(m => m.label)),
    yAxis: ejeY(),
    series: [
      { name: nombreRef, type: 'bar' as const, barMaxWidth: 28, emphasis, data: ms.map(m => Math.round(ref(m))),
        // Sin etiqueta: la barra producida suele medir casi lo mismo y el valor chocaría con el %; va en el tooltip
        itemStyle: { color: gris.value, borderRadius: [4, 4, 0, 0] } },
      { name: 'Producido', type: 'bar' as const, barMaxWidth: 28, emphasis, data: ms.map(m => Math.round(m.total)),
        itemStyle: { color: AZUL, borderRadius: [4, 4, 0, 0] },
        label: { ...labelPill.value, position: 'top' as const, formatter: (x: any) => { const m = ms[x.dataIndex]; return ref(m) > 0 ? pct(cump(m), 0) : m3Lbl(x.value) } } },
    ],
  }, ms.length > 0)
}
const optMeta = computed(() => opcionVsProducido('Meta mensual', m => m.meta))
const optProyectado = computed(() => opcionVsProducido('Proyectado', m => m.proy))

const optCumplimiento = computed(() => {
  const ms = meses.value
  const cMeta = ms.map(m => (m.meta > 0 ? +(m.total / m.meta * 100).toFixed(1) : null))
  const cProy = ms.map(m => (m.proy > 0 ? +(m.total / m.proy * 100).toFixed(1) : null))
  const z = zoom(ms.length)
  const serie = (name: string, color: string, data: (number | null)[], conLinea: boolean) => ({
    name, type: 'bar' as const, barMaxWidth: 24, barGap: '15%', emphasis, data,
    itemStyle: { color, borderRadius: [4, 4, 0, 0] },
    label: { ...labelPill.value, position: 'top' as const, formatter: (x: any) => (x.value == null ? '' : pct(x.value, 0)) },
    ...(conLinea ? { markLine: { silent: true, symbol: 'none', lineStyle: { color: VERDE, type: 'dashed' as const, width: 1.5 },
      label: { show: true, position: 'insideEndTop' as const, formatter: '100%', color: VERDE, fontFamily: FONT, fontSize: 10, fontWeight: 600 }, data: [{ yAxis: 100 }] } } : {}),
  })
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const i = ps[0].dataIndex, m = ms[i]
        return `<b>${m.label}</b><br/>` +
          (cMeta[i] != null ? `${punto(C_META)} Meta: <b>${pct(cMeta[i]!)}</b> <span style="color:#94a3b8;font-size:10px">${fmtN(m.total, 0)} de ${fmtN(m.meta, 0)} m³</span><br/>` : '') +
          (cProy[i] != null ? `${punto(C_PROY)} Proyectado: <b>${pct(cProy[i]!)}</b> <span style="color:#94a3b8;font-size:10px">${fmtN(m.total, 0)} de ${fmtN(m.proy, 0)} m³</span>` : '') } },
    legend: leyenda([{ name: 'Cumplimiento meta', itemStyle: { color: C_META } }, { name: 'Cumplimiento proyectado', itemStyle: { color: C_PROY } }]),
    grid: { left: 12, right: 20, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(ms.map(m => m.label)),
    yAxis: ejeY({ max: (v: { max: number }) => Math.max(120, Math.ceil(v.max * 1.15)) }),
    series: [serie('Cumplimiento meta', C_META, cMeta, true), serie('Cumplimiento proyectado', C_PROY, cProy, false)],
  }, ms.length > 0)
})

// ---------------------------------------------------------------- Producción por línea
const optLineasMes = computed(() => {
  const ms = meses.value
  const ls = props.config.lines
  const z = zoom(ms.length)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const m = ms[ps[0].dataIndex]
        return `<b>${m.label}</b><br/>` + ls.map((l, i) => `${punto(colorLinea(i))} ${l.label}: <b>${fmtN(m.lineas[i], 0)} m³</b> <span style="color:#94a3b8;font-size:10px">${pct(m.total ? m.lineas[i] / m.total * 100 : 0)}</span>`).join('<br/>') +
          `<br/>${punto(tinta.value)} Total: <b>${fmtN(m.total, 0)} m³</b>` } },
    legend: leyenda(ls.map((l, i) => ({ name: l.label, itemStyle: { color: colorLinea(i) } }))),
    grid: { left: 12, right: 20, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(ms.map(m => m.label)),
    yAxis: ejeY(),
    series: ls.map((l, i) => ({
      name: l.label, type: 'bar' as const, barMaxWidth: 22, barGap: '15%', emphasis,
      data: ms.map(m => Math.round(m.lineas[i])),
      itemStyle: { color: colorLinea(i), borderRadius: [4, 4, 0, 0] },
      // Valor vertical dentro de la barra: encima chocaría con las barras vecinas del mismo mes
      label: { ...labelDentro, position: 'insideBottom' as const, rotate: 90, align: 'left' as const, verticalAlign: 'middle' as const, distance: 6,
        formatter: (x: any) => (x.value ? m3Lbl(x.value) : '') },
      labelLayout: { hideOverlap: true },
    })),
  }, ms.length > 0)
})

const optParticipacion = computed(() => {
  const t = T.value
  const datos = props.config.lines.map((l, i) => ({ name: l.label, value: Math.round(t.lineas[i]), color: colorLinea(i) })).filter(d => d.value > 0)
  const centro = movil.value ? ['50%', '42%'] : ['38%', '55%']
  return vacio({
    ...base(),
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${punto(p.color)} <b>${p.name}</b><br/>${fmtN(p.value, 0)} m³ (${pct(p.percent)})` },
    legend: {
      ...(movil.value ? { type: 'scroll' as const, orient: 'horizontal' as const, left: 'center', bottom: 0 } : { orient: 'vertical' as const, right: 10, top: 'middle' }),
      data: datos.map(d => d.name),
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 12,
      textStyle: { fontFamily: FONT, fontWeight: 500 as const, color: chartTextColor.value, fontSize: 11 },
      formatter: (n: string) => { const d = datos.find(x => x.name === n); return d ? `${n}  ${m3Lbl(d.value)} m³` : n },
    },
    series: [donaCentro({
      center: centro, radio: movil.value ? '38%' : '42%', valor: m3Lbl(t.total), sub: 'm³ producidos', font: FONT,
      color: isLight.value ? '#0f172a' : '#f1f5f9', colorSub: chartTextColor.value,
    }), {
      type: 'pie', radius: movil.value ? ['38%', '60%'] : ['42%', '68%'], center: centro,
      itemStyle: { borderRadius: 2, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      // % dentro del anillo: por fuera chocaba con la leyenda cuando la tarjeta es angosta
      label: { show: true, position: 'inside' as const, formatter: (p: any) => (p.percent >= 4 ? pct(p.percent, 0) : ''), fontSize: 11, fontWeight: 700, fontFamily: FONT, color: '#fff' },
      labelLine: { show: false },
      data: datos.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }],
  }, datos.length > 0)
})

// ---------------------------------------------------------------- Tendencia diaria
const optDiaria = computed(() => {
  const ds = dias.value
  const ls = props.config.lines
  const z = zoom(ds.length)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const d = ds[ps[0].dataIndex]
        return `<b>${fechaLarga(d.fecha)}</b><br/>` +
          ls.map((l, i) => `${punto(colorLinea(i))} ${l.label}: <b>${fmtN(d.lineas[i], 0)} m³</b>`).join('<br/>') +
          `<br/>${punto(tinta.value)} Total: <b>${fmtN(d.total, 0)} m³</b><br/>${punto(C_PROY)} Proyectado: <b>${fmtN(d.proy, 0)} m³</b>` +
          (d.proy > 0 ? `<br/>${punto(d.total >= d.proy ? VERDE : ROJO)} Diferencia: <b>${sg(d.total - d.proy)} m³</b> (${pct(d.total / d.proy * 100)})` : '') } },
    legend: leyenda([{ name: 'Alcanzó el proyectado', itemStyle: { color: VERDE } }, { name: 'Por debajo', itemStyle: { color: AZUL } }, { name: 'Proyectado', itemStyle: { color: C_PROY } }]),
    grid: { left: 12, right: movil.value ? 20 : 70, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(ds.map(d => etiquetaDia(d.fecha))),
    yAxis: ejeY(),
    series: [
      { name: 'Por debajo', type: 'bar' as const, barMaxWidth: 30, emphasis,
        data: ds.map(d => ({ value: Math.round(d.total), itemStyle: { color: d.proy > 0 ? (d.total >= d.proy ? VERDE : AZUL) : AZUL, borderRadius: [4, 4, 0, 0] } })),
        label: { ...labelPill.value, position: 'top' as const, formatter: (x: any) => (x.value ? m3Lbl(x.value) : '') },
        labelLayout: { hideOverlap: true },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tinta.value, type: 'dashed' as const, width: 1.2, opacity: 0.6 },
          label: { show: !movil.value, position: 'end' as const, formatter: `Prom. ${m3Lbl(promedio.value)}`, color: chartTextColor.value, fontFamily: FONT, fontSize: 10, fontWeight: 600 },
          data: [{ yAxis: Math.round(promedio.value) }] } },
      { name: 'Proyectado', type: 'line' as const, step: 'middle' as const, symbol: 'none', data: ds.map(d => Math.round(d.proy)),
        lineStyle: { color: C_PROY, width: 1.5 }, itemStyle: { color: C_PROY }, tooltip: { show: false } },
      // Serie vacía solo para la leyenda del color verde (las barras se colorean día a día)
      { name: 'Alcanzó el proyectado', type: 'line' as const, data: [], itemStyle: { color: VERDE }, tooltip: { show: false } },
    ],
  }, ds.length > 0)
})
</script>

<style scoped>
.prod-graficas { display: flex; flex-direction: column; min-width: 0; }
.vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }
.periodo { margin: 0 0 14px; font-size: 13px; color: var(--text-secondary); }
.periodo strong { color: var(--text-primary); }
.kpi-row { margin-bottom: 4px; }
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 0; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.charts-grid { margin-top: 16px; }
.charts-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 768px) {
  .section-title { font-size: 15px; margin-top: 22px; }
  .charts-grid { margin-top: 12px; gap: 12px; }
}
</style>
