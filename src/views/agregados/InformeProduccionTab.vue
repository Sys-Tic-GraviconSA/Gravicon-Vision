<template>
  <div class="informe-produccion">
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte Oficial de Producción</span>
        <span class="icb-title">Producción {{ config.plantName }} — {{ selectedLabel }}</span>
      </div>
      <div class="icb-actions">
        <select v-model="selectedMonthKey" class="month-select">
          <option v-for="m in availableMonths" :key="m.key" :value="m.key">{{ m.label }}</option>
        </select>
        <button class="tb-btn primary" @click="generarPdf" :disabled="!hasData || generandoPdf" title="Generar y descargar archivo PDF oficial">
          <svg v-if="!generandoPdf" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <svg v-else class="spinner-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <span v-if="generandoPdf">Generando PDF...</span>
          <span v-else>Descargar PDF</span>
        </button>
      </div>
    </div>

    <div class="report-paper" v-if="hasData">
      <div class="report-document">
        <header class="report-header">
          <div class="report-header-brand">
            <img
              src="/Logos/Logo-Gravicon-Nuevo.png"
              alt="Gravicon"
              class="report-logo"
              loading="eager"
            />
            <div class="report-header-text">
              <h2>Producción {{ config.plantName }} Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Agregados · {{ selectedLabel }}</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div class="meta-item"><span>Período:</span> <strong>{{ selectedLabel }}</strong></div>
            <div class="meta-item"><span>Código:</span> <strong>GRV-INF-PROD-{{ config.plantName.toUpperCase() }}-{{ selectedMonthKey.replace('/','').replace('-','') }}</strong></div>
            <div class="meta-item"><span>Estado:</span> <strong>Oficial Consolidado</strong></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Ejecutivo de Producción</h1>
          <p class="report-intro">
            Análisis consolidado y diagnóstico integral del balance de producción diaria por línea de proceso, cumplimiento de metas corporativas y control de rendimientos operativos para la planta <strong>{{ config.plantName }}</strong> durante el período de <strong>{{ selectedLabel }}</strong>.
          </p>
        </div>

        <!-- Análisis Operativo Directivo estilo Zoho -->
        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis Operativo Directivo — Producción {{ config.plantName }}</div>
            <div class="zoho-analysis-text" v-html="textoAnalisis"></div>
          </div>
        </div>

        <!-- Contenedor Unificado de KPIs con espaciado homogéneo -->
        <div class="kpis-wrapper">
          <div class="kpi-section">
            <h4 class="kpi-section-title">Producción Total — {{ selectedLabel }}</h4>
            <div class="kpi-row">
              <KpiCard label="Total M³" accent="#3B82F6" icon="chart-bar">{{ fmt(kpi.total) }}</KpiCard>
              <KpiCard v-for="l in config.lines" :key="l.key" :label="l.label" :accent="config.palette[config.lines.indexOf(l)]" icon="layers">{{ fmt(lineTotals[l.key] || 0) }}</KpiCard>
            </div>
          </div>

          <div class="kpi-section">
            <h4 class="kpi-section-title">Proyectado Diario</h4>
            <div class="kpi-row-3">
              <KpiCard label="M³ Proyectado" accent="#EC4899" icon="trending-up">{{ fmt(kpi.proyectado) }}</KpiCard>
              <KpiCard label="Diferencia Proy." :accent="kpi.diferenciaProy < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpi.diferenciaProy >= 0 ? '+' : '' }}{{ fmt(kpi.diferenciaProy) }}</KpiCard>
              <KpiCard label="% Cumpl. Proy." accent="#F59E0B" icon="check-circle">{{ kpi.cumplimientoProy }}</KpiCard>
            </div>
          </div>

          <div class="kpi-section">
            <h4 class="kpi-section-title">Meta Mensual</h4>
            <div class="kpi-row-3">
              <KpiCard label="Meta Mensual M³" accent="#8B5CF6" icon="target">{{ fmt(kpi.metaMensual) }}</KpiCard>
              <KpiCard label="Diferencia Meta" :accent="kpi.diferenciaMeta < 0 ? '#EF4444' : '#10B981'" icon="trending-up">{{ kpi.diferenciaMeta >= 0 ? '+' : '' }}{{ fmt(kpi.diferenciaMeta) }}</KpiCard>
              <KpiCard label="% Cumpl. Meta" accent="#06B6D4" icon="check-circle">{{ kpi.cumplimientoMeta }}</KpiCard>
            </div>
          </div>
        </div>

        <!-- Nota de Estado / Alertas -->
        <div v-if="kpi.cumplimientoMetaPct < 80" class="report-nota alerta">
          <strong>Atención a Desempeño Operativo ({{ kpi.cumplimientoMeta }}):</strong>
          El volumen acumulado del mes refleja una brecha de {{ fmt(Math.abs(kpi.diferenciaMeta)) }} M³ frente a la meta mensual programada.
        </div>
        <div v-else-if="kpi.cumplimientoMetaPct >= 100" class="report-nota">
          <strong>Meta Cumplida:</strong> El volumen acumulado ha alcanzado o superado satisfactoriamente el 100% de la meta mensual ({{ kpi.cumplimientoMeta }}).
        </div>
        <div v-else class="report-nota">
          <strong>Desempeño Operativo Estable:</strong> El volumen acumulado presenta un ritmo de cumplimiento favorable del {{ kpi.cumplimientoMeta }} frente a la meta programada.
        </div>

        <!-- Comportamiento Operativo Diario -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Comportamiento Operativo Diario</h3>
          <div class="data-card" style="padding:14px 18px;">
            <ChartCard title="" :option="chartOpt" :height="300" hide-actions />
          </div>
        </div>

        <!-- Historial de Operación Diaria -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Historial de Operación Diaria ({{ selectedLabel }})</h3>
          <div class="data-card">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th class="idx-col">#</th>
                    <th>Fecha</th>
                    <th v-for="l in config.lines" :key="l.key" class="r">{{ l.label }}</th>
                    <th class="r">Total M³</th>
                    <th class="r">Proy. Día</th>
                    <th class="r">Dif. M³</th>
                    <th class="r">% Cump.</th>
                    <th class="obs-header">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in tablaRows" :key="row.Fecha + row['Total de M³'] + idx">
                    <td class="idx">{{ idx + 1 }}</td>
                    <td class="bold date-col">{{ row.Fecha }}</td>
                    <td v-for="l in config.lines" :key="l.key" class="r">{{ fmt((row as any)[l.key]) }}</td>
                    <td class="r bold accent-text">{{ fmt(row['Total de M³']) }}</td>
                    <td class="r">{{ fmt(row['M³ Proyectado']) }}</td>
                    <td class="r" :style="{ color: (row as any)['Diferencia'] >= 0 ? '#1f7a3d' : '#a90707', fontWeight: 700 }">
                      {{ (row as any)['Diferencia'] >= 0 ? '+' : '' }}{{ fmt((row as any)['Diferencia']) }}
                    </td>
                    <td class="r">
                      <span class="pill" :class="pillClassCumplimiento(row['% CumplimientoNum'])">
                        {{ row['% Cumplimiento'] }}
                      </span>
                    </td>
                    <td class="obs-cell" :title="row.Observaciones">{{ row.Observaciones || '—' }}</td>
                  </tr>
                  <tr class="table-total-row">
                    <td class="idx bold">Σ</td>
                    <td class="bold">TOTAL</td>
                    <td v-for="l in config.lines" :key="l.key" class="r bold">{{ fmt((totales as any)[l.key] || 0) }}</td>
                    <td class="r bold accent-text">{{ fmt(totales['Total de M³']) }}</td>
                    <td class="r bold">{{ fmt(totales['M³ Proyectado']) }}</td>
                    <td class="r bold" :style="{ color: (totales as any)['Diferencia'] >= 0 ? '#1f7a3d' : '#a90707' }">
                      {{ (totales as any)['Diferencia'] >= 0 ? '+' : '' }}{{ fmt((totales as any)['Diferencia']) }}
                    </td>
                    <td class="r bold">
                      <span class="pill" :class="pillClassCumplimiento(totales['% CumplimientoNum'])">
                        {{ totales['% Cumplimiento'] }}
                      </span>
                    </td>
                    <td class="obs-cell table-total-empty">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer class="report-footer">
          <span>Informe Ejecutivo de Producción — Gravas y Concretos S.A.</span>
          <span>Documento Oficial Consolidado</span>
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

