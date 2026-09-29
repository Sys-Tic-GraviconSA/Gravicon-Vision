<template>
  <div class="balance-tab">
    <!-- Opciones del cruce (en la URL) -->
    <div class="bal-bar">
      <div class="bal-info">
        <span class="bal-tag">Producción vs Facturación · m³</span>
        <span v-if="B" class="bal-periodo">{{ fechaLarga(B.desde) }} al {{ fechaLarga(B.hasta) }}</span>
        <span v-if="B" class="bal-sub">
          Lo facturado se pasa a m³ con el factor de cada material (t ÷ factor).
          <template v-if="B.lineasSueltas"> La facturación está completa desde el {{ fechaCorta(B.desde) }}; antes solo hay {{ B.lineasSueltas }} {{ B.lineasSueltas === 1 ? 'línea suelta' : 'líneas sueltas' }} (desde el {{ fechaCorta(B.primeraFacturada) }}) que no se cruzan.</template>
          <template v-if="B.hasta < B.ultFacturacion"> Corte en {{ fechaCorta(B.hasta) }}: la producción está cargada hasta ese día y la facturación hasta {{ fechaCorta(B.ultFacturacion) }}.</template>
        </span>
      </div>
      <div class="bal-controles">
        <div class="bal-grupo" role="group" aria-label="Agrupar por">
          <button v-for="a in AGRUPACIONES" :key="a.id" class="bal-btn" :class="{ active: agrupacion === a.id }" @click="agrupacion = a.id">{{ a.label }}</button>
        </div>
        <label class="bal-check"><input v-model="trasladosOn" type="checkbox" /> Sumar traslados</label>
        <label class="bal-check"><input v-model="donacionesOn" type="checkbox" /> Sumar donaciones</label>
        <label class="bal-check" title="Material de río sin procesar: se vende como se extrae, no pasa por la planta"><input v-model="soloProcesadoOn" type="checkbox" /> Solo material procesado</label>
      </div>
    </div>

    <SkeletonLoader v-if="cargandoProd && !B" :kpis="4" :charts="2" label="Cargando producción…" />
    <div v-else-if="!B" class="vacio">
      No hay días con producción y facturación a la vez en el rango seleccionado.
      <template v-if="prodStore.error"><br />Error al cargar la producción: {{ prodStore.error }}</template>
    </div>

    <template v-else>
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" v-bind="k" />
      </div>

      <div class="charts-grid cols-1">
        <ChartCard :title="`Producido vs ${salidaLbl} — por ${agrupNombre}`" :description="`m³ producidos (tabla diaria de la planta) y m³ equivalentes de lo ${trasladosOn || donacionesOn ? 'que salió del patio' : 'facturado'}, barras lado a lado`" :option="optComparativo" :height="380" tall />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Diferencia Acumulada (inventario estimado)" description="Producido − salidas, acumulado desde el inicio del cruce. Sube: se acumula en patio; baja: se consume inventario" :option="optAcumulado" :height="320" />
        <ChartCard title="Índice de Salida" description="Salidas ÷ producido por período. Sobre 100 % se despacha más de lo que se produce" :option="optIndice" :height="320" />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Producción por Línea" description="m³ producidos por cada línea en el período cruzado" :option="optLineas" :height="280" />
        <ChartCard title="Salidas por Familia" description="m³ equivalentes (y toneladas) de lo que salió, por familia de material" :option="optFamilias" :height="280" />
      </div>

      <div class="bal-card">
        <h4 class="bal-card-title">Detalle por {{ agrupNombre }}</h4>
        <div class="bal-table-wrap">
          <table class="bal-table">
            <thead>
              <tr>
                <th>{{ agrupNombre.charAt(0).toUpperCase() + agrupNombre.slice(1) }}</th>
                <th class="r">Producido m³</th><th class="r">Proyectado m³</th>
                <th class="r">Vendido t</th><th class="r">Vendido m³</th>
                <th v-if="trasladosOn" class="r">Traslados m³</th><th v-if="donacionesOn" class="r">Donaciones m³</th>
                <th class="r">Diferencia m³</th><th class="r">Acumulado m³</th><th class="r">Índice salida</th>
                <th class="r">Venta</th><th class="r">$ por m³ producido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in B.filas" :key="f.clave">
                <td class="strong">{{ f.etiqueta }}</td>
                <td class="r">{{ m3(f.producido) }}</td><td class="r muted">{{ f.proyectado ? m3(f.proyectado) : '—' }}</td>
                <td class="r">{{ t(f.vendidoT) }}</td><td class="r">{{ m3(f.vendidoM3) }}</td>
                <td v-if="trasladosOn" class="r">{{ f.trasladosM3 ? m3(f.trasladosM3) : '—' }}</td>
                <td v-if="donacionesOn" class="r">{{ f.donacionesM3 ? m3(f.donacionesM3) : '—' }}</td>
                <td class="r" :class="f.diferencia >= 0 ? 'pos' : 'neg'">{{ signo(f.diferencia) }}</td>
                <td class="r" :class="f.acumulado >= 0 ? 'pos' : 'neg'">{{ signo(f.acumulado) }}</td>
                <td class="r"><span v-if="f.indice !== null" class="pill" :class="claseIndice(f.indice)">{{ pct(f.indice, 0) }}</span><span v-else class="muted">sin producción</span></td>
                <td class="r">{{ cop(f.venta) }}</td>
                <td class="r">{{ f.producido ? cop(f.venta / f.producido) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td class="r">{{ m3(B.total.producido) }}</td><td class="r">{{ B.total.proyectado ? m3(B.total.proyectado) : '—' }}</td>
                <td class="r">{{ t(B.total.vendidoT) }}</td><td class="r">{{ m3(B.total.vendidoM3) }}</td>
                <td v-if="trasladosOn" class="r">{{ m3(B.total.trasladosM3) }}</td><td v-if="donacionesOn" class="r">{{ m3(B.total.donacionesM3) }}</td>
                <td class="r" :class="B.total.diferencia >= 0 ? 'pos' : 'neg'">{{ signo(B.total.diferencia) }}</td>
                <td class="r">—</td>
                <td class="r">{{ B.total.indice !== null ? pct(B.total.indice, 0) : '—' }}</td>
                <td class="r">{{ cop(B.total.venta) }}</td>
                <td class="r">{{ B.total.producido ? cop(B.total.venta / B.total.producido) : '—' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="bal-nota">
          Diferencia = producido − salidas (m³). Positiva: la planta produjo más de lo que salió (el material queda en patio);
          negativa: salió más de lo producido (se consume inventario o hay producción sin registrar).
          <template v-if="soloProcesadoOn && B.excluidoT"> Se excluyen {{ t(B.excluidoT) }} t ({{ m3(B.excluidoM3) }} m³) de material de río sin procesar vendido.</template>
          Los fletes nunca cuentan.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionBalanceTab.vue — Producción vs Facturación (/:planta/facturacion/balance).
 * Cruza por fecha los m³ producidos (hoja diaria de producción) con lo facturado en Novasoft
 * convertido a m³ equivalentes. Opciones en la URL: ?agrupar=semana&traslados=si&donaciones=si&procesado=no
 */
import { computed, onMounted } from 'vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import SkeletonLoader from '../../../components/ui/SkeletonLoader.vue'
import { useProduccionStore } from '../../../stores'
import { useQueryParam } from '../../../composables/useQueryState'
import { useEstiloGraficas, fmtN, cop, pct, punto, vacio, emphasis } from '../../../composables/useGraficasConcreto'
import { calcularBalance, produccionPorDia, type Agrupacion } from '../../../composables/useBalanceProduccion'
import { COLOR_FAMILIA, COLOR_TIPO, fechaCorta, fechaLarga } from '../../../composables/useFacturacion'
import { PLANTAS } from '../../../config/plantas'
import type { LineaFacturacion } from '../../../types/facturacion'

const props = defineProps<{
  lineas: LineaFacturacion[]
  planta: string
  plantaId: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  subtipos: Record<string, string>
}>()

const { labelPill, base, leyenda, ejeX, ejeY, barrasH, zoom, isLight, tinta } = useEstiloGraficas()
const m3 = (n: number) => fmtN(n, 0)
const t = (n: number) => fmtN(n, n >= 100 ? 0 : 1)
const signo = (n: number) => (n > 0 ? '+' : '') + fmtN(n, 0)
const COLOR_SALIDA = COLOR_TIPO.venta

// ── Opciones (URL) ──
const AGRUPACIONES: { id: Agrupacion; label: string }[] = [{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]
const agrupacion = useQueryParam<Agrupacion>('agrupar', 'dia', ['dia', 'semana', 'mes'])
const agrupNombre = computed(() => ({ dia: 'día', semana: 'semana', mes: 'mes' })[agrupacion.value])
const siNo = (k: string, def: 'si' | 'no') => {
  const q = useQueryParam(k, def, ['si', 'no'] as const)
  return computed({ get: () => q.value === 'si', set: (v: boolean) => { q.value = v ? 'si' : 'no' } })
}
const trasladosOn = siNo('traslados', 'no')
const donacionesOn = siNo('donaciones', 'no')
const soloProcesadoOn = siNo('procesado', 'si')
const salidaLbl = computed(() => (trasladosOn.value || donacionesOn.value ? 'Salidas' : 'Facturado'))

// ── Producción de la planta (mismo store de la pestaña Producción) ──
const prodStore = useProduccionStore()
const filasProd = computed(() => ((props.plantaId === 'cuncia' ? prodStore.cunciaData?.rows : prodStore.acaciasData?.rows) ?? []) as Record<string, unknown>[])
const cargandoProd = computed(() => prodStore.loading)
onMounted(() => { if (!filasProd.value.length) props.plantaId === 'cuncia' ? prodStore.fetchCuncia() : prodStore.fetchAcacias() })
const lineasPlanta = computed(() => PLANTAS[props.plantaId].produccion?.lines ?? [])
const produccion = computed(() => produccionPorDia(filasProd.value, lineasPlanta.value))

const B = computed(() => calcularBalance(props.lineas, produccion.value,
  { traslados: trasladosOn.value, donaciones: donacionesOn.value, soloProcesado: soloProcesadoOn.value }, agrupacion.value))

const claseIndice = (i: number) => (i > 110 ? 'p-rojo' : i < 90 ? 'p-ambar' : 'p-verde')

// ── KPIs ──
const fila = (color: string, label: string, valor: string) =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-label-int' style='color:${color}'>${label}</span> <strong>${valor}</strong></div>`
const kpis = computed(() => {
  const T = B.value!.total
  const cumpl = T.proyectado ? (T.producido / T.proyectado) * 100 : null
  return [
    { label: 'Producido', value: `${m3(T.producido)} m³`, icon: 'layers', accent: tinta.value,
      detail: lineasPlanta.value.map((l, i) => fila(['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i % 4], l.label, `${m3(T.porLinea[l.label] ?? 0)} m³`)).join('')
        + (cumpl !== null ? fila('#64748B', 'Vs. proyectado', pct(cumpl, 0)) : '') },
    { label: salidaLbl.value, value: `${m3(T.salidaM3)} m³`, icon: 'truck', accent: COLOR_SALIDA,
      detail: fila(COLOR_TIPO.venta, 'Vendido', `${t(T.vendidoT)} t · ${m3(T.vendidoM3)} m³`)
        + (trasladosOn.value ? fila(COLOR_TIPO.traslado, 'Traslados', `${m3(T.trasladosM3)} m³`) : '')
        + (donacionesOn.value ? fila(COLOR_TIPO.donacion, 'Donaciones', `${m3(T.donacionesM3)} m³`) : '') },
    { label: 'Diferencia (Producido − Salidas)', value: `${signo(T.diferencia)} m³`, icon: 'activity', accent: T.diferencia >= 0 ? '#16A34A' : '#DC2626',
      detail: fila('#64748B', T.diferencia >= 0 ? 'Queda en patio' : 'Sale de inventario', `${m3(Math.abs(T.diferencia))} m³`) },
    { label: 'Índice de Salida', value: T.indice !== null ? pct(T.indice, 0) : '—', icon: 'target', accent: T.indice === null ? '#64748B' : T.indice > 110 ? '#DC2626' : T.indice < 90 ? '#F59E0B' : '#16A34A',
      detail: fila('#64748B', 'Salidas ÷ producido', '') + fila('#64748B', 't por m³ producido', T.producido ? fmtN(T.salidaT / T.producido, 2) : '—') },
    { label: 'Venta por m³ Producido', value: T.producido ? cop(T.venta / T.producido) : '—', icon: 'dollar', accent: '#10B981',
      detail: fila('#10B981', 'Venta', cop(T.venta)) },
    { label: 'Días Cruzados', value: fmtN(T.dias, 0), icon: 'clock', accent: '#8B5CF6',
      detail: fila('#8B5CF6', 'Desde', fechaCorta(B.value!.desde)) + fila('#8B5CF6', 'Hasta', fechaCorta(B.value!.hasta)) },
  ]
})

// ── Gráficas ──
const optComparativo = computed(() => {
  const b = B.value
  if (!b) return null
  const f = b.filas
  const z = zoom(f.length)
  const serie = (name: string, color: string, datos: number[]) => ({
    name, type: 'bar' as const, barMaxWidth: 18, barGap: '10%', emphasis, data: datos.map(v => Math.round(v)),
    itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    label: { ...labelPill.value, show: f.length <= 12, position: 'top' as const, formatter: (p: any) => (p.value ? m3(p.value) : '') },
  })
  const series = [serie('Producido', tinta.value, f.map(x => x.producido)), serie(salidaLbl.value, COLOR_SALIDA, f.map(x => x.salidaM3))]
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = f[ps[0].dataIndex]
        return `<b>${x.etiqueta}</b> <span style="color:#94a3b8">· ${x.dias} ${x.dias === 1 ? 'día' : 'días'}</span><br/>` +
          `${punto(tinta.value)} Producido: <b>${m3(x.producido)} m³</b>${x.proyectado ? ` <span style="color:#94a3b8">(proyectado ${m3(x.proyectado)})</span>` : ''}<br/>` +
          `${punto(COLOR_TIPO.venta)} Vendido: <b>${m3(x.vendidoM3)} m³</b> · ${t(x.vendidoT)} t<br/>` +
          (trasladosOn.value ? `${punto(COLOR_TIPO.traslado)} Traslados: <b>${m3(x.trasladosM3)} m³</b><br/>` : '') +
          (donacionesOn.value ? `${punto(COLOR_TIPO.donacion)} Donaciones: <b>${m3(x.donacionesM3)} m³</b><br/>` : '') +
          `${punto(x.diferencia >= 0 ? '#16A34A' : '#DC2626')} Diferencia: <b>${signo(x.diferencia)} m³</b>` + (x.indice !== null ? ` · índice ${pct(x.indice, 0)}` : '') } },
    legend: leyenda([{ name: 'Producido', itemStyle: { color: tinta.value } }, { name: salidaLbl.value, itemStyle: { color: COLOR_SALIDA } }]),
    grid: { left: 12, right: 20, bottom: z.gridBottom, top: 40, containLabel: true },
    xAxis: ejeX(f.map(x => x.etiqueta)),
    yAxis: ejeY(),
    dataZoom: z.dataZoom,
    series,
  }, f.length > 0)
})

const optAcumulado = computed(() => {
  const b = B.value
  if (!b) return null
  const f = b.filas
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis', formatter: (ps: any[]) => { const x = f[ps[0].dataIndex]
      return `<b>${x.etiqueta}</b><br/>Diferencia del período: <b>${signo(x.diferencia)} m³</b><br/>Acumulado: <b>${signo(x.acumulado)} m³</b>` } },
    grid: { left: 12, right: 20, bottom: 24, top: 24, containLabel: true },
    xAxis: ejeX(f.map(x => x.etiqueta), { boundaryGap: false }),
    yAxis: { ...ejeY(), max: undefined, axisLabel: { show: true, fontSize: 10, color: isLight.value ? '#94a3b8' : '#64748b', formatter: (v: number) => fmtN(v, 0) } },
    series: [{
      name: 'Acumulado', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 5, data: f.map(x => Math.round(x.acumulado)),
      lineStyle: { width: 2, color: tinta.value }, itemStyle: { color: tinta.value }, areaStyle: { opacity: 0.08, color: tinta.value },
      markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 }, data: [{ yAxis: 0 }] },
      endLabel: { ...labelPill.value, formatter: (p: any) => `${signo(p.value)} m³` },
    }],
  }, f.length > 0)
})

