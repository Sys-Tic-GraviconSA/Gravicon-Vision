<template>
  <div class="combustible-tab">
    <div class="gt-bar">
      <div class="gt-info">
        <span class="gt-tag">Tanqueo de combustible · {{ periodoLbl }}</span>
        <span class="gt-periodo">{{ fmtN(T.galones) }} galones · {{ cop(T.costo) }} en {{ fmtN(T.vales, 0) }} tanqueos</span>
        <span class="gt-sub">
          Fuente: hoja «Combustible» (vales de tanqueo). El costo por m³ se calcula con el concreto despachado (remisiones, sin agregados).
          <template v-if="sinFechaN">{{ sinFechaN }} vales sin fecha se ubican por su mes.</template>
          <template v-if="excluidas">{{ excluidas }} filas sin fecha ni mes quedan por fuera.</template>
        </span>
      </div>
      <!-- Filtro de producto: todo el tablero se recalcula con el producto elegido -->
      <div class="gt-gran" role="group" aria-label="Producto">
        <span class="gt-gran-lbl">Producto</span>
        <button v-for="o in productosOpc" :key="o" class="gt-gran-btn" :class="{ active: producto === o }" @click="producto = o">{{ o === 'TODOS' ? 'Todos' : titulo(o) }}</button>
      </div>
    </div>

    <SkeletonLoader v-if="dispStore.loading && !todas.length" :kpis="4" :charts="2" label="Cargando tanqueos…" />
    <div v-else-if="!rs.length" class="gt-vacio">No hay tanqueos registrados en el rango de fechas.</div>

    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :detail="k.detail" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Costo y consumo por mes</h3>
      <div class="charts-grid cols-1">
        <ChartCard title="Costo de Combustible por Planta" description="Valor de los vales de tanqueo por mes y planta; en el tooltip, el total y la variación frente al mes anterior" :option="optCostoMes" :height="380" />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Variación Mensual del Gasto por Planta" description="Gasto de cada planta por mes; en verde baja y en rojo sube frente al mes anterior" :option="optVariacion" :height="340" />
        <ChartCard title="Galones por Mes" description="Galones tanqueados por mes y planta; en el tooltip, el total y la variación" :option="optGalonesMes" :height="340" />
        <ChartCard title="Costo de Combustible por m³ Producido" description="$ de combustible ÷ m³ de concreto despachado en el mes, por planta" :option="optCostoM3" :height="320" />
        <ChartCard title="Precio Promedio del Galón" :description="producto === 'TODOS' ? 'ACPM por planta y su promedio; el Corriente va aparte para no mezclar productos' : 'Valor pagado ÷ galones, por mes y planta'" :option="optPrecioGalon" :height="320" />
      </div>


      <h3 class="section-title"><span class="title-bar"></span>Distribución del consumo</h3>
      <div class="charts-grid cols-3">
        <ChartCard title="Galones por Planta" description="Participación de cada planta en los galones" :option="optGalonesPlanta" :height="300" />
        <ChartCard title="Consumo por Tipo de Combustible" description="Galones por producto (ACPM, corriente, urea)" :option="optProducto" :height="300" />
        <ChartCard title="Galones por Tipo de Vehículo" description="Según el tipo del maestro de equipos; «Otros» = placas fuera del maestro" :option="optTipoVehiculo" :height="300" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Consumo por equipo</h3>
      <div class="charts-grid cols-2">
        <ChartCard :title="`Ranking de Costo de Combustible por Placa — Top ${TOP}`" description="Valor tanqueado por placa; el color es la planta donde más tanqueó; al lado, el valor y los galones" :option="optPlacas" :expand-option="optPlacasTodas" :height="460" />
        <ChartCard :title="`Consumo por Hora de Operación — Top ${TOP}`" description="Galones por hora de horómetro válido (mínimo 20 h por placa); en rojo, 25% por encima del promedio" :option="optGalHora" :expand-option="optGalHoraTodas" :height="460" />
      </div>
      <div class="charts-grid cols-1">
        <ChartCard :title="`Rendimiento de Carga por Mixer — Top ${TOP}`" description="m³ de concreto despachados por cada galón tanqueado (remisiones ÷ tanqueos de la misma placa); más alto = más eficiente" :option="optRendimiento" :expand-option="optRendimientoTodos" :height="460" />
      </div>
      <div class="charts-grid cols-1">
        <ChartCard title="Galones Tanqueados por Día" description="Galones por día y planta" :option="optDiario" :height="360" />
      </div>
    </template>
  </div>
</template>

/**
 * CombustibleTab.vue — Tanqueo de combustible (hoja «Combustible» del libro de OT de Concretos).
 * Réplica del tablero de combustible de Power BI con el estilo de la app: costo y galones por mes y
 * planta, costo por m³ producido, distribución por planta, producto y tipo de vehículo, ranking por
 * placa, consumo por hora de horómetro y galones por día. «Precio» es el valor total del vale.
 */
<script setup lang="ts">
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import { ref, computed, onMounted } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import { useDisponibilidadStore } from '../../stores'
import { useConcretoStore } from '../../stores/concreto'
import { serialToDate } from '../../utils/dates'
import { esAgregado } from '../../utils/agregadosConcreto'
import {
  MESES_CORTOS, COLOR_PLANTA, COLOR_EXTRA, PALETA, AZUL, FONT, fmtN, cop, copCorto, pct, num, nombrePlanta, titulo,
  ordenarPlantas, punto, m3Lbl, vacio, emphasis, useEstiloGraficas,
} from '../../composables/useGraficasConcreto'

