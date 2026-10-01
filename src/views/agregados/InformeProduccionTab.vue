<template>
  <div class="informe-tab">
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte oficial de producción</span>
        <span class="icb-title">Informe Ejecutivo de Producción — {{ planta }} · {{ selectedLabel }}</span>
      </div>
      <div class="icb-actions">
        <button class="tb-btn primary" :disabled="!hasData || generandoPdf" @click="pdf">
          <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ generandoPdf ? 'Generando PDF…' : 'Descargar PDF' }}
        </button>
      </div>
    </div>

    <div v-if="!hasData" class="report-nota">No hay registros de producción para el mes seleccionado.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1: RESUMEN -->
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/logo-azul-informe.png" alt="Gravicon" class="report-logo report-logo--claro" loading="eager" />
            <!-- En tema oscuro (solo en pantalla) va el logo blanco oficial; el PDF siempre usa el azul -->
            <img src="/Logos/logo-blanco.webp" alt="" aria-hidden="true" class="report-logo report-logo--oscuro" loading="eager" />
            <div class="report-header-text">
              <h2>Producción Agregados Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Agregados {{ planta }}</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div><span>Período:</span> <strong>{{ selectedLabel }}</strong></div>
            <div><span>Código:</span> <strong>{{ codigo }}</strong></div>
            <div class="page-counter"><span>Pág. 1 de 3</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Ejecutivo de Producción</h1>
          <p class="report-intro">
            Balance de la producción diaria por línea de proceso de la planta <strong>{{ planta }}</strong> en
            <strong>{{ selectedLabel }}</strong> ({{ diasTxt }}): primero los indicadores del mes frente al proyectado diario y a la meta
            mensual, luego el comportamiento día a día, el aporte de cada línea y el historial completo, y al final la calidad del
            dato y las conclusiones. Todo en m³. Fuente: registro diario de producción de la planta.
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis operativo</div>
            <div class="zoho-analysis-text" v-html="textoAnalisis"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Producción total — {{ selectedLabel }}</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard label="Total producido" :value="`${fmt(kpi.total)} m³`" accent="#3B82F6" icon="chart-bar" :meta="`${kpi.dias} días`" />
            <KpiCard v-for="(l, i) in config.lines" :key="l.key" :label="l.label" :value="`${fmt(lineTotals[l.key] || 0)} m³`"
              :accent="config.palette[i]" icon="layers" :meta="`${pctTxt(kpi.total ? (lineTotals[l.key] || 0) / kpi.total * 100 : 0)} del total`" />
            <KpiCard label="Promedio diario" :value="`${fmt(kpi.promedio)} m³`" accent="#0EA5E9" icon="activity" meta="por día registrado" />
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Proyectado diario y meta mensual</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard label="M³ proyectado" :value="`${fmt(kpi.proyectado)} m³`" accent="#EC4899" icon="trending-up" meta="suma del proyectado diario" />
            <KpiCard label="Diferencia vs proyectado" :value="`${signo(kpi.diferenciaProy)} m³`" :accent="kpi.diferenciaProy < 0 ? '#EF4444' : '#10B981'" icon="trending-up" />
            <KpiCard label="% Cumpl. proyectado" :value="kpi.cumplimientoProy" accent="#F59E0B" icon="check-circle" />
            <KpiCard label="Meta mensual" :value="`${fmt(kpi.metaMensual)} m³`" accent="#8B5CF6" icon="target" />
            <KpiCard label="Diferencia vs meta" :value="`${signo(kpi.diferenciaMeta)} m³`" :accent="kpi.diferenciaMeta < 0 ? '#EF4444' : '#10B981'" icon="trending-up" />
            <KpiCard label="% Cumpl. meta" :value="kpi.cumplimientoMeta" accent="#06B6D4" icon="check-circle" />
          </div>
        </div>

        <div v-if="kpi.cumplimientoMetaPct < 80" class="report-nota alerta">
          <strong>Atención al desempeño ({{ kpi.cumplimientoMeta }} de la meta):</strong>
          el volumen acumulado del mes tiene una brecha de {{ fmt(Math.abs(kpi.diferenciaMeta)) }} m³ frente a la meta mensual programada.
        </div>
        <div v-else-if="kpi.cumplimientoMetaPct >= 100" class="report-nota">
          <strong>Meta cumplida:</strong> el volumen acumulado alcanzó o superó el 100 % de la meta mensual ({{ kpi.cumplimientoMeta }}).
        </div>
        <div v-else class="report-nota">
          <strong>Desempeño estable:</strong> el volumen acumulado va en {{ kpi.cumplimientoMeta }} de la meta programada.
        </div>

        <footer class="report-footer"><span>Informe Ejecutivo de Producción — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 1 de 3</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 2: COMPORTAMIENTO Y LÍNEAS -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Comportamiento operativo diario — {{ selectedLabel }}</h3>
          <p class="section-note">m³ producidos por día; la línea punteada es el promedio diario del mes ({{ fmt(kpi.promedio) }} m³).</p>
          <VChart class="echart" :option="tema(chartOpt)" autoresize style="height: 300px" />
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Aporte por línea de producción — {{ selectedLabel }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Línea</th><th class="r">m³ producidos</th><th class="r">Part.</th><th class="r">Días con producción</th><th class="r">Promedio por día con producción</th><th class="r">Mejor día</th></tr></thead>
              <tbody>
                <tr v-for="(l, i) in resumenLineas" :key="l.key">
                  <td class="bold"><span class="dot" :style="{ background: config.palette[i] }"></span>{{ l.label }}</td>
                  <td class="r bold">{{ fmt(l.total) }}</td>
                  <td class="r">{{ pctTxt(l.part) }}</td>
                  <td class="r">{{ l.dias }}</td>
                  <td class="r">{{ fmt(l.promedio) }}</td>
                  <td class="r">{{ l.mejor ? `${fmt(l.mejor.valor)} (${l.mejor.fecha})` : '—' }}</td>
                </tr>
              </tbody>
              <tfoot><tr class="table-total-row"><td>Total</td><td class="r">{{ fmt(kpi.total) }}</td><td class="r">100 %</td><td class="r">{{ kpi.diasConProduccion }}</td><td class="r">{{ fmt(kpi.diasConProduccion ? kpi.total / kpi.diasConProduccion : 0) }}</td><td class="r">{{ mejorDia ? `${fmt(mejorDia.total)} (${mejorDia.fecha})` : '—' }}</td></tr></tfoot>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Informe Ejecutivo de Producción — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 2 de 3</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 3: HISTORIAL, CALIDAD Y CONCLUSIONES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Historial de operación diaria — {{ selectedLabel }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="idx">#</th><th>Fecha</th>
                  <th v-for="l in config.lines" :key="l.key" class="r">{{ l.label }}</th>
                  <th class="r">Total m³</th><th class="r">Proy. día</th><th class="r">Dif. m³</th><th class="r">% Cump.</th><th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in tablaRows" :key="row.Fecha + idx" :class="{ alerta: row.total === 0 }">
                  <td class="idx">{{ idx + 1 }}</td>
                  <td class="bold nowrap">{{ row.Fecha }}</td>
                  <td v-for="l in config.lines" :key="l.key" class="r">{{ fmt(row.lineas[l.key]) }}</td>
                  <td class="r bold accent-text">{{ fmt(row.total) }}</td>
                  <td class="r">{{ fmt(row.proyectado) }}</td>
                  <td class="r bold" :class="row.diferencia >= 0 ? 'green' : 'red'">{{ signo(row.diferencia) }}</td>
                  <td class="r"><span class="pill" :class="pillClassCumplimiento(row.cumplimiento)">{{ pctTxt(row.cumplimiento) }}</span></td>
                  <td class="obs" :title="row.observaciones">{{ row.observaciones || '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="table-total-row">
                  <td class="idx">Σ</td><td>Total</td>
                  <td v-for="l in config.lines" :key="l.key" class="r">{{ fmt(lineTotals[l.key] || 0) }}</td>
                  <td class="r">{{ fmt(kpi.total) }}</td><td class="r">{{ fmt(kpi.proyectado) }}</td>
                  <td class="r" :class="kpi.diferenciaProy >= 0 ? 'green' : 'red'">{{ signo(kpi.diferenciaProy) }}</td>
                  <td class="r"><span class="pill" :class="pillClassCumplimiento(kpi.cumplimientoProyPct)">{{ kpi.cumplimientoProy }}</span></td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div></div>
          <div class="ley-sem">
            <span><i style="background:#1f7a3d"></i>Cumplimiento del proyectado ≥ 95 %</span>
            <span><i style="background:#b8860b"></i>75 % a 95 %</span>
            <span><i style="background:#a90707"></i>Menos de 75 %</span>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — {{ selectedLabel }}</h3>
          <p v-if="avisos.length" class="section-note">{{ avisos.length }} {{ avisos.length === 1 ? 'hallazgo' : 'hallazgos ordenados por prioridad' }}. Cada uno trae el detalle para corregirlo en el sistema.</p>
          <div class="dq-grid">
            <div v-for="c in avisos" :key="c.titulo" class="dq" :class="`dq-${c.nivel}`">
              <div class="dq-head"><span class="pill" :class="pillNivel(c.nivel)">{{ etiquetaNivel(c.nivel) }}</span><b>{{ c.titulo }}</b></div>
              <p class="dq-txt" v-html="c.texto"></p>
              <div v-if="c.tabla" class="data-card"><div class="table-wrap">
                <table>
                  <thead><tr><th v-for="(h, i) in c.tabla.cols" :key="h" :class="{ r: i > 0 && c.tabla.der !== false && !c.tabla.izq?.includes(i) }">{{ h }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(f, j) in c.tabla.filas" :key="j" :class="{ 'table-total-row': f.total }">
                      <td v-for="(v, i) in f.celdas" :key="i" :class="[i === 0 ? 'bold accent-text' : (c.tabla.mono === i ? 'mono' : (c.tabla.der === false || c.tabla.izq?.includes(i) ? '' : 'r')), f.clases?.[i]]">{{ v }}</td>
                    </tr>
                  </tbody>
                </table>
              </div></div>
            </div>
            <div v-if="!avisos.length" class="report-nota">Sin hallazgos: todos los días tienen producción, proyectado y meta registrados.</div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo — {{ selectedLabel }}</h3>
          <div class="data-card" style="padding: 10px 14px">
            <template v-for="(g, i) in conclusiones" :key="g.titulo">
              <div class="concl-head" :style="i ? 'margin-top: 10px' : ''">{{ g.titulo }}</div>
              <ul class="res"><li v-for="(x, j) in g.items" :key="j" v-html="x"></li></ul>
            </template>
          </div>
        </div>

        <footer class="report-footer"><span>Informe Ejecutivo de Producción — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 3 de 3</span></span></footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * InformeProduccionTab.vue — Informe ejecutivo de producción de una planta de agregados
 * (/:planta/produccion/informe). Mismo estilo que los informes de Despacho y Concretos
 * (hoja .report-paper, informe.css): encabezado oficial, análisis, KPIs compactos, comportamiento
 * diario, aporte por línea, historial, calidad del dato y conclusiones. PDF continuo de 297 mm.
 * Recibe las filas diarias ya filtradas por el filtro de fechas de la vista de Producción.
 */
import { type Hallazgo, etiquetaNivel, pillNivel, porPrioridad } from '../../utils/calidadDato'
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import { serialToDate } from '../../utils/dates'
import { fmt } from '../../utils/format'
import { descargarInformePdf } from '../../utils/pdfInforme'
import type { PlantConfig } from './ResumenTab.vue'
import { useTemaInforme } from '../../composables/useTemaInforme'

// En tema oscuro las gráficas se ven con colores para fondo oscuro; el PDF siempre sale en papel blanco
const { tema } = useTemaInforme()

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, MarkLineComponent])

const props = defineProps<{
  config: PlantConfig
  data: Record<string, unknown>[]
}>()

// Nombre de la planta con tilde para los textos del informe
const planta = computed(() => props.config.plantName.replace(/^Cuncia$/i, 'Cuncía').replace(/^Acacias$/i, 'Acacías'))

const pctTxt = (n: number) => `${(Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
const signo = (n: number) => (n >= 0 ? '+' : '') + fmt(n)

/** Extrae la observación del día soportando 'observacion' (Supabase) y variantes */
function getObservacion(r: Record<string, unknown>): string {
  const val = r['observacion'] ?? r['Observacion'] ?? r['observaciones'] ?? r['Observaciones'] ?? r['OBSERVACION'] ?? r['OBSERVACIONES'] ?? r['Observación'] ?? r['Novedad'] ?? r['novedad'] ?? r['Novedades'] ?? r['novedades'] ?? r['Nota'] ?? r['nota'] ?? ''
  return String(val ?? '').trim()
}
const serialDe = (r: Record<string, unknown>) => Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
const totalDe = (r: Record<string, unknown>) => Number(r['Total de M³'] ?? r['total_m3']) || 0
const proyDe = (r: Record<string, unknown>) => Number(r['M³ Proyectado'] ?? r['m3_proyectado']) || 0
const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const fechaCorta = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`

// ── Mes del informe (el más reciente por defecto) ──
const availableMonths = computed(() => {
  const map = new Map<string, { label: string; first: number }>()
  for (const r of props.data) {
    const s = serialDe(r)
    if (!s) continue
    const d = serialToDate(s)
    const k = claveMes(d)
    if (!map.has(k)) {
      const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      map.set(k, { label: label.charAt(0).toUpperCase() + label.slice(1), first: s })
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, v]) => ({ key, ...v }))
})
// Mes del informe = el último mes del período del filtro de fechas de arriba (los datos ya llegan filtrados)
const selectedMonthKey = computed(() => availableMonths.value.at(-1)?.key ?? '')
const selectedLabel = computed(() => availableMonths.value.find(m => m.key === selectedMonthKey.value)?.label ?? '')
const codigo = computed(() => `GRV-INF-${selectedMonthKey.value.replace('-', '')}-AGR-${planta.value.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)}-PROD`)

const monthData = computed(() => props.data
  .filter(r => { const s = serialDe(r); return s && claveMes(serialToDate(s)) === selectedMonthKey.value })
  .sort((a, b) => serialDe(a) - serialDe(b)))
const hasData = computed(() => monthData.value.length > 0)

// ── Indicadores del mes ──
const kpi = computed(() => {
  const rows = monthData.value
  let total = 0, proyectado = 0, metaMensual = 0
  const metaPorMes = new Map<string, number>()
  for (const r of rows) {
    total += totalDe(r)
    proyectado += proyDe(r)
    const s = serialDe(r)
    if (!s) continue
    const k = claveMes(serialToDate(s))
    if (!metaPorMes.has(k)) metaPorMes.set(k, Number(r['Meta Mensual M³'] ?? r['meta_mensual_m3']) || 0)
  }
  for (const v of metaPorMes.values()) metaMensual += v
  const cumplimientoMetaPct = metaMensual > 0 ? total / metaMensual * 100 : 0
  const cumplimientoProyPct = proyectado > 0 ? total / proyectado * 100 : 0
  return {
    total, proyectado, metaMensual,
    diferenciaMeta: total - metaMensual,
    diferenciaProy: total - proyectado,
    cumplimientoMetaPct, cumplimientoProyPct,
    cumplimientoMeta: pctTxt(cumplimientoMetaPct),
    cumplimientoProy: pctTxt(cumplimientoProyPct),
    dias: rows.length,
    diasConProduccion: rows.filter(r => totalDe(r) > 0).length,
    promedio: rows.length ? Math.round(total / rows.length) : 0,
  }
})
const diasTxt = computed(() => `${kpi.value.dias} ${kpi.value.dias === 1 ? 'día registrado' : 'días registrados'}`)

const lineTotals = computed(() => {
  const t: Record<string, number> = {}
  for (const l of props.config.lines) t[l.key] = monthData.value.reduce((s, r) => s + (Number(r[l.key]) || 0), 0)
  return t
})

// ── Tabla diaria ──
const tablaRows = computed(() => monthData.value.map(r => {
  const s = serialDe(r)
  const d = s ? serialToDate(s) : null
  const total = totalDe(r), proyectado = proyDe(r)
  // % de cumplimiento contra el proyectado del día; si no hay proyectado se usa el de la hoja
  let cumplimiento = 0
  if (proyectado > 0) cumplimiento = total / proyectado * 100
  else if (r['% Cumplimiento'] != null || r['cumplimiento'] != null) {
    const raw = Number(r['% Cumplimiento'] ?? r['cumplimiento']) || 0
    cumplimiento = raw > 0 && raw <= 1 ? raw * 100 : raw
  }
  return {
    Fecha: d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '',
    corta: d ? fechaCorta(d) : '',
    lineas: Object.fromEntries(props.config.lines.map(l => [l.key, Number(r[l.key]) || 0])) as Record<string, number>,
    total, proyectado, diferencia: total - proyectado, cumplimiento,
    observaciones: getObservacion(r),
  }
}))

const mejorDia = computed(() => tablaRows.value.reduce<{ total: number; fecha: string } | null>((m, r) => (!m || r.total > m.total ? { total: r.total, fecha: r.corta } : m), null))

const resumenLineas = computed(() => props.config.lines.map(l => {
  const vals = tablaRows.value.map(r => ({ v: r.lineas[l.key] || 0, fecha: r.corta }))
  const conProd = vals.filter(x => x.v > 0)
  const total = lineTotals.value[l.key] || 0
  const mejor = conProd.reduce<{ valor: number; fecha: string } | null>((m, x) => (!m || x.v > m.valor ? { valor: x.v, fecha: x.fecha } : m), null)
  return { key: l.key, label: l.label, total, part: kpi.value.total ? total / kpi.value.total * 100 : 0,
    dias: conProd.length, promedio: conProd.length ? total / conProd.length : 0, mejor }
}))

function pillClassCumplimiento(n: number): string {
  if (n >= 95) return 'p-verde'
  if (n >= 75) return 'p-ambar'
  return 'p-rojo'
}

// ── Textos generados de los datos ──
const textoAnalisis = computed(() => {
  const k = kpi.value
  const lineas = resumenLineas.value.map(l => `${l.label}: <strong>${fmt(l.total)} m³</strong> (${pctTxt(l.part)})`).join(' · ')
  return `En <strong>${selectedLabel.value}</strong> la planta <strong>${planta.value}</strong> produjo <strong>${fmt(k.total)} m³</strong> ` +
    `frente a una meta mensual de <strong>${fmt(k.metaMensual)} m³</strong> (cumplimiento del <strong>${k.cumplimientoMeta}</strong>) ` +
    `y a un proyectado diario acumulado de <strong>${fmt(k.proyectado)} m³</strong> (efectividad del <strong>${k.cumplimientoProy}</strong>). ` +
    `La brecha frente a la meta es de <strong>${signo(k.diferenciaMeta)} m³</strong>, con un promedio de <strong>${fmt(k.promedio)} m³ por día</strong> ` +
    `en ${diasTxt.value}. <strong>Aporte por línea:</strong> ${lineas}.`
})

const avisos = computed(() => {
  const out: Hallazgo[] = []
  const obs = (r: { observaciones: string }) => r.observaciones || '—'
  if (!kpi.value.metaMensual) out.push({ nivel: 'alto', titulo: 'Sin meta mensual registrada',
    texto: 'El mes no tiene meta mensual en la hoja de producción; el cumplimiento de meta queda en 0 %. <b>Acción:</b> registrar la meta del mes en la hoja.' })
  const bajos = tablaRows.value.filter(r => r.proyectado > 0 && r.total > 0 && r.cumplimiento < 75)
  if (bajos.length) out.push({ nivel: 'alto', titulo: `${bajos.length} ${bajos.length === 1 ? 'día' : 'días'} por debajo del 75 % del proyectado`,
    texto: 'La producción del día quedó muy por debajo de lo proyectado. <b>Acción:</b> confirmar la causa (paradas, clima, mantenimiento) y dejarla en las observaciones.',
    tabla: { cols: ['Día', 'Producido', 'Proyectado', 'Cumplimiento', 'Observación'], izq: [4],
      filas: bajos.map(r => ({ celdas: [r.corta, `${fmt(r.total)} m³`, `${fmt(r.proyectado)} m³`, pctTxt(r.cumplimiento), obs(r)], clases: { 3: 'r bold red', 4: 'muted' } })) } })
  const sinProd = tablaRows.value.filter(r => r.total === 0)
  if (sinProd.length) out.push({ nivel: 'medio', titulo: `${sinProd.length} ${sinProd.length === 1 ? 'día' : 'días'} con producción en cero`,
    texto: 'Pueden ser días sin operación o registros aún no cargados. <b>Acción:</b> si hubo producción, cargarla; si no, anotar el motivo en las observaciones.',
    tabla: { cols: ['Día', 'Proyectado', 'Observación'], izq: [2],
      filas: sinProd.map(r => ({ celdas: [r.corta, r.proyectado ? `${fmt(r.proyectado)} m³` : '—', obs(r)], clases: { 2: 'muted' } })) } })
  const sinProy = tablaRows.value.filter(r => r.total > 0 && r.proyectado === 0)
  if (sinProy.length) out.push({ nivel: 'medio', titulo: `${sinProy.length} ${sinProy.length === 1 ? 'día' : 'días'} sin proyectado diario`,
    texto: 'El cumplimiento del día no se puede medir contra el proyectado. <b>Acción:</b> cargar el proyectado de esos días en la hoja.',
    tabla: { cols: ['Día', 'Producido'], filas: sinProy.map(r => ({ celdas: [r.corta, `${fmt(r.total)} m³`] })) } })
  return porPrioridad(out)
})

const conclusiones = computed(() => {
  const k = kpi.value
  const prod: string[] = [], cumpl: string[] = [], calidad: string[] = []
  prod.push(`La planta produjo <strong>${fmt(k.total)} m³</strong> en ${diasTxt.value}.`)
  const lider = [...resumenLineas.value].sort((a, b) => b.total - a.total)[0]
  if (lider && lider.total) prod.push(`La línea con más producción fue <strong>${lider.label}</strong> con ${fmt(lider.total)} m³ (${pctTxt(lider.part)} del total).`)
  if (mejorDia.value && mejorDia.value.total) prod.push(`El mejor día fue el <strong>${mejorDia.value.fecha}</strong> con ${fmt(mejorDia.value.total)} m³.`)
  cumpl.push(`Va en <strong>${k.cumplimientoMeta}</strong> de la meta mensual y <strong>${k.cumplimientoProy}</strong> del proyectado diario.`)
  const sobre = tablaRows.value.filter(r => r.proyectado > 0 && r.cumplimiento >= 95).length
  const conProy = tablaRows.value.filter(r => r.proyectado > 0).length
  if (conProy) cumpl.push(`${sobre} de ${conProy} días con proyectado alcanzaron al menos el 95 % de lo proyectado.`)
  const conObs = tablaRows.value.filter(r => r.observaciones).length
  if (conObs) cumpl.push(`${conObs} ${conObs === 1 ? 'día tiene' : 'días tienen'} observaciones registradas (ver historial).`)
  if (avisos.value.length) {
    calidad.push(`${avisos.value.length} ${avisos.value.length === 1 ? 'hallazgo' : 'hallazgos'} para revisar (ver sección anterior).`)
    calidad.push(...avisos.value.filter(a => a.nivel === 'alto').map(a => `Revisar: ${a.titulo.toLowerCase()}.`))
  } else calidad.push('Sin hallazgos: los datos del período están completos.')
  return [
    { titulo: 'Producción', items: prod },
    { titulo: 'Cumplimiento', items: cumpl },
    { titulo: 'Calidad del dato', items: calidad },
  ]
})

// ── Gráfica (colores para papel blanco; en tema oscuro el CSS pone un panel claro detrás de .echart) ──
const chartOpt = computed(() => {
  const labels = tablaRows.value.map(r => r.corta)
  const total = tablaRows.value.map(r => r.total)
  const prom = kpi.value.promedio
  return {
    animation: false,
    textStyle: { fontFamily: 'Lato, Segoe UI, sans-serif' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (ps: any[]) => { const i = ps[0]?.dataIndex ?? 0
        return `<b>Día ${labels[i]}</b><br/>Producción: <b>${fmt(total[i])} m³</b><br/>Proyectado: ${fmt(tablaRows.value[i].proyectado)} m³` },
    },
    grid: { left: 12, right: 90, bottom: 10, top: 28, containLabel: true },
    xAxis: { type: 'category' as const, data: labels, axisLabel: { color: '#475569', fontSize: 9.5, rotate: labels.length > 20 ? 45 : 0 }, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisTick: { show: false } },
    yAxis: { type: 'value' as const, max: (v: { max: number }) => Math.ceil(v.max * 1.15), axisLabel: { color: '#475569', fontSize: 9.5, formatter: (v: number) => fmt(v) }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{
      name: 'Producción (m³)', type: 'line' as const, smooth: 0.25, data: total,
      areaStyle: { opacity: 0.08, color: '#2563eb' }, lineStyle: { width: 2.2, color: '#1d4ed8' },
      symbol: 'circle', symbolSize: 6, itemStyle: { color: '#1d4ed8', borderColor: '#fff', borderWidth: 2 },
      label: { show: labels.length <= 31, position: 'top' as const, distance: 5, fontSize: 8.5, fontWeight: 700 as const, color: '#1e3a8a', formatter: (p: any) => fmt(p.value) },
      markLine: {
        symbol: 'none', silent: true,
        label: { show: true, position: 'end' as const, formatter: `Prom. ${fmt(prom)} m³`, color: '#10b981', fontSize: 9.5, fontWeight: 700 as const },
        lineStyle: { color: '#10b981', type: 'dashed' as const, width: 1.6 },
        data: [{ yAxis: prom }],
      },
    }],
  }
})

// ── PDF ──
const paperRef = ref<HTMLElement | null>(null)
const generandoPdf = ref(false)
async function pdf() {
  if (!paperRef.value || generandoPdf.value) return
  generandoPdf.value = true
  try {
    await descargarInformePdf(paperRef.value, `Informe_Produccion_${planta.value.normalize('NFD').replace(/[^A-Za-z]/g, '')}_${selectedMonthKey.value}.pdf`)
  } catch (e) {
    console.error('[informe-produccion] Error generando PDF:', e)
  } finally {
    generandoPdf.value = false
  }
}
</script>

<style scoped src="../concretos/tabs/informe.css"></style>
<style scoped>
.icb-corte select { font: inherit; padding: 5px 8px; border: 1px solid var(--card-border); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; }
.nowrap { white-space: nowrap; }
.obs { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary); }
/* Cinco KPIs (total + 3 líneas + promedio en Cuncía): una sola fila */
.compact-kpi:has(> :nth-child(5):last-child) { grid-template-columns: repeat(5, 1fr); }
/* Seis KPIs de proyectado y meta: tres por fila en pantallas anchas */
.compact-kpi:has(> :nth-child(6)) { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 1100px) { .compact-kpi:has(> :nth-child(6)), .compact-kpi:has(> :nth-child(5):last-child) { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .compact-kpi:has(> :nth-child(6)), .compact-kpi:has(> :nth-child(5):last-child) { grid-template-columns: 1fr 1fr; } }
/* En el PDF las observaciones se ven completas */
.pdf-capturing .obs { white-space: normal; max-width: none; }
</style>