const optIndice = computed(() => {
  const b = B.value
  if (!b) return null
  const f = b.filas.filter(x => x.indice !== null)
  const color = (i: number) => (i > 110 ? '#DC2626' : i < 90 ? '#F59E0B' : '#16A34A')
  return vacio({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps: any[]) => { const x = f[ps[0].dataIndex]
      return `<b>${x.etiqueta}</b><br/>Índice de salida: <b>${pct(x.indice!, 0)}</b><br/>${m3(x.salidaM3)} m³ salidos de ${m3(x.producido)} m³ producidos` } },
    grid: { left: 12, right: 20, bottom: 24, top: 24, containLabel: true },
    xAxis: ejeX(f.map(x => x.etiqueta)),
    yAxis: ejeY(),
    series: [{
      name: 'Índice', type: 'bar', barMaxWidth: 18, data: f.map(x => ({ value: Math.round(x.indice!), itemStyle: { color: color(x.indice!), borderRadius: [3, 3, 0, 0] } })),
      label: { ...labelPill.value, show: f.length <= 16, position: 'top', formatter: (p: any) => `${p.value}%` },
      markLine: { silent: true, symbol: 'none', label: { show: true, formatter: '100 %', color: '#94a3b8', fontSize: 10 }, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 }, data: [{ yAxis: 100 }] },
    }],
  }, f.length > 0)
})

