<template>
  <div>
    <!-- Day Selector -->
    <div class="section-header">
      <h3 class="section-title"><span class="title-bar"></span>Desempeño Diario</h3>
      <p class="section-sub">Selecciona el día para evaluar el desempeño operativo</p>
    </div>

    <div class="day-selector">
      <button v-for="d in ['hoy','ayer']" :key="d"
        class="day-btn" :class="{ active: selectedDay === d, hoy: d === 'hoy', ayer: d === 'ayer' }"
        @click="selectedDay = d">
        <span class="day-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </span>
        <div class="day-info">
          <span class="day-label">{{ d === 'hoy' ? 'Hoy' : 'Ayer' }}</span>
          <span class="day-date">{{ d === 'hoy' ? todayLabel : yesterdayLabel }}</span>
        </div>
        <span class="day-badge" :class="{ empty: dayCount(d) === 0 }">
          {{ dayCount(d) > 0 ? `${dayCount(d)} desp.` : 'Sin datos' }}
        </span>
      </button>
      <div class="day-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        Datos aislados — no se mezclan
      </div>
    </div>

    <!-- No data -->
    <EmptyState v-if="!hasData" :title="`Sin despachos registrados para ${selectedDay === 'hoy' ? 'hoy' : 'ayer'}`" description="Los datos se actualizan automáticamente" />

    <template v-else>
      <!-- KPIs -->
      <div class="kpi-row">
        <KpiCard label="Volumen" :accent="dayColor" icon="package">{{ fmt(dayData.vol) }} m³</KpiCard>
        <KpiCard label="# Pedidos" accent="#3B82F6" icon="truck">{{ dayData.despachos }}</KpiCard>
        <KpiCard label="Mixers Activos" accent="#22C55E" icon="zap">{{ dayData.mixersActivos }}</KpiCard>
        <KpiCard label="Clientes" accent="#A855F7" icon="users">{{ dayData.clientes }}</KpiCard>
        <KpiCard label="% Bombeo" accent="#06B6D4" icon="activity">{{ dayData.pctBombeo }}%</KpiCard>
        <KpiCard label="Prom/Despacho" accent="#EF4444" icon="trending-up">{{ dayData.promDespacho }} m³</KpiCard>
      </div>

      <!-- Charts -->
      <div class="charts-grid cols-2">
        <ChartCard title="Distribución Horaria" :option="horarioOpt" />
        <ChartCard title="Por Planta" :option="porPlantaOpt" />
      </div>

      <!-- Alertas Operativas -->
      <div class="section-header" style="margin-top:24px">
        <h3 class="section-title"><span class="title-bar"></span>Alertas Operativas</h3>
        <p class="section-sub">Semáforos del día · {{ plantaFilter !== 'Todas' ? `Planta ${plantaFilter}` : 'Todas las plantas' }}</p>
      </div>
      <div class="alerts-grid">
        <div class="alert-card" :class="alertas.mixersBajaEf.length === 0 ? 'sev-ok' : alertas.mixersBajaEf.length >= 3 ? 'sev-danger' : 'sev-warn'">
          <div class="alert-head">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning)">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span class="alert-label">Mixers Baja Eficiencia</span>
          </div>
          <div class="alert-value">{{ alertas.mixersBajaEf.length }}</div>
          <div class="alert-sub">{{ alertas.mixersBajaEf.length > 0 ? 'Cargando < 5 m³/viaje' : 'Todos eficientes' }}</div>
          <div class="alert-detail" v-if="alertas.mixersBajaEf.length > 0">
            {{ alertas.mixersBajaEf.slice(0,3).map(m => `${m.mixer} · ${m.volPorViaje} m³/v`).join(' · ') }}
          </div>
        </div>
        <div class="alert-card" :class="alertas.brechas.length === 0 ? 'sev-ok' : alertas.brechas.length >= 3 ? 'sev-danger' : 'sev-warn'">
          <div class="alert-head">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger)">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <span class="alert-label">Brechas Horarias</span>
          </div>
          <div class="alert-value">{{ alertas.brechas.length }}</div>
          <div class="alert-sub">{{ alertas.brechas.length > 0 ? 'Horas sin operación' : 'Operación continua' }}</div>
          <div class="alert-detail" v-if="alertas.brechas.length > 0">
            Sin despachos: {{ alertas.brechas.map(h => `${String(h).padStart(2,'0')}:00`).join(' · ') }}
          </div>
        </div>
        <div class="alert-card sev-info">
          <div class="alert-head">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent)">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="alert-label">Horario Operación</span>
          </div>
          <div class="alert-value">{{ alertas.horaInicio != null ? `${String(alertas.horaInicio).padStart(2,'0')}:00 → ${String(alertas.horaFin).padStart(2,'0')}:59` : '—' }}</div>
          <div class="alert-sub">Duración: {{ alertas.horasOp }}h · {{ alertas.horasActivas }} horas activas</div>
        </div>
      </div>

      <!-- Equipment Tables -->
      <div class="section-header" style="margin-top:24px">
        <h3 class="section-title"><span class="title-bar"></span>Rendimientos por Equipo</h3>
      </div>
      <div class="tables-grid cols-3">
        <div class="data-card">
          <div class="card-head">Mixers — {{ filteredMixers.length }}</div>
          <div class="table-wrap">
            <table><thead><tr><th>#</th><th>Mixer</th><th class="r">Viajes</th><th class="r">Vol. m³</th><th class="r">m³/v</th></tr></thead>
            <tbody><tr v-for="(m,i) in filteredMixers" :key="m.mixer">
              <td class="idx">{{ i+1 }}</td><td class="bold accent-text">{{ m.mixer }}</td>
              <td class="r green">{{ m.viajes }}</td><td class="r bold">{{ fmt(m.volDespachado) }}</td>
              <td class="r" :class="m.promCarga >= 7 ? 'green' : m.promCarga < 5 ? 'red' : ''">{{ m.promCarga }}</td>
            </tr></tbody></table>
          </div>
        </div>
        <div class="data-card">
          <div class="card-head">Conductores — {{ filteredConductores.length }}</div>
          <div class="table-wrap">
            <table><thead><tr><th>#</th><th>Conductor</th><th class="r">Viajes</th><th class="r">Vol. m³</th></tr></thead>
            <tbody><tr v-for="(c,i) in filteredConductores" :key="c.conductor">
              <td class="idx">{{ i+1 }}</td><td>{{ c.conductor }}</td>
              <td class="r green">{{ c.viajes }}</td><td class="r bold">{{ fmt(c.volTransportado) }}</td>
            </tr></tbody></table>
          </div>
        </div>
        <div class="data-card">
          <div class="card-head">Bombas — {{ filteredBombas.length }}</div>
          <div class="table-wrap">
            <table v-if="filteredBombas.length"><thead><tr><th>#</th><th>Bomba</th><th>Operario</th><th class="r">Bombeos</th><th class="r">Vol. m³</th><th class="r">m³/b</th></tr></thead>
            <tbody><tr v-for="(b,i) in filteredBombas" :key="b.bomba">
              <td class="idx">{{ i+1 }}</td><td>{{ b.bomba }}</td>
              <td class="muted">{{ b.operario || '—' }}</td>
              <td class="r green">{{ b.bombeos ?? b.servicios }}</td>
              <td class="r bold">{{ fmt(b.volBombeado) }}</td>
              <td class="r" :class="(b.volPorBombeo ?? 0) >= 7 ? 'green' : 'red'">{{ b.volPorBombeo ? fmt(b.volPorBombeo) : '—' }}</td>
            </tr></tbody></table>
            <div v-else class="no-data">Sin bombeos</div>
          </div>
        </div>
      </div>

      <!-- Top Clientes + Despachos -->
      <div class="tables-grid cols-1-2" style="margin-top:16px">
        <div class="data-card">
          <div class="card-head">Top Clientes</div>
          <div class="table-wrap">
            <table><thead><tr><th>#</th><th>Cliente</th><th class="r">Vol. m³</th><th class="r">Viajes</th></tr></thead>
            <tbody><tr v-for="(c,i) in topClientes.slice(0,15)" :key="c.cliente">
              <td class="idx">{{ i+1 }}</td><td>{{ c.cliente }}</td>
              <td class="r bold accent-text">{{ fmt(c.vol) }}</td><td class="r">{{ c.viajes }}</td>
            </tr></tbody></table>
          </div>
        </div>
        <div class="data-card">
          <div class="card-head">Despachos del Día — {{ dayData.despachos }} registros</div>
          <div class="table-wrap lg">
            <table><thead><tr><th>Hora</th><th>Cliente</th><th>Planta</th><th class="r">Vol.</th><th>Mixer</th><th>Mezcla</th></tr></thead>
            <tbody><tr v-for="(r,i) in despachosOrdered.slice(0,50)" :key="i">
              <td class="muted">{{ r.hora != null ? String(r.hora).padStart(2,'0')+':00' : '—' }}</td>
              <td>{{ r.cliente.slice(0,25) }}</td>
              <td><span class="pill" :style="{ background: (PC[r.planta]||'#888')+'22', color: PC[r.planta]||'#888' }">{{ r.planta }}</span></td>
              <td class="r bold">{{ r.cant }}</td>
              <td class="muted">{{ r.mixer }}</td>
              <td class="muted">{{ r.mezcla }}</td>
            </tr></tbody></table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

