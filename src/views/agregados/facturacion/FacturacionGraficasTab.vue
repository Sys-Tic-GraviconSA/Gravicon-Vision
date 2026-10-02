<template>
  <div class="fact-graficas">
    <div v-if="!ventas.length && !lineas.length" class="vacio">No hay líneas con los filtros seleccionados.</div>

    <template v-else>
      <!-- KPIs por grupo: totales, venta, y despacho y clientes (mismas tarjetas, ordenadas) -->
      <p class="kpi-grupo">Facturación del período</p>
      <div class="kpi-row g4 totales">
        <KpiCard v-for="k in kpisTotales" :key="k.label" v-bind="k" />
      </div>
      <p class="kpi-grupo">Venta</p>
      <div class="kpi-row g4">
        <KpiCard v-for="k in kpis.venta" :key="k.label" v-bind="k" />
      </div>
      <p class="kpi-grupo">Despacho y clientes</p>
      <div class="kpi-row g4">
        <KpiCard v-for="k in kpis.despacho" :key="k.label" v-bind="k" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Ventas por familia y material</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Venta por Familia" description="Venta antes de IVA y toneladas vendidas; los fletes suman a la venta pero no a las toneladas" :option="optFamilias" :height="300" />
        <ChartCard :title="`Toneladas por Material — Top ${TOP}`" description="Toneladas vendidas y trasladadas de cada material (m³ convertidos con el factor de cada material)" :option="optToneladas" :expand-option="optToneladasTodos" :height="380" />
      </div>
      <div class="charts-grid cols-1">
        <ChartCard title="Precio por Tonelada y su Rango" description="Barra: precio promedio (venta ÷ toneladas) · marcas: rango habitual de precio de sus líneas (del 10 % más barato al 10 % más caro). Un rango ancho indica descuentos o precios distintos por cliente." :option="optPrecios" :expand-option="optPreciosTodos" :height="400" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Clientes</h3>
      <div class="charts-grid cols-1">
        <ChartCard :title="`Clientes por Venta — Top ${TOP}`" :description="clienteTop ? `El principal cliente es ${clienteTop.cliente}: ${cop(clienteTop.venta)} (${pct(clienteTop.part)} de la venta) · cada cliente con su color (el mismo en el Pareto); en el detalle, qué familias compra` : ''" :option="optClientes" :expand-option="optClientesTodos" :height="400" />
      </div>
      <div v-if="pareto.filas.length > 1" class="charts-grid cols-1">
        <ChartCard :title="`Concentración de Clientes (Pareto) — Top ${paretoN}`" :description="paretoTxt" :option="optPareto" :expand-option="optParetoTodos" :height="360" />
      </div>
      <div v-if="variacion" class="charts-grid cols-1">
        <ChartCard title="Clientes que Más Cambiaron frente al Período Anterior" :description="variacionTxt" :option="optVariacion" :height="380" />
      </div>

      <template v-if="diasVenta.length > 1">
        <h3 class="section-title"><span class="title-bar"></span>Ritmo de venta</h3>
        <div class="charts-grid cols-2">
          <ChartCard :title="proyeccion ? 'Venta Acumulada y Proyección de Cierre' : 'Venta Acumulada del Período'" :description="acumTxt" :option="optAcumulado" :height="340" />
          <ChartCard title="Venta Promedio por Día de la Semana" :description="semanaTxt" :option="optSemana" :height="340" />
        </div>
      </template>

      <template v-if="dias.length > 1">
        <h3 class="section-title"><span class="title-bar"></span>Tendencia diaria</h3>
        <div class="charts-grid cols-1">
          <ChartCard title="Venta Diaria frente al Promedio" :description="`Venta antes de IVA de cada día: verde si superó el promedio de los días con venta (${diasVenta.length ? copCorto(R.venta / diasVenta.length) : '—'}), rojo si quedó por debajo · en el detalle, la venta por familia`" :option="optDiaria" :height="340" />
        </div>
        <div class="charts-grid cols-1">
          <ChartCard title="Toneladas Despachadas por Día" :description="`Toneladas vendidas${R.tTraslados ? ' y trasladadas' : ''} cada día, lado a lado${R.tTraslados ? ' (juntas son las despachadas)' : ''}${fleteDia.size ? '; Flete Holcim: toneladas que se le transportaron a Holcim, ya incluidas en las vendidas (no se suman)' : ''}`" :option="optToneladasDia" :height="340" />
        </div>
        <div class="charts-grid cols-1">
          <ChartCard title="Ticket Promedio por Remisión" :description="`Venta del día ÷ remisiones del día (incluye fletes): los picos señalan días con pedidos grandes; la línea punteada es el promedio del período: ${R.remisiones ? cop(R.venta / R.remisiones) : '—'}`" :option="optTicket" :height="300" />
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
import { use } from 'echarts/core'
import { LabelLayout } from 'echarts/features'
import { ScatterChart } from 'echarts/charts'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { useEstiloGraficas, fmtN, cop, copCorto, pct, punto, vacio, emphasis, FONT } from '../../../composables/useGraficasConcreto'
import {
  resumen, porFamilia, porMaterial, porCliente, porDia, toneladasPorProducto, nombreMaterial, fechaLarga, fechaCorta,
  porDiaSemana, paretoClientes, proyeccionDiaria, cierreEstimado, totalesFacturacion,
  COLOR_FAMILIA, COLOR_TIPO, esVenta, esMaterial, esFleteHolcim, FAMILIAS,
} from '../../../composables/useFacturacion'
import { inicioFacturacionCompleta } from '../../../composables/useBalanceProduccion'
import type { LineaFacturacion } from '../../../types/facturacion'

// LabelLayout oculta las etiquetas que se tocarían en las series largas; Scatter dibuja las marcas del rango de precios
use([LabelLayout, ScatterChart])

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
const { isLight, chartTextColor, tinta, labelPill, base, leyenda, ejeX, ejeY, zoom, barrasH, movil, ventana } = useEstiloGraficas()
const VERDE = '#16A34A', ROJO = '#DC2626'

// Un color propio por cliente del Top 10 (el mismo en el ranking, el Pareto y el detalle); el resto en gris
const COLORES_CLIENTE = ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#E11D48', '#6366F1']
const grisResto = computed(() => (isLight.value ? '#cbd5e1' : '#475569'))
const colorCliente = (rango: number) => (rango >= 1 && rango <= COLORES_CLIENTE.length ? COLORES_CLIENTE[rango - 1] : grisResto.value)
const tFmt = (n: number) => fmtN(n, n >= 100 ? 0 : 1)

