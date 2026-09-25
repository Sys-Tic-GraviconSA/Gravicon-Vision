<template>
  <div class="graficas-tab">
    <div class="gt-bar">
      <div class="gt-info">
        <span class="gt-tag">Tablero de producción · {{ periodoLbl }}</span>
        <span class="gt-periodo">Indicadores: {{ ventanaKpi.titulo.toLowerCase() }} — {{ tramo(ventanaKpi.desde, ventanaKpi.hasta) }}</span>
        <span class="gt-sub">Las flechas comparan con {{ ventanaKpi.cmp }} ({{ tramo(ventanaKpi.pDesde, ventanaKpi.pHasta) }}). Las tendencias se agrupan por {{ granNombre }}.</span>
      </div>
      <!-- Manda sobre los KPIs y sobre la agrupación de las gráficas de tendencia -->
      <div class="gt-gran" role="group" aria-label="Ver">
        <span class="gt-gran-lbl">Ver</span>
        <button v-for="v in VISTAS" :key="v.id" class="gt-gran-btn" :class="{ active: vista === v.id }" @click="vista = v.id">{{ v.label }}</button>
      </div>
    </div>

    <div v-if="!rsTodo.length" class="gt-vacio">No hay remisiones en el rango de fechas seleccionado.</div>

    <template v-else>
      <!-- Indicadores con desglose por planta (mismo formato de las tarjetas de Mantenimiento) -->
      <div class="kpi-row">
        <KpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :trend="k.trend" :detail="k.detail" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Tendencia de despacho — por {{ granNombre }}</h3>
      <p v-if="periodos.length > VENTANA" class="section-sub">
        Hay {{ periodos.length }} {{ granPlural }} en el rango: las gráficas muestran las últimas {{ VENTANA }}. Arrastra la barra inferior de cada gráfica (o usa la rueda del mouse sobre ella) para ver las anteriores.
      </p>
      <div class="charts-grid cols-1">
        <ChartCard title="Despacho por Planta" :description="`m³ de concreto por ${granNombre}, apilado por planta (sin agregados) · promedio ${fmtN(promPeriodo)} m³ por ${granNombre} (línea punteada)`" :option="optDespacho" :height="440" tall />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Venta Total" :description="`Venta antes de IVA por ${granNombre}: concreto con servicios y, apilados encima, los agregados`" :option="optVenta" :height="320" />
        <ChartCard title="Precio Promedio del Concreto" description="$ por m³ de concreto por planta, sin servicios ni agregados" :option="optPrecio" :height="320" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Plantas</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Participación por Planta" description="m³ de concreto por planta y su porcentaje del total (sin agregados)" :option="optParticipacion" :height="300" />
        <ChartCard title="Bombeo por Planta" description="m³ de concreto despachados con y sin servicio de bombeo" :option="optBombeo" :height="300" />
      </div>
      <div class="gt-card">
        <h4 class="gt-card-title">Resumen por Planta <span class="gt-card-note">— concreto; los agregados van en la última columna y no suman</span></h4>
        <div class="gt-table-wrap">
          <table class="gt-table">
            <thead>
              <tr>
                <th>Planta</th><th class="r">m³</th><th class="r">Part.</th><th class="r">Venta</th><th class="r">$ / m³</th>
                <th class="r">Remisiones</th><th class="r">m³ / remisión</th><th class="r">Clientes</th><th class="r">Bombeo</th><th class="r">Vs. período ant.</th><th class="r">Agregados m³</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in resumenPlantas" :key="p.planta">
                <td><span class="dot" :style="{ background: color(p.planta) }"></span>{{ p.planta }}</td>
                <td class="r strong">{{ fmtN(p.m3) }}</td>
                <td class="r">{{ pct(p.part) }}</td>
                <td class="r">{{ cop(p.venta) }}</td>
                <td class="r">{{ cop(p.precio) }}</td>
                <td class="r">{{ fmtN(p.rem, 0) }}</td>
                <td class="r">{{ fmtN(p.rem ? p.m3 / p.rem : 0) }}</td>
                <td class="r">{{ fmtN(p.clientes, 0) }}</td>
                <td class="r">{{ pct(p.m3 ? p.bombM3 / p.m3 * 100 : 0) }}</td>
                <td class="r" :class="p.varPrev === null ? '' : p.varPrev >= 0 ? 'pos' : 'neg'">{{ p.varPrev === null ? '—' : pct(p.varPrev, 1, true) }}</td>
                <td class="r muted">{{ p.agrM3 ? fmtN(p.agrM3) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td class="r strong">{{ fmtN(T.m3) }}</td>
                <td class="r">100,0%</td>
                <td class="r">{{ cop(T.venta) }}</td>
                <td class="r">{{ cop(T.precio) }}</td>
                <td class="r">{{ fmtN(T.rem, 0) }}</td>
                <td class="r">{{ fmtN(T.rem ? T.m3 / T.rem : 0) }}</td>
                <td class="r">{{ fmtN(T.clientes, 0) }}</td>
                <td class="r">{{ pct(T.m3 ? T.bombM3 / T.m3 * 100 : 0) }}</td>
                <td class="r" :class="T.varPrev === null ? '' : T.varPrev >= 0 ? 'pos' : 'neg'">{{ T.varPrev === null ? '—' : pct(T.varPrev, 1, true) }}</td>
                <td class="r">{{ agr.m3 ? fmtN(agr.m3) : '—' }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <template v-if="rsAgr.length">
        <h3 class="section-title"><span class="title-bar"></span>Agregados (arena y grava)</h3>
        <p class="section-sub">Ventas de agregados registradas en order_price, principalmente en Restrepo. No se cuentan como concreto en los indicadores ni en las demás gráficas.</p>
        <div class="charts-grid cols-2">
          <ChartCard title="Agregados Despachados" :description="`m³ de agregados por ${granNombre}, apilados por material`" :option="optAgrPeriodo" :height="320" />
          <ChartCard title="Agregados por Material" description="m³ y venta antes de IVA de cada material" :option="optAgrMaterial" :height="320" />
        </div>
      </template>

      <h3 class="section-title"><span class="title-bar"></span>Comercial y clientes</h3>
      <div class="charts-grid cols-2">
        <ChartCard title="Venta por Comercial" description="Venta de concreto antes de IVA, apilada por planta (sin agregados)" :option="optComercial" :expand-option="optComercialTodos" :height="380" />
        <ChartCard :title="`Ranking Top ${TOP} — Clientes por Volumen`" description="Clientes con más m³ de concreto en el período (sin agregados)" :option="optClientes" :expand-option="optClientesTodos" :height="380" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Equipos y personal</h3>
      <p class="section-sub">
        {{ rankMixers.length }} mixers y {{ rankConductores.length }} conductores con concreto despachado; {{ rankBombas.length }} bombas y {{ rankOperarios.length }} operarios con volumen bombeado.
        Al lado de cada barra: m³ · viajes (o servicios de bombeo). Usa «expandir» para ver la lista completa.
      </p>
      <div class="charts-grid cols-2">
        <ChartCard :title="`m³ por Mixer — Top ${TOP}`" description="Concreto despachado por cada mixer, apilado por planta" :option="optMixers" :expand-option="optMixersTodos" :height="380" />
        <ChartCard :title="`m³ por Conductor — Top ${TOP}`" description="Concreto despachado por cada conductor de mixer" :option="optConductores" :expand-option="optConductoresTodos" :height="380" />
        <ChartCard :title="`m³ por Bomba — Top ${TOP}`" description="Volumen bombeado por cada autobomba o estacionaria" :option="optBombas" :expand-option="optBombasTodos" :height="380" />
        <ChartCard :title="`m³ por Operario de Bombeo — Top ${TOP}`" description="Volumen bombeado por cada operario de bomba" :option="optOperarios" :expand-option="optOperariosTodos" :height="380" />
      </div>

      <h3 class="section-title"><span class="title-bar"></span>Producto y operación</h3>
      <div class="charts-grid cols-1">
        <ChartCard
          :title="`Diseños de Mezcla más Vendidos — Top ${TOP}`"
          :description="disenoTop ? `El más vendido es ${disenoTop.nombre}: ${fmtN(disenoTop.m3)} m³ (${pct(T.m3 ? disenoTop.m3 / T.m3 * 100 : 0)} del concreto) en ${fmtN(disenoTop.rem, 0)} remisiones · m³ por diseño, apilado por planta` : 'm³ por diseño de mezcla, apilado por planta'"
          :option="optDisenos" :expand-option="optDisenosTodos" :height="420" />
      </div>
      <div class="charts-grid cols-2">
        <ChartCard title="Volumen por Resistencia" description="m³ de concreto según la resistencia de la mezcla (sin agregados)" :option="optResistencia" :height="320" />
        <ChartCard title="Despacho Promedio por Día de la Semana" description="m³ promedio en los días con despacho, por planta (entre paréntesis: días del período)" :option="optSemana" :height="320" />
      </div>
    </template>
  </div>
</template>

/**
 * GraficasTab.vue — Tablero gráfico de Producción Concretos.
 * Calcula todo en el cliente desde order_price para el rango de fechas del filtro
 * global: KPIs con variación contra el período anterior, tendencia por día/semana/mes,
 * plantas, comerciales, clientes, resistencias y despacho por día de la semana.
 * Mismo estilo de las gráficas de Mantenimiento (colores por planta, etiquetas en píldora, KPIs con desglose).
 */
<script setup lang="ts">
import { ref, computed } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import { serialToDate } from '../../../utils/dates'
import { esAgregado } from '../../../utils/agregadosConcreto'
import {
  MESES_CORTOS, ORDEN_PLANTAS, COLOR_PLANTA, PALETA, COLOR_EXTRA, AZUL, FONT, VENTANA,
  fmtN, cop, copCorto, pct, num, nombrePlanta, titulo, punto, m3Lbl, vacio, emphasis, useEstiloGraficas,
} from '../../../composables/useGraficasConcreto'
import { use } from 'echarts/core'
import { LabelLayout } from 'echarts/features'

// Separa las etiquetas finales de las líneas de precio cuando quedan a la misma altura
use([LabelLayout])

const props = defineProps<{
  /** Filas de order_price filtradas por planta/comercial (todas las fechas) */
  rows: Record<string, unknown>[]
  /** Rango del filtro global (YYYY-MM-DD) */
  desde?: string
  hasta?: string
}>()

// ---------------------------------------------------------------- Utilidades
const TOP = 10
const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const { isLight, chartTextColor, labelPill, labelDentro, base, leyenda, ejeX, ejeY, zoom, barrasH } = useEstiloGraficas()

function isoDate(d: Date): string { return d.toISOString().slice(0, 10) }
function sumarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return isoDate(d)
}
function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
}
function resistencia(mezcla: string): string {
  // Mismo criterio del tablero anterior: "CON126 28BA7 …" → 28 MPa, "VCON615 MR40 …" → MR 40
  const m = mezcla.trim().match(/^\S+\s+(MR)?(\d{2,3})/i)
  if (m) return m[1] ? `MR ${m[2]}` : `${m[2]} MPa`
  const v = mezcla.match(/\b(14|17|21|24|28|31|35|40)\b/g)
  return v ? `${Math.max(...v.map(Number))} MPa` : 'Sin dato'
}

// ---------------------------------------------------------------- Normalización
interface Rem {
  iso: string; planta: string; cliente: string; comercial: string; mezcla: string
  m3: number; totalConc: number; servicio: boolean; servM3: number; subtotal: number; agregado: boolean
  mixer: string; conductor: string; bomba: string; operario: string
}
const todas = computed<Rem[]>(() => props.rows
  .filter(r => typeof r['Fecha'] === 'number' && r['Fecha'])
  .map(r => {
    const mezcla = String(r['Mezcla'] ?? '').trim()
    return {
      iso: isoDate(serialToDate(r['Fecha'] as number)),
      planta: nombrePlanta(r['Planta']),
      cliente: String(r['Cliente'] ?? '').trim() || 'Sin cliente',
      comercial: String(r['Comercial'] ?? '').trim() || 'Sin comercial',
      mezcla,
      m3: num(r['Cant. Concreto']),
      totalConc: num(r['Total Concreto']),
      servicio: !!String(r['Servicio'] ?? '').trim(),
      servM3: num(r['Cant. Servicio']),
      subtotal: num(r['Subtotal']),
      // Restrepo vende arena y grava que quedan en order_price como si fueran concreto
      agregado: esAgregado(mezcla, r['Cliente'], r['Planta']),
      mixer: String(r['Mixer'] ?? '').trim().toUpperCase(),
      conductor: titulo(String(r['Conductor'] ?? '').trim()),
      // Bomba y operario vienen de order_detail (se cruzan por remisión en el store)
      bomba: String(r['Bomba'] ?? '').trim().toUpperCase(),
      operario: titulo(String(r['Operario'] ?? '').trim()),
    }
  }))

const rango = computed(() => {
  let min = '9999-12-31', max = ''
  for (const r of todas.value) { if (r.iso < min) min = r.iso; if (r.iso > max) max = r.iso }
  const desde = props.desde && props.desde > min ? props.desde : min
  const hasta = props.hasta && props.hasta < max ? props.hasta : max
  return { desde, hasta }
})
const rsTodo = computed(() => todas.value.filter(r => r.iso >= rango.value.desde && r.iso <= rango.value.hasta))
// Todo el tablero mide concreto; los agregados (arena, grava) van aparte en su propia sección
const rs = computed(() => rsTodo.value.filter(r => !r.agregado))
const rsAgr = computed(() => rsTodo.value.filter(r => r.agregado))
// Período anterior de igual duración, inmediatamente antes del rango
const rsPrevTodo = computed(() => {
  const n = diasEntre(rango.value.desde, rango.value.hasta) + 1
  const hasta = sumarDias(rango.value.desde, -1), desde = sumarDias(rango.value.desde, -n)
  return todas.value.filter(r => r.iso >= desde && r.iso <= hasta)
})
const rsPrev = computed(() => rsPrevTodo.value.filter(r => !r.agregado))
const rsAgrPrev = computed(() => rsPrevTodo.value.filter(r => r.agregado))

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES_CORTOS[m - 1].toLowerCase()} ${y}`
}
const periodoLbl = computed(() => rsTodo.value.length
  ? `${fechaLarga(rango.value.desde)} – ${fechaLarga(rango.value.hasta)} · ${diasEntre(rango.value.desde, rango.value.hasta) + 1} días`
  : '')

// Plantas en orden fijo; el color sigue a la planta, no a su posición en el filtro
const plantasTodas = computed(() => {
  const set = new Set(todas.value.map(r => r.planta))
  const conocidas = ORDEN_PLANTAS.filter(p => set.has(p))
  const otras = [...set].filter(p => !ORDEN_PLANTAS.includes(p)).sort()
  return [...conocidas, ...otras]
})
const plantas = computed(() => { const s = new Set(rs.value.map(r => r.planta)); return plantasTodas.value.filter(p => s.has(p)) })
function color(p: string): string {
  if (COLOR_PLANTA[p]) return COLOR_PLANTA[p]
  const i = plantasTodas.value.filter(x => !COLOR_PLANTA[x]).indexOf(p)
  return COLOR_EXTRA[Math.max(i, 0) % COLOR_EXTRA.length]
}

// ---------------------------------------------------------------- Agregados
interface Acum { m3: number; venta: number; rem: number; conc: number; concM3: number; bombM3: number; clientes: Set<string>; dias: Set<string> }
function acumular(lista: Rem[]): Acum {
  const a: Acum = { m3: 0, venta: 0, rem: 0, conc: 0, concM3: 0, bombM3: 0, clientes: new Set(), dias: new Set() }
  for (const r of lista) {
    a.m3 += r.m3; a.venta += r.subtotal; a.rem++; a.clientes.add(r.cliente); a.dias.add(r.iso)
    a.conc += r.totalConc; a.concM3 += r.m3
    if (r.servicio) a.bombM3 += r.m3
  }
  return a
}
const variacion = (a: number, b: number) => (b ? (a / b - 1) * 100 : null)

// Totales, desglose por planta y agregados de un conjunto de remisiones frente a otro (período anterior)
function calcular(act: Rem[], ant: Rem[], agrAct: Rem[], agrAnt: Rem[]) {
  const a = acumular(act), b = acumular(ant)
  const T = {
    ...a, clientes: a.clientes.size, dias: a.dias.size,
    precio: a.concM3 ? a.conc / a.concM3 : 0,
    varPrev: variacion(a.m3, b.m3),
    prev: { ...b, precio: b.concM3 ? b.conc / b.concM3 : 0 },
  }
  const presentes = new Set(act.map(r => r.planta))
  const resumen = plantasTodas.value.filter(p => presentes.has(p)).map(p => {
    const x = acumular(act.filter(r => r.planta === p))
    const y = acumular(ant.filter(r => r.planta === p))
    return {
      planta: p, m3: x.m3, part: T.m3 ? x.m3 / T.m3 * 100 : 0, venta: x.venta,
      precio: x.concM3 ? x.conc / x.concM3 : 0, rem: x.rem, clientes: x.clientes.size, bombM3: x.bombM3,
      dias: x.dias.size, varPrev: variacion(x.m3, y.m3),
      agrM3: agrAct.filter(r => r.planta === p).reduce((s, r) => s + r.m3, 0),
    }
  })
  const ag = acumular(agrAct), agPrev = acumular(agrAnt)
  const porPlanta = new Map<string, { m3: number; venta: number }>()
  for (const r of agrAct) {
    const e = porPlanta.get(r.planta) ?? { m3: 0, venta: 0 }
    e.m3 += r.m3; e.venta += r.subtotal; porPlanta.set(r.planta, e)
  }
  const agr = { m3: ag.m3, venta: ag.venta, rem: ag.rem, clientes: ag.clientes.size, prevM3: agPrev.m3, porPlanta }
  return { T, resumen, agr }
}
type Calculo = ReturnType<typeof calcular>

// Rango completo del filtro: tabla por planta y gráficas
const calcRango = computed(() => calcular(rs.value, rsPrev.value, rsAgr.value, rsAgrPrev.value))
const T = computed(() => calcRango.value.T)
const resumenPlantas = computed(() => calcRango.value.resumen)
const agr = computed(() => calcRango.value.agr)

function material(r: Rem): string { return r.mezcla ? titulo(r.mezcla) : 'Sin material (retira)' }
const materiales = computed(() => {
  const map = new Map<string, { m3: number; venta: number; rem: number }>()
  for (const r of rsAgr.value) {
    const k = material(r), e = map.get(k) ?? { m3: 0, venta: 0, rem: 0 }
    e.m3 += r.m3; e.venta += r.subtotal; e.rem++; map.set(k, e)
  }
  return [...map.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.m3 - a.m3)
})
function colorMaterial(m: string): string {
  const i = materiales.value.findIndex(x => x.nombre === m)
  return PALETA[(Math.max(i, 0) + 2) % PALETA.length]
}

// ---------------------------------------------------------------- Vista (KPIs)
type Vista = 'periodo' | 'dia' | 'semana' | 'mes'
const VISTAS: { id: Vista; label: string }[] = [
  { id: 'periodo', label: 'Todo el período' }, { id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' },
]
const vista = ref<Vista>('periodo')
function lunesDe(iso: string): string { return sumarDias(iso, -((new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7)) }
function ultimoDiaMes(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate() }
function fechaDia(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getUTCDay()]} ${fechaLarga(iso)}`
}
const tramo = (a: string, b: string) => (a === b ? fechaDia(a) : `${fechaLarga(a)} – ${fechaLarga(b)}`)
// Ventana de los KPIs y su período de comparación, según la vista elegida
const ventanaKpi = computed(() => {
  const { desde, hasta } = rango.value
  if (vista.value === 'dia') {
    const dias = [...new Set(rsTodo.value.map(r => r.iso))].sort()
    const hoy = dias.at(-1) ?? hasta
    const antes = [...new Set(todas.value.filter(r => r.iso < hoy).map(r => r.iso))].sort().at(-1) ?? sumarDias(hoy, -1)
    return { desde: hoy, hasta: hoy, pDesde: antes, pHasta: antes, titulo: 'Último día', cmp: 'el día anterior con despacho' }
  }
  if (vista.value === 'semana') {
    const lun = lunesDe(hasta)
    return { desde: lun, hasta, pDesde: sumarDias(lun, -7), pHasta: sumarDias(hasta, -7), titulo: 'Semana actual', cmp: 'los mismos días de la semana anterior' }
  }
  if (vista.value === 'mes') {
    const [y, m, d] = hasta.split('-').map(Number)
    const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1
    const pref = `${py}-${String(pm).padStart(2, '0')}`
    return { desde: hasta.slice(0, 8) + '01', hasta, pDesde: `${pref}-01`, pHasta: `${pref}-${String(Math.min(d, ultimoDiaMes(py, pm))).padStart(2, '0')}`,
      titulo: 'Mes actual', cmp: 'el mismo corte del mes anterior' }
  }
  const n = diasEntre(desde, hasta) + 1
  return { desde, hasta, pDesde: sumarDias(desde, -n), pHasta: sumarDias(desde, -1), titulo: 'Todo el período', cmp: `los ${n} días anteriores` }
})
const calcKpi = computed<Calculo>(() => {
  const v = ventanaKpi.value
  const act = todas.value.filter(r => r.iso >= v.desde && r.iso <= v.hasta)
  const ant = todas.value.filter(r => r.iso >= v.pDesde && r.iso <= v.pHasta)
  return calcular(act.filter(r => !r.agregado), ant.filter(r => !r.agregado), act.filter(r => r.agregado), ant.filter(r => r.agregado))
})

