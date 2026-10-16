<template>
  <div class="comercial-tab">
    <EmptyState v-if="!leads.length" title="Sin cotizaciones" description="No hay cotizaciones con los filtros elegidos." />
    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <EmbudoSeccion :clientes="clientes" :indice="indice" :avisos="avisos" plural="cotizaciones" etapa-f227 :hay-f227="hayF227" por-negocio />

      <h3 class="section-title"><span class="title-bar"></span>Evolución</h3>
      <p class="section-sub">Por mes de solicitud (o de envío de la oferta si falta). Tasa de aprobación = aprobadas ÷ cotizaciones del mes.</p>
      <div class="charts-grid cols-2">
        <ChartCard title="Cotizaciones vs. Aprobadas por Mes" description="Encima, la tasa de aprobación del mes" :option="optMesCantidad" :height="320" />
        <ChartCard title="Valor Cotizado vs. Aprobado por Mes" description="Millones de pesos (concreto + agregados)" :option="optMesValor" :height="320" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Distribución</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Cotizaciones por Negocio" description="Concretos, Agregados y Dual (cotizan los dos)" :option="optNegocio" :height="300" />
        <ChartCard title="Forma de Pago" description="Cotizaciones por forma de pago" :option="optPago" :height="300" />
        <ChartCard title="Aprobación por Asesor" description="Gris: cotizaciones · color: aprobadas · aprobadas / cotizaciones · tasa" :option="optAsesor" :height="300" />
        <ChartCard title="Aprobación por Planta" description="Gris: cotizaciones · color: aprobadas · aprobadas / cotizaciones · tasa" :option="optPlanta" :height="300" />
      </div>

      <template v-if="productos.length">
        <h3 class="section-title"><span class="title-bar"></span>Productos de concreto</h3>
        <p class="section-sub">Solo líneas de concreto (sin bombeo, stand by ni incrementos).<template v-if="atipicas"> Se excluyen {{ atipicas }} líneas con cantidad y precio cruzados.</template></p>
        <div class="charts-grid cols-2">
          <ChartCard :title="`m³ Cotizados — Top ${TOP} Productos`" description="m³ de concreto en todas las cotizaciones" :option="optProductos" :height="360" />
          <DataTable title="Precio por m³ por Producto" :data="tablaPrecios" :page-size="10" small />
        </div>
      </template>

      <div class="section-divider"></div>
      <DataTable title="Detalle de Cotizaciones" :data="tablaDetalle" :page-size="15" small exportColumns />
      <p v-if="descartados" class="nota">Se excluyen {{ descartados }} registros de prueba (sin empresa ni valor).</p>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * LeadsTab.vue — Subpestaña Leads del Embudo Comercial: indicadores de las cotizaciones (posibles_clientes_leads)
 * — volumen, aprobación, valor, tiempos de respuesta, productos y precios de concreto — y su embudo hasta la compra.
 */
import { computed } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { fmtN, pct } from '../../composables/useGraficasConcreto'
import { COLOR_NEGOCIO, NEGOCIOS, diasRespuesta, mediana, millones, tasa, type ClienteEmbudo, type IndiceCompras, type Lead } from '../../composables/useComercial'
import { useGraficasComercial, AZUL, VERDE, MORADO, AMBAR } from './useGraficasComercial'
import EmbudoSeccion from './EmbudoSeccion.vue'

const props = defineProps<{
  leads: Lead[]
  descartados: number
  atipicas: number
  /** Embudo por cliente de estas cotizaciones */
  clientes: ClienteEmbudo[]
  indice: IndiceCompras | null
  avisos: string[]
  hayF227: boolean
}>()
const TOP = 10
const g = useGraficasComercial()

const contar = <T,>(xs: T[], f: (x: T) => boolean) => xs.reduce((a, x) => a + (f(x) ? 1 : 0), 0)
const sumar = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0)

const kpis = computed(() => {
  const ls = props.leads
  const n = ls.length
  const enviadas = contar(ls, l => l.enviada), aprobadas = contar(ls, l => l.aprobada)
  const clientes = new Set(ls.map(l => l.nits[0] || l.nombreKey || l.id)).size
  const valor = sumar(ls, l => l.valor), valorAprob = sumar(ls.filter(l => l.aprobada), l => l.valor)
  const m3 = sumar(ls, l => l.m3), m3Aprob = sumar(ls.filter(l => l.aprobada), l => l.m3)
  const resp = mediana(diasRespuesta(ls))
  return [
    { label: 'Cotizaciones', value: fmtN(n), icon: 'list', accent: '#64748B', detail: `${fmtN(clientes)} posibles clientes` },
    { label: 'Ofertas Enviadas', value: fmtN(enviadas), icon: 'trending-up', accent: AZUL, detail: `${pct(tasa(enviadas, n))} de las cotizaciones` },
    { label: 'Aprobadas', value: fmtN(aprobadas), icon: 'check-circle', accent: VERDE, detail: `Tasa de aprobación <b>${pct(tasa(aprobadas, n))}</b>` },
    { label: 'Valor Cotizado', value: millones(valor), icon: 'dollar', accent: MORADO, detail: `Ticket promedio ${millones(n ? valor / n : 0)}` },
    { label: 'Valor Aprobado', value: millones(valorAprob), icon: 'dollar', accent: VERDE, detail: `${pct(tasa(valorAprob, valor))} del valor cotizado` },
    { label: 'm³ de Concreto Cotizados', value: fmtN(m3), icon: 'package', accent: AZUL, detail: `${fmtN(m3Aprob)} m³ aprobados (${pct(tasa(m3Aprob, m3))})` },
    { label: 'Días de Respuesta', value: resp === null ? '—' : fmtN(resp, 1), icon: 'clock', accent: AMBAR, detail: 'Mediana de solicitud → envío de la oferta' },
  ]
})

