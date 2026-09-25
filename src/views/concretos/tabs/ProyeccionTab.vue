<template>
  <div class="informe-tab">
    <!-- Barra superior: fecha de corte + descarga PDF (igual que el Informe Comercial) -->
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte Diario Oficial</span>
        <span class="icb-title">Informe de Proyección de Clientes — Concretos</span>
      </div>
      <div class="icb-actions">
        <label class="icb-corte">
          Corte
          <input type="date" v-model="corteSel" :min="fechaMin" :max="fechaMax" />
        </label>
        <button class="tb-btn primary" @click="generarInformePdf" :disabled="!hayDatos || generandoPdf" title="Generar y descargar archivo PDF oficial">
          <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span v-if="generandoPdf">Generando PDF...</span>
          <span v-else>Descargar PDF</span>
        </button>
      </div>
    </div>

    <div v-if="cargando" class="report-nota">Cargando proyecciones…</div>
    <div v-else-if="errorCarga" class="report-nota alerta">No se pudieron cargar las proyecciones: {{ errorCarga }}</div>
    <div v-else-if="!hayDatos" class="report-nota">No hay proyección cargada para el mes de la fecha de corte seleccionada.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1: INDICADORES -->
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/Logo-Gravicon-Nuevo.png" alt="Gravicon" class="report-logo" loading="eager" />
            <div class="report-header-text">
              <h2>Comercial Concretos Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Concretos</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div class="meta-item"><span>Corte:</span> <strong>{{ corteLargo }}</strong></div>
            <div class="meta-item"><span>Código:</span> <strong>GRV-INF-{{ anio }}-CONCRETOS-PROY</strong></div>
            <div class="meta-item page-counter"><span>Pág. 1 de 4</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe de Proyección de Clientes</h1>
          <p class="report-intro">
            Seguimiento a la <strong>proyección mensual de clientes de concreto</strong> de {{ mesLbl }}: meta en m³ por planta y cliente
            frente a lo ejecutado al <strong>{{ corteLargo }}</strong>, ritmo esperado según el avance del mes, desviación, faltante y m³
            diarios necesarios para cumplir. Incluye el avance de cada cliente proyectado, el seguimiento día a día, la
            <strong>producción por vehículo</strong> y el control de calidad del dato. Fuente: proyecciones_clientes, proyecciones_planta y order_price.
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis Operativo Directivo</div>
            <div class="zoho-analysis-text" v-html="analisisTexto"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Indicadores de la proyección — {{ mesLbl }} (día {{ dia }} de {{ ultDia }})</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :accent="k.accent" :icon="k.icon" :meta="k.meta" :detail="k.detail" />
          </div>
          <div v-if="sinProy.length" class="report-nota alerta">
            <strong>Proyección incompleta:</strong> {{ sinProy.join(', ') }} {{ sinProy.length === 1 ? 'no tiene' : 'no tienen' }} proyección cargada
            para {{ mesLbl }}; los totales no la incluyen. Ver control de calidad del dato.
          </div>
          <div v-else-if="T.desv < 0" class="report-nota alerta">
            <strong>Por debajo del ritmo:</strong> faltan {{ fmtN(T.falta) }} m³ para la meta; se necesitan {{ fmtN(T.diario) }} m³ por día hábil.
          </div>
          <div v-else class="report-nota"><strong>Por encima del ritmo esperado.</strong></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Resumen por planta — {{ mesLbl }}</h3>
          <div class="data-card"><div class="table-wrap"><table>
            <thead><tr><th>Planta</th><th class="r">Meta m³</th><th class="r">Ejecutado m³</th><th class="r">Cumplimiento</th><th class="r">Ritmo esperado</th>
              <th class="r">Desviación</th><th class="r">Faltante</th><th class="r">m³/día necesarios</th><th class="r">Clientes con despacho</th></tr></thead>
            <tbody>
              <tr v-for="p in plantas" :key="p">
                <td class="bold accent-text">{{ p }}</td><td class="r">{{ fmtN(P[p].meta, 0) }}</td><td class="r bold">{{ fmtN(P[p].real) }}</td>
                <td class="r"><span class="pill" :class="semClase(P[p].cump / avance * 100)">{{ pct(P[p].cump) }}</span></td>
                <td class="r">{{ fmtN(P[p].esperado) }}</td>
                <td class="r bold" :class="P[p].desv >= 0 ? 'green' : 'red'">{{ sg(P[p].desv) }}</td>
                <td class="r">{{ fmtN(P[p].falta) }}</td><td class="r">{{ fmtN(P[p].diario) }}</td>
                <td class="r">{{ P[p].conDesp }} de {{ P[p].clientes.length }}</td>
              </tr>
              <tr v-for="p in sinProy" :key="'s' + p" class="alerta">
                <td class="bold accent-text">{{ p }}</td><td class="r">—</td><td class="r bold">{{ fmtN(ejecOp(p)) }}</td>
                <td class="r" colspan="6"><em>sin proyección cargada (m³ tomados de order_price)</em></td>
              </tr>
              <tr class="table-total-row">
                <td>TOTAL CON PROYECCIÓN</td><td class="r">{{ fmtN(T.meta, 0) }}</td><td class="r">{{ fmtN(T.real) }}</td><td class="r">{{ pct(T.cump) }}</td>
                <td class="r">{{ fmtN(T.esperado) }}</td><td class="r">{{ sg(T.desv) }}</td><td class="r">{{ fmtN(T.falta) }}</td>
                <td class="r">{{ fmtN(T.diario) }}</td><td class="r">{{ nCon }} de {{ nCli }}</td>
              </tr>
            </tbody>
          </table></div></div>
        </div>

        <footer class="report-footer">
          <span>Informe de Proyección de Clientes — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 1 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 2: GRÁFICAS DE CUMPLIMIENTO -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Cumplimiento por planta — {{ mesLbl }}</h3>
          <p class="section-note">Izquierda: % de la meta mensual que lleva cada planta; la línea punteada es lo que debería llevar a hoy ({{ pct(avance, 0) }} del mes).
            Derecha: meta del mes, lo esperado a la fecha y lo ejecutado, en m³. El color del ejecutado indica qué tan al día va la planta.</p>
          <div class="fila-charts">
            <div ref="chCumpRef" class="echart" style="flex: 1; height: 260px"></div>
            <div ref="chMetaRef" class="echart" style="flex: 1.2; height: 260px"></div>
          </div>
          <div class="ley-sem">
            <span><i style="background:#16a34a"></i><b>Verde · al día:</b> 90% o más de lo esperado a hoy</span>
            <span><i style="background:#f59e0b"></i><b>Amarillo · algo atrasado:</b> entre 70% y 90%</span>
            <span><i style="background:#dc2626"></i><b>Rojo · muy atrasado:</b> menos del 70%</span>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Avance acumulado del mes vs. meta — {{ mesLbl }}</h3>
          <p class="section-note">Ejecutado acumulado día a día frente a la meta acumulada (meta del mes repartida en los días operativos) y proyección al cierre con el ritmo actual.</p>
          <div ref="chAcumRef" class="echart" style="height: 300px"></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Despacho diario por planta vs. meta diaria — {{ mesLbl }}</h3>
          <p class="section-note">m³ por día y planta; la línea es la meta diaria ({{ fmtN(metaDiaria) }} m³/día = meta del mes ÷ {{ diasOpMes }} días operativos).</p>
          <div ref="chDiarioRef" class="echart" style="height: 300px"></div>
        </div>

        <footer class="report-footer">
          <span>Informe de Proyección de Clientes — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 2 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 3: CLIENTES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Clientes proyectados por planta — {{ mesLbl }}</h3>
          <p class="section-note">Cumplimiento de cada cliente frente a su meta; en rojo los que no han despachado. «Calle» agrupa los clientes sin proyección.</p>
          <div class="data-card"><div class="table-wrap"><table>
            <thead><tr><th>Planta</th><th>Cliente</th><th>Obra</th><th class="r">Meta m³</th><th class="r">Ejecutado m³</th><th class="r">Cumplimiento</th><th class="r">Faltante</th></tr></thead>
            <tbody>
              <template v-for="p in plantas" :key="p">
                <tr v-for="(c, i) in P[p].clientes" :key="p + i" :class="{ alerta: c.real === 0 && c.meta > 0 }">
                  <td v-if="i === 0" class="grp bold accent-text" :rowspan="P[p].clientes.length + (P[p].calle ? 2 : 1)">{{ p }}</td>
                  <td class="bold">{{ titulo(c.cliente) }}</td><td class="muted">{{ titulo(c.obra) }}</td>
                  <td class="r">{{ fmtN(c.meta, 0) }}</td><td class="r bold">{{ fmtN(c.real) }}</td>
                  <td class="r"><span class="pill" :class="c.meta ? semClase(c.real / c.meta * 100 / avance * 100) : 'p-gris'">{{ c.meta ? pct(c.real / c.meta * 100) : '—' }}</span></td>
                  <td class="r">{{ fmtN(Math.max(c.meta - c.real, 0)) }}</td>
                </tr>
                <tr v-if="P[p].calle" class="calle">
                  <td v-if="!P[p].clientes.length" class="grp bold accent-text" rowspan="2">{{ p }}</td>
                  <td class="bold">Calle</td><td class="muted">{{ P[p].calleDet.length }} clientes sin proyección</td>
                  <td class="r">{{ fmtN(P[p].calle.meta, 0) }}</td><td class="r bold">{{ fmtN(P[p].calle.real) }}</td>
                  <td class="r"><span class="pill" :class="P[p].calle.meta ? semClase(P[p].calle.real / P[p].calle.meta * 100 / avance * 100) : 'p-gris'">{{ P[p].calle.meta ? pct(P[p].calle.real / P[p].calle.meta * 100) : '—' }}</span></td>
                  <td class="r">{{ fmtN(Math.max(P[p].calle.meta - P[p].calle.real, 0)) }}</td>
                </tr>
                <tr class="subtotal">
                  <td v-if="!P[p].clientes.length && !P[p].calle" class="grp bold accent-text">{{ p }}</td>
                  <td colspan="2">Subtotal {{ p }}</td><td class="r">{{ fmtN(P[p].meta, 0) }}</td><td class="r">{{ fmtN(P[p].real) }}</td>
                  <td class="r">{{ pct(P[p].cump) }}</td><td class="r">{{ fmtN(P[p].falta) }}</td>
                </tr>
              </template>
            </tbody>
          </table></div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Histórico {{ anio }} — meta vs. ejecutado por mes</h3>
          <div ref="chHistRef" class="echart" style="height: 280px"></div>
        </div>

        <footer class="report-footer">
          <span>Informe de Proyección de Clientes — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 3 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 4: PRODUCCIÓN POR VEHÍCULO + CALIDAD -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Producción por vehículo — {{ mesLbl }} (1 al {{ dia }})</h3>
          <p class="section-note">m³ de concreto despachados por cada mixer, apilados por planta (sin agregados). A la derecha, viajes del mes.</p>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpisVeh" :key="k.label" :label="k.label" :value="k.value" :accent="k.accent" :icon="k.icon" :meta="k.meta" :detail="k.detail" />
          </div>
          <div ref="chMixerRef" class="echart" :style="{ height: Math.max(260, top(vehiculos, TOPV).length * 22 + 40) + 'px' }"></div>
        </div>

        <div class="charts-grid cols-2 align-start">
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Detalle por mixer — {{ mesLbl }} (top {{ TOPV }})</h3>
            <div class="data-card"><div class="table-wrap"><table>
              <thead><tr><th class="idx">#</th><th>Mixer</th><th>Planta principal</th><th class="r">Viajes</th><th class="r">m³</th><th class="r">m³/viaje</th><th class="r">Días</th><th class="r">m³/día</th><th class="r">Hoy</th></tr></thead>
              <tbody>
                <tr v-for="(v, i) in top(vehiculos, TOPV)" :key="v.mixer">
                  <td class="idx">{{ i + 1 }}</td><td class="bold accent-text mono">{{ v.mixer }}</td><td>{{ v.plantaPpal }}</td>
                  <td class="r">{{ v.viajes }}</td><td class="r bold">{{ fmtN(v.m3) }}</td><td class="r">{{ fmtN(v.m3 / v.viajes) }}</td>
                  <td class="r">{{ v.dias }}</td><td class="r">{{ fmtN(v.m3 / v.dias) }}</td><td class="r">{{ v.hoyM3 ? fmtN(v.hoyM3) : '—' }}</td>
                </tr>
                <tr v-if="vehiculos.length > TOPV"><td></td><td colspan="2" class="muted"><em>Otros {{ vehiculos.length - TOPV }} mixers</em></td>
                  <td class="r">{{ sumBy(vehiculos.slice(TOPV), 'viajes') }}</td><td class="r">{{ fmtN(sumBy(vehiculos.slice(TOPV), 'm3')) }}</td><td colspan="4"></td></tr>
                <tr class="table-total-row"><td></td><td colspan="2">TOTAL · {{ vehiculos.length }} mixers</td>
                  <td class="r">{{ V.viajes }}</td><td class="r">{{ fmtN(V.m3) }}</td><td class="r">{{ fmtN(V.viajes ? V.m3 / V.viajes : 0) }}</td><td colspan="2"></td><td class="r">{{ fmtN(V.hoyM3) }}</td></tr>
              </tbody>
            </table></div></div>
          </div>
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Producción por conductor — {{ mesLbl }} (top {{ TOPV }})</h3>
            <div ref="chCondRef" class="echart" :style="{ height: Math.max(260, top(conductores, TOPV).length * 22 + 30) + 'px' }"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — {{ mesLbl }}</h3>
          <div class="avisos">
            <div v-for="(a, i) in avisos" :key="i" class="aviso" :class="a.nivel"><span class="ico">!</span><div><b>{{ a.titulo }}</b>{{ a.texto }}</div></div>
            <div v-if="!avisos.length" class="report-nota">No se encontraron datos a revisar.</div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo — {{ mesLbl }}</h3>
          <div class="data-card" style="padding: 10px 14px">
            <template v-for="(g, i) in conclusiones" :key="g.titulo">
              <div class="concl-head" :style="i ? 'margin-top:10px' : ''">{{ g.titulo }}</div>
              <ul class="res"><li v-for="(x, j) in g.items" :key="j">{{ x }}</li></ul>
            </template>
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe de Proyección de Clientes — Gravicon · Generado {{ generado }}</span>
          <span>Documento Oficial<span class="fp-num"> | Página 4 de 4</span></span>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { useClientesStore } from '../../../stores'
