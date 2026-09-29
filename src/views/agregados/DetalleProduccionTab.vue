<template>
  <div class="ots-section">
    <div class="ots-bar">
      <div class="ots-stats">
        <span><strong>{{ data.length }}</strong> registros</span>
        <span class="ots-dot"></span>
        <span>Producción total <strong>{{ fmt(totalM3) }} m³</strong></span>
      </div>
    </div>
    <div class="month-nav">
      <button class="month-nav-btn" :disabled="mesIdx <= 0" aria-label="Mes anterior" @click="mesIdx--">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="month-label">{{ meses[mesIdx]?.label ?? '' }}</span>
      <button class="month-nav-btn" :disabled="mesIdx >= meses.length - 1" aria-label="Mes siguiente" @click="mesIdx++">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <DataTable
      :title="`Producción ${config.plantName} — Detalle Diario`"
      :data="filas"
      :page-size="31"
      :percentFields="['% Cumplimiento']"
      :semaphoreFields="['% Cumplimiento']"
      small selectColumns exportColumns
      :on-export="exportarXlsx"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * DetalleProduccionTab.vue — Detalle diario de producción de una planta de agregados, mes a mes.
 * Ruta: /:planta/produccion/detalles. Las columnas de líneas salen de la configuración de la planta.
 */
import { ref, computed, watch } from 'vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import { serialToDate } from '../../utils/dates'
import { fmt } from '../../utils/format'
import { buildXlsx, downloadXlsx } from '../../utils/xlsx'
import type { PlantConfig } from './ResumenTab.vue'

const props = defineProps<{
  config: PlantConfig
  /** Filas diarias ya filtradas por fecha */
  data: Record<string, unknown>[]
}>()

const totalM3 = computed(() => props.data.reduce((s, r) => s + (Number(r['Total de M³']) || 0), 0))

const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const meses = computed(() => {
  const map = new Map<string, { label: string; first: number }>()
  for (const r of props.data) {
    const fecha = Number(r['Fecha'])
    if (!fecha) continue
    const d = serialToDate(fecha)
    const k = claveMes(d)
    const prev = map.get(k)
    if (!prev || fecha < prev.first) {
      const txt = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      map.set(k, { label: txt.charAt(0).toUpperCase() + txt.slice(1), first: fecha })
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, v]) => ({ key, ...v }))
})

// Se abre en el mes más reciente
const mesIdx = ref(0)
watch(meses, m => { mesIdx.value = Math.max(0, m.length - 1) }, { immediate: true })

const filasMes = computed(() => {
  const mes = meses.value[mesIdx.value]
  if (!mes) return []
  return props.data
    .filter(r => { const f = Number(r['Fecha']); return f && claveMes(serialToDate(f)) === mes.key })
    .map(r => {
      const serial = Number(r['Fecha'])
      const total = Number(r['Total de M³']) || 0
      const proyectado = Number(r['M³ Proyectado']) || 0
      const lineas = Object.fromEntries(props.config.lines.map(l => [l.label, Number(r[l.key]) || 0]))
      return {
        Fecha: serialToDate(serial).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
        ...lineas,
        'Total de M³': total,
        'M³ Proyectado': proyectado,
        'Diferencia': total - proyectado,
        '% Cumplimiento': r['% Cumplimiento'] ?? '',
      }
    })
})

// La tabla (DataTable) trae su propio buscador
const filas = filasMes

/** Exporta el mes visible a .xlsx: "Produccion <Planta> - <Mes> <Año>.xlsx" */
function exportarXlsx() {
  const headers = filas.value.length ? Object.keys(filas.value[0]) : []
  const rows = filas.value.map(r => headers.map(h => (r as Record<string, unknown>)[h] ?? ''))
  const mes = meses.value[mesIdx.value]
  let periodo = 'Periodo'
  if (mes) {
    const d = serialToDate(mes.first)
    const nombre = d.toLocaleDateString('es-CO', { month: 'long', timeZone: 'UTC' })
    periodo = `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${d.getUTCFullYear()}`
  }
  downloadXlsx(buildXlsx([{ name: 'Detalle Diario', headers, rows }]), `Produccion ${props.config.plantName} - ${periodo}.xlsx`)
}
</script>

<style scoped>
.ots-section { display: flex; flex-direction: column; gap: 12px; }
.ots-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ots-stats { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.ots-stats strong { color: var(--text-primary); }
.ots-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-tertiary); opacity: .4; }
.month-nav { display: flex; align-items: center; gap: 12px; }
.month-label { font-size: 15px; font-weight: 600; color: var(--text-primary); min-width: 160px; text-align: center; }
.month-nav-btn {
  display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
  border: 1px solid var(--card-border); border-radius: var(--radius-sm); background: var(--card-bg); color: var(--text-secondary); cursor: pointer;
}
.month-nav-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
.month-nav-btn:disabled { opacity: .4; cursor: not-allowed; }

</style>