const optLineas = computed(() => {
  const T = B.value?.total
  if (!T) return null
  const ls = lineasPlanta.value.map(l => ({ nombre: l.label, v: T.porLinea[l.label] ?? 0 })).filter(x => x.v > 0)
  const txt = (v: number) => `${m3(v)} m³ · ${pct(T.producido ? v / T.producido * 100 : 0, 0)}`
  return vacio(barrasH(ls.map(x => x.nombre), [{
    name: 'Producido', type: 'bar', barWidth: '50%', emphasis,
    data: ls.map((x, i) => ({ value: Math.round(x.v), itemStyle: { color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i % 4], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(p.value) },
  }], ls.map(x => txt(x.v)), { trigger: 'item', formatter: (p: any) => `<b>${p.name}</b><br/>${txt(p.value)}` }, false), ls.length > 0)
})

const optFamilias = computed(() => {
  const fs = B.value?.porFamiliaM3 ?? []
  const total = fs.reduce((a, f) => a + f.m3, 0)
  const txt = (f: typeof fs[number]) => `${m3(f.m3)} m³ · ${t(f.t)} t`
  return vacio(barrasH(fs.map(f => f.familia), [{
    name: 'Salidas', type: 'bar', barWidth: '50%', emphasis,
    data: fs.map(f => ({ value: Math.round(f.m3), itemStyle: { color: COLOR_FAMILIA[f.familia], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (p: any) => txt(fs[p.dataIndex]) },
  }], fs.map(txt), { trigger: 'item', formatter: (p: any) => { const f = fs[p.dataIndex]
    return `<b>${f.familia}</b><br/>${txt(f)} (${pct(total ? f.m3 / total * 100 : 0, 0)})` } }, false), fs.length > 0)
})
</script>

<style scoped>
.balance-tab { display: flex; flex-direction: column; }
.bal-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 12px 16px; margin-bottom: 16px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg);
}
.bal-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 320px; }
.bal-tag { font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--accent); }
.bal-periodo { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.bal-sub { font-size: 12px; color: var(--text-tertiary); }
.bal-controles { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bal-grupo { display: flex; gap: 4px; }
.bal-btn {
  padding: 6px 12px; border: 1px solid var(--card-border); background: transparent; color: var(--text-secondary);
  font-size: 12px; font-family: inherit; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast);
}
.bal-btn:hover { color: var(--text-primary); border-color: var(--card-border-hover); }
.bal-btn.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); font-weight: 600; }
.bal-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
.bal-check input { accent-color: var(--accent); width: 15px; height: 15px; }
.vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }
.kpi-row { margin-bottom: 4px; grid-template-columns: repeat(3, 1fr); }
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.charts-grid { margin-top: 16px; }
.charts-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }

