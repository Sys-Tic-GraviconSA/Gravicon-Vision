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

    <!-- Loading -->
    <div v-if="dispStore.loading" class="disp-loading-banner">
      <svg class="disp-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Cargando tareas — {{ plantaLabel }}...
    </div>
    <div v-else-if="dispStore.error" class="disp-error-banner">
      {{ dispStore.error }}
    </div>

    <template v-else>
      <!-- ========== KPIs ========== -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Tareas</div>
          <div class="kpi-value">{{ kpis.total }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pendientes</div>
          <div class="kpi-value" style="color: #a90707;">{{ kpis.pendientes }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">En Proceso</div>
          <div class="kpi-value" style="color: #b8860b;">{{ kpis.enProceso }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Completadas</div>
          <div class="kpi-value" style="color: #1f7a3d;">{{ kpis.completadas }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Días Prom. Abierta</div>
          <div class="kpi-value">{{ kpis.diasPromedio }}</div>
        </div>
      </div>

      <!-- ========== GRÁFICAS ========== -->
      <template v-if="tareasView === 'graficas'">
        <!-- Fila 1: Donut estado + Antigüedad -->
        <div class="charts-grid cols-2">
          <div class="chart-card">
            <h3 class="chart-title">Tareas por Estado</h3>
            <div class="chart-body">
              <svg v-if="porEstado.length > 0" viewBox="0 0 210 210" class="chart-svg-donut">
                <circle cx="105" cy="105" r="72" fill="none" stroke="#e6eaf0" stroke-width="22"/>
                <circle v-for="(item, i) in donutEstado" :key="i"
                  cx="105" cy="105" r="72" fill="none"
                  :stroke="item.color" stroke-width="22"
                  :stroke-dasharray="`${item.dash} 452.4`"
                  :stroke-dashoffset="item.offset"
                  stroke-linecap="butt" transform="rotate(-90 105 105)"/>
                <text x="105" y="101" text-anchor="middle" class="dona-text">{{ kpis.total }}</text>
                <text x="105" y="118" text-anchor="middle" class="dona-label">TOTAL</text>
              </svg>
              <div v-else class="empty-chart">Sin datos</div>
            </div>
            <div class="legend-row">
              <span v-for="item in porEstado" :key="item.estado" class="legend-item">
                <span class="legend-dot" :style="{ background: item.color }"></span>
                {{ item.estado }} ({{ item.count }})
              </span>
            </div>
          </div>

          <div class="chart-card">
            <h3 class="chart-title">Tareas por Antigüedad (días)</h3>
            <div class="chart-body">
              <div class="hbar-list">
                <div v-for="item in porAntiguedad" :key="item.rango" class="hbar-row">
                  <span class="hbar-label">{{ item.rango }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
                  </div>
                  <span class="hbar-val">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fila 2: Tipo vehículo + Responsable -->
        <div class="charts-grid cols-2">
          <div class="chart-card">
            <h3 class="chart-title">Tareas por Tipo de Vehículo</h3>
            <div class="chart-body">
              <div class="hbar-list">
                <div v-for="item in porTipo" :key="item.tipo" class="hbar-row">
                  <span class="hbar-label">{{ item.tipo }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill" :style="{ width: item.pct + '%', background: 'var(--navy, #172954)' }"></div>
                  </div>
                  <span class="hbar-val">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3 class="chart-title">Tareas por Responsable</h3>
            <div class="chart-body">
              <div class="hbar-list">
                <div v-for="item in porResponsable.slice(0, 10)" :key="item.responsable" class="hbar-row">
                  <span class="hbar-label">{{ item.responsable }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill" :style="{ width: item.pct + '%', background: '#1f7a3d' }"></div>
                  </div>
                  <span class="hbar-val">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ========== TABLA ========== -->
      <template v-if="tareasView === 'tabla'">
        <div class="data-card">
          <div v-if="allTareas.length === 0" class="empty-table">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Sin tareas registradas
          </div>
          <div v-else class="table-wrap">
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
                  <th class="r">Días Abierta</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in allTareas" :key="t.id" :class="t.dias > 7 ? 'alerta' : ''">
                  <td class="idx">{{ i + 1 }}</td>
                  <td class="bold accent-text">{{ t.placa }}</td>
                  <td>{{ t.tipo }}</td>
                  <td style="font-size: 12px; color: var(--text-secondary);">{{ t.actividad }}<br>{{ t.observaciones }}</td>
                  <td>{{ t.responsable }}</td>
                  <td><span class="pill" :class="pillClass(t.estado)">{{ t.estado }}</span></td>
                  <td>{{ t.fecha }}</td>
                  <td class="r"><span class="pill" :class="t.dias > 7 ? 'p-ambar' : 'p-gris'">{{ t.dias }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ========== INFORME ========== -->
      <template v-if="tareasView === 'informe'">
        <div class="data-card" style="padding: 20px;">
          <h3 class="report-block-title"><span class="title-bar"></span>Informe de Tareas — {{ plantaLabel }}</h3>
          <div class="informe-grid">
            <div class="informe-col">
              <h4>Resumen</h4>
              <ul>
                <li><strong>Total:</strong> {{ kpis.total }}</li>
                <li><strong>Pendientes:</strong> {{ kpis.pendientes }}</li>
                <li><strong>En Proceso:</strong> {{ kpis.enProceso }}</li>
                <li><strong>Completadas:</strong> {{ kpis.completadas }}</li>
                <li><strong>Días promedio abierta:</strong> {{ kpis.diasPromedio }}</li>
              </ul>
            </div>
            <div class="informe-col">
              <h4>Tareas con más de 7 días abiertas</h4>
              <ul v-if="tareasCriticas.length > 0">
                <li v-for="t in tareasCriticas" :key="t.id">
                  <strong>{{ t.placa }}</strong> — {{ t.actividad }} ({{ t.dias }} días)
                </li>
              </ul>
              <p v-else style="font-size:12px; color: var(--text-secondary);">No hay tareas críticas</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDisponibilidadStore } from '../../stores'

const props = defineProps<{
  data: Record<string, unknown>[]
  planta: string
  fechaInicio?: string
  fechaFin?: string
}>()

const dispStore = useDisponibilidadStore()
const tareasView = ref<'graficas' | 'tabla' | 'informe'>('graficas')

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

function getDias(fechaReg: Date): number {
  const nowUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  return Math.max(1, Math.floor((nowUtc - fechaReg.getTime()) / 86400000))
}

const allTareas = computed(() => {
  const tareas = dispStore.data?.tareas || []
  if (tareas.length === 0) return []

  const result: { id: string; placa: string; tipo: string; fecha: string; responsable: string; actividad: string; observaciones: string; estado: string; dias: number }[] = []

  for (const t of tareas) {
    const estado = String(t['Estado_Tarea'] ?? '').trim()
    const fechaReg = parseSerialDate(t['Fecha_Registro'])
    if (!fechaReg) continue

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

    result.push({ id, placa, tipo, fecha, responsable, actividad, observaciones, estado, dias })
  }

  result.sort((a, b) => b.dias - a.dias)
  return result
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

const porEstado = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    const e = t.estado || 'Sin estado'
    map.set(e, (map.get(e) || 0) + 1)
  }
  const colors: Record<string, string> = {
    'Pendiente': '#a90707',
    'En Proceso': '#b8860b',
    'En proceso': '#b8860b',
    'Completada': '#1f7a3d',
    'Cerrada': '#1f7a3d',
    'Cancelada': '#6b7280',
  }
  return Array.from(map.entries())
    .map(([estado, count]) => ({ estado, count, color: colors[estado] || '#172954' }))
    .sort((a, b) => b.count - a.count)
})

const donutEstado = computed(() => {
  const total = kpis.value.total || 1
  let acc = 0
  return porEstado.value.map(item => {
    const dash = (item.count / total) * 452.4
    const offset = -(acc * 452.4 / total)
    acc += item.count
    return { ...item, dash, offset }
  })
})

const porAntiguedad = computed(() => {
  const ranges = [
    { label: '1-3 días', min: 1, max: 3, color: '#1f7a3d' },
    { label: '4-7 días', min: 4, max: 7, color: '#b8860b' },
    { label: '8-14 días', min: 8, max: 14, color: '#e67e22' },
    { label: '15-30 días', min: 15, max: 30, color: '#a90707' },
    { label: '> 30 días', min: 31, max: Infinity, color: '#7f1d1d' },
  ]
  const counts = ranges.map(r => ({
    rango: r.label,
    count: allTareas.value.filter(t => t.dias >= r.min && t.dias <= r.max).length,
    color: r.color,
  }))
  const maxCount = Math.max(...counts.map(c => c.count), 1)
  return counts.map(c => ({ ...c, pct: (c.count / maxCount) * 100 }))
})

const porTipo = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    const tipo = t.tipo || 'Otro'
    map.set(tipo, (map.get(tipo) || 0) + 1)
  }
  const items = Array.from(map.entries())
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...items.map(i => i.count), 1)
  return items.map(i => ({ ...i, pct: (i.count / maxCount) * 100 }))
})

const porResponsable = computed(() => {
  const map = new Map<string, number>()
  for (const t of allTareas.value) {
    const r = t.responsable || 'Sin asignar'
    map.set(r, (map.get(r) || 0) + 1)
  }
  const items = Array.from(map.entries())
    .map(([responsable, count]) => ({ responsable, count }))
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...items.map(i => i.count), 1)
  return items.map(i => ({ ...i, pct: (i.count / maxCount) * 100 }))
})

const tareasCriticas = computed(() => allTareas.value.filter(t => t.dias > 7).slice(0, 15))

function pillClass(estado: string): string {
  if (estado === 'Pendiente') return 'p-rojo'
  if (estado === 'En Proceso' || estado === 'En proceso') return 'p-ambar'
  if (estado === 'Completada' || estado === 'Cerrada') return 'p-verde'
  return 'p-gris'
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

/* ===== Toggle de vistas ===== */
.almacen-view-toggle {
  display: flex;
  gap: 8px;
}
.av-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.av-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent, #3b82f6);
}
.av-btn.active {
  color: #ffffff;
  background: var(--navy, #172954);
  border-color: var(--navy, #172954);
}

/* ===== Banners de estado ===== */
.disp-loading-banner,
.disp-error-banner {
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
@keyframes disp-spin {
  to { transform: rotate(360deg); }
}
.disp-spinner {
  animation: disp-spin 0.9s linear infinite;
  flex-shrink: 0;
}

/* ===== KPIs ===== */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.kpi-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  padding: 14px 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.kpi-label {
  font-size: 10px;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.kpi-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
  color: var(--text-primary, #1e293b);
}

/* ===== Gráficas ===== */
.charts-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}
.charts-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}
.charts-grid.cols-1 {
  grid-template-columns: 1fr;
}
.chart-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary, #1e293b);
  letter-spacing: -0.2px;
}
.chart-body {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-svg-donut { width: 160px; height: 160px; }
.dona-text { font-size: 26px; font-weight: 700; fill: var(--text-primary, #1e293b); }
.dona-label { font-size: 10px; fill: var(--text-secondary, #64748b); text-transform: uppercase; }

.legend-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary, #64748b); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }

.hbar-list { width: 100%; }
.hbar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hbar-label { font-size: 11px; color: var(--text-secondary, #64748b); min-width: 90px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hbar-track { flex: 1; height: 14px; background: #e6eaf0; border-radius: 4px; overflow: hidden; }
.hbar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
.hbar-val { font-size: 11px; font-weight: 600; color: var(--text-primary, #1e293b); min-width: 24px; }
.empty-chart { color: var(--text-secondary, #64748b); font-size: 13px; }

/* ===== Tabla ===== */
.data-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.table-wrap { overflow-x: hidden; }
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: inherit;
  table-layout: auto;
}
.table-wrap thead tr { background: var(--card-bg-hover, #f9fafb); }
.table-wrap th {
  padding: 8px 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap;
}
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.table-wrap td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--card-border);
  color: var(--text-primary);
  vertical-align: middle;
  font-size: 12px;
  word-break: break-word;
}
.table-wrap tbody tr:last-child td { border-bottom: none; }
.table-wrap tbody tr:hover { background: var(--card-bg-hover, #f9fafb); }
.table-wrap .idx { color: var(--text-secondary); font-size: 12px; width: 28px; white-space: nowrap; }
.table-wrap .idx-col { width: 28px; white-space: nowrap; }
.table-wrap .bold { font-weight: 700; }
.table-wrap .accent-text { color: var(--navy, #172954); }
.table-wrap .red { color: #ef4444; font-weight: 700; }
.table-wrap .yellow { color: #f59e0b; font-weight: 600; }
.table-wrap .green { color: #10b981; font-weight: 700; }
.table-wrap tr.alerta td { background: #fdf1f1; }
.table-wrap tr.alerta td:first-child { box-shadow: inset 3px 0 0 #a90707; }

.empty-table {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  color: var(--text-secondary);
  font-size: 13px;
  justify-content: center;
}

/* ===== Pills ===== */
.pill {
  display: inline-block;
  padding: 1.5px 7px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.p-ambar { background: #fbf3e0; color: #b8860b; }
.p-gris { background: #eef1f4; color: #5b6b82; }

/* ===== Informe ===== */
.report-block-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.title-bar {
  width: 3px;
  height: 16px;
  background: var(--navy, #172954);
  border-radius: 2px;
}
.informe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.informe-col h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary, #1e293b); }
.informe-col ul { list-style: none; padding: 0; margin: 0; }
.informe-col li { font-size: 12px; color: var(--text-secondary, #475569); margin-bottom: 4px; }

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .informe-grid { grid-template-columns: 1fr; }
}
</style>
