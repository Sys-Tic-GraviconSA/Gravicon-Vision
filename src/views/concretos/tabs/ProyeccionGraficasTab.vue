<template>
  <div class="graficas-tab">
    <div class="gt-bar">
      <div class="gt-info">
        <span class="gt-tag">Proyección comercial · {{ mesLbl }}</span>
        <span class="gt-periodo">Meta vs. ejecutado al día {{ dia }} de {{ ultDia }} — avance del mes {{ pct(avance, 0) }}</span>
        <span class="gt-sub">La proyección de cada planta es el total de la proyección de sus clientes (la misma fuente del informe). El avance diario y la proyección al cierre salen de las remisiones de concreto.</span>
      </div>
      <label class="gt-mes">
        Mes
        <select v-model="mesSel">
          <option v-for="m in mesesDisponibles" :key="m" :value="m">{{ etiquetaMes(m) }}</option>
        </select>
      </label>
    </div>

    <div v-if="clientesStore.loading && !proyecciones.length" class="gt-vacio">Cargando proyecciones…</div>
    <div v-else-if="clientesStore.error" class="gt-vacio">No se pudieron cargar las proyecciones: {{ clientesStore.error }}</div>
    <div v-else-if="!filasMes.length" class="gt-vacio">No hay proyección de clientes para {{ mesLbl }}.</div>

    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :detail="k.detail" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Cumplimiento del mes</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Meta vs. Ejecutado por Planta" description="Barra gris: meta · barra de color: ejecutado (% de cumplimiento) · raya: lo esperado a la fecha" :option="optMetaPlanta" :height="340" />
        <ChartCard title="Avance Acumulado del Mes" description="m³ de concreto acumulados día a día, meta lineal y proyección al cierre al ritmo actual" :option="optAvance" :height="340" />
      </div>
      <div class="charts-grid cols-1">
        <ChartCard title="Despacho Diario vs. Meta Diaria" :description="`m³ de concreto por día, apilado por planta · línea: meta diaria de ${fmtN(metaDiaria, 0)} m³ (total de la proyección de clientes ÷ ${diasOpMes} días operativos)`" :option="optDiario" :height="340" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Clientes proyectados</h3>
      <p class="section-sub">
        Semáforo según el cumplimiento frente al avance del mes: verde ≥ 90% del ritmo, ámbar ≥ 70%, rojo por debajo. «Calle» agrupa los clientes sin proyección.
      </p>
      <div class="charts-grid cols-2">
        <ChartCard title="Estado de los Clientes Proyectados" description="Cuántos clientes van cumplidos, al ritmo, atrasados o sin despacho" :option="optSemaforo" :height="340" />
        <ChartCard title="Origen del Volumen por Planta" description="Ejecutado de clientes proyectados frente a clientes de calle (sin proyección)" :option="optOrigen" :height="340" />
        <ChartCard :title="`Cumplimiento por Cliente — Top ${TOP} por meta`" description="Barra gris: meta · barra de color: ejecutado con el color del semáforo" :option="optClientes" :expand-option="optClientesTodos" :height="420" />
        <ChartCard title="Desviación frente al Ritmo" description="Ejecutado − esperado a la fecha: los más atrasados (rojo) y los más adelantados (verde)" :option="optDesviacion" :height="420" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Histórico {{ anio }}</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Meta vs. Ejecutado por Mes" description="Total de las plantas; encima, el % de cumplimiento" :option="optHistorico" :height="320" />
        <ChartCard title="Cumplimiento por Planta y Mes" description="% de la meta cumplido en cada mes; la línea punteada es el 100%" :option="optHistoricoPlanta" :height="320" />
      </div>
    </template>
  </div>
</template>

/**
 * ProyeccionGraficasTab.vue — Gráficas de la Proyección Comercial de Concretos.
 * Meta y ejecutado salen de proyecciones_clientes (tipo «Proyectado»), con las mismas reglas de la
 * pestaña de informe ProyeccionTab; el avance diario y la proyección al cierre salen de order_price
 * (concreto, sin agregados). Mismo estilo de Producción y Mantenimiento (useGraficasConcreto).
 */
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import { useClientesStore } from '../../../stores'
import { serialToDate } from '../../../utils/dates'
import { esAgregado } from '../../../utils/agregadosConcreto'
import {
  MESES, MESES_CORTOS, COLOR_PLANTA, COLOR_EXTRA, AZUL, fmtN, pct, num, nombrePlanta, titulo, ordenarPlantas,
  punto, m3Lbl, vacio, emphasis, useEstiloGraficas,
} from '../../../composables/useGraficasConcreto'
import { use } from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { LabelLayout } from 'echarts/features'

// Scatter pinta la raya de «esperado»; LabelLayout separa las etiquetas finales de las líneas
use([ScatterChart, LabelLayout])