const props = defineProps<{
  /** Rango del filtro de fechas del contenedor (YYYY-MM-DD) */
  fechaInicio?: string
  fechaFin?: string
}>()

const TOP = 15
const dispStore = useDisponibilidadStore()
const concretoStore = useConcretoStore()
onMounted(() => { if (!concretoStore.data && !concretoStore.loading) concretoStore.fetchData() })
const { isLight, chartTextColor, labelPill, base, leyenda, ejeX, ejeY, zoom, barrasH } = useEstiloGraficas()

function color(p: string): string { return COLOR_PLANTA[p] ?? COLOR_EXTRA[0] }
const isoDe = (serial: number) => serialToDate(serial).toISOString().slice(0, 10)
const etiquetaMes = (k: string) => `${MESES_CORTOS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`

// ---------------------------------------------------------------- Datos
interface Tanqueo { iso: string; planta: string; placa: string; producto: string; tipo: string; galones: number; costo: number; horas: number
  vale: string; horIni: number | null; horFin: number | null
  /** Vale sin fecha en la hoja: se ubica por la columna «Mes» (día 01) y no entra en la gráfica diaria */
  sinFecha: boolean }
const crudas = computed(() => (dispStore.data?.combustible ?? []) as Record<string, unknown>[])
// Año de referencia para los vales sin fecha: el de la fecha más reciente de la hoja
const anioRef = computed(() => {
  const serials = crudas.value.map(r => r['Fecha']).filter((x): x is number => typeof x === 'number' && x > 0)
  return serials.length ? isoDe(Math.max(...serials)).slice(0, 4) : String(new Date().getFullYear())
})
const mesValido = (r: Record<string, unknown>) => { const m = num(r['Mes']); return m >= 1 && m <= 12 ? m : 0 }
const todas = computed<Tanqueo[]>(() => crudas.value
  // Con fecha, o sin fecha pero con «Mes» (la hoja trae algunos vales así; el Power BI los muestra como «(En blanco)»)
  .filter(r => (typeof r['Fecha'] === 'number' && r['Fecha']) || mesValido(r))
  .map(r => ({
    sinFecha: !(typeof r['Fecha'] === 'number' && r['Fecha']),
    iso: typeof r['Fecha'] === 'number' && r['Fecha'] ? isoDe(r['Fecha'] as number) : `${anioRef.value}-${String(mesValido(r)).padStart(2, '0')}-01`,
    planta: nombrePlanta(titulo(String(r['Planta'] ?? '').trim())),
    placa: String(r['Placa'] ?? '').trim().toUpperCase() || 'Sin placa',
    producto: String(r['Producto'] ?? '').trim().toUpperCase() || 'Sin producto',
    tipo: titulo(String(r['Tipo_Vehiculo'] ?? '').trim()) || 'Otros',
    galones: num(r['Cant gl']),
    costo: num(r['Precio']),
    horas: num(r['Horometro recorrido']),
    vale: String(r['N. vale'] ?? '').trim(),
    horIni: r['Horometro inicial'] == null || r['Horometro inicial'] === '' ? null : num(r['Horometro inicial']),
    horFin: r['Horometro final'] == null || r['Horometro final'] === '' ? null : num(r['Horometro final']),
  })))
const excluidas = computed(() => crudas.value.length - todas.value.length)
const sinFechaN = computed(() => rs.value.filter(r => r.sinFecha).length)

const rango = computed(() => {
  let min = '9999-12-31', max = ''
  for (const r of todas.value) { if (r.sinFecha) continue; if (r.iso < min) min = r.iso; if (r.iso > max) max = r.iso }
  return { desde: props.fechaInicio && props.fechaInicio > min ? props.fechaInicio : min, hasta: props.fechaFin && props.fechaFin < max ? props.fechaFin : max }
})
// Producto elegido (Todos / ACPM / Corriente / Urea): aplica a todo el tablero
const producto = ref('TODOS')
const productosOpc = computed(() => ['TODOS', ...['ACPM', 'CORRIENTE', 'UREA'].filter(p => todas.value.some(r => r.producto === p))])
// Los vales sin fecha entran si su mes cae dentro del rango
const enRango = (r: Tanqueo) => r.sinFecha
  ? r.iso.slice(0, 7) >= rango.value.desde.slice(0, 7) && r.iso.slice(0, 7) <= rango.value.hasta.slice(0, 7)
  : r.iso >= rango.value.desde && r.iso <= rango.value.hasta