/** Extrae el valor de observación soportando 'observacion' (Supabase) y variantes */
function getObservacion(r: Record<string, unknown>): string {
  const val = r['observacion'] ?? r['Observacion'] ?? r['observaciones'] ?? r['Observaciones'] ?? r['OBSERVACION'] ?? r['OBSERVACIONES'] ?? r['Observación'] ?? r['Novedad'] ?? r['novedad'] ?? r['Novedades'] ?? r['novedades'] ?? r['Nota'] ?? r['nota'] ?? ''
  return String(val ?? '').trim()
}

const availableMonths = computed(() => {
  const map = new Map<string, { label: string; first: number }>()
  for (const r of props.data) {
    const fecha = Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
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
    const fecha = Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
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
    total += Number(r['Total de M³'] ?? r['total_m3']) || 0
    proyectado += Number(r['M³ Proyectado'] ?? r['m3_proyectado']) || 0
    const fecha = Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
    if (!fecha) continue
    const d = serialToDate(fecha)
    const key = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', timeZone: 'UTC' })
    if (!metaByMonth.has(key)) metaByMonth.set(key, Number(r['Meta Mensual M³'] ?? r['meta_mensual_m3']) || 0)
  }
  for (const v of metaByMonth.values()) metaMensual += v
  const diferenciaMeta = total - metaMensual
  const diferenciaProy = total - proyectado
  const cumplimientoMetaPct = metaMensual > 0 ? (total / metaMensual * 100) : 0
  const cumplimientoProyPct = proyectado > 0 ? (total / proyectado * 100) : 0
  const promedio = rows.length > 0 ? total / rows.length : 0
  return {
    total,
    proyectado,
    metaMensual,
    diferenciaMeta,
    diferenciaProy,
    cumplimientoMetaPct,
    cumplimientoProyPct,
    cumplimientoMeta: cumplimientoMetaPct.toFixed(1) + '%',
    cumplimientoProy: cumplimientoProyPct.toFixed(1) + '%',
    promedio: Math.round(promedio),
  }
})