const ventas = computed(() => props.lineas.filter(esVenta))
const R = computed(() => resumen(props.lineas))
const fechas = computed(() => [...new Set(props.lineas.map(l => l.fecha))].sort())

const fila = (color: string, label: string, valor: string) =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-label-int' style='color:${color}'>${label}</span> <strong>${valor}</strong></div>`

const familias = computed(() => porFamilia(props.lineas))
const kpis = computed(() => {
  const r = R.value, dv = diasVenta.value, n = dv.length
  const detFam = (v: (f: ReturnType<typeof porFamilia>[number]) => string) =>
    familias.value.filter(f => f.familia !== 'Fletes').map(f => fila(COLOR_FAMILIA[f.familia], f.familia, v(f))).join('')
  const mejor = [...dv].sort((a, b) => b.venta - a.venta)[0]
  const menor = [...dv].sort((a, b) => a.venta - b.venta)[0]
  const fuerte = semanaFuerte.value
  const { filas, n80 } = pareto.value
  const acum = (k: number) => filas[Math.min(k, filas.length) - 1]?.acumPct ?? 0
  const c = proyeccion.value
  const traslados = { label: 'Traslados de Inventario', value: `${tFmt(r.traslados.t)} t`, icon: 'layers', accent: '#64748B',
    detail: fila('#64748B', 'Documentos', fmtN(r.traslados.docs, 0)) + fila('#64748B', 'Subtipo', '003') }
  const donaciones = { label: 'Donaciones', value: `${tFmt(r.donaciones.t)} t`, icon: 'check-circle', accent: '#10B981',
    detail: fila('#10B981', 'Valor', cop(r.donaciones.valor)) + fila('#10B981', 'Beneficiarios', fmtN(r.donaciones.beneficiarios, 0)) + fila('#10B981', 'Subtipo', '952') }
  const tarjeta = {
    venta: { label: 'Venta (sin IVA)', value: cop(r.venta), icon: 'dollar', accent: '#3B82F6',
      detail: detFam(f => `${cop(f.venta)} <span style='color:var(--text-tertiary)'>(${pct(f.part)})</span>`) + (r.fletes ? fila(COLOR_FAMILIA.Fletes, 'Fletes', cop(r.fletes)) : '') },
    toneladas: { label: 'Toneladas Despachadas', value: `${tFmt(r.tDespachadas)} t`, icon: 'truck', accent: '#15223c',
      detail: fila(COLOR_TIPO.venta, 'Vendidas', `${tFmt(r.tVendidas)} t`) + fila(COLOR_TIPO.traslado, 'Traslados', `${tFmt(r.tTraslados)} t`) +
        (r.donaciones.t ? fila(COLOR_TIPO.donacion, 'Donadas', `${tFmt(r.donaciones.t)} t`) : '') +
        (n ? fila(tinta.value, 'Vendidas por día', `${tFmt(r.tVendidas / n)} t`) : '') },
    precio: { label: 'Precio Promedio por t', value: r.precioT ? cop(r.precioT) : '—', icon: 'target', accent: '#F59E0B',
      detail: detFam(f => (f.precioT ? cop(f.precioT) : '—')) },
    remisiones: { label: 'Remisiones', value: fmtN(r.remisiones, 0), icon: 'list', accent: '#8B5CF6',
      detail: detFam(f => fmtN(f.remisiones, 0)) + (r.remisiones ? fila(tinta.value, 'Ticket', cop(r.venta / r.remisiones)) + fila(tinta.value, 'Por remisión', `${tFmt(r.tVendidas / r.remisiones)} t`) : '') },
    clientes: { label: 'Clientes Activos', value: fmtN(r.clientes, 0), icon: 'users', accent: '#10B981',
      detail: (r.clientes ? fila('#10B981', 'Venta por cliente', cop(r.venta / r.clientes)) : '') +
        (filas.length ? fila('#8B5CF6', 'Hacen el 80 %', `${n80} ${n80 === 1 ? 'cliente' : 'clientes'}`) + fila('#8B5CF6', 'Principal', pct(acum(1))) + (filas.length > 5 ? fila('#8B5CF6', 'Top 5', pct(acum(5))) : '') : '') },
    promedio: { label: 'Venta Promedio Diaria', value: n ? cop(r.venta / n) : '—', icon: 'activity', accent: '#3B82F6',
      detail: fila(tinta.value, 'Días con venta', fmtN(n, 0)) + (mejor ? fila(VERDE, 'Mejor día', `${fechaCorta(mejor.fecha)} · ${copCorto(mejor.venta)}`) : '') +
        (menor && n > 1 ? fila(ROJO, 'Más bajo', `${fechaCorta(menor.fecha)} · ${copCorto(menor.venta)}`) : '') +
        (fuerte && n > 6 ? fila(COLOR_TIPO.venta, 'Día más fuerte', `${fuerte.nombre.toLowerCase()} · ${copCorto(fuerte.promVenta)}`) : '') },
  }
  const cierre = c
    ? [{ label: 'Cierre Estimado del Mes', value: cop(c.cierre.valor), icon: 'trending-up', accent: '#F59E0B',
        detail: fila(COLOR_TIPO.venta, 'Vendido', cop(r.venta)) + fila('#F59E0B', 'Por vender', cop(c.cierre.valor - r.venta)) +
          (n ? fila(tinta.value, 'Promedio diario', cop(r.venta / n)) : '') +
          fila('#94a3b8', 'Faltan', `${c.cierre.faltan} ${c.cierre.faltan === 1 ? 'día' : 'días'} de venta`) }]
    : []
  return {
    // Venta: cuánto, a qué ritmo (o cierre estimado a mitad de mes), a qué precio y en cuántas remisiones
    venta: [tarjeta.venta, ...(cierre.length ? cierre : [tarjeta.promedio]), tarjeta.precio, tarjeta.remisiones],
    // Despacho y clientes: toneladas que salieron, traslados, donaciones y a quién se vendió
    despacho: [tarjeta.toneladas, traslados, donaciones, tarjeta.clientes],
  }
})

