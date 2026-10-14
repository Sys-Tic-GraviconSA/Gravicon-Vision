<template>
  <div class="comercial-tab">
    <EmptyState v-if="!total" title="El F227 aún no tiene registros"
      description="La tabla m_dulo_f227 de Supabase está vacía. Cuando lleguen las ofertas F227 desde Zoho, aquí aparecen sus indicadores y entran como etapa del embudo." />
    <EmptyState v-else-if="!ofertas.length" title="Sin ofertas F227" description="No hay ofertas F227 con los filtros elegidos." />
    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Evolución</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Ofertas vs. Aprobadas por Mes" description="Encima, la tasa de aprobación del mes" :option="optMesCantidad" :height="320" />
        <ChartCard title="Valor Ofertado vs. Aprobado por Mes" description="Millones de pesos (subtotal de las líneas)" :option="optMesValor" :height="320" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Distribución</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Estado de las Ofertas" description="Según el estado del F227" :option="optEstado" :height="300" />
        <ChartCard title="Segmento del Cliente" :option="optSegmento" :height="300" />
        <ChartCard title="Aprobación por Asesor" description="Gris: ofertas · color: aprobadas · aprobadas / ofertas · tasa" :option="optAsesor" :height="300" />
        <ChartCard title="Aprobación por Planta" description="Gris: ofertas · color: aprobadas · aprobadas / ofertas · tasa" :option="optPlanta" :height="300" />
        <ChartCard title="Canal del Cliente" :option="optCanal" :height="300" />
        <ChartCard title="Bombeo" description="Ofertas con y sin bombeo" :option="optBombeo" :height="300" />
      </div>

      <template v-if="tablaMotivos.length">
        <div class="section-divider"></div>
        <DataTable title="Motivos de No Aprobación" :data="tablaMotivos" :page-size="10" small />
      </template>

      <div class="section-divider"></div>
      <DataTable title="Detalle de Ofertas F227" :data="tablaDetalle" :page-size="15" small exportColumns />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * F227Tab.vue — Indicadores de las ofertas formales de concreto (m_dulo_f227): volumen, aprobación,
 * valor y m³, tiempos de respuesta, estado, segmento, canal, bombeo y motivos de no aprobación.
 */
import { computed } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { fmtN, pct, PALETA } from '../../composables/useGraficasConcreto'
import { diasRespuesta, mediana, millones, tasa, type OfertaF227 } from '../../composables/useComercial'
import { useGraficasComercial, AZUL, VERDE, MORADO, AMBAR } from './useGraficasComercial'

const props = defineProps<{ ofertas: OfertaF227[]; total: number }>()
const g = useGraficasComercial()

const contar = <T,>(xs: T[], f: (x: T) => boolean) => xs.reduce((a, x) => a + (f(x) ? 1 : 0), 0)
const sumar = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0)

const kpis = computed(() => {
  const os = props.ofertas
  const n = os.length, aprobadas = contar(os, o => o.aprobada)
  const clientes = new Set(os.map(o => o.nits[0] || o.nombreKey || o.id)).size
  const valor = sumar(os, o => o.valor), valorAprob = sumar(os.filter(o => o.aprobada), o => o.valor)
  const m3 = sumar(os, o => o.m3), m3Aprob = sumar(os.filter(o => o.aprobada), o => o.m3)
  const resp = mediana(diasRespuesta(os))
  const dist = os.filter(o => o.distancia > 0)
  return [
    { label: 'Ofertas F227', value: fmtN(n), icon: 'list', accent: '#64748B', detail: `${fmtN(clientes)} clientes` },
    { label: 'Aprobadas', value: fmtN(aprobadas), icon: 'check-circle', accent: VERDE, detail: `Tasa de aprobación <b>${pct(tasa(aprobadas, n))}</b>` },
    { label: 'Valor Ofertado', value: millones(valor), icon: 'dollar', accent: MORADO, detail: `${millones(valorAprob)} aprobado (${pct(tasa(valorAprob, valor))})` },
    { label: 'm³ Ofertados', value: fmtN(m3), icon: 'package', accent: AZUL, detail: `${fmtN(m3Aprob)} m³ aprobados` },
    { label: 'Precio Promedio m³', value: m3 ? `$ ${fmtN(valor / m3)}` : '—', icon: 'trending-up', accent: AZUL, detail: 'Valor ofertado ÷ m³ (incluye servicios)' },
    { label: 'Días de Respuesta', value: resp === null ? '—' : fmtN(resp, 1), icon: 'clock', accent: AMBAR, detail: 'Mediana de solicitud → envío de la oferta' },
    { label: 'Distancia Promedio', value: dist.length ? `${fmtN(sumar(dist, o => o.distancia) / dist.length, 1)} km` : '—', icon: 'map-pin', accent: '#06B6D4', detail: 'De la planta a la obra' },
  ]
})

