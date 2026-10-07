<template>
  <div class="flota" :class="{ oscuro: !isLight, informe }">
    <div v-if="!informe" class="flota-head">
      <div class="flota-head-text">
        <h3 class="flota-titulo">Desempeño Mensual de la Flota — Top {{ placasSel.length }} {{ placasSel.length === 1 ? 'Vehículo' : 'Vehículos' }} con Mayor Costo</h3>
        <p class="flota-sub">
          <template v-if="vista === 'calor'">Ordenados por costo total. Cada mes se compara con los demás meses del mismo vehículo; en costos y días en taller, más alto es peor.</template>
          <template v-else>Una línea por vehículo, de mayor a menor costo total; los huecos son meses sin dato.</template>
        </p>
      </div>
      <div class="flota-vista" role="group" aria-label="Vista">
        <button class="fl-btn" :class="{ active: vista === 'calor' }" @click="vista = 'calor'">Mapa de calor</button>
        <button class="fl-btn" :class="{ active: vista === 'lineas' }" @click="vista = 'lineas'">Líneas</button>
      </div>
    </div>

    <div v-if="!informe && vista === 'lineas'" class="flota-filtros">
      <button v-for="v in VARIABLES.filter(x => POR_DEFECTO.includes(x.key))" :key="v.key" class="fl-btn" :class="{ active: varLinea === v.key }" @click="varLinea = v.key">{{ v.label }}</button>
    </div>

    <div v-if="!meses.length || !placasSel.length || (vista === 'calor' && !varsSel.length)" class="flota-vacio">
      {{ !filas.length ? 'No hay datos de la flota en el rango de fechas.' : 'Elige al menos un vehículo y una variable.' }}
    </div>

    <!-- Mapa de calor: meses en columnas; filas = vehículo + variable, agrupadas por vehículo -->
    <div v-else-if="vista === 'calor'" class="hm-scroll" @mouseleave="salir">
      <table class="hm">
        <thead>
          <tr>
            <th class="hm-fija hm-esq">Vehículo / variable</th>
            <th v-for="m in meses" :key="m" class="hm-mes" :class="{ foco: hover?.mes === m }">{{ etiquetaMes(m) }}</th>
          </tr>
        </thead>
        <TransitionGroup name="hm-mov">
          <tbody v-for="(p, i) in placasSel" :key="p" :class="{ abierto: !cerrados.has(p) }">
            <!-- Encabezado del vehículo en una fila completa: la primera columna queda angosta y los meses ganan ancho -->
            <tr class="hm-grupo">
              <th :colspan="meses.length + 1" class="hm-grupo-celda">
                <div class="hm-grupo-fila">
                  <div class="hm-veh">
                    <span class="hm-rank">#{{ i + 1 }}</span>
                    <span class="hm-flecha" title="Plegar / desplegar" @click="alternar(p)">{{ cerrados.has(p) ? '▸' : '▾' }}</span>
                    <span class="hm-placa">{{ p }}</span>
                    <span class="hm-tipo">{{ tipoDe.get(p) ?? '' }}</span>
                    <span v-if="resumen.get(p)?.total != null" class="hm-indice">Costo total <b>{{ cop(resumen.get(p)!.total!) }}</b></span>
                  </div>
                  <div class="hm-resumen">
                    <span v-for="k in resumenItems(p)" :key="k.label" class="hm-chip" :class="k.clase">
                      {{ k.label }} <b>{{ k.valor }}</b>
                    </span>
                  </div>
                </div>
              </th>
            </tr>
            <template v-if="!cerrados.has(p)">
              <tr v-for="v in varsDe(p)" :key="v.key" :class="{ foco: hover?.placa === p && hover?.var === v.key }">
                <th class="hm-fija hm-var">{{ v.label }}</th>
                <td
                  v-for="c in celdas(p, v)" :key="c.mes"
                  class="hm-celda" :class="{ nulo: c.valor == null, plano: c.valor != null && c.malo == null, colfoco: hover?.mes === c.mes }"
                  :style="c.estilo"
                  tabindex="0"
                  @mouseenter="mostrarTip($event, p, v, c)" @focus="mostrarTip($event, p, v, c)" @click="mostrarTip($event, p, v, c)"
                >{{ c.valor == null ? '—' : v.fmt(c.valor) }}</td>
              </tr>
            </template>
          </tbody>
        </TransitionGroup>
      </table>
      <Transition name="hm-tip">
        <div v-if="tip" class="hm-tip" :class="{ abajo: tip.abajo }" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
          <div class="hm-tip-tit"><b>{{ tip.placa }}</b> · {{ tip.mes }}</div>
          <div class="hm-tip-var">{{ tip.variable }}</div>
          <div class="hm-tip-val">{{ tip.valor }}</div>
          <div v-for="l in tip.lineas" :key="l.txt" class="hm-tip-lin" :class="l.clase">{{ l.txt }}</div>
        </div>
      </Transition>
    </div>

    <ChartCard v-else :title="''" :option="optLineas" :height="400" hide-actions class="flota-lineas" />

    <div v-if="vista === 'calor' && placasSel.length && meses.length" class="flota-leyenda">
      <span>Mejor mes</span><span class="flota-grad"></span><span>Peor mes</span>
      <span class="flota-sep"></span>
      <span class="flota-nulo">—</span><span>Sin dato</span>
      <span class="flota-sep"></span>
      <span class="flota-plano"></span><span>Igual todos los meses</span>
    </div>

    <ul v-if="hallazgos.length" class="flota-hallazgos">
      <li v-for="h in hallazgos" :key="h" v-html="h"></li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * DesempenoFlota.vue — Desempeño mensual por placa (Concretos). Todo sale de `filas`, que arma
 * EquiposDashboard con los datos reales del rango filtrado: no hay placas, meses ni variables fijas.
 * Vista principal: mapa de calor tipo semáforo, normalizado por fila y según si la variable es mejor
 * alta o baja; los vehículos van del más crítico al menos crítico. Vista alterna: líneas por vehículo.
 */