// Totales del período: toneladas y valor facturado, normales y sin flete Holcim, donaciones ni traslados
const kpisTotales = computed(() => {
  const x = totalesFacturacion(props.lineas)
  return [
    // Valor: todo lo facturado y sin flete Holcim ni donaciones (los traslados no tienen valor)
    { label: 'Facturación Total', value: cop(x.valorTotal), icon: 'dollar', accent: '#3B82F6',
      detail: fila(COLOR_TIPO.venta, 'Material', cop(x.ventaMaterial)) +
        (x.fleteHolcim ? fila(COLOR_FAMILIA.Fletes, 'Flete Holcim', cop(x.fleteHolcim)) : '') +
        (x.otrosFletes ? fila(COLOR_FAMILIA.Fletes, 'Otros fletes', cop(x.otrosFletes)) : '') +
        fila(COLOR_TIPO.traslado, 'Traslados', 'sin valor') +
        fila(COLOR_TIPO.donacion, 'Donaciones', cop(x.valorDonado)) },
    // Netas: el desglose parte del total y resta, así la cuenta cuadra a la vista
    { label: 'Facturación Neta', value: cop(x.valorNeto), icon: 'check-circle', accent: '#0F766E',
      detail: fila(tinta.value, 'Total', cop(x.valorTotal)) +
        fila(COLOR_FAMILIA.Fletes, 'Flete Holcim', x.fleteHolcim ? `− ${cop(x.fleteHolcim)}` : 'no hay') +
        fila(COLOR_TIPO.traslado, 'Traslados', '− $ 0') +
        fila(COLOR_TIPO.donacion, 'Donaciones', `− ${cop(x.valorDonado)}`) },
    // Toneladas: todo lo que salió y solo lo vendido (el flete no tiene toneladas)
    { label: 'Toneladas Totales', value: `${tFmt(x.tTotal)} t`, icon: 'truck', accent: '#15223c',
      detail: fila(COLOR_TIPO.venta, 'Vendidas', `${tFmt(x.tVendidas)} t`) +
        (x.tFleteHolcim ? fila(COLOR_FAMILIA.Fletes, 'Flete', `${tFmt(x.tFleteHolcim)} t <span style='color:var(--text-tertiary);font-weight:500'>(en vendidas)</span>`) : '') +
        fila(COLOR_TIPO.traslado, 'Traslados', `${tFmt(x.tTraslados)} t`) + fila(COLOR_TIPO.donacion, 'Donadas', `${tFmt(x.tDonadas)} t`) },
    { label: 'Toneladas Netas', value: `${tFmt(x.tNeta)} t`, icon: 'package', accent: '#0F766E',
      detail: fila(tinta.value, 'Total', `${tFmt(x.tTotal)} t`) +
        (x.tFleteHolcim ? fila(COLOR_FAMILIA.Fletes, 'Flete Holcim', `− ${tFmt(x.tFleteHolcim)} t`) : '') +
        fila(COLOR_TIPO.traslado, 'Traslados', `− ${tFmt(x.tTraslados)} t`) +
        fila(COLOR_TIPO.donacion, 'Donadas', `− ${tFmt(x.tDonadas)} t`) },
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

// ── Precio por tonelada con su rango habitual (percentiles 10 y 90 de las líneas; ignora extremos sueltos) ──
const materiales = computed(() => porMaterial(props.lineas).filter(m => m.precioT))
const percentil = (xs: number[], p: number) => { const o = [...xs].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.max(0, Math.round((o.length - 1) * p)))] }
const rangoPrecio = computed(() => {
  const g = new Map<string, number[]>()
  for (const l of props.lineas) {
    if (!esVenta(l) || !esMaterial(l) || l.toneladas <= 0 || l.total <= 0) continue
    g.set(l.producto, [...(g.get(l.producto) ?? []), l.total / l.toneladas])
  }
  return new Map([...g].map(([k, xs]) => [k, xs.length >= 5 ? { p10: percentil(xs, 0.1), p90: percentil(xs, 0.9) } : null]))
})
function opcionPrecios(lista: ReturnType<typeof porMaterial>) {
  const orden = [...lista].sort((a, b) => (b.precioT ?? 0) - (a.precioT ?? 0))
  const rango = orden.map(x => rangoPrecio.value.get(x.producto) ?? null)
  const marca = (name: string, valores: (number | null)[]) => ({
    name, type: 'scatter', symbol: 'rect', symbolSize: [3, 16], z: 3, silent: true,
    itemStyle: { color: tinta.value, opacity: 0.85 },
    data: valores.map((v, i) => (v == null ? null : [Math.round(v), i])),
  })
  // Precios en pesos completos (sin abreviar)
  const texto = (i: number) => { const x = orden[i], r = rango[i]
    return r ? `${cop(x.precioT ?? 0)}  ·  rango ${cop(r.p10)} – ${cop(r.p90)}` : cop(x.precioT ?? 0) }
  const o = barrasH(orden.map(x => nombreMaterial(x.producto)), [
    { name: 'Precio promedio', type: 'bar', barWidth: '50%', emphasis,
      data: orden.map(x => ({ value: Math.round(x.precioT ?? 0), itemStyle: { color: COLOR_FAMILIA[x.familia], borderRadius: [0, 4, 4, 0], opacity: 0.9 } })) },
    marca('Desde', rango.map(r => r?.p10 ?? null)),
    marca('Hasta', rango.map(r => r?.p90 ?? null)),
    // El texto va después de lo que quede más a la derecha (fin de la barra o marca «hasta»), para no taparse
    { name: 'Etiqueta', type: 'scatter', symbolSize: 0, silent: true, z: 4,
      data: orden.map((x, i) => [Math.round(Math.max(x.precioT ?? 0, rango[i]?.p90 ?? 0)), i]),
      label: { ...labelPill.value, show: true, position: 'right', distance: 8, formatter: (p: any) => texto(p.dataIndex) } },
  ], orden.map((_, i) => texto(i)), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const i = ps[0].dataIndex, x = orden[i], r = rango[i]
      return `<b>${nombreMaterial(x.producto)}</b> <span style="color:#94a3b8">· ${x.familia}</span><br/>` +
        `${punto(COLOR_FAMILIA[x.familia])} Precio promedio: <b>${cop(x.precioT ?? 0)}/t</b><br/>` +
        (r ? `${punto(tinta.value)} Rango habitual: <b>${cop(r.p10)} – ${cop(r.p90)}</b>/t<br/>` : '') +
        (x.minT && x.maxT ? `<span style="color:#94a3b8;font-size:11px">Extremos: ${cop(x.minT)} – ${cop(x.maxT)} /t</span><br/>` : '') +
        `<span style="color:#94a3b8;font-size:11px">${tFmt(x.t)} t · ${cop(x.venta)} · ${x.lineas} líneas</span>` },
  }, false)
  // El eje arranca en 0 para que la barra represente el precio completo
  return vacio({ ...o, xAxis: { ...(o.xAxis as object), min: 0 } }, orden.length > 0)
}
const optPrecios = computed(() => opcionPrecios(materiales.value.slice(0, TOP)))
const optPreciosTodos = computed(() => opcionPrecios(materiales.value))

