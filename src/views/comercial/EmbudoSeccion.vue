<template>
  <section class="embudo-seccion">
    <h3 class="section-title"><span class="title-bar"></span>Embudo y eficiencia</h3>
    <p class="section-sub">
      Cada posible cliente cuenta una vez (sus {{ plural }} se agrupan por NIT o, sin NIT, por nombre).
      «Compraron» = remisiones de concreto o facturas de agregados desde su primera solicitud.
    </p>

    <EmptyState v-if="!clientes.length" title="Sin posibles clientes" :description="`No hay ${plural} con los filtros elegidos.`" />
    <template v-else>
      <div v-if="notas.length" class="aviso">
        <span>ⓘ</span>
        <div><strong>Cómo leer el embudo</strong>
          <ul><li v-for="n in notas" :key="n" v-html="n"></li></ul>
        </div>
      </div>

      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <div class="charts-grid cols-2">
        <ChartCard title="Embudo Comercial" description="Clientes en cada etapa y % frente a los posibles clientes" :option="optEmbudo" :height="360" />
        <ChartCard title="Conversión por Mes de Solicitud" description="Posibles clientes de cada mes y cuántos ya compraron; encima, la conversión" :option="optCohorte" :height="360" />
        <ChartCard v-if="porNegocio" title="Conversión por Negocio" description="Gris: posibles clientes · color: compraron · tasa de conversión" :option="optNegocio" :height="300" />
        <ChartCard title="Conversión por Asesor" description="Gris: posibles clientes · color: compraron · tasa de conversión" :option="optAsesor" :height="300" />
        <ChartCard v-if="!porNegocio" title="Conversión por Planta" description="Gris: posibles clientes · color: compraron · tasa de conversión" :option="optPlanta" :height="300" />
      </div>

      <div class="section-divider"></div>
      <DataTable title="Clientes del Embudo" :data="tabla" :page-size="10" small exportColumns />
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * EmbudoSeccion.vue — Embudo de eficiencia comercial por cliente, igual para Leads y para F227:
 * posible cliente → oferta enviada → aprobada → (F227, solo en Leads) → compró.
 * La compra se cruza por NIT con las remisiones de concreto (order_detail) y las ventas de agregados (Novasoft),
 * según el negocio cotizado, y solo cuenta desde la primera solicitud del cliente.
 */
import { computed } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { fmtN, pct } from '../../composables/useGraficasConcreto'
import { mediana, millones, tasa, NEGOCIOS, type ClienteEmbudo, type IndiceCompras } from '../../composables/useComercial'
import { useGraficasComercial, AZUL, VERDE, MORADO, AMBAR } from './useGraficasComercial'

const props = withDefaults(defineProps<{
  clientes: ClienteEmbudo[]
  indice: IndiceCompras | null
  avisos: string[]
  /** Nombre de los registros: «cotizaciones» u «ofertas F227» */
  plural: string
  /** Embudo de Leads: incluye la etapa F227 (si la tabla del F227 tiene registros) */
  etapaF227?: boolean
  hayF227?: boolean
  /** Muestra la conversión por negocio (Leads); si no, por planta (F227, solo concreto) */
  porNegocio?: boolean
}>(), { etapaF227: false, hayF227: false, porNegocio: false })
const g = useGraficasComercial()

const contar = (f: (c: ClienteEmbudo) => boolean) => props.clientes.reduce((a, c) => a + (f(c) ? 1 : 0), 0)
const fechaLarga = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const conF227 = computed(() => props.etapaF227 && props.hayF227)

const notas = computed(() => {
  const n = [...props.avisos]
  const i = props.indice
  if (i?.desdeConcreto) n.push(`Las remisiones de concreto empiezan el <b>${fechaLarga(i.desdeConcreto)}</b>${props.porNegocio && i.desdeAgregados ? ` y la facturación de agregados el <b>${fechaLarga(i.desdeAgregados)}</b>` : ''}: un cliente cotizado antes pudo comprar sin que se vea aquí.`)
  if (props.etapaF227 && !props.hayF227) n.push('La etapa <b>F227</b> no se muestra: la tabla del F227 aún no tiene registros.')
  const sinCruce = contar(c => c.cruce === 'Sin cruce')
  if (sinCruce) n.push(`<b>${fmtN(sinCruce)}</b> posibles clientes no tienen NIT ni un nombre que coincida con las compras: no se puede saber si compraron.`)
  return n
})