const lineTotals = computed(() => {
  const t: Record<string, number> = {}
  for (const l of props.config.lines) t[l.key] = monthData.value.reduce((s, r) => s + (Number(r[l.key]) || 0), 0)
  return t
})

const textoAnalisis = computed(() => {
  if (!monthData.value.length) return 'Sin datos para el periodo seleccionado.'
  
  const plant = props.config.plantName
  const periodo = selectedLabel.value
  const total = fmt(kpi.value.total)
  const meta = fmt(kpi.value.metaMensual)
  const proy = fmt(kpi.value.proyectado)
  const cMeta = kpi.value.cumplimientoMeta
  const cProy = kpi.value.cumplimientoProy
  const difMeta = (kpi.value.diferenciaMeta >= 0 ? '+' : '') + fmt(kpi.value.diferenciaMeta)
  const prom = fmt(kpi.value.promedio)
  const diasCount = monthData.value.length

  // Desglose por frentes / líneas
  const linesDesc = props.config.lines.map(l => {
    const lTot = lineTotals.value[l.key] || 0
    const pct = kpi.value.total > 0 ? ((lTot / kpi.value.total) * 100).toFixed(1) : '0.0'
    return `${l.label}: <strong>${fmt(lTot)} M³</strong> (${pct}%)`
  }).join(' · ')

  let txt = `Consolidado Operativo <strong>${plant}</strong> — <strong>${periodo}</strong>: Volumen neto acumulado de <strong>${total} M³</strong> frente a una meta mensual de <strong>${meta} M³</strong> (cumplimiento del <strong>${cMeta}</strong>) y un proyectado diario acumulado de <strong>${proy} M³</strong> (efectividad del <strong>${cProy}</strong>). `
  txt += `Brecha neta frente a la meta: <strong>${difMeta} M³</strong> con un promedio diario de producción de <strong>${prom} M³ / día</strong> a lo largo de <strong>${diasCount} jornadas operativas</strong>. `
  txt += `<strong>Aporte por Línea de Producción:</strong> ${linesDesc}.`

  return txt
})