// ── Clientes ──
const clientes = computed(() => porCliente(props.lineas))
const clienteTop = computed(() => clientes.value[0] ?? null)
function opcionClientes(lista: ReturnType<typeof porCliente>) {
  const txt = (x: typeof lista[number]) => `${copCorto(x.venta)} · ${tFmt(x.t)} t`
  return vacio(barrasH(lista.map(x => x.cliente), [{
    name: 'Venta', type: 'bar', barWidth: '60%', emphasis,
    data: lista.map((x, i) => ({ value: Math.round(x.venta), itemStyle: { color: colorCliente(i + 1), borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(lista[p.dataIndex]) },
  }], lista.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = lista[ps[0].dataIndex]
      return `${punto(colorCliente(ps[0].dataIndex + 1))} <b>${x.cliente}</b>${x.nit ? ` <span style="color:#94a3b8">· NIT ${x.nit}</span>` : ''}<br/>` +
        FAMILIAS.filter(f => x.familias[f]).map(f => `${punto(COLOR_FAMILIA[f])} ${f}: <b>${cop(x.familias[f] ?? 0)}</b>`).join('<br/>') +
        `<br/>${punto(tinta.value)} Total: <b>${cop(x.venta)}</b> (${pct(x.part)}) · ${tFmt(x.t)} t · ${x.remisiones} remisiones` },
  }, false), lista.length > 0)
}
const optClientes = computed(() => opcionClientes(clientes.value.slice(0, TOP)))
const optClientesTodos = computed(() => opcionClientes(clientes.value))

// ── Venta diaria frente al promedio: una barra por día (el desglose por familia va en el detalle) ──
const dias = computed(() => porDia(props.lineas))
const optDiaria = computed(() => {
  const d = dias.value
  const n = d.filter(x => x.venta > 0).length
  const prom = n ? d.reduce((a, x) => a + x.venta, 0) / n : 0
  const fams = FAMILIAS.filter(f => d.some(x => x.porFamilia[f]))
  // Pesos completos sobre cada barra: se ven 14 días a la vez (7 en celular) para que las cifras no se monten
  const z = zoom(d.length, movil.value ? 7 : 14)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = d[ps[0].dataIndex]
        return `<b>${fechaLarga(x.fecha)}</b><br/>` + fams.filter(f => x.porFamilia[f]).map(f => `${punto(COLOR_FAMILIA[f])} ${f}: <b>${cop(x.porFamilia[f] ?? 0)}</b>`).join('<br/>') +
          `<br/>${punto(tinta.value)} Total: <b>${cop(x.venta)}</b> · ${tFmt(x.tVendidas)} t · ${x.remisiones} remisiones` +
          (prom ? `<br/>${punto(x.venta >= prom ? VERDE : ROJO)} Frente al promedio: <b>${x.venta >= prom ? '+' : ''}${pct((x.venta / prom - 1) * 100, 0)}</b>` : '') } },
    legend: leyenda([{ name: 'Sobre el promedio', itemStyle: { color: VERDE } }, { name: 'Bajo el promedio', itemStyle: { color: ROJO } }]),
    grid: { left: 12, right: movil.value ? 20 : 70, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(d.map(x => ddmm(x.fecha))),
    yAxis: ejeY(),
    series: [
      { name: 'Bajo el promedio', type: 'bar', barMaxWidth: 26, emphasis,
        data: d.map(x => ({ value: Math.round(x.venta), itemStyle: { color: x.venta >= prom ? VERDE : ROJO, opacity: 0.85, borderRadius: [3, 3, 0, 0] } })),
        label: { ...labelPill.value, position: 'top', formatter: (p: any) => (p.value ? copCorto(p.value).replace('$ ', '') : '') }, labelLayout: { hideOverlap: true },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: tinta.value, type: 'dashed', width: 1.2, opacity: 0.7 },
          label: { show: !movil.value, position: 'end', formatter: `Prom.\n${copCorto(prom)}`, color: chartTextColor.value, fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 13 },
          data: [{ yAxis: Math.round(prom) }] } },
      // Serie vacía solo para la leyenda del color verde (las barras se colorean día a día)
      { name: 'Sobre el promedio', type: 'bar', data: [], itemStyle: { color: VERDE } },
    ],
  }, d.length > 0)
})
// ── Días con venta (para promedios, ritmo y proyección) ──
const diasVenta = computed(() => dias.value.filter(d => d.venta > 0))
const ddmm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7)

