<template>
  <div class="informe-produccion">
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte Oficial de Producción</span>
        <span class="icb-title">Producción {{ config.plantName }} — {{ selectedLabel }}</span>
      </div>
      <div class="icb-actions" style="display:flex; gap:8px; align-items:center;">
        <select v-model="selectedMonthKey" class="month-select">
          <option v-for="m in availableMonths" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
        <button class="tb-btn primary" @click="generarPdf" :disabled="!hasData || generandoPdf">
          <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span v-if="generandoPdf">Generando PDF...</span>
          <span v-else>Descargar PDF</span>
        </button>
      </div>
    </div>

    <div class="report-paper" v-if="hasData">
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/Logo_Gravicon_Azul.png" alt="Gravicon" class="report-logo" />
            <div class="report-header-text">
              <h2>Producción {{ config.plantName }} Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Agregados · {{ selectedLabel }}</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div class="meta-item"><span>Periodo:</span> <strong>{{ selectedLabel }}</strong></div>
            <div class="meta-item"><span>Código:</span> <strong>GRV-INF-PROD-{{ config.plantName.toUpperCase() }}-{{ selectedMonthKey.replace('/','') }}</strong></div>
            <div class="meta-item page-counter"><span>Pág. 1 de 2</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Diario de Producción</h1>
          <p class="report-intro">
            Consolidado operativo de <strong>{{ config.plantName }}</strong> para {{ selectedLabel }}. Volumen neto del mes: <strong>{{ fmt(kpi.total) }} M³</strong> frente a meta mensual de <strong>{{ fmt(kpi.metaMensual) }} M³</strong> y proyectado diario acumulado de <strong>{{ fmt(kpi.proyectado) }} M³</strong>. Cumplimiento meta <strong>{{ kpi.cumplimientoMeta }}</strong> · Proyectado <strong>{{ kpi.cumplimientoProy }}</strong>.
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis Operativo Directivo</div>
            <div class="zoho-analysis-text">{{ textoAnalisis }}</div>
          </div>
        </div>

        <div class="kpi-section">
          <h4 class="kpi-section-title">Producción Total — {{ selectedLabel }}</h4>
          <div class="kpi-row">
            <KpiCard label="Total M³" accent="#3B82F6" icon="chart-bar">{{ fmt(kpi.total) }}</KpiCard>
            <KpiCard v-for="l in config.lines" :key="l.key" :label="l.label" :accent="config.palette[config.lines.indexOf(l)]" icon="layers">{{ fmt(lineTotals[l.key] || 0) }}</KpiCard>
          </div>
        </div>

        <div class="kpi-section">
          <h4 class="kpi-section-title">Proyectado Diario</h4>
          <div class="kpi-row kpi-row-3">
            <KpiCard label="M³ Proyectado" accent="#EC4899" icon="trending-up">{{ fmt(kpi.proyectado) }}</KpiCard>
            <KpiCard label="Diferencia Proy." :accent="kpi.diferenciaProy < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpi.diferenciaProy >= 0 ? '+' : '' }}{{ fmt(kpi.diferenciaProy) }}</KpiCard>
            <KpiCard label="% Cumpl. Proy." accent="#F59E0B" icon="check-circle">{{ kpi.cumplimientoProy }}</KpiCard>
          </div>
        </div>

        <div class="kpi-section">
          <h4 class="kpi-section-title">Meta Mensual</h4>
          <div class="kpi-row kpi-row-3">
            <KpiCard label="Meta Mensual M³" accent="#8B5CF6" icon="target">{{ fmt(kpi.metaMensual) }}</KpiCard>
            <KpiCard label="Diferencia Meta" :accent="kpi.diferenciaMeta < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpi.diferenciaMeta >= 0 ? '+' : '' }}{{ fmt(kpi.diferenciaMeta) }}</KpiCard>
            <KpiCard label="% Cumpl. Meta" accent="#06B6D4" icon="check-circle">{{ kpi.cumplimientoMeta }}</KpiCard>
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe de Producción — Gravicon</span>
          <span>Documento Oficial | Pág. 1 de 2</span>
        </footer>
      </div>

      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Historial de Operación Diaria ({{ selectedLabel }})</h3>
          <div class="data-card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th v-for="l in config.lines" :key="l.key" class="r">{{ l.label }}</th>
                    <th class="r">Total M³</th>
                    <th class="r">Proy. Día</th>
                    <th class="r">Dif. M³</th>
                    <th class="r">% Cump.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in tablaRows" :key="row.Fecha + row['Total de M³']">
                    <td>{{ row.Fecha }}</td>
                    <td v-for="l in config.lines" :key="l.key" class="r">{{ fmt((row as any)[l.key]) }}</td>
                    <td class="r bold">{{ fmt(row['Total de M³']) }}</td>
                    <td class="r">{{ fmt(row['M³ Proyectado']) }}</td>
                    <td class="r" :style="{ color: (row as any)['Diferencia'] >= 0 ? '#218c4d' : '#ef4444', fontWeight: 600 }">{{ fmt((row as any)['Diferencia']) }}</td>
                    <td class="r bold">{{ row['% Cumplimiento'] ? Number(row['% Cumplimiento']).toFixed(1) + '%' : '0.0%' }}</td>
                  </tr>
                  <tr class="table-total-row">
                    <td class="bold">TOTAL</td>
                    <td v-for="l in config.lines" :key="l.key" class="r bold">{{ fmt((totales as any)[l.key] || 0) }}</td>
                    <td class="r bold">{{ fmt(totales['Total de M³']) }}</td>
                    <td class="r bold">{{ fmt(totales['M³ Proyectado']) }}</td>
                    <td class="r bold" :style="{ color: (totales as any)['Diferencia'] >= 0 ? '#218c4d' : '#ef4444' }">{{ fmt((totales as any)['Diferencia']) }}</td>
                    <td class="r bold">{{ totales['% Cumplimiento'] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Comportamiento Operativo</h3>
          <div class="data-card" style="padding:16px;">
            <ChartCard title="" :option="chartOpt" :height="260" />
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe de Producción — Gravicon</span>
          <span>Documento Oficial | Pág. 2 de 2</span>
        </footer>
      </div>
    </div>

    <div v-else class="informe-empty">
      <span class="placeholder-icon">📄</span>
      <span class="placeholder-text">Sin datos para el periodo</span>
      <span class="placeholder-sub">Selecciona un mes con registros</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { serialToDate } from '../../utils/dates'
import { fmt } from '../../utils/format'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import { useTheme } from '../../composables/useTheme'
import type { PlantConfig } from './ResumenTab.vue'

const props = defineProps<{
  config: PlantConfig
  data: Record<string, unknown>[]
}>()

const { theme } = useTheme()
const chartTextColor = computed(() => theme.value === 'light' ? '#475569' : '#94a3b8')

const generandoPdf = ref(false)

const availableMonths = computed(() => {
  const map = new Map<string, { label: string; first: number }>()
  for (const r of props.data) {
    const fecha = Number(r['Fecha'])
    if (!fecha) continue
    const d = serialToDate(fecha)
    const key = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', timeZone: 'UTC' })
    const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    if (!map.has(key)) map.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), first: fecha })
  }
  return [...map.entries()].sort((a,b)=>a[1].first-b[1].first).map(([k,v])=>({ key:k, label:v.label, first:v.first }))
})