// ---------------------------------------------------------------- KPIs
function tendencia(v: number | null) {
  return v === null || !Number.isFinite(v) || Math.abs(v) < 0.05 ? undefined : { value: Number(Math.abs(v).toFixed(1)), direction: (v >= 0 ? 'up' : 'down') as 'up' | 'down' }
}
// Desglose por planta dentro de la KpiCard (mismo patrón Int/Ext de Mantenimiento)
function detalle(valor: (p: Calculo['resumen'][number]) => string): string {
  return calcKpi.value.resumen.map(p =>
    `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p.planta)}'></span>` +
    `<span class='kpi-label-int' style='color:${color(p.planta)}'>${p.planta}</span> <strong>${valor(p)}</strong></div>`).join('')
}
const kpis = computed(() => {
  const { T: t, agr: ag } = calcKpi.value, p = t.prev
  const promDia = t.dias ? t.m3 / t.dias : 0
  const promDiaPrev = p.dias.size ? p.m3 / p.dias.size : 0
  const m3Rem = t.rem ? t.m3 / t.rem : 0
  const bomb = t.m3 ? t.bombM3 / t.m3 * 100 : 0
  return [
    { label: 'm³ de Concreto', value: fmtN(t.m3) + ' m³', icon: 'package', accent: '#10B981', trend: tendencia(variacion(t.m3, p.m3)),
      detail: detalle(x => `${fmtN(x.m3)} <span style='color:var(--text-tertiary);font-size:10px'>(${pct(x.part)})</span>`) },
    { label: 'Venta Concreto (sin IVA)', value: cop(t.venta), icon: 'dollar', accent: '#2563EB', trend: tendencia(variacion(t.venta, p.venta)),
      detail: detalle(x => cop(x.venta)) },
    { label: 'Precio Promedio por m³', value: cop(t.precio), icon: 'target', accent: '#F59E0B', trend: tendencia(variacion(t.precio, p.precio)),
      detail: detalle(x => cop(x.precio) + '/m³') },
    { label: 'Promedio Diario', value: fmtN(promDia) + ' m³', icon: 'trending-up', accent: '#0EA5E9', trend: tendencia(variacion(promDia, promDiaPrev)),
      detail: detalle(x => fmtN(t.dias ? x.m3 / t.dias : 0) + ' m³') },
    { label: 'Remisiones de Concreto', value: fmtN(t.rem, 0), icon: 'list', accent: '#8B5CF6', trend: tendencia(variacion(t.rem, p.rem)),
      detail: detalle(x => `${fmtN(x.rem, 0)} <span style='color:var(--text-tertiary);font-size:10px'>${fmtN(x.rem ? x.m3 / x.rem : 0)} m³/rem.</span>`)
        + `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>Promedio ${fmtN(m3Rem)} m³ por remisión</div>` },
    { label: 'Agregados (arena y grava)', value: fmtN(ag.m3) + ' m³', icon: 'layers', accent: '#F59E0B', trend: tendencia(variacion(ag.m3, ag.prevM3)),
      detail: [...ag.porPlanta.entries()].map(([pl, v]) =>
        `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(pl)}'></span><span class='kpi-label-int' style='color:${color(pl)}'>${pl}</span> <strong>${fmtN(v.m3)} m³</strong> <span style='color:var(--text-tertiary);font-size:10px'>${cop(v.venta)}</span></div>`).join('')
        + `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>No suman al concreto · ${ag.rem} remisiones</div>` },
    { label: 'Clientes Activos', value: fmtN(t.clientes, 0), icon: 'users', accent: '#EC4899', trend: tendencia(variacion(t.clientes, p.clientes.size)),
      detail: detalle(x => fmtN(x.clientes, 0)) },
    { label: '% con Bombeo', value: pct(bomb), icon: 'zap', accent: '#06B6D4', trend: tendencia(variacion(bomb, p.m3 ? p.bombM3 / p.m3 * 100 : 0)),
      detail: detalle(x => `${pct(x.m3 ? x.bombM3 / x.m3 * 100 : 0)} <span style='color:var(--text-tertiary);font-size:10px'>${fmtN(x.bombM3)} m³</span>`) },
  ]
})