import { useAuthStore } from '../../../stores/auth'
import { serialToDate } from '../../../utils/dates'
import { esAgregado } from '../../../utils/agregadosConcreto'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'

echarts.use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, LabelLayout])

/*
 * ProyeccionTab.vue — Informe de Proyección de Clientes (mismo contenido que el PDF/correo diario):
 * meta vs. ejecutado por planta y cliente (proyecciones_clientes), seguimiento diario (proyecciones_planta)
 * y producción por vehículo y conductor (order_price, sin agregados). Descarga un PDF continuo de una sola hoja.
 */
const props = defineProps<{
  /** Filas de order_price ya filtradas por planta/comercial (sin filtro de fechas) */
  rows: Record<string, unknown>[]
  /** Fecha fin del filtro global (YYYY-MM-DD); se usa como corte por defecto */
  corte?: string
}>()

// ---------------------------------------------------------------- Utilidades
const TOPV = 15
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ORDEN_PLANTAS = ['Villavicencio', 'Acacías', 'Restrepo', 'Puerto Concordia']
const COLORES: Record<string, string> = { 'Villavicencio': '#172954', 'Acacías': '#2563eb', 'Restrepo': '#93c5fd', 'Puerto Concordia': '#10b981' }
const PP_COL: Record<string, string> = { 'Villavicencio': 'villavicencio', 'Acacías': 'acacias', 'Restrepo': 'restrepo', 'Puerto Concordia': 'concordia' }
const CP = '#172954'