// ── Concentración de clientes (Pareto) ──
const pareto = computed(() => paretoClientes(props.lineas))
const paretoN = computed(() => Math.min(pareto.value.filas.length, movil.value ? 12 : 25))
const paretoTxt = computed(() => {
  const { filas, n80 } = pareto.value
  if (!filas.length) return ''
  return `${n80} de ${filas.length} clientes (${pct(n80 / filas.length * 100, 0)}) concentran el 80 % de la venta · barras: venta de cada cliente en orden, con el color del Top ${TOP} (el resto en gris); línea: % acumulado`
})
function opcionPareto(filas: typeof pareto.value.filas) {
  const n80 = pareto.value.n80
  const colorBarra = (i: number) => colorCliente(i + 1)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const x = filas[ps[0].dataIndex]
        return `<b>${x.rango}. ${x.cliente}</b>${x.nit ? ` <span style="color:#94a3b8">· NIT ${x.nit}</span>` : ''}<br/>` +
          `${punto(colorBarra(x.rango - 1))} Venta: <b>${cop(x.venta)}</b> (${pct(x.part)}) · ${tFmt(x.t)} t<br/>` +
          `${punto(tinta.value)} Acumulado: <b>${pct(x.acumPct)}</b> de la venta con ${x.rango} ${x.rango === 1 ? 'cliente' : 'clientes'}` } },
    legend: leyenda([{ name: '% acumulado', itemStyle: { color: tinta.value } }]),
    grid: { left: 12, right: movil.value ? 40 : 48, bottom: 24, top: 40, containLabel: true },
    xAxis: ejeX(filas.map(x => String(x.rango)), { name: movil.value ? '' : 'N.° de cliente', nameLocation: 'middle' as const, nameGap: 26,
      nameTextStyle: { color: chartTextColor.value, fontSize: 10, fontFamily: FONT } }),
    yAxis: [ejeY(), ejeY({ min: 0, max: 112 })],
    series: [
      { name: 'Venta', type: 'bar' as const, barMaxWidth: 28, emphasis, yAxisIndex: 0,
        data: filas.map((x, i) => ({ value: Math.round(x.venta), itemStyle: { color: colorBarra(i), borderRadius: [3, 3, 0, 0] } })),
        label: { ...labelPill.value, position: 'top' as const, formatter: (p: any) => copCorto(p.value) }, labelLayout: { hideOverlap: true } },
      { name: '% acumulado', type: 'line' as const, yAxisIndex: 1, smooth: 0.2, symbol: 'circle', symbolSize: 4, emphasis,
        data: filas.map(x => +x.acumPct.toFixed(1)), lineStyle: { width: 2, color: tinta.value }, itemStyle: { color: tinta.value },
        // Solo se rotulan el punto donde se alcanza el 80 % y el último
        label: { ...labelPill.value, position: 'top' as const, color: tinta.value,
          formatter: (p: any) => (p.dataIndex === n80 - 1 || p.dataIndex === filas.length - 1 ? pct(p.value, 0) : '') },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#EF4444', type: 'dashed' as const, width: 1.2 },
          label: { show: true, position: 'end' as const, formatter: '80 %', color: '#EF4444', fontFamily: FONT, fontSize: 10, fontWeight: 600 },
          data: [{ yAxis: 80 }] } },
    ],
  }, filas.length > 0)
}
// Al expandir: barras horizontales con el nombre de cada cliente (ChartCard recorta Top 10/15/20 sobre el eje de categorías)
function opcionParetoNombres(filas: typeof pareto.value.filas) {
  const colorBarra = (i: number) => colorCliente(i + 1)
  const txt = (x: typeof filas[number]) => `${copCorto(x.venta)} · ${pct(x.acumPct, 0)}`
  const o = barrasH(filas.map(x => `${x.rango}. ${x.cliente}`), [
    { name: 'Venta', type: 'bar', barWidth: '60%', emphasis,
      data: filas.map((x, i) => ({ value: Math.round(x.venta), itemStyle: { color: colorBarra(i), borderRadius: [0, 4, 4, 0] } })),
      label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(filas[p.dataIndex]) }, labelLayout: { hideOverlap: true } },
    { name: '% acumulado', type: 'line', xAxisIndex: 1, symbol: 'circle', symbolSize: 4, emphasis,
      data: filas.map(x => +x.acumPct.toFixed(1)), lineStyle: { width: 1.5, color: tinta.value, opacity: 0.6 }, itemStyle: { color: tinta.value },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#EF4444', type: 'dashed', width: 1.2 },
        label: { show: true, position: 'start', formatter: '80 %', color: '#EF4444', fontFamily: FONT, fontSize: 10, fontWeight: 600 }, data: [{ xAxis: 80 }] } },
  ], filas.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = filas[ps[0].dataIndex]
      return `<b>${x.rango}. ${x.cliente}</b>${x.nit ? ` <span style="color:#94a3b8">· NIT ${x.nit}</span>` : ''}<br/>` +
        `${punto(colorBarra(x.rango - 1))} Venta: <b>${cop(x.venta)}</b> (${pct(x.part)}) · ${tFmt(x.t)} t<br/>` +
        `${punto(tinta.value)} Acumulado: <b>${pct(x.acumPct)}</b> de la venta` },
  }, true)
  return vacio({ ...o,
    xAxis: [o.xAxis, { type: 'value' as const, min: 0, max: 100, show: false }],
    legend: leyenda([{ name: '% acumulado', itemStyle: { color: tinta.value } }]),
  }, filas.length > 0)
}
const optPareto = computed(() => opcionPareto(pareto.value.filas.slice(0, paretoN.value)))
const optParetoTodos = computed(() => opcionParetoNombres(pareto.value.filas))

