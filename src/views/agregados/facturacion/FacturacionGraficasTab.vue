<template>
  <div class="fact-graficas">
    <div v-if="!ventas.length && !lineas.length" class="vacio">No hay líneas con los filtros seleccionados.</div>

    <template v-else>
      <p class="periodo">
        <strong>{{ periodoTxt }}</strong> · {{ fmtN(R.lineas, 0) }} líneas de venta en {{ fmtN(R.remisiones, 0) }} remisiones
      </p>

      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Ventas por familia y material</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Venta por Familia" description="Venta antes de IVA y toneladas vendidas; los fletes suman a la venta pero no a las toneladas" :option="optFamilias" :height="300" />
        <ChartCard :title="`Toneladas por Material — Top ${TOP}`" description="Toneladas vendidas y trasladadas de cada material (m³ convertidos con el factor de cada material)" :option="optToneladas" :expand-option="optToneladasTodos" :height="380" />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Precio Promedio por Tonelada" description="Venta de cada material ÷ sus toneladas; en el detalle, el rango de precios de sus líneas" :option="optPrecios" :expand-option="optPreciosTodos" :height="380" />
        <ChartCard title="Toneladas Despachadas por Tipo" description="Venta, traslados de inventario y donaciones (por subtipo del documento)" :option="optTipos" :height="380" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Clientes</h3>
      <div class="charts-grid cols-1">
        <ChartCard :title="`Clientes por Venta — Top ${TOP}`" :description="clienteTop ? `El principal cliente es ${clienteTop.cliente}: ${cop(clienteTop.venta)} (${pct(clienteTop.part)} de la venta) · color de la familia que más compra` : ''" :option="optClientes" :expand-option="optClientesTodos" :height="400" />
      </div>

      <template v-if="dias.length > 1">
        <h3 class="section-title"><span class="title-bar"></span>Tendencia diaria</h3>
        <div class="charts-grid cols-1">
          <ChartCard title="Venta Diaria por Familia" description="Venta antes de IVA por día y familia de material, barras lado a lado" :option="optDiaria" :height="360" />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionGraficasTab.vue — Tablero gráfico de la facturación de agregados (/:planta/facturacion/graficas).
 * Recibe las líneas ya filtradas desde FacturacionView; los cálculos salen de useFacturacion.
 */
import { computed } from 'vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { useEstiloGraficas, fmtN, cop, copCorto, pct, punto, vacio, emphasis, FONT } from '../../../composables/useGraficasConcreto'
import {
  resumen, porFamilia, porMaterial, porCliente, porDia, toneladasPorProducto, nombreMaterial, fechaLarga,
  COLOR_FAMILIA, COLOR_TIPO, esVenta, FAMILIAS,
} from '../../../composables/useFacturacion'
import type { Familia, LineaFacturacion } from '../../../types/facturacion'

const props = defineProps<{
  lineas: LineaFacturacion[]
  /** Líneas con todos los filtros menos el de fechas (lo usa el informe) */
  lineasSinFecha?: LineaFacturacion[]
  planta: string
  plantaId: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  subtipos: Record<string, string>
}>()

const TOP = 10
const { isLight, chartTextColor, tinta, labelPill, base, leyenda, ejeX, ejeY, barrasH, movil } = useEstiloGraficas()
const tFmt = (n: number) => fmtN(n, n >= 100 ? 0 : 1)

const ventas = computed(() => props.lineas.filter(esVenta))
const R = computed(() => resumen(props.lineas))
const fechas = computed(() => [...new Set(props.lineas.map(l => l.fecha))].sort())
const periodoTxt = computed(() => {
  const f = fechas.value
  if (!f.length) return ''
  return f.length === 1 ? fechaLarga(f[0]) : `${fechaLarga(f[0])} al ${fechaLarga(f[f.length - 1])}`
})

const fila = (color: string, label: string, valor: string) =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-label-int' style='color:${color}'>${label}</span> <strong>${valor}</strong></div>`