// ── Por mes ──
const porMes = computed(() => {
  const m = new Map<string, { n: number; ap: number; valor: number; valorAp: number }>()
  for (const l of props.leads) {
    if (!l.fecha) continue
    const k = l.fecha.slice(0, 7)
    const x = m.get(k) ?? { n: 0, ap: 0, valor: 0, valorAp: 0 }
    x.n++; x.valor += l.valor
    if (l.aprobada) { x.ap++; x.valorAp += l.valor }
    m.set(k, x)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})
const optMesCantidad = computed(() => {
  const ms = porMes.value
  return g.porMes(ms.map(x => x[0]), [
    { name: 'Cotizaciones', color: g.gris.value, data: ms.map(x => x[1].n) },
    { name: 'Aprobadas', color: VERDE, data: ms.map(x => x[1].ap) },
  ], v => fmtN(v), i => pct(tasa(ms[i][1].ap, ms[i][1].n), 0))
})
const optMesValor = computed(() => {
  const ms = porMes.value
  return g.porMes(ms.map(x => x[0]), [
    { name: 'Cotizado', color: g.gris.value, data: ms.map(x => Math.round(x[1].valor / 1e6)) },
    { name: 'Aprobado', color: MORADO, data: ms.map(x => Math.round(x[1].valorAp / 1e6)) },
  ], v => `$ ${fmtN(v)} M`)
})

// ── Distribución ──
const optNegocio = computed(() => g.dona(
  NEGOCIOS.map(n => ({ name: n, value: contar(props.leads, l => l.negocio === n), color: COLOR_NEGOCIO[n] })),
  fmtN(props.leads.length), 'cotizaciones'))

const PALETA_PAGO = [AZUL, AMBAR, '#94A3B8', MORADO, '#06B6D4']
const optPago = computed(() => {
  const m = new Map<string, number>()
  for (const l of props.leads) m.set(l.formaPago, (m.get(l.formaPago) ?? 0) + 1)
  const items = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: PALETA_PAGO[i % PALETA_PAGO.length] }))
  return g.dona(items, fmtN(props.leads.length), 'cotizaciones')
})

function comparar(clave: (l: Lead) => string) {
  const m = new Map<string, { total: number; logrado: number }>()
  for (const l of props.leads) {
    const x = m.get(clave(l)) ?? { total: 0, logrado: 0 }
    x.total++; if (l.aprobada) x.logrado++
    m.set(clave(l), x)
  }
  return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x }))
}
const optAsesor = computed(() => g.comparativo(comparar(l => l.asesor), { total: 'Cotizaciones', logrado: 'Aprobadas' }, VERDE))
const optPlanta = computed(() => g.comparativo(comparar(l => l.planta), { total: 'Cotizaciones', logrado: 'Aprobadas' }, VERDE))

// ── Productos de concreto ──
const productos = computed(() => {
  const m = new Map<string, { cot: Set<string>; m3: number; precios: number[] }>()
  for (const l of props.leads) for (const x of l.lineasConcreto) {
    if (!x.concreto || x.atipica) continue
    const k = x.codigo && /^(C|CON)\d/i.test(x.codigo) ? `${x.codigo} · ${x.producto}` : x.producto
    const p = m.get(k) ?? { cot: new Set(), m3: 0, precios: [] }
    p.cot.add(l.id); p.m3 += x.cantidad
    if (x.precio > 0) p.precios.push(x.precio)
    m.set(k, p)
  }
  return [...m.entries()].map(([nombre, p]) => ({ nombre, cotizaciones: p.cot.size, m3: p.m3, precios: p.precios })).sort((a, b) => b.m3 - a.m3)
})
const corto = (s: string) => (s.length > 42 ? s.slice(0, 40) + '…' : s)
const optProductos = computed(() => g.ranking(productos.value.slice(0, TOP).map(p => ({
  nombre: corto(p.nombre), valor: Math.round(p.m3), detalle: `${p.nombre}<br/>${fmtN(p.cotizaciones)} cotizaciones`,
})), AZUL, v => `${fmtN(v)} m³`))
const tablaPrecios = computed(() => productos.value.filter(p => p.precios.length).map(p => ({
  Producto: p.nombre,
  Cotizaciones: p.cotizaciones,
  'm³': Math.round(p.m3),
  'Precio mín.': Math.min(...p.precios),
  'Precio prom.': Math.round(p.precios.reduce((a, b) => a + b, 0) / p.precios.length),
  'Precio máx.': Math.max(...p.precios),
})))

const siNo = (b: boolean) => (b ? 'Sí' : 'No')
const tablaDetalle = computed(() => [...props.leads].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(l => ({
  Solicitud: l.solicitud || '—',
  Empresa: l.empresa,
  NIT: l.nit || '—',
  Negocio: l.negocio,
  Planta: l.planta,
  Asesor: l.asesor,
  Versión: l.version || '—',
  'Forma de pago': l.formaPago,
  Valor: Math.round(l.valor),
  'm³': Math.round(l.m3 * 10) / 10,
  Enviada: l.envio || 'No',
  Aprobada: l.aprobacion || siNo(false),
})))
</script>

<style scoped src="./comercial.css"></style>