const rs = computed(() => todas.value.filter(r => enRango(r) && (producto.value === 'TODOS' || r.producto === producto.value)))
const periodoLbl = computed(() => {
  const f = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES_CORTOS[Number(iso.slice(5, 7)) - 1].toLowerCase()} ${iso.slice(0, 4)}`
  return rs.value.length ? `${f(rango.value.desde)} – ${f(rango.value.hasta)}` : ''
})
const plantas = computed(() => ordenarPlantas(new Set(rs.value.map(r => r.planta))))

// m³ de concreto despachados por mes y planta (remisiones sin agregados), para el costo por m³
const m3PorMes = computed(() => {
  const m = new Map<string, Record<string, number>>()
  for (const r of (concretoStore.data?.rows ?? []) as Record<string, unknown>[]) {
    if (typeof r['Fecha'] !== 'number' || esAgregado(r['Mezcla'], r['Cliente'], r['Planta'])) continue
    const iso = isoDe(r['Fecha'] as number)
    if (iso < rango.value.desde || iso > rango.value.hasta) continue
    const e = m.get(iso.slice(0, 7)) ?? {}
    const p = nombrePlanta(r['Planta'])
    e[p] = (e[p] ?? 0) + num(r['Cant. Concreto'])
    m.set(iso.slice(0, 7), e)
  }
  return m
})
const m3Total = (planta?: string) => [...m3PorMes.value.values()].reduce((a, e) => a + (planta ? e[planta] ?? 0 : Object.values(e).reduce((x, y) => x + y, 0)), 0)

// ---------------------------------------------------------------- Totales y KPIs
// Horómetro utilizable: la hoja trae digitaciones erradas y horómetros finales vacíos (recorridos de
// millones de horas), así que solo cuentan tanqueos con 1–300 h y entre 0,2 y 20 gal por hora
const horometroValido = (r: Tanqueo) => r.horas >= 1 && r.horas <= 300 && r.galones > 0 && r.galones / r.horas >= 0.2 && r.galones / r.horas <= 20
const horometrosDescartados = computed(() => rs.value.filter(r => r.horas > 0 && !horometroValido(r)).length)

function acumular(lista: Tanqueo[]) {
  const conHoras = lista.filter(horometroValido)
  return {
    galones: lista.reduce((a, r) => a + r.galones, 0),
    costo: lista.reduce((a, r) => a + r.costo, 0),
    vales: lista.length,
    placas: new Set(lista.map(r => r.placa)).size,
    horas: conHoras.reduce((a, r) => a + r.horas, 0),
    galHoras: conHoras.reduce((a, r) => a + r.galones, 0),
    acpm: lista.filter(r => r.producto === 'ACPM').reduce((a, r) => a + r.costo, 0),
    porProducto: Object.fromEntries(['ACPM', 'CORRIENTE', 'UREA'].map(pr => {
      const l = lista.filter(r => r.producto === pr)
      return [pr, { galones: l.reduce((a, r) => a + r.galones, 0), costo: l.reduce((a, r) => a + r.costo, 0) }]
    })) as Record<string, { galones: number; costo: number }>,
  }
}
const T = computed(() => acumular(rs.value))
const P = computed(() => Object.fromEntries(plantas.value.map(p => [p, acumular(rs.value.filter(r => r.planta === p))])) as Record<string, ReturnType<typeof acumular>>)

function detalle(valor: (p: string) => string): string {
  return plantas.value.map(p =>
    `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p)}'></span>` +
    `<span class='kpi-label-int' style='color:${color(p)}'>${p}</span> <strong>${valor(p)}</strong></div>`).join('')
}
const nota = (t: string) => `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>${t}</div>`
const kpis = computed(() => {
  const t = T.value, pp = P.value
  const m3 = m3Total()
  const gal = (x: ReturnType<typeof acumular>, pr: string) => x.porProducto[pr]?.galones ?? 0
  const precio = (x: ReturnType<typeof acumular>, pr: string) => { const g = gal(x, pr); return g ? (x.porProducto[pr]?.costo ?? 0) / g : 0 }
  const gris = (t: string) => ` <span style='color:var(--text-tertiary);font-size:10px'>${t}</span>`
  const comunes = [
    { label: 'Costo por m³ Producido', value: m3 ? cop(t.costo / m3) : '—', icon: 'trending-up', accent: '#0EA5E9',
      detail: detalle(p => { const x = m3Total(p); return x ? cop(pp[p].costo / x) : '—' }) + nota(`${fmtN(m3, 0)} m³ de concreto en el período`) },
    { label: 'Tanqueos', value: fmtN(t.vales, 0), icon: 'list', accent: '#8B5CF6',
      detail: detalle(p => `${fmtN(pp[p].vales, 0)}${gris(`${fmtN(pp[p].vales ? pp[p].galones / pp[p].vales : 0)} gal/vale`)}`) + nota(`${fmtN(t.placas, 0)} placas abastecidas`) },
    { label: 'Galones por Hora', value: t.horas ? fmtN(t.galHoras / t.horas, 2) + ' gal/h' : '—', icon: 'clock', accent: '#06B6D4',
      detail: detalle(p => (pp[p].horas ? fmtN(pp[p].galHoras / pp[p].horas, 2) + ' gal/h' : '—'))
        + nota(`Con horómetro válido; ${fmtN(horometrosDescartados.value, 0)} tanqueos descartados por horómetro errado`) },
  ]
  if (producto.value === 'TODOS') {
    // Vista general: ACPM y Corriente por separado; mezclarlos (y la urea) distorsiona el precio promedio
    const urea = t.porProducto.UREA
    return [
      { label: 'Costo de Combustible', value: cop(t.costo), icon: 'dollar', accent: '#2563EB',
        detail: detalle(p => `${cop(pp[p].costo)}${gris(`(${pct(t.costo ? pp[p].costo / t.costo * 100 : 0)})`)}`)
          + nota(`ACPM ${cop(t.porProducto.ACPM.costo)} · Corriente ${cop(t.porProducto.CORRIENTE.costo)}${urea.costo ? ` · Urea ${cop(urea.costo)}` : ''}`) },
      { label: 'Galones de ACPM', value: fmtN(gal(t, 'ACPM')) + ' gal', icon: 'package', accent: '#10B981',
        detail: detalle(p => fmtN(gal(pp[p], 'ACPM')) + ' gal') + nota(`${pct(t.galones ? gal(t, 'ACPM') / t.galones * 100 : 0)} de los galones`) },
      { label: 'Galones de Corriente', value: fmtN(gal(t, 'CORRIENTE')) + ' gal', icon: 'package', accent: '#F97316',
        detail: detalle(p => fmtN(gal(pp[p], 'CORRIENTE')) + ' gal') + (urea.galones ? nota(`Urea: ${fmtN(urea.galones)} gal`) : '') },
      { label: 'Precio Promedio ACPM', value: cop(precio(t, 'ACPM')) + '/gal', icon: 'target', accent: '#F59E0B',
        detail: detalle(p => (gal(pp[p], 'ACPM') ? cop(precio(pp[p], 'ACPM')) + '/gal' : '—')) },
      { label: 'Precio Promedio Corriente', value: gal(t, 'CORRIENTE') ? cop(precio(t, 'CORRIENTE')) + '/gal' : '—', icon: 'target', accent: '#EC4899',
        detail: detalle(p => (gal(pp[p], 'CORRIENTE') ? cop(precio(pp[p], 'CORRIENTE')) + '/gal' : '—')) },
      ...comunes,
    ]
  }
  const nombre = titulo(producto.value)
  return [
    { label: `Costo de ${nombre}`, value: cop(t.costo), icon: 'dollar', accent: '#2563EB',
      detail: detalle(p => `${cop(pp[p].costo)}${gris(`(${pct(t.costo ? pp[p].costo / t.costo * 100 : 0)})`)}`) },
    { label: `Galones de ${nombre}`, value: fmtN(t.galones) + ' gal', icon: 'package', accent: '#10B981', detail: detalle(p => fmtN(pp[p].galones) + ' gal') },
    { label: `Precio Promedio ${nombre}`, value: cop(t.galones ? t.costo / t.galones : 0) + '/gal', icon: 'target', accent: '#F59E0B',
      detail: detalle(p => (pp[p].galones ? cop(pp[p].costo / pp[p].galones) + '/gal' : '—')) },
    { label: 'Galones por Tanqueo', value: fmtN(t.vales ? t.galones / t.vales : 0) + ' gal', icon: 'activity', accent: '#EC4899',
      detail: detalle(p => fmtN(pp[p].vales ? pp[p].galones / pp[p].vales : 0) + ' gal') },
    { label: 'Placas Abastecidas', value: fmtN(t.placas, 0), icon: 'truck', accent: '#64748B', detail: detalle(p => fmtN(pp[p].placas, 0)) },
    ...comunes,
  ]
})