// ---------------------------------------------------------------- Granularidad
type Gran = 'dia' | 'semana' | 'mes'
// «Todo el período» agrupa solo según el largo del rango; Día/Semana/Mes fijan la agrupación
const gran = computed<Gran>(() => {
  if (vista.value !== 'periodo') return vista.value
  const n = diasEntre(rango.value.desde, rango.value.hasta) + 1
  return n <= 45 ? 'dia' : n <= 180 ? 'semana' : 'mes'
})
const granNombre = computed(() => ({ dia: 'día', semana: 'semana', mes: 'mes' })[gran.value])
const granPlural = computed(() => ({ dia: 'días', semana: 'semanas', mes: 'meses' })[gran.value])

function clavePeriodo(iso: string): string {
  if (gran.value === 'mes') return iso.slice(0, 7)
  if (gran.value === 'semana') {
    const dow = (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7 // lunes = 0
    return sumarDias(iso, -dow)
  }
  return iso
}
function etiquetaPeriodo(k: string): string {
  if (gran.value === 'mes') return `${MESES_CORTOS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`
  // La primera semana puede empezar antes del rango: se rotula desde el primer día incluido
  const d = gran.value === 'semana' && k < rango.value.desde ? rango.value.desde : k
  const e = `${d.slice(8, 10)}/${d.slice(5, 7)}`
  return gran.value === 'semana' ? `Sem ${e}` : e
}

interface Periodo { k: string; m3: number; venta: number; agrM3: number; agrVenta: number; porMaterial: Record<string, number>; porPlanta: Record<string, { m3: number; conc: number; concM3: number }> }
const periodos = computed<Periodo[]>(() => {
  const map = new Map<string, Periodo>()
  for (const r of rsTodo.value) {
    const k = clavePeriodo(r.iso)
    let e = map.get(k)
    if (!e) { e = { k, m3: 0, venta: 0, agrM3: 0, agrVenta: 0, porMaterial: {}, porPlanta: {} }; map.set(k, e) }
    if (r.agregado) {
      e.agrM3 += r.m3; e.agrVenta += r.subtotal
      e.porMaterial[material(r)] = (e.porMaterial[material(r)] ?? 0) + r.m3
      continue
    }
    const pp = (e.porPlanta[r.planta] ??= { m3: 0, conc: 0, concM3: 0 })
    e.m3 += r.m3; e.venta += r.subtotal; pp.m3 += r.m3
    pp.conc += r.totalConc; pp.concM3 += r.m3
  }
  return [...map.values()].sort((a, b) => a.k.localeCompare(b.k))
})

const promPeriodo = computed(() => {
  const conConcreto = periodos.value.filter(x => x.m3 > 0)
  return conConcreto.length ? conConcreto.reduce((s, x) => s + x.m3, 0) / conConcreto.length : 0
})

// ---------------------------------------------------------------- Gráficas
const optDespacho = computed(() => {
  const per = periodos.value, ps = plantas.value
  const z = zoom(per.length)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const x = per[params[0].dataIndex]
        return `<b>${etiquetaPeriodo(x.k)}</b><br/>` +
          ps.filter(p => x.porPlanta[p]?.m3).map(p => `${punto(color(p))} ${p}: <b>${fmtN(x.porPlanta[p].m3)} m³</b> <span style="color:#94a3b8;font-size:10px">(${pct(x.m3 ? x.porPlanta[p].m3 / x.m3 * 100 : 0)})</span>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(x.m3)} m³</b> <span style="color:#94a3b8;font-size:10px">(prom. ${fmtN(promPeriodo.value)})</span>`
      },
    },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    dataZoom: z.dataZoom,
    grid: { left: 20, right: 30, bottom: z.gridBottom, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaPeriodo(x.k))),
    yAxis: ejeY(),
    series: [
      ...ps.map((p, i) => ({
        name: p, type: 'bar' as const, stack: 'm3', barMaxWidth: 30, emphasis,
        itemStyle: { color: color(p), borderRadius: (i === ps.length - 1 ? [4, 4, 0, 0] : 0) as any },
        label: { ...labelDentro, formatter: (x: any) => (Math.min(per.length, VENTANA) <= 16 && x.value >= promPeriodo.value * 0.18 ? m3Lbl(x.value) : '') },
        data: per.map(x => +(x.porPlanta[p]?.m3 ?? 0).toFixed(1)),
        ...(i === 0 ? {
          markLine: {
            silent: true, symbol: 'none', label: { show: false },
            lineStyle: { color: isLight.value ? '#172554' : '#60a5fa', type: 'dashed' as const, width: 1.5, opacity: 0.8 },
            data: [{ yAxis: +promPeriodo.value.toFixed(1) }],
          },
        } : {}),
      })),
      // Serie vacía que solo pinta el total del período encima de la barra apilada
      { name: '__total', type: 'bar' as const, stack: 'm3', tooltip: { show: false },
        data: per.map(x => ({ value: 0, label: { show: x.m3 > 0 } })),
        label: { ...labelPill.value, position: 'top' as const, distance: 4, formatter: (x: any) => m3Lbl(per[x.dataIndex].m3) } },
    ],
  }, per.length > 0)
})