import { computed, reactive, ref } from 'vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import type { FilaFlota, VariableFlota } from '../../types/flota'
import { MESES_CORTOS, PALETA, FONT, fmtN, cop, useEstiloGraficas } from '../../composables/useGraficasConcreto'

/**
 * visibles: cuántos vehículos (de mayor costo total) se muestran al abrir; la grilla va a su alto completo, sin scroll.
 * placas: placas que dejan los filtros de arriba (null = sin filtro de placa ni tipo).
 * informe: versión para el PDF del informe (sin encabezado ni controles; el título lo pone el informe).
 */
const props = defineProps<{ filas: FilaFlota[]; visibles?: number; informe?: boolean; placas?: string[] | null }>()

const { base, leyenda, ejeX, chartTextColor, isLight } = useEstiloGraficas()

// ---------------------------------------------------------------- Variables (valores siempre completos)
interface Variable { key: VariableFlota; label: string; fmt: (v: number) => string; mejor: 'alto' | 'bajo' }
// El orden de esta lista es el orden de las filas de cada vehículo: operación primero, luego los costos
const VARIABLES: Variable[] = [
  { key: 'm3', label: 'Producción m³', fmt: v => fmtN(v, 2) + ' m³', mejor: 'alto' },
  { key: 'disp', label: 'Disponibilidad %', fmt: v => fmtN(v, 1) + ' %', mejor: 'alto' },
  { key: 'total', label: 'Costo total', fmt: cop, mejor: 'bajo' },
  { key: 'totalM3', label: 'Costo total/m³', fmt: cop, mejor: 'bajo' },
  { key: 'mantM3', label: 'Mantenimiento/m³', fmt: cop, mejor: 'bajo' },
  { key: 'combM3', label: 'Combustible/m³', fmt: cop, mejor: 'bajo' },
  { key: 'taller', label: 'Días en taller', fmt: v => fmtN(v, 0) + (v === 1 ? ' día' : ' días'), mejor: 'bajo' },
  { key: 'viajes', label: 'Viajes', fmt: v => fmtN(v, 0), mejor: 'alto' },
  { key: 'mant', label: 'Costo mantenimiento', fmt: cop, mejor: 'bajo' },
  { key: 'comb', label: 'Costo combustible', fmt: cop, mejor: 'bajo' },
  { key: 'gal', label: 'Galones', fmt: v => fmtN(v, 1) + ' gal', mejor: 'bajo' },
  { key: 'costoGal', label: 'Costo por galón', fmt: v => cop(v) + '/gal', mejor: 'bajo' },
  { key: 'hrGal', label: 'Horas por galón', fmt: v => fmtN(v, 2) + ' h/gal', mejor: 'alto' },
  { key: 'galHr', label: 'Galones por hora', fmt: v => fmtN(v, 2) + ' gal/h', mejor: 'bajo' },
]
const POR_DEFECTO: VariableFlota[] = ['m3', 'disp', 'total', 'totalM3', 'mantM3', 'combM3', 'taller', 'viajes']
const etiquetaMes = (k: string) => `${MESES_CORTOS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`
const etiquetaMesLarga = (k: string) => `${MESES_CORTOS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`