function fmtN(n: number, d = 1): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function pct(n: number, d = 1): string { return fmtN(n, d) + '%' }
function sg(n: number): string { return (n > 0 ? '+' : '') + fmtN(n) }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function norm(s: unknown): string { return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') }
function titulo(s: string) { return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) }
function nombrePlanta(v: unknown): string {
  const s = String(v ?? '').replace(/^Planta\s+/i, '').trim()
  if (/^acacias$/i.test(s)) return 'Acacías'
  if (/concordia/i.test(s)) return 'Puerto Concordia'
  return s || 'Sin planta'
}
function color(p: string): string { return COLORES[p] ?? '#8b5cf6' }
function semCol(c: number) { return c >= 90 ? '#16A34A' : c >= 70 ? '#F59E0B' : '#DC2626' }
function semClase(c: number) { return c >= 90 ? 'p-verde' : c >= 70 ? 'p-ambar' : 'p-rojo' }
function top<T>(arr: T[], n: number): T[] { return arr.slice(0, n) }
function sumBy<T>(arr: T[], k: keyof T): number { return arr.reduce((a, x) => a + (x[k] as unknown as number), 0) }
function ordenar(ps: Iterable<string>) {
  return [...ps].sort((a, b) => (ORDEN_PLANTAS.indexOf(a) + 99) % 99 - (ORDEN_PLANTAS.indexOf(b) + 99) % 99)
}

// ---------------------------------------------------------------- Carga de proyecciones
const clientesStore = useClientesStore()
const ppRows = ref<Record<string, unknown>[]>([])
const cargando = ref(false)
const errorCarga = ref<string | null>(null)
async function cargar() {
  cargando.value = true; errorCarga.value = null
  try {
    const token = useAuthStore().accessToken
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const [, pp] = await Promise.all([
      clientesStore.data ? Promise.resolve() : clientesStore.fetchData(),
      fetch('/api/proyecciones-planta/data', { headers }).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json() }),
    ])
    ppRows.value = pp?.rows ?? []
    if (clientesStore.error) errorCarga.value = clientesStore.error
  } catch (e: any) {
    console.error('[proyeccion]', e); errorCarga.value = e.message
  } finally { cargando.value = false }
}

// ---------------------------------------------------------------- Normalización
interface Proy { mes: string; planta: string; cliente: string; obra: string; tipo: string; meta: number; real: number }
const pc = computed<Proy[]>(() => (clientesStore.allRows as Record<string, unknown>[]).map(r => ({
  mes: String(r.fecha ?? '').slice(0, 10), planta: nombrePlanta(r.planta), cliente: String(r.nombre_cliente ?? '').trim(),
  obra: String(r.obra ?? '').trim(), tipo: String(r.tipo ?? ''), meta: num(r.m3_proyectado), real: num(r.cantidad_m3),
})))
const esCalle = (r: Proy) => norm(r.cliente) === 'CLIENTE' && norm(r.obra) === 'CALLE'

interface Rem { iso: string; planta: string; cliente: string; proyecto: string; m3: number; mixer: string; conductor: string }
const remisiones = computed<Rem[]>(() => props.rows
  .filter(r => typeof r['Fecha'] === 'number' && r['Fecha'] && !esAgregado(r['Mezcla'], r['Cliente'], r['Planta']))
  .map(r => ({
    iso: serialToDate(r['Fecha'] as number).toISOString().slice(0, 10), planta: nombrePlanta(r['Planta']),
    cliente: String(r['Cliente'] ?? '').trim(), proyecto: String(r['Proyecto'] ?? '').trim(), m3: num(r['Cant. Concreto']),
    mixer: String(r['Mixer'] ?? '').trim().toUpperCase(), conductor: String(r['Conductor'] ?? '').trim(),
  })))

