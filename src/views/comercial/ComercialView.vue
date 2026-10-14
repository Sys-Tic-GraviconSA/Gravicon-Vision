<template>
  <!-- Va dentro de PlantaLayout (/comercial), que pone el nombre y las pestañas Leads · F227 · Embudo -->
  <div class="comercial-view">
    <SkeletonLoader v-if="store.loading && !store.data" variant="dashboard" :kpis="4" :charts="3" label="Cargando datos comerciales…" />
    <div v-else-if="store.error && !store.data" class="page-state error">
      <span class="error-icon">!</span>
      <div><strong>Error al cargar datos</strong><p>{{ store.error }}</p></div>
      <button class="retry-btn" @click="store.fetchData(true)">Reintentar</button>
    </div>
    <template v-else-if="store.data">
      <div class="sticky-top">
        <header class="page-header">
          <h2 class="page-title">{{ titulo }}</h2>
          <div class="header-actions">
            <div class="filter-group">
              <FilterBar :data="[]" :showProvider="false" :from="fechaInicio" :to="fechaFin" @dateRangeFilter="onDateRangeFilter" />
              <MultiSelect v-if="modulo !== 'f227'" v-model="selNegocios" :options="negocios" label="Negocio" icon="filter" />
              <MultiSelect v-model="selPlantas" :options="plantas" label="Planta" icon="filter" />
              <MultiSelect v-model="selAsesores" :options="asesores" label="Asesor" icon="user" />
            </div>
            <button class="clear-filters" :class="{ oculto: !hayFiltros }" :tabindex="hayFiltros ? 0 : -1" :aria-hidden="!hayFiltros" title="Quitar filtros" @click="limpiarFiltros">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <span>Limpiar</span>
            </button>
            <button class="action-btn" :disabled="store.loading" title="Volver a leer los datos de Supabase y Novasoft" @click="store.fetchData(true)">
              <svg class="icono-actualizar" :class="{ girando: store.loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {{ store.loading ? 'Actualizando…' : 'Actualizar' }}
            </button>
          </div>
        </header>
      </div>

      <LeadsTab v-if="modulo === 'leads'" :leads="leadsFiltrados" :descartados="modelo.descartados" :atipicas="modelo.atipicas" />
      <F227Tab v-else-if="modulo === 'f227'" :ofertas="f227Filtradas" :total="modelo.f227.length" />
      <EmbudoTab v-else :clientes="embudo" :indice="modelo.indice" :avisos="store.data.avisos" :hay-f227="modelo.f227.length > 0" />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ComercialView.vue — Módulo Comercial (/comercial/leads | f227 | embudo).
 * Carga leads, F227 y compras (useComercialStore), aplica los filtros (en la URL, igual que Concretos) y
 * pasa a cada pestaña sus datos ya filtrados:
 * - Fechas: fecha de solicitud (o de envío de la oferta si falta).
 * - Negocio: Concretos, Agregados, Dual (leads de concreto y agregados) — no aplica a F227, que es solo concreto.
 * - Planta y asesor (representante comercial).
 * El embudo agrupa por cliente los leads filtrados y busca sus F227 y compras sin filtrar.
 */
import { computed, onMounted } from 'vue'
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import FilterBar from '../../components/dashboard/FilterBar.vue'
import MultiSelect from '../../components/ui/MultiSelect.vue'
import { useQueryDate, useQuerySet } from '../../composables/useQueryState'
import { useComercialStore } from '../../stores'
import { construirLeads, construirF227, construirEmbudo, indexarCompras, NEGOCIOS, type Lead, type OfertaF227 } from '../../composables/useComercial'
import LeadsTab from './LeadsTab.vue'
import F227Tab from './F227Tab.vue'
import EmbudoTab from './EmbudoTab.vue'

const props = defineProps<{ modulo: 'leads' | 'f227' | 'embudo' }>()
const TITULOS = { leads: 'Cotizaciones (Leads)', f227: 'Ofertas F227', embudo: 'Embudo Comercial' }
const titulo = computed(() => TITULOS[props.modulo])

const store = useComercialStore()
onMounted(() => store.fetchData())

const modelo = computed(() => {
  const d = store.data
  if (!d) return { leads: [] as Lead[], descartados: 0, atipicas: 0, f227: [] as OfertaF227[], indice: null }
  return { ...construirLeads(d), f227: construirF227(d), indice: indexarCompras(d) }
})