const props = defineProps<{
  /** Filas de order_price filtradas por planta/comercial (todas las fechas) */
  rows: Record<string, unknown>[]
  /** Fecha fin del filtro global (YYYY-MM-DD): define el mes y el día de corte */
  corte?: string
  /** Plantas marcadas en el filtro global (null = todas) */
  plantasFiltro?: string[] | null
}>()

const TOP = 10
const VERDE = '#16A34A', AMBAR = '#F59E0B', ROJO = '#DC2626'
const { isLight, chartTextColor, labelPill, labelDentro, base, leyenda, ejeX, ejeY, barrasH } = useEstiloGraficas()
const gris = computed(() => (isLight.value ? '#cbd5e1' : '#334155'))
const tinta = computed(() => (isLight.value ? '#0f172a' : '#f1f5f9'))

function color(p: string): string { return COLOR_PLANTA[p] ?? COLOR_EXTRA[0] }
function sg(n: number): string { return (n > 0 ? '+' : '') + fmtN(n) }
function norm(s: unknown): string { return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') }
function ultimoDiaMes(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate() }
function etiquetaMes(m: string): string { return `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` }
// Semáforo del informe: cumplimiento comparado con el avance del mes
function semaforo(cump: number, av: number): string { const r = av ? cump / av * 100 : 0; return r >= 90 ? VERDE : r >= 70 ? AMBAR : ROJO }

// ---------------------------------------------------------------- Datos
const clientesStore = useClientesStore()
onMounted(() => { if (!clientesStore.data && !clientesStore.loading) clientesStore.fetchData() })

interface Proy { mes: string; planta: string; cliente: string; obra: string; tipo: string; meta: number; real: number }
const proyecciones = computed<Proy[]>(() => {
  const filtro = props.plantasFiltro ? new Set(props.plantasFiltro.map(nombrePlanta)) : null
  return (clientesStore.allRows as Record<string, unknown>[])
    .map(r => ({
      mes: String(r.fecha ?? '').slice(0, 7), planta: nombrePlanta(r.planta), cliente: String(r.nombre_cliente ?? '').trim(),
      obra: String(r.obra ?? '').trim(), tipo: String(r.tipo ?? ''), meta: num(r.m3_proyectado), real: num(r.cantidad_m3),
    }))
    .filter(r => r.mes && (!filtro || filtro.has(r.planta)))
})
// Fila genérica «CLIENTE / CALLE» dentro de lo proyectado (misma regla del informe)
const esCalle = (r: Proy) => norm(r.cliente) === 'CLIENTE' && norm(r.obra) === 'CALLE'

// Remisiones de concreto (sin agregados) para el avance diario
interface Rem { iso: string; planta: string; m3: number }
const remisiones = computed<Rem[]>(() => props.rows
  .filter(r => typeof r['Fecha'] === 'number' && r['Fecha'] && !esAgregado(r['Mezcla'], r['Cliente'], r['Planta']))
  .map(r => ({ iso: serialToDate(r['Fecha'] as number).toISOString().slice(0, 10), planta: nombrePlanta(r['Planta']), m3: num(r['Cant. Concreto']) })))

// ---------------------------------------------------------------- Mes y corte
const mesesDisponibles = computed(() => [...new Set(proyecciones.value.filter(r => r.tipo === 'Proyectado').map(r => r.mes))].sort().reverse())
const mesSel = ref('')
watch([() => props.corte, mesesDisponibles], () => {
  const deCorte = (props.corte || '').slice(0, 7)
  if (!mesSel.value || !mesesDisponibles.value.includes(mesSel.value)) {
    mesSel.value = mesesDisponibles.value.includes(deCorte) ? deCorte : mesesDisponibles.value[0] ?? deCorte
  }
}, { immediate: true })
watch(() => props.corte, c => { const m = (c || '').slice(0, 7); if (mesesDisponibles.value.includes(m)) mesSel.value = m })

const anio = computed(() => Number(mesSel.value.slice(0, 4)))
const mes = computed(() => Number(mesSel.value.slice(5, 7)))
const ultDia = computed(() => (mesSel.value ? ultimoDiaMes(anio.value, mes.value) : 30))
// Día de corte: el del filtro si es este mes; el último día con remisiones si el mes va en curso; el mes completo si ya pasó
const dia = computed(() => {
  if (props.corte && props.corte.startsWith(mesSel.value)) return Number(props.corte.slice(8, 10))
  const ult = remisiones.value.filter(r => r.iso.startsWith(mesSel.value)).reduce((a, r) => (r.iso > a ? r.iso : a), '')
  const hoy = new Date().toISOString().slice(0, 7)
  return mesSel.value === hoy && ult ? Number(ult.slice(8, 10)) : ultDia.value
})
const avance = computed(() => (ultDia.value ? dia.value / ultDia.value * 100 : 0))
const mesLbl = computed(() => (mesSel.value ? etiquetaMes(mesSel.value) : ''))
const esDomingo = (d: number) => new Date(Date.UTC(anio.value, mes.value - 1, d)).getUTCDay() === 0
const diasOpMes = computed(() => { let n = 0; for (let d = 1; d <= ultDia.value; d++) if (!esDomingo(d)) n++; return n })
const habRest = computed(() => { let n = 0; for (let d = dia.value + 1; d <= ultDia.value; d++) if (!esDomingo(d)) n++; return n })

// ---------------------------------------------------------------- Meta vs. ejecutado
const filasMes = computed(() => proyecciones.value.filter(r => r.mes === mesSel.value))
const plantas = computed(() => ordenarPlantas(new Set(filasMes.value.filter(r => r.tipo === 'Proyectado').map(r => r.planta))))

interface Cli { planta: string; cliente: string; obra: string; meta: number; real: number; cump: number; esperado: number; desv: number }
function resumenPlanta(p: string, filas: Proy[], av: number) {
  const proy = filas.filter(r => r.planta === p && r.tipo === 'Proyectado')
  const meta = proy.reduce((a, r) => a + r.meta, 0), real = proy.reduce((a, r) => a + r.real, 0)
  const esperado = meta * av / 100, falta = Math.max(meta - real, 0)
  const clientes: Cli[] = proy.filter(r => !esCalle(r)).map(r => ({
    planta: p, cliente: titulo(r.cliente), obra: titulo(r.obra), meta: r.meta, real: r.real,
    cump: r.meta ? r.real / r.meta * 100 : 0, esperado: r.meta * av / 100, desv: r.real - r.meta * av / 100,
  }))
  const calleProy = proy.filter(esCalle).reduce((a, r) => a + r.real, 0)
  const calleDet = filas.filter(r => r.planta === p && r.tipo === 'Cliente de Calle')
  return {
    meta, real, esperado, falta, cump: meta ? real / meta * 100 : 0, desv: real - esperado,
    diario: habRest.value ? falta / habRest.value : 0, clientes,
    realClientes: clientes.reduce((a, c) => a + c.real, 0), realCalle: calleProy || calleDet.reduce((a, r) => a + r.real, 0), nCalle: calleDet.length,
  }
}
const P = computed(() => Object.fromEntries(plantas.value.map(p => [p, resumenPlanta(p, filasMes.value, avance.value)])) as Record<string, ReturnType<typeof resumenPlanta>>)
const T = computed(() => {
  const s = (k: 'meta' | 'real' | 'esperado' | 'desv' | 'falta') => plantas.value.reduce((a, p) => a + P.value[p][k], 0)
  const meta = s('meta'), real = s('real'), falta = s('falta')
  return { meta, real, esperado: s('esperado'), desv: s('desv'), falta, cump: meta ? real / meta * 100 : 0, diario: habRest.value ? falta / habRest.value : 0 }
})
const clientes = computed(() => plantas.value.flatMap(p => P.value[p].clientes))

// ---------------------------------------------------------------- KPIs (los mismos del informe, con desglose por planta)
function detalle(valor: (p: string) => string): string {
  return plantas.value.map(p =>
    `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p)}'></span>` +
    `<span class='kpi-label-int' style='color:${color(p)}'>${p}</span> <strong>${valor(p)}</strong></div>`).join('')
}
const nota = (t: string) => `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>${t}</div>`
const kpis = computed(() => {
  const t = T.value, pp = P.value
  const conDesp = clientes.value.filter(c => c.real > 0).length
  return [
    { label: 'Meta del Mes', value: fmtN(t.meta, 0) + ' m³', icon: 'target', accent: '#1D4ED8', detail: detalle(p => fmtN(pp[p].meta, 0) + ' m³') + nota('Total de la proyección de clientes') },
    { label: 'Ejecutado', value: fmtN(t.real) + ' m³', icon: 'package', accent: '#10B981', detail: detalle(p => fmtN(pp[p].real) + ' m³') + nota(`Al ${dia.value} de ${MESES[mes.value - 1]}`) },
    { label: 'Cumplimiento', value: pct(t.cump), icon: 'check-circle', accent: semaforo(t.cump, avance.value),
      detail: detalle(p => pct(pp[p].cump)) + nota(`Avance del mes ${pct(avance.value, 0)}`) },
    { label: 'Esperado a la Fecha', value: fmtN(t.esperado, 0) + ' m³', icon: 'clock', accent: '#64748B', detail: detalle(p => fmtN(pp[p].esperado, 0) + ' m³') + nota(`Meta × ${dia.value}/${ultDia.value}`) },
    { label: 'Desviación vs. Ritmo', value: sg(t.desv) + ' m³', icon: 'activity', accent: t.desv >= 0 ? VERDE : ROJO, detail: detalle(p => sg(pp[p].desv) + ' m³') + nota('Ejecutado − esperado') },
    { label: 'Faltante para la Meta', value: fmtN(t.falta) + ' m³', icon: 'trending-up', accent: ROJO, detail: detalle(p => fmtN(pp[p].falta) + ' m³') + nota(`${ultDia.value - dia.value} días restantes`) },
    { label: 'm³/día Necesarios', value: fmtN(t.diario) + ' m³', icon: 'zap', accent: AMBAR, detail: detalle(p => fmtN(pp[p].diario) + ' m³') + nota(`${habRest.value} días hábiles restantes`) },
    { label: 'Clientes con Despacho', value: `${conDesp} de ${clientes.value.length}`, icon: 'users', accent: '#8B5CF6',
      detail: detalle(p => `${pp[p].clientes.filter(c => c.real > 0).length} de ${pp[p].clientes.length}`) + nota('Clientes proyectados') },
  ]
})

// ---------------------------------------------------------------- Gráficas: cumplimiento del mes
const optMetaPlanta = computed(() => {
  const lista = plantas.value.map(p => ({ planta: p, ...P.value[p] }))
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const x = lista[params[0].dataIndex]
        return `<b>${x.planta} — ${mesLbl.value}</b><br/>${punto(gris.value)} Meta: <b>${fmtN(x.meta, 0)} m³</b><br/>` +
          `${punto(color(x.planta))} Ejecutado: <b>${fmtN(x.real)} m³</b> (${pct(x.cump)})<br/>` +
          `${punto(tinta.value)} Esperado al día ${dia.value}: <b>${fmtN(x.esperado, 0)} m³</b><br/>` +
          `${punto(semaforo(x.cump, avance.value))} Faltan: <b>${fmtN(x.falta, 0)} m³</b> · ${fmtN(x.diario)} m³/día`
      },
    },
    legend: leyenda([{ name: 'Meta', itemStyle: { color: gris.value } }, { name: 'Ejecutado', itemStyle: { color: AZUL } }]),
    grid: { left: 20, right: 30, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(lista.map(x => x.planta)),
    yAxis: ejeY(),
    series: [
      // Ejecutado va encima de la meta, con el mismo ancho (barGap -100% solo centra barras iguales)
      { name: 'Meta', type: 'bar' as const, barWidth: 40, barGap: '-100%', data: lista.map(x => Math.round(x.meta)),
        itemStyle: { color: gris.value, borderRadius: [4, 4, 0, 0] }, label: { ...labelPill.value, position: 'top' as const, formatter: (x: any) => `Meta ${m3Lbl(x.value)}` } },
      { name: 'Ejecutado', type: 'bar' as const, barWidth: 40, barGap: '-100%', z: 3,
        data: lista.map(x => ({ value: +x.real.toFixed(1), itemStyle: { color: color(x.planta), borderRadius: [4, 4, 0, 0] } })),
        label: { ...labelDentro, position: 'insideTop' as const, formatter: (x: any) => pct(lista[x.dataIndex].cump, 0) } },
      // Raya del ritmo esperado a la fecha (meta × avance del mes)
      { name: 'Esperado', type: 'scatter' as const, symbol: 'rect', symbolSize: [52, 3], data: lista.map(x => Math.round(x.esperado)),
        itemStyle: { color: tinta.value }, tooltip: { show: false }, z: 5 },
    ],
  }, lista.length > 0)
})

