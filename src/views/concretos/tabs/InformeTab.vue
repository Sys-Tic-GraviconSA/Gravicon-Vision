<template>
  <div class="informe-tab">
    <!-- Barra superior: fecha de corte + descarga PDF (igual que el informe de Disponibilidad) -->
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte Diario Oficial</span>
        <span class="icb-title">Informe Comercial de Ventas — Concretos</span>
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

    <div v-if="!hayDatos" class="report-nota">No hay remisiones para el mes de la fecha de corte seleccionada.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1 -->
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
            <div class="meta-item"><span>Código:</span> <strong>GRV-INF-{{ corteAnio }}-CONCRETOS-VTAS</strong></div>
            <div class="meta-item page-counter"><span>Pág. 1 de 4</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Comercial de Ventas de Concreto</h1>
          <p class="report-intro">
            Despachos y ventas de concreto de las plantas <strong>{{ plantasTxt }}</strong>. Primero el
            <strong>despacho del día {{ fechaCorta(hoyIso, true) }}</strong>, luego el <strong>acumulado del mes
            (1 al {{ corteDia }} de {{ mesLbl }})</strong> por día, planta, comercial y cliente, y al final el histórico del
            año, el control de calidad del dato y las conclusiones. Fuente: tabla de órdenes con precio (<strong>order_price</strong>).
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis Operativo Directivo</div>
            <div class="zoho-analysis-text" v-html="analisisTexto"></div>
          </div>
        </div>

        <div v-if="datosIncompletos" class="report-nota alerta">
          <strong>Datos incompletos:</strong> la tabla tiene {{ fmtN(totalCount ?? 0, 0) }} remisiones y la app recibió
          {{ fmtN(rows.length, 0) }}. Las cifras de este informe pueden quedar por debajo de lo real.
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Despacho del día — {{ fechaCorta(hoyIso, true) }}</h3>
          <p class="section-note">Datos cargados hasta la hora de generación del informe; si el día no ha terminado, el despacho puede aumentar.</p>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpisDia" :key="k.label" :label="k.label" :value="k.value" :accent="k.accent" :icon="k.icon" :meta="k.meta" :detail="k.detail" />
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Indicadores del mes — {{ mesLbl }} (1 al {{ corteDia }})</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpisMes" :key="k.label" :label="k.label" :value="k.value" :accent="k.accent" :icon="k.icon" :meta="k.meta" :detail="k.detail" />
          </div>
          <div v-if="M.cierre < M.prevTotalM3" class="report-nota alerta">
            <strong>Ritmo por debajo de {{ mesPrevLbl }}:</strong> para igualar los {{ fmtN(M.prevTotalM3, 0) }} m³ de {{ mesPrevLbl }}
            hacen falta {{ fmtN(M.faltaDia, 0) }} m³ por día en los {{ M.diasRestantes }} días operativos que quedan
            (hoy el promedio es {{ fmtN(M.ritmo, 0) }} m³/día).
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe Comercial de Ventas de Concreto — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 1 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 2: DESPACHO DEL MES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Despacho diario por planta — {{ mesLbl }}</h3>
          <div ref="chDiarioRef" class="echart" style="height: 340px"></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Detalle de despacho por día — {{ mesLbl }}</h3>
          <p class="section-note">Total m³ en verde cuando el día supera el promedio del mes ({{ fmtN(M.ritmo) }} m³) y en rojo cuando queda por debajo.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr>
                <th>Día</th>
                <th v-for="p in plantas" :key="p" class="r">{{ p }} m³</th>
                <th class="r">Total m³</th><th class="r">Remisiones</th><th class="r">Clientes</th>
                <th class="r">Venta sin IVA</th><th class="r">$ / m³ (con serv.)</th><th class="r">m³ acumulado</th><th class="r">Venta acumulada</th>
              </tr></thead>
              <tbody>
                <tr v-for="d in diario" :key="d.iso" :class="{ hoy: d.iso === hoyIso }">
                  <td class="bold accent-text">{{ fechaCorta(d.iso) }}</td>
                  <td v-for="p in plantas" :key="p" class="r">{{ d.porPlanta[p] ? fmtN(d.porPlanta[p]) : '—' }}</td>
                  <td class="r bold" :class="d.m3 >= M.ritmo ? 'green' : 'red'">{{ fmtN(d.m3) }}</td>
                  <td class="r">{{ d.rem }}</td><td class="r">{{ d.clientes }}</td>
                  <td class="r bold">{{ cop(d.venta) }}</td><td class="r">{{ cop(d.venta / d.m3) }}</td>
                  <td class="r">{{ fmtN(d.acumM3) }}</td><td class="r">{{ cop(d.acumVenta) }}</td>
                </tr>
                <tr class="table-total-row">
                  <td class="bold">TOTAL MES</td>
                  <td v-for="p in plantas" :key="p" class="r">{{ fmtN(P[p].m3) }}</td>
                  <td class="r bold">{{ fmtN(M.m3) }}</td><td class="r">{{ M.rem }}</td><td class="r">{{ M.clientes }}</td>
                  <td class="r bold">{{ cop(M.venta) }}</td><td class="r">{{ cop(M.venta / M.m3) }}</td>
                  <td class="r">{{ fmtN(M.m3) }}</td><td class="r">{{ cop(M.venta) }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>
        <footer class="report-footer">
          <span>Informe Comercial de Ventas de Concreto — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 2 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 3: RESULTADOS COMERCIALES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Volumen y venta por planta — {{ mesLbl }}</h3>
          <div class="fila-charts">
            <div ref="chPlantasRef" class="echart" style="flex: 1.9; height: 250px"></div>
            <div ref="chDonaRef" class="echart" style="flex: 0.9; height: 250px"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Matriz comercial por planta — {{ mesLbl }}</h3>
          <p class="section-note">
            Precio m³: valor del concreto ÷ m³ de concreto (sin servicios ni agregados). Desc. lista: diferencia frente al precio de lista
            en las remisiones que lo tienen. Cierre est.: m³ ÷ {{ M.diasOp }} días operativos × {{ M.diasOpMes }}.
            Vs. {{ mesPrevLbl }}: mismo rango de días (1 al {{ corteDia }}).
          </p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr>
                <th>Planta</th><th class="r">m³</th><th class="r">Part.</th><th class="r">Venta sin IVA</th><th class="r">Remisiones</th>
                <th class="r">Clientes</th><th class="r">Precio m³</th><th class="r">Desc. lista</th><th class="r">Cierre est.</th><th class="r">Vs. {{ mesPrevLbl }}</th>
              </tr></thead>
              <tbody>
                <tr v-for="p in plantas" :key="p">
                  <td class="bold accent-text">{{ p }}</td><td class="r bold">{{ fmtN(P[p].m3) }}</td>
                  <td class="r">{{ pct(P[p].m3 / M.m3 * 100) }}</td><td class="r bold">{{ cop(P[p].venta) }}</td>
                  <td class="r">{{ P[p].rem }}</td><td class="r">{{ P[p].clientes }}</td><td class="r">{{ cop(P[p].precio) }}</td>
                  <td class="r" :class="{ red: (P[p].desc ?? 0) > 3 }">{{ P[p].desc === null ? '—' : pct(P[p].desc ?? 0) }}</td>
                  <td class="r">{{ fmtN(P[p].cierre, 0) }}</td>
                  <td class="r"><span class="pill" :class="(P[p].varPrev ?? 0) >= 0 ? 'p-verde' : 'p-rojo'">{{ P[p].varPrev === null ? '—' : pct(P[p].varPrev ?? 0, 1, true) }}</span></td>
                </tr>
                <tr class="table-total-row">
                  <td class="bold">TOTAL CONCRETOS</td><td class="r bold">{{ fmtN(M.m3) }}</td><td class="r">100%</td>
                  <td class="r bold">{{ cop(M.venta) }}</td><td class="r">{{ M.rem }}</td><td class="r">{{ M.clientes }}</td>
                  <td class="r">{{ cop(M.precio) }}</td><td class="r">{{ M.desc === null ? '—' : pct(M.desc ?? 0) }}</td><td class="r">{{ fmtN(M.cierre, 0) }}</td>
                  <td class="r"><span class="pill" :class="(M.varPrev ?? 0) >= 0 ? 'p-verde' : 'p-rojo'">{{ M.varPrev === null ? '—' : pct(M.varPrev ?? 0, 1, true) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Gestión por comercial — {{ mesLbl }}</h3>
          <div class="data-card"><div class="table-wrap">
              <table>
                <thead><tr>
                  <th>Comercial</th><th v-for="p in plantas" :key="p" class="r">{{ p }}</th>
                  <th class="r">Total m³</th><th class="r">Part.</th><th class="r">Venta</th><th class="r">Remisiones</th>
                </tr></thead>
                <tbody>
                  <tr v-for="c in comerciales" :key="c.nombre" :class="{ alerta: c.sinAsignar }">
                    <td class="bold accent-text">{{ c.nombre }}</td>
                    <td v-for="p in plantas" :key="p" class="r">{{ c.porPlanta[p] ? fmtN(c.porPlanta[p]) : '—' }}</td>
                    <td class="r bold">{{ fmtN(c.m3) }}</td><td class="r">{{ pct(c.m3 / M.m3 * 100) }}</td>
                    <td class="r bold">{{ cop(c.venta) }}</td><td class="r">{{ c.rem }}</td>
                  </tr>
                  <tr class="table-total-row">
                    <td class="bold">TOTAL</td><td v-for="p in plantas" :key="p" class="r">{{ fmtN(P[p].m3) }}</td>
                    <td class="r bold">{{ fmtN(M.m3) }}</td><td class="r">100%</td><td class="r bold">{{ cop(M.venta) }}</td><td class="r">{{ M.rem }}</td>
                  </tr>
                </tbody>
              </table>
          </div></div>
          <div ref="chComercialRef" class="echart" style="height: 200px"></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Clientes y obras por planta — {{ mesLbl }} (top {{ TOP }})</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr>
                <th>Planta</th><th class="idx-col">#</th><th>Cliente / obra</th><th class="r">Remisiones</th><th class="r">m³</th>
                <th class="r">Venta</th><th class="r">$ / m³</th><th class="r">Part. planta</th>
              </tr></thead>
              <tbody>
                <template v-for="g in clientesPorPlanta" :key="g.planta">
                  <tr v-for="(c, i) in g.top" :key="g.planta + c.cliente">
                    <td v-if="i === 0" :rowspan="g.top.length + (g.resto ? 1 : 0)" class="bold accent-text grp">{{ g.planta }}</td>
                    <td class="idx">{{ i + 1 }}</td>
                    <td><span class="bold">{{ c.cliente }}</span><br /><span class="sub">{{ c.obras }}</span></td>
                    <td class="r">{{ c.rem }}</td><td class="r bold">{{ fmtN(c.m3) }}</td><td class="r bold">{{ cop(c.venta) }}</td>
                    <td class="r">{{ cop(c.venta / c.m3) }}</td><td class="r">{{ pct(c.m3 / P[g.planta].m3 * 100) }}</td>
                  </tr>
                  <tr v-if="g.resto">
                    <td class="idx">—</td><td class="muted"><em>Otros {{ g.resto.n }} clientes (placas y obras menores)</em></td>
                    <td class="r">{{ g.resto.rem }}</td><td class="r">{{ fmtN(g.resto.m3) }}</td><td class="r">{{ cop(g.resto.venta) }}</td>
                    <td class="r">{{ cop(g.resto.venta / g.resto.m3) }}</td><td class="r">{{ pct(g.resto.m3 / P[g.planta].m3 * 100) }}</td>
                  </tr>
                  <tr class="subtotal">
                    <td colspan="3">SUBTOTAL {{ g.planta.toUpperCase() }}</td><td class="r">{{ P[g.planta].rem }}</td>
                    <td class="r">{{ fmtN(P[g.planta].m3) }}</td><td class="r">{{ cop(P[g.planta].venta) }}</td>
                    <td class="r">{{ cop(P[g.planta].venta / P[g.planta].m3) }}</td><td class="r">100%</td>
                  </tr>
                </template>
                <tr class="table-total-row">
                  <td class="bold" colspan="3">TOTAL GENERAL</td><td class="r">{{ M.rem }}</td><td class="r bold">{{ fmtN(M.m3) }}</td>
                  <td class="r bold">{{ cop(M.venta) }}</td><td class="r">{{ cop(M.venta / M.m3) }}</td><td class="r"></td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="charts-grid cols-2 align-start">
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Servicios de bombeo — {{ mesLbl }}</h3>
            <div class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th>Planta</th><th>Servicio</th><th class="r">Remisiones</th><th class="r">m³</th><th class="r">% del vol.</th><th class="r">Valor</th><th class="r">$ / m³</th></tr></thead>
                <tbody>
                  <template v-for="g in bombeo.grupos" :key="g.planta">
                    <tr v-for="(s, i) in g.items" :key="g.planta + s.nombre">
                      <td v-if="i === 0" :rowspan="g.items.length" class="bold accent-text grp">{{ g.planta }}</td>
                      <td class="bold">{{ s.nombre }}</td><td class="r">{{ s.rem }}</td><td class="r">{{ fmtN(s.m3) }}</td>
                      <td class="r">{{ pct(s.m3 / P[g.planta].m3 * 100) }}</td><td class="r bold">{{ cop(s.total) }}</td>
                      <td class="r">{{ cop(s.total / s.m3) }}</td>
                    </tr>
                  </template>
                  <tr class="table-total-row">
                    <td class="bold" colspan="2">TOTAL BOMBEO</td><td class="r">{{ bombeo.rem }}</td><td class="r">{{ fmtN(bombeo.m3) }}</td>
                    <td class="r">{{ pct(bombeo.m3 / M.m3 * 100) }}</td><td class="r bold">{{ cop(bombeo.total) }}</td>
                    <td class="r">{{ cop(bombeo.m3 ? bombeo.total / bombeo.m3 : 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div></div>
          </div>
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Mezclas con mayor volumen — {{ mesLbl }}</h3>
            <div class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th class="idx-col">#</th><th>Mezcla</th><th class="r">m³</th><th class="r">Part.</th></tr></thead>
                <tbody>
                  <tr v-for="(m, i) in mezclas" :key="m.mezcla">
                    <td class="idx">{{ i + 1 }}</td><td class="bold accent-text mono">{{ m.mezcla }}</td>
                    <td class="r bold">{{ fmtN(m.m3) }}</td><td class="r">{{ pct(m.m3 / M.m3 * 100) }}</td>
                  </tr>
                </tbody>
              </table>
            </div></div>
          </div>
        </div>
        <footer class="report-footer">
          <span>Informe Comercial de Ventas de Concreto — Gravicon</span>
          <span>Documento Oficial<span class="fp-num"> | Página 3 de 4</span></span>
        </footer>
      </div>

      <!-- ============================================== PÁGINA 4: HISTÓRICO Y CIERRE -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Histórico mensual de despacho {{ corteAnio }} — m³ por planta</h3>
          <p class="section-note">{{ mesLblCap }} va con {{ M.diasOp }} de {{ M.diasOpMes }} días operativos; la marca roja es el cierre estimado del mes.</p>
          <div ref="chMensualRef" class="echart" style="height: 320px"></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — {{ mesLbl }}</h3>
          <div v-if="!avisos.length" class="report-nota">No se encontraron remisiones con datos a revisar en el periodo.</div>
          <div class="avisos">
            <div v-for="a in avisos" :key="a.titulo" class="aviso" :class="a.nivel">
              <span class="ico">!</span><div><b>{{ a.titulo }}</b>{{ a.texto }}</div>
            </div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo — {{ mesLbl }}</h3>
          <div class="data-card" style="padding: 10px 14px">
            <template v-for="(g, gi) in conclusiones" :key="g.titulo">
              <div class="concl-head" :style="{ marginTop: gi > 0 ? '10px' : '0' }">{{ g.titulo }}</div>
              <ul class="res"><li v-for="(l, i) in g.items" :key="i">{{ l }}</li></ul>
            </template>
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe Comercial de Ventas de Concreto — Gravicon</span>
          <span>Documento Oficial · Generado {{ generado }}<span class="fp-num"> | Página 4 de 4</span></span>
        </footer>
      </div>
    </div>
  </div>
</template>

/**
 * InformeTab.vue — Informe Comercial de Ventas de Concreto (reporte diario oficial).
 * Mismo formato que el informe de Disponibilidad: hojas A4 en pantalla y PDF continuo de una sola hoja.
 * Todo se calcula en el cliente a partir de las filas de order_price que ya carga useConcretoStore.
 */
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { serialToDate } from '../../../utils/dates'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'

echarts.use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent, LabelLayout])

const props = defineProps<{
  /** Filas de order_price ya filtradas por planta/comercial (sin filtro de fechas) */
  rows: Record<string, unknown>[]
  /** Fecha fin del filtro global (YYYY-MM-DD); se usa como corte por defecto */
  corte?: string
  /** Total de remisiones en la tabla, para avisar si la carga vino incompleta */
  totalCount?: number
}>()

// ---------------------------------------------------------------- Utilidades
const TOP = 10
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const ORDEN_PLANTAS = ['Villavicencio', 'Acacías', 'Restrepo', 'Puerto Concordia']
const COLORES: Record<string, string> = { 'Villavicencio': '#172954', 'Acacías': '#2563eb', 'Restrepo': '#93c5fd', 'Puerto Concordia': '#10b981' }
const PALETA_EXTRA = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']
const CP = '#172954'
const RE_AGREGADO = /^(CA |CG\d)/

function fmtN(n: number, d = 1): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function cop(n: number): string { return '$ ' + fmtN(n, 0) }
function pct(n: number, d = 1, signo = false): string { return (signo && n > 0 ? '+' : '') + fmtN(n, d) + '%' }
function isoDe(serial: number): string { return serialToDate(serial).toISOString().slice(0, 10) }
function fechaCorta(iso: string, largo = false): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return `${DIAS_SEM[dt.getUTCDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${largo ? '/' + y : ''}`
}
function nombrePlanta(v: unknown): string {
  const s = String(v ?? '').replace(/^Planta\s+/i, '').trim()
  return /^acacias$/i.test(s) ? 'Acacías' : s || 'Sin planta'
}
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function color(p: string): string {
  return COLORES[p] ?? PALETA_EXTRA[Math.abs([...p].reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETA_EXTRA.length]
}

// ---------------------------------------------------------------- Normalización
interface Rem {
  iso: string; planta: string; cliente: string; proyecto: string; comercial: string; mezcla: string
  m3: number; precio: number; lista: number; totalConc: number
  servicio: string; servM3: number; servPrecio: number; servTotal: number; subtotal: number; agregado: boolean
}
const todas = computed<Rem[]>(() => props.rows
  .filter(r => typeof r['Fecha'] === 'number' && r['Fecha'])
  .map(r => {
    const mezcla = String(r['Mezcla'] ?? '').trim()
    return {
      iso: isoDe(r['Fecha'] as number),
      planta: nombrePlanta(r['Planta']),
      cliente: String(r['Cliente'] ?? '').trim() || 'Sin cliente',
      proyecto: String(r['Proyecto'] ?? '').trim(),
      comercial: String(r['Comercial'] ?? '').trim(),
      mezcla,
      m3: num(r['Cant. Concreto']),
      precio: num(r['Precio Concreto']),
      lista: num(r['Lista Concreto']),
      totalConc: num(r['Total Concreto']),
      servicio: String(r['Servicio'] ?? '').trim(),
      servM3: num(r['Cant. Servicio']),
      servPrecio: num(r['Precio Servicio']),
      servTotal: num(r['Total Servicio']),
      subtotal: num(r['Subtotal']),
      agregado: RE_AGREGADO.test(mezcla),
    }
  }))

const fechaMin = computed(() => todas.value.reduce((a, r) => (r.iso < a ? r.iso : a), '9999-12-31'))
const fechaMax = computed(() => todas.value.reduce((a, r) => (r.iso > a ? r.iso : a), ''))
const corteSel = ref('')
watch(() => [props.corte, fechaMax.value], () => {
  const c = props.corte && props.corte <= fechaMax.value ? props.corte : fechaMax.value
  corteSel.value = c
}, { immediate: true })

const corteIso = computed(() => corteSel.value || fechaMax.value)
const corteAnio = computed(() => Number(corteIso.value.slice(0, 4)))
const corteMes = computed(() => Number(corteIso.value.slice(5, 7)))
const corteDia = computed(() => Number(corteIso.value.slice(8, 10)))
const mesLbl = computed(() => `${MESES[corteMes.value - 1]} ${corteAnio.value}`)
const mesLblCap = computed(() => mesLbl.value.charAt(0).toUpperCase() + mesLbl.value.slice(1))
const prevYM = computed(() => (corteMes.value === 1 ? { y: corteAnio.value - 1, m: 12 } : { y: corteAnio.value, m: corteMes.value - 1 }))
const mesPrevLbl = computed(() => MESES[prevYM.value.m - 1])
const corteLargo = computed(() => `${corteDia.value} de ${mesLbl.value.replace(' ', ' de ')}`)
const generado = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

function ym(y: number, m: number) { return `${y}-${String(m).padStart(2, '0')}` }
const delMes = computed(() => {
  const pref = ym(corteAnio.value, corteMes.value)
  return todas.value.filter(r => r.iso.startsWith(pref) && r.iso <= corteIso.value)
})
const hayDatos = computed(() => delMes.value.length > 0)
const datosIncompletos = computed(() => !!props.totalCount && props.totalCount > props.rows.length)

const plantas = computed(() => {
  const vol = new Map<string, number>()
  for (const r of delMes.value) vol.set(r.planta, (vol.get(r.planta) ?? 0) + r.m3)
  return [...vol.keys()].sort((a, b) => {
    const ia = ORDEN_PLANTAS.indexOf(a), ib = ORDEN_PLANTAS.indexOf(b)
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    return (vol.get(b) ?? 0) - (vol.get(a) ?? 0)
  })
})
const plantasTxt = computed(() => {
  const p = plantas.value
  return p.length > 1 ? p.slice(0, -1).join(', ') + ' y ' + p[p.length - 1] : p[0] ?? ''
})

// ---------------------------------------------------------------- Agregados del mes
interface Acum { m3: number; venta: number; rem: number; conc: number; concM3: number; servM3: number; servTotal: number; realLista: number; valLista: number; clientes: Set<string> }
function acumular(rs: Rem[]): Acum {
  const a: Acum = { m3: 0, venta: 0, rem: 0, conc: 0, concM3: 0, servM3: 0, servTotal: 0, realLista: 0, valLista: 0, clientes: new Set() }
  for (const r of rs) {
    a.m3 += r.m3; a.venta += r.subtotal; a.rem++; a.clientes.add(r.cliente)
    if (!r.agregado) { a.conc += r.totalConc; a.concM3 += r.m3 }
    if (r.servicio) { a.servM3 += r.servM3; a.servTotal += r.servTotal }
    if (r.lista > 0) { a.realLista += r.totalConc; a.valLista += r.lista * r.m3 }
  }
  return a
}

function diasOperativosMes(y: number, m: number): number {
  const ult = new Date(Date.UTC(y, m, 0)).getUTCDate()
  let n = 0
  for (let d = 1; d <= ult; d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0) n++
  return n
}

const prevMesRows = computed(() => {
  const { y, m } = prevYM.value
  const ult = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const hasta = `${ym(y, m)}-${String(Math.min(corteDia.value, ult)).padStart(2, '0')}`
  const pref = ym(y, m)
  const completo = todas.value.filter(r => r.iso.startsWith(pref))
  return { corte: completo.filter(r => r.iso <= hasta), completo }
})

const M = computed(() => {
  const a = acumular(delMes.value)
  const diasOp = new Set(delMes.value.map(r => r.iso)).size
  const diasOpMes = diasOperativosMes(corteAnio.value, corteMes.value)
  const ritmo = diasOp ? a.m3 / diasOp : 0
  const cierre = ritmo * diasOpMes
  const prev = acumular(prevMesRows.value.corte)
  const prevTotal = acumular(prevMesRows.value.completo)
  const diasRestantes = Math.max(diasOpMes - diasOp, 0)
  return {
    m3: a.m3, venta: a.venta, rem: a.rem, clientes: a.clientes.size,
    precio: a.concM3 ? a.conc / a.concM3 : 0,
    desc: a.valLista ? (1 - a.realLista / a.valLista) * 100 : null,
    servM3: a.servM3, servTotal: a.servTotal,
    diasOp, diasOpMes, ritmo, cierre, diasRestantes,
    prevM3: prev.m3, prevVenta: prev.venta, prevTotalM3: prevTotal.m3,
    varPrev: prev.m3 ? (a.m3 / prev.m3 - 1) * 100 : null,
    varPrevVenta: prev.venta ? (a.venta / prev.venta - 1) * 100 : null,
    faltaDia: diasRestantes ? Math.max(prevTotal.m3 - a.m3, 0) / diasRestantes : 0,
  }
})

const P = computed(() => {
  const out: Record<string, ReturnType<typeof porPlanta>> = {}
  for (const p of plantas.value) out[p] = porPlanta(p)
  return out
})
function porPlanta(p: string) {
  const a = acumular(delMes.value.filter(r => r.planta === p))
  const prev = acumular(prevMesRows.value.corte.filter(r => r.planta === p))
  const prevTotal = acumular(prevMesRows.value.completo.filter(r => r.planta === p))
  const ritmo = M.value.diasOp ? a.m3 / M.value.diasOp : 0
  return {
    m3: a.m3, venta: a.venta, rem: a.rem, clientes: a.clientes.size,
    precio: a.concM3 ? a.conc / a.concM3 : 0,
    desc: a.valLista ? (1 - a.realLista / a.valLista) * 100 : null,
    servM3: a.servM3, servTotal: a.servTotal,
    ritmo, cierre: ritmo * M.value.diasOpMes,
    prevM3: prev.m3, prevTotalM3: prevTotal.m3,
    varPrev: prev.m3 ? (a.m3 / prev.m3 - 1) * 100 : null,
  }
}

// ---------------------------------------------------------------- Día de corte
const diasConDatos = computed(() => [...new Set(todas.value.filter(r => r.iso <= corteIso.value).map(r => r.iso))].sort())
const hoyIso = computed(() => diasConDatos.value[diasConDatos.value.length - 1] ?? corteIso.value)
const ayerIso = computed(() => diasConDatos.value[diasConDatos.value.length - 2] ?? '')
function delDia(iso: string, p?: string) { return acumular(todas.value.filter(r => r.iso === iso && (!p || r.planta === p))) }

// Desglose por planta dentro de la KpiCard (mismo patrón Int/Ext del informe de OT)
function detalle(valores: (p: string) => string, extra?: (p: string) => string): string {
  return plantas.value.map(p => {
    const e = extra ? ` <span style='color:var(--text-tertiary);font-size:10px'>${extra(p)}</span>` : ''
    return `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color(p)}'></span>` +
      `<span class='kpi-label-int' style='color:#3B82F6;min-width:92px'>${p}</span> <strong>${valores(p)}</strong>${e}</div>`
  }).join('')
}
function varTxt(a: number, b: number) { return b ? pct((a / b - 1) * 100, 1, true) : '—' }
const verdeRojo = (v: number | null) => ((v ?? 0) >= 0 ? '#16A34A' : '#DC2626')

interface KpiDef { label: string; value: string; accent: string; icon: string; meta?: string; detail?: string }
const kpisDia = computed<KpiDef[]>(() => {
  const h = delDia(hoyIso.value), a = delDia(ayerIso.value)
  const vsAyer = a.m3 ? (h.m3 / a.m3 - 1) * 100 : null
  const vsProm = M.value.ritmo ? (h.m3 / M.value.ritmo - 1) * 100 : null
  const hp = (p: string) => delDia(hoyIso.value, p)
  const ap = (p: string) => delDia(ayerIso.value, p)
  return [
    { label: 'm³ Despachados Hoy', value: fmtN(h.m3), accent: '#1D4ED8', icon: 'package', meta: 'día',
      detail: detalle(p => fmtN(hp(p).m3), p => `(${pct(h.m3 ? hp(p).m3 / h.m3 * 100 : 0)})`) },
    { label: 'Venta del Día', value: cop(h.venta), accent: '#2563EB', icon: 'dollar', meta: 'antes de IVA', detail: detalle(p => cop(hp(p).venta)) },
    { label: 'Remisiones del Día', value: String(h.rem), accent: '#8B5CF6', icon: 'list', meta: 'viajes', detail: detalle(p => String(hp(p).rem)) },
    { label: `Vs. ${fechaCorta(ayerIso.value)}`, value: vsAyer === null ? '—' : pct(vsAyer, 1, true), accent: verdeRojo(vsAyer), icon: 'clock',
      meta: `${fmtN(a.m3)} m³`, detail: detalle(p => varTxt(hp(p).m3, ap(p).m3)) },
    { label: `m³ ${fechaCorta(ayerIso.value)}`, value: fmtN(a.m3), accent: '#64748B', icon: 'activity', meta: 'día anterior', detail: detalle(p => fmtN(ap(p).m3)) },
    { label: 'Promedio Diario Mes', value: fmtN(M.value.ritmo), accent: '#0EA5E9', icon: 'trending-up', meta: `${M.value.diasOp} días`, detail: detalle(p => fmtN(P.value[p].ritmo)) },
    { label: 'Vs. Promedio Diario', value: vsProm === null ? '—' : pct(vsProm, 1, true), accent: verdeRojo(vsProm), icon: 'target',
      meta: `prom. ${fmtN(M.value.ritmo)} m³`, detail: detalle(p => varTxt(hp(p).m3, P.value[p].ritmo)) },
    { label: 'Acumulado Mes', value: fmtN(M.value.m3) + ' m³', accent: '#172954', icon: 'chart-bar', meta: `1 al ${corteDia.value}`, detail: detalle(p => fmtN(P.value[p].m3)) },
  ]
})

const kpisMes = computed<KpiDef[]>(() => {
  const m = M.value, pp = P.value
  return [
    { label: 'm³ Despachados', value: fmtN(m.m3), accent: '#1D4ED8', icon: 'package', meta: `${fmtN(m.rem, 0)} remisiones`,
      detail: detalle(p => fmtN(pp[p].m3), p => `(${pct(pp[p].m3 / m.m3 * 100)})`) },
    { label: 'Venta sin IVA', value: cop(m.venta), accent: '#2563EB', icon: 'dollar', meta: 'antes de IVA', detail: detalle(p => cop(pp[p].venta)) },
    { label: 'Precio Concreto m³', value: cop(m.precio), accent: '#172954', icon: 'target', meta: m.desc === null ? 'sin lista' : `${pct(m.desc)} bajo lista`,
      detail: detalle(p => cop(pp[p].precio), p => (pp[p].desc === null ? '' : `(${pct(pp[p].desc as number)})`)) },
    { label: 'Clientes Activos', value: String(m.clientes), accent: '#10B981', icon: 'users', meta: 'sin repetir', detail: detalle(p => String(pp[p].clientes)) },
    { label: 'Promedio Diario', value: fmtN(m.ritmo) + ' m³', accent: '#64748B', icon: 'activity', meta: `${m.diasOp} de ${m.diasOpMes} días`, detail: detalle(p => fmtN(pp[p].ritmo)) },
    { label: 'Cierre Estimado', value: fmtN(m.cierre, 0) + ' m³', accent: m.cierre < m.prevTotalM3 ? '#F59E0B' : '#16A34A', icon: 'trending-up',
      meta: `${mesPrevLbl.value.slice(0, 3)}: ${fmtN(m.prevTotalM3, 0)}`, detail: detalle(p => fmtN(pp[p].cierre, 0), p => `(${mesPrevLbl.value.slice(0, 3)} ${fmtN(pp[p].prevTotalM3, 0)})`) },
    { label: `Vs. ${mesPrevLbl.value} (1–${corteDia.value})`, value: m.varPrev === null ? '—' : pct(m.varPrev, 1, true), accent: verdeRojo(m.varPrev), icon: 'clock',
      meta: `${fmtN(m.prevM3, 0)} m³`, detail: detalle(p => (pp[p].varPrev === null ? '—' : pct(pp[p].varPrev as number, 1, true)), p => `(${fmtN(pp[p].prevM3, 0)} m³)`) },
    { label: 'Con Bombeo', value: pct(m.m3 ? m.servM3 / m.m3 * 100 : 0), accent: '#1D4ED8', icon: 'truck', meta: cop(m.servTotal),
      detail: detalle(p => pct(pp[p].m3 ? pp[p].servM3 / pp[p].m3 * 100 : 0), p => `(${cop(pp[p].servTotal)})`) },
  ]
})

// ---------------------------------------------------------------- Tablas
const diario = computed(() => {
  const dias = [...new Set(delMes.value.map(r => r.iso))].sort()
  let acumM3 = 0, acumVenta = 0
  return dias.map(iso => {
    const rs = delMes.value.filter(r => r.iso === iso)
    const a = acumular(rs)
    acumM3 += a.m3; acumVenta += a.venta
    const porPlanta: Record<string, number> = {}
    for (const r of rs) porPlanta[r.planta] = (porPlanta[r.planta] ?? 0) + r.m3
    return { iso, m3: a.m3, rem: a.rem, clientes: a.clientes.size, venta: a.venta, porPlanta, acumM3, acumVenta }
  })
})

const comerciales = computed(() => {
  const map = new Map<string, { nombre: string; sinAsignar: boolean; m3: number; venta: number; rem: number; porPlanta: Record<string, number> }>()
  for (const r of delMes.value) {
    const k = r.comercial || 'Sin asignar'
    const e = map.get(k) ?? { nombre: k === 'Sin asignar' ? k : titulo(k), sinAsignar: !r.comercial, m3: 0, venta: 0, rem: 0, porPlanta: {} }
    e.m3 += r.m3; e.venta += r.subtotal; e.rem++
    e.porPlanta[r.planta] = (e.porPlanta[r.planta] ?? 0) + r.m3
    map.set(k, e)
  }
  return [...map.values()].sort((a, b) => Number(a.sinAsignar) - Number(b.sinAsignar) || b.m3 - a.m3)
})
function titulo(s: string) { return s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) }

const clientesPorPlanta = computed(() => plantas.value.map(p => {
  const map = new Map<string, { cliente: string; obras: Set<string>; m3: number; venta: number; rem: number }>()
  for (const r of delMes.value.filter(x => x.planta === p)) {
    const e = map.get(r.cliente) ?? { cliente: r.cliente, obras: new Set<string>(), m3: 0, venta: 0, rem: 0 }
    if (r.proyecto) e.obras.add(r.proyecto)
    e.m3 += r.m3; e.venta += r.subtotal; e.rem++
    map.set(r.cliente, e)
  }
  const lista = [...map.values()].sort((a, b) => b.m3 - a.m3).map(c => ({ ...c, obras: [...c.obras].join(' / ') }))
  const resto = lista.slice(TOP)
  return {
    planta: p,
    top: lista.slice(0, TOP),
    resto: resto.length ? { n: resto.length, m3: sum(resto, 'm3'), venta: sum(resto, 'venta'), rem: sum(resto, 'rem') } : null,
  }
}))
function sum<T>(arr: T[], k: keyof T): number { return arr.reduce((a, x) => a + (x[k] as unknown as number), 0) }

const bombeo = computed(() => {
  const grupos = plantas.value.map(p => {
    const map = new Map<string, { nombre: string; rem: number; m3: number; total: number }>()
    for (const r of delMes.value.filter(x => x.planta === p && x.servicio)) {
      const e = map.get(r.servicio) ?? { nombre: titulo(r.servicio), rem: 0, m3: 0, total: 0 }
      e.rem++; e.m3 += r.servM3; e.total += r.servTotal
      map.set(r.servicio, e)
    }
    return { planta: p, items: [...map.values()].sort((a, b) => b.total - a.total) }
  }).filter(g => g.items.length)
  const items = grupos.flatMap(g => g.items)
  return { grupos, rem: sum(items, 'rem'), m3: sum(items, 'm3'), total: sum(items, 'total') }
})

const mezclas = computed(() => {
  const map = new Map<string, number>()
  for (const r of delMes.value) if (r.mezcla) map.set(r.mezcla, (map.get(r.mezcla) ?? 0) + r.m3)
  return [...map.entries()].map(([mezcla, m3]) => ({ mezcla, m3 })).sort((a, b) => b.m3 - a.m3).slice(0, 8)
})

const mensual = computed(() => {
  const out: { mes: number; porPlanta: Record<string, number>; total: number }[] = []
  for (let m = 1; m <= corteMes.value; m++) {
    const pref = ym(corteAnio.value, m)
    const rs = todas.value.filter(r => r.iso.startsWith(pref) && r.iso <= corteIso.value)
    const porPlanta: Record<string, number> = {}
    for (const r of rs) porPlanta[r.planta] = (porPlanta[r.planta] ?? 0) + r.m3
    out.push({ mes: m, porPlanta, total: rs.reduce((a, r) => a + r.m3, 0) })
  }
  return out
})
const promMensualPrevio = computed(() => {
  const prev = mensual.value.slice(0, -1).filter(m => m.total > 0)
  return prev.length ? prev.reduce((a, m) => a + m.total, 0) / prev.length : 0
})

// ---------------------------------------------------------------- Calidad del dato y conclusiones
const avisos = computed(() => {
  const rs = delMes.value
  const out: { nivel: string; titulo: string; texto: string }[] = []
  const serv100 = rs.filter(r => r.servicio && r.servPrecio > 0 && r.servPrecio <= 100)
  if (serv100.length) {
    const clientes = [...new Set(serv100.map(r => titulo(r.cliente)))]
    const m3 = sum(serv100, 'servM3')
    out.push({ nivel: 'alto', titulo: `${serv100.length} remisiones con bombeo facturado a $ 100`,
      texto: `${clientes.join(', ')} · ${fmtN(m3)} m³ bombeados. Si es una condición pactada conviene dejarla registrada; si no, es servicio sin cobrar.` })
  }
  const sinCom = rs.filter(r => !r.comercial)
  if (sinCom.length) {
    out.push({ nivel: 'alto', titulo: `${sinCom.length} remisiones sin comercial asignado`,
      texto: `${fmtN(sum(sinCom, 'm3'))} m³ (${pct(sum(sinCom, 'm3') / M.value.m3 * 100)} del volumen) y ${cop(sum(sinCom, 'subtotal'))} de venta sin responsable comercial.` })
  }
  const sinLista = rs.filter(r => !r.agregado && r.lista <= 0)
  if (sinLista.length) {
    out.push({ nivel: 'medio', titulo: `${sinLista.length} remisiones sin precio de lista`, texto: 'Quedan por fuera del cálculo de descuento frente a lista.' })
  }
  const agr = rs.filter(r => r.agregado)
  if (agr.length) {
    const pls = [...new Set(agr.map(r => r.planta))].join(', ')
    out.push({ nivel: 'medio', titulo: `Agregados registrados como concreto (${pls})`,
      texto: `${agr.length} remisiones de arena y grava (${fmtN(sum(agr, 'm3'), 0)} m³) aparecen en el campo de concreto; se excluyeron del precio promedio por m³.` })
  }
  const conc100 = rs.filter(r => !r.agregado && r.precio > 0 && r.precio <= 100)
  if (conc100.length) {
    out.push({ nivel: 'medio', titulo: `${conc100.length} remisiones de concreto a $ 100/m³`,
      texto: `${[...new Set(conc100.map(r => titulo(r.cliente)))].join(', ')}. Si es consumo interno conviene marcarlo para que no afecte los promedios.` })
  }
  return out
})

const conclusiones = computed(() => {
  const m = M.value, pp = P.value, ps = plantas.value
  const top3 = clientesPorPlanta.value.flatMap(g => g.top).sort((a, b) => b.m3 - a.m3).slice(0, 3)
  const mayorDesc = ps.filter(p => pp[p].desc !== null).sort((a, b) => (pp[b].desc as number) - (pp[a].desc as number))[0]
  const lider = comerciales.value.find(c => !c.sinAsignar)
  const cierreVsPrev = m.prevTotalM3 ? (m.cierre / m.prevTotalM3 - 1) * 100 : null
  return [
    { titulo: 'Volumen y ritmo', items: [
      `Se llevan ${fmtN(m.m3)} m³ despachados y ${cop(m.venta)} de venta sin IVA en ${m.diasOp} días operativos.`,
      `El cierre estimado es de ${fmtN(m.cierre, 0)} m³` + (cierreVsPrev === null ? '.' : `, ${pct(Math.abs(cierreVsPrev))} ${cierreVsPrev < 0 ? 'por debajo' : 'por encima'} de ${mesPrevLbl.value} (${fmtN(m.prevTotalM3, 0)} m³).`),
      `Frente a ${mesPrevLbl.value} al mismo corte: ` + ps.map(p => `${p} ${pp[p].varPrev === null ? '—' : pct(pp[p].varPrev as number, 1, true)}`).join(', ') + '.',
    ] },
    { titulo: 'Precio y mezcla comercial', items: [
      `Precio promedio del concreto: ${cop(m.precio)}/m³` + (m.desc === null ? '.' : `, ${pct(m.desc)} por debajo de la lista.`),
      ...(mayorDesc ? [`${mayorDesc} concede el mayor descuento (${pct(pp[mayorDesc].desc as number)}) con un precio de ${cop(pp[mayorDesc].precio)}/m³.`] : []),
      `El ${pct(m.m3 ? m.servM3 / m.m3 * 100 : 0)} del volumen salió con servicio de bombeo, que suma ${cop(m.servTotal)}.`,
    ] },
    { titulo: 'Clientes y gestión', items: [
      `Los tres clientes principales (${top3.map(c => titulo(c.cliente)).join(', ')}) concentran ${pct(sum(top3, 'm3') / m.m3 * 100)} del volumen.`,
      ...(lider ? [`${lider.nombre} gestiona el ${pct(lider.m3 / m.m3 * 100)} del volumen del mes.`] : []),
      ...avisos.value.filter(a => a.nivel === 'alto').map(a => `Revisar: ${a.titulo.toLowerCase()}.`),
    ] },
  ]
})

const analisisTexto = computed(() => {
  const m = M.value, pp = P.value, ps = plantas.value
  const lider = [...ps].sort((a, b) => pp[b].m3 - pp[a].m3)[0]
  const crecen = ps.filter(p => (pp[p].varPrev ?? 0) > 0)
  const cls = (v: number | null) => ((v ?? 0) >= 0 ? 'green' : 'red')
  return `Al corte del <strong>${corteLargo.value}</strong> las plantas ${plantasTxt.value} despacharon <strong>${fmtN(m.m3)} m³</strong> en ` +
    `<strong>${fmtN(m.rem, 0)} remisiones</strong> a ${m.clientes} clientes, con una venta antes de IVA de <strong>${cop(m.venta)}</strong> ` +
    `y un precio promedio del concreto de <strong>${cop(m.precio)}/m³</strong>` + (m.desc === null ? '. ' : ` (${pct(m.desc)} por debajo del precio de lista). `) +
    (m.varPrev === null ? '' : `Frente al mismo corte de ${mesPrevLbl.value} el volumen va <strong class='${cls(m.varPrev)}'>${pct(m.varPrev, 1, true)}</strong>` +
      (m.varPrevVenta === null ? '. ' : ` y la venta ${pct(m.varPrevVenta, 1, true)}. `)) +
    `Al ritmo de ${fmtN(m.ritmo)} m³ por día operativo el mes cerraría en unos <strong>${fmtN(m.cierre, 0)} m³</strong>` +
    (m.prevTotalM3 ? `, frente a ${fmtN(m.prevTotalM3, 0)} m³ de ${mesPrevLbl.value}` : '') +
    (promMensualPrevio.value ? ` y un promedio mensual de ${fmtN(promMensualPrevio.value, 0)} m³ en lo corrido del año` : '') + '. ' +
    (lider ? `${lider} aporta el ${pct(pp[lider].m3 / m.m3 * 100)} del volumen` : '') +
    (crecen.length ? `; ${crecen.length === 1 ? crecen[0] + ' es la única planta que crece' : crecen.join(', ') + ' crecen'} frente a ${mesPrevLbl.value}.` : '.')
})

// ---------------------------------------------------------------- Gráficas (ECharts, estilo del informe)
const chDiarioRef = ref<HTMLElement | null>(null)
const chPlantasRef = ref<HTMLElement | null>(null)
const chDonaRef = ref<HTMLElement | null>(null)
const chComercialRef = ref<HTMLElement | null>(null)
const chMensualRef = ref<HTMLElement | null>(null)
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

function renderCharts() {
  nextTick(() => {
    const ps = plantas.value
    // 1. Despacho diario apilado + total del día + promedio
    const d = getChart('diario', chDiarioRef.value)
    if (d) {
      const dias = diario.value
      const promLbl = `Promedio ${fmtN(M.value.ritmo)} m³/día`
      d.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: { ...leyenda, data: [...ps, promLbl] },
        grid: { top: 32, bottom: 24, left: 44, right: 8 },
        xAxis: { type: 'category', data: dias.map(x => x.iso.slice(8, 10) + '/' + x.iso.slice(5, 7)), axisTick: { show: false }, axisLabel: { fontSize: 9, color: CP, fontWeight: 'bold' } },
        yAxis: ejeY,
        series: [
          ...ps.map((p, i) => ({ name: p, type: 'bar', stack: 't', barMaxWidth: 28, data: dias.map(x => x.porPlanta[p] ?? 0),
            itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [2, 2, 0, 0] : 0 } })),
          { name: 'Total', type: 'bar', stack: 't', data: dias.map(() => 0), tooltip: { show: false },
            label: { show: true, position: 'top', formatter: (x: any) => fmtN(dias[x.dataIndex].m3), color: CP, fontSize: 9, fontWeight: 'bold' } },
          { name: promLbl, type: 'line', data: dias.map(() => +M.value.ritmo.toFixed(1)), symbol: 'none',
            lineStyle: { type: 'dashed', color: '#64748b', width: 1.2 }, itemStyle: { color: '#64748b' } },
        ],
      }, true)
    }
    // 2. m³ y venta por planta
    const pl = getChart('plantas', chPlantasRef.value)
    if (pl) {
      const rev = [...ps].reverse()
      pl.setOption({ ...base,
        tooltip: { trigger: 'item' },
        legend: { ...leyenda, right: 'center' },
        grid: [{ top: 26, bottom: 4, left: 100, width: '30%' }, { top: 26, bottom: 4, left: '58%', width: '26%' }],
        xAxis: [{ gridIndex: 0, show: false }, { gridIndex: 1, show: false }],
        yAxis: [{ gridIndex: 0, type: 'category', data: rev, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 11 } },
                { gridIndex: 1, type: 'category', data: rev, show: false }],
        series: [
          { name: 'm³ despachados', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, barWidth: 22, itemStyle: { color: CP },
            data: rev.map(p => ({ value: +P.value[p].m3.toFixed(2), itemStyle: { color: color(p), borderRadius: 2 } })),
            label: { show: true, position: 'right', formatter: (x: any) => fmtN(x.value) + ' m³', fontSize: 10, fontWeight: 'bold', color: CP } },
          { name: 'Venta sin IVA ($)', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, barWidth: 22, itemStyle: { color: '#16a34a', borderRadius: 2 },
            data: rev.map(p => Math.round(P.value[p].venta)),
            label: { show: true, position: 'right', formatter: (x: any) => cop(x.value), fontSize: 10, fontWeight: 'bold', color: '#16a34a' } },
        ],
      }, true)
    }
    // 3. Dona de participación
    const dn = getChart('dona', chDonaRef.value)
    if (dn) {
      const tot = M.value.m3
      dn.setOption({ ...base,
        tooltip: { trigger: 'item', valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: { bottom: 0, left: 'center', orient: 'vertical', itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, fontWeight: 'bold', color: CP },
          formatter: (n: string) => `${n}  ${pct(tot ? (P.value[n]?.m3 ?? 0) / tot * 100 : 0)}` },
        title: { text: fmtN(tot, 0), subtext: 'M³ TOTAL\nPARTICIPACIÓN', left: 'center', top: '28%',
          textStyle: { fontSize: 22, fontWeight: 900, color: CP }, subtextStyle: { fontSize: 8, color: '#666', fontWeight: 'bold', lineHeight: 12 } },
        series: [{ type: 'pie', radius: ['46%', '64%'], center: ['50%', '40%'], label: { show: false },
          data: ps.map(p => ({ name: p, value: +P.value[p].m3.toFixed(2), itemStyle: { color: color(p) } })) }],
      }, true)
    }
    // 4. Comerciales (m³ apilado por planta)
    const cm = getChart('comercial', chComercialRef.value)
    if (cm) {
      const cs = [...comerciales.value].reverse()
      cm.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => fmtN(v) + ' m³' },
        legend: { ...leyenda, data: ps },
        grid: { top: 26, bottom: 4, left: 96, right: 56 },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: cs.map(c => c.nombre), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 10 } },
        series: [
          ...ps.map(p => ({ name: p, type: 'bar', stack: 't', barWidth: 16, data: cs.map(c => +(c.porPlanta[p] ?? 0).toFixed(2)), itemStyle: { color: color(p) } })),
          { name: 'Total', type: 'bar', stack: 't', data: cs.map(() => 0), tooltip: { show: false },
            label: { show: true, position: 'right', formatter: (x: any) => fmtN(cs[x.dataIndex].m3), color: CP, fontSize: 10, fontWeight: 'bold' } },
        ],
      }, true)
    }
    // 5. Histórico mensual + cierre estimado
    const mn = getChart('mensual', chMensualRef.value)
    if (mn) {
      const ms = mensual.value
      const n = ms.length
      mn.setOption({ ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => (v == null ? '—' : fmtN(v, 0) + ' m³') },
        legend: { ...leyenda, data: [...ps, 'Cierre estimado'] },
        grid: { top: 36, bottom: 24, left: 50, right: 8 },
        xAxis: { type: 'category', data: ms.map(m => MESES_CORTOS[m.mes - 1]), axisTick: { show: false }, axisLabel: { fontSize: 10, color: CP, fontWeight: 'bold' } },
        yAxis: ejeY,
        series: [
          ...ps.map((p, i) => ({ name: p, type: 'bar', stack: 't', barMaxWidth: 40, data: ms.map(m => +(m.porPlanta[p] ?? 0).toFixed(2)),
            itemStyle: { color: color(p), borderRadius: i === ps.length - 1 ? [2, 2, 0, 0] : 0 },
            label: { show: true, position: 'inside', formatter: (x: any) => (x.value >= 700 ? fmtN(x.value, 0) : ''), color: color(p) === '#93c5fd' ? CP : '#fff', fontSize: 8, fontWeight: 'bold' } })),
          { name: 'Total', type: 'bar', stack: 't', data: ms.map(() => 0), tooltip: { show: false },
            label: { show: true, position: 'top', formatter: (x: any) => fmtN(ms[x.dataIndex].total, 0), color: CP, fontSize: 9, fontWeight: 'bold' } },
          { name: 'Cierre estimado', type: 'line', data: ms.map((_, i) => (i === n - 1 ? Math.round(M.value.cierre) : null)),
            symbol: 'rect', symbolSize: [30, 2], itemStyle: { color: '#dc2626' },
            label: { show: true, position: 'top', formatter: (x: any) => 'est. ' + fmtN(x.value, 0), color: '#dc2626', fontSize: 9, fontWeight: 'bold' } },
        ],
      }, true)
    }
  })
}