// ---------------------------------------------------------------- Por mes
interface Mes { k: string; costo: number; galones: number; porPlanta: Record<string, { costo: number; galones: number }> }
const meses = computed<Mes[]>(() => {
  const m = new Map<string, Mes>()
  for (const r of rs.value) {
    const k = r.iso.slice(0, 7)
    const e = m.get(k) ?? { k, costo: 0, galones: 0, porPlanta: {} }
    const pp = (e.porPlanta[r.planta] ??= { costo: 0, galones: 0 })
    e.costo += r.costo; e.galones += r.galones; pp.costo += r.costo; pp.galones += r.galones
    m.set(k, e)
  }
  return [...m.values()].sort((a, b) => a.k.localeCompare(b.k))
})

// Barras agrupadas por planta (una barra por planta y mes); en el tooltip, el total y la variación por planta
function barrasMes(valor: (x: Mes, p?: string) => number, fmt: (v: number) => string, unidad: (v: number) => string) {
  const per = meses.value, ps = plantas.value
  const variacion = (i: number, p?: string) => { const a = i > 0 ? valor(per[i - 1], p) : 0; return a ? (valor(per[i], p) / a - 1) * 100 : null }
  const flecha = (v: number | null) => (v === null ? '' : ` <span style="color:#94a3b8;font-size:10px">${v >= 0 ? '▲' : '▼'} ${pct(Math.abs(v))}</span>`)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const i = params[0].dataIndex, x = per[i]
        return `<b>${etiquetaMes(x.k)}</b><br/>` +
          ps.filter(p => valor(x, p)).map(p => `${punto(color(p))} ${p}: <b>${unidad(valor(x, p))}</b>${flecha(variacion(i, p))}`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${unidad(valor(x))}</b>${flecha(variacion(i))}`
      },
    },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    grid: { left: 20, right: 30, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaMes(x.k))),
    yAxis: ejeY(),
    series: ps.map(p => ({
      name: p, type: 'bar' as const, barMaxWidth: 26, barGap: '12%', emphasis,
      data: per.map(x => +valor(x, p).toFixed(1)),
      itemStyle: { color: color(p), borderRadius: [4, 4, 0, 0] as any },
      label: { ...labelPill.value, position: 'top' as const, distance: 3, fontSize: 10, padding: [1, 4] as [number, number], formatter: (v: any) => (v.value ? fmt(v.value) : '') },
      labelLayout: { hideOverlap: true },
    })),
  }, per.length > 0)
}
const optCostoMes = computed(() => barrasMes((x, p) => (p ? x.porPlanta[p]?.costo ?? 0 : x.costo), copCorto, cop))
const optGalonesMes = computed(() => barrasMes((x, p) => (p ? x.porPlanta[p]?.galones ?? 0 : x.galones), m3Lbl, v => fmtN(v) + ' gal'))

const optCostoM3 = computed(() => {
  const per = meses.value, ps = plantas.value
  const serie = (x: Mes, p?: string) => {
    const m3 = m3PorMes.value.get(x.k)
    const q = p ? m3?.[p] ?? 0 : Object.values(m3 ?? {}).reduce((a, v) => a + v, 0)
    const c = p ? x.porPlanta[p]?.costo ?? 0 : x.costo
    return q ? Math.round(c / q) : null
  }
  const hay = per.some(x => serie(x) !== null)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any[]) => `<b>${params[0].axisValueLabel}</b><br/>` +
        params.filter(p => p.value != null).map(p => `${p.marker} ${p.seriesName}: <b>${cop(p.value)}</b>/m³`).join('<br/>'),
    },
    legend: leyenda([...ps.map(p => ({ name: p, itemStyle: { color: color(p) } })), { name: 'Total', itemStyle: { color: isLight.value ? '#0f172a' : '#f1f5f9' } }]),
    grid: { left: 20, right: 80, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaMes(x.k)), { boundaryGap: false }),
    yAxis: ejeY({ scale: true, max: undefined }),
    series: [
      ...ps.map(p => ({
        name: p, type: 'line' as const, smooth: 0.3, connectNulls: true, symbol: 'circle', symbolSize: 7, emphasis: { focus: 'series' as const },
        data: per.map(x => serie(x, p)), lineStyle: { width: 2.5, color: color(p) }, itemStyle: { color: color(p) },
      })),
      { name: 'Total', type: 'line' as const, smooth: 0.3, connectNulls: true, symbol: 'circle', symbolSize: 7,
        data: per.map(x => serie(x)), lineStyle: { width: 2, type: 'dashed' as const, color: isLight.value ? '#0f172a' : '#f1f5f9' }, itemStyle: { color: isLight.value ? '#0f172a' : '#f1f5f9' },
        label: { ...labelPill.value, formatter: (v: any) => copCorto(v.value) } },
    ],
  }, hay)
})

// Gasto por planta y mes en líneas, con la variación frente al mes anterior en cada punto
const optVariacion = computed(() => {
  const per = meses.value, ps = plantas.value
  const val = (i: number, p: string) => per[i]?.porPlanta[p]?.costo ?? 0
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any[]) => {
        const i = params[0].dataIndex
        return `<b>${params[0].axisValueLabel}</b><br/>` + params.map(p => {
          const ant = i > 0 ? val(i - 1, p.seriesName) : 0, v = Number(p.value) || 0
          const d = ant ? (v / ant - 1) * 100 : null
          return `${punto(color(p.seriesName))} ${p.seriesName}: <b>${cop(v)}</b>` + (d === null ? '' : ` <span style="color:${d > 0 ? '#DC2626' : '#16A34A'}">${d > 0 ? '▲' : '▼'} ${pct(Math.abs(d))}</span>`)
        }).join('<br/>')
      },
    },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    grid: { left: 20, right: 40, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaMes(x.k)), { boundaryGap: false }),
    yAxis: ejeY(),
    series: ps.map(p => ({
      name: p, type: 'line' as const, smooth: 0.3, symbol: 'circle', symbolSize: 7, emphasis: { focus: 'series' as const },
      data: per.map((_, i) => Math.round(val(i, p))), lineStyle: { width: 2.5, color: color(p) }, itemStyle: { color: color(p) },
      label: {
        ...labelPill.value, fontSize: 10,
        formatter: (v: any) => {
          const ant = v.dataIndex > 0 ? val(v.dataIndex - 1, p) : 0
          if (!ant) return copCorto(v.value)
          const d = (v.value / ant - 1) * 100
          return `${copCorto(v.value)} ${d > 0 ? '▲' : '▼'}${fmtN(Math.abs(d), 0)}%`
        },
      },
      labelLayout: { hideOverlap: true },
    })),
  }, per.length > 0)
})

// Precio del galón por mes: en la vista general, ACPM por planta y el Corriente aparte (no se mezclan productos)
const optPrecioGalon = computed(() => {
  const per = meses.value, ps = plantas.value
  const general = producto.value === 'TODOS'
  const base_ = general ? rs.value.filter(r => r.producto === 'ACPM') : rs.value
  const precio = (lista: Tanqueo[], k: string, p?: string) => {
    const l = lista.filter(r => r.iso.slice(0, 7) === k && (!p || r.planta === p))
    const g = l.reduce((a, r) => a + r.galones, 0)
    return g ? Math.round(l.reduce((a, r) => a + r.costo, 0) / g) : null
  }
  const corriente = general ? rs.value.filter(r => r.producto === 'CORRIENTE') : []
  const tinta = isLight.value ? '#0f172a' : '#f1f5f9'
  const nombreProm = general ? 'Promedio ACPM' : 'Promedio'
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, formatter: (params: any[]) => `<b>${params[0].axisValueLabel}</b><br/>` +
      params.filter(p => p.value != null).map(p => `${p.marker} ${p.seriesName}: <b>${cop(p.value)}</b>/gal`).join('<br/>') },
    legend: leyenda([
      ...ps.map(p => ({ name: p, itemStyle: { color: color(p) } })),
      { name: nombreProm, itemStyle: { color: tinta } },
      ...(corriente.length ? [{ name: 'Corriente', itemStyle: { color: '#F97316' } }] : []),
    ]),
    grid: { left: 20, right: 70, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaMes(x.k)), { boundaryGap: false }),
    yAxis: ejeY({ scale: true, max: undefined }),
    series: [
      ...ps.map(p => ({ name: p, type: 'line' as const, smooth: 0.3, connectNulls: true, symbol: 'circle', symbolSize: 7,
        data: per.map(x => precio(base_, x.k, p)), lineStyle: { width: 2.5, color: color(p) }, itemStyle: { color: color(p) } })),
      { name: nombreProm, type: 'line' as const, smooth: 0.3, connectNulls: true, symbol: 'circle', symbolSize: 7, data: per.map(x => precio(base_, x.k)),
        lineStyle: { width: 2, type: 'dashed' as const, color: tinta }, itemStyle: { color: tinta },
        label: { ...labelPill.value, formatter: (v: any) => cop(v.value) }, labelLayout: { hideOverlap: true } },
      ...(corriente.length ? [{ name: 'Corriente', type: 'line' as const, smooth: 0.3, connectNulls: true, symbol: 'diamond', symbolSize: 9,
        data: per.map(x => precio(corriente, x.k)), lineStyle: { width: 2, color: '#F97316' }, itemStyle: { color: '#F97316' },
        label: { ...labelPill.value, formatter: (v: any) => cop(v.value) }, labelLayout: { hideOverlap: true } }] : []),
    ],
  }, per.length > 0)
})

// ---------------------------------------------------------------- Distribución (donas)
function dona(lista: { nombre: string; valor: number; color: string; extra?: string }[], centro: string, unidad: (v: number) => string) {
  const total = lista.reduce((a, x) => a + x.valor, 0)
  return vacio({
    ...base(),
    title: {
      text: m3Lbl(total), subtext: centro, left: '49%', top: '36%', textAlign: 'center',
      textStyle: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: isLight.value ? '#0f172a' : '#f1f5f9' },
      subtextStyle: { fontFamily: FONT, fontSize: 11, color: chartTextColor.value },
    },
    tooltip: { trigger: 'item' as const, formatter: (p: any) => { const x = lista[p.dataIndex]; return `${punto(p.color)} <b>${x.nombre}</b><br/>${unidad(x.valor)} (${pct(p.percent)})${x.extra ? `<br/>${x.extra}` : ''}` } },
    legend: {
      type: 'scroll' as const, orient: 'horizontal' as const, left: 'center', bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 12,
      textStyle: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
    },
    series: [{
      type: 'pie' as const, radius: ['40%', '62%'], center: ['50%', '44%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      data: lista.map(x => {
        const chica = total ? x.valor / total < 0.04 : false
        return { name: x.nombre, value: +x.valor.toFixed(1), itemStyle: { color: x.color }, label: { show: !chica }, labelLine: { show: !chica } }
      }),
      label: { formatter: (p: any) => pct(p.percent, 0), fontSize: 11, fontWeight: 600, fontFamily: FONT, color: chartTextColor.value },
    }],
  }, lista.length > 0)
}
const agrupar = (clave: (r: Tanqueo) => string) => {
  const m = new Map<string, { galones: number; costo: number }>()
  for (const r of rs.value) { const k = clave(r); const e = m.get(k) ?? { galones: 0, costo: 0 }; e.galones += r.galones; e.costo += r.costo; m.set(k, e) }
  return [...m.entries()].sort((a, b) => b[1].galones - a[1].galones)
}
const optGalonesPlanta = computed(() => dona(plantas.value.map(p => ({ nombre: p, valor: P.value[p].galones, color: color(p), extra: cop(P.value[p].costo) })), 'galones', v => fmtN(v) + ' gal'))
const optProducto = computed(() => dona(agrupar(r => r.producto).map(([n, v], i) => ({ nombre: titulo(n), valor: v.galones, color: PALETA[(i % (PALETA.length - 1)) + 1], extra: cop(v.costo) })), 'galones', v => fmtN(v) + ' gal'))
const optTipoVehiculo = computed(() => {
  const l = agrupar(r => r.tipo)
  // Más de 7 tipos: el resto se agrupa en «Otros» para que la dona siga legible
  const top = l.slice(0, 7), resto = l.slice(7)
  const lista = top.map(([n, v], i) => ({ nombre: n, valor: v.galones, color: PALETA[(i % (PALETA.length - 1)) + 1], extra: cop(v.costo) }))
  if (resto.length) lista.push({ nombre: 'Otros', valor: resto.reduce((a, [, v]) => a + v.galones, 0), color: '#94a3b8', extra: cop(resto.reduce((a, [, v]) => a + v.costo, 0)) })
  return dona(lista, 'galones', v => fmtN(v) + ' gal')
})

// ---------------------------------------------------------------- Por placa
interface PlacaRes { placa: string; tipo: string; costo: number; galones: number; vales: number; horas: number; galHoras: number; porPlanta: Record<string, number> }
const porPlaca = computed<PlacaRes[]>(() => {
  const m = new Map<string, PlacaRes>()
  for (const r of rs.value) {
    const e = m.get(r.placa) ?? { placa: r.placa, tipo: r.tipo, costo: 0, galones: 0, vales: 0, horas: 0, galHoras: 0, porPlanta: {} }
    e.costo += r.costo; e.galones += r.galones; e.vales++
    e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + r.costo
    if (horometroValido(r)) { e.horas += r.horas; e.galHoras += r.galones }
    m.set(r.placa, e)
  }
  return [...m.values()]
})
const principal = (x: PlacaRes) => Object.entries(x.porPlanta).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
function opcionPlacas(lista: PlacaRes[]) {
  const ps = plantas.value.filter(p => lista.some(x => x.porPlanta[p]))
  const txt = (x: PlacaRes) => `${copCorto(x.costo)} · ${m3Lbl(x.galones)} gal`
  return vacio({
    // Una barra por placa (sin apilar), con el color de la planta donde más tanqueó
    ...barrasH(lista.map(x => x.placa), [
      { name: 'Costo', type: 'bar', barWidth: '65%', emphasis,
        data: lista.map(x => ({ value: Math.round(x.costo), itemStyle: { color: color(principal(x)), borderRadius: [0, 4, 4, 0] } })),
        label: { ...labelPill.value, position: 'right', formatter: (v: any) => txt(lista[v.dataIndex]) } },
      // Series vacías solo para que la leyenda muestre el color de cada planta
      ...ps.map(p => ({ name: p, type: 'bar', data: [], itemStyle: { color: color(p) } })),
    ], lista.map(txt), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const e = lista[params[0].dataIndex]
        return `<b>${e.placa}</b> <span style="color:#94a3b8">· ${e.tipo}</span><br/>` +
          ps.filter(p => e.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${cop(e.porPlanta[p])}</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${cop(e.costo)}</b> · ${fmtN(e.galones)} gal en ${e.vales} tanqueos` +
          (e.horas ? `<br/>${punto('#06B6D4')} ${fmtN(e.galHoras / e.horas, 2)} gal por hora de horómetro` : '') },
    }, ps.length > 1),
    ...(ps.length > 1 ? { legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))) } : {}),
  }, lista.length > 0)
}
const placasPorCosto = computed(() => [...porPlaca.value].sort((a, b) => b.costo - a.costo))
const optPlacas = computed(() => opcionPlacas(placasPorCosto.value.slice(0, TOP)))
const optPlacasTodas = computed(() => opcionPlacas(placasPorCosto.value))