/**
 * DiarioTab.vue — Tab de operación diaria del dashboard de concreto.
 * Muestra KPIs por día, tabla detallada con filtros por columna,
 * distribución horaria, análisis por día de la semana, y rendimiento
 * de mixers, conductores, bombas y elementos.
 */
<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import EmptyState from '../../../components/ui/EmptyState.vue'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import ChartCard from '../../../components/dashboard/ChartCard.vue'
import { parseRows } from '../../../composables/useConcretoData'
import type { DashboardData, PlantOpData } from '../../../types'
import type { SheetData } from '../../../stores/concreto'

const props = defineProps<{
  data: DashboardData
  sheetData?: SheetData | null
  plantOp?: Record<string, PlantOpData>
}>()
const PC: Record<string,string> = { Acacias: '#E8913A', Restrepo: '#3B82F6', Villavicencio: '#22C55E', Todas: '#E8913A' }
const plantaFilter = ref('Todas')
const selectedDay = ref<'hoy'|'ayer'>('hoy')

const fmt = (n: number) => n?.toLocaleString('es-CO', { maximumFractionDigits: 1 }) ?? '0'

// Parse all rows from sheetData
const allRows = computed(() => {
  if (!props.sheetData) return []
  return parseRows(props.sheetData).filter(r => !r.isAgg)
})