const tablaRows = computed(() => {
  return monthData.value.map(r => {
    const serial = Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
    const d = serial ? serialToDate(serial) : null
    const fechaStr = d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : ''
    const total = Number(r['Total de M³'] ?? r['total_m3']) || 0
    const proy = Number(r['M³ Proyectado'] ?? r['m3_proyectado']) || 0
    const obs = getObservacion(r)
    
    // Cálculo de % Cumplimiento en base 100
    let cumpPct = 0
    if (proy > 0) {
      cumpPct = (total / proy) * 100
    } else if (r['% Cumplimiento'] != null || r['cumplimiento'] != null) {
      const rawCump = Number(r['% Cumplimiento'] ?? r['cumplimiento']) || 0
      cumpPct = (rawCump > 0 && rawCump <= 1) ? rawCump * 100 : rawCump
    }

    return {
      Fecha: fechaStr,
      ...Object.fromEntries(props.config.lines.map(l => [l.key, Number(r[l.key]) || 0])),
      'Total de M³': total,
      'M³ Proyectado': proy,
      'Diferencia': total - proy,
      '% CumplimientoNum': cumpPct,
      '% Cumplimiento': cumpPct.toFixed(1) + '%',
      Observaciones: obs,
    }
  })
})

const totales = computed(() => {
  const t: Record<string, any> = {}
  for (const l of props.config.lines) t[l.key] = monthData.value.reduce((s, r) => s + (Number(r[l.key]) || 0), 0)
  const totalM3 = monthData.value.reduce((s, r) => s + (Number(r['Total de M³'] ?? r['total_m3']) || 0), 0)
  const totalProy = monthData.value.reduce((s, r) => s + (Number(r['M³ Proyectado'] ?? r['m3_proyectado']) || 0), 0)
  t['Total de M³'] = totalM3
  t['M³ Proyectado'] = totalProy
  t['Diferencia'] = totalM3 - totalProy
  const cumpPct = totalProy > 0 ? (totalM3 / totalProy * 100) : 0
  t['% CumplimientoNum'] = cumpPct
  t['% Cumplimiento'] = totalProy > 0 ? cumpPct.toFixed(1) + '%' : '0.0%'
  return t
})

function pillClassCumplimiento(pctVal: any): string {
  const num = Number(pctVal) || 0
  if (num >= 95) return 'p-verde'
  if (num >= 75) return 'p-ambar'
  return 'p-rojo'
}

const chartOpt = computed(() => {
  const labels = monthData.value.map(r => {
    const serial = Number(r['Fecha'] ?? r['fecha'] ?? r['FECHA'])
    if (!serial) return ''
    const d = serialToDate(serial)
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
  const total = monthData.value.map(r => Number(r['Total de M³'] ?? r['total_m3']) || 0)
  const totalGeneral = props.data.reduce((s, r) => s + (Number(r['Total de M³'] ?? r['total_m3']) || 0), 0)
  const promedioMes = monthData.value.length > 0 ? Math.round(kpi.value.total / monthData.value.length) : 0

  return {
    color: ['#1d4ed8', '#10B981'],
    textStyle: { fontFamily: 'Lato, Segoe UI, sans-serif' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p?.dataIndex ?? 0
        const val = Number(total[idx] || 0)
        return `<div style="font-size:12px; line-height:1.6;"><b>Día ${labels[idx] || ''}</b><br/>Total del día: <b>${fmt(val)} M³</b><br/>Total general: <b>${fmt(totalGeneral)} M³</b></div>`
      }
    },
    grid: { left: 40, right: 30, bottom: 35, top: 40, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { color: chartTextColor.value, fontSize: 9.5, interval: 0, rotate: labels.length > 20 ? 45 : 0 },
      axisLine: { lineStyle: { color: '#cbd5e1' } }
    },
    yAxis: {
      type: 'value' as const,
      max: (value: { max: number }) => Math.ceil(value.max * 1.15),
      axisLabel: { color: chartTextColor.value, fontSize: 9.5, formatter: (val: number) => fmt(val) },
      splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        name: 'Producción Total (m³)',
        type: 'line' as const,
        smooth: 0.25,
        data: total,
        areaStyle: { opacity: 0.09, color: '#2563eb' },
        lineStyle: { width: 2.5, color: '#1d4ed8' },
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: '#1d4ed8', borderColor: '#ffffff', borderWidth: 2 },
        label: {
          show: true,
          position: 'top' as const,
          distance: 5,
          formatter: (p: any) => fmt(p.value),
          fontSize: 8.5,
          fontWeight: 700 as const,
          color: '#1e3a8a',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          padding: [1, 3] as [number, number],
          borderRadius: 3,
        },
        markLine: {
          symbol: 'none',
          label: {
            show: true,
            position: 'end' as const,
            formatter: `Prom: ${fmt(promedioMes)} M³`,
            color: '#10b981',
            fontSize: 9.5,
            fontWeight: 700 as const,
            backgroundColor: 'rgba(255,255,255,.92)',
            padding: [2, 5] as [number, number],
            borderRadius: 4
          },
          lineStyle: { color: '#10b981', type: 'dashed' as const, width: 1.8 },
          data: [{ yAxis: promedioMes }]
        }
      }
    ]
  }
})

