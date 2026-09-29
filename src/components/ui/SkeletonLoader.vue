<template>
  <!-- Esqueleto de carga: imita la forma de la vista que viene para que la página no "salte" al llegar los datos -->
  <div class="sk" :class="`sk-${variant}`" role="status" aria-live="polite" :aria-label="label">
    <span class="sk-sr">{{ label }}</span>

    <!-- Encabezado: título + filtros -->
    <div v-if="variant === 'dashboard'" class="sk-header">
      <div class="sk-block sk-title"></div>
      <div class="sk-filters">
        <div v-for="i in 4" :key="i" class="sk-block sk-pill"></div>
      </div>
    </div>
    <div v-if="variant === 'dashboard'" class="sk-block sk-tabs"></div>

    <!-- Informe: hoja con encabezado, KPIs compactos, texto, tabla -->
    <div v-if="variant === 'report'" class="sk-paper">
      <div class="sk-paper-head">
        <div class="sk-block sk-logo"></div>
        <div class="sk-lines right">
          <div class="sk-block sk-line w40"></div>
          <div class="sk-block sk-line w30"></div>
        </div>
      </div>
      <div class="sk-block sk-line w60 center tall"></div>
      <div class="sk-kpis compact">
        <div v-for="i in 4" :key="i" class="sk-kpi"><div class="sk-block sk-line w50"></div><div class="sk-block sk-line w70 tall"></div></div>
      </div>
      <div class="sk-lines">
        <div class="sk-block sk-line w100"></div>
        <div class="sk-block sk-line w90"></div>
        <div class="sk-block sk-line w70"></div>
      </div>
      <div class="sk-block sk-chart" style="height: 200px"></div>
      <div class="sk-table">
        <div v-for="i in 6" :key="i" class="sk-row"><div v-for="j in 5" :key="j" class="sk-block sk-cell"></div></div>
      </div>
    </div>

    <!-- Lista simple (dentro de una tarjeta existente) -->
    <div v-else-if="variant === 'list'" class="sk-list">
      <div v-for="i in rows" :key="i" class="sk-list-item">
        <div class="sk-block sk-line" :style="{ width: 55 + ((i * 17) % 35) + '%' }"></div>
        <div class="sk-block sk-line sm" :style="{ width: 25 + ((i * 11) % 20) + '%' }"></div>
      </div>
    </div>

    <!-- Tabla -->
    <div v-else-if="variant === 'table'" class="sk-card">
      <div class="sk-block sk-line w30 tall"></div>
      <div class="sk-table">
        <div v-for="i in rows" :key="i" class="sk-row"><div v-for="j in 5" :key="j" class="sk-block sk-cell"></div></div>
      </div>
    </div>

    <!-- Tablero: KPIs + gráficas -->
    <template v-else>
      <div v-if="kpis" class="sk-kpis">
        <div v-for="i in kpis" :key="i" class="sk-kpi">
          <div class="sk-block sk-line w50"></div>
          <div class="sk-block sk-line w70 big"></div>
          <div class="sk-block sk-line w40"></div>
        </div>
      </div>
      <div class="sk-charts">
        <div v-for="i in charts" :key="i" class="sk-card" :class="{ wide: i === 1 && charts % 2 === 1 }">
          <div class="sk-block sk-line w40 tall"></div>
          <div class="sk-block sk-line w70"></div>
          <div class="sk-bars">
            <div v-for="(h, j) in barras(i)" :key="j" class="sk-block sk-bar" :style="{ height: h + '%' }"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * SkeletonLoader.vue — Esqueleto de carga reutilizable.
 * - dashboard: encabezado con filtros + pestañas + KPIs + gráficas (carga de una página completa)
 * - charts: KPIs + gráficas (una pestaña dentro de una página ya cargada)
 * - report: hoja de informe
 * - table: tabla
 * - list: filas simples sin tarjeta (para listas dentro de una tarjeta)
 * La animación se desactiva con «reducir movimiento» del sistema.
 */
withDefaults(defineProps<{
  variant?: 'dashboard' | 'charts' | 'report' | 'table' | 'list'
  /** Tarjetas de KPI a simular (0 = ninguna) */
  kpis?: number
  /** Gráficas a simular */
  charts?: number
  /** Filas de la tabla */
  rows?: number
  /** Texto para lectores de pantalla */
  label?: string
}>(), { variant: 'charts', kpis: 4, charts: 4, rows: 8, label: 'Cargando…' })