// Get today/yesterday dates (reactive, local time)
const todayKey = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const yesterdayKey = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const todayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
const yesterdayLabel = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })

const dayColor = computed(() => selectedDay.value === 'hoy' ? '#E8913A' : '#3B82F6')

const rowsForDay = (day: string) => {
  const key = day === 'hoy' ? todayKey.value : yesterdayKey.value
  return allRows.value.filter(r => r.fecha === key)
}

const dayCount = (day: string) => rowsForDay(day).length

const filteredDayRows = computed(() => {
  return rowsForDay(selectedDay.value)
})

const hasData = computed(() => filteredDayRows.value.length > 0)

const dayData = computed(() => {
  const rows = filteredDayRows.value
  const vol = rows.reduce((s, r) => s + r.cant, 0)
  const n = rows.length
  return {
    vol, despachos: n,
    clientes: new Set(rows.map(r => r.cliente)).size,
    mixersActivos: new Set(rows.filter(r => r.mixer).map(r => r.mixer)).size,
    promDespacho: n ? +(vol / n).toFixed(1) : 0,
    pctBombeo: n ? +((rows.filter(r => r.servicio && r.servicio !== 'Sin Bomba' && !r.servicio.toLowerCase().includes('estacionaria')).length / n) * 100).toFixed(1) : 0,
  }
})