// Galones por hora de horómetro: se exigen al menos 20 h para que un tanqueo suelto no distorsione
function opcionGalHora(lista: PlacaRes[]) {
  const prom = T.value.horas ? T.value.galHoras / T.value.horas : 0
  return vacio(barrasH(lista.map(x => x.placa), [{
    name: 'gal/h', type: 'bar', barWidth: '65%', emphasis,
    data: lista.map(x => { const v = x.galHoras / x.horas; return { value: +v.toFixed(2), itemStyle: { color: v > prom * 1.25 ? '#EF4444' : AZUL, borderRadius: [0, 4, 4, 0] } } }),
    label: { ...labelPill.value, position: 'right', formatter: (v: any) => fmtN(v.value, 2) + ' gal/h' },
    markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#94a3b8', type: 'dashed' as const, width: 1.5 }, data: [{ xAxis: +prom.toFixed(2) }] },
  }], lista.map(x => fmtN(x.galHoras / x.horas, 2) + ' gal/h'), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const e = lista[params[0].dataIndex]
      return `<b>${e.placa}</b> <span style="color:#94a3b8">· ${e.tipo}</span><br/>${punto(AZUL)} <b>${fmtN(e.galHoras / e.horas, 2)} gal/h</b> (promedio general ${fmtN(prom, 2)})<br/>` +
        `${fmtN(e.galHoras)} gal en ${fmtN(e.horas, 0)} h de horómetro · ${cop(e.costo)}` },
  }, false), lista.length > 0)
}
const placasPorGalHora = computed(() => porPlaca.value.filter(x => x.horas >= 20).sort((a, b) => b.galHoras / b.horas - a.galHoras / a.horas))
const optGalHora = computed(() => opcionGalHora(placasPorGalHora.value.slice(0, TOP)))
const optGalHoraTodas = computed(() => opcionGalHora(placasPorGalHora.value))