// m³ de concreto por día del mes y planta (remisiones)
const porDia = computed(() => {
  const dias = Array.from({ length: ultDia.value }, (_, i) => `${mesSel.value}-${String(i + 1).padStart(2, '0')}`)
  const ps = plantas.value
  const m: Record<string, Record<string, number>> = {}
  for (const r of remisiones.value) {
    if (!r.iso.startsWith(mesSel.value) || !ps.includes(r.planta)) continue
    const d = (m[r.iso] ??= {}); d[r.planta] = (d[r.planta] ?? 0) + r.m3
  }
  return { dias, m }
})
const metaDiaria = computed(() => (diasOpMes.value ? T.value.meta / diasOpMes.value : 0))

const optAvance = computed(() => {
  const { dias, m } = porDia.value
  const total = (iso: string) => Object.values(m[iso] ?? {}).reduce((a, v) => a + v, 0)
  const conDespacho = dias.slice(0, dia.value).filter(iso => total(iso) > 0).length
  let acum = 0
  const real = dias.map((iso, i) => { acum += total(iso); return i < dia.value ? +acum.toFixed(1) : null })
  // Proyección: desde el acumulado al corte, sumando el ritmo en cada día operativo que falta
  const ritmo = conDespacho ? acum / conDespacho : 0
  let proy = acum
  const proyeccion = dias.map((_, i) => {
    if (i < dia.value - 1) return null
    if (i >= dia.value && !esDomingo(i + 1)) proy += ritmo
    return +proy.toFixed(1)
  })
  const metaLinea = dias.map((_, i) => +(T.value.meta * (i + 1) / ultDia.value).toFixed(1))
  const hayProy = dia.value < ultDia.value
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any[]) => `<b>${params[0].axisValueLabel} ${MESES_CORTOS[mes.value - 1]}</b><br/>` +
        params.filter(p => p.value != null).map(p => `${p.marker} ${p.seriesName}: <b>${fmtN(p.value, 0)} m³</b>`).join('<br/>') +
        (hayProy ? `<br/><span style="color:#94a3b8;font-size:10px">Ritmo ${fmtN(ritmo)} m³ por día con despacho</span>` : ''),
    },
    legend: leyenda([
      { name: 'Ejecutado acumulado', itemStyle: { color: AZUL } },
      ...(hayProy ? [{ name: 'Proyección al cierre', itemStyle: { color: '#94a3b8' } }] : []),
      { name: 'Meta (lineal)', itemStyle: { color: VERDE } },
    ]),
    grid: { left: 20, right: 70, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(dias.map(d => d.slice(8, 10)), { boundaryGap: false }),
    yAxis: ejeY(),
    series: [
      { name: 'Ejecutado acumulado', type: 'line' as const, data: real, smooth: 0.2, symbol: 'none', lineStyle: { width: 2.5, color: AZUL }, itemStyle: { color: AZUL },
        areaStyle: { opacity: 0.18, color: AZUL }, endLabel: { ...labelPill.value, formatter: (x: any) => m3Lbl(x.value) }, labelLayout: { moveOverlap: 'shiftY' as const } },
      ...(hayProy ? [{ name: 'Proyección al cierre', type: 'line' as const, data: proyeccion, symbol: 'none', lineStyle: { width: 2, type: 'dashed' as const, color: '#94a3b8' },
        itemStyle: { color: '#94a3b8' }, endLabel: { ...labelPill.value, formatter: (x: any) => `≈ ${m3Lbl(x.value)}` }, labelLayout: { moveOverlap: 'shiftY' as const } }] : []),
      { name: 'Meta (lineal)', type: 'line' as const, data: metaLinea, symbol: 'none', lineStyle: { width: 1.5, color: VERDE, opacity: 0.8 }, itemStyle: { color: VERDE },
        endLabel: { ...labelPill.value, formatter: (x: any) => `Meta ${m3Lbl(x.value)}` }, labelLayout: { moveOverlap: 'shiftY' as const } },
    ],
  }, T.value.meta > 0)
})