watch([delMes, plantas, corteIso], () => renderCharts())
onMounted(() => { renderCharts(); window.addEventListener('resize', onResize) })
onUnmounted(() => { window.removeEventListener('resize', onResize); charts.forEach(c => c.dispose()); charts.clear() })
function onResize() { charts.forEach(c => c.resize()) }

// ---------------------------------------------------------------- PDF (mismo flujo que Disponibilidad: una sola hoja continua)
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
    const nombre = `Informe_Comercial_Ventas_${corteIso.value}.pdf`
    if (imgH <= MAX_MM) {
      const pdf = new jsPDF({ unit: 'mm', format: [pageW, imgH], orientation: 'portrait' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH, undefined, 'FAST')
      pdf.save(nombre)
    } else {
      // Documento muy largo: se corta en tramos de 5080 mm (límite de jsPDF)
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
    console.error('[informe-comercial] Error generando PDF:', e)
  } finally {
    el.classList.remove('pdf-capturing')
    await nextTick()
    onResize()
    generandoPdf.value = false
  }
}
</script>

<style scoped>
/* Variables en claro dentro del papel: el informe siempre se imprime en blanco, igual en tema oscuro */
.report-paper {
  --navy: #172954; --card-bg: #ffffff; --card-bg-hover: #f1f5f9; --card-border: #e2e8f0; --card-border-hover: #cbd5e1;
  --text-primary: #0f172a; --text-secondary: #475569; --text-tertiary: #64748b; --bg-alt: #f1f5f9;
  --accent-light: rgba(37, 99, 235, 0.06);
  display: flex; flex-direction: column; gap: 24px; align-items: center; width: 100%;
}
.informe-tab { display: flex; flex-direction: column; gap: 16px; }