const selectedMonthKey = ref('')
watch(availableMonths, (list) => {
  if (list.length) selectedMonthKey.value = list[list.length-1].key
}, { immediate: true })

const selectedLabel = computed(() => availableMonths.value.find(m=>m.key===selectedMonthKey.value)?.label ?? '')

const monthData = computed(() => {
  if (!selectedMonthKey.value) return props.data
  return props.data.filter(r => {
    const fecha = Number(r['Fecha'])
    if (!fecha) return false
    const d = serialToDate(fecha)
    const key = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', timeZone: 'UTC' })
    return key === selectedMonthKey.value
  })
})

const hasData = computed(() => monthData.value.length > 0)

const kpi = computed(() => {
  const rows = monthData.value
  let total = 0, proyectado = 0, metaMensual = 0
  const metaByMonth = new Map<string, number>()
  for (const r of rows) {
    total += Number(r['Total de M³']) || 0
    proyectado += Number(r['M³ Proyectado']) || 0
    const fecha = Number(r['Fecha'])
    if (!fecha) continue
    const d = serialToDate(fecha)
    const key = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', timeZone: 'UTC' })
    if (!metaByMonth.has(key)) metaByMonth.set(key, Number(r['Meta Mensual M³']) || 0)
  }
  for (const v of metaByMonth.values()) metaMensual += v
  const diferenciaMeta = total - metaMensual
  const diferenciaProy = total - proyectado
  const cumplimientoMeta = metaMensual > 0 ? (total / metaMensual * 100) : 0
  const cumplimientoProy = proyectado > 0 ? (total / proyectado * 100) : 0
  return {
    total,
    proyectado,
    metaMensual,
    diferenciaMeta,
    diferenciaProy,
    cumplimientoMeta: cumplimientoMeta.toFixed(1)+'%',
    cumplimientoProy: cumplimientoProy.toFixed(1)+'%',
  }
})