const familias = computed(() => porFamilia(props.lineas))
const kpis = computed(() => {
  const r = R.value
  const detFam = (v: (f: ReturnType<typeof porFamilia>[number]) => string) =>
    familias.value.filter(f => f.familia !== 'Fletes').map(f => fila(COLOR_FAMILIA[f.familia], f.familia, v(f))).join('')
  return [
    { label: 'Venta (sin IVA)', value: cop(r.venta), icon: 'dollar', accent: '#3B82F6',
      detail: detFam(f => `${cop(f.venta)} <span style='color:var(--text-tertiary)'>(${pct(f.part)})</span>`) + (r.fletes ? fila(COLOR_FAMILIA.Fletes, 'Fletes', cop(r.fletes)) : '') },
    { label: 'Toneladas Despachadas', value: `${tFmt(r.tDespachadas)} t`, icon: 'truck', accent: '#15223c',
      detail: fila(COLOR_TIPO.venta, 'Vendidas', `${tFmt(r.tVendidas)} t`) + fila(COLOR_TIPO.traslado, 'Traslados', `${tFmt(r.tTraslados)} t`) },
    { label: 'Precio Promedio por t', value: r.precioT ? cop(r.precioT) : '—', icon: 'target', accent: '#F59E0B',
      detail: detFam(f => (f.precioT ? cop(f.precioT) : '—')) },
    { label: 'Remisiones', value: fmtN(r.remisiones, 0), icon: 'list', accent: '#8B5CF6',
      detail: detFam(f => fmtN(f.remisiones, 0)) + (r.remisiones ? fila(tinta.value, 'Ticket', cop(r.venta / r.remisiones)) : '') },
    { label: 'Clientes Activos', value: fmtN(r.clientes, 0), icon: 'users', accent: '#10B981',
      detail: r.clientes ? fila('#10B981', 'Por cliente', cop(r.venta / r.clientes)) : '' },
    { label: 'Toneladas Vendidas', value: `${tFmt(r.tVendidas)} t`, icon: 'package', accent: '#3B82F6', detail: detFam(f => `${tFmt(f.t)} t`) },
    { label: 'Traslados de Inventario', value: `${tFmt(r.traslados.t)} t`, icon: 'layers', accent: '#64748B',
      detail: fila('#64748B', 'Documentos', fmtN(r.traslados.docs, 0)) + fila('#64748B', 'Subtipo', '003') },
    { label: 'Donaciones', value: `${tFmt(r.donaciones.t)} t`, icon: 'check-circle', accent: '#10B981',
      detail: fila('#10B981', 'Valor', cop(r.donaciones.valor)) + fila('#10B981', 'Beneficiarios', fmtN(r.donaciones.beneficiarios, 0)) + fila('#10B981', 'Subtipo', '952') },
  ]
})

// ── Venta por familia ──
const optFamilias = computed(() => {
  const f = familias.value.filter(x => x.venta > 0)
  const txt = (x: typeof f[number]) => `${copCorto(x.venta)}${x.t ? ` · ${tFmt(x.t)} t` : ''}`
  return vacio(barrasH(f.map(x => x.familia), [{
    name: 'Venta', type: 'bar', barWidth: '55%', emphasis,
    data: f.map(x => ({ value: Math.round(x.venta), itemStyle: { color: COLOR_FAMILIA[x.familia], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(f[p.dataIndex]) },
  }], f.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = f[ps[0].dataIndex]
      return `<b>${x.familia}</b><br/>${punto(COLOR_FAMILIA[x.familia])} Venta: <b>${cop(x.venta)}</b> (${pct(x.part)})<br/>` +
        (x.t ? `${punto(tinta.value)} Toneladas: <b>${tFmt(x.t)} t</b> · ${x.precioT ? cop(x.precioT) + '/t' : ''}<br/>` : '') +
        `${punto('#8B5CF6')} Remisiones: <b>${x.remisiones}</b> · Clientes: <b>${x.clientes}</b>` },
  }, false), f.length > 0)
})

// ── Toneladas por material: vendidas y traslados lado a lado ──
const tonProducto = computed(() => toneladasPorProducto(props.lineas))
function opcionToneladas(lista: ReturnType<typeof toneladasPorProducto>) {
  const hayTras = lista.some(x => x.tTraslados > 0)
  const serie = (name: string, color: string, datos: number[]) => ({
    name, type: 'bar', barMaxWidth: 14, barGap: '15%', emphasis, data: datos.map(v => +v.toFixed(1)),
    itemStyle: { color, borderRadius: [0, 4, 4, 0] },
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => (p.value > 0 ? tFmt(p.value) : '') },
  })
  const series = [serie('Vendidas', COLOR_TIPO.venta, lista.map(x => x.tVendidas)), ...(hayTras ? [serie('Traslados', COLOR_TIPO.traslado, lista.map(x => x.tTraslados))] : [])]
  return vacio({
    ...barrasH(lista.map(x => nombreMaterial(x.producto)), series, lista.flatMap(x => [tFmt(x.tVendidas), tFmt(x.tTraslados)]), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = lista[ps[0].dataIndex]
        return `<b>${nombreMaterial(x.producto)}</b> <span style="color:#94a3b8">· registrado en ${x.registrado}${x.factor !== '—' ? ' ' + x.factor : ''}</span><br/>` +
          `${punto(COLOR_TIPO.venta)} Vendidas: <b>${tFmt(x.tVendidas)} t</b><br/>${punto(COLOR_TIPO.traslado)} Traslados: <b>${tFmt(x.tTraslados)} t</b><br/>` +
          `${punto(tinta.value)} Despachadas: <b>${tFmt(x.tDespachadas)} t</b>` + (x.tDonadas ? `<br/>${punto(COLOR_TIPO.donacion)} Donadas: <b>${tFmt(x.tDonadas)} t</b>` : '') },
    }, hayTras),
    ...(hayTras ? { legend: leyenda([{ name: 'Vendidas', itemStyle: { color: COLOR_TIPO.venta } }, { name: 'Traslados', itemStyle: { color: COLOR_TIPO.traslado } }]) } : {}),
  }, lista.length > 0)
}
const optToneladas = computed(() => opcionToneladas(tonProducto.value.slice(0, TOP)))
const optToneladasTodos = computed(() => opcionToneladas(tonProducto.value))