async function generarPdf() {
  if (generandoPdf.value || !hasData.value) return
  generandoPdf.value = true
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 400))
    const elemento = (document.querySelector('.informe-produccion .report-document') || document.querySelector('.informe-produccion .report-paper')) as HTMLElement
    if (!elemento) return
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const root = document.documentElement
    const temaPrevio = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('light')
    root.classList.remove('dark')
    await new Promise(r => requestAnimationFrame(() => r(null)))
    try {
      // Pre-carga de imágenes (logo) para evitar canvas tainted / huecos pálidos
      const imgs = Array.from(elemento.querySelectorAll('img')) as HTMLImageElement[]
      await Promise.all(imgs.map(img => img.complete && img.naturalWidth > 0 ? Promise.resolve(null) : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); setTimeout(() => res(), 1500) })))
      await new Promise(r => requestAnimationFrame(() => r(null)))
      // Zoom: el PDF es imagen raster (canvas -> PNG). A más scale, más píxeles y menos borroso al ampliar.
      // Con logo local same-origin y sin estilos universales, 2.5 es nítido sin volverse pálido (3 ya se veía washed).
      const canvas = await html2canvas(elemento, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style')
          style.textContent = '.chart-actions{display:none!important}'
          clonedDoc.head.appendChild(style)
        },
      })
      const imgW = 210
      const imgH = (canvas.height * imgW) / canvas.width
      const pdf = new jsPDF({ unit: 'mm', format: [imgW, imgH], orientation: 'portrait' })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH, undefined, 'FAST')
      pdf.save(`Informe_Produccion_${props.config.plantName}_${selectedLabel.value.replace(/ /g, '_')}.pdf`)
    } finally {
      if (temaPrevio) {
        root.setAttribute('data-theme', temaPrevio)
        if (temaPrevio === 'dark') { root.classList.add('dark'); root.classList.remove('light') }
      }
    }
  } catch (e) {
    console.error('[generarPdf]', e)
  } finally {
    generandoPdf.value = false
  }
}
</script>

