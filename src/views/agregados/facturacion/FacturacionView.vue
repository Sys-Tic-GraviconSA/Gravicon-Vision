<template>
  <div class="facturacion-view">
    <SkeletonLoader v-if="!datos && (store.loading || !intentado)" variant="dashboard" :kpis="4" :charts="4" :label="`Cargando facturación de ${planta.nombre}…`" />

    <div v-else-if="!datos && store.error" class="page-state error">
      <span class="error-icon">!</span>
      <div><strong>No se pudo leer el archivo de facturación</strong><p>{{ store.error }}</p></div>
      <button class="retry-btn" @click="cargar(true)">Reintentar</button>
    </div>

    <template v-else-if="datos">
      <!-- Encabezado con filtros fijo arriba al desplazarse (como en Concretos y Programación) -->
      <div class="sticky-top">
      <header class="page-header">
        <div class="titulo-bloque">
          <h2 class="page-title">Facturación {{ planta.nombre }}</h2>
          <span class="fuente" :title="`Archivo de Drive: ${datos.archivo.nombre}`">
            Novasoft · sucursal {{ datos.sucursal }}<template v-if="archivoModificado"> · archivo actualizado {{ archivoModificado }}</template>
          </span>
        </div>
        <div class="header-actions">
          <div class="filter-group">
            <FilterBar :data="[]" :showProvider="false" :from="desde" :to="hasta" @dateRangeFilter="onFechas" />
            <MultiSelect v-model="selSubtipos" :options="opcionesSubtipo" label="Subtipo" icon="filter" />
            <MultiSelect v-model="selFamilias" :options="opcionesFamilia" label="Familia" icon="filter" />
            <MultiSelect v-model="selClientes" :options="opcionesCliente" label="Cliente" icon="user" searchable />
            <button v-if="hayFiltros" class="clear-filters" title="Quitar filtros" @click="limpiar">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Limpiar</span>
            </button>
          </div>
          <button class="action-btn" :disabled="store.loading" title="Vuelve a leer el archivo de Drive" @click="cargar(true)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ store.loading ? 'Actualizando…' : 'Actualizar' }}
          </button>
        </div>
      </header>
      </div>

      <div v-if="!datos.lineas.length" class="page-state">
        <strong>Sin facturación para {{ planta.nombre }}</strong>
        <span>El archivo <em>{{ datos.archivo.nombre }}</em> no tiene líneas de la sucursal {{ datos.sucursal }}. Cuando Novasoft exporte movimientos de esta sucursal aparecerán aquí.</span>
      </div>

      <template v-else>
        <RouteTabs variant="toggle" :items="vistas" :activo="vistaActiva" aria-label="Vista" replace />
        <!-- /:planta/facturacion/graficas | detalle | informe -->
        <RouterView v-slot="{ Component }">
          <component :is="Component" :lineas="filtradas" :lineas-sin-fecha="sinFecha" :planta="planta.nombre" :planta-id="props.planta" :sucursal="datos.sucursal" :archivo="datos.archivo" :subtipos="datos.subtipos" />
        </RouterView>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionView.vue — Facturación de agregados de una planta (layout de /:planta/facturacion).
 * Fuente: exporte de Novasoft (Excel en Drive) leído por /api/facturacion-agregados/data.
 * Filtros en la URL (?desde=&hasta=&subtipo=&familia=&cliente=) y compartidos por las tres vistas:
 *   /graficas → FacturacionGraficasTab · /detalle → FacturacionDetalleTab · /informe → FacturacionInformeTab
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFacturacionStore } from '../../../stores'
import { useQueryDate, useQuerySet } from '../../../composables/useQueryState'
import { FAMILIAS, nombreCliente } from '../../../composables/useFacturacion'
import { PLANTAS, VISTAS_FACTURACION } from '../../../config/plantas'
import FilterBar from '../../../components/dashboard/FilterBar.vue'
import MultiSelect from '../../../components/ui/MultiSelect.vue'
import RouteTabs from '../../../components/ui/RouteTabs.vue'
import SkeletonLoader from '../../../components/ui/SkeletonLoader.vue'

const props = defineProps<{ planta: 'cuncia' | 'acacias' }>()
const route = useRoute()
const store = useFacturacionStore()
const planta = computed(() => PLANTAS[props.planta])
const datos = computed(() => store.data[props.planta])

const intentado = ref(false)
async function cargar(force = false) {
  await store.fetchFacturacion(props.planta, force)
  intentado.value = true
}
onMounted(() => { if (!datos.value) cargar() })
watch(() => props.planta, () => { if (!datos.value) cargar() })

const archivoModificado = computed(() => {
  const m = datos.value?.archivo.modificado
  return m ? new Date(m).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
})

