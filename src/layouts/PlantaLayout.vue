<template>
  <div class="page-layout planta-layout" :style="{ '--planta-h': `${altoEncabezado}px` }">
    <!-- Nombre de la planta y, en la misma fila, sus módulos (Producción · Despacho · …).
         En computador forma un solo bloque fijo con la barra de filtros del módulo (que se pega justo debajo) -->
    <header ref="encabezado" class="planta-header">
      <h1 class="planta-nombre">{{ planta.nombre }}</h1>
      <RouteTabs v-if="modulos.length > 1" class="planta-modulos" :items="modulos" :activo="moduloActivo" aria-label="Módulos" />
    </header>

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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PLANTAS, type PlantaId } from '../config/plantas'
import { moduloVisible } from '../router'
import RouteTabs from '../components/ui/RouteTabs.vue'

const props = defineProps<{ planta: PlantaId }>()
const route = useRoute()

const planta = computed(() => PLANTAS[props.planta])
const modulos = computed(() => planta.value.modulos
  .filter(m => moduloVisible(props.planta, m.id))
  .map(m => ({ id: m.id, label: m.label, to: { name: `${props.planta}-${m.id}` } })))
// Alto del encabezado: la barra de filtros del módulo (.sticky-top) se pega justo debajo (top: var(--planta-h))
const encabezado = ref<HTMLElement | null>(null)
const altoEncabezado = ref(0)
let ro: ResizeObserver | null = null
onMounted(() => {
  if (!encabezado.value) return
  ro = new ResizeObserver(() => { altoEncabezado.value = encabezado.value?.offsetHeight ?? 0 })
  ro.observe(encabezado.value)
})
onBeforeUnmount(() => ro?.disconnect())
// Segundo segmento de la ruta: /cuncia/produccion/… → produccion
const moduloActivo = computed(() => route.path.split('/')[2] ?? '')
</script>

<style scoped>
.planta-header { display: flex; align-items: center; gap: 20px; margin-bottom: 14px; }
/* Computador: franja fija superior (misma superficie que la barra de filtros, que continúa debajo) */
@media (min-width: 769px) {
  .planta-header {
    position: sticky; top: 0; z-index: 101;
    margin: -28px -32px 0; padding: 16px 32px 10px;
    background: var(--bg-elevated);
  }
  .planta-nombre.planta-nombre { font-size: 22px; }
}
.planta-nombre { flex: 0 0 auto; }
/* Las pestañas de módulos van junto al nombre, del ancho de su contenido */
.planta-header :deep(.planta-modulos) { margin-bottom: 0; min-width: 0; }
.planta-nombre { font-size: 24px; font-weight: 700; letter-spacing: -0.4px; color: var(--text-primary); margin: 0; }

/* Los módulos traían su propio .page-layout: dentro del layout no se duplica el margen */
.planta-layout :deep(.page-layout) { padding: 0; max-width: none; margin: 0; }

@media (max-width: 768px) {
  /* En celular las pestañas bajan debajo del nombre, a todo el ancho */
  .planta-header { margin-bottom: 10px; flex-direction: column; align-items: stretch; gap: 8px; }
  .planta-nombre { font-size: 20px; }
}
</style>
