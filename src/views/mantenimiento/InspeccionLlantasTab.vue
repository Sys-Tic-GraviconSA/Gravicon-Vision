<template>
  <div class="inspeccion-tab">
    <!-- Toggle de vistas: Gráficas | Inventario | Informe -->
    <div class="almacen-view-toggle">
      <button class="av-btn" :class="{ active: vista === 'graficas' }" @click="vista = 'graficas'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Gráficas
      </button>
      <button class="av-btn" :class="{ active: vista === 'inventario' }" @click="vista = 'inventario'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Inventario
      </button>
      <button class="av-btn" :class="{ active: vista === 'informe' }" @click="vista = 'informe'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Informe
      </button>
    </div>

    <div v-if="store.loading && !store.data" class="disp-banner load">Cargando inventario de llantas…</div>
    <div v-else-if="store.error && !store.data" class="disp-banner err">Error: {{ store.error }}</div>
    <div v-else-if="!inv.length" class="disp-banner warn">
      Sin datos de inventario de llantas para {{ plantaLabel }}. Se lee de la hoja <strong>FleetControl_Llantas · Inventario_Llantas_Concretros</strong>.
    </div>

    <template v-else>
      <div v-if="datosParciales" class="disp-banner warn">
        <strong>Datos parciales:</strong>
        <span v-if="costoTotal === 0"> la hoja no tiene el <em>Costo de adquisición</em> cargado. </span>
        <span v-if="(store.data?.totalInspecciones ?? 0) === 0"> No hay inspecciones registradas: semáforo, presiones y planes de acción se activan cuando se carguen.</span>
      </div>

      <!-- ================= GRÁFICAS ================= -->
      <template v-if="vista === 'graficas'">
        <div class="kpi-row">
          <KpiCard label="Total Llantas" accent="#15223c" icon="package" :value="fmt(inv.length)" />
          <KpiCard label="En Uso" accent="#10B981" icon="check-circle" :value="fmt(countEstado('EN USO'))" />
          <KpiCard label="En Taller" accent="#F59E0B" icon="activity" :value="fmt(countEstado('TALLER'))" />
          <KpiCard label="En Almacén" accent="#3B82F6" icon="package" :value="fmt(countEstado('ALMAC'))" />
          <KpiCard label="Dadas de Baja" accent="#EF4444" icon="activity" :value="fmt(countEstado('BAJA'))" />
          <KpiCard label="Placas con Llantas" accent="#8B5CF6" icon="truck" :value="fmt(placasSet.size)" />
          <KpiCard label="Marcas" accent="#06B6D4" icon="list" :value="fmt(optMarca.length)" />
          <KpiCard label="Prof. Promedio" accent="#10B981" icon="target" :value="profProm + ' mm'" />
          <KpiCard label="Críticas (< 3 mm)" :accent="criticas.length ? '#EF4444' : '#10B981'" icon="activity" :value="fmt(criticas.length)" />
          <KpiCard label="Costo Adquisición" accent="#F97316" icon="dollar" :value="costoTotal > 0 ? money(costoTotal) : 'Sin datos'" />
        </div>

        <div class="charts-grid cols-2">
          <ChartCard title="Composición por Marca" description="Distribución del parque de llantas por marca (normalizada)" :option="pieMarca" :height="360" />
          <ChartCard title="Composición por Dimensión" description="Distribución por medida de llanta" :option="pieDimension" :height="360" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard title="Por Tipo de Vehículo" description="Llantas montadas según el tipo de equipo" :option="pieTipo" :height="360" />
          <ChartCard title="Por Estado de Inventario" description="Situación actual de cada llanta" :option="pieEstado" :height="360" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard title="Por Aplicación" description="Posición funcional (Tracción / Direccional / Dirección)" :option="pieAplicacion" :height="360" />
          <ChartCard title="Por Planta" description="Llantas por planta de asignación" :option="piePlanta" :height="360" />
        </div>
        <div class="charts-grid">
          <ChartCard title="Composición de Flotas — Marca × Dimensión" description="Réplica del reporte de inspección: llantas por marca, apiladas por medida" :option="composicionFlotaOpt" :height="440" tall />
        </div>
        <div class="charts-grid">
          <ChartCard title="Ranking — Vehículos con Más Llantas en Inventario" description="Top 15 placas por número de llantas registradas" :option="barPlacaCount" :height="460" tall />
        </div>
        <div class="charts-grid">
          <ChartCard title="Ranking — Vehículos que Requieren Atención" description="Menor profundidad promedio de labrado (mm). Rojo: por debajo de 3 mm" :option="barPlacaProf" :height="460" tall />
        </div>
      </template>

      <!-- ================= INVENTARIO ================= -->
      <template v-else-if="vista === 'inventario'">
        <DataTable
          title="Inventario de Llantas — clic en una fila para ver el detalle"
          :data="invTableRows"
          :page-size="25"
          :excludeFields="['_raw']"
          :badgeFields="['Estado']"
          :defaultVisible="['Nº Serie', 'Marca', 'Modelo', 'Dimensión', 'Estado', 'Aplicación', 'Tipo de Vehículo', 'Placa', 'Eje', 'Lado', 'Prof. Mínima', 'Costo Adquisición']"
          small selectColumns exportColumns clickable
          @row-click="openDetalle"
        />
      </template>

      <!-- ================= INFORME ================= -->
      <template v-else>
        <div class="informe-control-bar">
          <div class="icb-info">
            <span class="icb-tag">Reporte Oficial de Mantenimiento</span>
            <span class="icb-title">Inspección y Estado de Llantas — {{ plantaLabel }}</span>
          </div>
          <div class="icb-actions">
            <button class="tb-btn primary" @click="generarPdf" :disabled="generando">
              <svg v-if="!generando" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {{ generando ? 'Generando PDF…' : 'Descargar PDF' }}
            </button>
          </div>
        </div>

        <div class="report-paper" ref="reportRef">
          <!-- PÁGINA 1 -->
          <div class="report-page">
            <header class="report-header">
              <div class="report-header-brand">
                <img src="https://gravicon2026.sirv.com/Pagina%20Gravicon/images/Logos/gravicon_logo.png" @error="($event.target as HTMLImageElement).style.display='none'" alt="Gravicon" class="report-logo report-logo--light" crossorigin="anonymous" />
                <img class="Sirv report-logo report-logo--dark" src="https://gravicon2026.sirv.com/Pagina%20Gravicon/Logos/logo-blanco.webp?w=200" data-src="https://gravicon2026.sirv.com/Pagina%20Gravicon/Logos/logo-blanco.webp?w=200" alt="Gravicon" referrerpolicy="no-referrer" />
                <div class="report-header-text">
                  <h2>Mantenimiento de Llantas — {{ plantaLabel }} Gravicon</h2>
                  <span>GRAVAS Y CONCRETOS S.A. · Gestión de Llantas</span>
                </div>
              </div>
              <div class="report-header-meta">
                <div><span>Corte:</span> <strong>{{ hoy }}</strong></div>
                <div><span>Total llantas:</span> <strong>{{ inv.length }}</strong></div>
                <div class="page-counter">Pág. 1 de 2</div>
              </div>
            </header>

            <div class="report-title-section">
              <h1>Reporte de Estado y Composición del Parque de Llantas</h1>
              <p class="report-intro">
                Diagnóstico consolidado del inventario de llantas asignado a <strong>{{ plantaLabel }}</strong>: composición por marca y dimensión, distribución por tipo de equipo y estado, y unidades que requieren intervención por desgaste, con corte al <strong>{{ hoy }}</strong>.
              </p>
            </div>

            <div class="compact-kpi">
              <div class="ck"><span>Total llantas</span><strong>{{ inv.length }}</strong></div>
              <div class="ck"><span>En uso</span><strong>{{ countEstado('EN USO') }}</strong></div>
              <div class="ck"><span>Placas cubiertas</span><strong>{{ placasSet.size }}</strong></div>
              <div class="ck"><span>Marcas distintas</span><strong>{{ optMarca.length }}</strong></div>
              <div class="ck"><span>Prof. promedio</span><strong>{{ profProm }} mm</strong></div>
              <div class="ck" :class="{ alerta: criticas.length }"><span>Críticas (&lt; 3 mm)</span><strong>{{ criticas.length }}</strong></div>
              <div class="ck"><span>Dimensiones</span><strong>{{ optDimension.length }}</strong></div>
              <div class="ck"><span>Costo adquisición</span><strong>{{ costoTotal > 0 ? moneyShort(costoTotal) : '—' }}</strong></div>
            </div>

            <div class="report-section-block">
              <div class="report-two">
                <div class="data-card">
                  <div class="card-head">Inspección General</div>
                  <div class="table-wrap">
                    <table>
                      <tbody>
                        <tr><td>Vehículos con llantas registradas</td><td class="r bold">{{ placasSet.size }}</td></tr>
                        <tr><td>Total de llantas</td><td class="r bold">{{ inv.length }}</td></tr>
                        <tr><td>Llantas en uso</td><td class="r bold">{{ countEstado('EN USO') }}</td></tr>
                        <tr><td>Profundidad promedio</td><td class="r bold">{{ profProm }} mm</td></tr>
                        <tr><td>Llantas críticas (&lt; 3 mm)</td><td class="r bold red">{{ criticas.length }}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="data-card">
                  <div class="card-head">Semáforo General de Llantas</div>
                  <div class="table-wrap">
                    <table>
                      <tbody>
                        <tr><td>Cambio inmediato / Proyectado 30-60 días</td><td class="r">pendiente</td></tr>
                        <tr><td>En buen estado</td><td class="r">pendiente</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="mini-nota">Requiere registros de inspección (hoja <em>Inspec_Llantas</em> vacía).</div>
                </div>
              </div>
            </div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Composición de Flota — Marca × Dimensión</h3>
              <div class="data-card">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Marca</th>
                        <th v-for="d in matriz.dims" :key="d" class="r">{{ d }}</th>
                        <th class="r">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in matriz.rows" :key="row.marca">
                        <td class="bold accent-text">{{ row.marca }}</td>
                        <td v-for="d in matriz.dims" :key="d" class="r">{{ row.byDim[d] || '' }}</td>
                        <td class="r bold">{{ row.total }}</td>
                      </tr>
                      <tr class="table-total-row">
                        <td class="bold">TOTAL</td>
                        <td v-for="d in matriz.dims" :key="d" class="r bold">{{ matriz.colTotals[d] || 0 }}</td>
                        <td class="r bold">{{ inv.length }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <ChartCard title="" :option="composicionFlotaOpt" :height="300" hide-actions />
            </div>

            <div class="report-section-block">
              <div class="report-two">
                <div class="data-card">
                  <div class="card-head">Distribución por Estado</div>
                  <div class="table-wrap">
                    <table>
                      <thead><tr><th>Estado</th><th class="r">Llantas</th><th class="r">%</th></tr></thead>
                      <tbody>
                        <tr v-for="e in rankEstado" :key="e.label"><td class="bold">{{ e.label || 'Sin estado' }}</td><td class="r bold">{{ e.n }}</td><td class="r">{{ pct(e.n) }}%</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="data-card">
                  <div class="card-head">Distribución por Tipo de Vehículo</div>
                  <div class="table-wrap">
                    <table>
                      <thead><tr><th>Tipo</th><th class="r">Llantas</th><th class="r">%</th></tr></thead>
                      <tbody>
                        <tr v-for="t in rankTipo.slice(0, 8)" :key="t.label"><td class="bold">{{ t.label }}</td><td class="r bold">{{ t.n }}</td><td class="r">{{ pct(t.n) }}%</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <footer class="report-footer"><span>Gestión de Llantas — Gravicon</span><span>Documento Oficial | Página 1 de 2</span></footer>
          </div>

          <!-- PÁGINA 2 -->
          <div class="report-page">
            <div class="report-salto-superior"></div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Llantas que Requieren Cambio (profundidad &lt; 3 mm)</h3>
              <div class="data-card">
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Placa</th><th>Tipo</th><th>Serie</th><th>Marca</th><th>Dimensión</th><th>Eje / Lado</th><th class="r">Prof. mín.</th></tr></thead>
                    <tbody>
                      <tr v-for="(l, i) in criticas.slice(0, 28)" :key="i">
                        <td class="bold accent-text">{{ l['Placa'] }}</td>
                        <td>{{ l['Tipo de Vehículo'] }}</td>
                        <td>{{ l['Nº Serie'] }}</td>
                        <td>{{ l['Marca'] }}</td>
                        <td>{{ l['Dimensión'] }}</td>
                        <td>{{ l['Eje'] }} / {{ l['Lado'] }}</td>
                        <td class="r bold red">{{ (Number(l['Prof. Mínima']) || 0).toFixed(1) }} mm</td>
                      </tr>
                      <tr v-if="!criticas.length"><td colspan="7" class="empty-table">Sin llantas por debajo del umbral en el corte actual.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="report-section-block">
              <h3 class="report-block-title"><span class="title-bar"></span>Inventario por Vehículo</h3>
              <template v-for="g in inventarioPorVehiculo.slice(0, 10)" :key="g.placa">
                <div class="veh-head">{{ g.placa }} <span>· {{ g.tipo }} · {{ g.rows.length }} llantas · prof. mín. {{ g.min.toFixed(1) }} mm</span></div>
                <div class="data-card" style="margin-bottom:6px">
                  <div class="table-wrap">
                    <table>
                      <thead><tr><th>Serie</th><th>Marca</th><th>Dimensión</th><th>Modelo</th><th>Eje / Lado</th><th class="r">Ext</th><th class="r">Cen</th><th class="r">Int</th></tr></thead>
                      <tbody>
                        <tr v-for="(l, i) in g.rows" :key="i">
                          <td>{{ l['Nº Serie'] }}</td><td>{{ l['Marca'] }}</td><td>{{ l['Dimensión'] }}</td><td>{{ l['Modelo'] }}</td>
                          <td>{{ l['Eje'] }} / {{ l['Lado'] }}</td>
                          <td class="r">{{ numTxt(l['Prof. Externa']) }}</td><td class="r">{{ numTxt(l['Prof. Central']) }}</td><td class="r">{{ numTxt(l['Prof. Interna']) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </div>

            <footer class="report-footer"><span>Gestión de Llantas — Gravicon</span><span>Documento Oficial | Página 2 de 2</span></footer>
          </div>
        </div>
      </template>
    </template>

    <!-- Detalle de llanta -->
    <div v-if="detalle" class="modal-overlay" @click.self="detalle = null">
      <button class="modal-close" @click="detalle = null">✕</button>
      <div class="modal-panel llanta-modal-panel">
        <div class="ot-doc">
          <div class="hdr">
            <div class="hdr-logo"><img src="/Logos/Logo-Gravicon-Nuevo.png" alt="GRAVICON" @error="($event.target as HTMLImageElement).style.display='none'" /></div>
            <div class="hdr-info">
              <div class="co">GRAVICON S.A. - CONCRETOS {{ plantaLabel }}</div>
              <div class="ref">Código: F-LL-01 - Versión: 1 - Gestión de Llantas</div>
              <div class="ot-title">Ficha de Llanta</div>
            </div>
            <div class="hdr-folio">
              <div class="folio-lbl">Serie: <span class="folio-num">{{ detalle['Nº Serie'] || '—' }}</span></div>
              <div class="folio-date">Reg: {{ fechaTxt(detalle['Fecha Registro']) }}</div>
              <div class="folio-date">ID: {{ detalle['Id'] }}</div>
            </div>
          </div>

          <table class="meta-container"><tbody>
            <tr>
              <td class="meta-label">Marca:</td><td class="meta-value">{{ detalle['Marca'] || '—' }}</td>
              <td class="meta-label">Modelo / Diseño:</td><td class="meta-value">{{ detalle['Modelo'] || '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Dimensión:</td><td class="meta-value">{{ detalle['Dimensión'] || '—' }}</td>
              <td class="meta-label">DOT (fabricación):</td><td class="meta-value">{{ detalle['DOT'] || '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Estado de inventario:</td><td class="meta-value" style="font-weight:bold">{{ detalle['Estado'] || 'Sin estado' }}</td>
              <td class="meta-label">Aplicación:</td><td class="meta-value">{{ detalle['Aplicación'] || '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Costo adquisición:</td>
              <td class="meta-value" style="font-weight:bold;color:#3827f5">{{ Number(detalle['Costo Adquisición']) > 0 ? money(Number(detalle['Costo Adquisición'])) : '—' }}</td>
              <td class="meta-label">Fecha de compra:</td><td class="meta-value">{{ fechaTxt(detalle['Fecha Compra']) }}</td>
            </tr>
          </tbody></table>

          <div class="equipo-block">
            <div class="equipo-tag">Equipo / Vehículo Asignado</div>
            <div class="equipo-nombre">{{ detalle['Vehículo'] || detalle['Placa'] || detalle['Tipo de Vehículo'] }}</div>
            <table class="grid-table"><tbody>
              <tr>
                <td class="grid-label">Placa:</td><td class="grid-value" style="font-weight:bold">{{ detalle['Placa'] || '—' }}</td>
                <td class="grid-label">Código Equipo:</td><td class="grid-value">{{ detalle['Equipo ID'] || '—' }}</td>
              </tr>
              <tr>
                <td class="grid-label">Tipo de vehículo:</td><td class="grid-value">{{ detalle['Tipo de Vehículo'] || '—' }}</td>
                <td class="grid-label">Localización:</td><td class="grid-value">{{ detalle['Localización'] || '—' }}</td>
              </tr>
              <tr>
                <td class="grid-label">Posición (Eje):</td><td class="grid-value">{{ detalle['Eje'] || '—' }}</td>
                <td class="grid-label">Posición (Lado):</td><td class="grid-value">{{ detalle['Lado'] || '—' }}</td>
              </tr>
              <tr>
                <td class="grid-label" style="border-top:1px dashed #ddd;padding-top:8px">Prof. Externa:</td>
                <td class="grid-value" style="border-top:1px dashed #ddd;padding-top:8px">{{ numTxt(detalle['Prof. Externa']) }} mm</td>
                <td class="grid-label" style="border-top:1px dashed #ddd;padding-top:8px">Prof. Central:</td>
                <td class="grid-value" style="border-top:1px dashed #ddd;padding-top:8px">{{ numTxt(detalle['Prof. Central']) }} mm</td>
              </tr>
              <tr>
                <td class="grid-label">Prof. Interna:</td><td class="grid-value">{{ numTxt(detalle['Prof. Interna']) }} mm</td>
                <td class="grid-label">Prof. Mínima:</td>
                <td class="grid-value" :style="{ fontWeight: 'bold', color: Number(detalle['Prof. Mínima']) > 0 && Number(detalle['Prof. Mínima']) < 3 ? '#dc2626' : '#1a1a1a' }">{{ numTxt(detalle['Prof. Mínima']) }} mm</td>
              </tr>
            </tbody></table>
          </div>

          <div class="sec-bar">Historial de Inspecciones ({{ (detalle['_historial'] as any[])?.length || 0 }})</div>
          <table class="grid-table" v-if="(detalle['_historial'] as any[])?.length">
            <thead><tr>
              <td class="grid-label">Fecha</td><td class="grid-label">Evaluador</td><td class="grid-label">Km</td>
              <td class="grid-label">PSI</td><td class="grid-label">Ext / Cen / Int</td><td class="grid-label">Condición</td><td class="grid-label">Plan de acción</td>
            </tr></thead>
            <tbody>
              <tr v-for="(h, i) in (detalle['_historial'] as any[])" :key="i">
                <td class="grid-value">{{ fechaTxt(h.fecha) }}</td>
                <td class="grid-value">{{ h.evaluador || '—' }}</td>
                <td class="grid-value">{{ h.kilometraje || '—' }}</td>
                <td class="grid-value">{{ h.psi || '—' }}</td>
                <td class="grid-value">{{ numTxt(h.profExterna) }} / {{ numTxt(h.profCentral) }} / {{ numTxt(h.profInterna) }}</td>
                <td class="grid-value">{{ h.condiciones || '—' }}</td>
                <td class="grid-value">{{ h.planAccion || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="doc-empty">Sin inspecciones registradas para esta llanta todavía.</div>

          <div class="sec-bar">Cronología</div>
          <div class="doc-empty">La hoja tendrá cronología de movimientos (montaje, rotación, reencauche, baja) más adelante.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLlantasStore } from '../../stores'
import { useTheme } from '../../composables/useTheme'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'

const { theme } = useTheme()
const isDark = computed(() => theme.value !== 'light')
const chartText = computed(() => (isDark.value ? '#94a3b8' : '#475569'))
const chartSplit = computed(() => (isDark.value ? 'rgba(255,255,255,0.07)' : '#e2e8f0'))

const props = defineProps<{ planta?: string }>()
const plantaLabel = computed(() => {
  const p = (props.planta ?? '').toLowerCase()
  return p === 'concretos' ? 'Concretos' : p === 'acacias' ? 'Acacías' : p === 'cuncia' ? 'Cuncía' : 'Concretos'
})

const store = useLlantasStore()
const vista = ref<'graficas' | 'inventario' | 'informe'>('graficas')
onMounted(() => {
  if (!store.data) void store.fetchData()
  if (typeof document !== 'undefined' && !document.querySelector('script[src="https://scripts.sirv.com/sirvjs/v3/sirv.js"]')) {
    const s = document.createElement('script')
    s.src = 'https://scripts.sirv.com/sirvjs/v3/sirv.js'
    s.async = true
    document.head.appendChild(s)
  }
})

const palette = ['#15223c', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#A855F7']

function fmt(n: number) { return n.toLocaleString('es-CO') }
function money(n: number) { return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function moneyShort(n: number) { return n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : money(n) }
function numTxt(v: unknown) { const n = Number(v); return n > 0 ? n.toFixed(1) : '—' }
/** Serial de Excel o texto → fecha legible YYYY-MM-DD. */
function fechaTxt(v: unknown): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!isNaN(n) && n > 20000 && n < 90000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
    return d.toISOString().slice(0, 10)
  }
  return String(v)
}

function normMarca(m: unknown): string {
  let s = String(m ?? '').toUpperCase().trim()
  s = s.replace(/\s*[/-]\s*(REPUESTO|EMERGENCIA).*/i, '').replace(/\bREPUESTO\b/i, '').replace(/\s+/g, ' ').trim()
  const alias: Record<string, string> = {
    KUHMO: 'KUMHO', DOBLECOIN: 'DOUBLE COIN', DOUBLECOIN: 'DOUBLE COIN',
    BRIDG: 'BRIDGESTONE', 'MULTIAXLE SESTANTE': 'SESTANTE', LANDI: 'LANDY',
  }
  return alias[s] || s || 'SIN MARCA'
}

const inv = computed<Record<string, unknown>[]>(() => (store.data?.inventario ?? []).map(r => ({ ...r, Marca: normMarca(r['Marca']) })))
const datosParciales = computed(() => costoTotal.value === 0 || (store.data?.totalInspecciones ?? 0) === 0)

const uniq = (key: string) => [...new Set(inv.value.map(r => String(r[key] ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
const optMarca = computed(() => uniq('Marca'))
const optDimension = computed(() => uniq('Dimensión'))

function countEstado(frag: string) { return inv.value.filter(r => String(r['Estado'] ?? '').toUpperCase().includes(frag)).length }
const placasSet = computed(() => new Set(inv.value.map(r => String(r['Placa'] ?? '').trim()).filter(Boolean)))
const costoTotal = computed(() => inv.value.reduce((s, r) => s + (Number(r['Costo Adquisición']) || 0), 0))
const profProm = computed(() => {
  const vals = inv.value.map(r => Number(r['Prof. Mínima']) || 0).filter(v => v > 0)
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '0.0'
})
const criticas = computed(() => inv.value
  .filter(r => { const p = Number(r['Prof. Mínima']) || 0; return p > 0 && p < 3 })
  .sort((a, b) => (Number(a['Prof. Mínima']) || 0) - (Number(b['Prof. Mínima']) || 0)))

function rankBy(key: string, limit = Infinity) {
  const m = new Map<string, number>()
  for (const r of inv.value) { const k = String(r[key] ?? '').trim() || 'Sin dato'; m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, limit)
}
const rankMarca = computed(() => rankBy('Marca'))
const rankDimension = computed(() => rankBy('Dimensión'))
const rankTipo = computed(() => rankBy('Tipo de Vehículo'))
const rankEstado = computed(() => rankBy('Estado'))
const rankAplicacion = computed(() => rankBy('Aplicación'))
const rankPlanta = computed(() => rankBy('Planta'))
const rankPlacaCount = computed(() => rankBy('Placa', 15).filter(x => x.label !== 'Sin dato'))
const rankPlacaProf = computed(() => {
  const m = new Map<string, { sum: number; n: number; tipo: string }>()
  for (const r of inv.value) {
    const p = String(r['Placa'] ?? '').trim(); if (!p) continue
    const prof = Number(r['Prof. Mínima']) || 0; if (prof <= 0) continue
    const e = m.get(p) ?? { sum: 0, n: 0, tipo: String(r['Tipo de Vehículo'] ?? '') }
    e.sum += prof; e.n++; m.set(p, e)
  }
  return [...m.entries()].map(([placa, e]) => ({ placa, prom: e.sum / e.n, tipo: e.tipo }))
    .sort((a, b) => a.prom - b.prom).slice(0, 15)
})

function pieOpt(entries: { label: string; n: number }[]) {
  const total = entries.reduce((s, e) => s + e.n, 0)
  return {
    color: palette,
    tooltip: { trigger: 'item', formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} llantas · ${p.percent}%` },
    legend: { type: 'scroll', orient: 'vertical', right: 6, top: 'center', textStyle: { fontSize: 11, color: chartText.value }, pageTextStyle: { color: chartText.value } },
    graphic: total ? [{ type: 'text', left: '35%', top: '48%', style: { text: String(total), textAlign: 'center', fill: isDark.value ? '#e2e8f0' : '#0f172a', fontSize: 20, fontWeight: 700 } },
      { type: 'text', left: '35%', top: '58%', style: { text: 'llantas', textAlign: 'center', fill: chartText.value, fontSize: 10 } }] : [],
    series: [{
      type: 'pie', radius: ['46%', '70%'], center: ['35%', '52%'], avoidLabelOverlap: true, minAngle: 3,
      itemStyle: { borderRadius: 5, borderColor: isDark.value ? '#0f172a' : '#fff', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => (p.percent >= 6 ? p.percent + '%' : ''), fontSize: 10, color: chartText.value, fontWeight: 600 },
      labelLine: { show: false },
      data: entries.slice(0, 10).map(e => ({ name: e.label, value: e.n })),
    }],
  }
}
function hBarOpt(labels: string[], values: number[], colors?: string[]) {
  return {
    grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { lineStyle: { color: chartSplit.value, type: 'dashed' } } },
    yAxis: { type: 'category', inverse: true, data: labels, axisLabel: { fontSize: 11, color: chartText.value, fontWeight: 600 }, axisLine: { lineStyle: { color: chartSplit.value } }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: '60%',
      data: values.map((v, i) => ({ value: v, itemStyle: { color: colors ? colors[i] : palette[1] } })),
      label: { show: true, position: 'right', fontSize: 10, fontWeight: 700, color: chartText.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  }
}
const pieMarca = computed(() => pieOpt(rankMarca.value))
const pieDimension = computed(() => pieOpt(rankDimension.value))
const pieTipo = computed(() => pieOpt(rankTipo.value))
const pieEstado = computed(() => pieOpt(rankEstado.value))
const pieAplicacion = computed(() => pieOpt(rankAplicacion.value))
const piePlanta = computed(() => pieOpt(rankPlanta.value))
const barPlacaCount = computed(() => hBarOpt(rankPlacaCount.value.map(x => x.label), rankPlacaCount.value.map(x => x.n)))
const barPlacaProf = computed(() => hBarOpt(
  rankPlacaProf.value.map(x => x.placa),
  rankPlacaProf.value.map(x => +x.prom.toFixed(1)),
  rankPlacaProf.value.map(x => (x.prom < 3 ? '#EF4444' : x.prom < 5 ? '#F59E0B' : '#10B981')),
))

const matriz = computed(() => {
  const dimCount = new Map<string, number>()
  for (const r of inv.value) dimCount.set(String(r['Dimensión'] ?? '—'), (dimCount.get(String(r['Dimensión'] ?? '—')) || 0) + 1)
  const dims = [...dimCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(d => d[0])
  const byMarca = new Map<string, Record<string, number>>()
  for (const r of inv.value) {
    const mk = String(r['Marca'] ?? 'SIN MARCA')
    const dm = dims.includes(String(r['Dimensión'] ?? '')) ? String(r['Dimensión']) : 'Otras'
    const row = byMarca.get(mk) ?? {}
    row[dm] = (row[dm] || 0) + 1
    byMarca.set(mk, row)
  }
  const allDims = [...dims, 'Otras']
  const rows = [...byMarca.entries()]
    .map(([marca, byDim]) => ({ marca, byDim, total: Object.values(byDim).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
  const colTotals: Record<string, number> = {}
  for (const d of allDims) colTotals[d] = rows.reduce((s, r) => s + (r.byDim[d] || 0), 0)
  return { dims: allDims, rows, colTotals }
})

/** Gráfica "Composición de Flotas" del PDF: marcas en X, series por dimensión. */
const composicionFlotaOpt = computed(() => {
  const dims = matriz.value.dims
  const marcas = matriz.value.rows.map(r => r.marca)
  return {
    color: palette,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: chartText.value } },
    grid: { left: 8, right: 16, top: 16, bottom: 44, containLabel: true },
    xAxis: { type: 'category', data: marcas, axisLabel: { fontSize: 10, interval: 0, rotate: marcas.length > 6 ? 30 : 0, color: chartText.value }, axisLine: { lineStyle: { color: chartSplit.value } } },
    yAxis: { type: 'value', axisLabel: { color: chartText.value }, splitLine: { lineStyle: { type: 'dashed', color: chartSplit.value } } },
    series: dims.map((d, i) => ({
      name: d, type: 'bar', stack: 'flota',
      data: matriz.value.rows.map(r => r.byDim[d] || 0),
      itemStyle: { color: palette[i % palette.length] },
      barMaxWidth: 46,
    })),
  }
})

const inventarioPorVehiculo = computed(() => {
  const m = new Map<string, { placa: string; tipo: string; rows: Record<string, unknown>[]; min: number }>()
  for (const r of inv.value) {
    const p = String(r['Placa'] ?? '').trim() || 'SIN PLACA'
    const e = m.get(p) ?? { placa: p, tipo: String(r['Tipo de Vehículo'] ?? ''), rows: [], min: Infinity }
    e.rows.push(r)
    const prof = Number(r['Prof. Mínima']) || 0
    if (prof > 0) e.min = Math.min(e.min, prof)
    m.set(p, e)
  }
  return [...m.values()].map(g => ({ ...g, min: g.min === Infinity ? 0 : g.min })).sort((a, b) => a.min - b.min)
})

function pct(n: number) { return inv.value.length ? Math.round((n / inv.value.length) * 100) : 0 }
const hoy = new Date().toISOString().slice(0, 10)

const invTableRows = computed(() => inv.value.map(r => {
  const { _raw, _historial, _cronologia, ...rest } = r as Record<string, unknown>
  void _raw; void _historial; void _cronologia
  return rest
}))
const detalle = ref<Record<string, unknown> | null>(null)
function openDetalle(row: Record<string, unknown>) {
  // La tabla entrega la fila "limpia"; recuperamos la original (con _historial) por Id.
  detalle.value = inv.value.find(r => r['Id'] === row['Id']) ?? row
}

const reportRef = ref<HTMLElement | null>(null)
const generando = ref(false)
async function generarPdf() {
  if (generando.value || !reportRef.value) return
  generando.value = true
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    await new Promise(r => requestAnimationFrame(() => r(null)))
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pages = reportRef.value.querySelectorAll<HTMLElement>('.report-page')
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', logging: false })
      const w = 210
      const h = (canvas.height * w) / canvas.width
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, Math.min(h, 297))
    }
    if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme')
    pdf.save(`Informe_Llantas_${plantaLabel.value}_${hoy}.pdf`)
  } catch (e) { console.error('[llantas-pdf]', e) }
  finally { generando.value = false }
}
</script>

<style scoped>
.inspeccion-tab { display: flex; flex-direction: column; gap: 18px; padding: 4px 0; }

.almacen-view-toggle { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.av-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600;
  color: var(--text-secondary); background: var(--bg-alt); border: 1px solid var(--card-border);
  border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast);
}
.av-btn:hover { border-color: var(--card-border-hover); color: var(--text-primary); }
.av-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }

.disp-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.disp-banner.load { background: var(--card-bg, #f0f4ff); border: 1px solid var(--card-border, #dbeafe); color: var(--navy, #172954); }
.disp-banner.err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.disp-banner.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
:root:not([data-theme="light"]) .disp-banner.warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #fcd34d; }

.title-bar { width: 14px; height: 2px; background: var(--accent, #172954); display: inline-block; border-radius: 1px; }

/* Tarjetas de datos + tablas (mismo estilo que Disponibilidad / Mantenimiento) */
.data-card { background: #ffffff; border: 1px solid var(--card-border, #e2e8f0); border-radius: 4px; overflow: hidden; }
.card-head { padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid var(--card-border, #e2e8f0); font-size: 11px; font-weight: 700; color: var(--navy, #172954); text-transform: uppercase; }
.table-wrap { width: 100%; overflow-x: auto; }
.table-wrap table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.table-wrap th { background: #f8fafc; color: var(--navy, #172954); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 6px 10px; border-bottom: 1.5px solid var(--card-border, #e2e8f0); text-align: left; }
.table-wrap td { padding: 5.5px 10px; border-bottom: 1px solid var(--card-border, #f1f5f9); vertical-align: middle; }
.table-wrap tr:hover td { background: #f8fafc; }
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.bold { font-weight: 700; }
.accent-text { color: var(--navy, #172954); }
.red { color: #dc2626; }
.table-total-row td { background: #f1f5f9 !important; font-weight: 700 !important; border-top: 2px solid var(--card-border, #cbd5e1) !important; }
.empty-table { text-align: center; padding: 12px; color: var(--text-secondary); font-size: 11.5px; }

/* Barra de control del informe */
.informe-control-bar { display: flex; justify-content: space-between; align-items: center; background: var(--card-bg, #fff); border: 1px solid var(--card-border, #e5e7eb); border-radius: var(--radius-md, 10px); padding: 12px 18px; box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 12px; }
.icb-info { display: flex; flex-direction: column; gap: 2px; }
.icb-tag { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--navy, #172954); }
.icb-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.icb-actions { display: flex; align-items: center; gap: 8px; }
.tb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid var(--card-border, #d1d5db); border-radius: 8px; background: var(--card-bg, #fff); color: var(--text-primary, #1e293b); font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s ease; white-space: nowrap; }
.tb-btn.primary { background: var(--navy, #172954); color: #fff; border-color: var(--navy, #172954); }
.tb-btn.primary:hover { background: #1e3a8a; border-color: #1e3a8a; }
.tb-btn:disabled { opacity: .55; cursor: not-allowed; }
.tb-btn svg { flex-shrink: 0; }

/* Papel de reporte oficial */
.report-paper { background: transparent; display: flex; flex-direction: column; gap: 24px; align-items: center; width: 100%; }
.report-page { width: 100%; min-height: 297mm; padding: 12mm 14mm 14mm; background: #fff; color: #1a1a2e; border: 1px solid var(--card-border, #e2e8f0); border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,.07); position: relative; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; page-break-after: always; break-after: page; font-family: 'Lato','Segoe UI',Arial,sans-serif; font-size: 12px; line-height: 1.5; }
.report-salto-superior { height: 8mm; flex-shrink: 0; }
.report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid var(--navy, #172954); padding-bottom: 10px; position: relative; flex-wrap: wrap; gap: 12px; }
.report-header::after { content: ""; position: absolute; left: 0; bottom: -2.5px; width: 74px; height: 2.5px; background: #a90707; }
.report-header-brand { display: flex; align-items: center; gap: 12px; }
.report-logo { height: 48px; max-width: 190px; object-fit: contain; display: block; }
.report-logo--dark { display: none; }
:root[data-theme="dark"] .report-logo--light { display: none; }
:root[data-theme="dark"] .report-logo--dark { display: block; }
.report-header-text h2 { font-size: 14px; font-weight: 700; color: var(--navy, #172954); margin: 0; }
.report-header-text span { font-size: 12px; color: var(--text-secondary); }
.report-header-meta { text-align: right; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.report-header-meta strong { color: var(--text-primary); }
.page-counter { font-weight: 700; color: var(--navy, #172954); }
.report-title-section { text-align: center; margin: 4px 0 12px; width: 100%; }
.report-title-section h1 { font-size: 21px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: var(--text-primary); margin: 0 0 6px; }
.report-intro { font-size: 12px; color: var(--text-secondary, #475569); margin: 6px 0 0; line-height: 1.65; text-align: justify; }
.compact-kpi { margin: 4px 0 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; box-sizing: border-box; }
.ck { border: 1px solid var(--card-border, #e2e8f0); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; }
.ck span { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
.ck strong { font-size: 16px; color: var(--navy, #172954); }
.ck.alerta { border-color: #fecaca; background: #fef2f2; }
.ck.alerta strong { color: #dc2626; }
.report-nota { border-left: 3px solid var(--navy, #172954); background: var(--card-bg-hover, #f8fafc); padding: 8px 12px; font-size: 12px; color: var(--text-primary); border-radius: 0 6px 6px 0; line-height: 1.4; }
.mini-nota { font-size: 10px; color: #94a3b8; padding: 6px 10px; font-style: italic; }
.report-section-block { display: flex; flex-direction: column; gap: 6px; }
.report-block-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--navy, #172954); margin: 0; }
.report-footer { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--card-border, #e2e8f0); display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary, #64748b); font-weight: 500; }
.report-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.veh-head { font-size: 11px; font-weight: 800; color: var(--navy, #172954); margin: 10px 0 4px; }
.veh-head span { font-weight: 500; color: #64748b; }

/* Detalle modal */
/* Modal de detalle — mismo diseño que el detalle de Órdenes de Trabajo (documento en papel) */
.modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.65); display: flex; align-items: flex-start; justify-content: center; padding: 24px; overflow-y: auto; }
.modal-close { position: fixed; top: 16px; right: 16px; z-index: 10000; width: 38px; height: 38px; border: 1px solid #d1d5db; border-radius: 50%; background: #fff; color: #374151; font-size: 17px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,.12); transition: all .2s; }
.modal-close:hover { background: #ef4444; border-color: #ef4444; color: #fff; }
.modal-panel.llanta-modal-panel { background: #fff; border-radius: 10px; width: 100%; max-width: 820px; box-shadow: 0 25px 80px rgba(0,0,0,.5); overflow: hidden; animation: modalIn .22s ease; }
@keyframes modalIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }

.ot-doc { padding: 10mm; font-family: 'Lato', sans-serif; font-size: 11px; line-height: 1.3; color: #1a1a1a; }
.ot-doc .hdr { display: table; width: 100%; border-bottom: 2px solid #3827F5; padding-bottom: 8px; margin-bottom: 12px; }
.ot-doc .hdr-logo { display: table-cell; width: 25%; vertical-align: middle; }
.ot-doc .hdr-logo img { max-width: 140px; height: auto; }
.ot-doc .hdr-info { display: table-cell; width: 50%; vertical-align: middle; padding-left: 15px; }
.ot-doc .hdr-info .co { font-size: 12px; font-weight: bold; color: #3827F5; text-transform: uppercase; }
.ot-doc .hdr-info .ref { font-size: 9px; color: #555; margin-top: 2px; }
.ot-doc .hdr-info .ot-title { font-size: 14px; font-weight: bold; color: #3827F5; margin-top: 4px; text-transform: uppercase; }
.ot-doc .hdr-folio { display: table-cell; width: 25%; text-align: right; vertical-align: middle; }
.ot-doc .folio-lbl { font-size: 10px; color: #333; font-weight: bold; }
.ot-doc .folio-num { font-size: 14px; font-weight: bold; color: #d9534f; }
.ot-doc .folio-date { font-size: 8.5px; color: #666; }
.ot-doc .meta-container { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
.ot-doc .meta-container td { padding: 4px 6px; font-size: 10px; vertical-align: middle; }
.ot-doc .meta-label { font-weight: bold; color: #333; width: 25%; }
.ot-doc .meta-value { color: #555; border-bottom: 1px dashed #ccc; width: 25%; }
.ot-doc .equipo-block { background: #f8f9fa; border: 1px solid #3827F5; border-radius: 4px; padding: 10px; margin-bottom: 15px; }
.ot-doc .equipo-tag { font-size: 9px; font-weight: bold; color: #3827F5; text-transform: uppercase; }
.ot-doc .equipo-nombre { font-size: 15px; font-weight: bold; color: #3827F5; margin-bottom: 6px; }
.ot-doc .grid-table { width: 100%; border-collapse: collapse; }
.ot-doc .grid-table td { padding: 4px 6px; font-size: 10.5px; vertical-align: middle; }
.ot-doc .grid-label { color: #555; font-weight: bold; }
.ot-doc .grid-value { color: #1a1a1a; }
.ot-doc .sec-bar { font-size: 11px; font-weight: bold; color: #1a1a1a; text-align: left; padding: 6px 0; margin: 15px 0 8px; text-transform: uppercase; border-top: .5px solid #ccc; border-bottom: .5px solid #ccc; }
.ot-doc .doc-empty { font-size: 10px; color: #999; font-style: italic; padding: 4px 6px; }
.ot-doc thead .grid-label { border-bottom: 1px solid #ccc; text-transform: uppercase; font-size: 9px; }

/* ===== El informe en pantalla se adapta a modo nocturno (el PDF sigue en blanco) ===== */
:root[data-theme="dark"] .report-page { background: #0f172a; color: #cbd5e1; border-color: rgba(255,255,255,.08); box-shadow: 0 4px 24px rgba(0,0,0,.4); }
:root[data-theme="dark"] .report-header-text h2,
:root[data-theme="dark"] .report-title-section h1,
:root[data-theme="dark"] .report-block-title,
:root[data-theme="dark"] .card-head,
:root[data-theme="dark"] .ck strong,
:root[data-theme="dark"] .accent-text,
:root[data-theme="dark"] .page-counter { color: #e2e8f0; }
:root[data-theme="dark"] .report-header-meta,
:root[data-theme="dark"] .report-intro,
:root[data-theme="dark"] .report-footer,
:root[data-theme="dark"] .veh-head span { color: #94a3b8; }
:root[data-theme="dark"] .report-header-meta strong { color: #cbd5e1; }
:root[data-theme="dark"] .data-card { background: #131c30; border-color: rgba(255,255,255,.08); }
:root[data-theme="dark"] .card-head,
:root[data-theme="dark"] .table-wrap th { background: #1a2540; border-color: rgba(255,255,255,.08); color: #cbd5e1; }
:root[data-theme="dark"] .table-wrap td { border-color: rgba(255,255,255,.06); }
:root[data-theme="dark"] .table-wrap tr:hover td { background: rgba(255,255,255,.03); }
:root[data-theme="dark"] .table-total-row td { background: #1a2540 !important; border-top-color: rgba(255,255,255,.15) !important; }
:root[data-theme="dark"] .report-nota { background: rgba(255,255,255,.04); color: #cbd5e1; }
:root[data-theme="dark"] .ck { border-color: rgba(255,255,255,.1); }
:root[data-theme="dark"] .ck span { color: #94a3b8; }
:root[data-theme="dark"] .ck.alerta { background: rgba(220,38,38,.14); border-color: rgba(220,38,38,.4); }
:root[data-theme="dark"] .report-header { border-bottom-color: #3b4a6b; }

@media (max-width: 640px) { .report-two { grid-template-columns: 1fr; } .compact-kpi { grid-template-columns: repeat(2, 1fr); } }
</style>
