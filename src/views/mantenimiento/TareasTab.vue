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
      <button class="disp-retry-btn" @click="dispStore.fetchDisponibilidad(plantaKey, true)">Reintentar</button>
    </div>

    <template v-else>
      <!-- ========== KPIs ========== -->
      <div class="kpi-row">
        <KpiCard label="Total Tareas" accent="#15223c" icon="layers" :value="String(kpis.total)" />
        <KpiCard label="Pendientes" accent="#EF4444" icon="alert-circle" :value="String(kpis.pendientes)" />
        <KpiCard label="En Proceso" accent="#F59E0B" icon="clock" :value="String(kpis.enProceso)" />
        <KpiCard label="Completadas" accent="#10B981" icon="check-circle" :value="String(kpis.completadas)" />
        <KpiCard label="Días Prom. Abierta" accent="#8B5CF6" icon="calendar" :value="String(kpis.diasPromedio)" />
      </div>

      <!-- ========== GRÁFICAS ========== -->
      <template v-if="tareasView === 'graficas'">
        <div class="charts-grid cols-2">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-header-text">
                <h3 class="chart-title">Tareas por Estado</h3>
                <p class="chart-desc">Distribución de tareas según su estado actual</p>
              </div>
            </div>
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
            <div class="chart-header">
              <div class="chart-header-text">
                <h3 class="chart-title">Tareas por Antigüedad</h3>
                <p class="chart-desc">Cantidad de tareas agrupadas por días abiertos</p>
              </div>
            </div>
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

        <div class="charts-grid cols-2">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-header-text">
                <h3 class="chart-title">Tareas por Tipo de Vehículo</h3>
                <p class="chart-desc">Desglose de tareas según categoría de equipo</p>
              </div>
            </div>
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
            <div class="chart-header">
              <div class="chart-header-text">
                <h3 class="chart-title">Tareas por Responsable</h3>
                <p class="chart-desc">Top responsables con más tareas asignadas</p>
              </div>
            </div>
            <div class="chart-body">
              <div class="hbar-list">
                <div v-for="item in porResponsable.slice(0, 10)" :key="item.responsable" class="hbar-row">
                  <span class="hbar-label">{{ item.responsable }}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill" :style="{ width: item.pct + '%', background: '#10B981' }"></div>
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

          <div class="data-card">
            <div v-if="allTareas.length === 0" class="empty-table">Sin tareas registradas</div>
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
        </div>
      </template>

      <!-- ========== INFORME ========== -->
      <template v-if="tareasView === 'informe'">
        <div class="informe-control-bar">
          <div class="icb-info">
            <span class="icb-tag">Informe</span>
            <span class="icb-title">Tareas de Seguimiento — {{ plantaLabel }}</span>
          </div>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis de Tareas</div>
            <div class="zoho-analysis-text" v-if="allTareas.length > 0">
              Se registran <strong>{{ allTareas.length }} tareas</strong> en total,
              de las cuales <strong>{{ kpis.pendientes }}</strong> se encuentran pendientes,
              <strong>{{ kpis.enProceso }}</strong> en proceso y <strong>{{ kpis.completadas }}</strong> completadas.
              El tiempo promedio de apertura es de <strong>{{ kpis.diasPromedio }} días</strong>.
              <template v-if="tareasCriticas.length > 0">
                Hay <strong style="color:#ef4444;">{{ tareasCriticas.length }} tareas</strong> con más de 7 días abiertas, lo que requiere atención inmediata.
              </template>
              <template v-else>
                No existen tareas críticas con más de 7 días de apertura.
              </template>
            </div>
            <div class="zoho-analysis-text" v-else>No hay tareas registradas para esta planta en el corte seleccionado.</div>
          </div>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Tareas con más de 7 días abiertas ({{ tareasCriticas.length }})</h3>
          <div class="data-card">
            <div v-if="tareasCriticas.length === 0" class="empty-table">No hay tareas críticas</div>
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
                    <td style="font-size: 12px; color: var(--text-secondary);">{{ t.actividad }}</td>
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
          <h3 class="report-block-title"><span class="title-bar"></span>Todas las Tareas ({{ allTareas.length }})</h3>
          <div class="data-card">
            <div v-if="allTareas.length === 0" class="empty-table">Sin tareas registradas</div>
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
                    <th class="r">Días</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(t, i) in allTareas" :key="t.id" :class="t.dias > 7 ? 'alerta' : ''">
                    <td class="idx">{{ i + 1 }}</td>
                    <td class="bold accent-text">{{ t.placa }}</td>
                    <td>{{ t.tipo }}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">{{ t.actividad }}</td>
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
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDisponibilidadStore } from '../../stores'
import KpiCard from '../../components/dashboard/KpiCard.vue'

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
    'Pendiente': '#EF4444',
    'En Proceso': '#F59E0B',
    'En proceso': '#F59E0B',
    'Completada': '#10B981',
    'Cerrada': '#10B981',
    'Cancelada': '#6B7280',
  }
  return Array.from(map.entries())
    .map(([estado, count]) => ({ estado, count, color: colors[estado] || '#3B82F6' }))
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
    { label: '1-3 días', min: 1, max: 3, color: '#10B981' },
    { label: '4-7 días', min: 4, max: 7, color: '#F59E0B' },
    { label: '8-14 días', min: 8, max: 14, color: '#F97316' },
    { label: '15-30 días', min: 15, max: 30, color: '#EF4444' },
    { label: '> 30 días', min: 31, max: Infinity, color: '#991B1B' },
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

/* ===== Toggle de vistas (mismo estilo que DisponibilidadTab) ===== */
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

/* ===== KPIs (usa componente KpiCard — estilos en KpiCard.vue) ===== */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

/* ===== Gráficas (mismo estilo que DisponibilidadTab) ===== */
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
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 10px);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.2px;
}
.chart-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0;
  line-height: 1.4;
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

/* ===== Data Card (mismo estilo que EquiposDashboard Maquinaria) ===== */
.data-card {
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
}
.card-head {
  padding: 6px 10px;
  background: #f8fafc;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
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
.red { color: #dc2626; }
.green { color: #16a34a; }
.yellow { color: #b8860b; }

.table-total-row td {
  background: #f1f5f9 !important;
  font-weight: 700 !important;
  border-top: 2px solid var(--card-border, #cbd5e1) !important;
}

.table-wrap tr.alerta td { background: #fdf1f1; }
.table-wrap tr.alerta td:first-child { box-shadow: inset 3px 0 0 #a90707; }

.empty-table {
  text-align: center;
  padding: 12px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

/* ===== Pills (mismo estilo que EquiposDashboard) ===== */
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

/* ===== Informe (mismo estilo que DisponibilidadTab) ===== */
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
.report-section-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

/* ===== ots-bar / stats bar (estilo Maquinaria) ===== */
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

/* ===== zoho-analysis-box (estilo EquiposDashboard informe) ===== */
.zoho-analysis-box {
  background-color: var(--card-bg-hover, #f8fafc);
  padding: 14px 18px;
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

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .charts-grid.cols-2 { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .almacen-view-toggle { flex-wrap: wrap; }
}
</style>