const kpis = computed(() => {
  const total = props.clientes.length
  const compraron = props.clientes.filter(c => c.compro)
  const aprobados = contar(c => c.aprobada), aprobCompra = contar(c => c.aprobada && c.compro)
  const sinAprob = compraron.filter(c => !c.aprobada).length
  const dias = mediana(compraron.map(c => c.diasACompra).filter((d): d is number => d !== null))
  const valor = compraron.reduce((a, c) => a + c.valorComprado, 0), m3 = compraron.reduce((a, c) => a + c.m3Comprado, 0)
  const detalleTotal = props.porNegocio
    ? NEGOCIOS.map(n => [n, contar(c => c.negocio === n)] as const).filter(x => x[1]).map(([n, v]) => `${n} ${fmtN(v)}`).join(' · ')
    : `${fmtN(props.clientes.reduce((a, c) => a + c.registros, 0))} ${props.plural}`
  return [
    { label: 'Posibles Clientes', value: fmtN(total), icon: 'users', accent: '#64748B', detail: detalleTotal },
    { label: 'Compraron', value: fmtN(compraron.length), icon: 'check-circle', accent: VERDE, detail: `Conversión <b>${pct(tasa(compraron.length, total))}</b>` },
    { label: 'Aprobados que Compraron', value: pct(tasa(aprobCompra, aprobados)), icon: 'target', accent: AZUL, detail: `${fmtN(aprobCompra)} de ${fmtN(aprobados)} con oferta aprobada${sinAprob ? ` · ${fmtN(sinAprob)} compraron sin aprobación registrada` : ''}` },
    { label: 'Valor Comprado', value: millones(valor), icon: 'dollar', accent: MORADO, detail: `Desde la solicitud${m3 ? ` · ${fmtN(m3)} m³ de concreto` : ''}` },
    { label: 'Días a la Primera Compra', value: dias === null ? '—' : fmtN(dias), icon: 'clock', accent: AMBAR, detail: 'Mediana desde la primera solicitud' },
    { label: 'Ya Eran Clientes', value: fmtN(contar(c => c.yaEraCliente)), icon: 'activity', accent: '#06B6D4', detail: 'Compraron antes de la solicitud' },
  ]
})

const optEmbudo = computed(() => g.embudo([
  { name: 'Posibles clientes', value: props.clientes.length, color: '#64748B' },
  { name: 'Oferta enviada', value: contar(c => c.enviada), color: AZUL },
  { name: 'Oferta aprobada', value: contar(c => c.aprobada), color: MORADO },
  ...(conF227.value ? [{ name: 'Con F227', value: contar(c => c.f227 > 0), color: AMBAR, nota: 'Clientes con al menos una oferta F227 (por NIT o nombre)' }] : []),
  { name: 'Compraron', value: contar(c => c.compro), color: VERDE, nota: 'Remisiones de concreto o facturas de agregados desde la primera solicitud' },
]))

const optCohorte = computed(() => {
  const m = new Map<string, { n: number; compro: number }>()
  for (const c of props.clientes) {
    if (!c.primeraSolicitud) continue
    const k = c.primeraSolicitud.slice(0, 7)
    const x = m.get(k) ?? { n: 0, compro: 0 }
    x.n++; if (c.compro) x.compro++
    m.set(k, x)
  }
  const ms = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  return g.porMes(ms.map(x => x[0]), [
    { name: 'Posibles clientes', color: g.gris.value, data: ms.map(x => x[1].n) },
    { name: 'Compraron', color: VERDE, data: ms.map(x => x[1].compro) },
  ], v => fmtN(v), i => pct(tasa(ms[i][1].compro, ms[i][1].n), 0))
})

function comparar(clave: (c: ClienteEmbudo) => string) {
  const m = new Map<string, { total: number; logrado: number }>()
  for (const c of props.clientes) {
    const x = m.get(clave(c)) ?? { total: 0, logrado: 0 }
    x.total++; if (c.compro) x.logrado++
    m.set(clave(c), x)
  }
  return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x }))
}
const NOMBRES = { total: 'Posibles clientes', logrado: 'Compraron' }
const optNegocio = computed(() => g.comparativo(comparar(c => c.negocio), NOMBRES, VERDE))
const optAsesor = computed(() => g.comparativo(comparar(c => c.asesor), NOMBRES, VERDE))
const optPlanta = computed(() => g.comparativo(comparar(c => c.planta), NOMBRES, VERDE))

const etapa = (c: ClienteEmbudo) => (c.compro ? 'Compró' : conF227.value && c.f227 ? 'F227' : c.aprobada ? 'Aprobada' : c.enviada ? 'Enviada' : 'Solicitud')
const columnaRegistros = computed(() => props.plural.charAt(0).toUpperCase() + props.plural.slice(1))
const tabla = computed(() => [...props.clientes]
  .sort((a, b) => Number(b.compro) - Number(a.compro) || b.valorCotizado - a.valorCotizado)
  .map(c => ({
    Cliente: c.nombre,
    NIT: c.nit || '—',
    ...(props.porNegocio ? { Negocio: c.negocio } : { Planta: c.planta }),
    Asesor: c.asesor,
    '1ª solicitud': c.primeraSolicitud || '—',
    [columnaRegistros.value]: c.registros,
    'Valor ofertado': Math.round(c.valorCotizado),
    Etapa: etapa(c),
    ...(conF227.value ? { F227: c.f227 } : {}),
    '1ª compra': c.primeraCompra || '—',
    'Días a compra': c.diasACompra ?? '—',
    'Valor comprado': Math.round(c.valorComprado),
    'm³ comprados': Math.round(c.m3Comprado),
    'Ya era cliente': c.yaEraCliente ? 'Sí' : 'No',
    Cruce: c.cruce,
  })))
</script>

<style scoped src="./comercial.css"></style>
