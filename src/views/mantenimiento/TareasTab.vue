<template>
  <div class="tareas-tab">
    <div class="almacen-view-toggle">
      <button class="av-btn" :class="{ active: tareasView === 'graficas' }" @click="tareasView = 'graficas'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Gráficas
      </button>
      <button class="av-btn" :class="{ active: tareasView === 'tabla' }" @click="tareasView = 'tabla'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Tabla
      </button>
      <button class="av-btn" :class="{ active: tareasView === 'informe' }" @click="tareasView = 'informe'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Informe
      </button>
    </div>

    <div v-if="dispStore.loading" class="disp-loading-banner">
      <svg class="disp-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Cargando tareas — {{ plantaLabel }}...
    </div>
    <div v-else-if="dispStore.error" class="disp-error-banner">
      {{ dispStore.error }}
      <button class="disp-retry-btn" @click="dispStore.fetchDisponibilidad(plantaKey, true)">Reintentar</button>
    </div>

    <template v-else>
      <div class="kpi-row">
        <KpiCard label="Total Tareas" accent="#15223c" icon="layers" :value="String(kpis.total)" />
        <KpiCard label="Pendientes" accent="#EF4444" icon="alert-circle" :value="String(kpis.pendientes)" />
        <KpiCard label="En Proceso" accent="#F59E0B" icon="clock" :value="String(kpis.enProceso)" />
        <KpiCard label="Completadas" accent="#10B981" icon="check-circle" :value="String(kpis.completadas)" />
        <KpiCard label="Días Prom. Abierta" accent="#8B5CF6" icon="calendar" :value="String(kpis.diasPromedio)" />
      </div>

      <!-- ========== GRÁFICAS ========== -->
      <template v-if="tareasView === 'graficas'">
        <div v-if="allTareas.length === 0" class="disp-empty-banner">
          Sin tareas en el período seleccionado{{ periodoLabel ? ` (${periodoLabel})` : '' }}.
        </div>
        <template v-else>
          <div class="charts-grid cols-2">
            <ChartCard
              title="Tareas por Estado"
              description="Distribución de tareas según su estado actual"
              :option="estadoOpt"
              :height="300"
            />
            <ChartCard
              title="Tareas por Antigüedad"
              description="Cantidad de tareas agrupadas por días abiertos"
              :option="antiguedadOpt"
              :height="300"
            />
          </div>
          <div class="charts-grid cols-2">
            <ChartCard
              title="Tareas por Tipo de Vehículo"
              description="Desglose de tareas según categoría de equipo"
              :option="tipoOpt"
              :height="300"
            />
            <ChartCard
              title="Tareas por Responsable"
              description="Top responsables con más tareas asignadas"
              :option="responsableOpt"
              :height="300"
            />
          </div>
        </template>
      </template>

      <!-- ========== TABLA ========== -->
      <template v-if="tareasView === 'tabla'">
        <div class="ots-section">
          <div class="ots-bar">
            <div class="ots-stats">
              <span><strong>{{ allTareas.length }}</strong> tareas</span>
              <span class="ots-dot"></span>
              <span class="stat-abiertas"><strong>{{ kpis.pendientes }}</strong> pendientes</span>
              <span class="ots-dot"></span>
              <span class="stat-cerradas"><strong>{{ kpis.completadas }}</strong> completadas</span>
              <span class="ots-dot"></span>
              <span><strong>{{ kpis.diasPromedio }}</strong> días prom. abierta</span>
            </div>
          </div>

          <DataTable
            title="Tareas de Seguimiento"
            :data="tablaRows"
            :page-size="20"
            :badge-fields="['Estado']"
            :default-visible="['#', 'Placa', 'Tipo', 'Actividad', 'Responsable', 'Estado', 'Registro', 'Días Abierta']"
            small
            select-columns
            export-columns
          />
        </div>
      </template>

      <!-- ========== INFORME ========== -->
      <template v-if="tareasView === 'informe'">
        <div class="informe-control-bar">
          <div class="icb-info">
            <span class="icb-tag">Reporte Oficial de Mantenimiento</span>
            <span class="icb-title">Tareas de Seguimiento — {{ plantaLabel }}</span>
          </div>
          <div class="icb-actions">
            <button class="tb-btn primary" @click="generarInformePdf" :disabled="!allTareas.length || generandoPdf" title="Generar y descargar archivo PDF oficial">
              <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span v-if="generandoPdf">Generando PDF...</span>
              <span v-else>Descargar PDF</span>
            </button>
          </div>
        </div>

        <div v-if="!allTareas.length" class="disp-empty-banner">
          Sin tareas en el período seleccionado{{ periodoLabel ? ` (${periodoLabel})` : '' }}.
        </div>

        <div v-else class="report-paper">
          <div class="report-page">
            <header class="report-header">
              <div class="report-header-brand">
                <img src="/Logos/Logo_Gravicon_Azul.png" alt="Gravicon" class="report-logo" />
                <div class="report-header-text">
                  <h2>Mantenimiento {{ plantaLabel }} Gravicon</h2>
                  <span>GRAVAS Y CONCRETOS S.A. · Tareas de Seguimiento</span>
                </div>
              </div>
              <div class="report-header-meta">
                <div class="meta-item"><span>Período:</span> <strong>{{ informeDesde }} al {{ informeHasta }}</strong></div>
                <div class="meta-item"><span>Código:</span> <strong>GRV-INF-{{ new Date().getFullYear() }}-{{ plantaKey.toUpperCase() }}-TAR</strong></div>
                <div class="meta-item page-counter"><span>Pág. 1 de 2</span></div>
              </div>
            </header>

            <div class="report-title-section">
              <h1>Informe de Tareas de Seguimiento</h1>
              <p class="report-intro">
                Consolidado de tareas registradas para <strong>{{ plantaLabel }}</strong>
                en el período del <strong>{{ informeDesde }}</strong> al <strong>{{ informeHasta }}</strong>:
                estado, antigüedad, responsables y seguimiento de pendientes críticas.
              </p>
            </div>

            <div class="kpi-row compact-kpi">
              <KpiCard label="Total Tareas" accent="#1D4ED8" icon="layers" :value="String(kpis.total)" />
              <KpiCard label="Pendientes" accent="#DC2626" icon="alert-circle" :value="String(kpis.pendientes)" />
              <KpiCard label="En Proceso" accent="#F59E0B" icon="clock" :value="String(kpis.enProceso)" />
              <KpiCard label="Completadas" accent="#16A34A" icon="check-circle" :value="String(kpis.completadas)" />
              <KpiCard label="Días Prom. Abierta" accent="#8B5CF6" icon="calendar" :value="String(kpis.diasPromedio)" />
              <KpiCard label="Críticas (>7 d)" accent="#EF4444" icon="activity" :value="String(tareasCriticas.length)" />
            </div>

            <div class="report-section-block">
              <div class="zoho-analysis-box">
                <div class="zoho-analysis-label">Análisis Operativo Directivo — Tareas de Seguimiento</div>
                <div class="zoho-analysis-text" v-html="informeAnalisisTexto"></div>
              </div>
            </div>

            <div v-if="tareasCriticas.length > 0" class="report-nota alerta">
              <strong>Atención a tareas críticas ({{ tareasCriticas.length }}):</strong>
              Existen tareas con más de 7 días abiertas que requieren seguimiento prioritario.
            </div>
            <div v-else class="report-nota">
              <strong>Estado de seguimiento:</strong> No hay tareas críticas con más de 7 días de apertura en el período.
            </div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Resumen de Tareas</h3>
              <div class="data-card">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Métrica</th>
                        <th class="r">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td class="bold">Total Tareas</td><td class="r">{{ kpis.total }}</td></tr>
                      <tr><td class="bold">Pendientes</td><td class="r"><span class="pill p-rojo">{{ kpis.pendientes }}</span></td></tr>
                      <tr><td class="bold">En Proceso</td><td class="r"><span class="pill p-ambar">{{ kpis.enProceso }}</span></td></tr>
                      <tr><td class="bold">Completadas</td><td class="r"><span class="pill p-verde">{{ kpis.completadas }}</span></td></tr>
                      <tr><td class="bold">Días Promedio Abierta</td><td class="r">{{ kpis.diasPromedio }}</td></tr>
                      <tr><td class="bold">Críticas (&gt;7 días)</td><td class="r"><span class="pill p-ambar">{{ tareasCriticas.length }}</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <footer class="report-footer">
              <span>Informe de Tareas de Seguimiento — Gravicon</span>
              <span>Documento Oficial | Página 1 de 2</span>
            </footer>
          </div>

          <div class="report-page">
            <div class="report-salto-superior"></div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Tareas críticas (&gt;7 días) — {{ tareasCriticas.length }}</h3>
              <div class="data-card">
                <div v-if="tareasCriticas.length === 0" class="empty-table">No hay tareas críticas en el período</div>
                <div v-else class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th class="idx-col">#</th>
                        <th>Placa</th>
                        <th>Actividad</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Registro</th>
                        <th class="r">Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(t, i) in tareasCriticas" :key="t.id" class="alerta">
                        <td class="idx">{{ i + 1 }}</td>
                        <td class="bold accent-text">{{ t.placa }}</td>
                        <td class="actividad-cell">{{ t.actividad }}</td>
                        <td>{{ t.responsable }}</td>
                        <td><span class="pill" :class="pillClass(t.estado)">{{ t.estado }}</span></td>
                        <td>{{ t.fecha }}</td>
                        <td class="r"><span class="pill p-ambar">{{ t.dias }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Detalle de tareas del período ({{ allTareas.length }})</h3>
              <div class="data-card">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th class="idx-col">#</th>
                        <th>Placa</th>
                        <th>Tipo</th>
                        <th>Actividad</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Registro</th>
                        <th class="r">Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(t, i) in allTareas" :key="t.id" :class="t.dias > 7 ? 'alerta' : ''">
                        <td class="idx">{{ i + 1 }}</td>
                        <td class="bold accent-text">{{ t.placa }}</td>
                        <td>{{ t.tipo }}</td>
                        <td class="actividad-cell">{{ t.actividad }}</td>
                        <td>{{ t.responsable }}</td>
                        <td><span class="pill" :class="pillClass(t.estado)">{{ t.estado }}</span></td>
                        <td>{{ t.fecha }}</td>
                        <td class="r"><span class="pill" :class="t.dias > 7 ? 'p-ambar' : 'p-gris'">{{ t.dias }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <footer class="report-footer">
              <span>Informe de Tareas de Seguimiento — Gravicon</span>
              <span>Documento Oficial | Página 2 de 2</span>
            </footer>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw, nextTick } from 'vue'
import { useDisponibilidadStore } from '../../stores'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import { useTheme } from '../../composables/useTheme'

const props = defineProps<{
  data: Record<string, unknown>[]
  planta: string
  fechaInicio?: string
  fechaFin?: string
}>()

const dispStore = useDisponibilidadStore()
const { theme } = useTheme()
const tareasView = ref<'graficas' | 'tabla' | 'informe'>('graficas')
const generandoPdf = ref(false)

const palette = ['#15223c', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#A855F7']
const chartTextColor = computed(() => theme.value === 'light' ? '#475569' : '#94a3b8')

const plantaKey = computed(() => {
  const p = (props.planta ?? '').toLowerCase()
  if (p.includes('acacia')) return 'acacias'
  if (p.includes('concreto')) return 'concretos'
  return 'cuncia'
})

const plantaLabel = computed(() => {
  if (plantaKey.value === 'acacias') return 'Acacías'
  if (plantaKey.value === 'cuncia') return 'Cuncia'
  return 'Concretos'
})

function parseSerialDate(val: unknown): Date | null {
  if (!val) return null
  const num = Number(val)
  if (!isNaN(num) && num > 30000) {
    const utcDays = Math.floor(num - 25569)
    return new Date(utcDays * 86400 * 1000)
  }
  const s = String(val).trim()
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function getDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

function getDias(fechaReg: Date): number {
  const nowUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  return Math.max(1, Math.floor((nowUtc - fechaReg.getTime()) / 86400000))
}

type TareaRow = {
  id: string
  placa: string
  tipo: string
  fecha: string
  fechaIso: string
  responsable: string
  actividad: string
  observaciones: string
  estado: string
  dias: number
}

/** Tareas filtradas por Fecha_Registro según el rango del FilterBar (mismo criterio que Disponibilidad). */
const allTareas = computed(() => {
  const tareas = dispStore.data?.tareas || []
  if (tareas.length === 0) return [] as TareaRow[]

  const desde = props.fechaInicio || ''
  const hasta = props.fechaFin || ''
  const result: TareaRow[] = []

  for (const t of tareas) {
    const fechaReg = parseSerialDate(t['Fecha_Registro'])
    if (!fechaReg) continue

    const key = getDateKey(fechaReg)
    if (desde && key < desde) continue
    if (hasta && key > hasta) continue

    const estado = String(t['Estado_Tarea'] ?? '').trim()
    const id = String(t['ID_Tarea'] ?? '').slice(0, 8)
    const placa = String(t['Placa'] ?? t['PLACA'] ?? t['Placa_Texto'] ?? '—').trim()
    const tipo = String(t['Tipo de Vehiculos'] ?? t['Tipo'] ?? '—').trim()
    const responsable = String(t['Nombre_Responsable'] ?? t['Nombre Responsable'] ?? t['Responsable_Texto'] ?? t['Responsable'] ?? '—').trim()
    const actividad = String(t['Actividad'] ?? '—')
    const observaciones = String(t['observaciones'] ?? '—')
    const dias = getDias(fechaReg)
    const dia = String(fechaReg.getUTCDate()).padStart(2, '0')
    const mes = String(fechaReg.getUTCMonth() + 1).padStart(2, '0')
    const fecha = `${dia}/${mes}`

    result.push({ id, placa, tipo, fecha, fechaIso: key, responsable, actividad, observaciones, estado, dias })
  }

  result.sort((a, b) => b.dias - a.dias)
  return result
})

const informeDesde = computed(() => {
  if (props.fechaInicio) return formatDisplayDate(props.fechaInicio)
  if (allTareas.value.length === 0) return '—'
  const min = allTareas.value.reduce((a, t) => (t.fechaIso < a ? t.fechaIso : a), allTareas.value[0].fechaIso)
  return formatDisplayDate(min)
})

const informeHasta = computed(() => {
  if (props.fechaFin) return formatDisplayDate(props.fechaFin)
  if (allTareas.value.length === 0) return informeDesde.value
  const max = allTareas.value.reduce((a, t) => (t.fechaIso > a ? t.fechaIso : a), allTareas.value[0].fechaIso)
  return formatDisplayDate(max)
})

const periodoLabel = computed(() => {
  if (!props.fechaInicio && !props.fechaFin) return ''
  return `${informeDesde.value} al ${informeHasta.value}`
})

const kpis = computed(() => {
  const items = allTareas.value
  const pendientes = items.filter(t => t.estado === 'Pendiente').length
  const enProceso = items.filter(t => t.estado === 'En Proceso' || t.estado === 'En proceso').length
  const completadas = items.filter(t => t.estado === 'Completada' || t.estado === 'Cerrada').length
  const diasSum = items.reduce((s, t) => s + t.dias, 0)
  return {
    total: items.length,
    pendientes,
    enProceso,
    completadas,
    diasPromedio: items.length > 0 ? Math.round(diasSum / items.length) : 0,
  }
})

const estadoColors: Record<string, string> = {
  Pendiente: '#EF4444',
  'En Proceso': '#F59E0B',
  'En proceso': '#F59E0B',
  Completada: '#10B981',
  Cerrada: '#10B981',
  Cancelada: '#6B7280',
}

const porEstado = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    const e = t.estado || 'Sin estado'
    map.set(e, (map.get(e) || 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})

const estadoOpt = computed(() => {
  const data = porEstado.value.map(([name, value]) => ({
    name,
    value,
    itemStyle: { color: estadoColors[name] || '#3B82F6' },
  }))
  return markRaw({
    color: palette,
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString('es-CO')} (${p.percent}%)` },
    legend: {
      type: 'scroll' as const,
      orient: 'vertical' as const,
      right: 10,
      top: 10,
      textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['38%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => p.percent + '%', fontSize: 10 },
      data,
    }],
  })
})

const porAntiguedad = computed(() => {
  const ranges = [
    { label: '1-3 días', min: 1, max: 3, color: '#10B981' },
    { label: '4-7 días', min: 4, max: 7, color: '#F59E0B' },
    { label: '8-14 días', min: 8, max: 14, color: '#F97316' },
    { label: '15-30 días', min: 15, max: 30, color: '#EF4444' },
    { label: '> 30 días', min: 31, max: Infinity, color: '#991B1B' },
  ]
  return ranges.map(r => ({
    label: r.label,
    count: allTareas.value.filter(t => t.dias >= r.min && t.dias <= r.max).length,
    color: r.color,
  }))
})

const antiguedadOpt = computed(() => {
  const items = porAntiguedad.value
  const labels = items.map(i => i.label)
  return markRaw({
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'value' as const, axisLabel: { color: chartTextColor.value }, splitLine: { show: false } },
    yAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
    },
    series: [{
      name: 'Tareas',
      type: 'bar',
      data: items.map(i => ({ value: i.count, itemStyle: { color: i.color } })),
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})

const porTipo = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    map.set(t.tipo || 'Otro', (map.get(t.tipo || 'Otro') || 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})

const tipoOpt = computed(() => {
  const entries = porTipo.value.slice(0, 12)
  const labels = entries.map(e => e[0])
  return markRaw({
    color: palette,
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11, width: 90, overflow: 'truncate' as const },
    },
    series: [{
      name: 'Tareas',
      type: 'bar',
      data: entries.map((e, i) => ({ value: e[1], itemStyle: { color: palette[i % palette.length] } })),
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})

const porResponsable = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    const r = t.responsable || 'Sin asignar'
    map.set(r, (map.get(r) || 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
})

const responsableOpt = computed(() => {
  const entries = porResponsable.value.slice(0, 10)
  const labels = entries.map(e => e[0])
  return markRaw({
    color: palette,
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11, width: 100, overflow: 'truncate' as const },
    },
    series: [{
      name: 'Tareas',
      type: 'bar',
      data: entries.map((e, i) => ({ value: e[1], itemStyle: { color: palette[i % palette.length] } })),
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})

const tareasCriticas = computed(() => allTareas.value.filter(t => t.dias > 7))

const tablaRows = computed(() =>
  allTareas.value.map((t, i) => ({
    '#': i + 1,
    Placa: t.placa,
    Tipo: t.tipo,
    Actividad: t.actividad,
    Observaciones: t.observaciones,
    Responsable: t.responsable,
    Estado: t.estado,
    Registro: t.fecha,
    'Días Abierta': t.dias,
  })),
)

const informeAnalisisTexto = computed(() => {
  const total = kpis.value.total
  const desde = informeDesde.value
  const hasta = informeHasta.value
  let texto = `Consolidado de Tareas de Seguimiento <strong>${plantaLabel.value}</strong>: evaluación del período del <strong>${desde}</strong> al <strong>${hasta}</strong>. `
  texto += `Se registran <strong>${total} tareas</strong> (${kpis.value.pendientes} pendientes, ${kpis.value.enProceso} en proceso y ${kpis.value.completadas} completadas), con un tiempo promedio de apertura de <strong>${kpis.value.diasPromedio} días</strong>. `
  if (tareasCriticas.value.length > 0) {
    texto += `<br><strong>Seguimiento Prioritario:</strong> Hay ${tareasCriticas.value.length} tarea(s) con más de 7 días abiertas que requieren atención inmediata.`
  } else {
    texto += `<br><strong>Gestión al Día:</strong> No se evidencian tareas críticas con más de 7 días de apertura en el período.`
  }
  return texto
})

function pillClass(estado: string): string {
  if (estado === 'Pendiente') return 'p-rojo'
  if (estado === 'En Proceso' || estado === 'En proceso') return 'p-ambar'
  if (estado === 'Completada' || estado === 'Cerrada') return 'p-verde'
  return 'p-gris'
}

async function generarInformePdf() {
  if (generandoPdf.value || !allTareas.value.length) return
  generandoPdf.value = true
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 400))
    const elemento = document.querySelector('.tareas-tab .report-paper') as HTMLElement
    if (!elemento) {
      console.error('No se encontró el contenedor del reporte (.report-paper)')
      return
    }
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const root = document.documentElement
    const temaPrevio = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('light')
    root.classList.remove('dark')

    await new Promise(r => requestAnimationFrame(() => r(null)))

    try {
      const pageW = 210
      const pageH = 297
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      function addCanvasToPdf(canvas: HTMLCanvasElement, isFirst: boolean) {
        const imgW = pageW
        const imgH = (canvas.height * imgW) / canvas.width
        const imgData = canvas.toDataURL('image/png')

        if (imgH <= pageH) {
          if (!isFirst) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST')
        } else {
          const pxPerMm = canvas.width / imgW
          const pageHeightPx = Math.floor(pageH * pxPerMm)
          let yOffset = 0
          let firstSlice = isFirst

          while (yOffset < canvas.height) {
            const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset)
            const sliceCanvas = document.createElement('canvas')
            sliceCanvas.width = canvas.width
            sliceCanvas.height = sliceHeight
            const ctx = sliceCanvas.getContext('2d')!
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
            ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

            if (!firstSlice) pdf.addPage()
            const sliceData = sliceCanvas.toDataURL('image/png')
            const sliceHm = (sliceHeight * imgW) / canvas.width
            pdf.addImage(sliceData, 'PNG', 0, 0, imgW, sliceHm, undefined, 'FAST')

            yOffset += sliceHeight
            firstSlice = false
          }
        }
      }

      const pages = elemento.querySelectorAll<HTMLElement>('.report-page')
      if (pages.length === 0) {
        const canvas = await html2canvas(elemento, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        addCanvasToPdf(canvas, true)
      } else {
        let first = true
        for (let i = 0; i < pages.length; i++) {
          const pageCanvas = await html2canvas(pages[i], {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: pages[i].scrollWidth,
            height: pages[i].scrollHeight,
            windowWidth: pages[i].scrollWidth,
            windowHeight: pages[i].scrollHeight,
          })
          addCanvasToPdf(pageCanvas, first)
          first = false
        }
      }
      const desde = (props.fechaInicio || 'reporte').replace(/-/g, '')
      const hasta = (props.fechaFin || 'corte').replace(/-/g, '')
      pdf.save(`Informe_Tareas_${plantaLabel.value}_${desde}_al_${hasta}.pdf`)
    } finally {
      if (temaPrevio) {
        root.setAttribute('data-theme', temaPrevio)
        if (temaPrevio === 'dark') {
          root.classList.add('dark')
          root.classList.remove('light')
        }
      }
    }
  } catch (err) {
    console.error('[generarInformePdf Tareas]', err)
  } finally {
    generandoPdf.value = false
  }
}

onMounted(() => {
  if (!dispStore.data || dispStore.data.planta !== plantaKey.value) {
    dispStore.fetchDisponibilidad(plantaKey.value)
  }
})

watch(() => props.planta, () => {
  dispStore.fetchDisponibilidad(plantaKey.value)
})
</script>

<style scoped>
.tareas-tab {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0;
}

.almacen-view-toggle {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.av-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-alt);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.av-btn:hover {
  border-color: var(--card-border-hover);
  color: var(--text-primary);
}
.av-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

.disp-loading-banner,
.disp-error-banner,
.disp-empty-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.disp-loading-banner {
  background: var(--card-bg, #f0f4ff);
  border: 1px solid var(--card-border, #dbeafe);
  color: var(--navy, #172954);
}
.disp-error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}
.disp-empty-banner {
  background: var(--card-bg-hover, #f8fafc);
  border: 1px dashed var(--card-border, #e2e8f0);
  color: var(--text-secondary);
}
.disp-retry-btn {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #b91c1c;
  background: transparent;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.disp-retry-btn:hover {
  background: #b91c1c;
  color: white;
}
@keyframes disp-spin {
  to { transform: rotate(360deg); }
}
.disp-spinner {
  animation: disp-spin 0.9s linear infinite;
  flex-shrink: 0;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 8px;
}
.compact-kpi {
  margin: 2px 0 6px !important;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.charts-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}
.charts-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.ots-section { margin-top: 8px; }
.ots-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.ots-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ots-stats strong { color: var(--text-primary); font-weight: 700; }
.ots-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: .4;
}
.stat-abiertas { color: #ef4444; }
.stat-abiertas strong { color: #ef4444; }
.stat-cerradas { color: #10b981; }
.stat-cerradas strong { color: #10b981; }

.informe-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-md, 10px);
  padding: 12px 18px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 12px;
}
.icb-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.icb-tag {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--navy, #172954);
}
.icb-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}
.icb-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--bg-alt);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}
.tb-btn.primary {
  background: var(--navy, #172954);
  border-color: var(--navy, #172954);
  color: #fff;
}
.tb-btn.primary:hover {
  background: #1e3a8a;
  border-color: #1e3a8a;
}
.tb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.report-paper {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  width: 100%;
}
.report-page {
  width: 100%;
  min-height: 297mm;
  padding: 12mm 14mm 14mm 14mm;
  background: #ffffff;
  color: #1a1a2e;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
}
.report-salto-superior {
  height: 8mm;
  flex-shrink: 0;
}
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2.5px solid var(--navy, #172954);
  padding-bottom: 10px;
  position: relative;
  flex-wrap: wrap;
  gap: 12px;
}
.report-header::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2.5px;
  width: 74px;
  height: 2.5px;
  background: #a90707;
}
.report-header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.report-logo {
  height: 38px;
  object-fit: contain;
}
.report-header-text h2 {
  font-size: 14px;
  font-weight: 700;
  color: var(--navy, #172954);
  margin: 0;
}
.report-header-text span {
  font-size: 12px;
  color: var(--text-secondary);
}
.report-header-meta {
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.report-header-meta strong {
  color: var(--text-primary);
}
.page-counter {
  font-weight: 700;
  color: var(--navy, #172954);
}
.report-title-section {
  text-align: center;
  margin: 2px 0 6px;
}
.report-title-section h1 {
  font-size: 16px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.report-intro {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.45;
}
.report-nota {
  border-left: 3px solid var(--navy, #172954);
  background: var(--card-bg-hover, #f8fafc);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-primary);
  border-radius: 0 6px 6px 0;
  line-height: 1.4;
}
.report-nota.alerta {
  border-left-color: #a90707;
  background: #fdf1f1;
  color: #7f1d1d;
}
.report-section-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.report-block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--navy, #172954);
  margin: 0;
}
.title-bar {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: #2563eb;
  border-radius: 2px;
}
.report-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--card-border, #e2e8f0);
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-secondary);
}

.zoho-analysis-box {
  background-color: var(--card-bg-hover, #f8fafc);
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 3px solid var(--navy, #172954);
}
.zoho-analysis-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.zoho-analysis-text {
  font-size: 12px;
  color: var(--text-primary, #475569);
  line-height: 1.6;
}

.data-card {
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  font-family: inherit;
}
.table-wrap th {
  background: #f8fafc;
  color: var(--navy, #172954);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 6px 10px;
  border-bottom: 1.5px solid var(--card-border, #e2e8f0);
  text-align: left;
}
.table-wrap td {
  padding: 5.5px 10px;
  border-bottom: 1px solid var(--card-border, #f1f5f9);
  vertical-align: middle;
}
.table-wrap tr:hover td { background: #f8fafc; }
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.idx-col, .idx { width: 24px; text-align: center; color: var(--text-secondary); }
.bold { font-weight: 700; }
.accent-text { color: var(--navy, #172954); }
.actividad-cell {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 220px;
}
.table-wrap tr.alerta td { background: #fdf1f1; }
.table-wrap tr.alerta td:first-child { box-shadow: inset 3px 0 0 #a90707; }
.empty-table {
  text-align: center;
  padding: 12px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.pill {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.p-ambar { background: #fbf3e0; color: #b8860b; }
.p-gris { background: #eef1f4; color: #5b6b82; }

@media (max-width: 1200px) {
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
  .compact-kpi { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .almacen-view-toggle { flex-wrap: wrap; }
}
@media print {
  .almacen-view-toggle,
  .informe-control-bar,
  .kpi-row:not(.compact-kpi) {
    display: none !important;
  }
  .report-page {
    box-shadow: none;
    border: none;
  }
}
</style>