// ── Filtros (en la URL) ──
const registros = computed<(Lead | OfertaF227)[]>(() => (props.modulo === 'f227' ? modelo.value.f227 : modelo.value.leads))
const ordenar = (xs: Iterable<string>) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'es'))
const negocios = computed(() => NEGOCIOS.filter(n => modelo.value.leads.some(l => l.negocio === n)))
const plantas = computed(() => ordenar(registros.value.map(r => r.planta)))
const asesores = computed(() => ordenar(registros.value.map(r => r.asesor)))

const fechaInicio = useQueryDate('desde')
const fechaFin = useQueryDate('hasta')
const selNegocios = useQuerySet('negocio', () => negocios.value)
const selPlantas = useQuerySet('planta', () => plantas.value)
const selAsesores = useQuerySet('asesor', () => asesores.value)

function onDateRangeFilter(r: { from: string | null; to: string | null }) {
  fechaInicio.value = r.from ?? ''
  fechaFin.value = r.to ?? ''
}
// Sin opciones marcadas = sin filtro (paso intermedio al desmarcar «Todos»)
const pasa = (sel: Set<string>, v: string) => sel.size === 0 || sel.has(v)
// Con filtro de fechas, los registros sin fecha quedan fuera
const enFechas = (f: string) => (!fechaInicio.value || (!!f && f >= fechaInicio.value)) && (!fechaFin.value || (!!f && f <= fechaFin.value))
const filtroComun = (r: Lead | OfertaF227) => enFechas(r.fecha) && pasa(selPlantas.value, r.planta) && pasa(selAsesores.value, r.asesor)

const leadsFiltrados = computed(() => modelo.value.leads.filter(l => filtroComun(l) && pasa(selNegocios.value, l.negocio)))
const f227Filtradas = computed(() => modelo.value.f227.filter(filtroComun))
const embudo = computed(() => (modelo.value.indice ? construirEmbudo(leadsFiltrados.value, modelo.value.f227, modelo.value.indice) : []))

const esTodo = (sel: Set<string>, opciones: string[]) => sel.size === 0 || sel.size === opciones.length
const hayFiltros = computed(() => !!(fechaInicio.value || fechaFin.value) || !esTodo(selNegocios.value, negocios.value)
  || !esTodo(selPlantas.value, plantas.value) || !esTodo(selAsesores.value, asesores.value))
function limpiarFiltros() {
  fechaInicio.value = ''
  fechaFin.value = ''
  selNegocios.value = new Set(negocios.value)
  selPlantas.value = new Set(plantas.value)
  selAsesores.value = new Set(asesores.value)
}
</script>

<style scoped>
.comercial-view { min-width: 0; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 12px; padding: 8px 0; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.4px; }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-group {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px; flex-wrap: wrap;
  border: 1px solid var(--card-border); border-radius: var(--radius-lg); background: var(--bg);
}
.clear-filters {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px;
  border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-tertiary);
  font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all var(--transition-fast);
}
.clear-filters:hover { background: var(--danger-light); color: var(--danger); }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: none; border-radius: var(--radius-md);
  background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
}
.action-btn:hover:not(:disabled) { background: rgba(59, 130, 246, .2); }
.action-btn:disabled { opacity: .7; cursor: default; }
.page-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: var(--text-secondary); font-size: 15px; flex-direction: column; }
.page-state.error { color: var(--danger); background: var(--danger-light); border-radius: var(--radius-lg); margin: 20px 0; }
.page-state.error p { margin: 4px 0 0; font-size: 13px; opacity: .8; }
.error-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
.retry-btn { margin-top: 8px; padding: 8px 20px; border: 1px solid var(--danger); border-radius: var(--radius-md); background: transparent; color: var(--danger); cursor: pointer; font-weight: 600; }
.retry-btn:hover { background: var(--danger); color: #fff; }

@media (max-width: 768px) {
  .sticky-top { position: static; }
  .page-header { flex-direction: column; align-items: stretch; gap: 8px; padding: 4px 0; }
  .page-title { display: none; }
  .header-actions { width: 100%; }
  .filter-group { width: 100%; box-sizing: border-box; padding: 6px; gap: 4px; }
  .filter-group > * { flex: 1 1 auto; }
}
</style>
