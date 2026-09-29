<template>
  <div class="page-layout planta-layout">
    <header class="planta-header">
      <span v-if="planta.negocio !== planta.nombre" class="planta-negocio">{{ planta.negocio }}</span>
      <h1 class="planta-nombre">{{ planta.nombre }}</h1>
    </header>

    <RouteTabs v-if="modulos.length > 1" :items="modulos" :activo="moduloActivo" aria-label="Módulos" />

    <!-- Módulo activo: /:planta/produccion | programacion | mantenimiento -->
    <RouterView v-slot="{ Component, route: r }">
      <component :is="Component" :key="`${planta.id}-${String(r.matched[1]?.name ?? '')}`" />
    </RouterView>
  </div>
</template>

<script setup lang="ts">
/**
 * PlantaLayout.vue — Contenedor de una planta (Cuncía, Acacías, Concretos).
 * Muestra el nombre y las pestañas de módulos como enlaces reales; el módulo se renderiza
 * por la ruta hija. Oculta los módulos que el usuario no tiene permitidos.
 * La planta llega como prop desde la definición de la ruta.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PLANTAS, type PlantaId } from '../config/plantas'
import { useAuthStore } from '../stores/auth'
import RouteTabs from '../components/ui/RouteTabs.vue'

const props = defineProps<{ planta: PlantaId }>()
const route = useRoute()
const auth = useAuthStore()

const planta = computed(() => PLANTAS[props.planta])
const modulos = computed(() => planta.value.modulos
  .filter(m => auth.canView(`${props.planta}/${m.id}`))
  .map(m => ({ id: m.id, label: m.label, to: { name: `${props.planta}-${m.id}` } })))
// Segundo segmento de la ruta: /cuncia/produccion/… → produccion
const moduloActivo = computed(() => route.path.split('/')[2] ?? '')
</script>

<style scoped>
.planta-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.planta-negocio { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.planta-nombre { font-size: 24px; font-weight: 700; letter-spacing: -0.4px; color: var(--text-primary); margin: 0; }

/* Los módulos traían su propio .page-layout: dentro del layout no se duplica el margen */
.planta-layout :deep(.page-layout) { padding: 0; max-width: none; margin: 0; }

@media (max-width: 768px) {
  .planta-header { margin-bottom: 10px; }
  .planta-nombre { font-size: 20px; }
}
</style>
