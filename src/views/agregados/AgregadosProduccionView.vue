<template>
  <div class="produccion-view">
    <SkeletonLoader v-if="cargando && !diario.length" variant="dashboard" :kpis="4" :charts="3" :label="`Cargando datos de ${planta.nombre}…`" />

    <div v-else-if="error && !diario.length" class="page-state error">
      <span class="error-icon">!</span>
      <div><strong>Error al cargar datos</strong><p>{{ error }}</p></div>
      <button class="retry-btn" @click="cargar(true)">Reintentar</button>
    </div>

    <div v-else-if="!diario.length" class="page-state"><span>No hay datos de producción para {{ planta.nombre }}.</span></div>

    <template v-else>
      <!-- Encabezado con filtros fijo arriba al desplazarse (como en Concretos y Programación) -->
      <div class="sticky-top">
      <header class="page-header">
        <h2 class="page-title">Producción {{ planta.nombre }}</h2>
        <div class="header-actions">
          <div class="filter-group">
            <FilterBar :data="diario" date-field="Fecha" :showProvider="false" :from="desde" :to="hasta" @dateRangeFilter="onFechas" />
          </div>
          <!-- «Limpiar» en la misma fila que «Actualizar» -->
          <button class="clear-filters" :class="{ oculto: !(desde || hasta) }" :tabindex="desde || hasta ? 0 : -1" :aria-hidden="!(desde || hasta)" title="Quitar filtros" @click="limpiar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Limpiar</span>
          </button>
          <button class="action-btn" :disabled="cargando" @click="cargar(true)">
            <svg class="icono-actualizar" :class="{ girando: cargando }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ cargando ? 'Actualizando…' : 'Actualizar' }}
          </button>
        </div>
      </header>
      </div>

      <RouteTabs variant="toggle" :items="vistas" :activo="vistaActiva" aria-label="Vista" replace />

      <!-- Cada vista es una ruta hija: /:planta/produccion/graficas | detalles | informe -->
      <RouterView v-slot="{ Component }">
        <Transition name="vista" mode="out-in">
          <component :is="Component" :config="config" :data="filtrado" />
        </Transition>
      </RouterView>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * AgregadosProduccionView.vue — Producción de una planta de agregados (Cuncía o Acacías).
 * Reemplaza las dos vistas copiadas que había por planta; la diferencia entre plantas
 * (líneas de producción) viene de config/plantas.ts.
 *
 * Rutas:  /:planta/produccion/graficas   → ResumenTab
 *         /:planta/produccion/detalles   → DetalleProduccionTab
 *         /:planta/produccion/informe    → InformeProduccionTab
 * Filtro de fechas en la URL (?desde=&hasta=), así sobrevive a recargar y se comparte en el enlace.
 */
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProduccionStore } from '../../stores'
import { useQueryDate } from '../../composables/useQueryState'
import { PLANTAS, VISTAS_PRODUCCION_AGREGADOS, type PlantaId } from '../../config/plantas'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import RouteTabs from '../../components/ui/RouteTabs.vue'
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import { dateToSerial } from '../../utils/dates'

const props = defineProps<{ planta: Extract<PlantaId, 'cuncia' | 'acacias'> }>()

const route = useRoute()
const store = useProduccionStore()
const planta = computed(() => PLANTAS[props.planta])
const config = computed(() => planta.value.produccion!)

const diario = computed(() => (props.planta === 'cuncia' ? store.cunciaData?.rows : store.acaciasData?.rows) ?? [])
const cargando = computed(() => store.loading)
const error = computed(() => store.error)

/** `force` (Actualizar / Reintentar) pide datos frescos saltando las cachés */
function cargar(force = false) {
  return props.planta === 'cuncia' ? store.fetchCuncia(force) : store.fetchAcacias(force)
}
onMounted(() => { if (!diario.value.length) cargar() })
watch(() => props.planta, () => { if (!diario.value.length) cargar() })

// ── Filtro de fechas (URL) ──
const desde = useQueryDate('desde')
const hasta = useQueryDate('hasta')
function onFechas(r: { from: string | null; to: string | null }) {
  desde.value = r.from ?? ''
  hasta.value = r.to ?? ''
}
function limpiar() {
  desde.value = ''
  hasta.value = ''
}
const filtrado = computed(() => {
  const ini = desde.value ? dateToSerial(desde.value) : -Infinity
  const fin = hasta.value ? dateToSerial(hasta.value) : Infinity
  return diario.value.filter(r => {
    const v = Number(r['Fecha'])
    return Number.isFinite(v) && v >= ini && v <= fin
  })
})

// ── Vistas (rutas hijas); conservan los filtros al cambiar ──
const vistaActiva = computed(() => String(route.name ?? '').split('-').pop() ?? 'graficas')
const vistas = computed(() => VISTAS_PRODUCCION_AGREGADOS.map(v => ({
  id: v.id,
  label: v.label,
  to: { name: `${props.planta}-produccion-${v.id}`, query: route.query },
})))
</script>

<style scoped>
.produccion-view { min-width: 0; }
.page-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  margin-bottom: 16px; padding: 4px 0;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.4px; }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-group {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  border: 1px solid var(--card-border); border-radius: var(--radius-lg); background: var(--bg);
}

.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: none; border-radius: var(--radius-md);
  background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
}
.action-btn:hover:not(:disabled) { background: rgba(59, 130, 246, .2); }
.action-btn:disabled { opacity: .5; cursor: not-allowed; }
.action-btn.clear { background: transparent; color: var(--text-secondary); border: 1px solid var(--card-border); }
.action-btn.clear:hover { background: var(--bg-alt); color: var(--text-primary); }

.page-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  padding: 60px 20px; color: var(--text-secondary); font-size: 15px; text-align: center;
}
.page-state.error { color: var(--danger); background: var(--danger-light); border-radius: var(--radius-lg); margin: 20px 0; }
.page-state.error p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
.error-icon {
  width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
}
.retry-btn {
  padding: 8px 20px; border: 1px solid var(--danger); border-radius: var(--radius-md);
  background: transparent; color: var(--danger); cursor: pointer; font-weight: 600; font-family: inherit;
}
.retry-btn:hover { background: var(--danger); color: #fff; }

@media (max-width: 768px) {
  /* En celular el encabezado no queda fijo: ocuparía media pantalla */
  .sticky-top { position: static; }
  .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
  /* El título repite planta y módulo (ya visibles arriba): en celular se oculta */
  .page-title { display: none; }
  .header-actions { flex-wrap: wrap; }
  .filter-group { width: 100%; box-sizing: border-box; }
  .action-btn { margin-left: auto; }
}
.clear-filters {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px;
  border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-tertiary);
  font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.clear-filters:hover { background: var(--danger-light); color: var(--danger); }
</style>