// ── Precio promedio por tonelada ──
const materiales = computed(() => porMaterial(props.lineas).filter(m => m.precioT))
function opcionPrecios(lista: ReturnType<typeof porMaterial>) {
  const orden = [...lista].sort((a, b) => (b.precioT ?? 0) - (a.precioT ?? 0))
  return vacio(barrasH(orden.map(x => nombreMaterial(x.producto)), [{
    name: 'Precio por t', type: 'bar', barWidth: '55%', emphasis,
    data: orden.map(x => ({ value: Math.round(x.precioT ?? 0), itemStyle: { color: COLOR_FAMILIA[x.familia], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => cop(p.value) },
  }], orden.map(x => cop(x.precioT ?? 0)), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = orden[ps[0].dataIndex]
      return `<b>${nombreMaterial(x.producto)}</b> <span style="color:#94a3b8">· ${x.familia}</span><br/>` +
        `${punto(COLOR_FAMILIA[x.familia])} Promedio: <b>${cop(x.precioT ?? 0)}/t</b><br/>` +
        (x.minT && x.maxT ? `${punto('#94a3b8')} Rango: ${cop(x.minT)} – ${cop(x.maxT)}<br/>` : '') +
        `${punto(tinta.value)} ${tFmt(x.t)} t · ${cop(x.venta)} · ${x.lineas} líneas` },
  }, false), orden.length > 0)
}
const optPrecios = computed(() => opcionPrecios(materiales.value.slice(0, TOP)))
const optPreciosTodos = computed(() => opcionPrecios(materiales.value))

// ── Toneladas por tipo (dona) ──
const optTipos = computed(() => {
  const r = R.value
  const datos = [
    { name: 'Venta', value: +r.tVendidas.toFixed(1), color: COLOR_TIPO.venta },
    { name: 'Traslados', value: +r.traslados.t.toFixed(1), color: COLOR_TIPO.traslado },
    { name: 'Donaciones', value: +r.donaciones.t.toFixed(1), color: COLOR_TIPO.donacion },
  ].filter(d => d.value > 0)
  const total = datos.reduce((a, d) => a + d.value, 0)
  return vacio({
    ...base(),
    title: {
      text: tFmt(total), subtext: 't despachadas', left: movil.value ? '49%' : '37%', top: movil.value ? '33%' : '44%', textAlign: 'center',
      textStyle: { fontFamily: FONT, fontSize: 18, fontWeight: 700, color: isLight.value ? '#0f172a' : '#f1f5f9' },
      subtextStyle: { fontFamily: FONT, fontSize: 11, color: chartTextColor.value },
    },
    tooltip: { trigger: 'item', formatter: (p: any) => `${punto(p.color)} <b>${p.name}</b><br/>${tFmt(p.value)} t (${pct(p.percent)})` },
    legend: {
      ...(movil.value ? { type: 'scroll' as const, orient: 'horizontal' as const, left: 'center', bottom: 0 } : { orient: 'vertical' as const, right: 10, top: 'middle' }),
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 12,
      textStyle: { fontFamily: FONT, fontWeight: 500 as const, color: chartTextColor.value, fontSize: 11 },
      formatter: (n: string) => { const d = datos.find(x => x.name === n); return d ? `${n}  ${tFmt(d.value)} t` : n },
    },
    series: [{
      type: 'pie', radius: movil.value ? ['38%', '60%'] : ['42%', '68%'], center: movil.value ? ['50%', '42%'] : ['38%', '55%'],
      itemStyle: { borderRadius: 2, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => pct(p.percent, 0), fontSize: 11, fontWeight: 600, fontFamily: FONT, color: chartTextColor.value },
      data: datos.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }],
  }, datos.length > 0)
})

// ── Clientes ──
const clientes = computed(() => porCliente(props.lineas))
const clienteTop = computed(() => clientes.value[0] ?? null)
const principal = (f: Partial<Record<Familia, number>>) => (Object.entries(f).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? 'Piedra y otros') as Familia
function opcionClientes(lista: ReturnType<typeof porCliente>) {
  const txt = (x: typeof lista[number]) => `${copCorto(x.venta)} · ${tFmt(x.t)} t`
  return vacio(barrasH(lista.map(x => x.cliente), [{
    name: 'Venta', type: 'bar', barWidth: '60%', emphasis,
    data: lista.map(x => ({ value: Math.round(x.venta), itemStyle: { color: COLOR_FAMILIA[principal(x.familias)], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(lista[p.dataIndex]) },
  }], lista.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = lista[ps[0].dataIndex]
      return `<b>${x.cliente}</b>${x.nit ? ` <span style="color:#94a3b8">· NIT ${x.nit}</span>` : ''}<br/>` +
        FAMILIAS.filter(f => x.familias[f]).map(f => `${punto(COLOR_FAMILIA[f])} ${f}: <b>${cop(x.familias[f] ?? 0)}</b>`).join('<br/>') +
        `<br/>${punto(tinta.value)} Total: <b>${cop(x.venta)}</b> (${pct(x.part)}) · ${tFmt(x.t)} t · ${x.remisiones} remisiones` },
  }, false), lista.length > 0)
}
const optClientes = computed(() => opcionClientes(clientes.value.slice(0, TOP)))
const optClientesTodos = computed(() => opcionClientes(clientes.value))

// ── Venta diaria por familia ──
const dias = computed(() => porDia(props.lineas))
const optDiaria = computed(() => {
  const d = dias.value
  const fams = FAMILIAS.filter(f => d.some(x => x.porFamilia[f]))
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = d[ps[0].dataIndex]
        return `<b>${fechaLarga(x.fecha)}</b><br/>` + fams.filter(f => x.porFamilia[f]).map(f => `${punto(COLOR_FAMILIA[f])} ${f}: <b>${cop(x.porFamilia[f] ?? 0)}</b>`).join('<br/>') +
          `<br/>${punto(tinta.value)} Total: <b>${cop(x.venta)}</b> · ${tFmt(x.tVendidas)} t · ${x.remisiones} remisiones` } },
    legend: leyenda(fams.map(f => ({ name: f, itemStyle: { color: COLOR_FAMILIA[f] } }))),
    grid: { left: 12, right: 20, bottom: 24, top: 40, containLabel: true },
    xAxis: ejeX(d.map(x => x.fecha.slice(8, 10) + '/' + x.fecha.slice(5, 7))),
    yAxis: ejeY(),
    series: fams.map(f => ({ name: f, type: 'bar', barMaxWidth: 16, barGap: '10%', emphasis,
      data: d.map(x => Math.round(x.porFamilia[f] ?? 0)), itemStyle: { color: COLOR_FAMILIA[f], borderRadius: [3, 3, 0, 0] } })),
  }, d.length > 0)
})
</script>

<style scoped>
.fact-graficas { display: flex; flex-direction: column; }
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