const lineTotals = computed(() => {
  const t: Record<string, number> = {}
  for (const l of props.config.lines) t[l.key] = monthData.value.reduce((s, r) => s + (Number(r[l.key]) || 0), 0)
  return t
})

const textoAnalisis = computed(() => {
  if (!monthData.value.length) return 'Sin datos para el periodo.'
  const totalHoy = monthData.value[monthData.value.length-1]
  const obs = String(totalHoy['Observación'] ?? '')
  let txt = `Consolidado Operativo ${props.config.plantName} — ${selectedLabel.value}: Volumen neto ${fmt(kpi.value.total)} M³ frente a meta mensual ${fmt(kpi.value.metaMensual)} M³. Cumplimiento meta ${kpi.value.cumplimientoMeta} · Proyectado ${kpi.value.cumplimientoProy}.`
  if (obs) txt += ` Observación: ${obs}`
  return txt
})

const tablaRows = computed(() => {
  return monthData.value.map(r => {
    const serial = Number(r['Fecha'])
    const d = serial ? serialToDate(serial) : null
    const fechaStr = d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : ''
    const total = Number(r['Total de M³']) || 0
    const proy = Number(r['M³ Proyectado']) || 0
    return {
      Fecha: fechaStr,
      ...Object.fromEntries(props.config.lines.map(l => [l.key, Number(r[l.key]) || 0])),
      'Total de M³': total,
      'M³ Proyectado': proy,
      'Diferencia': total - proy,
      '% Cumplimiento': r['% Cumplimiento'] ?? 0,
    }
  })
})

const totales = computed(() => {
  const t: Record<string, any> = {}
  for (const l of props.config.lines) t[l.key] = monthData.value.reduce((s, r) => s + (Number(r[l.key]) || 0), 0)
  const totalM3 = monthData.value.reduce((s, r) => s + (Number(r['Total de M³']) || 0), 0)
  const totalProy = monthData.value.reduce((s, r) => s + (Number(r['M³ Proyectado']) || 0), 0)
  t['Total de M³'] = totalM3
  t['M³ Proyectado'] = totalProy
  t['Diferencia'] = totalM3 - totalProy
  t['% Cumplimiento'] = totalProy > 0 ? (totalM3/totalProy*100).toFixed(1)+'%' : '0.0%'
  return t
})