const AMBAR = '#F59E0B'
const optVenta = computed(() => {
  const per = periodos.value
  const hayAgr = per.some(x => x.agrVenta > 0)
  const total = (i: number) => per[i].venta + per[i].agrVenta
  // Con muchos puntos se rotula uno de cada n para que las píldoras no se monten
  const z = zoom(per.length)
  const rotular = (i: number) => (per.length - 1 - i) % Math.ceil(Math.min(per.length, VENTANA) / 12) === 0
  // Una píldora con texto vacío igual pinta su fondo: la etiqueta se apaga punto por punto
  const serie = (name: string, c: string, data: number[], conLabel: boolean) => ({
    name, type: 'line' as const, stack: 'venta', smooth: true, symbol: 'circle', symbolSize: 7,
    data: data.map((v, i) => ({ value: v, label: { show: conLabel && rotular(i) } })),
    lineStyle: { width: 2.5, color: c }, itemStyle: { color: c }, areaStyle: { opacity: 0.25, color: c },
    label: { ...labelPill.value, formatter: (x: any) => copCorto(total(x.dataIndex)) },
  })
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (ps: any[]) => {
        const i = ps[0].dataIndex
        const x = per[i]
        return `<b>${ps[0].axisValueLabel}</b><br/>${punto(AZUL)} Concreto: <b>${cop(x.venta)}</b> · ${fmtN(x.m3)} m³` +
          (hayAgr ? `<br/>${punto(AMBAR)} Agregados: <b>${cop(x.agrVenta)}</b> · ${fmtN(x.agrM3)} m³<br/>${punto('#1f2937')} Total: <b>${cop(total(i))}</b> · ${fmtN(x.m3 + x.agrM3)} m³` : '')
      },
    },
    legend: hayAgr ? leyenda([{ name: 'Concreto', itemStyle: { color: AZUL } }, { name: 'Agregados', itemStyle: { color: AMBAR } }]) : undefined,
    dataZoom: z.dataZoom,
    grid: { left: 44, right: 40, bottom: z.gridBottom, top: hayAgr ? 50 : 30, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaPeriodo(x.k)), { boundaryGap: false }),
    yAxis: ejeY(),
    series: [
      serie('Concreto', AZUL, per.map(x => Math.round(x.venta)), !hayAgr),
      ...(hayAgr ? [serie('Agregados', AMBAR, per.map(x => Math.round(x.agrVenta)), true)] : []),
    ],
  }, per.length > 0)
})