// ---------------------------------------------------------------- Escala de color
/**
 * Escala suave con los azules de la página: los meses buenos quedan casi blancos y solo los malos se
 * oscurecen, así el ojo va directo a lo crítico. El número cambia de color según el fondo para leerse
 * siempre: azul marino sobre los tonos claros, blanco sobre los fuertes.
 * En tema oscuro la escala va de un azul apagado (bueno) a uno brillante (malo).
 */
const ESCALA_CLARO: [string, string][] = [['#EEF4FD', '#172954'], ['#D3E2FB', '#172954'], ['#9DBDF4', '#172954'], ['#3B6FE0', '#FFFFFF'], ['#1E3F8F', '#FFFFFF']]
const ESCALA_OSCURO: [string, string][] = [['#18233A', '#CBD5E1'], ['#1D3157', '#E2E8F0'], ['#244781', '#FFFFFF'], ['#3566D1', '#FFFFFF'], ['#7AA5F2', '#0B1220']]
function tono(malo: number): [string, string] {
  const n = isLight.value ? ESCALA_CLARO : ESCALA_OSCURO
  return n[Math.min(n.length - 1, Math.floor(malo * n.length))]
}

// ---------------------------------------------------------------- Datos
/** placa → mes → fila */
const indiceDatos = computed(() => {
  const m = new Map<string, Map<string, FilaFlota>>()
  for (const f of props.filas) {
    let e = m.get(f.placa)
    if (!e) { e = new Map(); m.set(f.placa, e) }
    e.set(f.mes, f)
  }
  return m
})
const val = (p: string, m: string, k: VariableFlota) => indiceDatos.value.get(p)?.get(m)?.valores[k] ?? null
const tipoDe = computed(() => new Map(props.filas.map(f => [f.placa, f.tipo === '—' ? '' : f.tipo])))
// Los meses se ordenan por su clave AAAA-MM, no por el orden en que llegan
const mesesTodos = computed(() => [...new Set(props.filas.map(f => f.mes))].sort())

const meses = mesesTodos