// ---------------------------------------------------------------- Periodo
const fechaMin = computed(() => remisiones.value.reduce((a, r) => (r.iso < a ? r.iso : a), '9999-12-31'))
const fechaMax = computed(() => remisiones.value.reduce((a, r) => (r.iso > a ? r.iso : a), ''))
const corteSel = ref('')
watch(() => [props.corte, fechaMax.value], () => {
  corteSel.value = props.corte && props.corte <= fechaMax.value ? props.corte : fechaMax.value
}, { immediate: true })
const corteIso = computed(() => corteSel.value || fechaMax.value)
const anio = computed(() => Number(corteIso.value.slice(0, 4)))
const mes = computed(() => Number(corteIso.value.slice(5, 7)))
const dia = computed(() => Number(corteIso.value.slice(8, 10)))
const pref = computed(() => `${anio.value}-${String(mes.value).padStart(2, '0')}`)
const mesIso = computed(() => `${pref.value}-01`)
const ultDia = computed(() => new Date(Date.UTC(anio.value, mes.value, 0)).getUTCDate())
const esDomingo = (d: number) => new Date(Date.UTC(anio.value, mes.value - 1, d)).getUTCDay() === 0
const avance = computed(() => dia.value / ultDia.value * 100)          // avance calendario (misma base que el informe por correo)
const diasRest = computed(() => ultDia.value - dia.value)
const habRest = computed(() => { let n = 0; for (let d = dia.value + 1; d <= ultDia.value; d++) if (!esDomingo(d)) n++; return n })
const diasOpMes = computed(() => { let n = 0; for (let d = 1; d <= ultDia.value; d++) if (!esDomingo(d)) n++; return n })
const mesLbl = computed(() => `${MESES[mes.value - 1]} ${anio.value}`)
const corteLargo = computed(() => `${dia.value} de ${MESES[mes.value - 1]} de ${anio.value}`)
const generado = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

// ---------------------------------------------------------------- Meta vs. ejecutado
const mesRows = computed(() => pc.value.filter(r => r.mes === mesIso.value))
const hayDatos = computed(() => mesRows.value.length > 0 && !!corteIso.value)
const plantas = computed(() => ordenar(new Set(mesRows.value.map(r => r.planta))))
const remMes = computed(() => remisiones.value.filter(r => r.iso.startsWith(pref.value) && r.iso <= corteIso.value))
const sinProy = computed(() => ordenar(new Set(remMes.value.map(r => r.planta))).filter(p => !plantas.value.includes(p)))
function ejecOp(p: string) { return remMes.value.filter(r => r.planta === p).reduce((a, r) => a + r.m3, 0) }

function resumenPlanta(p: string, filas: Proy[]) {
  const proy = filas.filter(r => r.planta === p && r.tipo === 'Proyectado')
  const calle = proy.find(esCalle) ?? null
  const clientes = proy.filter(r => !esCalle(r)).sort((a, b) => b.meta - a.meta)
  const meta = proy.reduce((a, r) => a + r.meta, 0), real = proy.reduce((a, r) => a + r.real, 0)
  const esperado = meta * avance.value / 100, falta = Math.max(meta - real, 0)
  return {
    meta, real, cump: meta ? real / meta * 100 : 0, esperado, desv: real - esperado, falta,
    diario: habRest.value ? falta / habRest.value : 0, clientes, calle,
    calleDet: filas.filter(r => r.planta === p && r.tipo === 'Cliente de Calle'),
    conDesp: clientes.filter(r => r.real > 0).length,
  }
}
const P = computed(() => Object.fromEntries(plantas.value.map(p => [p, resumenPlanta(p, mesRows.value)])) as Record<string, ReturnType<typeof resumenPlanta>>)
const T = computed(() => {
  const s = (k: 'meta' | 'real' | 'esperado' | 'desv' | 'falta') => plantas.value.reduce((a, p) => a + P.value[p][k], 0)
  const meta = s('meta'), real = s('real'), falta = s('falta')
  return { meta, real, esperado: s('esperado'), desv: s('desv'), falta, cump: meta ? real / meta * 100 : 0, diario: habRest.value ? falta / habRest.value : 0 }
})
const nCli = computed(() => plantas.value.reduce((a, p) => a + P.value[p].clientes.length, 0))
const nCon = computed(() => plantas.value.reduce((a, p) => a + P.value[p].conDesp, 0))

// ---------------------------------------------------------------- KPIs
function detalle(valores: (p: string) => string): string {
  const fila = (p: string, v: string, st = '') => `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p)}'></span>` +
    `<span class='kpi-label-int' style='color:#3B82F6;min-width:92px'>${p}</span> <strong${st}>${v}</strong></div>`
  return plantas.value.map(p => fila(p, valores(p))).join('') + sinProy.value.map(p => fila(p, 'sin proyección', " style='color:#a90707'")).join('')
}
interface KpiDef { label: string; value: string; accent: string; icon: string; meta?: string; detail?: string }
const kpis = computed<KpiDef[]>(() => {
  const t = T.value, pp = P.value
  return [
    { label: 'Meta del Mes', value: fmtN(t.meta, 0) + ' m³', accent: '#1D4ED8', icon: 'target', meta: 'proyectado', detail: detalle(p => fmtN(pp[p].meta, 0)) },
    { label: 'Ejecutado', value: fmtN(t.real) + ' m³', accent: '#172954', icon: 'package', meta: `al ${String(dia.value).padStart(2, '0')}/${String(mes.value).padStart(2, '0')}`, detail: detalle(p => fmtN(pp[p].real)) },
    { label: 'Cumplimiento', value: pct(t.cump), accent: semCol(t.cump / avance.value * 100), icon: 'check-circle', meta: `avance mes ${pct(avance.value, 0)}`, detail: detalle(p => pct(pp[p].cump)) },
    { label: 'Ritmo Esperado', value: fmtN(t.esperado) + ' m³', accent: '#64748B', icon: 'clock', meta: `meta × ${dia.value}/${ultDia.value}`, detail: detalle(p => fmtN(pp[p].esperado)) },
    { label: 'Desviación vs Ritmo', value: sg(t.desv) + ' m³', accent: t.desv >= 0 ? '#16A34A' : '#DC2626', icon: 'activity', meta: 'real − esperado', detail: detalle(p => sg(pp[p].desv)) },
    { label: 'Faltante para la Meta', value: fmtN(t.falta) + ' m³', accent: '#DC2626', icon: 'trending-up', meta: `${diasRest.value} días restantes`, detail: detalle(p => fmtN(pp[p].falta)) },
    { label: 'm³/día Necesarios', value: fmtN(t.diario) + ' m³', accent: '#F59E0B', icon: 'zap', meta: `${habRest.value} días hábiles`, detail: detalle(p => fmtN(pp[p].diario)) },
    { label: 'Clientes con Despacho', value: `${nCon.value} de ${nCli.value}`, accent: '#10B981', icon: 'users', meta: 'proyectados', detail: detalle(p => `${pp[p].conDesp} de ${pp[p].clientes.length}`) },
  ]
})