const optPrecio = computed(() => {
  const per = periodos.value, ps = plantas.value
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any[]) => {
        const x = per[params[0].dataIndex]
        return `<b>${params[0].axisValueLabel}</b><br/>` +
          params.filter(p => p.value != null).map(p => `${punto(color(p.seriesName))} ${p.seriesName}: <b>${cop(p.value)}</b>/m³ <span style="color:#94a3b8;font-size:10px">${fmtN(x.porPlanta[p.seriesName]?.m3 ?? 0)} m³</span>`).join('<br/>')
      },
    },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    dataZoom: zoom(per.length).dataZoom,
    grid: { left: 20, right: 90, bottom: zoom(per.length).gridBottom, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaPeriodo(x.k)), { boundaryGap: false }),
    yAxis: ejeY({ scale: true, max: undefined }),
    series: ps.map(p => ({
      name: p, type: 'line' as const, smooth: 0.35, connectNulls: true, symbol: 'circle', symbolSize: 7, emphasis: { focus: 'series' as const },
      data: per.map(x => { const v = x.porPlanta[p]; return v && v.concM3 ? Math.round(v.conc / v.concM3) : null }),
      lineStyle: { width: 2.5, color: color(p) }, itemStyle: { color: color(p) },
      // Valor del último período al final de cada línea
      endLabel: { ...labelPill.value, formatter: (x: any) => copCorto(x.value) },
      labelLayout: { moveOverlap: 'shiftY' as const },
    })),
  }, per.length > 0)
})