const porMes = computed(() => {
  const m = new Map<string, { n: number; ap: number; valor: number; valorAp: number }>()
  for (const o of props.ofertas) {
    if (!o.fecha) continue
    const k = o.fecha.slice(0, 7)
    const x = m.get(k) ?? { n: 0, ap: 0, valor: 0, valorAp: 0 }
    x.n++; x.valor += o.valor
    if (o.aprobada) { x.ap++; x.valorAp += o.valor }
    m.set(k, x)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
})
const optMesCantidad = computed(() => {
  const ms = porMes.value
  return g.porMes(ms.map(x => x[0]), [
    { name: 'Ofertas', color: g.gris.value, data: ms.map(x => x[1].n) },
    { name: 'Aprobadas', color: VERDE, data: ms.map(x => x[1].ap) },
  ], v => fmtN(v), i => pct(tasa(ms[i][1].ap, ms[i][1].n), 0))
})
const optMesValor = computed(() => {
  const ms = porMes.value
  return g.porMes(ms.map(x => x[0]), [
    { name: 'Ofertado', color: g.gris.value, data: ms.map(x => Math.round(x[1].valor / 1e6)) },
    { name: 'Aprobado', color: MORADO, data: ms.map(x => Math.round(x[1].valorAp / 1e6)) },
  ], v => `$ ${fmtN(v)} M`)
})

function donaPor(clave: (o: OfertaF227) => string) {
  const m = new Map<string, number>()
  for (const o of props.ofertas) m.set(clave(o), (m.get(clave(o)) ?? 0) + 1)
  const items = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: PALETA[(i + 1) % PALETA.length] }))
  return g.dona(items, fmtN(props.ofertas.length), 'ofertas')
}
const optEstado = computed(() => donaPor(o => o.estado))
const optSegmento = computed(() => donaPor(o => o.segmento))
const optCanal = computed(() => donaPor(o => o.canal))
const optBombeo = computed(() => donaPor(o => o.bombeo))

function comparar(clave: (o: OfertaF227) => string) {
  const m = new Map<string, { total: number; logrado: number }>()
  for (const o of props.ofertas) {
    const x = m.get(clave(o)) ?? { total: 0, logrado: 0 }
    x.total++; if (o.aprobada) x.logrado++
    m.set(clave(o), x)
  }
  return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x }))
}
const optAsesor = computed(() => g.comparativo(comparar(o => o.asesor), { total: 'Ofertas', logrado: 'Aprobadas' }, VERDE))
const optPlanta = computed(() => g.comparativo(comparar(o => o.planta), { total: 'Ofertas', logrado: 'Aprobadas' }, VERDE))

const tablaMotivos = computed(() => {
  const m = new Map<string, { n: number; valor: number }>()
  for (const o of props.ofertas) {
    if (o.aprobada || !o.motivo) continue
    const x = m.get(o.motivo) ?? { n: 0, valor: 0 }
    x.n++; x.valor += o.valor
    m.set(o.motivo, x)
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([motivo, x]) => ({ Motivo: motivo, Ofertas: x.n, 'Valor perdido': Math.round(x.valor) }))
})

const tablaDetalle = computed(() => [...props.ofertas].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(o => ({
  Consecutivo: o.consecutivo || '—',
  Solicitud: o.solicitud || '—',
  Cliente: o.cliente,
  Obra: o.obra || '—',
  NIT: o.nit || '—',
  Planta: o.planta,
  Asesor: o.asesor,
  Segmento: o.segmento,
  Estado: o.estado,
  Valor: Math.round(o.valor),
  'm³': Math.round(o.m3 * 10) / 10,
  Aprobada: o.aprobacion || (o.aprobada ? 'Sí' : 'No'),
})))
</script>

<style scoped src="./comercial.css"></style>