// ---------------------------------------------------------------- Seguimiento diario (proyecciones_planta; si no hay, order_price)
const metaDiaria = computed(() => (diasOpMes.value ? T.value.meta / diasOpMes.value : 0))
const diario = computed(() => {
  const pp = ppRows.value.filter(r => String(r.fecha ?? '').startsWith(pref.value) && String(r.fecha) <= corteIso.value)
  const usarPP = pp.some(r => plantas.value.some(p => num(r[PP_COL[p]]) > 0))
  const dias: { iso: string; porPlanta: Record<string, number>; total: number }[] = []
  for (let d = 1; d <= dia.value; d++) {
    const iso = `${pref.value}-${String(d).padStart(2, '0')}`
    const porPlanta: Record<string, number> = {}
    for (const p of plantas.value) {
      porPlanta[p] = usarPP ? num(pp.find(r => String(r.fecha).slice(0, 10) === iso)?.[PP_COL[p]])
        : remMes.value.filter(r => r.iso === iso && r.planta === p).reduce((a, r) => a + r.m3, 0)
    }
    const total = Object.values(porPlanta).reduce((a, v) => a + v, 0)
    if (total > 0 || !esDomingo(d)) dias.push({ iso, porPlanta, total })
  }
  return { dias, fuente: usarPP ? 'proyecciones_planta' : 'order_price', metaGeneralVacia: pp.length > 0 && pp.every(r => num(r.proyectado_diario_general) === 0) }
})

// ---------------------------------------------------------------- Histórico del año
const historico = computed(() => {
  const meses = [...new Set(pc.value.filter(r => r.mes.startsWith(String(anio.value)) && r.mes <= mesIso.value).map(r => r.mes))].sort()
  return meses.map(m => {
    const filas = pc.value.filter(r => r.mes === m)
    const ps = ordenar(new Set(filas.map(r => r.planta)))
    const res = ps.map(p => resumenPlanta(p, filas))
    return { mes: Number(m.slice(5, 7)), meta: res.reduce((a, r) => a + r.meta, 0), real: res.reduce((a, r) => a + r.real, 0) }
  })
})

// ---------------------------------------------------------------- Producción por vehículo
interface Veh { mixer: string; viajes: number; m3: number; dias: number; hoyM3: number; porPlanta: Record<string, number>; plantaPpal: string; conductores: number }
const vehiculos = computed<Veh[]>(() => {
  const g = new Map<string, { viajes: number; m3: number; dias: Set<string>; hoyM3: number; porPlanta: Record<string, number>; cond: Set<string> }>()
  for (const r of remMes.value) {
    const k = r.mixer || 'SIN MIXER'
    const o = g.get(k) ?? { viajes: 0, m3: 0, dias: new Set(), hoyM3: 0, porPlanta: {}, cond: new Set() }
    o.viajes++; o.m3 += r.m3; o.dias.add(r.iso); o.porPlanta[r.planta] = (o.porPlanta[r.planta] ?? 0) + r.m3
    if (r.iso === corteIso.value) o.hoyM3 += r.m3
    if (r.conductor) o.cond.add(r.conductor)
    g.set(k, o)
  }
  return [...g.entries()].map(([mixer, o]) => ({
    mixer, viajes: o.viajes, m3: o.m3, dias: o.dias.size, hoyM3: o.hoyM3, porPlanta: o.porPlanta, conductores: o.cond.size,
    plantaPpal: Object.entries(o.porPlanta).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—',
  })).sort((a, b) => b.m3 - a.m3)
})
const conductores = computed(() => {
  const g = new Map<string, { viajes: number; m3: number; mixers: Set<string> }>()
  for (const r of remMes.value) {
    const k = r.conductor || 'Sin conductor'
    const o = g.get(k) ?? { viajes: 0, m3: 0, mixers: new Set() }
    o.viajes++; o.m3 += r.m3; if (r.mixer) o.mixers.add(r.mixer)
    g.set(k, o)
  }
  return [...g.entries()].map(([nombre, o]) => ({ nombre, viajes: o.viajes, m3: o.m3, mixers: o.mixers.size })).sort((a, b) => b.m3 - a.m3)
})
const V = computed(() => ({
  viajes: sumBy(vehiculos.value, 'viajes'), m3: sumBy(vehiculos.value, 'm3'), hoyM3: sumBy(vehiculos.value, 'hoyM3'),
  activosHoy: vehiculos.value.filter(v => v.hoyM3 > 0).length,
}))
const kpisVeh = computed<KpiDef[]>(() => {
  const v = V.value, vs = vehiculos.value, n = vs.filter(x => x.mixer !== 'SIN MIXER').length
  const diasOp = new Set(remMes.value.map(r => r.iso)).size
  const detVeh = (f: (p: string) => string) => ordenar(new Set(remMes.value.map(r => r.planta))).map(p =>
    `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p)}'></span><span class='kpi-label-int' style='color:#3B82F6;min-width:92px'>${p}</span> <strong>${f(p)}</strong></div>`).join('')
  const porPl = (p: string) => remMes.value.filter(r => r.planta === p)
  return [
    { label: 'Mixers Activos', value: String(n), accent: '#1D4ED8', icon: 'truck', meta: `${v.activosHoy} hoy`, detail: detVeh(p => String(new Set(porPl(p).map(r => r.mixer).filter(Boolean)).size)) },
    { label: 'Viajes del Mes', value: fmtN(v.viajes, 0), accent: '#8B5CF6', icon: 'list', meta: `${diasOp} días`, detail: detVeh(p => fmtN(porPl(p).length, 0)) },
    { label: 'm³ por Viaje', value: fmtN(v.viajes ? v.m3 / v.viajes : 0) + ' m³', accent: '#0EA5E9', icon: 'package', meta: 'carga promedio', detail: detVeh(p => { const r = porPl(p); return fmtN(r.length ? r.reduce((a, x) => a + x.m3, 0) / r.length : 0) }) },
    { label: 'm³ por Mixer', value: fmtN(n ? v.m3 / n : 0) + ' m³', accent: '#172954', icon: 'chart-bar', meta: 'promedio del mes', detail: detVeh(p => { const r = porPl(p); const k = new Set(r.map(x => x.mixer).filter(Boolean)).size; return fmtN(k ? r.reduce((a, x) => a + x.m3, 0) / k : 0) }) },
  ]
})

