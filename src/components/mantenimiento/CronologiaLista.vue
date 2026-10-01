<template>
  <div v-if="!eventos.length" class="ot-panel-placeholder">
    <span class="placeholder-icon">🕐</span>
    <span class="placeholder-text">{{ vacioTitulo }}</span>
    <span class="placeholder-sub">{{ vacioTexto }}</span>
  </div>
  <div v-else class="crono-list">
    <div v-for="(ev, i) in eventos" :key="i" class="crono-item" :class="{ clickable: !!ev.click }" @click="ev.click?.()">
      <span class="crono-dot" :class="ev.tipo"></span>
      <div class="crono-content">
        <div class="crono-head">
          <span class="crono-accion" :class="ev.tipo">{{ ev.accion }}</span>
          <span class="crono-fecha">{{ ev.fecha }} <small v-if="ev.hora">{{ ev.hora }}</small></span>
        </div>
        <div v-if="ev.sub || ev.etiqueta" class="crono-sub">
          <span v-if="ev.sub">{{ ev.sub }}</span>
          <span v-if="ev.etiqueta" class="crono-etiqueta">{{ ev.etiqueta }}</span>
        </div>
        <div v-if="ev.cambios.length" class="crono-cambios">
          <div v-for="(c, ci) in ev.cambios" :key="ci" class="crono-cambio">
            <span class="cc-campo">{{ c.campo }}</span>
            <template v-if="c.de">
              <span class="cc-val cc-de">{{ c.de }}</span>
              <span class="cc-arrow">→</span>
            </template>
            <span class="cc-val cc-a">{{ c.a }}</span>
          </div>
        </div>
        <div v-else-if="ev.detalle" class="crono-detail">{{ ev.detalle }}</div>
        <div v-if="ev.usuario" class="crono-user">{{ ev.usuario }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CronologiaLista.vue — Lista de cronología con el diseño de la ventana «Cronología» del modal de OT
 * (EquiposDashboard): punto por tipo, acción, fecha y hora, cambios «campo: de → a», detalle y usuario.
 * Mismo markup y mismo CSS (copiados de EquiposDashboard; las OT y SOPLED siguen con su copia).
 * Extras opcionales: `sub` (placa, llanta o posición) y `etiqueta` (fuente del evento, discreta).
 */
export interface CronoVista {
  tipo: 'crear' | 'modificar' | 'mover' | 'eliminar'
  accion: string
  fecha: string
  hora: string
  detalle: string
  cambios: { campo: string; de: string; a: string }[]
  usuario: string
  sub?: string
  etiqueta?: string
  click?: () => void
}
withDefaults(defineProps<{ eventos: CronoVista[]; vacioTitulo?: string; vacioTexto?: string }>(), {
  vacioTitulo: 'Sin eventos', vacioTexto: 'No hay registros disponibles',
})
</script>

<style scoped>
/* Placeholder para ventanas vacías (igual que el modal de OT) */
.ot-panel-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  color: #9ca3af;
  gap: 8px;
}
.placeholder-icon {
  font-size: 32px;
  opacity: 0.5;
}
.placeholder-text {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}
.placeholder-sub {
  font-size: 12px;
  color: #9ca3af;
}

/* Cronologia — diseño del documento de la OT (papel blanco, tinta oscura, azul) */
.crono-list { display: flex; flex-direction: column; padding: 14px 16px; font-family: 'Lato', sans-serif; }
.crono-item { position: relative; padding-left: 24px; }
.crono-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 6px; top: 16px; bottom: -4px;
  width: 2px;
  background: #e5e7eb;
}
.crono-dot {
  position: absolute;
  left: 0; top: 6px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #ffffff;
}
.crono-dot.modificar { background: #3827f5; }
.crono-dot.crear { background: #10b981; }
.crono-dot.eliminar { background: #ef4444; }
.crono-dot.mover { background: #f59e0b; }
.crono-content {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  flex: 1;
}
.crono-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.crono-accion {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(56,39,245,.1);
  color: #3827f5;
}
.crono-accion.modificar { background: rgba(56,39,245,.1); color: #3827f5; }
.crono-accion.crear { background: rgba(16,185,129,.12); color: #047857; }
.crono-accion.eliminar { background: rgba(239,68,68,.12); color: #b91c1c; }
.crono-accion.mover { background: rgba(245,158,11,.14); color: #b45309; }
.crono-fecha { font-size: 11px; color: #666; }
.crono-fecha small { font-size: 10px; }
.crono-detail { font-size: 11px; color: #555; line-height: 1.5; margin-bottom: 2px; }
.crono-user { font-size: 10px; color: #777; font-style: italic; }
.crono-cambios { display: flex; flex-direction: column; gap: 3px; margin-top: 2px; }
.crono-cambio {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  line-height: 1.45;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f8f9fa;
}
.cc-campo { font-weight: 700; color: #1a1a1a; white-space: nowrap; }
.cc-val { color: #555; overflow-wrap: anywhere; }
.cc-val.cc-de { color: #ef4444; text-decoration: line-through; }
.cc-arrow { color: #9ca3af; }
.cc-val.cc-a { color: #047857; font-weight: 600; }

/* Extras de llantas: a qué llanta/placa corresponde y de dónde sale el evento */
.crono-item.clickable .crono-content { cursor: pointer; transition: border-color .15s; }
.crono-item.clickable:hover .crono-content { border-color: #3827f5; }
.crono-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
.crono-etiqueta { font-size: 9.5px; font-weight: 600; color: #94a3b8; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0 6px; text-transform: uppercase; letter-spacing: .3px; }
</style>