const optDiario = computed(() => {
  const { dias: todos, m } = porDia.value
  const ps = plantas.value
  // Días hasta el corte; los domingos solo si hubo despacho
  const dias = todos.slice(0, dia.value).filter((iso, i) => !esDomingo(i + 1) || Object.keys(m[iso] ?? {}).length)
  const total = (iso: string) => ps.reduce((a, p) => a + (m[iso]?.[p] ?? 0), 0)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const iso = dias[params[0].dataIndex], t = total(iso)
        return `<b>${iso.slice(8, 10)} ${MESES_CORTOS[mes.value - 1]}</b><br/>` +
          ps.filter(p => m[iso]?.[p]).map(p => `${punto(color(p))} ${p}: <b>${fmtN(m[iso][p])} m³</b>`).join('<br/>') +
          `<br/>${punto(tinta.value)} Total: <b>${fmtN(t)} m³</b><br/>${punto(t >= metaDiaria.value ? VERDE : ROJO)} Frente a la meta diaria: <b>${sg(t - metaDiaria.value)} m³</b>`
      },
    },
    legend: leyenda([...ps.map(p => ({ name: p, itemStyle: { color: color(p) } })), { name: 'Meta diaria', itemStyle: { color: VERDE } }]),
    grid: { left: 20, right: 30, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(dias.map(d => d.slice(8, 10))),
    yAxis: ejeY(),
    series: [
      ...ps.map((p, i) => ({
        name: p, type: 'bar' as const, stack: 'd', barMaxWidth: 30, emphasis,
        data: dias.map(iso => +(m[iso]?.[p] ?? 0).toFixed(1)),
        itemStyle: { color: color(p), borderRadius: (i === ps.length - 1 ? [4, 4, 0, 0] : 0) as any },
      })),
      { name: '__total', type: 'bar' as const, stack: 'd', tooltip: { show: false },
        data: dias.map(iso => ({ value: 0, label: { show: total(iso) > 0 } })),
        label: { ...labelPill.value, position: 'top' as const, distance: 4, formatter: (x: any) => m3Lbl(total(dias[x.dataIndex])) } },
      { name: 'Meta diaria', type: 'line' as const, data: dias.map(() => Math.round(metaDiaria.value)), symbol: 'none',
        lineStyle: { color: VERDE, type: 'dashed' as const, width: 1.5 }, itemStyle: { color: VERDE }, tooltip: { show: false } },
    ],
  }, dias.length > 0)
})