// ── Clientes que más cambiaron frente al período anterior (mismo número de días justo antes) ──
// Solo se muestra si el período anterior está completo en el archivo (si no, la comparación engañaría)
const sumarDias = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const variacion = computed(() => {
  const todas = props.lineasSinFecha
  const f = fechas.value
  if (!todas?.length || f.length < 2) return null
  const ini = f[0], fin = f[f.length - 1]
  const n = Math.round((Date.parse(fin) - Date.parse(ini)) / 864e5) + 1
  const antIni = sumarDias(ini, -n), antFin = sumarDias(ini, -1)
  const completa = inicioFacturacionCompleta(todas, fin)
  if (!completa || completa > antIni) return null
  const previas = todas.filter(l => l.fecha >= antIni && l.fecha <= antFin)
  if (!previas.some(esVenta)) return null
  const clave = (c: { nit: string; cliente: string }) => c.nit || c.cliente
  const act = new Map(porCliente(props.lineas).map(c => [clave(c), c]))
  const ant = new Map(porCliente(previas).map(c => [clave(c), c]))
  const filas = [...new Set([...act.keys(), ...ant.keys()])].map(k => {
    const a = act.get(k), b = ant.get(k)
    return { cliente: (a ?? b)!.cliente, actual: a?.venta ?? 0, anterior: b?.venta ?? 0, dif: (a?.venta ?? 0) - (b?.venta ?? 0) }
  })
  const suben = filas.filter(x => x.dif > 0).sort((a, b) => b.dif - a.dif).slice(0, 5)
  const bajan = filas.filter(x => x.dif < 0).sort((a, b) => a.dif - b.dif).slice(0, 5)
  return {
    antIni, antFin, filas: [...suben, ...bajan.reverse()],
    nuevos: filas.filter(x => x.anterior === 0 && x.actual > 0).length,
    perdidos: filas.filter(x => x.actual === 0 && x.anterior > 0).length,
    totalAct: filas.reduce((s, x) => s + x.actual, 0), totalAnt: filas.reduce((s, x) => s + x.anterior, 0),
  }
})
const variacionTxt = computed(() => {
  const v = variacion.value
  if (!v) return ''
  const cambio = v.totalAnt ? (v.totalAct / v.totalAnt - 1) * 100 : 0
  return `Frente al ${fechaCorta(v.antIni)} – ${fechaCorta(v.antFin)} (mismos días): venta total ${cambio >= 0 ? '+' : ''}${pct(cambio, 0)} · ` +
    `${v.nuevos} ${v.nuevos === 1 ? 'cliente nuevo' : 'clientes nuevos'} y ${v.perdidos} que no volvieron a comprar · verde: los 5 que más subieron; rojo: los 5 que más bajaron`
})
const optVariacion = computed(() => {
  const v = variacion.value
  if (!v) return null
  const fs = v.filas
  const txt = (x: typeof fs[number]) => `${x.dif > 0 ? '+' : '−'}${copCorto(Math.abs(x.dif)).replace('$ ', '$ ')}`
  const o = barrasH(fs.map(x => x.cliente), [{
    name: 'Cambio en la venta', type: 'bar', barWidth: '55%', emphasis,
    data: fs.map(x => ({ value: Math.round(x.dif), itemStyle: { color: x.dif >= 0 ? VERDE : ROJO, opacity: 0.85, borderRadius: x.dif >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
      label: { position: x.dif >= 0 ? 'right' : 'left' } })),
    label: { ...labelPill.value, formatter: (p: any) => txt(fs[p.dataIndex]), position: 'right' },
  }], fs.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (ps: any[]) => { const x = fs[ps[0].dataIndex]
      return `<b>${x.cliente}</b><br/>${punto('#94a3b8')} Período anterior: <b>${cop(x.anterior)}</b><br/>${punto(COLOR_TIPO.venta)} Este período: <b>${cop(x.actual)}</b><br/>` +
        `${punto(x.dif >= 0 ? VERDE : ROJO)} Cambio: <b>${x.dif >= 0 ? '+' : ''}${cop(x.dif)}</b>` +
        (x.anterior ? ` (${x.dif >= 0 ? '+' : ''}${pct((x.actual / x.anterior - 1) * 100, 0)})` : ' (cliente nuevo)') },
  }, false)
  // Eje simétrico con el cero en el medio: las subidas crecen a la derecha y las bajadas a la izquierda
  // Margen de 35 % a cada lado para que los valores quepan junto a las barras más largas
  const maxAbs = Math.max(...fs.map(x => Math.abs(x.dif)), 1) * 1.35
  return vacio({ ...o, xAxis: { ...(o.xAxis as object), min: -maxAbs, max: maxAbs,
    splitLine: { show: false }, axisLine: { show: true, onZero: true, lineStyle: { color: isLight.value ? '#cbd5e1' : '#334155' } } } }, fs.length > 0)
})

// ── Venta acumulada y proyección de cierre ──
// Solo se proyecta si el período está dentro de un mes, llega hasta el último dato disponible y el mes no ha terminado
const proyeccion = computed(() => {
  const dv = diasVenta.value
  if (dv.length < 2) return null
  const corte = dias.value[dias.value.length - 1].fecha
  if (dias.value[0].fecha.slice(0, 7) !== corte.slice(0, 7)) return null
  const ultimoDato = (props.lineasSinFecha ?? props.lineas).reduce((a, l) => (l.fecha > a ? l.fecha : a), '')
  if (corte < ultimoDato) return null
  const venta = proyeccionDiaria(dv, corte)
  if (!venta.length) return null
  return { corte, venta, t: proyeccionDiaria(dv, corte, d => d.tVendidas), cierre: cierreEstimado(dv, corte) }
})
const acumTxt = computed(() => {
  const c = proyeccion.value
  const base = 'Venta antes de IVA acumulada en los días con despacho; en la etiqueta y el detalle, las toneladas vendidas acumuladas'
  const vendeDom = diasVenta.value.some(d => new Date(d.fecha + 'T00:00:00Z').getUTCDay() === 0)
  return c ? `${base}. Punteada: proyección a fin de mes con el promedio de lunes a sábado${vendeDom ? ' y el de domingo' : ''}: cierre estimado ${cop(c.cierre.valor)}` : base
})
const optAcumulado = computed(() => {
  const d = dias.value, c = proyeccion.value
  let tAcum = 0
  const reales = d.map(x => { tAcum += x.tVendidas; return { fecha: x.fecha, venta: x.acumulado, t: tAcum } })
  const futuros = c ? c.venta.map((x, i) => ({ fecha: x.fecha, venta: x.acumulado, t: c.t[i]?.acumulado ?? 0 })) : []
  const todos = [...reales, ...futuros]
  const nR = reales.length
  const txt = (v: number, t: number, aprox = false) => `${aprox ? '≈ ' : ''}${copCorto(v)} · ${tFmt(t)} t`
  const colorProy = '#F59E0B'
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const,
      formatter: (ps: any[]) => { const i = ps[0].dataIndex, x = todos[i], proy = i >= nR
        const dia = d[i]
        return `<b>${fechaLarga(x.fecha)}</b>${proy ? ' <span style="color:#94a3b8">· proyección</span>' : ''}<br/>` +
          `${punto(proy ? colorProy : COLOR_TIPO.venta)} Venta acumulada: <b>${cop(x.venta)}</b><br/>` +
          `${punto(tinta.value)} Toneladas vendidas acumuladas: <b>${tFmt(x.t)} t</b>` +
          (!proy && dia ? `<br/><span style="color:#94a3b8;font-size:11px">Del día: ${cop(dia.venta)} · ${tFmt(dia.tVendidas)} t · ${dia.remisiones} remisiones</span>` : '') } },
    legend: leyenda([{ name: 'Venta acumulada', itemStyle: { color: COLOR_TIPO.venta } }, ...(c ? [{ name: 'Proyección a fin de mes', itemStyle: { color: colorProy } }] : [])]),
    grid: { left: 12, right: movil.value ? 16 : 24, bottom: 24, top: 56, containLabel: true },
    xAxis: ejeX(todos.map(x => ddmm(x.fecha)), { boundaryGap: false }),
    yAxis: ejeY({ max: (v: { max: number }) => Math.ceil((v.max || 1) * 1.08) }),
    series: [
      { name: 'Venta acumulada', type: 'line' as const, smooth: 0.2, symbol: 'circle', symbolSize: 4, showSymbol: false, emphasis,
        data: todos.map((x, i) => (i < nR ? Math.round(x.venta) : null)),
        lineStyle: { width: 2.5, color: COLOR_TIPO.venta }, itemStyle: { color: COLOR_TIPO.venta }, areaStyle: { opacity: 0.1, color: COLOR_TIPO.venta },
        // Rótulo del total real sobre el último punto (a la derecha se saldría de la gráfica)
        markPoint: { symbol: 'circle', symbolSize: 7, itemStyle: { color: COLOR_TIPO.venta },
          label: { ...labelPill.value, position: 'top' as const, align: 'right' as const, distance: 8, color: isLight.value ? '#1e3a8a' : '#bfdbfe',
            formatter: () => txt(reales[nR - 1].venta, reales[nR - 1].t) },
          data: [{ coord: [nR - 1, Math.round(reales[nR - 1]?.venta ?? 0)] }] } },
      ...(c ? [{ name: 'Proyección a fin de mes', type: 'line' as const, symbol: 'none', emphasis,
        data: todos.map((x, i) => (i >= nR - 1 ? Math.round(x.venta) : null)),
        lineStyle: { width: 2, type: 'dashed' as const, color: colorProy }, itemStyle: { color: colorProy },
        markPoint: { symbol: 'circle', symbolSize: 7, itemStyle: { color: colorProy },
          label: { ...labelPill.value, position: 'top' as const, align: 'right' as const, distance: 8, color: isLight.value ? '#b45309' : '#fcd34d',
            formatter: () => txt(c.cierre.valor, futuros[futuros.length - 1].t, true) },
          data: [{ coord: [todos.length - 1, Math.round(futuros[futuros.length - 1].venta)] }] } }] : []),
    ],
  }, nR > 0)
})