// ---------------------------------------------------------------- Calidad del dato y conclusiones
const avisos = computed(() => {
  const out: { nivel: string; titulo: string; texto: string }[] = []
  for (const p of sinProy.value) {
    const ult = pc.value.filter(r => r.planta === p).reduce((a, r) => (r.mes > a ? r.mes : a), '')
    out.push({ nivel: 'alto', titulo: `${p} no tiene proyección cargada para ${mesLbl.value}`,
      texto: `La planta lleva ${fmtN(ejecOp(p))} m³ despachados en el mes según order_price, pero no aparece en proyecciones_clientes` +
        (ult ? ` (su última proyección es de ${MESES[Number(ult.slice(5, 7)) - 1]})` : '') + '. Sin la meta no se puede medir su cumplimiento.' })
  }
  const cero = plantas.value.flatMap(p => P.value[p].clientes.filter(c => c.real === 0 && c.meta > 0).map(c => ({ p, c })))
  if (cero.length) out.push({ nivel: 'medio', titulo: `${cero.length} ${cero.length === 1 ? 'cliente proyectado sin' : 'clientes proyectados sin'} ningún despacho en el mes`,
    texto: cero.map(({ p, c }) => `${titulo(c.cliente)} (${titulo(c.obra)}, ${p}): ${fmtN(c.meta, 0)} m³`).join('; ') +
      `. Suman ${fmtN(cero.reduce((a, x) => a + x.c.meta, 0), 0)} m³ de meta sin avance.` })
  if (diario.value.metaGeneralVacia) out.push({ nivel: 'medio', titulo: 'Meta diaria general sin cargar',
    texto: `En proyecciones_planta el campo proyectado_diario_general está en 0 todos los días del mes. La meta diaria se calcula como meta del mes ÷ ${diasOpMes.value} días operativos (${fmtN(metaDiaria.value)} m³/día).` })
  for (const p of plantas.value) if (P.value[p].meta && P.value[p].real === 0)
    out.push({ nivel: 'medio', titulo: `${p}: meta de ${fmtN(P.value[p].meta, 0)} m³ sin despachos`, texto: 'No hay despachos de la planta en el mes; el cumplimiento queda en 0%.' })
  const sinMixer = remMes.value.filter(r => !r.mixer)
  if (sinMixer.length) out.push({ nivel: 'medio', titulo: `${sinMixer.length} remisiones sin mixer`,
    texto: `Suman ${fmtN(sinMixer.reduce((a, r) => a + r.m3, 0))} m³ que no se pueden asignar a un vehículo en la producción por vehículo.` })
  return out
})

const conclusiones = computed(() => {
  const t = T.value, ps = plantas.value
  const mejor = [...ps].sort((a, b) => P.value[b].cump - P.value[a].cump)[0]
  const peor = [...ps].sort((a, b) => P.value[a].cump - P.value[b].cump)[0]
  const v = vehiculos.value[0], c = conductores.value[0]
  return [
    { titulo: 'Cumplimiento', items: [
      `Meta de ${fmtN(t.meta, 0)} m³ y ${fmtN(t.real)} m³ ejecutados: ${pct(t.cump)} de cumplimiento con ${pct(avance.value, 0)} del mes transcurrido.`,
      t.desv >= 0 ? `Se va ${fmtN(t.desv)} m³ por encima del ritmo esperado.` : `Se va ${fmtN(-t.desv)} m³ por debajo del ritmo; hacen falta ${fmtN(t.diario)} m³ por día hábil en los ${habRest.value} que quedan.`,
      ...(mejor && ps.length > 1 ? [`Mejor avance: ${mejor} (${pct(P.value[mejor].cump)}); menor avance: ${peor} (${pct(P.value[peor].cump)}).`] : []),
    ] },
    { titulo: 'Clientes', items: [`${nCon.value} de ${nCli.value} clientes proyectados ya tienen despachos en el mes.`] },
    { titulo: 'Vehículos', items: [
      `${vehiculos.value.filter(x => x.mixer !== 'SIN MIXER').length} mixers hicieron ${fmtN(V.value.viajes, 0)} viajes con ${fmtN(V.value.m3)} m³ (${fmtN(V.value.viajes ? V.value.m3 / V.value.viajes : 0)} m³ por viaje).`,
      ...(v ? [`Mixer con más producción: ${v.mixer} (${fmtN(v.m3)} m³ en ${v.viajes} viajes).`] : []),
      ...(c ? [`Conductor con más producción: ${titulo(c.nombre)} (${fmtN(c.m3)} m³ en ${c.viajes} viajes).`] : []),
    ] },
  ]
})

const analisisTexto = computed(() => {
  const t = T.value
  const txtPl = plantas.value.map(p => `${p} ${pct(P.value[p].cump)}`).join(', ')
  return `Al corte del <strong>${corteLargo.value}</strong> (día ${dia.value} de ${ultDia.value}, <strong>${pct(avance.value, 0)} del mes</strong>) la proyección de clientes ` +
    `de ${plantas.value.join(', ')} suma una <strong>meta de ${fmtN(t.meta, 0)} m³</strong> y lleva <strong>${fmtN(t.real)} m³ ejecutados</strong>, ` +
    `un cumplimiento de <strong class='${t.cump / avance.value * 100 >= 90 ? 'green' : 'red'}'>${pct(t.cump)}</strong>. El ritmo esperado a esta fecha es de ` +
    `${fmtN(t.esperado)} m³, así que la desviación es de <strong>${sg(t.desv)} m³</strong>. ` +
    (t.falta ? `Para cumplir la meta faltan ${fmtN(t.falta)} m³, es decir ${fmtN(t.diario)} m³ por día en los ${habRest.value} días hábiles que quedan. ` : 'La meta del mes ya se cumplió. ') +
    `Por planta: ${txtPl}. ${nCon.value} de los ${nCli.value} clientes proyectados ya tienen despachos. ` +
    `En el mes trabajaron ${vehiculos.value.filter(x => x.mixer !== 'SIN MIXER').length} mixers con ${fmtN(V.value.viajes, 0)} viajes.`
})