// ---------------------------------------------------------------- Gráficas: clientes proyectados
const estados = computed(() => {
  const av = avance.value
  const grupos = [
    // Un cliente sin meta que ya despachó cuenta como cumplido, para que la dona sume todos los clientes
    { nombre: 'Meta cumplida', color: '#15803D', filtro: (c: Cli) => c.real > 0 && c.real >= c.meta },
    { nombre: 'Al ritmo', color: VERDE, filtro: (c: Cli) => c.real > 0 && c.real < c.meta && semaforo(c.cump, av) === VERDE },
    { nombre: 'Atrasado', color: AMBAR, filtro: (c: Cli) => c.real > 0 && c.real < c.meta && semaforo(c.cump, av) === AMBAR },
    { nombre: 'Muy atrasado', color: ROJO, filtro: (c: Cli) => c.real > 0 && c.real < c.meta && semaforo(c.cump, av) === ROJO },
    { nombre: 'Sin despacho', color: '#64748B', filtro: (c: Cli) => c.real === 0 },
  ]
  return grupos.map(g => {
    const l = clientes.value.filter(g.filtro)
    return { ...g, n: l.length, meta: l.reduce((a, c) => a + c.meta, 0), real: l.reduce((a, c) => a + c.real, 0), nombres: l.map(c => c.cliente) }
  }).filter(g => g.n > 0)
})
const optSemaforo = computed(() => {
  const lista = estados.value
  const n = lista.reduce((a, g) => a + g.n, 0)
  return vacio({
    ...base(),
    title: {
      text: String(n), subtext: 'clientes proyectados', left: '37%', top: '44%', textAlign: 'center',
      textStyle: { fontSize: 20, fontWeight: 700, color: tinta.value }, subtextStyle: { fontSize: 11, color: chartTextColor.value },
    },
    tooltip: { trigger: 'item' as const, formatter: (p: any) => { const g = lista[p.dataIndex]
      return `${punto(g.color)} <b>${g.nombre}</b>: ${g.n} clientes (${pct(p.percent)})<br/>Meta ${fmtN(g.meta, 0)} m³ · ejecutado ${fmtN(g.real)} m³<br/>` +
        `<span style="color:#94a3b8;font-size:10px">${g.nombres.slice(0, 6).join(', ')}${g.nombres.length > 6 ? ` y ${g.nombres.length - 6} más` : ''}</span>` } },
    legend: {
      orient: 'vertical' as const, right: 10, top: 'middle', icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 14,
      textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
      formatter: (nm: string) => { const g = lista.find(x => x.nombre === nm); return g ? `${nm}  ${g.n} · ${fmtN(g.meta, 0)} m³ meta` : nm },
    },
    series: [{
      type: 'pie' as const, radius: ['42%', '68%'], center: ['38%', '55%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => String(lista[p.dataIndex].n), fontSize: 12, fontWeight: 700, color: chartTextColor.value },
      data: lista.map(g => ({ name: g.nombre, value: g.n, itemStyle: { color: g.color } })),
    }],
  }, lista.length > 0)
})

const optOrigen = computed(() => {
  const lista = plantas.value.map(p => ({ planta: p, proy: P.value[p].realClientes, calle: P.value[p].realCalle, nCalle: P.value[p].nCalle }))
  const cCalle = isLight.value ? '#94a3b8' : '#475569'
  const tot = (x: typeof lista[number]) => x.proy + x.calle
  // Solo se rotula el tramo si es ancho frente a la barra más larga de la gráfica
  const maxTot = Math.max(...lista.map(tot), 1)
  const lbl = (v: number, i: number) => (tot(lista[i]) && v >= maxTot * 0.1 ? pct(v / tot(lista[i]) * 100, 0) : '')
  return vacio({
    ...barrasH(lista.map(x => x.planta), [
      { name: 'Clientes proyectados', type: 'bar', stack: 'o', barWidth: '55%', data: lista.map(x => +x.proy.toFixed(1)),
        itemStyle: { color: AZUL }, label: { ...labelDentro, formatter: (x: any) => lbl(x.value, x.dataIndex) } },
      { name: 'Clientes de calle', type: 'bar', stack: 'o', barWidth: '55%', data: lista.map(x => +x.calle.toFixed(1)),
        itemStyle: { color: cCalle, borderRadius: [0, 4, 4, 0] }, label: { ...labelDentro, formatter: (x: any) => lbl(x.value, x.dataIndex) } },
      { name: '__total', type: 'bar', stack: 'o', data: lista.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => m3Lbl(tot(lista[x.dataIndex])) + ' m³' } },
    ], lista.map(x => m3Lbl(tot(x)) + ' m³'), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const x = lista[params[0].dataIndex]
        return `<b>${x.planta}</b><br/>${punto(AZUL)} Clientes proyectados: <b>${fmtN(x.proy)} m³</b><br/>` +
          `${punto(cCalle)} Clientes de calle: <b>${fmtN(x.calle)} m³</b>${x.nCalle ? ` (${x.nCalle} clientes)` : ''}<br/>${punto(tinta.value)} Total: <b>${fmtN(tot(x))} m³</b>` },
    }, true),
    legend: leyenda([{ name: 'Clientes proyectados', itemStyle: { color: AZUL } }, { name: 'Clientes de calle', itemStyle: { color: cCalle } }]),
  }, lista.length > 0)
})

