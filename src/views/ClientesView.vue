<template>
  <div class="page-layout">
    <div v-if="client.loading && !client.data" class="loading-state">Cargando datos de clientes...</div>
    <div v-else-if="client.error && !client.data" class="error-state">{{ client.error }}</div>
    <div v-else>
      <div class="sticky-top">
        <header class="page-header">
          <h2 class="page-title">Clientes</h2>
          <div class="header-actions">
            <div class="filter-group">
              <MultiSelect v-model="selectedMonths" :options="months" label="Meses" icon="calendar" />
              <MultiSelect v-model="selectedPlants" :options="plants" label="Plantas" icon="filter" />
            </div>
          </div>
        </header>
      </div>

      <div class="kpi-row">
        <KpiCard label="Total M³ Real" accent="#3B82F6" icon="package">{{ fmtLocal(client.totalReal) }}</KpiCard>
        <KpiCard label="Total M³ Proyectado" accent="#8B5CF6" icon="target">{{ fmtLocal(client.totalProyectado) }}</KpiCard>
        <KpiCard label="Diferencia" :accent="client.totalDiferencia >= 0 ? '#10B981' : '#EF4444'" icon="trending-up">
          {{ client.totalDiferencia >= 0 ? '+' : '' }}{{ fmtLocal(client.totalDiferencia) }}
        </KpiCard>
        <KpiCard label="Ritmo Esperado" accent="#F59E0B" icon="clock" :meta="`Día ${client.diasTranscurridos} de ${client.diasDelMes}`">
          {{ fmtLocal(Math.round(client.ritmoEsperado)) }}
        </KpiCard>
        <KpiCard label="Desviación de Ritmo" :accent="client.desviacionRitmo >= 0 ? '#10B981' : '#EF4444'" icon="activity">
          {{ client.desviacionRitmo >= 0 ? '+' : '' }}{{ fmtLocal(Math.round(client.desviacionRitmo)) }}
        </KpiCard>
        <KpiCard label="% Cumplimiento" :accent="filteredCumplimiento >= 100 ? '#10B981' : '#EF4444'" icon="check-circle">
          {{ filteredCumplimiento }}%
        </KpiCard>
      </div>

      <div class="charts-grid cols-2">
        <ChartCard title="Distribución por Planta" :option="plantaPieOpt" />
        <ChartCard title="Evolución por Planta" :option="plantaLineOpt" />
        <ChartCard title="Total Real vs Meta" :option="totalLineOpt" />
      </div>

      <div class="section-divider"></div>
      <DataTable title="Resumen por Planta" :data="plantaTable" :page-size="999" :percentFields="['% Cumplimiento', '% Participacion']" :semaphoreFields="['% Cumplimiento']" small :highlightField="'_total'" />

      <div class="section-divider"></div>
      <DataTable title="Resumen por Cliente Proyectado" :data="clienteTable" :page-size="999" :excludeFields="['esCalle']" :percentFields="['% Cumplimiento', '% Participacion']" :semaphoreFields="['% Cumplimiento']" small :highlightField="'esCalle'" />

      <div class="section-divider"></div>
      <DataTable title="Resumen Cliente de Calle" :data="calleTable" :page-size="999" :percentFields="['% Participacion']" small :highlightField="'_total'" />

      <div class="section-divider"></div>
      <h3 class="section-title">Matriz Ejecutiva Mensual</h3>

        <!-- Executive summary row -->
        <div class="exec-summary">
          <div class="exec-item">
            <span class="exec-label">Total Proyectado</span>
            <span class="exec-value">{{ fmtLocal(matrixTotals.totalProy) }}</span>
          </div>
          <div class="exec-item">
            <span class="exec-label">Total Ejecutado</span>
            <span class="exec-value">{{ fmtLocal(matrixTotals.totalReal) }}</span>
          </div>
          <div class="exec-item">
            <span class="exec-label">Diferencia</span>
            <span class="exec-value" :class="matrixTotals.diferencia >= 0 ? 'pos' : 'neg'">
              {{ matrixTotals.diferencia >= 0 ? '+' : '' }}{{ fmtLocal(matrixTotals.diferencia) }}
            </span>
          </div>
          <div class="exec-item">
            <span class="exec-label">% Cumplimiento General</span>
            <div class="exec-pct-row">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: Math.min(matrixTotals.cumplimiento * 100, 100) + '%', background: matrixTotals.cumplimiento >= 1 ? 'var(--success)' : matrixTotals.cumplimiento >= 0.9 ? '#F59E0B' : 'var(--danger)' }"></div>
              </div>
              <span class="pct-badge" :class="pctClass(matrixTotals.cumplimiento)">{{ (matrixTotals.cumplimiento * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <div class="matrix-wrapper">
          <div class="matrix-scroll">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th class="sticky-col">Planta</th>
                  <th v-for="(m, mi) in filteredMatrix.meses" :key="m" class="month-group" :class="mi % 2 === 0 ? 'month-alt' : ''" :colspan="4">
                    {{ m }}
                  </th>
                  <th class="total-group" colspan="4">Totales Anuales</th>
                </tr>
                <tr>
                  <th class="sticky-col"></th>
                  <template v-for="(m, mi) in filteredMatrix.meses" :key="'h-' + m">
                    <th class="sub-header proy" :class="mi % 2 === 0 ? 'month-alt' : ''">Proy</th>
                    <th class="sub-header real" :class="mi % 2 === 0 ? 'month-alt' : ''">Ejec</th>
                    <th class="sub-header dif" :class="mi % 2 === 0 ? 'month-alt' : ''">Dif</th>
                    <th class="sub-header pct" :class="mi % 2 === 0 ? 'month-alt' : ''">%</th>
                  </template>
                  <th class="sub-header proy">Proy</th>
                  <th class="sub-header real">Ejec</th>
                  <th class="sub-header">Dif</th>
                  <th class="sub-header pct">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredMatrix.rows" :key="row.planta">
                  <td class="sticky-col plant-name">
                    <span class="plant-dot" :style="{ background: colorMap[row.planta] }"></span>
                    {{ row.planta }}
                  </td>
                  <template v-for="(m, mi) in row.meses" :key="'d-' + mi">
                    <td class="num" :class="mi % 2 === 0 ? 'month-alt' : ''">{{ m.proy ? fmtLocal(m.proy) : '—' }}</td>
                    <td class="num" :class="mi % 2 === 0 ? 'month-alt' : ''">{{ m.real ? fmtLocal(m.real) : '—' }}</td>
                    <td class="num" :class="[(m.real - m.proy) >= 0 ? 'pos' : 'neg', mi % 2 === 0 ? 'month-alt' : '']">
                      {{ m.proy > 0 || m.real > 0 ? ((m.real - m.proy) >= 0 ? '+' : '') + fmtLocal(m.real - m.proy) : '—' }}
                    </td>
                    <td class="num month-end" :class="mi % 2 === 0 ? 'month-alt' : ''">
                      <span v-if="m.proy > 0 && m.real > 0" class="mini-badge" :class="miniClass(m.real / m.proy)">{{ (m.real / m.proy * 100).toFixed(0) }}%</span>
                      <span v-else-if="m.proy > 0 && m.real === 0" class="mini-badge mini-none">Sin ej.</span>
                      <span v-else-if="m.proy === 0 && m.real > 0" class="mini-badge mini-err">Sin proy.</span>
                      <span v-else class="mini-badge mini-none">—</span>
                    </td>
                  </template>
                  <td class="num total-val">{{ fmtLocal(row.totalProy) }}</td>
                  <td class="num total-val">{{ fmtLocal(row.totalReal) }}</td>
                  <td class="num total-val" :class="row.diferencia >= 0 ? 'pos' : 'neg'">{{ row.diferencia >= 0 ? '+' : '' }}{{ fmtLocal(row.diferencia) }}</td>
                  <td class="num">
                    <div class="pct-cell">
                      <div class="mini-bar">
                        <div class="mini-fill" :style="{ width: Math.min(row.cumplimiento * 100, 100) + '%', background: row.cumplimiento >= 1 ? 'var(--success)' : row.cumplimiento >= 0.9 ? '#F59E0B' : 'var(--danger)' }"></div>
                      </div>
                      <span class="pct-badge" :class="pctClass(row.cumplimiento)">{{ (row.cumplimiento * 100).toFixed(1) }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
  </div>
</template>

/**
 * ClientesView.vue — Dashboard de proyección vs. real por cliente y planta.
 * Usa useClientesStore para obtener datos de proyecciones y calcula
 * cumplimiento global, ritmo esperado, desglose por planta, ranking de clientes,
 * y evolución mensual con filtros por mes y planta.
 */
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClientesStore } from '../stores'
import ChartCard from '../components/dashboard/ChartCard.vue'
import DataTable from '../components/dashboard/DataTable.vue'
import KpiCard from '../components/dashboard/KpiCard.vue'
import MultiSelect from '../components/ui/MultiSelect.vue'

const client = useClientesStore()

onMounted(async () => {
  await client.fetchData()
  if (client.data && months.value.length > 0) {
    selectedMonths.value = new Set(months.value)
    selectedPlants.value = new Set(plants.value)
  }
})

function fmtLocal(n: number) {
  return Number.isInteger(n) ? n.toLocaleString('es-CO') : n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function pctClass(v: number) {
  if (v >= 1) return 'pct-high'
  if (v >= 0.9) return 'pct-mid'
  return 'pct-low'
}
function miniClass(v: number) {
  if (v >= 1) return 'mini-high'
  if (v >= 0.9) return 'mini-mid'
  if (v > 0) return 'mini-low'
  return 'mini-none'
}

const months = computed(() =>
  (client.resumenMensual ?? []).map(m => m.mes)
)

const plants = computed(() =>
  client.plantas.map(p => p.replace('Planta ', ''))
)

const selectedMonths = ref(new Set<string>())
const selectedPlants = ref(new Set<string>())

function filterRows(rows: Record<string, unknown>[]) {
  return rows.filter(r => {
    const fecha = new Date(String(r.fecha ?? ''))
    if (isNaN(fecha.getTime())) return false
    const mes = fecha.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    const planta = String(r.planta ?? '').replace('Planta ', '')
    return selectedMonths.value.has(mes) && selectedPlants.value.has(planta)
  })
}

const filteredProyectadoRows = computed(() => filterRows(client.proyectadoRows))
const filteredAllRows = computed(() => filterRows(client.allRows))

const filteredTotalReal = computed(() =>
  filteredProyectadoRows.value.reduce((s, r) => s + (Number(r.cantidad_m3) || 0), 0)
)

const filteredTotalProyectado = computed(() =>
  filteredProyectadoRows.value.reduce((s, r) => s + (Number(r.m3_proyectado) || 0), 0)
)

const filteredCumplimiento = computed(() =>
  filteredTotalProyectado.value > 0
    ? +((filteredTotalReal.value / filteredTotalProyectado.value) * 100).toFixed(1)
    : 0
)

const filteredResumenPlantas = computed(() => {
  const rows = filteredProyectadoRows.value
  const map = new Map<string, { real: number; proy: number }>()
  for (const r of rows) {
    const p = String(r.planta ?? '').replace('Planta ', '')
    if (!p) continue
    const cur = map.get(p) ?? { real: 0, proy: 0 }
    cur.real += Number(r.cantidad_m3) || 0
    cur.proy += Number(r.m3_proyectado) || 0
    map.set(p, cur)
  }
  const totalGeneral = [...map.values()].reduce((s, v) => s + v.real, 0)
  return [...map.entries()].map(([planta, v]) => ({
    planta,
    real: v.real,
    proyectado: v.proy,
    diferencia: v.real - v.proy,
    '% Cumplimiento': v.proy > 0 ? +(v.real / v.proy).toFixed(3) : 0,
    '% Participacion': totalGeneral > 0 ? +(v.real / totalGeneral).toFixed(3) : 0,
  })).sort((a, b) => b['% Cumplimiento'] - a['% Cumplimiento'])
})

const plantaTable = computed(() => {
  const d = filteredResumenPlantas.value
  if (!d.length) return d
  const sv = d.reduce((s, r) => s + r.real, 0)
  const sp = d.reduce((s, r) => s + r.proyectado, 0)
  return [...d, { _total: true, planta: 'TOTAL', real: sv, proyectado: sp, diferencia: sv - sp, '% Cumplimiento': sp > 0 ? +(sv / sp).toFixed(3) : 0, '% Participacion': 1 }]
})

const filteredResumenClientes = computed(() => {
  const map = new Map<string, { nombre: string; obra: string; real: number; proy: number; planta: string; esCalle: boolean }>()
  for (const r of filteredProyectadoRows.value) {
    const name = String(r.nombre_cliente ?? '')
    const obra = String(r.obra ?? '')
    const real = Number(r.cantidad_m3) || 0
    const proy = Number(r.m3_proyectado) || 0
    const planta = String(r.planta ?? '').replace('Planta ', '')
    if (!name) continue
    const esCalle = name.toLowerCase().includes('calle') || obra.toLowerCase().includes('calle') || String(r.tipo ?? '').toLowerCase().includes('calle')
    const key = `${name}|${planta}|${obra}`
    const cur = map.get(key) ?? { nombre: name, obra, real: 0, proy: 0, planta, esCalle }
    cur.real += real
    cur.proy += proy
    map.set(key, cur)
  }
  const totalGeneral = [...map.values()].reduce((s, v) => s + v.real, 0)
  return [...map.values()]
    .map(v => ({
      planta: v.planta, nombre: v.nombre, obra: v.obra, esCalle: v.esCalle,
      real: v.real, proyectado: v.proy,
      diferencia: v.real - v.proy,
      '% Cumplimiento': v.proy > 0 ? +(v.real / v.proy).toFixed(3) : 0,
      '% Participacion': totalGeneral > 0 ? +(v.real / totalGeneral).toFixed(3) : 0,
    }))
    .sort((a, b) => b['% Cumplimiento'] - a['% Cumplimiento'])
})

const clienteTable = computed(() => {
  const d = filteredResumenClientes.value
  if (!d.length) return d
  const sv = d.reduce((s, r) => s + r.real, 0)
  const sp = d.reduce((s, r) => s + r.proyectado, 0)
  return [...d, { _total: true, nombre: 'TOTAL', real: sv, proyectado: sp, diferencia: sv - sp, '% Cumplimiento': sp > 0 ? +(sv / sp).toFixed(3) : 0, '% Participacion': 1, planta: '', obra: '', esCalle: false }]
})

const filteredResumenCalle = computed(() => {
  const map = new Map<string, { nombre: string; real: number; planta: string; obra: string }>()
  for (const r of filteredAllRows.value) {
    const tipo = String(r.tipo ?? '')
    const name = String(r.nombre_cliente ?? '')
    const esCalle = name.toLowerCase().includes('calle')
    if (tipo !== 'Cliente de Calle' && !esCalle) continue
    const obra = String(r.obra ?? '')
    const real = Number(r.cantidad_m3) || 0
    const planta = String(r.planta ?? '').replace('Planta ', '')
    if (!name) continue
    const key = `${planta}|${obra}`
    const cur = map.get(key) ?? { nombre: name, real: 0, planta, obra }
    cur.real += real
    map.set(key, cur)
  }
  const totalGeneral = [...map.values()].reduce((s, v) => s + v.real, 0)
  return [...map.values()]
    .map(v => ({
      planta: v.planta, nombre: v.nombre, obra: v.obra,
      real: v.real,
      '% Participacion': totalGeneral > 0 ? +(v.real / totalGeneral).toFixed(3) : 0,
    }))
    .sort((a, b) => b['% Participacion'] - a['% Participacion'])
})

const calleTable = computed(() => {
  const d = filteredResumenCalle.value
  if (!d.length) return d
  const sv = d.reduce((s, r) => s + r.real, 0)
  return [...d, { _total: true, nombre: 'TOTAL', real: sv, '% Participacion': 1, planta: '', obra: '' }]
})

const filteredResumenMensual = computed(() => {
  const map = new Map<string, { real: number; proy: number }>()
  for (const r of filteredProyectadoRows.value) {
    const fecha = new Date(String(r.fecha ?? ''))
    if (isNaN(fecha.getTime())) continue
    const mes = fecha.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    const cur = map.get(mes) ?? { real: 0, proy: 0 }
    cur.real += Number(r.cantidad_m3) || 0
    cur.proy += Number(r.m3_proyectado) || 0
    map.set(mes, cur)
  }
  return [...map.entries()].map(([mes, v]) => ({ mes, ...v }))
})

const filteredMatrix = computed(() => {
  const rows = filteredProyectadoRows.value
  if (!rows.length) return { meses: [], rows: [] }

  const plantMap = new Map<string, Map<string, { real: number; proy: number }>>()
  const mesSet = new Set<string>()

  for (const r of rows) {
    const planta = String(r.planta ?? '').replace('Planta ', '')
    if (!planta) continue
    const fecha = new Date(String(r.fecha ?? ''))
    if (isNaN(fecha.getTime())) continue
    const mes = fecha.toLocaleString('es-CO', { month: 'short', year: 'numeric' })
    mesSet.add(mes)

    const meses = plantMap.get(planta) ?? new Map()
    const cur = meses.get(mes) ?? { real: 0, proy: 0 }
    cur.real += Number(r.cantidad_m3) || 0
    cur.proy += Number(r.m3_proyectado) || 0
    meses.set(mes, cur)
    plantMap.set(planta, meses)
  }

  const meses = [...mesSet].sort((a, b) => {
    const pa = a.match(/(\w+)\s+(\d+)/)
    const pb = b.match(/(\w+)\s+(\d+)/)
    if (!pa || !pb) return 0
    const ma = new Date(`${pa[1]} 1, ${pa[2]}`).getTime()
    const mb = new Date(`${pb[1]} 1, ${pb[2]}`).getTime()
    return ma - mb
  })
  const rowsData = [...plantMap.entries()].map(([planta, mesesMap]) => {
    const totalReal = [...mesesMap.values()].reduce((s, v) => s + v.real, 0)
    const totalProy = [...mesesMap.values()].reduce((s, v) => s + v.proy, 0)
    return {
      planta,
      meses: meses.map(m => mesesMap.get(m) ?? { real: 0, proy: 0 }),
      totalReal,
      totalProy,
      diferencia: totalReal - totalProy,
      cumplimiento: totalProy > 0 ? totalReal / totalProy : 0,
    }
  })

  return { meses, rows: rowsData }
})

const matrixTotals = computed(() => {
  const rows = filteredMatrix.value.rows
  const totalReal = rows.reduce((s, r) => s + r.totalReal, 0)
  const totalProy = rows.reduce((s, r) => s + r.totalProy, 0)
  return {
    totalReal,
    totalProy,
    diferencia: totalReal - totalProy,
    cumplimiento: totalProy > 0 ? totalReal / totalProy : 0,
  }
})

const filteredResumenPlantasMensual = computed(() => {
  const rows = filteredProyectadoRows.value
  if (!rows.length) return []
  const map = new Map<string, Map<string, { real: number; proy: number }>>()
  for (const r of rows) {
    const fecha = new Date(String(r.fecha ?? ''))
    if (isNaN(fecha.getTime())) continue
    const mes = fecha.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    const planta = String(r.planta ?? '').replace('Planta ', '')
    if (!planta) continue
    const mesMap = map.get(mes) ?? new Map()
    const cur = mesMap.get(planta) ?? { real: 0, proy: 0 }
    cur.real += Number(r.cantidad_m3) || 0
    cur.proy += Number(r.m3_proyectado) || 0
    mesMap.set(planta, cur)
    map.set(mes, mesMap)
  }
  return [...map.entries()].map(([mes, plantas]) => {
    const entries = [...plantas.entries()].map(([planta, v]) => ({ planta, ...v }))
    return { mes, plantas: entries }
  })
})

const colorMap: Record<string, string> = {
  'Acacias': '#3B82F6',
  'Puerto Concordia': '#10B981',
  'Restrepo': '#F59E0B',
  'Villavicencio': '#A855F7',
}

const plantaPieOpt = computed(() => {
  const data = filteredResumenPlantas.value.map(p => ({
    name: p.planta, value: p.real,
    itemStyle: { color: colorMap[p.planta] },
  }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} M³ ({d}%)' },
    series: [{
      type: 'pie', radius: ['30%', '60%'],
      data,
      label: { formatter: '{b}\n{c} M³' },
    }],
  }
})

const plantaLineOpt = computed(() => {
  const mensual = filteredResumenPlantasMensual.value
  if (!mensual.length) return {}
  const mesesArr = mensual.map(m => m.mes)
  const todasLasPlantas = [...new Set(mensual.flatMap(m => m.plantas.map(p => p.planta)))]
  const series = todasLasPlantas.map((planta) => ({
    name: planta, type: 'line', smooth: true,
    data: mensual.map(m => m.plantas.find(p => p.planta === planta)?.real ?? 0),
    lineStyle: { width: 2.5, color: colorMap[planta] },
    symbolSize: 6,
    areaStyle: { color: colorMap[planta], opacity: 0.08 },
  }))
  return {
    color: todasLasPlantas.map(p => colorMap[p]),
    tooltip: { trigger: 'axis' },
    legend: { data: todasLasPlantas, bottom: 0 },
    grid: { left: 60, right: 20, bottom: 40, top: 20 },
    xAxis: { type: 'category', data: mesesArr },
    yAxis: { type: 'value' },
    series,
  }
})

const totalLineOpt = computed(() => {
  const mesesArr = months.value
  if (!mesesArr.length) return {}
  const totals = filteredResumenMensual.value
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Real Total', 'Meta Total'], bottom: 0 },
    grid: { left: 60, right: 20, bottom: 40, top: 20 },
    xAxis: { type: 'category', data: mesesArr },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Real Total', type: 'line', smooth: true,
        data: totals.map(m => m.real),
        lineStyle: { width: 3 }, symbolSize: 7,
        areaStyle: { opacity: 0.1 },
      },
      {
        name: 'Meta Total', type: 'line', smooth: true,
        data: totals.map(m => m.proy),
        lineStyle: { width: 3, type: 'dashed' }, symbolSize: 7,
      },
    ],
  }
})
</script>

<style scoped>
.section-sub { font-size: 12px; color: var(--text-tertiary); margin: 0 0 16px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
}

.pct-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.pct-high { background: rgba(16,185,129,.12); color: #10B981; }
.pct-mid { background: rgba(245,158,11,.12); color: #F59E0B; }
.pct-low { background: rgba(239,68,68,.12); color: #EF4444; }

/* ── Executive Summary ── */
.exec-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
}
.exec-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.exec-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--text-tertiary);
}
.exec-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.exec-value.pos { color: var(--success); }
.exec-value.neg { color: var(--danger); }
.exec-pct-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-bar {
  flex: 1;
  height: 8px;
  max-width: 160px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}

/* ── Matrix Table ── */
.matrix-wrapper {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--card-bg);
}
.matrix-scroll {
  overflow-x: auto;
  overflow-y: visible;
}
.matrix-table {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;
  min-width: 700px;
}
.matrix-table thead {
  position: sticky;
  top: 0;
  z-index: 3;
}
.matrix-table th {
  text-align: center;
  padding: 8px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-secondary);
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.matrix-table th.sticky-col { text-align: left; }
.matrix-table th.month-group {
  font-size: 12px;
  text-transform: none;
  letter-spacing: normal;
  background: var(--bg-alt);
  border-right: 1px solid var(--border);
}
.matrix-table th.total-group {
  font-size: 12px;
  text-transform: none;
  letter-spacing: normal;
  background: var(--bg-alt);
  color: var(--accent);
}
.matrix-table th.sub-header { font-size: 10px; padding: 4px 6px; }
.matrix-table th.sub-header.proy { color: var(--text-tertiary); }
.matrix-table th.sub-header.real { color: var(--text-primary); font-weight: 700; }
.matrix-table th.sub-header.dif { color: #6366F1; }
.matrix-table th.sub-header.pct { color: #10B981; }
.matrix-table th.sub-header:last-child { border-right: none; }
.matrix-table .month-group { border-right: 1px solid var(--border); }
.matrix-table td {
  text-align: center;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.matrix-table td.num { text-align: right; padding: 10px 10px; font-size: 12px; }
.matrix-table td.num.total-val { font-weight: 600; color: var(--text-primary); font-size: 13px; }
.matrix-table td.num.pos { color: var(--success); }
.matrix-table td.num.neg { color: var(--danger); }
.matrix-table td.month-end { border-right: 2px solid var(--card-border); }
.matrix-table .month-alt { background: var(--bg-alt); }
.matrix-table tbody .month-alt { background: rgba(0,0,0,.015); }
.matrix-table thead .month-group.month-alt,
.matrix-table thead .month-alt { background: var(--bg-alt); }
.matrix-table .sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--card-bg);
  text-align: left;
  padding-left: 14px;
  min-width: 140px;
}
.matrix-table thead .sticky-col { background: var(--bg-subtle); z-index: 4; }
.matrix-table tbody tr:hover td { background: var(--bg-subtle); }
.matrix-table tbody tr:hover .sticky-col { background: var(--bg-subtle); }
.matrix-table tbody tr:last-child td { border-bottom: none; }

.plant-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
}
.plant-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mini-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  min-width: 36px;
  text-align: center;
}
.mini-high { background: rgba(16,185,129,.12); color: #10B981; }
.mini-mid { background: rgba(245,158,11,.12); color: #F59E0B; }
.mini-low { background: rgba(239,68,68,.12); color: #EF4444; }
.mini-none { background: var(--border); color: var(--text-tertiary); }
.mini-err { background: rgba(147,51,234,.12); color: #9333EA; }
.mini-calle { background: rgba(99,102,241,.12); color: #6366F1; }
.mini-proy { background: rgba(16,185,129,.12); color: #10B981; }

.pct-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
.mini-bar {
  width: 60px;
  height: 6px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
}
.mini-fill {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}

@media (max-width: 768px) {
  .section-sub { font-size: 11px; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .filter-group { width: 100%; }
  .exec-summary { grid-template-columns: 1fr 1fr; padding: 16px; gap: 12px; }
  .exec-value { font-size: 18px; }
  .matrix-table { min-width: 600px; }
  .matrix-table td.num { padding: 8px 6px; font-size: 11px; }
  .mini-badge { font-size: 10px; min-width: 30px; padding: 1px 4px; }
}
.loading-state {
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: var(--text-tertiary);
}
.error-state {
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: var(--danger);
}

@media (max-width: 480px) {
  .exec-summary { grid-template-columns: 1fr; }
}
</style>