// Alertas
const alertas = computed(() => {
  const rows = filteredDayRows.value
  // Mixers baja eficiencia
  const byMixer = new Map<string, { vol: number; viajes: number }>()
  for (const r of rows) {
    if (!r.mixer) continue
    const c = byMixer.get(r.mixer) ?? { vol: 0, viajes: 0 }
    c.vol += r.cant; c.viajes++
    byMixer.set(r.mixer, c)
  }
  const mixersBajaEf = [...byMixer.entries()]
    .map(([mixer, v]) => ({ mixer, volPorViaje: v.viajes ? +(v.vol / v.viajes).toFixed(1) : 0, viajes: v.viajes }))
    .filter(m => m.viajes > 0 && m.volPorViaje < 5)

  // Brechas horarias
  const horas = [...new Set(rows.map(r => r.hora).filter(h => h != null) as number[])].sort((a, b) => a - b)
  const horaInicio = horas[0] ?? null
  const horaFin = horas[horas.length - 1] ?? null
  const brechas: number[] = []
  if (horaInicio != null && horaFin != null) {
    for (let h = horaInicio + 1; h < horaFin; h++) {
      if (!horas.includes(h)) brechas.push(h)
    }
  }
  const horasOp = (horaInicio != null && horaFin != null) ? (horaFin - horaInicio + 1) : 0

  return { mixersBajaEf, brechas, horaInicio, horaFin, horasOp, horasActivas: horas.length }
})

// Tables
const filteredMixers = computed(() => props.data.mixers?.slice(0, 15) ?? [])
const filteredConductores = computed(() => props.data.conductores?.slice(0, 15) ?? [])
const filteredBombas = computed(() => props.data.bombas ?? [])
const topClientes = computed(() => {
  const rows = filteredDayRows.value
  const map = new Map<string, { vol: number; viajes: number }>()
  for (const r of rows) {
    const c = map.get(r.cliente) ?? { vol: 0, viajes: 0 }
    c.vol += r.cant; c.viajes++
    map.set(r.cliente, c)
  }
  return [...map.entries()].map(([cliente, v]) => ({ cliente, vol: +v.vol.toFixed(2), viajes: v.viajes })).sort((a, b) => b.vol - a.vol)
})
const despachosOrdered = computed(() => [...filteredDayRows.value].sort((a, b) => (b.hora ?? 0) - (a.hora ?? 0)))

// Charts
const baseGrid = { left: 60, right: 60, bottom: 50, top: 50, containLabel: true }
const horarioOpt = computed(() => {
  const horario = (props.plantOp?.Todas?.horario ?? []).filter(h => h.hora >= 4 && h.hora <= 17)
  return markRaw({
    color: [dayColor.value, '#10B981'],
    tooltip: { trigger: 'axis' as const },
    grid: baseGrid,
    xAxis: { type: 'category' as const, data: horario.map(h => h.label), axisLabel: { fontSize: 10, fontWeight: 600 as const } },
    yAxis: [{ type: 'value' as const, axisLabel: { show: false } }, { type: 'value' as const, axisLabel: { show: false } }],
    series: [
      { name: 'Vol. m³', type: 'bar', data: horario.map(h => h.volDespachado) },
      { name: '# Despachos', type: 'line', yAxisIndex: 1, data: horario.map(h => h.despachos), smooth: true, showSymbol: false },
    ],
  })
})
const porPlantaOpt = computed(() => {
  const bp = props.data.bombeoPorPlanta ?? []
  return markRaw({
    color: ['#E8913A'], tooltip: { trigger: 'axis' as const }, grid: baseGrid,
    xAxis: { type: 'category' as const, data: bp.map(p => p.planta), axisLabel: { fontSize: 11, fontWeight: 600 as const } },
    yAxis: [{ type: 'value' as const, axisLabel: { show: false } }],
    series: [{ name: 'Vol. m³', type: 'bar', data: bp.map(p => p.conBombeo + p.sinBombeo), itemStyle: { borderRadius: [4, 4, 0, 0] } }],
  })
})
</script>