// ── Venta promedio por día de la semana ──
const semana = computed(() => porDiaSemana(props.lineas))
const semanaFuerte = computed(() => [...semana.value].sort((a, b) => b.promVenta - a.promVenta)[0] ?? null)
const semanaTxt = computed(() => {
  const f = semanaFuerte.value
  const base = 'Venta de cada día de la semana ÷ cuántos de esos días tuvieron venta; la línea punteada es el promedio de todos los días con venta'
  return f && semana.value.length > 1 ? `${base}. El día más fuerte es el ${f.nombre.toLowerCase()}: ${cop(f.promVenta)} en promedio` : base
})
const optSemana = computed(() => {
  const s = semana.value, f = semanaFuerte.value
  const n = diasVenta.value.length
  const prom = n ? R.value.venta / n : 0
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const x = s[ps[0].dataIndex]
        return `<b>${x.nombre}</b> <span style="color:#94a3b8">· ${x.dias} ${x.dias === 1 ? 'día' : 'días'} con venta</span><br/>` +
          `${punto(COLOR_TIPO.venta)} Venta promedio: <b>${cop(x.promVenta)}</b><br/>` +
          `${punto(tinta.value)} Toneladas promedio: <b>${tFmt(x.promT)} t</b><br/>` +
          `${punto('#8B5CF6')} Remisiones promedio: <b>${fmtN(x.promRemisiones, 0)}</b><br/>` +
          `<span style="color:#94a3b8;font-size:11px">Total: ${cop(x.venta)} · ${tFmt(x.t)} t</span>` } },
    grid: { left: 12, right: movil.value ? 58 : 70, bottom: 24, top: 28, containLabel: true },
    xAxis: ejeX(s.map(x => (movil.value ? x.corto : x.nombre))),
    yAxis: ejeY(),
    series: [{ name: 'Venta promedio', type: 'bar' as const, barMaxWidth: 44, emphasis,
      data: s.map(x => ({ value: Math.round(x.promVenta),
        itemStyle: { color: COLOR_TIPO.venta, opacity: f && x.n === f.n ? 1 : 0.72, borderRadius: [4, 4, 0, 0] } })),
      label: { ...labelPill.value, position: 'top' as const, formatter: (p: any) => copCorto(p.value) },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: tinta.value, type: 'dashed' as const, width: 1.2, opacity: 0.7 },
        label: { show: true, position: 'end' as const, formatter: `Prom.\n${copCorto(prom)}`, color: chartTextColor.value, fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 13 },
        data: prom ? [{ yAxis: Math.round(prom) }] : [] } }],
  }, s.length > 0)
})

// ── Toneladas despachadas por día: vendidas y traslados lado a lado ──
// Toneladas del flete Holcim por día (cantidad del servicio = toneladas del material transportado, ya en vendidas)
const fleteDia = computed(() => {
  const m = new Map<string, number>()
  for (const l of props.lineas) if (esVenta(l) && esFleteHolcim(l)) m.set(l.fecha, (m.get(l.fecha) ?? 0) + l.cantidad)
  return m
})
const optToneladasDia = computed(() => {
  const d = dias.value
  const hayTras = d.some(x => x.tTraslados > 0)
  const hayFlete = fleteDia.value.size > 0
  const flete = (fecha: string) => fleteDia.value.get(fecha) ?? 0
  const z = zoom(d.length)
  const serie = (name: string, color: string, datos: number[]) => ({
    name, type: 'bar' as const, barMaxWidth: 18, barGap: '12%', emphasis, data: datos.map(v => +v.toFixed(1)),
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    // Solo se rotulan las vendidas (encima); traslados y flete van en el detalle para no amontonar números
    label: name !== 'Vendidas' ? { show: false } : { ...labelPill.value, position: 'top' as const, formatter: (x: any) => (x.value >= 1 ? fmtN(x.value, 0) : '') },
    labelLayout: { hideOverlap: true },
  })
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (ps: any[]) => { const x = d[ps[0].dataIndex]
        return `<b>${fechaLarga(x.fecha)}</b><br/>${punto(COLOR_TIPO.venta)} Vendidas: <b>${tFmt(x.tVendidas)} t</b>` +
          (hayFlete ? `<br/>${punto(COLOR_FAMILIA.Fletes)} Flete Holcim: <b>${tFmt(flete(x.fecha))} t</b> <span style="color:#94a3b8;font-size:11px">(ya en vendidas)</span>` : '') +
          (hayTras ? `<br/>${punto(COLOR_TIPO.traslado)} Traslados: <b>${tFmt(x.tTraslados)} t</b><br/>${punto(tinta.value)} Despachadas: <b>${tFmt(x.tVendidas + x.tTraslados)} t</b>` : '') +
          `<br/><span style="color:#94a3b8;font-size:11px">${x.remisiones} remisiones de venta</span>` } },
    legend: leyenda([{ name: 'Vendidas', itemStyle: { color: COLOR_TIPO.venta } }, ...(hayFlete ? [{ name: 'Flete Holcim', itemStyle: { color: COLOR_FAMILIA.Fletes } }] : []),
      ...(hayTras ? [{ name: 'Traslados', itemStyle: { color: COLOR_TIPO.traslado } }] : [])]),
    grid: { left: 12, right: 20, bottom: z.gridBottom, top: 40, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(d.map(x => ddmm(x.fecha))),
    yAxis: ejeY(),
    series: [serie('Vendidas', COLOR_TIPO.venta, d.map(x => x.tVendidas)),
      ...(hayFlete ? [serie('Flete Holcim', COLOR_FAMILIA.Fletes, d.map(x => flete(x.fecha)))] : []),
      ...(hayTras ? [serie('Traslados', COLOR_TIPO.traslado, d.map(x => x.tTraslados))] : [])],
  }, d.length > 0)
})