// ---------------------------------------------------------------- Gráficas (ECharts, estilo del informe)
const chCumpRef = ref<HTMLElement | null>(null)
const chMetaRef = ref<HTMLElement | null>(null)
const chAcumRef = ref<HTMLElement | null>(null)
const chDiarioRef = ref<HTMLElement | null>(null)
const chHistRef = ref<HTMLElement | null>(null)
const chMixerRef = ref<HTMLElement | null>(null)
const chCondRef = ref<HTMLElement | null>(null)
const paperRef = ref<HTMLElement | null>(null)
const charts = new Map<string, echarts.ECharts>()
function getChart(key: string, el: HTMLElement | null): echarts.ECharts | null {
  if (!el) return null
  const prev = charts.get(key)
  if (prev && prev.getDom() === el) return prev
  prev?.dispose()
  const c = echarts.init(el, null, { renderer: 'canvas' })
  charts.set(key, c)
  return c
}
const FONT = "'Lato','Segoe UI',Arial,sans-serif"
const base = { animation: false, textStyle: { fontFamily: FONT } }
const leyenda = { top: 0, right: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 8 }
const ejeY = { type: 'value' as const, name: 'm³', nameTextStyle: { color: '#666', fontSize: 9, fontWeight: 'bold' as const },
  axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e0d8ec', type: 'dashed' as const } }, axisLabel: { fontSize: 9 } }
const ejeCat = (data: string[]) => ({ type: 'category' as const, data, axisTick: { show: false }, axisLabel: { fontSize: 9, color: CP, fontWeight: 'bold' as const } })

function renderCharts() {
  nextTick(() => {
    if (!hayDatos.value) return
    const ps = plantas.value, pp = P.value, av = avance.value
    // 1. Cumplimiento % por planta con la marca del avance del mes
    const cu = getChart('cump', chCumpRef.value)
    if (cu) {
      const rev = [...ps].reverse()
      cu.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => pct(v) },
        grid: { top: 24, bottom: 8, left: 110, right: 110 },
        xAxis: { type: 'value', show: false, max: Math.max(100, ...ps.map(p => pp[p].cump)) * 1.05 },
        yAxis: { type: 'category', data: rev, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 11 } },
        series: [{ type: 'bar', barWidth: 20, name: 'Cumplimiento',
          data: rev.map(p => ({ value: +pp[p].cump.toFixed(1), itemStyle: { color: semCol(pp[p].cump / av * 100), borderRadius: 2 } })),
          label: { show: true, position: 'right', fontSize: 10, fontWeight: 'bold', color: CP,
            formatter: (x: any) => `${pct(x.value)} · ${pct(x.value / av * 100, 0)} de lo esperado` },
          markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dashed', color: '#475569' }, data: [{ xAxis: +av.toFixed(1) }],
            label: { formatter: `avance ${pct(av, 0)}`, fontSize: 9, color: '#475569' } } }],
      }, true)
    }
    // 2. Meta, esperado y ejecutado por planta
    const me = getChart('meta', chMetaRef.value)
    if (me) {
      const lbl = (c: string) => ({ show: true, position: 'top' as const, fontSize: 9, color: c, formatter: (x: any) => fmtN(x.value, 0) })
      me.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: leyenda, grid: { top: 30, bottom: 22, left: 44, right: 8 },
        xAxis: ejeCat(ps), yAxis: ejeY,
        series: [
          { name: 'Meta', type: 'bar', barMaxWidth: 26, data: ps.map(p => Math.round(pp[p].meta)), itemStyle: { color: '#cbd5e1' }, label: lbl('#64748b') },
          { name: 'Esperado a la fecha', type: 'bar', barMaxWidth: 26, data: ps.map(p => Math.round(pp[p].esperado)), itemStyle: { color: '#93c5fd' }, label: lbl('#64748b') },
          { name: 'Ejecutado', type: 'bar', barMaxWidth: 26, itemStyle: { color: '#1D4ED8' },
            data: ps.map(p => ({ value: +pp[p].real.toFixed(1), itemStyle: { color: semCol(pp[p].cump / av * 100) } })), label: { ...lbl(CP), fontWeight: 'bold' } },
        ],
      }, true)
    }
    // 3. Avance acumulado vs. meta acumulada + proyección al cierre
    const ac = getChart('acum', chAcumRef.value)
    if (ac) {
      const n = ultDia.value, md = metaDiaria.value
      const porDia = new Map(diario.value.dias.map(d => [Number(d.iso.slice(8, 10)), d.total]))
      let real = 0, meta = 0
      const xs: string[] = [], acReal: (number | null)[] = [], acMeta: number[] = [], acProy: (number | null)[] = []
      const ritmoHab = (() => { let h = 0; for (let d = 1; d <= dia.value; d++) if (!esDomingo(d)) h++; return h ? T.value.real / h : 0 })()
      let proy = 0
      for (let d = 1; d <= n; d++) {
        xs.push(String(d).padStart(2, '0'))
        if (!esDomingo(d)) meta += md
        acMeta.push(+meta.toFixed(1))
        if (d <= dia.value) { real += porDia.get(d) ?? 0; acReal.push(+real.toFixed(1)); acProy.push(d === dia.value ? +real.toFixed(1) : null); proy = real }
        else { acReal.push(null); if (!esDomingo(d)) proy += ritmoHab; acProy.push(+proy.toFixed(1)) }
      }
      ac.setOption({ ...base,
        tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : fmtN(v) + ' m³') },
        legend: { ...leyenda, data: ['Ejecutado acumulado', 'Meta acumulada', 'Proyección al cierre'] },
        grid: { top: 32, bottom: 22, left: 54, right: 90 }, xAxis: { ...ejeCat(xs), boundaryGap: false }, yAxis: ejeY,
        series: [
          { name: 'Ejecutado acumulado', type: 'line', data: acReal, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2.5, color: CP }, itemStyle: { color: CP },
            areaStyle: { color: 'rgba(23,41,84,0.06)' }, label: { show: true, position: 'top', fontSize: 8, color: CP, fontWeight: 'bold',
              formatter: (x: any) => (x.value != null && (x.dataIndex % 5 === 4 || x.dataIndex === dia.value - 1) ? fmtN(x.value, 0) : '') } },
          { name: 'Meta acumulada', type: 'line', data: acMeta, symbol: 'none', lineStyle: { width: 1.5, type: 'dashed', color: '#16a34a' }, itemStyle: { color: '#16a34a' },
            endLabel: { show: true, formatter: (x: any) => 'meta ' + fmtN(x.value, 0), fontSize: 9, color: '#16a34a', fontWeight: 'bold' } },
          { name: 'Proyección al cierre', type: 'line', data: acProy, symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: '#dc2626' }, itemStyle: { color: '#dc2626' },
            endLabel: { show: true, formatter: (x: any) => 'est. ' + fmtN(x.value, 0), fontSize: 9, color: '#dc2626', fontWeight: 'bold' } },
        ],
      }, true)
    }
    // 4. Despacho diario por planta vs. meta diaria
    const di = getChart('diario', chDiarioRef.value)
    if (di) {
      const ds = diario.value.dias
      di.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: { ...leyenda, data: [...ps, 'Meta del día'] }, grid: { top: 32, bottom: 22, left: 44, right: 8 },
        xAxis: ejeCat(ds.map(d => d.iso.slice(8, 10) + '/' + d.iso.slice(5, 7))), yAxis: ejeY,
        series: [
          ...ps.map((p, i) => ({ name: p, type: 'bar', stack: 't', barMaxWidth: 26, data: ds.map(d => +(d.porPlanta[p] ?? 0).toFixed(1)),
            itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [2, 2, 0, 0] : 0 } })),
          { name: 'Total', type: 'bar', stack: 't', data: ds.map(() => 0), tooltip: { show: false },
            label: { show: true, position: 'top', formatter: (x: any) => fmtN(ds[x.dataIndex].total, 0), color: CP, fontSize: 9, fontWeight: 'bold' } },
          { name: 'Meta del día', type: 'line', data: ds.map(d => (esDomingo(Number(d.iso.slice(8, 10))) ? null : +metaDiaria.value.toFixed(1))), symbol: 'none',
            lineStyle: { type: 'dashed', color: '#dc2626', width: 1.4 }, itemStyle: { color: '#dc2626' } },
        ],
      }, true)
    }
    // 5. Histórico meta vs. ejecutado
    const hi = getChart('hist', chHistRef.value)
    if (hi) {
      const hs = historico.value
      hi.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v, 0) + ' m³' },
        legend: leyenda, grid: { top: 30, bottom: 22, left: 50, right: 8 },
        xAxis: ejeCat(hs.map(h => MESES_CORTOS[h.mes - 1])), yAxis: ejeY,
        series: [
          { name: 'Meta', type: 'bar', barMaxWidth: 34, data: hs.map(h => Math.round(h.meta)), itemStyle: { color: '#cbd5e1' },
            label: { show: true, position: 'top', fontSize: 9, color: '#64748b', formatter: (x: any) => fmtN(x.value, 0) } },
          { name: 'Ejecutado', type: 'bar', barMaxWidth: 34, data: hs.map(h => ({ value: Math.round(h.real), itemStyle: { color: semCol(h.meta ? h.real / h.meta * 100 : 0) } })),
            label: { show: true, position: 'top', fontSize: 9, fontWeight: 'bold', color: CP, formatter: (x: any) => `${fmtN(x.value, 0)} (${pct(hs[x.dataIndex].meta ? x.value / hs[x.dataIndex].meta * 100 : 0, 0)})` } },
        ],
      }, true)
    }
    // 6. Producción por mixer (m³ apilados por planta + viajes)
    const mx = getChart('mixer', chMixerRef.value)
    if (mx) {
      const vs = [...top(vehiculos.value, TOPV)].reverse()
      const psV = ordenar(new Set(vs.flatMap(v => Object.keys(v.porPlanta))))
      mx.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: { ...leyenda, data: psV }, grid: { top: 26, bottom: 4, left: 80, right: 130 },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: vs.map(v => v.mixer), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 10 } },
        series: [
          ...psV.map(p => ({ name: p, type: 'bar', stack: 't', barWidth: 14, data: vs.map(v => +(v.porPlanta[p] ?? 0).toFixed(1)), itemStyle: { color: color(p) } })),
          { name: 'Total', type: 'bar', stack: 't', data: vs.map(() => 0), tooltip: { show: false },
            label: { show: true, position: 'right', color: CP, fontSize: 10, fontWeight: 'bold',
              formatter: (x: any) => `${fmtN(vs[x.dataIndex].m3)} m³ · ${vs[x.dataIndex].viajes} viajes` } },
        ],
      }, true)
    }
    // 7. Producción por conductor
    const co = getChart('cond', chCondRef.value)
    if (co) {
      const cs = [...top(conductores.value, TOPV)].reverse()
      co.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        grid: { top: 8, bottom: 4, left: 150, right: 110 }, xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: cs.map(c => titulo(c.nombre)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 10, width: 140, overflow: 'truncate' } },
        series: [{ type: 'bar', barWidth: 14, name: 'm³', data: cs.map(c => +c.m3.toFixed(1)), itemStyle: { color: '#2563eb', borderRadius: 2 },
          label: { show: true, position: 'right', color: CP, fontSize: 10, fontWeight: 'bold', formatter: (x: any) => `${fmtN(x.value)} · ${cs[x.dataIndex].viajes} v.` } }],
      }, true)
    }
  })
}