<style scoped>
.section-header { margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.section-sub { font-size: 11px; color: var(--text-tertiary); margin: 3px 0 0 22px; }

.day-selector { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; align-items: center; }
.day-btn { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 12px 18px; display: flex; gap: 12px; align-items: center; cursor: pointer; transition: all .15s; min-width: 220px; }
.day-btn.active.hoy { background: rgba(232,145,58,.13); border-color: #E8913A; box-shadow: 0 0 0 3px rgba(232,145,58,.1); }
.day-btn.active.ayer { background: rgba(59,130,246,.13); border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
.day-icon { display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); }
.day-btn.active .day-icon { color: var(--accent); }
.day-info { text-align: left; flex: 1; }
.day-label { display: block; font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: .8px; }
.day-btn.active .day-label { color: var(--accent); }
.day-date { display: block; font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px; }
.day-badge { font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 6px; background: var(--accent); color: #0B0E11; white-space: nowrap; }
.day-badge.empty { background: var(--card-border); color: var(--text-tertiary); }
.day-hint { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 8px 12px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-tertiary); }

.kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
.plant-filter { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.plant-btn { background: transparent; border: 1px solid var(--card-border); color: var(--text-tertiary); padding: 6px 14px; border-radius: 8px; font-size: 11px; cursor: pointer; transition: all .15s; font-weight: 400; }
.plant-btn.active { font-weight: 700; }

.charts-grid { display: grid; gap: 22px; margin-top: 16px; min-width: 0; }
.charts-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.charts-grid > * { min-width: 0; }

.alerts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: 22px; }
.alert-card { background: var(--card-bg); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; min-height: 110px; }
.alert-card.sev-ok { border: 1px solid rgba(34,197,94,.33); }
.alert-card.sev-warn { border: 1px solid rgba(232,145,58,.33); }
.alert-card.sev-danger { border: 1px solid rgba(239,68,68,.33); }
.alert-card.sev-info { border: 1px solid rgba(59,130,246,.33); }
.alert-head { display: flex; align-items: center; gap: 8px; }
.alert-label { color: var(--text-tertiary); font-size: 10px; text-transform: uppercase; letter-spacing: .8px; font-weight: 700; }
.alert-value { font-size: 22px; font-weight: 700; letter-spacing: -.5px; line-height: 1.1; }
.sev-ok .alert-value { color: #22C55E; }
.sev-warn .alert-value { color: #E8913A; }
.sev-danger .alert-value { color: #EF4444; }
.sev-info .alert-value { color: #3B82F6; }
.alert-sub { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
.alert-detail { font-size: 10px; color: var(--text-primary); margin-top: auto; padding-top: 6px; border-top: 1px solid var(--card-border); line-height: 1.45; }

.tables-grid { display: grid; gap: 14px; }
.tables-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.tables-grid.cols-1-2 { grid-template-columns: 1fr 2fr; }
.data-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 18px; overflow: hidden; }
.card-head { font-size: 12px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 14px; }
.table-wrap { overflow-y: auto; max-height: 360px; font-size: 12px; }
.table-wrap.lg { max-height: 380px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 7px 9px; color: var(--text-tertiary); font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--card-border); position: sticky; top: 0; background: var(--card-bg); z-index: 1; }
td { padding: 6px 9px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; border-bottom: 1px solid var(--card-border); }
.r { text-align: right; }
.bold { font-weight: 700; }
.green { color: #22C55E; }
.red { color: #EF4444; }
.muted { color: var(--text-tertiary); }
.accent-text { color: var(--accent); }
.idx { color: var(--accent); font-weight: 700; }
.pill { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.no-data { color: var(--text-tertiary); font-size: 11px; padding: 24px; text-align: center; }

@media (max-width: 1024px) {
  .tables-grid.cols-3 { grid-template-columns: 1fr; }
  .tables-grid.cols-1-2 { grid-template-columns: 1fr; }
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .day-selector { flex-direction: column; }
  .day-btn { min-width: 100%; }
}
</style>