function nombreCliente(c: Cli): string { return c.obra && norm(c.obra) !== norm(c.cliente) ? `${c.cliente} (${c.obra})` : c.cliente }
function opcionClientes(lista: Cli[]) {
  const av = avance.value
  return vacio(barrasH(lista.map(nombreCliente), [
    { name: 'Meta', type: 'bar', barWidth: '70%', barGap: '-100%', data: lista.map(c => Math.round(c.meta)), itemStyle: { color: gris.value, borderRadius: [0, 4, 4, 0] } },
    { name: 'Ejecutado', type: 'bar', barWidth: '70%', barGap: '-100%', z: 3,
      data: lista.map(c => ({ value: +c.real.toFixed(1), itemStyle: { color: semaforo(c.cump, av), borderRadius: [0, 4, 4, 0] } })),
      label: { ...labelPill.value, position: 'right', formatter: (x: any) => { const c = lista[x.dataIndex]; return `${m3Lbl(c.real)} / ${m3Lbl(c.meta)} · ${pct(c.cump, 0)}` } } },
  ], lista.map(c => `${m3Lbl(c.real)} / ${m3Lbl(c.meta)} · ${pct(c.cump, 0)}`), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const c = lista[params[0].dataIndex]
      return `<b>${c.cliente}</b><br/><span style="color:#94a3b8">${c.obra} · ${c.planta}</span><br/>` +
        `${punto(gris.value)} Meta: <b>${fmtN(c.meta, 0)} m³</b><br/>${punto(semaforo(c.cump, av))} Ejecutado: <b>${fmtN(c.real)} m³</b> (${pct(c.cump)})<br/>` +
        `${punto(tinta.value)} Esperado a la fecha: <b>${fmtN(c.esperado, 0)} m³</b> · desviación ${sg(c.desv)} m³<br/>${punto(ROJO)} Faltan: <b>${fmtN(Math.max(c.meta - c.real, 0))} m³</b>` },
  }, false), lista.length > 0)
}
const clientesPorMeta = computed(() => [...clientes.value].sort((a, b) => b.meta - a.meta))
const optClientes = computed(() => opcionClientes(clientesPorMeta.value.slice(0, TOP)))
const optClientesTodos = computed(() => opcionClientes(clientesPorMeta.value))