// ── Filtros (URL) ──
const lineas = computed(() => datos.value?.lineas ?? [])
const etiquetaSubtipo = (s: string) => `${s} · ${datos.value?.subtipos[s] ?? 'Otro'}`
const opcionesSubtipo = computed(() => [...new Set(lineas.value.map(l => l.subtipo))].sort().map(etiquetaSubtipo))
const opcionesFamilia = computed(() => FAMILIAS.filter(f => lineas.value.some(l => l.familia === f)))
const opcionesCliente = computed(() => [...new Set(lineas.value.filter(l => l.tipo !== 'traslado').map(l => nombreCliente(l.cliente)))].sort((a, b) => a.localeCompare(b)))

const desde = useQueryDate('desde')
const hasta = useQueryDate('hasta')
const selSubtipos = useQuerySet('subtipo', () => opcionesSubtipo.value)
const selFamilias = useQuerySet('familia', () => opcionesFamilia.value)
const selClientes = useQuerySet('cliente', () => opcionesCliente.value)

function onFechas(r: { from: string | null; to: string | null }) {
  desde.value = r.from ?? ''
  hasta.value = r.to ?? ''
}
// Conjunto vacío = sin filtro (paso intermedio al desmarcar «Todos»)
const pasa = (sel: Set<string>, v: string) => sel.size === 0 || sel.has(v)
const todas = (sel: Set<string>, opts: string[]) => sel.size === 0 || sel.size === opts.length
// El filtro de cliente no aplica a traslados (no tienen cliente): se conservan salvo que se filtre por cliente.
// sinFecha: todos los filtros menos el de fechas (el informe lo usa para comparar con el período anterior)
const sinFecha = computed(() => lineas.value.filter(l =>
  pasa(selSubtipos.value, etiquetaSubtipo(l.subtipo))
  && pasa(selFamilias.value, l.familia)
  && (todas(selClientes.value, opcionesCliente.value) || (l.tipo !== 'traslado' && selClientes.value.has(nombreCliente(l.cliente))))))
const filtradas = computed(() => sinFecha.value.filter(l => (!desde.value || l.fecha >= desde.value) && (!hasta.value || l.fecha <= hasta.value)))

const hayFiltros = computed(() => !!(desde.value || hasta.value)
  || !todas(selSubtipos.value, opcionesSubtipo.value) || !todas(selFamilias.value, opcionesFamilia.value) || !todas(selClientes.value, opcionesCliente.value))
function limpiar() {
  desde.value = ''
  hasta.value = ''
  selSubtipos.value = new Set(opcionesSubtipo.value)
  selFamilias.value = new Set(opcionesFamilia.value)
  selClientes.value = new Set(opcionesCliente.value)
}

// ── Vistas (rutas hijas); conservan los filtros ──
const vistaActiva = computed(() => String(route.name ?? '').split('-').pop() ?? 'graficas')
const vistas = computed(() => VISTAS_FACTURACION.map(v => ({
  id: v.id, label: v.label, to: { name: `${props.planta}-facturacion-${v.id}`, query: route.query },
})))
</script>

<style scoped>
.facturacion-view { min-width: 0; }
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding: 4px 0; }
.titulo-bloque { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.4px; }
.fuente { font-size: 12px; color: var(--text-tertiary); }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-group {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 8px;
  border: 1px solid var(--card-border); border-radius: var(--radius-lg); background: var(--bg);
}
.clear-filters {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border: none; border-radius: var(--radius-md);
  background: transparent; color: var(--text-tertiary); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.clear-filters:hover { background: var(--danger-light); color: var(--danger); }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: none; border-radius: var(--radius-md);
  background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
}
.action-btn:hover:not(:disabled) { background: rgba(59, 130, 246, .2); }
.action-btn:disabled { opacity: .5; cursor: not-allowed; }

.page-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center;
  padding: 56px 20px; color: var(--text-secondary); font-size: 14px; max-width: 620px; margin: 0 auto;
}
.page-state strong { color: var(--text-primary); font-size: 16px; }
.page-state.error { color: var(--danger); background: var(--danger-light); border-radius: var(--radius-lg); margin: 20px auto; }
.page-state.error p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
.error-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
.retry-btn { padding: 8px 20px; border: 1px solid var(--danger); border-radius: var(--radius-md); background: transparent; color: var(--danger); cursor: pointer; font-weight: 600; font-family: inherit; }
.retry-btn:hover { background: var(--danger); color: #fff; }

@media (max-width: 768px) {
  /* En celular el encabezado no queda fijo: ocuparía media pantalla */
  .sticky-top { position: static; }
  .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
  /* El título repite planta y módulo (ya visibles arriba): en celular se oculta */
  .titulo-bloque { display: none; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .filter-group { width: 100%; box-sizing: border-box; padding: 6px; gap: 4px; }
  .filter-group > * { flex: 1 1 auto; }
  .action-btn { margin-left: auto; }
}
</style>
