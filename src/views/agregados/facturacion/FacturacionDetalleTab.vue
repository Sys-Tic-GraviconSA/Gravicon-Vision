<template>
  <div class="fact-detalle">
    <div class="resumen-barra">
      <span><strong>{{ fmtN(lineas.length, 0) }}</strong> líneas</span>
      <span class="punto"></span>
      <span><strong>{{ fmtN(docs, 0) }}</strong> documentos</span>
      <span class="punto"></span>
      <span>Venta <strong>{{ cop(R.venta) }}</strong></span>
      <span class="punto"></span>
      <span>Despachado <strong>{{ fmtN(R.tDespachadas, 1) }} t</strong></span>
    </div>
    <DataTable
      :title="`Despacho ${planta} — detalle por línea`"
      :data="filas"
      :page-size="25"
      small selectColumns exportColumns
      :initially-hidden="['NIT', 'Ficha', 'Título minero', 'Ítem']"
      :badge-fields="['Tipo']"
      :on-export="exportar"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionDetalleTab.vue — Líneas de facturación una por una (/:planta/facturacion/detalle).
 * Muestra lo registrado en Novasoft junto con la conversión a toneladas; exporta a Excel lo visible.
 */
import { computed } from 'vue'
import DataTable from '../../../components/dashboard/DataTable.vue'
import { fmtN, cop } from '../../../composables/useGraficasConcreto'
import { resumen, nombreCliente, nombreMaterial } from '../../../composables/useFacturacion'
import { buildXlsx, downloadXlsx } from '../../../utils/xlsx'
import type { LineaFacturacion } from '../../../types/facturacion'

const props = defineProps<{
  lineas: LineaFacturacion[]
  /** Líneas con todos los filtros menos el de fechas (lo usa el informe) */
  lineasSinFecha?: LineaFacturacion[]
  planta: string
  plantaId: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  subtipos: Record<string, string>
}>()

const TIPO = { venta: 'Venta', traslado: 'Traslado', donacion: 'Donación' } as const
const R = computed(() => resumen(props.lineas))
const docs = computed(() => new Set(props.lineas.map(l => l.doc)).size)

const filas = computed(() => [...props.lineas]
  .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.doc.localeCompare(b.doc))
  .map(l => ({
    'Fecha': l.fecha,
    'Documento': l.doc,
    'Subtipo': `${l.subtipo} · ${props.subtipos[l.subtipo] ?? 'Otro'}`,
    'Tipo': TIPO[l.tipo],
    'Cliente': l.tipo === 'traslado' ? '—' : nombreCliente(l.cliente),
    'NIT': l.nit || '—',
    'Material': nombreMaterial(l.producto),
    'Familia': l.familia,
    'Ítem': l.item,
    'Registrado en': l.registrado,
    'Cantidad': +l.cantidad.toFixed(2),
    'Factor': l.factor === 1 ? '—' : `× ${l.factor.toLocaleString('es-CO')}${l.factorPropio ? '' : ' (defecto)'}`,
    'Toneladas': +l.toneladas.toFixed(2),
    'Valor': Math.round(l.total),
    '$ por t': l.toneladas > 0 && l.total > 0 ? Math.round(l.total / l.toneladas) : '—',
    'Placa': l.placa || '—',
    'Ficha': l.ficha || '—',
    'Título minero': l.tituloMinero || '—',
  })))

/** Exporta todas las líneas filtradas (no solo la página visible) */
function exportar() {
  const headers = filas.value.length ? Object.keys(filas.value[0]) : []
  const rows = filas.value.map(r => headers.map(h => (r as Record<string, unknown>)[h] ?? ''))
  const fechas = props.lineas.map(l => l.fecha).sort()
  const periodo = fechas.length ? (fechas[0] === fechas.at(-1) ? fechas[0] : `${fechas[0]} a ${fechas.at(-1)}`) : 'sin datos'
  downloadXlsx(buildXlsx([{ name: 'Despacho', headers, rows }]), `Despacho ${props.planta} - ${periodo}.xlsx`)
}
</script>

<style scoped>
.fact-detalle { display: flex; flex-direction: column; gap: 12px; }
.resumen-barra { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary); }
.resumen-barra strong { color: var(--text-primary); }
.punto { width: 4px; height: 4px; border-radius: 50%; background: var(--text-tertiary); opacity: .4; }
</style>