const optDesviacion = computed(() => {
  const orden = [...clientes.value].filter(c => c.meta > 0).sort((a, b) => a.desv - b.desv)
  const atrasados = orden.filter(c => c.desv < 0).slice(0, 6)
  const adelantados = orden.filter(c => c.desv > 0).slice(-4).reverse()
  const lista = [...adelantados, ...atrasados.reverse()].sort((a, b) => b.desv - a.desv)
  return vacio(barrasH(lista.map(nombreCliente), [{
    name: 'Desviación', type: 'bar', barWidth: '60%',
    data: lista.map(c => ({ value: +c.desv.toFixed(1), itemStyle: { color: c.desv >= 0 ? VERDE : ROJO, borderRadius: c.desv >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })),
    label: { ...labelPill.value, position: 'right', formatter: (x: any) => `${sg(x.value)} m³` },
  }], lista.map(c => `${sg(c.desv)} m³`), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const c = lista[params[0].dataIndex]
      return `<b>${c.cliente}</b><br/><span style="color:#94a3b8">${c.obra} · ${c.planta}</span><br/>` +
        `${punto(c.desv >= 0 ? VERDE : ROJO)} Desviación: <b>${sg(c.desv)} m³</b><br/>Ejecutado ${fmtN(c.real)} m³ · esperado ${fmtN(c.esperado, 0)} m³ · meta ${fmtN(c.meta, 0)} m³` },
  }, false), lista.length > 0)
})