// Alturas fijas por gráfica (no aleatorias) para que el esqueleto no cambie entre renders
const PATRONES = [
  [45, 70, 55, 85, 60, 75, 50, 90, 65, 80],
  [80, 65, 90, 50, 70, 55, 75, 60, 85, 45],
  [60, 85, 40, 75, 95, 55, 70, 50, 80, 65],
  [70, 50, 80, 60, 45, 90, 55, 75, 65, 85],
]
const barras = (i: number) => PATRONES[(i - 1) % PATRONES.length]
</script>

<style scoped>
.sk { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; }
.sk-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Bloque base con brillo que recorre */
.sk-block {
  position: relative; overflow: hidden; border-radius: var(--radius-sm, 6px);
  background: var(--sk-base);
}
.sk-block::after {
  content: ''; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--sk-shine), transparent);
  animation: sk-shimmer 1.4s ease-in-out infinite;
}
@keyframes sk-shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .sk-block::after { animation: none; display: none; }
  .sk-block { animation: sk-pulse 2s ease-in-out infinite; }
}
@keyframes sk-pulse { 50% { opacity: .6; } }

.sk { --sk-base: rgba(148, 163, 184, 0.14); --sk-shine: rgba(255, 255, 255, 0.08); }
/* Sin :global(): en CSS scoped, «:global(X) .sk» se compila solo como «X» y pierde el «.sk» */
[data-theme="light"] .sk { --sk-base: #eef1f5; --sk-shine: rgba(255, 255, 255, 0.75); }

.sk-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 8px 0; }
.sk-title { width: 220px; height: 26px; }
.sk-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.sk-pill { width: 104px; height: 32px; border-radius: var(--radius-md, 10px); }
.sk-tabs { height: 40px; border-radius: var(--radius-md, 10px); }

.sk-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sk-kpis.compact { gap: 8px; }
.sk-kpi, .sk-card {
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg, 14px);
  padding: 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0;
}
.sk-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.sk-card.wide { grid-column: 1 / -1; }

.sk-line { height: 10px; }
.sk-line.tall { height: 14px; }
.sk-line.big { height: 24px; }
.sk-line.center { align-self: center; }
.w30 { width: 30%; } .w40 { width: 40%; } .w50 { width: 50%; } .w60 { width: 60%; }
.w70 { width: 70%; } .w90 { width: 90%; } .w100 { width: 100%; }

.sk-bars { display: flex; align-items: flex-end; gap: 8px; height: 220px; padding-top: 12px; }
.sk-bar { flex: 1; border-radius: 4px 4px 0 0; }

.sk-lines { display: flex; flex-direction: column; gap: 8px; }
.sk-lines.right { align-items: flex-end; width: 40%; }
.sk-lines.right .sk-line { width: 100%; }
.sk-lines.right .sk-line + .sk-line { width: 70%; }

.sk-paper {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 28px 32px;
  display: flex; flex-direction: column; gap: 18px; max-width: 1000px; width: 100%; margin: 0 auto; box-sizing: border-box;
  --sk-base: #eef1f5; --sk-shine: rgba(255, 255, 255, 0.75); --card-bg: #fff; --card-border: #e2e8f0;
}
.sk-paper-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
.sk-logo { width: 150px; height: 40px; }
.sk-chart { width: 100%; }

.sk-list { display: flex; flex-direction: column; gap: 14px; padding: 8px 4px; }
.sk-list-item { display: flex; flex-direction: column; gap: 6px; }
.sk-line.sm { height: 8px; }

.sk-table { display: flex; flex-direction: column; gap: 10px; }
.sk-row { display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 12px; }
.sk-cell { height: 12px; }

@media (max-width: 1200px) {
  .sk-charts { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 768px) {
  .sk-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .sk-kpi, .sk-card { padding: 12px; }
  .sk-bars { height: 160px; gap: 5px; }
  .sk-title { width: 160px; }
  .sk-filters { width: 100%; }
  .sk-pill { flex: 1; min-width: 70px; }
  .sk-paper { padding: 14px 12px; }
  .sk-row { grid-template-columns: 2fr repeat(2, 1fr); }
  .sk-row .sk-cell:nth-child(n + 4) { display: none; }
}
</style>
