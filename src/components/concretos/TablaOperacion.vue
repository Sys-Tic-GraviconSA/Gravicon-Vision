<template>
  <div class="gt-card">
    <h4 class="gt-card-title">{{ titulo }} <span v-if="nota || tabla.nota" class="gt-card-note">— {{ [nota, tabla.nota].filter(Boolean).join('. ') }}</span></h4>
    <div class="gt-table-wrap">
      <table class="gt-table">
        <thead><tr><th v-for="c in tabla.cols" :key="c.t" :class="{ r: c.r }">{{ c.t }}</th></tr></thead>
        <tbody>
          <tr v-for="(f, j) in tabla.filas" :key="j" :class="{ subtotal: f.subtotal }">
            <template v-for="(v, i) in f.celdas" :key="i">
              <td v-if="!(i === 0 && f.span === 0)" :rowspan="i === 0 && f.span ? f.span : undefined"
                :class="{ r: tabla.cols[i].r, wrap: tabla.cols[i].w, strong: i === 0 || (i === 1 && f.subtotal), grp: i === 0 && !!f.span }"><span v-if="i === 0 && f.span && f.color" class="dot" :style="{ background: color(f.color) }"></span>{{ v }}</td>
            </template>
          </tr>
        </tbody>
        <tfoot v-if="tabla.total"><tr><td v-for="(v, i) in tabla.total" :key="i" :class="{ r: tabla.cols[i].r }">{{ v }}</td></tr></tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TablaOperacion.vue — Tabla del tablero de Concretos (comerciales, clientes, conductores, bombeo, cancelaciones).
 * Pinta una TablaOp de useOperacionConcreto: la planta una sola vez (rowspan) con su color y el subtotal de cada grupo.
 */
import type { TablaOp } from '../../composables/useOperacionConcreto'

defineProps<{ titulo: string; tabla: TablaOp; nota?: string; color: (planta: string) => string }>()
</script>

<style scoped>
.gt-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); padding: 20px; margin-top: 16px; }
.gt-card-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.gt-card-note { font-size: 12px; font-weight: 400; color: var(--text-tertiary); }
.gt-table-wrap { overflow-x: auto; }
.gt-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.gt-table th {
  text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px;
  color: var(--text-tertiary); padding: 8px 10px; border-bottom: 1px solid var(--card-border); white-space: nowrap;
}
.gt-table td { padding: 10px; color: var(--text-secondary); border-bottom: 1px solid var(--card-border); white-space: nowrap; }
.gt-table tbody tr:hover td { background: var(--card-bg-hover); }
.gt-table tfoot td { color: var(--text-primary); font-weight: 700; border-bottom: none; }
.gt-table .r { text-align: right; }
.gt-table td.wrap { white-space: normal; min-width: 180px; }
.gt-table .strong { color: var(--text-primary); font-weight: 600; }
.gt-table td.grp { vertical-align: top; border-right: 1px solid var(--card-border); background: var(--card-bg-hover); }
.gt-table tr.subtotal td { background: var(--card-bg-hover); color: var(--text-primary); font-weight: 700; border-bottom: 2px solid var(--card-border); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: 0; }
@media (max-width: 768px) { .gt-card { padding: 14px; } }
</style>