const chartOpt = computed(() => {
  const labels = monthData.value.map(r => {
    const serial = Number(r['Fecha'])
    if (!serial) return ''
    const d = serialToDate(serial)
    return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`
  })
  const total = monthData.value.map(r => Number(r['Total de M³']) || 0)
  return {
    color: ['#2563eb'],
    textStyle: { fontFamily: 'Lato, sans-serif' },
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, bottom: 30, top: 20, containLabel: true },
    xAxis: { type: 'category' as const, data: labels, axisLabel: { color: chartTextColor.value, fontSize: 9 }, axisLine: { show: false } },
    yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: true, lineStyle: { color: '#f1f5f9' } } },
    series: [{ name: 'Producción Total (m³)', type: 'line' as const, smooth: true, data: total, areaStyle: { opacity: 0.08, color: '#2563eb' }, lineStyle: { width: 3, color: '#2563eb' }, symbolSize: 4, itemStyle: { color: '#1d4ed8', borderColor: '#fff', borderWidth: 2 } }],
  }
})

async function generarPdf() {
  if (generandoPdf.value || !hasData.value) return
  generandoPdf.value = true
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 400))
    const elemento = document.querySelector('.informe-produccion .report-paper') as HTMLElement
    if (!elemento) return
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const root = document.documentElement
    const temaPrevio = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('light')
    root.classList.remove('dark')
    await new Promise(r => requestAnimationFrame(() => r(null)))
    try {
      const canvas = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
      const imgW = 210
      const imgH = (canvas.height * imgW) / canvas.width
      const pdf = new (jsPDF as any)({ unit: 'mm', format: [imgW, imgH], orientation: 'portrait' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH, undefined, 'FAST')
      pdf.save(`Produccion_${props.config.plantName}_${selectedLabel.value.replace(/ /g,'_')}.pdf`)
    } finally {
      if (temaPrevio) {
        root.setAttribute('data-theme', temaPrevio)
        if (temaPrevio === 'dark') { root.classList.add('dark'); root.classList.remove('light') }
      }
    }
  } catch (e) { console.error(e) } finally { generandoPdf.value = false }
}
</script>

<style scoped>
.informe-control-bar { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
.icb-info { display:flex; flex-direction:column; }
.icb-tag { font-size:10px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; }
.icb-title { font-size:14px; font-weight:700; color:var(--text-primary); }
.month-select { padding:6px 10px; border:1px solid var(--card-border); border-radius:8px; background:var(--bg); color:var(--text-primary); font-size:13px; }
.report-paper { background:#fff; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; }
.report-page { padding:24px 32px; }
.report-header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:16px; }
.report-header-brand { display:flex; align-items:center; gap:12px; }
.report-logo { height:32px; }
.report-header-text h2 { margin:0; font-size:16px; font-weight:700; color:#1e293b; }
.report-header-text span { font-size:11px; color:#64748b; }
.report-header-meta { text-align:right; font-size:11px; }
.meta-item span { color:#94a3b8; margin-right:4px; }
.report-title-section h1 { font-size:20px; font-weight:800; color:#1e293b; margin:0 0 8px; }
.report-intro { font-size:13px; color:#475569; line-height:1.6; }
.zoho-analysis-box { background:#f8fafc; padding:16px 20px; border-radius:6px; border-left:3px solid #1e3a8a; }
.zoho-analysis-label { font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px; }
.zoho-analysis-text { font-size:13px; color:#475569; line-height:1.6; }
.report-section-block { margin:20px 0; }
.report-block-title { font-size:13px; font-weight:700; color:#1e293b; text-transform:uppercase; display:flex; align-items:center; gap:8px; }
.title-bar { width:3px; height:16px; background:#1e3a8a; border-radius:2px; display:inline-block; }
.data-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
.table-wrap { overflow-x:auto; }
.table-wrap table { width:100%; border-collapse:collapse; font-size:12px; }
.table-wrap th { background:#f8fafc; color:#64748b; font-weight:600; text-transform:uppercase; font-size:10px; padding:8px 12px; text-align:left; border-bottom:1px solid #e2e8f0; }
.table-wrap th.r, .table-wrap td.r { text-align:right; }
.table-wrap td { padding:8px 12px; border-bottom:1px solid #f1f5f9; }
.table-wrap td.bold { font-weight:700; }
.table-total-row { background:#f1f5f9; font-weight:700; }
.report-footer { display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:12px; margin-top:16px; }
.informe-empty { text-align:center; padding:60px; color:var(--text-secondary); }
.kpi-section { margin-bottom:16px; }
.kpi-section-title { font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px 2px; }
.kpi-row { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
.kpi-row-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .kpi-row, .kpi-row-3 { grid-template-columns: repeat(2, 1fr); } }
</style>