// ── Ticket por remisión y precio por tonelada, día a día ──
function opcionLineaDia(nombre: string, color: string, puntos: { fecha: string; v: number; extra: string }[], promedio: number | null, sufijo = '') {
  const z = zoom(puntos.length)
  // Solo se rotulan el día más alto y el más bajo de la ventana visible al abrir (con 30+ puntos las etiquetas
  // se amontonan); el resto va en el detalle
  const vs = puntos.map(x => x.v)
  const desde = Math.max(0, puntos.length - ventana.value), visibles = vs.slice(desde)
  const iMax = desde + visibles.indexOf(Math.max(...visibles)), iMin = desde + visibles.indexOf(Math.min(...visibles))
  const corto = (v: number) => cop(v)
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis' as const,
      formatter: (ps: any[]) => { const x = puntos[ps[0].dataIndex]
        return `<b>${fechaLarga(x.fecha)}</b><br/>${punto(color)} ${nombre}: <b>${cop(x.v)}${sufijo}</b><br/>` +
          `<span style="color:#94a3b8;font-size:11px">${x.extra}</span>` +
          (promedio ? `<br/><span style="color:#94a3b8;font-size:11px">Promedio del período: ${cop(promedio)}${sufijo}</span>` : '') } },
    grid: { left: 12, right: movil.value ? 58 : 70, bottom: z.gridBottom, top: 28, containLabel: true },
    dataZoom: z.dataZoom,
    xAxis: ejeX(puntos.map(x => ddmm(x.fecha)), { boundaryGap: false }),
    // Margen arriba y abajo según el rango visible, para que los rótulos de máximo y mínimo no toquen los bordes
    yAxis: ejeY({ scale: true, min: (v: { min: number; max: number }) => Math.max(0, Math.floor(v.min - (v.max - v.min) * 0.22)),
      max: (v: { min: number; max: number }) => Math.ceil(v.max + (v.max - v.min) * 0.15) }),
    series: [{ name: nombre, type: 'line' as const, smooth: 0.2, symbol: 'circle', symbolSize: 5, emphasis,
      lineStyle: { width: 2, color }, itemStyle: { color },
      data: puntos.map(x => Math.round(x.v)),
      markPoint: { symbol: 'circle', symbolSize: 1, silent: true,
        data: [
          { coord: [iMax, Math.round(vs[iMax] ?? 0)], label: { ...labelPill.value, position: 'top' as const, distance: 6, formatter: () => corto(vs[iMax] ?? 0) } },
          ...(iMin !== iMax ? [{ coord: [iMin, Math.round(vs[iMin] ?? 0)], label: { ...labelPill.value, position: 'bottom' as const, distance: 6, formatter: () => corto(vs[iMin] ?? 0) } }] : []),
        ] },
      markLine: promedio ? { silent: true, symbol: 'none', lineStyle: { color: tinta.value, type: 'dashed' as const, width: 1.2, opacity: 0.7 },
        label: { show: true, position: 'end' as const, formatter: `Prom.\n${corto(promedio)}`, color: chartTextColor.value, fontFamily: FONT, fontSize: 10, fontWeight: 600, lineHeight: 13 },
        data: [{ yAxis: Math.round(promedio) }] } : undefined }],
  }, puntos.length > 0)
}
const optTicket = computed(() => opcionLineaDia('Ticket por remisión', '#8B5CF6',
  dias.value.filter(d => d.remisiones > 0 && d.venta > 0).map(d => ({ fecha: d.fecha, v: d.venta / d.remisiones, extra: `${cop(d.venta)} en ${d.remisiones} remisiones` })),
  R.value.remisiones ? R.value.venta / R.value.remisiones : null))
</script>

<style scoped>
.fact-graficas { display: flex; flex-direction: column; }
.vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }
.periodo { margin: 0 0 14px; font-size: 13px; color: var(--text-secondary); }
.periodo strong { color: var(--text-primary); }
.kpi-row { margin-bottom: 4px; }
.kpi-grupo { margin: 14px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--text-tertiary); }
/* Filas de KPIs según el ancho real del contenido (no de la ventana): nunca queda una tarjeta sola.
   g4 = grupos de 4 → 4 / 2×2 / 1 · n2 y n3 = totales → lado a lado o uno debajo del otro */
.fact-graficas { container-type: inline-size; }
.kpi-row.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kpi-row.n2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.kpi-row.n3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@container (max-width: 1180px) { .kpi-row.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 900px) { .kpi-row.n3 { grid-template-columns: 1fr; } }
@container (max-width: 560px) { .kpi-row.g4, .kpi-row.n2 { grid-template-columns: 1fr; } }
.kpi-row.totales :deep(.kpi-value) { font-size: 24px; }
/* En KPIs anchos (2×2) el detalle no se estira de lado a lado: etiqueta y valor quedan cerca */
.kpi-row :deep(.kpi-detail) { max-width: 380px; }
/* Detalle alineado en dos columnas: etiqueta a la izquierda, valor a la derecha (como en el informe) */
.kpi-row :deep(.kpi-detail-row) { flex-wrap: nowrap; }
.kpi-row :deep(.kpi-detail-row .kpi-label-int) { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.kpi-row :deep(.kpi-detail-row strong) { margin-left: auto; text-align: right; font-variant-numeric: tabular-nums; }
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
