<template>
  <div class="informe-tab">
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte diario · Novasoft</span>
        <span class="icb-title">Informe Comercial de Ventas de Agregados — {{ planta }}</span>
      </div>
      <div class="icb-actions">
        <label class="icb-corte">
          Corte
          <select v-model="corteSel">
            <option v-for="f in fechasVenta.slice().reverse()" :key="f" :value="f">{{ fechaCorta(f, true) }}</option>
          </select>
        </label>
        <button class="tb-btn primary" :disabled="!hayDatos || generando" @click="pdf">
          <svg v-if="!generando" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ generando ? 'Generando PDF…' : 'Descargar PDF' }}
        </button>
      </div>
    </div>

    <div v-if="!hayDatos" class="report-nota">No hay ventas con los filtros seleccionados.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1: DÍA Y MES -->
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/Logo-Gravicon-Nuevo.png" alt="Gravicon" class="report-logo" loading="eager" />
            <div class="report-header-text">
              <h2>Comercial Agregados Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Agregados {{ planta }}</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div><span>Corte:</span> <strong>{{ fechaLarga(corte) }}</strong></div>
            <div><span>Código:</span> <strong>GRV-INF-{{ corte.slice(0, 4) }}-AGR-{{ codigoPlanta }}-FACT</strong></div>
            <div class="page-counter"><span>Pág. 1 de 3</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Comercial de Ventas de Agregados</h1>
          <p class="report-intro">
            Ventas de agregados de la planta <strong>{{ planta }}</strong> (sucursal {{ sucursal }}). Primero el
            <strong>despacho del día {{ fechaCorta(corte, true) }}</strong>, luego el <strong>acumulado del mes (1 al {{ Number(corte.slice(8)) }} de {{ mesLbl }})</strong>
            por día, familia, material y cliente, y al final donaciones, traslados, calidad del dato y conclusiones.
            Todo en toneladas: lo registrado en m³ se convierte con el factor de cada material.
            Fuente: facturación Novasoft (<strong>{{ archivo.nombre }}</strong>).
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis operativo</div>
            <div class="zoho-analysis-text" v-html="analisis"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Despacho del día — {{ fechaCorta(corte, true) }}</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpisDia" :key="k.label" v-bind="k" />
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Indicadores del mes — {{ mesLbl }} (1 al {{ Number(corte.slice(8)) }})</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard v-for="k in kpisMes" :key="k.label" v-bind="k" />
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Toneladas por producto — {{ fechaCorta(corte, true) }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Registrado en</th><th class="r">Cantidad registrada</th><th class="r">Factor</th><th class="r">t vendidas</th><th class="r">t traslados</th><th class="r">t despachadas</th></tr></thead>
              <tbody>
                <tr v-for="p in tonDia" :key="p.producto">
                  <td class="bold">{{ nombreMaterial(p.producto) }}</td><td>{{ p.registrado }}</td><td class="r">{{ t(p.cantidad) }}</td><td class="r muted">{{ p.factor }}</td>
                  <td class="r">{{ t(p.tVendidas) }}</td><td class="r">{{ p.tTraslados ? t(p.tTraslados) : '—' }}</td><td class="r bold">{{ t(p.tDespachadas) }}</td>
                </tr>
              </tbody>
              <tfoot><tr class="table-total-row"><td colspan="4">Total del día</td><td class="r">{{ t(D.tVendidas) }}</td><td class="r">{{ t(D.tTraslados) }}</td><td class="r">{{ t(D.tDespachadas) }}</td></tr></tfoot>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 1 de 3</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 2: MES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Detalle de despacho por día — {{ mesLbl }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Día</th><th v-for="f in famsMes" :key="f" class="r">{{ f }}</th><th class="r">Venta del día</th><th class="r">t vendidas</th><th class="r">t traslados</th><th class="r">Remisiones</th><th class="r">Clientes</th><th class="r">Venta acumulada</th></tr></thead>
              <tbody>
                <tr v-for="d in diasMes" :key="d.fecha" :class="{ hoy: d.fecha === corte }">
                  <td class="bold">{{ fechaCorta(d.fecha) }}</td>
                  <td v-for="f in famsMes" :key="f" class="r">{{ d.porFamilia[f] ? cop(d.porFamilia[f]!) : '—' }}</td>
                  <td class="r bold">{{ cop(d.venta) }}</td><td class="r">{{ t(d.tVendidas) }}</td><td class="r">{{ d.tTraslados ? t(d.tTraslados) : '—' }}</td>
                  <td class="r">{{ d.remisiones }}</td><td class="r">{{ d.clientes }}</td><td class="r">{{ cop(d.acumulado) }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Matriz comercial por familia — {{ mesLbl }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Familia</th><th class="r">Toneladas</th><th class="r">Venta</th><th class="r">Part.</th><th class="r">Remisiones</th><th class="r">Clientes</th><th class="r">Precio prom. /t</th><th class="r">Venta {{ fechaCorta(corte) }}</th></tr></thead>
              <tbody>
                <tr v-for="f in familiasMes" :key="f.familia">
                  <td class="bold"><span class="dot" :style="{ background: COLOR_FAMILIA[f.familia] }"></span>{{ f.familia }}</td>
                  <td class="r">{{ f.t ? t(f.t) : '—' }}</td><td class="r bold">{{ cop(f.venta) }}</td><td class="r">{{ pct(f.part) }}</td>
                  <td class="r">{{ f.remisiones }}</td><td class="r">{{ f.clientes }}</td><td class="r">{{ f.precioT ? cop(f.precioT) : '—' }}</td>
                  <td class="r">{{ cop(ventaDiaFamilia(f.familia)) }}</td>
                </tr>
              </tbody>
              <tfoot><tr class="table-total-row"><td>Total</td><td class="r">{{ t(M.tVendidas) }}</td><td class="r">{{ cop(M.venta) }}</td><td class="r">100%</td><td class="r">{{ M.remisiones }}</td><td class="r">{{ M.clientes }}</td><td class="r">{{ M.precioT ? cop(M.precioT) : '—' }}</td><td class="r">{{ cop(D.venta) }}</td></tr></tfoot>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Ventas por material — {{ mesLbl }}</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Familia</th><th class="r">Líneas</th><th class="r">Cantidad (t)</th><th class="r">Venta</th><th class="r">Part.</th><th class="r">Precio prom. /t</th><th class="r">Rango de precio /t</th></tr></thead>
              <tbody>
                <tr v-for="m in materialesMes" :key="m.producto">
                  <td class="bold">{{ nombreMaterial(m.producto) }}</td><td class="muted">{{ m.familia }}</td><td class="r">{{ m.lineas }}</td><td class="r">{{ t(m.t) }}</td>
                  <td class="r bold">{{ cop(m.venta) }}</td><td class="r">{{ pct(m.part) }}</td><td class="r">{{ m.precioT ? cop(m.precioT) : '—' }}</td>
                  <td class="r muted">{{ m.minT && m.maxT ? (Math.round(m.minT) === Math.round(m.maxT) ? cop(m.minT) : `${cop(m.minT)} – ${cop(m.maxT)}`) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 2 de 3</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 3: CLIENTES, DONACIONES, TRASLADOS, CALIDAD -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Clientes — {{ mesLbl }} (top {{ TOPC }})</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th class="idx">#</th><th>Cliente</th><th>NIT</th><th class="r">Remisiones</th><th class="r">Toneladas</th><th class="r">Venta</th><th class="r">Part.</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in clientesMes.slice(0, TOPC)" :key="c.nit || c.cliente">
                  <td class="idx">{{ i + 1 }}</td><td class="bold">{{ c.cliente }}</td><td class="mono">{{ c.nit || '—' }}</td><td class="r">{{ c.remisiones }}</td>
                  <td class="r">{{ t(c.t) }}</td><td class="r bold">{{ cop(c.venta) }}</td><td class="r">{{ pct(c.part) }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
          <p v-if="clientesMes.length > TOPC" class="section-note">Los otros {{ clientesMes.length - TOPC }} clientes suman {{ cop(clientesMes.slice(TOPC).reduce((a, c) => a + c.venta, 0)) }}.</p>
        </div>

        <div class="charts-grid cols-2 align-start">
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Donaciones — {{ mesLbl }}</h3>
            <div v-if="donacionesMes.length" class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th>Beneficiario</th><th class="r">Documentos</th><th class="r">Toneladas</th><th class="r">Valor</th></tr></thead>
                <tbody><tr v-for="d in donacionesMes" :key="d.nombre"><td class="bold">{{ d.nombre }}</td><td class="r">{{ d.docs }}</td><td class="r">{{ t(d.t) }}</td><td class="r">{{ cop(d.valor) }}</td></tr></tbody>
              </table>
            </div></div>
            <p v-else class="section-note">Sin donaciones en el mes.</p>
          </div>
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Traslados de inventario — {{ mesLbl }}</h3>
            <div v-if="trasladosMes.length" class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th>Material</th><th class="r">Documentos</th><th class="r">Toneladas</th><th class="r">Último</th></tr></thead>
                <tbody><tr v-for="d in trasladosMes" :key="d.nombre"><td class="bold">{{ d.nombre }}</td><td class="r">{{ d.docs }}</td><td class="r">{{ t(d.t) }}</td><td class="r">{{ fechaCorta(d.ultimo) }}</td></tr></tbody>
              </table>
            </div></div>
            <p v-else class="section-note">Sin traslados en el mes.</p>
            <p class="section-note">Subtipo 003: sin valor ni cliente. No suman a la venta, pero sí a las toneladas despachadas.</p>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — {{ mesLbl }}</h3>
          <div v-if="avisos.length" class="avisos">
            <div v-for="a in avisos" :key="a.titulo" class="aviso" :class="a.nivel"><span class="ico">{{ a.nivel === 'bajo' ? 'i' : '!' }}</span><div><b>{{ a.titulo }}</b>{{ a.texto }}</div></div>
          </div>
          <p v-else class="section-note">Sin hallazgos: todas las líneas tienen factor propio, cliente y valor.</p>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo — {{ mesLbl }}</h3>
          <ul class="res"><li v-for="(c, i) in conclusiones" :key="i" v-html="c"></li></ul>
        </div>

        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados — {{ planta }}</span><span>Documento oficial<span class="fp-num"> | Página 3 de 3</span></span></footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionInformeTab.vue — Informe comercial de ventas de agregados (/:planta/facturacion/informe).
 * Misma estructura y reglas que el informe diario de agregados (informes/generador/generar_agregados.py):
 * despacho del día de corte, acumulado del mes hasta el corte, familias, materiales, clientes,
 * donaciones, traslados, calidad del dato y conclusiones. Descarga en PDF continuo de 297 mm.
 */
import { computed, ref, watch } from 'vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { fmtN, cop, pct } from '../../../composables/useGraficasConcreto'
import {
  resumen, porFamilia, porMaterial, porCliente, porDia, toneladasPorProducto, agrupar, cierreEstimado, calidad,
  nombreMaterial, fechaCorta, fechaLarga, COLOR_FAMILIA, COLOR_TIPO, MESES, esVenta, esMaterial,
} from '../../../composables/useFacturacion'
import { descargarInformePdf } from '../../../utils/pdfInforme'
import type { Familia, LineaFacturacion } from '../../../types/facturacion'

const props = defineProps<{
  lineas: LineaFacturacion[]
  planta: string
  plantaId: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  subtipos: Record<string, string>
}>()

const TOPC = 15
const t = (n: number) => fmtN(n, n >= 100 ? 0 : 1)
const codigoPlanta = computed(() => props.planta.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3))

// ── Corte: último día con ventas por defecto ──
const fechasVenta = computed(() => [...new Set(props.lineas.filter(esVenta).map(l => l.fecha))].sort())
const corteSel = ref('')
watch(fechasVenta, f => { if (!f.includes(corteSel.value)) corteSel.value = f.at(-1) ?? '' }, { immediate: true })
const corte = computed(() => corteSel.value || fechasVenta.value.at(-1) || '')
const hayDatos = computed(() => !!corte.value)
const mesLbl = computed(() => (corte.value ? `${MESES[Number(corte.value.slice(5, 7)) - 1]} ${corte.value.slice(0, 4)}` : ''))

const delMes = computed(() => props.lineas.filter(l => l.fecha.startsWith(corte.value.slice(0, 7)) && l.fecha <= corte.value))
const delDia = computed(() => props.lineas.filter(l => l.fecha === corte.value))
const M = computed(() => resumen(delMes.value))
const D = computed(() => resumen(delDia.value))

const diasMes = computed(() => porDia(delMes.value).filter(d => d.venta > 0 || d.tTraslados > 0))
const diasConVenta = computed(() => diasMes.value.filter(d => d.venta > 0))
const promDiario = computed(() => (diasConVenta.value.length ? M.value.venta / diasConVenta.value.length : 0))
const anterior = computed(() => diasConVenta.value.filter(d => d.fecha < corte.value).at(-1) ?? null)
const cierre = computed(() => cierreEstimado(diasConVenta.value, corte.value))

const familiasMes = computed(() => porFamilia(delMes.value))
const famsMes = computed(() => familiasMes.value.map(f => f.familia))
const materialesMes = computed(() => porMaterial(delMes.value))
const clientesMes = computed(() => porCliente(delMes.value))
const tonDia = computed(() => toneladasPorProducto(delDia.value))
const donacionesMes = computed(() => agrupar(delMes.value.filter(l => l.tipo === 'donacion'), 'cliente'))
const trasladosMes = computed(() => agrupar(delMes.value.filter(l => l.tipo === 'traslado'), 'producto'))
const avisos = computed(() => calidad(delMes.value, t, cop))
const ventaDiaFamilia = (f: Familia) => delDia.value.filter(l => esVenta(l) && l.familia === f).reduce((a, l) => a + l.total, 0)

const variacion = (a: number, b: number) => (b ? (a / b - 1) * 100 : null)
const fila = (color: string, label: string, valor: string) =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-label-int' style='color:${color}'>${label}</span> <strong>${valor}</strong></div>`

const kpisDia = computed(() => {
  const d = D.value, a = anterior.value
  const vsAnt = a ? variacion(d.venta, a.venta) : null
  // Con un solo día de venta el promedio es el mismo día: la comparación no aporta
  const vsProm = diasConVenta.value.length > 1 ? variacion(d.venta, promDiario.value) : null
  return [
    { label: 'Venta del Día', value: cop(d.venta), icon: 'dollar', accent: '#3B82F6', meta: d.fletes ? `incluye ${cop(d.fletes)} de fletes` : undefined },
    { label: 'Toneladas del Día', value: `${t(d.tDespachadas)} t`, icon: 'truck', accent: '#15223c',
      detail: fila(COLOR_TIPO.venta, 'Vendidas', `${t(d.tVendidas)} t`) + fila(COLOR_TIPO.traslado, 'Traslados', `${t(d.tTraslados)} t`) },
    { label: 'Remisiones del Día', value: fmtN(d.remisiones, 0), icon: 'list', accent: '#8B5CF6', meta: `${d.clientes} clientes` },
    { label: a ? `Vs. ${fechaCorta(a.fecha)}` : 'Vs. Promedio Diario', value: (a ? vsAnt : vsProm) === null ? '—' : pct((a ? vsAnt : vsProm)!, 1, true),
      icon: 'trending-up', accent: ((a ? vsAnt : vsProm) ?? 0) >= 0 ? '#16A34A' : '#DC2626',
      meta: a ? `${cop(a.venta)} el día anterior` : diasConVenta.value.length > 1 ? `promedio ${cop(promDiario.value)}` : 'único día con venta' },
    { label: 'Donaciones del Día', value: `${t(d.donaciones.t)} t`, icon: 'check-circle', accent: COLOR_TIPO.donacion, meta: `${cop(d.donaciones.valor)} · ${d.donaciones.beneficiarios} beneficiarios` },
    { label: 'Traslados del Día', value: `${t(d.traslados.t)} t`, icon: 'layers', accent: '#64748B', meta: `${d.traslados.docs} documentos` },
    { label: 'Precio Promedio por t', value: d.precioT ? cop(d.precioT) : '—', icon: 'target', accent: '#F59E0B', meta: 'venta de material ÷ t vendidas' },
    { label: 'Venta Acumulada Mes', value: cop(M.value.venta), icon: 'chart-bar', accent: '#10B981', meta: `${diasConVenta.value.length} días con venta` },
  ]
})

const kpisMes = computed(() => {
  const m = M.value
  return [
    { label: 'Venta del Mes', value: cop(m.venta), icon: 'dollar', accent: '#3B82F6',
      detail: familiasMes.value.slice(0, 4).map(f => fila(COLOR_FAMILIA[f.familia], f.familia, cop(f.venta))).join('') },
    { label: 'Toneladas Despachadas', value: `${t(m.tDespachadas)} t`, icon: 'truck', accent: '#15223c',
      detail: fila(COLOR_TIPO.venta, 'Vendidas', `${t(m.tVendidas)} t`) + fila(COLOR_TIPO.traslado, 'Traslados', `${t(m.tTraslados)} t`) },
    { label: 'Remisiones', value: fmtN(m.remisiones, 0), icon: 'list', accent: '#8B5CF6', meta: m.remisiones ? `ticket ${cop(m.venta / m.remisiones)}` : undefined },
    { label: 'Precio Promedio por t', value: m.precioT ? cop(m.precioT) : '—', icon: 'target', accent: '#F59E0B' },
    { label: 'Clientes Activos', value: fmtN(m.clientes, 0), icon: 'users', accent: '#10B981' },
    { label: 'Venta Promedio Diaria', value: cop(promDiario.value), icon: 'activity', accent: '#0EA5E9', meta: `${diasConVenta.value.length} días con venta` },
    { label: 'Cierre Estimado Mes', value: cop(cierre.value.valor), icon: 'clock', accent: '#172954', meta: `${cierre.value.faltan} días por vender al ritmo actual` },
    { label: 'Donaciones y Traslados', value: `${t(m.donaciones.t + m.traslados.t)} t`, icon: 'layers', accent: '#64748B',
      detail: fila(COLOR_TIPO.donacion, 'Donaciones', `${t(m.donaciones.t)} t`) + fila(COLOR_TIPO.traslado, 'Traslados', `${t(m.traslados.t)} t`) },
  ]
})

// ── Textos que salen de los datos ──
const analisis = computed(() => {
  const d = D.value, m = M.value
  const fam = [...porFamilia(delDia.value)].filter(f => f.familia !== 'Fletes').sort((a, b) => b.venta - a.venta)[0]
  const mat = porMaterial(delDia.value)[0]
  const cli = porCliente(delDia.value)[0]
  const partes = [
    `El <strong>${fechaCorta(corte.value, true)}</strong> se vendieron <strong>${cop(d.venta)}</strong> en <strong>${t(d.tVendidas)} t</strong> (${d.remisiones} remisiones a ${d.clientes} clientes)` +
      (d.tTraslados ? `, y se trasladaron ${t(d.tTraslados)} t de inventario, para un despacho total de <strong>${t(d.tDespachadas)} t</strong>.` : '.'),
    fam ? `La familia con más venta fue <strong>${fam.familia}</strong> (${pct(fam.part)} de la venta)${mat ? `, y el material principal <strong>${nombreMaterial(mat.producto)}</strong> con ${t(mat.t)} t` : ''}.` : '',
    cli ? `El principal cliente del día fue <strong>${cli.cliente}</strong> con ${cop(cli.venta)} (${pct(cli.part)}).` : '',
    diasConVenta.value.length > 1
      ? `En el mes van <strong>${cop(m.venta)}</strong> en ${diasConVenta.value.length} días con venta; al ritmo actual el cierre estimado es de <strong>${cop(cierre.value.valor)}</strong>.`
      : `Es el primer día con ventas del mes en el archivo; el acumulado y el cierre estimado se afinan a medida que se cargan más días.`,
  ]
  return partes.filter(Boolean).join(' ')
})

const conclusiones = computed(() => {
  const m = M.value
  const out: string[] = []
  const top3 = clientesMes.value.slice(0, 3)
  if (top3.length) out.push(`Los ${top3.length} principales clientes concentran <strong>${pct(top3.reduce((a, c) => a + c.part, 0))}</strong> de la venta del mes (${top3.map(c => c.cliente).join(', ')}).`)
  const fams = familiasMes.value.filter(f => f.familia !== 'Fletes')
  if (fams.length) out.push(`Por familia: ${fams.map(f => `${f.familia} ${pct(f.part)}${f.precioT ? ` a ${cop(f.precioT)}/t` : ''}`).join(' · ')}.`)
  if (m.fletes) out.push(`Los fletes suman <strong>${cop(m.fletes)}</strong>: se cobran con la venta pero no aportan toneladas.`)
  if (m.traslados.t) out.push(`Los traslados de inventario (${t(m.traslados.t)} t) representan el <strong>${pct(m.tDespachadas ? m.traslados.t / m.tDespachadas * 100 : 0)}</strong> de lo despachado.`)
  if (m.donaciones.docs) out.push(`Se registraron ${m.donaciones.docs} donaciones por ${t(m.donaciones.t)} t (${cop(m.donaciones.valor)}), fuera de la venta.`)
  const conv = delMes.value.filter(l => esVenta(l) && esMaterial(l) && l.registrado === 'm³')
  if (conv.length) out.push(`${conv.length} líneas vinieron registradas en m³ y se convirtieron a toneladas (${t(conv.reduce((a, l) => a + l.toneladas, 0))} t).`)
  if (avisos.value.length) out.push(`Calidad del dato: ${avisos.value.length} ${avisos.value.length === 1 ? 'hallazgo' : 'hallazgos'} para revisar (ver sección anterior).`)
  return out
})

// ── PDF ──
const paperRef = ref<HTMLElement | null>(null)
const generando = ref(false)
async function pdf() {
  if (!paperRef.value || generando.value) return
  generando.value = true
  try {
    await descargarInformePdf(paperRef.value, `Informe_Ventas_Agregados_${props.planta.normalize('NFD').replace(/[^A-Za-z]/g, '')}_${corte.value}.pdf`)
  } catch (e) {
    console.error('[informe-facturacion] Error generando PDF:', e)
  } finally {
    generando.value = false
  }
}
</script>

<style scoped src="../../concretos/tabs/informe.css"></style>
<style scoped>
.icb-corte select { font: inherit; padding: 5px 8px; border: 1px solid var(--card-border); border-radius: 6px; background: var(--card-bg); color: var(--text-primary); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; }
.aviso.bajo { background: #f1f5f9; border-color: #e2e8f0; }
.aviso.bajo .ico { color: #475569; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .aviso.bajo { background: rgba(148, 163, 184, 0.08); border-color: rgba(148, 163, 184, 0.2); }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .aviso.bajo .ico { color: #cbd5e1; }
</style>