const optParticipacion = computed(() => {
  const r = resumenPlantas.value
  return vacio({
    ...base(),
    title: {
      text: fmtN(T.value.m3, 0), subtext: 'm³ de concreto', left: '37%', top: '44%', textAlign: 'center',
      textStyle: { fontFamily: FONT, fontSize: 18, fontWeight: 700, color: isLight.value ? '#0f172a' : '#f1f5f9' },
      subtextStyle: { fontFamily: FONT, fontSize: 11, color: chartTextColor.value },
    },
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${punto(p.color)} <b>${p.name}</b><br/>${fmtN(p.value)} m³ (${pct(p.percent)})<br/>${cop(r[p.dataIndex].venta)}` },
    legend: {
      type: 'scroll' as const, orient: 'vertical' as const, right: 10, top: 'middle', icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 14,
      textStyle: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
      formatter: (n: string) => { const x = r.find(y => y.planta === n); return x ? `${n}  ${fmtN(x.m3, 0)} m³` : n },
    },
    series: [{
      type: 'pie' as const, radius: ['42%', '68%'], center: ['38%', '55%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => pct(p.percent), fontSize: 11, fontWeight: 600, fontFamily: FONT, color: chartTextColor.value },
      data: r.map(x => ({ name: x.planta, value: +x.m3.toFixed(1), itemStyle: { color: color(x.planta) } })),
    }],
  }, r.length > 0)
})

const optBombeo = computed(() => {
  const r = resumenPlantas.value
  const sinC = isLight.value ? '#94a3b8' : '#475569'
  const lbl = (x: any) => { const e = r[x.dataIndex]; return e.m3 && x.value >= e.m3 * 0.12 ? pct(x.value / e.m3 * 100, 0) : '' }
  return vacio({
    ...barrasH(r.map(x => x.planta), [
      { name: 'Con bombeo', type: 'bar', stack: 'b', barWidth: '55%', data: r.map(x => +x.bombM3.toFixed(1)),
        itemStyle: { color: AZUL }, label: { ...labelDentro, formatter: lbl } },
      { name: 'Sin bombeo', type: 'bar', stack: 'b', barWidth: '55%', data: r.map(x => +(x.m3 - x.bombM3).toFixed(1)),
        itemStyle: { color: sinC, borderRadius: [0, 4, 4, 0] }, label: { ...labelDentro, formatter: lbl } },
      { name: '__total', type: 'bar', stack: 'b', data: r.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => m3Lbl(r[x.dataIndex].m3) + ' m³' } },
    ], r.map(x => m3Lbl(x.m3) + ' m³'), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const e = r[params[0].dataIndex]
        return `<b>${e.planta}</b><br/>` +
          `${punto(AZUL)} Con bombeo: <b>${fmtN(e.bombM3)} m³</b> (${pct(e.m3 ? e.bombM3 / e.m3 * 100 : 0)})<br/>` +
          `${punto(sinC)} Sin bombeo: <b>${fmtN(e.m3 - e.bombM3)} m³</b><br/>${punto('#1f2937')} Total: <b>${fmtN(e.m3)} m³</b>`
      },
    }, true),
    legend: leyenda([{ name: 'Con bombeo', itemStyle: { color: AZUL } }, { name: 'Sin bombeo', itemStyle: { color: sinC } }]),
  }, r.length > 0)
})

// Venta por comercial apilada por planta (orden descendente por venta total)
const comerciales = computed(() => {
  const map = new Map<string, { total: number; m3: number; porPlanta: Record<string, number>; m3Planta: Record<string, number> }>()
  for (const r of rs.value) {
    const e = map.get(r.comercial) ?? { total: 0, m3: 0, porPlanta: {}, m3Planta: {} }
    e.total += r.subtotal; e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + r.subtotal
    e.m3 += r.m3; e.m3Planta[r.planta] = (e.m3Planta[r.planta] ?? 0) + r.m3
    map.set(r.comercial, e)
  }
  return [...map.entries()].map(([nombre, v]) => ({ nombre: titulo(nombre), ...v })).sort((a, b) => b.total - a.total)
})
function opcionComercial(lista: typeof comerciales.value) {
  const ps = plantas.value
  const max = lista[0]?.total ?? 1
  const seg = (x: any) => { const t = copCorto(x.value); return x.value >= max * t.length * 0.011 ? t : '' }
  return vacio({
    ...barrasH(lista.map(x => x.nombre), [
      ...ps.map((p, i) => ({
        name: p, type: 'bar', stack: 'v', barWidth: '60%', emphasis,
        data: lista.map(x => Math.round(x.porPlanta[p] ?? 0)),
        itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [0, 4, 4, 0] : 0 },
        label: { ...labelDentro, formatter: seg },
      })),
      { name: '__total', type: 'bar', stack: 'v', data: lista.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => copCorto(lista[x.dataIndex].total) } },
    ], lista.map(x => copCorto(x.total)), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const e = lista[params[0].dataIndex]
        return `<b>${e.nombre}</b><br/>` +
          ps.filter(p => e.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${cop(e.porPlanta[p])}</b> · ${fmtN(e.m3Planta[p] ?? 0)} m³`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${cop(e.total)}</b> · ${fmtN(e.m3)} m³`
      },
    }, true),
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
  }, lista.length > 0)
}
const optComercial = computed(() => opcionComercial(comerciales.value.slice(0, 10)))
const optComercialTodos = computed(() => opcionComercial(comerciales.value))

const clientes = computed(() => {
  const map = new Map<string, { m3: number; venta: number; rem: number; porPlanta: Record<string, number> }>()
  for (const r of rs.value) {
    const e = map.get(r.cliente) ?? { m3: 0, venta: 0, rem: 0, porPlanta: {} }
    e.m3 += r.m3; e.venta += r.subtotal; e.rem++
    e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + r.m3
    map.set(r.cliente, e)
  }
  return [...map.entries()].map(([nombre, v]) => ({ nombre: titulo(nombre), ...v })).sort((a, b) => b.m3 - a.m3)
})
// Barras apiladas por planta, igual que los rankings de equipos
function opcionClientes(lista: typeof clientes.value) {
  const ps = plantas.value.filter(p => lista.some(x => x.porPlanta[p]))
  return vacio({
    ...barrasH(lista.map(x => x.nombre), [
      ...ps.map((p, i) => ({
        name: p, type: 'bar', stack: 'c', barWidth: '65%', emphasis,
        data: lista.map(x => +(x.porPlanta[p] ?? 0).toFixed(1)),
        itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [0, 4, 4, 0] : 0 },
      })),
      { name: '__total', type: 'bar', stack: 'c', data: lista.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => m3Lbl(lista[x.dataIndex].m3) + ' m³' } },
    ], lista.map(x => m3Lbl(x.m3) + ' m³'), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const e = lista[params[0].dataIndex]
        return `<b>${e.nombre}</b><br/>` +
          ps.filter(p => e.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${fmtN(e.porPlanta[p])} m³</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(e.m3)} m³</b> <span style="color:#94a3b8;font-size:10px">(${pct(T.value.m3 ? e.m3 / T.value.m3 * 100 : 0)} del total)</span><br/>` +
          `${punto('#10B981')} Venta: <b>${cop(e.venta)}</b><br/>${punto('#8B5CF6')} Remisiones: <b>${e.rem}</b>`
      },
    }, ps.length > 1),
    ...(ps.length > 1 ? { legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))) } : {}),
  }, lista.length > 0)
}
const optClientes = computed(() => opcionClientes(clientes.value.slice(0, TOP)))
const optClientesTodos = computed(() => opcionClientes(clientes.value))