/** Suma de una variable de una placa en los meses visibles (null si no hay ningún dato) */
function suma(p: string, k: VariableFlota): number | null {
  let s: number | null = null
  for (const m of meses.value) { const v = val(p, m, k); if (v != null) s = (s ?? 0) + v }
  return s
}
function promedio(p: string, k: VariableFlota): number | null {
  const vs = meses.value.map(m => val(p, m, k)).filter((x): x is number => x != null)
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

// ---------------------------------------------------------------- Resumen del período por vehículo
interface Resumen { total: number | null; m3: number | null; costoM3: number | null; disp: number | null; taller: number | null }
const resumen = computed(() => {
  const acc = new Map<string, Resumen>()
  for (const p of indiceDatos.value.keys()) {
    const total = suma(p, 'total'), m3 = suma(p, 'm3')
    acc.set(p, { total, m3, costoM3: total != null && m3 ? total / m3 : null, disp: promedio(p, 'disp'), taller: suma(p, 'taller') })
  }
  return acc
})

/** Más arriba = mayor costo total del período (el #1 es el más crítico) */
const placasOrden = computed(() => [...indiceDatos.value.keys()]
  .sort((a, b) => (resumen.value.get(b)?.total ?? 0) - (resumen.value.get(a)?.total ?? 0) || a.localeCompare(b)))
/**
 * Vehículos: si arriba se filtró por placa o tipo de vehículo, todos los que quedan; si no, el Top
 * `visibles` (4) de mayor costo total. Todo lo deciden los filtros de arriba.
 */
const placasSel = computed(() => (props.placas
  ? placasOrden.value.filter(p => props.placas!.includes(p))
  : placasOrden.value.filter(p => (resumen.value.get(p)?.total ?? 0) > 0).slice(0, props.visibles ?? 4)))

const varsSel = computed(() => VARIABLES.filter(v => POR_DEFECTO.includes(v.key)))
const varLinea = ref<VariableFlota>('totalM3')
const vista = ref<'calor' | 'lineas'>('calor')

const cerrados = reactive(new Set<string>())
function alternar(p: string) { if (cerrados.has(p)) cerrados.delete(p); else cerrados.add(p) }

/** Variables con al menos un dato en el período para ese vehículo: las filas vacías no se muestran */
function varsDe(p: string) {
  return varsSel.value.filter(v => meses.value.some(m => val(p, m, v.key) != null))
}
function resumenItems(p: string) {
  const r = resumen.value.get(p)
  if (!r) return []
  const out: { label: string; valor: string; clase?: string }[] = []
  if (r.costoM3 != null) out.push({ label: 'Costo/m³', valor: cop(r.costoM3) })
  if (r.m3) out.push({ label: 'Producción', valor: fmtN(r.m3, 0) + ' m³' })
  if (r.disp != null) out.push({ label: 'Disp. prom.', valor: fmtN(r.disp, 1) + ' %' })
  if (r.taller) out.push({ label: 'Taller', valor: fmtN(r.taller, 0) + (r.taller === 1 ? ' día' : ' días') })
  return out
}

// ---------------------------------------------------------------- Mapa de calor
interface Celda { mes: string; valor: number | null; malo: number | null; estilo?: Record<string, string> }
function celdas(p: string, v: Variable): Celda[] {
  const vals = meses.value.map(m => val(p, m, v.key))
  const nums = vals.filter((x): x is number => x != null)
  const min = Math.min(...nums), max = Math.max(...nums)
  return vals.map((valor, i) => {
    if (valor == null) return { mes: meses.value[i], valor, malo: null }
    if (!(max > min)) return { mes: meses.value[i], valor, malo: null }
    const t = (valor - min) / (max - min)
    const malo = v.mejor === 'alto' ? 1 - t : t
    const [fondo, texto] = tono(malo)
    return { mes: meses.value[i], valor, malo, estilo: { background: fondo, color: texto } }
  })
}

const hover = ref<{ placa: string; var: VariableFlota; mes: string } | null>(null)
interface Tip { x: number; y: number; abajo: boolean; placa: string; mes: string; variable: string; valor: string; lineas: { txt: string; clase?: string }[] }
const tip = ref<Tip | null>(null)
function salir() { tip.value = null; hover.value = null }
function mostrarTip(ev: Event, p: string, v: Variable, c: Celda) {
  hover.value = { placa: p, var: v.key, mes: c.mes }
  const el = ev.currentTarget as HTMLElement
  const caja = el.closest('.hm-scroll') as HTMLElement
  const r = el.getBoundingClientRect(), rc = caja.getBoundingClientRect()
  const lineas: Tip['lineas'] = []
  if (c.valor != null) {
    // Frente al mes anterior con dato
    const i = meses.value.indexOf(c.mes)
    const prev = meses.value.slice(0, i).reverse().find(m => val(p, m, v.key) != null)
    const vp = prev ? val(p, prev, v.key)! : null
    if (prev && vp != null) {
      const dif = c.valor - vp
      const mejora = v.mejor === 'alto' ? dif > 0 : dif < 0
      const pctTxt = vp ? ` (${dif >= 0 ? '+' : ''}${fmtN((dif / Math.abs(vp)) * 100, 1)} %)` : ''
      lineas.push({ txt: dif === 0 ? `Igual que ${etiquetaMes(prev)}` : `${dif > 0 ? '▲' : '▼'} ${v.fmt(Math.abs(dif))}${pctTxt} vs ${etiquetaMes(prev)}`, clase: dif === 0 ? undefined : mejora ? 'ok' : 'mal' })
    }
    const prom = promedio(p, v.key)
    if (prom != null) lineas.push({ txt: `Promedio del vehículo: ${v.fmt(prom)}` })
    // Posición entre los vehículos visibles en ese mes
    const otros = placasSel.value.map(x => val(x, c.mes, v.key)).filter((x): x is number => x != null)
    if (otros.length > 1) {
      const peores = otros.filter(x => (v.mejor === 'alto' ? x < c.valor! : x > c.valor!)).length
      lineas.push({ txt: `Puesto ${otros.length - peores} de ${otros.length} en ${etiquetaMes(c.mes)} (1 = mejor)` })
    }
  }
  tip.value = {
    x: Math.max(caja.scrollLeft + 130, Math.min(r.left - rc.left + caja.scrollLeft + r.width / 2, caja.scrollLeft + caja.clientWidth - 130)),
    // Cerca del borde superior de la grilla el globo se abre hacia abajo para que no se corte
    abajo: r.top - rc.top < 130,
    y: r.top - rc.top < 130 ? r.bottom - rc.top + caja.scrollTop : r.top - rc.top + caja.scrollTop,
    placa: p + (tipoDe.value.get(p) ? ` (${tipoDe.value.get(p)})` : ''),
    mes: etiquetaMesLarga(c.mes),
    variable: v.label,
    valor: c.valor == null ? 'sin dato' : v.fmt(c.valor),
    lineas,
  }
}

// ---------------------------------------------------------------- Líneas
const optLineas = computed(() => {
  const v = VARIABLES.find(x => x.key === varLinea.value)!
  return {
    ...base(),
    color: PALETA.slice(1),
    tooltip: {
      trigger: 'axis' as const,
      formatter: (ps: any[]) => `<b>${etiquetaMesLarga(meses.value[ps[0]?.dataIndex] ?? '')}</b> · ${v.label}<br/>` + [...ps]
        .sort((a, b) => (v.mejor === 'alto' ? 1 : -1) * ((a.value ?? -Infinity) - (b.value ?? -Infinity)))
        .map(p => `${p.marker} ${p.seriesName}: <b>${p.value == null ? 'sin dato' : v.fmt(p.value)}</b>`).join('<br/>'),
    },
    legend: leyenda(placasSel.value),
    grid: { left: 8, right: 64, top: 44, bottom: 24, containLabel: true },
    xAxis: ejeX(meses.value.map(etiquetaMes), { boundaryGap: false }),
    yAxis: {
      type: 'value' as const, scale: true,
      axisLabel: { fontFamily: FONT, color: chartTextColor.value, fontSize: 10, formatter: (x: number) => v.fmt(x) },
      splitLine: { lineStyle: { color: isLight.value ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)', type: 'dashed' as const } },
    },
    series: placasSel.value.map((p, i) => ({
      name: p, type: 'line' as const, connectNulls: false, symbolSize: 8, smooth: false,
      // El más crítico va más grueso
      lineStyle: { width: i < 3 ? 3.5 : 2 },
      emphasis: { focus: 'series' as const },
      endLabel: { show: true, formatter: '{a}', fontFamily: FONT, fontSize: 10, color: chartTextColor.value },
      data: meses.value.map(m => val(p, m, v.key)),
    })),
  }
})

// ---------------------------------------------------------------- Hallazgos (siempre de los datos visibles)
const hallazgos = computed(() => {
  const out: string[] = []
  const ps = placasSel.value
  if (!ps.length || !meses.value.length) return out
  const r0 = resumen.value.get(ps[0])
  if (r0?.total) {
    out.push(`Más crítico (mayor costo total): <b>${ps[0]}</b> con ${cop(r0.total)}${r0.costoM3 != null ? ` · ${cop(r0.costoM3)}/m³` : ''}${r0.disp != null ? ` · disp. ${fmtN(r0.disp, 1)} %` : ''}${r0.taller ? ` · ${fmtN(r0.taller, 0)} días en taller` : ''}.`)
  }
  // Mes con mayor costo total por m³ de los vehículos elegidos
  let peor: { m: string; r: number } | null = null
  for (const m of meses.value) {
    let t = 0, m3 = 0
    for (const p of ps) { const tv = val(p, m, 'total'), mv = val(p, m, 'm3'); if (mv && tv != null) { t += tv; m3 += mv } }
    if (m3 && (!peor || t / m3 > peor.r)) peor = { m, r: t / m3 }
  }
  if (peor) out.push(`Mes con mayor costo total por m³: <b>${etiquetaMesLarga(peor.m)}</b> (${cop(peor.r)}/m³ en los vehículos elegidos).`)
  const taller = ps.map(p => ({ p, d: resumen.value.get(p)?.taller ?? 0 })).sort((a, b) => b.d - a.d)[0]
  if (taller?.d) out.push(`Más días en taller: <b>${taller.p}</b> con ${fmtN(taller.d, 0)} ${taller.d === 1 ? 'día' : 'días'} en el período.`)
  const vars = vista.value === 'calor' ? varsSel.value : VARIABLES.filter(v => v.key === varLinea.value)
  const incompletos = ps.map(p => ({ p, n: vars.reduce((a, v) => a + meses.value.filter(m => val(p, m, v.key) == null).length, 0) }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n)
  if (incompletos.length) out.push(`Con datos incompletos: ${incompletos.slice(0, 5).map(x => `<b>${x.p}</b> (${x.n} sin dato)`).join(', ')}${incompletos.length > 5 ? ` y ${incompletos.length - 5} más` : ''}.`)
  return out
})
</script>

<style scoped>
/*
 * Tipografía de la app: Lato en los grosores que se cargan (400 y 700). Nada de 600/800, que el navegador
 * simula y se ven distintos al resto de la página.
 */
.flota, .flota :is(button, select, table, th, td, p, h3, ul) { font-family: 'Lato', sans-serif; }
.flota {
  --hm-nulo: #f1f4f8;
  --hm-plano: #e5e7eb;
  --hm-linea: var(--card-border);
  /* Mismo aspecto que ChartCard */
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: 20px; min-width: 0;
  position: relative; backdrop-filter: blur(8px);
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}
.flota:not(.informe):hover { box-shadow: var(--shadow-glass); border-color: var(--card-border-hover); }
.flota.oscuro { --hm-nulo: rgba(255, 255, 255, 0.04); --hm-plano: rgba(148, 163, 184, 0.22); }

/* Encabezado como ChartCard */
.flota-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.flota-head-text { min-width: 0; }
.flota-titulo { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: -.2px; }
.flota-sub { margin: 4px 0 0; font-size: 12px; font-weight: 400; color: var(--text-secondary); max-width: 900px; line-height: 1.45; }
.flota-vista { display: inline-flex; align-items: center; gap: 6px; }
/* Botones con el estilo de los selectores de vista de la app (.av-btn) */
.fl-btn {
  display: inline-flex; align-items: center; padding: 7px 14px; border: 1px solid var(--card-border); border-radius: var(--radius-md);
  background: var(--bg-alt); color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast);
}
.fl-btn:hover { border-color: var(--card-border-hover); color: var(--text-primary); }
.fl-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.flota-filtros { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 0 0 14px; }
.flota-vacio { padding: 32px 0; text-align: center; color: var(--text-tertiary); font-size: 13px; }

/* Grilla: las columnas de los meses se reparten el ancho; si no caben, scroll horizontal solo aquí */
.hm-scroll { position: relative; overflow-x: auto; overflow-y: visible; max-width: 100%; }
.hm { width: 100%; border-collapse: separate; border-spacing: 4px 4px; font-size: 12.5px; }
.hm th, .hm td { white-space: nowrap; }
.hm-fija { text-align: left; padding: 2px 10px 2px 0; font-weight: 400; width: 1%; }
.hm-esq { font-size: 10.5px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .06em; }
.hm-mes {
  padding: 4px 8px 8px; font-size: 10.5px; font-weight: 700; color: var(--text-tertiary); text-align: right;
  text-transform: uppercase; letter-spacing: .06em; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s;
}
.hm-mes.foco { color: var(--accent); border-bottom-color: var(--accent); }

/* Encabezado de cada vehículo */
.hm-grupo { cursor: default; }
.hm-flecha { cursor: pointer; }
.hm-grupo > th, .hm-grupo > td { padding-top: 16px; padding-bottom: 6px; border-top: 1px solid var(--hm-linea); }
tbody:first-of-type .hm-grupo > th, tbody:first-of-type .hm-grupo > td { border-top: 0; padding-top: 6px; }
.hm-grupo-celda { text-align: left; font-weight: 400; }
.hm-grupo-fila { display: flex; align-items: center; justify-content: space-between; gap: 6px 16px; flex-wrap: wrap; }
.hm-veh { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.hm-rank { min-width: 26px; font-size: 14px; font-weight: 700; color: var(--text-primary); background: none; }
.hm-placa { font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: .01em; }
.hm-flecha { display: inline-block; width: 14px; color: var(--text-tertiary); font-size: 10px; }
.hm-tipo { font-size: 10px; font-weight: 700; color: var(--text-tertiary); letter-spacing: .08em; text-transform: uppercase; }
.hm-indice { font-size: 12px; font-weight: 400; color: var(--text-tertiary); margin-left: 6px; }
.hm-indice b { color: var(--text-primary); font-weight: 700; }
.hm-resumen { white-space: normal; }
.hm-chip {
  display: inline-block; margin: 2px 6px 2px 0; padding: 4px 10px; border-radius: 999px;
  background: var(--bg-alt); border: 1px solid var(--card-border); font-size: 11.5px; font-weight: 400; color: var(--text-secondary);
}
.hm-chip b { color: var(--text-primary); font-weight: 700; }

.hm-var { padding-left: 34px; font-size: 12px; font-weight: 400; color: var(--text-secondary); transition: color .15s; }
tr.foco .hm-var { color: var(--accent); font-weight: 700; }

/* Celdas: altas, valores completos, cifras alineadas */
.hm-celda {
  height: 38px; padding: 6px 8px; border-radius: 7px; text-align: right; cursor: default;
  font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .01em;
  transition: background-color .45s ease, color .45s ease, box-shadow .15s ease;
}
.hm-celda:hover, .hm-celda:focus-visible { box-shadow: 0 0 0 2px var(--card-bg), 0 0 0 4px currentColor; position: relative; z-index: 1; outline: none; }
.hm-celda.colfoco:not(:hover):not(.nulo) { box-shadow: inset 0 0 0 1.5px rgba(37, 99, 235, .45); }
.hm-celda.nulo { background: transparent; box-shadow: inset 0 0 0 1px var(--card-border); color: var(--text-tertiary); font-weight: 400; text-align: center; opacity: .8; }
.hm-celda.plano { background: var(--hm-plano); color: var(--text-primary); }

/* Plegar / desplegar con animación */
.hm-mov-move { transition: transform .45s ease; }
.hm-mov-enter-active, .hm-mov-leave-active { transition: opacity .3s ease; }
.hm-mov-enter-from, .hm-mov-leave-to { opacity: 0; }

/* Indicador del dato */
.hm-tip {
  position: absolute; z-index: 10; transform: translate(-50%, calc(-100% - 8px)); pointer-events: none;
  background: var(--bg-elevated, #fff); color: var(--text-primary); border: 1px solid var(--card-border);
  border-radius: 10px; padding: 10px 14px; font-size: 12px; line-height: 1.5; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16); white-space: nowrap; min-width: 210px;
}
.hm-tip.abajo { transform: translate(-50%, 8px); }
.hm-tip-tit { font-size: 12px; }
.hm-tip-tit b { font-weight: 700; }
.hm-tip-var { color: var(--text-tertiary); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-top: 4px; }
.hm-tip-val { font-size: 18px; font-weight: 900; margin: 0 0 4px; font-variant-numeric: tabular-nums; }
.hm-tip-lin { color: var(--text-secondary); font-size: 11.5px; }
.hm-tip-lin.ok { color: #10B981; font-weight: 700; } .hm-tip-lin.mal { color: #EF4444; font-weight: 700; }
.hm-tip-enter-active, .hm-tip-leave-active { transition: opacity .12s ease; }
.hm-tip-enter-from, .hm-tip-leave-to { opacity: 0; }

.flota-leyenda { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; font-size: 11.5px; color: var(--text-secondary); }
.flota-grad { width: 140px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, #EEF4FD 0 20%, #D3E2FB 20% 40%, #9DBDF4 40% 60%, #3B6FE0 60% 80%, #1E3F8F 80%); box-shadow: inset 0 0 0 1px rgba(23, 41, 84, .08); }
.oscuro .flota-grad { background: linear-gradient(90deg, #18233A 0 20%, #1D3157 20% 40%, #244781 40% 60%, #3566D1 60% 80%, #7AA5F2 80%); box-shadow: none; }
.flota-nulo, .flota-plano { width: 22px; height: 14px; border-radius: 4px; background: transparent; box-shadow: inset 0 0 0 1px var(--card-border); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-tertiary); }
.flota-plano { background: var(--hm-plano); box-shadow: none; }
.flota-sep { width: 1px; height: 14px; background: var(--card-border); margin: 0 4px; }

.flota-hallazgos { margin: 16px 0 0; padding: 14px 0 0; list-style: none; border-top: 1px solid var(--hm-linea); font-size: 12.5px; color: var(--text-secondary); display: grid; gap: 6px; line-height: 1.5; }
.flota-hallazgos li { position: relative; padding-left: 16px; }
.flota-hallazgos li::before { content: ''; position: absolute; left: 2px; top: .62em; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.flota-hallazgos :deep(b) { color: var(--text-primary); font-weight: 700; }

/* ── Informe (PDF): sin encabezado ni controles; mismo alto de celda que en pantalla ── */
.flota.informe { border: 0; padding: 0; background: transparent; backdrop-filter: none; }
.informe .hm { font-size: 12px; border-spacing: 3px; }
.informe .hm-var { padding-left: 24px; }
.informe .hm-celda { height: 36px; padding: 5px 7px; font-size: 12px; }
.informe .hm-celda:hover { box-shadow: none; }
.informe .hm-flecha { display: none; }
.informe .flota-leyenda, .informe .flota-hallazgos { font-size: 11.5px; }

/* Pantallas angostas: la grilla se desplaza de lado y la columna de placas queda fija */
@media (max-width: 900px) {
  .hm-fija { position: sticky; left: 0; z-index: 2; background: var(--card-bg); }
}
@media (max-width: 640px) {
  .flota { padding: 12px; }
  .hm-mes { min-width: 96px; }
  .hm-var { padding-left: 20px; }
}
</style>