watch([hayDatos, plantas, corteIso, P, vehiculos, diario], () => renderCharts())
onMounted(async () => { window.addEventListener('resize', onResize); await cargar(); renderCharts() })
onUnmounted(() => { window.removeEventListener('resize', onResize); charts.forEach(c => c.dispose()); charts.clear() })
function onResize() { charts.forEach(c => c.resize()) }

// ---------------------------------------------------------------- PDF (mismo flujo que el Informe Comercial: una sola hoja continua)
const generandoPdf = ref(false)
async function generarInformePdf() {
  const el = paperRef.value
  if (!el || generandoPdf.value) return
  generandoPdf.value = true
  el.classList.add('pdf-capturing')
  try {
    await nextTick()
    onResize()
    renderCharts()
    await new Promise(r => setTimeout(r, 450))
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(el, { scale: 2.4, useCORS: true, backgroundColor: '#ffffff', logging: false,
      height: el.scrollHeight, windowHeight: el.scrollHeight })
    const pageW = 297
    const imgH = (canvas.height * pageW) / canvas.width
    const MAX_MM = 5080
    const nombre = `Informe_Proyeccion_Clientes_${corteIso.value}.pdf`
    if (imgH <= MAX_MM) {
      const pdf = new jsPDF({ unit: 'mm', format: [pageW, imgH], orientation: 'portrait' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH, undefined, 'FAST')
      pdf.save(nombre)
    } else {
      const pxPorTramo = Math.floor((MAX_MM * canvas.width) / pageW)
      let pdf: InstanceType<typeof jsPDF> | null = null
      for (let y = 0; y < canvas.height; y += pxPorTramo) {
        const h = Math.min(pxPorTramo, canvas.height - y)
        const c = document.createElement('canvas')
        c.width = canvas.width; c.height = h
        c.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
        const mm = (h * pageW) / canvas.width
        if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, mm], orientation: 'portrait' })
        else pdf.addPage([pageW, mm])
        pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, pageW, mm, undefined, 'FAST')
      }
      pdf?.save(nombre)
    }
  } catch (e) {
    console.error('[informe-proyeccion] Error generando PDF:', e)
  } finally {
    el.classList.remove('pdf-capturing')
    await nextTick()
    onResize()
    generandoPdf.value = false
  }
}
</script>

<style scoped src="./informe.css"></style>