// ---------------------------------------------------------------- Rendimiento de carga (m³ por galón)
// Cruza los m³ de concreto de cada mixer (remisiones, campo Mixer) con sus galones tanqueados en el período
const rendimiento = computed(() => {
  const m3 = new Map<string, number>(), viajes = new Map<string, number>()
  for (const r of (concretoStore.data?.rows ?? []) as Record<string, unknown>[]) {
    if (typeof r['Fecha'] !== 'number' || esAgregado(r['Mezcla'], r['Cliente'], r['Planta'])) continue
    const iso = isoDe(r['Fecha'] as number)
    if (iso < rango.value.desde || iso > rango.value.hasta) continue
    const placa = String(r['Mixer'] ?? '').trim().toUpperCase()
    if (!placa) continue
    m3.set(placa, (m3.get(placa) ?? 0) + num(r['Cant. Concreto'])); viajes.set(placa, (viajes.get(placa) ?? 0) + 1)
  }
  return porPlaca.value
    .filter(x => (m3.get(x.placa) ?? 0) > 0 && x.galones >= 20)
    .map(x => ({ ...x, m3: m3.get(x.placa) ?? 0, viajes: viajes.get(x.placa) ?? 0, m3Gal: (m3.get(x.placa) ?? 0) / x.galones }))
    .sort((a, b) => b.m3Gal - a.m3Gal)
})
function opcionRendimiento(lista: typeof rendimiento.value) {
  const prom = lista.reduce((a, x) => a + x.m3, 0) / (lista.reduce((a, x) => a + x.galones, 0) || 1)
  return vacio(barrasH(lista.map(x => x.placa), [{
    name: 'm³/gal', type: 'bar', barWidth: '65%', emphasis,
    data: lista.map(x => ({ value: +x.m3Gal.toFixed(2), itemStyle: { color: x.m3Gal < prom * 0.8 ? '#EF4444' : '#10B981', borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (v: any) => fmtN(v.value, 2) + ' m³/gal' },
    markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#94a3b8', type: 'dashed' as const, width: 1.5 }, data: [{ xAxis: +prom.toFixed(2) }] },
  }], lista.map(x => fmtN(x.m3Gal, 2) + ' m³/gal'), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const e = lista[params[0].dataIndex]
      return `<b>${e.placa}</b> <span style="color:#94a3b8">· ${e.tipo}</span><br/>${punto('#10B981')} <b>${fmtN(e.m3Gal, 2)} m³ por galón</b> (promedio ${fmtN(prom, 2)})<br/>` +
        `${fmtN(e.m3)} m³ en ${e.viajes} viajes · ${fmtN(e.galones)} gal · ${cop(e.costo)}<br/>${cop(e.m3 ? e.costo / e.m3 : 0)} de combustible por m³` },
  }, false), lista.length > 0)
}
const optRendimiento = computed(() => opcionRendimiento(rendimiento.value.slice(0, TOP)))
const optRendimientoTodos = computed(() => opcionRendimiento(rendimiento.value))

// ---------------------------------------------------------------- Por día
const optDiario = computed(() => {
  const ps = plantas.value
  const m = new Map<string, Record<string, number>>()
  for (const r of rs.value) { if (r.sinFecha) continue; const e = m.get(r.iso) ?? {}; e[r.planta] = (e[r.planta] ?? 0) + r.galones; m.set(r.iso, e) }
  const dias = [...m.keys()].sort()
  const tot = (d: string) => Object.values(m.get(d) ?? {}).reduce((a, v) => a + v, 0)
  const z = zoom(dias.length)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => { const d = dias[params[0].dataIndex]
        return `<b>${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}</b><br/>` +
          ps.filter(p => m.get(d)?.[p]).map(p => `${punto(color(p))} ${p}: <b>${fmtN(m.get(d)![p])} gal</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(tot(d))} gal</b>` } },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    dataZoom: z.dataZoom,
    grid: { left: 20, right: 30, bottom: z.gridBottom, top: 50, containLabel: true },
    xAxis: ejeX(dias.map(d => `${d.slice(8, 10)}/${d.slice(5, 7)}`)),
    yAxis: ejeY(),
    // Barras agrupadas por planta (sin apilar); las cifras se ocultan si no caben
    series: ps.map(p => ({
      name: p, type: 'bar' as const, barMaxWidth: 14, barGap: '10%', emphasis,
      data: dias.map(d => +(m.get(d)?.[p] ?? 0).toFixed(1)),
      itemStyle: { color: color(p), borderRadius: [3, 3, 0, 0] as any },
      label: { ...labelPill.value, position: 'top' as const, distance: 2, fontSize: 9, padding: [1, 3] as [number, number], formatter: (v: any) => (v.value ? m3Lbl(v.value) : '') },
      labelLayout: { hideOverlap: true },
    })),
  }, dias.length > 0)
})
</script>

<style scoped>
.combustible-tab { display: flex; flex-direction: column; }
.gt-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 12px 16px; margin-bottom: 20px;
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg);
}
.gt-info { display: flex; flex-direction: column; gap: 2px; }
.gt-tag { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--accent); }
.gt-periodo { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.gt-sub { font-size: 12px; color: var(--text-tertiary); }
.gt-vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }
.gt-gran { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.gt-gran-lbl { font-size: 12px; color: var(--text-tertiary); margin-right: 6px; }
.gt-gran-btn {
  white-space: nowrap; padding: 6px 14px; border: 1px solid var(--card-border); background: transparent; color: var(--text-secondary);
  font-size: 13px; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast);
}
.gt-gran-btn:hover { color: var(--text-primary); border-color: var(--card-border-hover); }
.gt-gran-btn.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); font-weight: 600; }
.section-sub { font-size: 12px; color: var(--text-tertiary); margin: 6px 0 0; }



/* Mismo tratamiento de títulos y KPIs que el resto de Mantenimiento */
.kpi-row { margin-bottom: 4px; }
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 0; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.charts-grid { margin-top: 16px; }
.charts-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }
</style>