// ---------------------------------------------------------------- Gráficas: histórico del año
const historico = computed(() => {
  const meses = [...new Set(proyecciones.value.filter(r => r.tipo === 'Proyectado' && r.mes.startsWith(String(anio.value)) && r.mes <= mesSel.value).map(r => r.mes))].sort()
  return meses.map(mm => {
    const filas = proyecciones.value.filter(r => r.mes === mm)
    const ps = ordenarPlantas(new Set(filas.filter(r => r.tipo === 'Proyectado').map(r => r.planta)))
    // Meses cerrados al 100% del calendario; el mes elegido con su avance
    const av = mm === mesSel.value ? avance.value : 100
    const porPlanta = Object.fromEntries(ps.map(p => { const x = resumenPlanta(p, filas, av); return [p, { meta: x.meta, real: x.real, cump: x.cump }] }))
    const meta = ps.reduce((a, p) => a + porPlanta[p].meta, 0), real = ps.reduce((a, p) => a + porPlanta[p].real, 0)
    return { mes: `${MESES_CORTOS[Number(mm.slice(5, 7)) - 1]} ${mm.slice(2, 4)}`, meta, real, cump: meta ? real / meta * 100 : 0, porPlanta }
  })
})
const optHistorico = computed(() => {
  const filas = historico.value
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => { const x = filas[params[0].dataIndex]
        return `<b>${x.mes}</b><br/>${punto(gris.value)} Meta: <b>${fmtN(x.meta, 0)} m³</b><br/>${punto(AZUL)} Ejecutado: <b>${fmtN(x.real)} m³</b><br/>` +
          `${punto(x.cump >= 100 ? VERDE : ROJO)} Cumplimiento: <b>${pct(x.cump)}</b>` } },
    legend: leyenda([{ name: 'Meta', itemStyle: { color: gris.value } }, { name: 'Ejecutado', itemStyle: { color: AZUL } }]),
    grid: { left: 20, right: 30, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(filas.map(x => x.mes)),
    yAxis: ejeY(),
    series: [
      { name: 'Meta', type: 'bar' as const, barMaxWidth: 28, data: filas.map(x => Math.round(x.meta)), itemStyle: { color: gris.value, borderRadius: [4, 4, 0, 0] },
        label: { ...labelDentro, position: 'insideTop' as const, color: chartTextColor.value, formatter: (x: any) => m3Lbl(x.value) } },
      { name: 'Ejecutado', type: 'bar' as const, barMaxWidth: 28, data: filas.map(x => +x.real.toFixed(1)), itemStyle: { color: AZUL, borderRadius: [4, 4, 0, 0] },
        label: { ...labelPill.value, position: 'top' as const, formatter: (x: any) => pct(filas[x.dataIndex].cump, 0) } },
    ],
  }, filas.length > 0)
})
const optHistoricoPlanta = computed(() => {
  const filas = historico.value
  const ps = ordenarPlantas(new Set(filas.flatMap(f => Object.keys(f.porPlanta))))
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const,
      formatter: (params: any[]) => { const f = filas[params[0].dataIndex]
        return `<b>${f.mes}</b><br/>` + ps.filter(p => f.porPlanta[p]).map(p =>
          `${punto(color(p))} ${p}: <b>${pct(f.porPlanta[p].cump)}</b> <span style="color:#94a3b8;font-size:10px">${fmtN(f.porPlanta[p].real, 0)} de ${fmtN(f.porPlanta[p].meta, 0)} m³</span>`).join('<br/>') } },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    grid: { left: 20, right: 60, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(filas.map(x => x.mes), { boundaryGap: false }),
    yAxis: ejeY({ max: (v: { max: number }) => Math.max(120, Math.ceil(v.max * 1.1)) }),
    series: ps.map((p, i) => ({
      name: p, type: 'line' as const, smooth: 0.3, symbol: 'circle', symbolSize: 8, connectNulls: true, emphasis: { focus: 'series' as const },
      data: filas.map(f => (f.porPlanta[p] ? +f.porPlanta[p].cump.toFixed(1) : null)),
      lineStyle: { width: 2.5, color: color(p) }, itemStyle: { color: color(p) },
      endLabel: { ...labelPill.value, formatter: (x: any) => pct(x.value, 0) }, labelLayout: { moveOverlap: 'shiftY' as const },
      ...(i === 0 ? { markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: VERDE, type: 'dashed' as const, width: 1.5 }, data: [{ yAxis: 100 }] } } : {}),
    })),
  }, filas.length > 0)
})
</script>

<style scoped>
.graficas-tab { display: flex; flex-direction: column; }

.gt-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 12px 16px; margin-bottom: 20px;
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg);
}
.gt-info { display: flex; flex-direction: column; gap: 2px; }
.gt-tag { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--accent); }
.gt-periodo { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.gt-sub { font-size: 12px; color: var(--text-tertiary); }
.gt-mes { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-tertiary); }
.gt-mes select {
  padding: 6px 10px; border: 1px solid var(--card-border); border-radius: var(--radius-sm);
  background: var(--card-bg); color: var(--text-primary); font-size: 13px; text-transform: capitalize;
}
.gt-vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }

/* Mismo tratamiento de títulos y KPIs que el tablero de Mantenimiento */
.kpi-row { margin-bottom: 4px; }
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 0; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.section-sub { font-size: 12px; color: var(--text-tertiary); margin: 6px 0 0; }
.charts-grid { margin-top: 16px; }
.charts-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }
</style>
