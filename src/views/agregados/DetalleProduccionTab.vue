<template>
  <div class="ots-section">
    <div class="ots-bar">
      <div class="ots-stats">
        <span><strong>{{ data.length }}</strong> registros</span>
        <span class="ots-dot"></span>
        <span>Producción total <strong>{{ fmt(totalM3) }} m³</strong></span>
        <template v-if="periodo"><span class="ots-dot"></span><span>{{ periodo }}</span></template>
      </div>
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
 * DetalleProduccionTab.vue — Detalle diario de producción de una planta de agregados.
 * Ruta: /:planta/produccion/detalles. Muestra los días del período del filtro de fechas de arriba
 * (sin filtros propios). Las columnas de líneas salen de la configuración de la planta.
 */
import { computed } from 'vue'
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

const fechaLarga = (serial: number) => serialToDate(serial).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const seriales = computed(() => props.data.map(r => Number(r['Fecha'])).filter(Boolean).sort((a, b) => a - b))
/** Período mostrado (el del filtro de arriba, recortado a los días con registro) */
const periodo = computed(() => {
  const f = seriales.value
  if (!f.length) return ''
  return f.length === 1 ? fechaLarga(f[0]) : `${fechaLarga(f[0])} al ${fechaLarga(f[f.length - 1])}`
})

const filasPeriodo = computed(() => props.data
  .filter(r => Number(r['Fecha']))
  .sort((a, b) => Number(a['Fecha']) - Number(b['Fecha']))
  .map(r => {
    const serial = Number(r['Fecha'])
    const total = Number(r['Total de M³']) || 0
    const proyectado = Number(r['M³ Proyectado']) || 0
    const lineas = Object.fromEntries(props.config.lines.map(l => [l.label, Number(r[l.key]) || 0]))
    return {
      Fecha: fechaLarga(serial),
      ...lineas,
      'Total de M³': total,
      'M³ Proyectado': proyectado,
      'Diferencia': total - proyectado,
      '% Cumplimiento': r['% Cumplimiento'] ?? '',
    }
  }))

// La tabla (DataTable) trae su propio buscador
const filas = filasPeriodo

/** Exporta el período filtrado a .xlsx: "Produccion <Planta> - <desde> a <hasta>.xlsx" */
function exportarXlsx() {
  const headers = filas.value.length ? Object.keys(filas.value[0]) : []
  const rows = filas.value.map(r => headers.map(h => (r as Record<string, unknown>)[h] ?? ''))
  const f = seriales.value
  const iso = (n: number) => serialToDate(n).toISOString().slice(0, 10)
  const nombre = !f.length ? 'Periodo' : f.length === 1 ? iso(f[0]) : `${iso(f[0])} a ${iso(f[f.length - 1])}`
  downloadXlsx(buildXlsx([{ name: 'Detalle Diario', headers, rows }]), `Produccion ${props.config.plantName} - ${nombre}.xlsx`)
}
</script>

<style scoped>
.ots-section { display: flex; flex-direction: column; gap: 12px; }
.ots-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ots-stats { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.ots-stats strong { color: var(--text-primary); }
.ots-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-tertiary); opacity: .4; }

</style>