// Diseños de mezcla (código de la mezcla) ordenados por m³ de concreto vendidos
const disenos = computed(() => {
  const map = new Map<string, { nombre: string; m3: number; rem: number; venta: number; porPlanta: Record<string, number> }>()
  for (const r of rs.value) {
    if (!r.mezcla) continue
    const e = map.get(r.mezcla) ?? { nombre: r.mezcla, m3: 0, rem: 0, venta: 0, porPlanta: {} }
    e.m3 += r.m3; e.rem++; e.venta += r.totalConc
    e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + r.m3
    map.set(r.mezcla, e)
  }
  return [...map.values()].sort((a, b) => b.m3 - a.m3)
})
const disenoTop = computed(() => disenos.value[0] ?? null)
function opcionDisenos(lista: typeof disenos.value) {
  const ps = plantas.value.filter(p => lista.some(x => x.porPlanta[p]))
  const total = T.value.m3
  const txt = (x: typeof lista[number]) => `${m3Lbl(x.m3)} m³ · ${pct(total ? x.m3 / total * 100 : 0)}`
  return vacio({
    ...barrasH(lista.map(x => x.nombre), [
      ...ps.map((p, i) => ({
        name: p, type: 'bar', stack: 'd', barWidth: '65%', emphasis,
        data: lista.map(x => +(x.porPlanta[p] ?? 0).toFixed(1)),
        itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [0, 4, 4, 0] : 0 },
      })),
      { name: '__total', type: 'bar', stack: 'd', data: lista.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => txt(lista[x.dataIndex]) } },
    ], lista.map(txt), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const e = lista[params[0].dataIndex]
        return `<b>${e.nombre}</b> <span style="color:#94a3b8">· ${resistencia(e.nombre)}</span><br/>` +
          ps.filter(p => e.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${fmtN(e.porPlanta[p])} m³</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(e.m3)} m³</b> <span style="color:#94a3b8;font-size:10px">(${pct(total ? e.m3 / total * 100 : 0)} del concreto)</span><br/>` +
          `${punto('#8B5CF6')} Remisiones: <b>${e.rem}</b><br/>${punto('#10B981')} Venta: <b>${cop(e.venta)}</b> · ${cop(e.m3 ? e.venta / e.m3 : 0)}/m³`
      },
    }, ps.length > 1),
    ...(ps.length > 1 ? { legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))) } : {}),
  }, lista.length > 0)
}
const optDisenos = computed(() => opcionDisenos(disenos.value.slice(0, TOP)))
const optDisenosTodos = computed(() => opcionDisenos(disenos.value))

const optResistencia = computed(() => {
  const map = new Map<string, number>()
  for (const r of rs.value) { const k = resistencia(r.mezcla); map.set(k, (map.get(k) ?? 0) + r.m3) }
  const orden = (k: string) => (k === 'Sin dato' ? 1e6 : (k.startsWith('MR') ? 1e3 : 0) + Number(k.replace(/\D/g, '')))
  const lista = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => orden(a[0]) - orden(b[0]))
  const total = lista.reduce((s, [, v]) => s + v, 0)
  return vacio({
    ...base(),
    tooltip: { trigger: 'item' as const, formatter: (x: any) => `<b>${x.name}</b><br/>${punto(x.color)} Volumen: <b>${fmtN(x.value)} m³</b> (${pct(total ? x.value / total * 100 : 0)})` },
    grid: { left: 20, right: 30, bottom: 30, top: 30, containLabel: true },
    xAxis: ejeX(lista.map(([k]) => k)),
    yAxis: ejeY(),
    series: [{
      type: 'bar' as const, barMaxWidth: 40, emphasis,
      // Con muchas resistencias solo se rotulan las que pesan al menos 3% (el resto en el tooltip)
      data: lista.map(([, v], i) => ({ value: +v.toFixed(1), itemStyle: { color: PALETA[(i + 1) % PALETA.length], borderRadius: [4, 4, 0, 0] },
        label: { show: lista.length <= 6 || (total ? v / total : 0) >= 0.03 } })),
      label: { ...labelPill.value, position: 'top' as const, distance: 4,
        formatter: (x: any) => (lista.length <= 6 ? `${m3Lbl(x.value)} · ${pct(total ? x.value / total * 100 : 0, 0)}` : pct(total ? x.value / total * 100 : 0, 0)) },
    }],
  }, lista.length > 0)
})

const optSemana = computed(() => {
  const ps = plantas.value
  // m³ por día de la semana y planta ÷ número de fechas con despacho en ese día de la semana
  const fechas: Set<string>[] = DIAS_SEM.map(() => new Set())
  const m3: Record<string, number[]> = Object.fromEntries(ps.map(p => [p, DIAS_SEM.map(() => 0)]))
  for (const r of rs.value) {
    const d = (new Date(r.iso + 'T00:00:00Z').getUTCDay() + 6) % 7
    fechas[d].add(r.iso); m3[r.planta][d] += r.m3
  }
  const idx = DIAS_SEM.map((_, i) => i).filter(i => fechas[i].size > 0)
  const prom = (p: string, i: number) => m3[p][i] / fechas[i].size
  const totalDia = (i: number) => ps.reduce((s, p) => s + prom(p, i), 0)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const i = idx[params[0].dataIndex]
        return `<b>${DIAS_SEM[i]} — ${fechas[i].size} días con despacho</b><br/>` +
          ps.map(p => `${punto(color(p))} ${p}: <b>${fmtN(prom(p, i))} m³</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(totalDia(i))} m³</b>`
      },
    },
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
    grid: { left: 20, right: 30, bottom: 30, top: 50, containLabel: true },
    xAxis: ejeX(idx.map(i => `${DIAS_SEM[i]} (${fechas[i].size})`)),
    yAxis: ejeY(),
    series: [
      ...ps.map((p, j) => ({
        name: p, type: 'bar' as const, stack: 's', barMaxWidth: 40, emphasis,
        data: idx.map(i => +prom(p, i).toFixed(1)),
        itemStyle: { color: color(p), borderRadius: (j === ps.length - 1 ? [4, 4, 0, 0] : 0) as any },
        label: { ...labelDentro, formatter: (x: any) => (x.value >= totalDia(idx[x.dataIndex]) * 0.14 ? m3Lbl(x.value) : '') },
      })),
      { name: '__total', type: 'bar' as const, stack: 's', data: idx.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'top' as const, distance: 4, formatter: (x: any) => m3Lbl(totalDia(idx[x.dataIndex])) } },
    ],
  }, idx.length > 0)
})

const optAgrPeriodo = computed(() => {
  const per = periodos.value, mats = materiales.value.map(m => m.nombre)
  return vacio({
    ...base(),
    tooltip: {
      trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
      formatter: (params: any[]) => {
        const x = per[params[0].dataIndex]
        return `<b>${etiquetaPeriodo(x.k)}</b><br/>` +
          mats.filter(m => x.porMaterial[m]).map(m => `${punto(colorMaterial(m))} ${m}: <b>${fmtN(x.porMaterial[m])} m³</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(x.agrM3)} m³</b> · ${cop(x.agrVenta)}`
      },
    },
    legend: leyenda(mats.map(m => ({ name: m, itemStyle: { color: colorMaterial(m) } }))),
    dataZoom: zoom(per.length).dataZoom,
    grid: { left: 20, right: 30, bottom: zoom(per.length).gridBottom, top: 50, containLabel: true },
    xAxis: ejeX(per.map(x => etiquetaPeriodo(x.k))),
    yAxis: ejeY(),
    series: [
      ...mats.map((m, i) => ({
        name: m, type: 'bar' as const, stack: 'agr', barMaxWidth: 30, emphasis,
        data: per.map(x => +(x.porMaterial[m] ?? 0).toFixed(1)),
        itemStyle: { color: colorMaterial(m), borderRadius: (i === mats.length - 1 ? [4, 4, 0, 0] : 0) as any },
      })),
      { name: '__total', type: 'bar' as const, stack: 'agr', data: per.map(x => ({ value: 0, label: { show: x.agrM3 > 0 } })), tooltip: { show: false },
        label: { ...labelPill.value, position: 'top' as const, distance: 4, formatter: (x: any) => m3Lbl(per[x.dataIndex].agrM3) } },
    ],
  }, rsAgr.value.length > 0)
})

const optAgrMaterial = computed(() => {
  const lista = materiales.value
  return vacio(barrasH(lista.map(x => x.nombre), [{
    name: 'm³', type: 'bar', barWidth: '60%', emphasis,
    data: lista.map(x => ({ value: +x.m3.toFixed(1), itemStyle: { color: colorMaterial(x.nombre), borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (x: any) => `${m3Lbl(x.value)} m³ · ${copCorto(lista[x.dataIndex].venta)}` },
  }], lista.map(x => `${m3Lbl(x.m3)} m³ · ${copCorto(x.venta)}`), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => {
      const e = lista[params[0].dataIndex]
      return `<b>${e.nombre}</b><br/>${punto(colorMaterial(e.nombre))} Volumen: <b>${fmtN(e.m3)} m³</b><br/>` +
        `${punto('#10B981')} Venta: <b>${cop(e.venta)}</b> <span style="color:#94a3b8;font-size:10px">(${cop(e.m3 ? e.venta / e.m3 : 0)}/m³)</span><br/>` +
        `${punto('#8B5CF6')} Remisiones: <b>${e.rem}</b>`
    },
  }, false), lista.length > 0)
})

// ---------------------------------------------------------------- Equipos y personal
// Mixers y conductores miden el concreto despachado (Cant. Concreto); bombas y operarios miden el
// volumen bombeado (Cant. Servicio de la remisión, o el concreto si el servicio no trae cantidad).
interface Rank { nombre: string; m3: number; viajes: number; porPlanta: Record<string, number>; plantas: Set<string> }
function ranking(clave: (r: Rem) => string, valor: (r: Rem) => number): Rank[] {
  const map = new Map<string, Rank>()
  for (const r of rs.value) {
    const k = clave(r)
    if (!k) continue
    const e = map.get(k) ?? { nombre: k, m3: 0, viajes: 0, porPlanta: {}, plantas: new Set<string>() }
    const v = valor(r)
    e.m3 += v; e.viajes++; e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + v; e.plantas.add(r.planta)
    map.set(k, e)
  }
  return [...map.values()].sort((a, b) => b.m3 - a.m3)
}
const bombeado = (r: Rem) => r.servM3 || r.m3
const rankMixers = computed(() => ranking(r => r.mixer, r => r.m3))
const rankBombas = computed(() => ranking(r => r.bomba, bombeado))
const rankConductores = computed(() => ranking(r => r.conductor, r => r.m3))
const rankOperarios = computed(() => ranking(r => r.operario, bombeado))

function opcionRanking(lista: Rank[], viaje: string) {
  const ps = plantas.value.filter(p => lista.some(x => x.porPlanta[p]))
  return vacio({
    ...barrasH(lista.map(x => x.nombre), [
      ...ps.map((p, i) => ({
        name: p, type: 'bar', stack: 'r', barWidth: '60%', emphasis,
        data: lista.map(x => +(x.porPlanta[p] ?? 0).toFixed(1)),
        itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [0, 4, 4, 0] : 0 },
      })),
      { name: '__total', type: 'bar', stack: 'r', data: lista.map(() => 0), tooltip: { show: false },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => `${m3Lbl(lista[x.dataIndex].m3)} m³ · ${lista[x.dataIndex].viajes}` } },
    ], lista.map(x => `${m3Lbl(x.m3)} m³ · ${x.viajes}`), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const e = lista[params[0].dataIndex]
        return `<b>${e.nombre}</b><br/>` +
          ps.filter(p => e.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${fmtN(e.porPlanta[p])} m³</b>`).join('<br/>') +
          `<br/>${punto('#1f2937')} Total: <b>${fmtN(e.m3)} m³</b><br/>${punto('#8B5CF6')} ${viaje}: <b>${e.viajes}</b> · ${fmtN(e.viajes ? e.m3 / e.viajes : 0)} m³ por ${viaje.toLowerCase().replace(/s$/, '')}`
      },
    }, ps.length > 1),
    ...(ps.length > 1 ? { legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))) } : {}),
  }, lista.length > 0)
}
const optMixers = computed(() => opcionRanking(rankMixers.value.slice(0, TOP), 'Viajes'))
const optMixersTodos = computed(() => opcionRanking(rankMixers.value, 'Viajes'))
const optBombas = computed(() => opcionRanking(rankBombas.value.slice(0, TOP), 'Servicios'))
const optBombasTodos = computed(() => opcionRanking(rankBombas.value, 'Servicios'))
const optConductores = computed(() => opcionRanking(rankConductores.value.slice(0, TOP), 'Viajes'))
const optConductoresTodos = computed(() => opcionRanking(rankConductores.value, 'Viajes'))
const optOperarios = computed(() => opcionRanking(rankOperarios.value.slice(0, TOP), 'Servicios'))
const optOperariosTodos = computed(() => opcionRanking(rankOperarios.value, 'Servicios'))

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
.gt-gran { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.gt-gran-lbl { font-size: 12px; color: var(--text-tertiary); margin-right: 6px; }
.gt-gran-btn {
  white-space: nowrap;
  padding: 6px 14px; border: 1px solid var(--card-border); background: transparent; color: var(--text-secondary);
  font-size: 13px; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast);
}
.gt-gran-btn:hover { color: var(--text-primary); border-color: var(--card-border-hover); }
.gt-gran-btn.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); font-weight: 600; }