<style scoped>
.informe-produccion {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.informe-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 8px;
  padding: 12px 18px;
  flex-wrap: wrap;
  gap: 12px;
}
.icb-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icb-tag {
  background: #172954;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}
.icb-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}
.icb-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.month-select {
  padding: 7px 12px;
  border: 1.5px solid var(--card-border, #cbd5e1);
  border-radius: 6px;
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #0f172a);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.month-select:focus {
  border-color: #172954;
}

/* Botón corporativo oficial */
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}
.tb-btn.primary {
  background: #172954;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(23, 41, 84, 0.25);
}
.tb-btn.primary:hover:not(:disabled) {
  background: #1e3a8a;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(23, 41, 84, 0.35);
}
.tb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.spinner-icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Contenedor Continuo tipo Documento Ejecutivo */
.report-paper {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.report-document {
  width: 100%;
  padding: 32px 40px;
  background: #ffffff;
  color: #1a1a2e;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
  font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
  font-size: 13px;
  line-height: 1.6;
}

/* Membrete y encabezado */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2.5px solid var(--navy, #172954);
  padding-bottom: 12px;
  position: relative;
  flex-wrap: wrap;
  gap: 12px;
}
.report-header::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2.5px;
  width: 80px;
  height: 2.5px;
  background: #a90707;
}
.report-header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.report-logo {
  height: 50px;
  max-width: 200px;
  width: auto;
  object-fit: contain;
  display: block;
}
.report-header-text h2 {
  font-size: 15px;
  font-weight: 700;
  color: var(--navy, #172954);
  margin: 0;
}
.report-header-text span {
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
}
.report-header-meta {
  text-align: right;
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}
.report-header-meta strong {
  color: var(--text-primary, #0f172a);
}

/* Título e introducción */
.report-title-section {
  text-align: center;
  margin: 4px 0 8px;
  width: 100%;
}
.report-title-section h1 {
  font-size: 22px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-primary, #0f172a);
  margin: 0 0 6px;
}
.report-intro {
  font-size: 13px;
  color: var(--text-secondary, #475569);
  width: 100%;
  max-width: 100%;
  margin: 6px 0 0 0;
  line-height: 1.65;
  text-align: justify;
  box-sizing: border-box;
}

/* Análisis Operativo Directivo estilo Zoho */
.zoho-analysis-box {
  background-color: var(--card-bg-hover, #f8fafc);
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 3.5px solid var(--navy, #172954);
  width: 100%;
  box-sizing: border-box;
}
.zoho-analysis-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.zoho-analysis-text {
  font-size: 12.5px;
  color: var(--text-primary, #334155);
  line-height: 1.55;
  text-align: justify;
}

/* Bloques y títulos */
.report-section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.report-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--navy, #172954);
  margin: 0;
}
.title-bar {
  display: inline-block;
  width: 4px;
  height: 15px;
  background: #2563eb;
  border-radius: 2px;
}

.report-nota {
  border-left: 3.5px solid var(--navy, #172954);
  background: var(--card-bg-hover, #f8fafc);
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--text-primary, #0f172a);
  border-radius: 0 6px 6px 0;
  line-height: 1.5;
}
.report-nota.alerta {
  border-left-color: #a90707;
  background: #fdf1f1;
  color: #7f1d1d;
}

/* Tarjetas KPI */
.kpis-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.kpi-section {
  margin: 0;
  padding: 0;
}
.kpi-section-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 5px 2px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.kpi-row-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* Tablas de datos */
.data-card {
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: inherit;
}
.table-wrap th {
  background: #f8fafc;
  color: var(--navy, #172954);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 8px 12px;
  border-bottom: 1.5px solid var(--card-border, #e2e8f0);
  text-align: left;
}
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.table-wrap td {
  padding: 6.5px 12px;
  border-bottom: 1px solid var(--card-border, #f1f5f9);
  vertical-align: middle;
}
.table-wrap tr:hover td { background: #f8fafc; }
.table-total-row {
  background: #f1f5f9;
  font-weight: 700;
}
.table-total-row td {
  border-top: 2px solid #cbd5e1;
  border-bottom: none;
  padding: 8px 12px;
}
.idx-col, .idx { width: 26px; text-align: center; color: var(--text-secondary, #94a3b8); font-size: 11px; }
.bold { font-weight: 700; }
.accent-text { color: var(--navy, #172954); font-size: 12.5px; }
.date-col { white-space: nowrap; font-weight: 600; }

/* Columna de Observaciones */
.obs-header { min-width: 180px; }
.obs-cell {
  font-size: 11.5px;
  color: var(--text-secondary, #475569);
  max-width: 240px;
  white-space: normal;
  line-height: 1.4;
}
.table-total-empty { text-align: center; color: #94a3b8; }

/* Pills de porcentaje */
.pill {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.p-ambar { background: #fef7ea; color: #92400e; }

/* Pie de informe */
.report-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--card-border, #e2e8f0);
  padding-top: 12px;
  font-size: 11.5px;
  color: var(--text-secondary, #94a3b8);
  margin-top: 8px;
}

.informe-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: var(--card-bg, #ffffff);
  border: 1px dashed var(--card-border, #cbd5e1);
  border-radius: 8px;
  gap: 8px;
  color: var(--text-secondary, #64748b);
}
.placeholder-icon { font-size: 36px; }
.placeholder-text { font-size: 15px; font-weight: 600; color: var(--text-primary, #0f172a); }
.placeholder-sub { font-size: 12px; }

@media (max-width: 768px) {
  .report-document { padding: 16px; }
  .kpi-row, .kpi-row-3 { grid-template-columns: repeat(2, 1fr); }
  .report-header { flex-direction: column; align-items: flex-start; }
  .report-header-meta { text-align: left; }
}

/* Ocultar acciones del gráfico dentro del documento oficial (evita que salgan en PDF/impresión) */
.report-document :deep(.chart-actions) {
  display: none !important;
}
.report-document :deep(.chart-header) {
  margin-bottom: 0 !important;
}
.report-document :deep(.chart-card) {
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

@media print {
  .informe-control-bar { display: none !important; }
  .report-document { box-shadow: none; border: none; padding: 0; }
  .chart-actions { display: none !important; }
}
</style>