.bal-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: 20px; margin-top: 20px; }
.bal-card-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.bal-table-wrap { overflow-x: auto; max-height: 520px; overflow-y: auto; }
.bal-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.bal-table th {
  text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--text-tertiary);
  padding: 8px 10px; border-bottom: 1px solid var(--card-border); white-space: nowrap; position: sticky; top: 0; background: var(--card-bg); z-index: 1;
}
.bal-table td { padding: 9px 10px; color: var(--text-secondary); border-bottom: 1px solid var(--card-border); white-space: nowrap; }
.bal-table tbody tr:hover td { background: var(--card-bg-hover); }
.bal-table tfoot td { color: var(--text-primary); font-weight: 700; border-bottom: none; position: sticky; bottom: 0; background: var(--card-bg); }
.bal-table .r { text-align: right; }
.bal-table .strong { color: var(--text-primary); font-weight: 600; }
.bal-table .muted { color: var(--text-tertiary); }
.bal-table .pos { color: var(--success); font-weight: 600; }
.bal-table .neg { color: var(--danger); font-weight: 600; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 9px; font-size: 11px; font-weight: 700; }
.p-rojo { background: var(--danger-light); color: var(--danger); }
.p-verde { background: var(--success-light); color: var(--success); }
.p-ambar { background: var(--warning-light); color: var(--warning); }
.bal-nota { margin: 12px 0 0; font-size: 12px; color: var(--text-tertiary); line-height: 1.5; }

@media (max-width: 1200px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .bal-bar { padding: 10px 12px; }
  .bal-controles { width: 100%; }
  .bal-grupo { width: 100%; }
  .bal-btn { flex: 1; }
  .bal-card { padding: 14px; }
  .bal-table { font-size: 12px; }
  .bal-table th:first-child, .bal-table td:first-child { position: sticky; left: 0; background: var(--card-bg); z-index: 2; }
}
@media (max-width: 480px) { .kpi-row { grid-template-columns: 1fr; } }
</style>