.informe-control-bar {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  padding: 10px 14px; border: 1px solid var(--card-border); border-radius: var(--radius-md, 10px); background: var(--card-bg);
}
.icb-info { display: flex; flex-direction: column; gap: 2px; }
.icb-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-tertiary); }
.icb-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.icb-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.icb-corte { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.icb-corte input { font: inherit; padding: 5px 8px; border: 1px solid var(--card-border); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); }
.tb-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 12px; font-weight: 600; border-radius: 6px;
  border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer;
}
.tb-btn.primary { background: #172954; color: #fff; border-color: #172954; }
.tb-btn.primary:hover { background: #1e3a8a; border-color: #1e3a8a; }
.tb-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.report-page {
  width: 100%; min-height: 297mm; padding: 12mm 14mm 14mm; background: #fff; color: #1a1a2e;
  border: 1px solid var(--card-border); border-radius: 4px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
  position: relative; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;
  font-family: 'Lato', 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.5;
}
.report-salto-superior { height: 8mm; flex-shrink: 0; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid var(--navy);
  padding-bottom: 10px; position: relative; flex-wrap: wrap; gap: 12px; }
.report-header::after { content: ""; position: absolute; left: 0; bottom: -2.5px; width: 74px; height: 2.5px; background: #a90707; }
.report-header-brand { display: flex; align-items: center; gap: 12px; }
.report-logo { height: 48px; max-width: 190px; object-fit: contain; display: block; }
.report-header-text h2 { font-size: 14px; font-weight: 700; color: var(--navy); margin: 0; }
.report-header-text span { font-size: 12px; color: var(--text-secondary); }
.report-header-meta { text-align: right; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.report-header-meta strong { color: var(--text-primary); }
.page-counter { font-weight: 700; color: var(--navy); }
.report-title-section { text-align: center; margin: 4px 0 12px; width: 100%; }
.report-title-section h1 { font-size: 21px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-primary); margin: 0 0 6px; }
.report-intro { font-size: 12px; color: var(--text-secondary); margin: 6px 0 0; line-height: 1.65; text-align: justify; }
.zoho-analysis-box { background: var(--card-bg-hover); padding: 14px 18px; border-radius: 6px; border-left: 3px solid var(--navy); width: 100%; box-sizing: border-box; }
.zoho-analysis-label { font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
.zoho-analysis-text { font-size: 12px; color: var(--text-secondary); line-height: 1.6; text-align: justify; }
.zoho-analysis-text :deep(strong) { color: var(--text-primary); }
.zoho-analysis-text :deep(.green) { color: #16a34a; }
.zoho-analysis-text :deep(.red) { color: #dc2626; }
.compact-kpi { margin: 4px 0 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; }
/* KpiCard compacta dentro del informe: ícono arriba para que los valores completos quepan */
.compact-kpi :deep(.kpi-card) { flex-direction: column; gap: 8px; padding: 16px 12px 12px; min-height: 108px; }
.compact-kpi :deep(.kpi-value) { font-size: 21px; white-space: nowrap; }
.compact-kpi :deep(.kpi-label) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.compact-kpi :deep(.kpi-detail strong), .compact-kpi :deep(.kpi-detail-row) { white-space: nowrap; }
.report-nota { border-left: 3px solid var(--navy); background: var(--card-bg-hover); padding: 8px 12px; font-size: 12px;
  color: var(--text-primary); border-radius: 0 6px 6px 0; line-height: 1.4; }
.report-nota.alerta { border-left-color: #a90707; background: #fdf1f1; color: #7f1d1d; }
.report-section-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.report-block-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--navy); margin: 0; }
.title-bar { display: inline-block; width: 4px; height: 14px; background: #2563eb; border-radius: 2px; }
.section-note { font-size: 11px; color: var(--text-secondary); margin: 0 0 4px; }
.fila-charts { display: flex; gap: 12px; align-items: center; }
.fila-charts > * { min-width: 0; }
.echart { width: 100%; }
.charts-grid { display: grid; gap: 12px; }
.charts-grid.cols-2 { grid-template-columns: 1.35fr 1fr; }
.charts-grid.align-start { align-items: start; }
.data-card { background: #fff; border: 1px solid var(--card-border); border-radius: 4px; overflow: hidden; }
.concl-head { font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; text-transform: uppercase; }
.table-wrap { width: 100%; overflow-x: auto; }
.table-wrap table { width: 100%; border-collapse: collapse; font-size: 11.5px; color: #1a1a2e; }
.table-wrap th { background: #f8fafc; color: var(--navy); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
  padding: 6px 10px; border-bottom: 1.5px solid var(--card-border); text-align: left; }
.table-wrap td { padding: 5.5px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.table-wrap tr:hover td { background: #f8fafc; }
.table-wrap th.r, .table-wrap td.r { text-align: right; white-space: nowrap; }
.table-wrap tr.alerta td { background: #fdf1f1; }
.table-wrap tr.alerta td:first-child { box-shadow: inset 3px 0 0 #a90707; }
.table-wrap tr.hoy td { background: #eff6ff; }
.table-wrap tr.hoy td:first-child { box-shadow: inset 3px 0 0 #2563eb; }
td.grp { vertical-align: middle; border-right: 1px solid var(--card-border); background: rgba(43, 34, 86, 0.03); }
tr.subtotal td { background: rgba(43, 34, 86, 0.06); font-weight: 700; border-bottom: 2px solid #cbd5e1; color: var(--navy); }
.table-total-row td { white-space: nowrap; background: #f1f5f9 !important; font-weight: 700 !important; border-top: 2px solid #cbd5e1 !important; }
.idx-col, .idx { width: 24px; text-align: center; color: var(--text-secondary); }
.bold { font-weight: 700; }
.accent-text { color: var(--navy); }
.red { color: #dc2626; }
.green { color: #16a34a; }
.muted { color: var(--text-secondary); }
.sub { font-size: 10.5px; color: var(--text-secondary); }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; }
.pill { display: inline-block; padding: 1.5px 7px; border-radius: 9px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.avisos { display: flex; flex-direction: column; gap: 6px; }
.aviso { display: flex; gap: 9px; padding: 7px 9px; border-radius: 3px; font-size: 12px; line-height: 1.45; border: 1px solid var(--card-border); color: #1a1a2e; }
.aviso.alto { background: #fdf1f1; border-color: #f0d3d3; }
.aviso.medio { background: #fbf6e9; border-color: #eee0be; }
.aviso b { display: block; margin-bottom: 1px; }
.aviso .ico { font-weight: 700; color: #a90707; }
.aviso.medio .ico { color: #b8860b; }
ul.res { margin: 6px 0 0; padding-left: 0; list-style: none; }
ul.res li { position: relative; padding: 5px 0 5px 15px; font-size: 12px; line-height: 1.5; border-bottom: 1px solid #f0f2f5; color: #1a1a2e; }
ul.res li::before { content: "■"; position: absolute; left: 0; top: 4px; color: var(--navy); font-size: 7pt; }
.report-footer { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--card-border); display: flex; justify-content: space-between;
  font-size: 12px; color: var(--text-tertiary); font-weight: 500; }

/* Captura PDF: documento continuo de 297 mm de ancho (igual que generarInformePdf de Disponibilidad) */
.pdf-capturing.report-paper { gap: 0 !important; width: 1123px !important; }
.pdf-capturing .report-page { min-height: 0 !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
  padding-top: 6mm !important; padding-bottom: 6mm !important; }
.pdf-capturing .report-salto-superior { display: none !important; }
.pdf-capturing .report-page:not(:last-child) .report-footer { display: none !important; }
.pdf-capturing .fp-num, .pdf-capturing .page-counter { display: none !important; }
.pdf-capturing .table-wrap { overflow: visible !important; }
.pdf-capturing .table-wrap th, .pdf-capturing .table-wrap td { font-size: 10px !important; padding: 4px 6px !important; }

@media (max-width: 1100px) {
  .compact-kpi { grid-template-columns: repeat(2, 1fr); }
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
  .fila-charts { flex-direction: column; align-items: stretch; }
  .fila-charts > * { flex: none !important; width: 100%; }
}
@media (max-width: 640px) {
  .compact-kpi { grid-template-columns: 1fr; }
  .report-page { padding: 6mm 4mm; }
}
</style>