.gt-vacio { padding: 48px 16px; text-align: center; color: var(--text-secondary); }

/* Mismo tratamiento de títulos y KPIs que el tablero de Mantenimiento */
.kpi-row { margin-bottom: 4px; }
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 0; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.charts-grid { margin-top: 16px; }
.charts-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }

.gt-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: 20px; margin-top: 20px; }
.gt-card-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.gt-card-note { font-size: 12px; font-weight: 400; color: var(--text-tertiary); }
.section-sub { font-size: 12px; color: var(--text-tertiary); margin: 6px 0 0; }
.gt-table .muted { color: var(--text-tertiary); }
.gt-table-wrap { overflow-x: auto; }
.gt-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.gt-table th {
  text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px;
  color: var(--text-tertiary); padding: 8px 10px; border-bottom: 1px solid var(--card-border); white-space: nowrap;
}
.gt-table td { padding: 10px; color: var(--text-secondary); border-bottom: 1px solid var(--card-border); white-space: nowrap; }
.gt-table tbody tr:hover td { background: var(--card-bg-hover); }
.gt-table tfoot td { color: var(--text-primary); font-weight: 700; border-bottom: none; }
.gt-table .r { text-align: right; }
.gt-table .strong { color: var(--text-primary); font-weight: 600; }
.gt-table .pos { color: var(--success); font-weight: 600; }
.gt-table .neg { color: var(--danger); font-weight: 600; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
</style>
