<template>
  <div class="disponibilidad-tab">
    <!-- Toggle de Vistas de Disponibilidad: Gráficas | Detalles | Informe -->
    <div class="almacen-view-toggle">
      <button class="av-btn" :class="{ active: dispView === 'graficas' }" @click="dispView = 'graficas'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Gráficas
      </button>
      <button class="av-btn" :class="{ active: dispView === 'detalles' }" @click="dispView = 'detalles'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Detalles
      </button>
      <button class="av-btn" :class="{ active: dispView === 'informe' }" @click="dispView = 'informe'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Informe
      </button>
    </div>

    <!-- ========================================== -->
    <!-- VISTA 1: GRÁFICAS DE DISPONIBILIDAD        -->
    <!-- ========================================== -->
    <template v-if="dispView === 'graficas'">
      <!-- Banner de carga mientras el store trae los datos de disponibilidad -->
      <div v-if="dispStore.loading" class="disp-loading-banner">
        <svg class="disp-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Cargando datos de disponibilidad — {{ plantaLabel }}...
      </div>
      <div v-else-if="dispStore.error" class="disp-error-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Error cargando datos: {{ dispStore.error }}
        <button class="disp-retry-btn" @click="dispStore.fetchDisponibilidad(plantaKey, true)">Reintentar</button>
      </div>
      <div v-else-if="activePlacasRows.length === 0" class="disp-empty-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        No hay datos de disponibilidad para <strong>{{ plantaLabel }}</strong>. Verifique la hoja "Reporte Placa Disponibilidad" en el spreadsheet.
      </div>

      <!-- Tarjetas KPI con el diseño y tamaño estándar de 4 columnas (2 filas) -->
      <div class="kpi-row">
        <KpiCard
          label="Flota Propia"
          accent="#15223c"
          icon="package"
          :value="String(kpis.flotaPropia)"
        />

        <KpiCard
          label="Alquilados"
          accent="#2a3f6b"
          icon="truck"
          :value="String(kpis.alquilados)"
        />

        <KpiCard
          label="Operativos"
          accent="#10B981"
          icon="check-circle"
          :value="kpis.operativosFormatted"
        />

        <KpiCard
          label="No Operativos"
          accent="#EF4444"
          icon="activity"
          :value="String(kpis.noOperativos)"
        />

        <KpiCard
          label="Disponibilidad Propia"
          :accent="kpis.dispPropiaPct >= 85 ? '#10B981' : kpis.dispPropiaPct >= 60 ? '#F59E0B' : '#EF4444'"
          :meta="'Meta: 85%'"
          icon="target"
          :value="kpis.dispPropiaPct + '%'"
        />

        <KpiCard
          label="Disponible en Cancha"
          :accent="kpis.dispCanchaPct >= 85 ? '#10B981' : kpis.dispCanchaPct >= 60 ? '#F59E0B' : '#EF4444'"
          icon="trending-up"
          :value="kpis.dispCanchaPct + '%'"
        />

        <KpiCard
          label="Cobertura de Inspección"
          accent="#3B82F6"
          icon="zap"
          :value="kpis.coberturaPct + '%'"
        />

        <KpiCard
          label="Días de Rezago"
          accent="#8B5CF6"
          icon="clock"
          :value="String(kpis.diasRezago)"
        />
      </div>

      <!-- ======================================================= -->
      <!-- GRÁFICAS DE DISPONIBILIDAD (todas las plantas)           -->
      <!-- ======================================================= -->

        <!-- Gráficas: Disponibilidad por Equipo + Incidencia de Mantenimiento (ref: foto 1) -->
        <div class="charts-grid cols-2">
          <ChartCard
            title="Disponibilidad Operativa por Equipo"
            description="% de días operativos sobre el total del período — semáforo: azul ≥85%, amarillo ≥60%, rojo <60%"
            :option="dispEquipoOpt"
            :expand-option="dispEquipoFullOpt"
            :height="440"
          />
          <ChartCard
            title="Incidencia de Mantenimiento por Equipo"
            description="% de días en mantenimiento vs. días totales del período"
            :option="incidenciaMantenimientoOpt"
            :expand-option="incidenciaMantenimientoFullOpt"
            :height="440"
          />
        </div>

        <!-- Gráfica: Disponibilidad por Planta y Distribución Mensual (ref: foto 2) -->
        <div class="charts-grid cols-1">
          <ChartCard
            title="Disponibilidad por Planta y Distribución de Días Operativos vs. Mantenimiento"
            description="Evolución mensual por sede con línea de promedio de mantenimiento"
            :option="dispMensualPlantaOpt"
            :height="360"
          />
        </div>

        <!-- Gráfica: Días Promedio Operación vs Mantenimiento por Tipo de Vehículo (ref: imagen 11) -->
        <div class="charts-grid cols-1">
          <ChartCard
            title="Días Promedio de Operación vs. Mantenimiento por Tipo de Vehículo"
            description="Comparativo de días operativos (azul oscuro) vs. días en mantenimiento (rojo) agrupados por categoría de equipo"
            :option="diasPromTipoOpt"
            :height="320"
          />
        </div>
        <!-- Gráfica 1: Comparativo y Variación Diaria Ronda AM vs Ronda PM (Líneas) -->
        <div class="charts-grid cols-1">
          <ChartCard
            :title="`Variación Diaria de Disponibilidad — Ronda AM vs Ronda PM (${plantaLabel})`"
            description="Evolución diaria comparativa de la ronda de la mañana frente a la tarde. Meta institucional: 85%."
            :option="amVsPmTrendOpt"
            :height="340"
          />
        </div>

        <!-- Gráficas 2 y 3: Tipo de Equipo y Operatividad Global -->
        <div class="charts-grid cols-2">
          <ChartCard
            title="Disponibilidad por Tipo de Equipo — Agregados"
            description="Desglose de maquinaria de Agregados: Trituradoras, Bandas, Cargadores y Volquetas"
            :option="tipoEquipoOpt"
            :height="300"
          />

          <ChartCard
            :title="`Operatividad Global — Maquinaria ${plantaLabel}`"
            description="Distribución porcentual de operatividad sobre la flota total del módulo"
            :option="donaOpt"
            :height="300"
          />
        </div>

        <!-- Gráficas 4 y 5: Brecha Diaria y Disponibilidad por Planta -->
        <div class="charts-grid cols-2">
          <ChartCard
            title="Brecha Diaria AM vs PM (Control de Inspección)"
            description="Diferencia diaria en puntos porcentuales entre la ronda de la mañana y la tarde"
            :option="brechaDiariaOpt"
            :height="300"
          />

          <ChartCard
            title="Disponibilidad por Frente de Trabajo — Maquinaria"
            description="Operatividad agrupada por frente de extracción, cantera o beneficio (excluye sedes de planta concretera)"
            :option="plantaOpt"
            :height="300"
          />
        </div>

        <!-- Gráfica 6: Top Equipos con Mayor Inactividad / Días en Taller -->
        <div class="charts-grid cols-1">
          <ChartCard
            title="Top Equipos con Mayor Inactividad / Días en Taller"
            description="Equipos con mayor permanencia fuera de servicio o pendientes de orden de trabajo"
            :option="topInactivosOpt"
            :expand-option="topInactivosFullOpt"
            :height="320"
          />
        </div>
    </template>

    <!-- ========================================== -->
    <!-- VISTA 2: DETALLES                          -->
    <!-- ========================================== -->
    <template v-else-if="dispView === 'detalles'">
      <div class="ots-section">
        <div class="ots-bar">
          <div class="ots-stats">
            <span><strong>{{ activePlacasRows.length }}</strong> registros</span>
            <span class="ots-dot"></span>
            <span class="stat-op"><strong>{{ kpis.operativos }}</strong> operativos</span>
            <span class="ots-dot"></span>
            <span class="stat-noop"><strong>{{ kpis.noOperativos }}</strong> no operativos</span>
            <span class="ots-dot"></span>
            <span class="stat-warn"><strong>{{ kpis.parciales }}</strong> parciales</span>
          </div>
        </div>

        <div class="data-card">
          <div v-if="activePlacasRows.length === 0" class="empty-table">Sin datos de disponibilidad para este corte</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="idx-col">#</th>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Supervisor</th>
                  <th>Localización</th>
                  <th class="r">Rev. AM</th>
                  <th class="r">Rev. PM</th>
                  <th class="r">Score</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in activePlacasRows" :key="i">
                  <td class="idx">{{ i + 1 }}</td>
                  <td class="bold accent-text">{{ r['Placa_Texto'] ?? r['Placa'] ?? '—' }}</td>
                  <td>{{ r['Tipo de Vehiculos'] ?? r['Clase de Mantenimiento'] ?? '—' }}</td>
                  <td>{{ r['Supervisor_Texto'] ?? r['Supervisor'] ?? '—' }}</td>
                  <td>{{ r['Localizacion'] ?? r['Localización'] ?? r['Area de Trabajo'] ?? '—' }}</td>
                  <td class="r" :class="Number(r['Rev_AM'] ?? NaN) === 0 ? 'red' : Number(r['Rev_AM'] ?? NaN) >= 0.9 ? 'green' : 'yellow'">{{ r['Rev_AM'] ?? '—' }}</td>
                  <td class="r" :class="Number(r['Rev_PM'] ?? NaN) === 0 ? 'red' : Number(r['Rev_PM'] ?? NaN) >= 0.9 ? 'green' : 'yellow'">{{ r['Rev_PM'] ?? '—' }}</td>
                  <td class="r bold" :class="(Number(r['Porcentaje_Placa'] ?? NaN) >= 85) ? 'green' : (Number(r['Porcentaje_Placa'] ?? NaN) >= 60) ? 'yellow' : 'red'">{{ r['Porcentaje_Placa'] ?? '—' }}</td>
                  <td>
                    <span v-if="Number(r['Porcentaje_Placa'] ?? NaN) >= 0.9" class="pill p-verde">Operativo</span>
                    <span v-else-if="Number(r['Porcentaje_Placa'] ?? NaN) >= 0.1" class="pill p-ambar">Parcial</span>
                    <span v-else class="pill p-rojo">No Op.</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- VISTA 3: INFORME OFICIAL DE DISPONIBILIDAD           -->
    <!-- ==================================================== -->
    <template v-else-if="dispView === 'informe'">

      <!-- Barra superior del informe: utiliza el filtro principal y botón Imprimir / PDF -->
      <div class="informe-control-bar">
        <div class="icb-info">
          <span class="icb-tag">Reporte Diario Oficial</span>
          <span class="icb-title">Disponibilidad de Flota — {{ plantaLabel }}</span>
        </div>
        <div class="icb-actions" style="display: flex; gap: 8px; align-items: center;">
          <button class="tb-btn primary" @click="generarInformePdf" :disabled="generandoPdf" title="Generar y descargar archivo PDF oficial">
            <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span v-if="generandoPdf">Generando PDF...</span>
            <span v-else>Descargar PDF</span>
          </button>
        </div>
      </div>

      <!-- PORTADA Y PÁGINAS DEL REPORTE OFICIAL -->
      <div class="report-paper">

        <!-- ============================================== -->
        <!-- PÁGINA 1: PORTADA EJECUTIVA Y TENDENCIAS      -->
        <!-- ============================================== -->
        <div class="report-page">
          <header class="report-header">
            <div class="report-header-brand">
              <img src="/Logos/Logo_Gravicon_Azul.png" alt="Gravicon" class="report-logo" />
              <div class="report-header-text">
                <h2>Mantenimiento {{ plantaLabel }} Gravicon</h2>
                <span>GRAVAS Y CONCRETOS S.A. · {{ isConcretosPlanta ? 'Concretos' : 'Agregados' }}</span>
              </div>
            </div>
            <div class="report-header-meta">
              <div class="meta-item"><span>Corte:</span> <strong>{{ informeFechaLabel }}</strong></div>
              <div class="meta-item"><span>Código:</span> <strong>GRV-INF-2026-{{ plantaKey.toUpperCase() }}-DISP</strong></div>
              <div class="meta-item page-counter"><span>Pág. 1 de 3</span></div>
            </div>
          </header>

          <div class="report-title-section">
            <h1>Reporte de Disponibilidad de Equipos</h1>
            <p class="report-intro">
              Operatividad de la flota de <strong>{{ plantaLabel }}</strong> al corte del <strong>{{ informeFechaLabel }}</strong>:
              disponibilidad por tipo de equipo, seguimiento de maquinaria operativa y equipos en intervención de taller.
            </p>
          </div>

          <!-- 8 Tarjetas KPI Oficiales -->
          <div class="kpi-row compact-kpi">
            <KpiCard label="Flota Propia" accent="#1D4ED8" icon="package" :value="String(informeKpis.flotaPropia)" />
            <KpiCard label="Alquilados" accent="#2563EB" icon="truck" :value="String(informeKpis.alquilados)" />
            <KpiCard label="Operativos" accent="#16A34A" icon="check-circle" :value="informeKpis.operativosFormatted" />
            <KpiCard label="No Operativos" accent="#DC2626" icon="activity" :value="String(informeKpis.noOperativos)" />
            <KpiCard
              label="Disponibilidad Propia"
              :accent="informeKpis.dispPropiaPct >= 85 ? '#16A34A' : informeKpis.dispPropiaPct >= 60 ? '#F59E0B' : '#DC2626'"
              meta="Meta: 85%"
              icon="target"
              :value="informeKpis.dispPropiaPct + '%'"
            />
            <KpiCard
              label="Disponible en Cancha"
              :accent="informeKpis.dispCanchaPct >= 85 ? '#16A34A' : informeKpis.dispCanchaPct >= 60 ? '#F59E0B' : '#DC2626'"
              icon="trending-up"
              :value="informeKpis.dispCanchaPct + '%'"
            />
            <KpiCard label="Cobertura" accent="#16A34A" icon="zap" :value="informeKpis.coberturaPct + '%'" />
            <KpiCard label="Días de Rezago" accent="#1D4ED8" icon="clock" :value="String(informeKpis.diasRezago)" />
          </div>

          <!-- Análisis Operativo Directivo estilo Zoho -->
          <div class="report-section-block">
            <div class="zoho-analysis-box">
              <div class="zoho-analysis-label">Análisis Operativo Directivo</div>
              <div class="zoho-analysis-text" v-html="informeAnalisisTexto"></div>
            </div>
          </div>

          <!-- Nota de Contexto / Alertas -->
          <div v-if="informeKpis.diasRezago > 2" class="report-nota alerta">
            <strong>Advertencia de Rezago ({{ informeKpis.diasRezago }} días):</strong>
            La última inspección cargada para este corte tiene más de 2 días de rezago frente a la fecha actual.
          </div>
          <div v-else-if="informeKpis.coberturaPct < 90" class="report-nota">
            <strong>Nota de Cobertura:</strong> La disponibilidad se calcula sobre los {{ informeKpis.inspeccionados }} equipos efectivamente inspeccionados ({{ informeKpis.coberturaPct }}% del total).
          </div>

          <!-- Tendencia de Disponibilidad por Planta — AM vs PM -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Tendencia de Disponibilidad por Planta — {{ informeFechaLabel }}</h3>
            <div v-if="tendenciaSedesAmPm.length === 0" class="data-card">
              <div class="empty-table">Sin datos AM/PM para este corte</div>
            </div>
            <div v-else ref="chartTendenciaRef" style="width:100%;height:360px;"></div>
          </div>

          <!-- Bloque Fila: Tipo de Equipo + Dona Global -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Disponibilidad por tipo de equipo — {{ informeFechaLabel }}</h3>
            <div class="fila-charts">
              <div ref="chartTipoRef" style="flex: 1.9; height: 340px;"></div>
              <div ref="chartDispRef" style="flex: 0.9; height: 240px;"></div>
            </div>
          </div>

          <!-- Flota Alquilada (Solo si aplica) -->
          <div v-if="informeFlotaAlquilada.total > 0" class="report-section-block" style="margin-top: 4px;">
            <div class="data-card alq-card" style="padding: 6px 12px;">
              <div class="alq-summary">
                <div class="alq-cifra" :style="{ color: informeFlotaAlquilada.dispPct >= 85 ? '#16A34A' : informeFlotaAlquilada.dispPct >= 60 ? '#F59E0B' : '#DC2626' }">
                  {{ informeFlotaAlquilada.dispPct }}%
                  <span>{{ informeFlotaAlquilada.op }} de {{ informeFlotaAlquilada.total }} alquilados op.</span>
                </div>
                <div class="alq-chips">
                  <div v-for="chip in informeFlotaAlquilada.chips" :key="chip.placa" class="alq-chip">
                    <span class="chip-dot" :style="{ background: chip.color }"></span>
                    <strong>{{ chip.placa }}</strong>
                    <span class="chip-tipo">{{ chip.tipo }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="report-footer">
            <span>Informe de Disponibilidad de Flota — Gravicon</span>
            <span>Documento Oficial | Página 1 de 3</span>
          </footer>
        </div>

        <!-- ==================================================== -->
        <!-- PÁGINA 2: MATRIZ POR CATEGORÍA, FRENTE Y MOVIMIENTOS -->
        <!-- ==================================================== -->
        <div class="report-page">
          <div class="report-salto-superior"></div>

          <!-- Matriz de Operatividad por Categoría -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Matriz de Operatividad por Categoría</h3>
            <div class="data-card">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th class="r">Operativos Propios</th>
                       <th class="r">De ellos Alq.</th>
                      <th class="r">Parciales (0,5)</th>
                      <th class="r">No Operativos</th>
                      <th class="r">Total Flota</th>
                      <th class="r">Disponibilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="cat in matrizCategoriaData.rows" :key="cat.tipo">
                      <td class="bold accent-text">{{ cat.tipo }}</td>
                      <td class="r green">{{ cat.opProp }}</td>
                       <td class="r" style="color: #06b6d4">{{ cat.opAlq || '—' }}</td>
                      <td class="r yellow">{{ cat.parcial || '—' }}</td>
                      <td class="r" :class="cat.noOp > 0 ? 'red' : ''">{{ cat.noOp }}</td>
                      <td class="r bold">{{ cat.total }}</td>
                      <td class="r bold" :class="cat.disp >= 85 ? 'green' : cat.disp >= 60 ? 'yellow' : 'red'">{{ cat.disp }}%</td>
                    </tr>
                    <tr class="table-total-row">
                      <td class="bold">TOTAL FLOTA</td>
                      <td class="r bold green">{{ matrizCategoriaData.totales.opProp }}</td>
                       <td class="r bold" style="color: #06b6d4">{{ matrizCategoriaData.totales.opAlq }}</td>
                      <td class="r bold yellow">{{ matrizCategoriaData.totales.parcial }}</td>
                      <td class="r bold red">{{ matrizCategoriaData.totales.noOp }}</td>
                      <td class="r bold">{{ matrizCategoriaData.totales.total }}</td>
                      <td class="r bold" :class="matrizCategoriaData.totales.disp >= 85 ? 'green' : matrizCategoriaData.totales.disp >= 60 ? 'yellow' : 'red'">
                        {{ matrizCategoriaData.totales.disp }}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Disponibilidad por Planta / Frente -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Disponibilidad por sede</h3>
            <div ref="chartSedeRef" style="width:100%;height:280px;"></div>
          </div>

          <!-- Movimientos de Taller -->
          <div v-if="movimientosTaller.hasPrev" class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Movimientos de Taller — {{ movimientosTaller.prevLabel }} → {{ informeFechaLabel }}</h3>
            <div class="charts-grid cols-2">
              <div class="data-card">
                <div class="card-head" style="color: #ef4444;">
                  ↓ Ingresaron a Taller ({{ movimientosTaller.ingresaron.length }})
                </div>
                <div v-if="movimientosTaller.ingresaron.length === 0" class="empty-table" style="padding: 12px;">
                  Sin nuevos ingresos a taller
                </div>
                <div v-else class="table-wrap">
                  <table>
                    <thead><tr><th>Equipo</th><th>Tipo</th><th>Supervisor</th><th class="r" title="Días acumulados de paro en taller desde el ingreso">Días en Taller</th></tr></thead>
                    <tbody>
                      <tr v-for="eq in movimientosTaller.ingresaron" :key="eq.placa">
                        <td class="bold accent-text">{{ eq.placa }}</td>
                        <td>{{ eq.tipo }}</td>
                        <td>{{ eq.supervisor }}</td>
                        <td class="r bold" :class="eq.diasPendientes > 5 ? 'red' : eq.diasPendientes > 2 ? 'yellow' : ''">{{ eq.diasPendientes > 0 ? eq.diasPendientes + ' d' : '1 d' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="data-card">
                <div class="card-head" style="color: #10b981;">
                  ↑ Salieron de Taller ({{ movimientosTaller.salieron.length }})
                </div>
                <div v-if="movimientosTaller.salieron.length === 0" class="empty-table" style="padding: 12px;">
                  Sin salidas de taller registradas
                </div>
                <div v-else class="table-wrap">
                  <table>
                    <thead><tr><th>Equipo</th><th>Tipo</th><th>Supervisor</th><th class="r" title="Total de días que duró la intervención en taller">Duración en Taller</th></tr></thead>
                    <tbody>
                      <tr v-for="eq in movimientosTaller.salieron" :key="eq.placa">
                        <td class="bold accent-text">{{ eq.placa }}</td>
                        <td>{{ eq.tipo }}</td>
                        <td>{{ eq.supervisor }}</td>
                        <td class="r bold green">{{ eq.diasPendientes > 0 ? eq.diasPendientes + ' d' : '1 d' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ============================================== -->
        <!-- PÁGINA 3: SEGUIMIENTO DE EQUIPOS EN TALLER    -->
        <!-- ============================================== -->
        <div class="report-page">
          <div class="report-salto-superior"></div>

          <!-- Equipos en Intervención / Fuera de Servicio -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Equipos Fuera de Servicio / En Taller ({{ informeEquiposEnTaller.length }})</h3>
            <div class="data-card">
              <div v-if="informeEquiposEnTaller.length === 0" class="empty-table">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Todos los equipos se encuentran operativos en este corte
              </div>
              <div v-else class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th class="idx-col">#</th>
                      <th>Placa</th>
                      <th>Tipo</th>
                      <th>Supervisor</th>
                      <th>Actividad / Diagnóstico</th>
                      <th class="r">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(eq, i) in informeEquiposEnTaller" :key="eq.placa">
                      <td class="idx">{{ i + 1 }}</td>
                      <td class="bold accent-text">{{ eq.placa }}</td>
                      <td>{{ eq.tipo }}</td>
                      <td>{{ eq.supervisor }}</td>
                      <td style="font-size: 12px; color: var(--text-secondary);">{{ eq.motivo }}</td>
                      <td class="r red">{{ eq.revAm }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Equipos Operativos -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Equipos Operativos en Cancha ({{ informeEquiposOperativos.length }})</h3>
            <div class="data-card">
              <div v-if="informeEquiposOperativos.length === 0" class="empty-table">
                Sin equipos registrados como operativos
              </div>
              <div v-else class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Placa</th>
                      <th>Tipo</th>
                      <th>Localización</th>
                      <th>Supervisor</th>
                      <th class="r">Estado AM</th>
                      <th class="r">Ronda PM</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(eq, i) in informeEquiposOperativos" :key="eq.placa">
                      <td class="idx">{{ i + 1 }}</td>
                      <td class="bold accent-text">{{ eq.placa }}</td>
                      <td>{{ eq.tipo }}</td>
                      <td>{{ eq.loc }}</td>
                      <td>{{ eq.supervisor }}</td>
                      <td class="r bold" :class="eq.revAm.includes('En taller') ? 'red' : eq.revAm.includes('Parcial') ? 'yellow' : 'green'">{{ eq.revAm }}</td>
                      <td class="r bold" :class="eq.revPm.includes('Cayó') ? 'red' : eq.revPm.includes('Parcial') ? 'yellow' : 'green'">{{ eq.revPm }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- TAREAS DE SEGUIMIENTO ABIERTAS               -->
          <!-- ============================================ -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Tareas de Seguimiento Abiertas ({{ tareasAbiertas.length }})</h3>
            <div class="data-card">
              <div v-if="tareasAbiertas.length === 0" class="empty-table">
                No hay tareas pendientes en este corte
              </div>
              <div v-else class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Actividad</th>
                      <th>Responsable</th>
                      <th>Estado</th>
                      <th>Registro</th>
                      <th class="r">Días abierta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in tareasAbiertas" :key="t.id" :class="t.dias > 7 ? 'alerta' : ''">
                      <td class="bold accent-text">{{ t.placa }}</td>
                      <td>{{ t.actividad }}<br><span style="font-size:11px; color: var(--text-secondary);">{{ t.observaciones }}</span></td>
                      <td>{{ t.responsable }}</td>
                      <td><span class="pill p-rojo">{{ t.estado }}</span></td>
                      <td>{{ t.fecha }}</td>
                      <td class="r"><span class="pill" :class="t.dias > 7 ? 'p-ambar' : 'p-gris'">{{ t.dias }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- CUMPLIMIENTO DIARIO POR SUPERVISOR           -->
          <!-- ============================================ -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Indicadores de Cumplimiento Diario por Supervisor</h3>
            <div v-if="cumplimientoSupervisor.length === 0 && cumplimientoSupervisorAnterior.length === 0" class="data-card">
              <div class="empty-table">Sin datos de supervisor para este corte</div>
            </div>
            <div v-else class="comp-grid">
              <!-- Columna: Día anterior -->
              <div class="comp-col">
                <div class="comp-col-title">{{ diaAnteriorNombre }} — {{ fechaAnteriorLabel }} | {{ cumplimientoSupervisorAnterior.reduce((s,v) => s + v.revisados, 0) > 0 ? cumplimientoSupervisorAnterior.reduce((s,v) => s + Math.round(v.revisados * v.cumplimiento / 100), 0) : 0 }}/{{ cumplimientoSupervisorAnterior.reduce((s,v) => s + v.revisados, 0) }} ejecutadas</div>
                <div class="comp-inner">
                  <div class="comp-chart-cell">
                    <div class="chart-box-donut">
                      <svg viewBox="0 0 210 210" class="chart-svg">
                        <circle cx="105" cy="105" r="72" fill="none" stroke="#e6eaf0" stroke-width="22"/>
                        <circle cx="105" cy="105" r="72" fill="none" :stroke="cumplimientoGlobalPctAnterior >= 85 ? '#1f7a3d' : cumplimientoGlobalPctAnterior >= 60 ? '#b8860b' : '#a90707'" stroke-width="22" :stroke-dasharray="`${cumplimientoGlobalPctAnterior / 100 * 452.4} 452.4`" stroke-linecap="butt" transform="rotate(-90 105 105)"/>
                        <text x="105" y="101" text-anchor="middle" class="dona" :fill="cumplimientoGlobalPctAnterior >= 85 ? '#1f7a3d' : cumplimientoGlobalPctAnterior >= 60 ? '#b8860b' : '#a90707'">{{ cumplimientoGlobalPctAnterior }}%</text>
                        <text x="105" y="118" text-anchor="middle" class="ax">CUMPLIMIENTO</text>
                      </svg>
                    </div>
                  </div>
                  <div class="comp-sup-cell">
                    <table class="comp-sup-table">
                      <thead><tr><th>Supervisor</th><th>T</th><th>Ej.</th><th>P.</th><th>%</th></tr></thead>
                      <tbody>
                        <tr v-for="s in cumplimientoSupervisorAnterior" :key="s.supervisor">
                          <td>{{ s.supervisor }}</td>
                          <td class="r">{{ s.revisados }}</td>
                          <td class="r" :class="s.cumplimiento >= 85 ? 'pct-high' : ''">{{ s.cumplimiento >= 85 ? s.revisados : Math.round(s.revisados * s.cumplimiento / 100) }}</td>
                          <td class="r" :class="s.cumplimiento < 85 ? 'pct-low' : ''">{{ s.cumplimiento < 85 ? s.revisados - Math.round(s.revisados * s.cumplimiento / 100) : 0 }}</td>
                          <td class="r" :class="s.cumplimiento >= 80 ? 'pct-high' : s.cumplimiento >= 50 ? 'pct-mid' : 'pct-low'">{{ s.cumplimiento }}%</td>
                        </tr>
                        <tr v-if="cumplimientoSupervisorAnterior.length === 0">
                          <td colspan="5" style="text-align:center;color:#888;font-style:italic">Sin datos</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <!-- Columna: Hoy -->
              <div class="comp-col">
                <div class="comp-col-title">{{ diaActualNombre }} — {{ informeFechaLabel }} | {{ cumplimientoSupervisor.reduce((s,v) => s + v.revisados, 0) > 0 ? cumplimientoSupervisor.reduce((s,v) => s + Math.round(v.revisados * v.cumplimiento / 100), 0) : 0 }}/{{ cumplimientoSupervisor.reduce((s,v) => s + v.revisados, 0) }} ejecutadas</div>
                <div class="comp-inner">
                  <div class="comp-chart-cell">
                    <div class="chart-box-donut">
                      <svg viewBox="0 0 210 210" class="chart-svg">
                        <circle cx="105" cy="105" r="72" fill="none" stroke="#e6eaf0" stroke-width="22"/>
                        <circle cx="105" cy="105" r="72" fill="none" :stroke="cumplimientoGlobalPct >= 85 ? '#1f7a3d' : cumplimientoGlobalPct >= 60 ? '#b8860b' : '#a90707'" stroke-width="22" :stroke-dasharray="`${cumplimientoGlobalPct / 100 * 452.4} 452.4`" stroke-linecap="butt" transform="rotate(-90 105 105)"/>
                        <text x="105" y="101" text-anchor="middle" class="dona" :fill="cumplimientoGlobalPct >= 85 ? '#1f7a3d' : cumplimientoGlobalPct >= 60 ? '#b8860b' : '#a90707'">{{ cumplimientoGlobalPct }}%</text>
                        <text x="105" y="118" text-anchor="middle" class="ax">CUMPLIMIENTO</text>
                      </svg>
                    </div>
                  </div>
                  <div class="comp-sup-cell">
                    <table class="comp-sup-table">
                      <thead><tr><th>Supervisor</th><th>T</th><th>Ej.</th><th>P.</th><th>%</th></tr></thead>
                      <tbody>
                        <tr v-for="s in cumplimientoSupervisor" :key="s.supervisor">
                          <td>{{ s.supervisor }}</td>
                          <td class="r">{{ s.revisados }}</td>
                          <td class="r" :class="s.cumplimiento >= 85 ? 'pct-high' : ''">{{ s.cumplimiento >= 85 ? s.revisados : Math.round(s.revisados * s.cumplimiento / 100) }}</td>
                          <td class="r" :class="s.cumplimiento < 85 ? 'pct-low' : ''">{{ s.cumplimiento < 85 ? s.revisados - Math.round(s.revisados * s.cumplimiento / 100) : 0 }}</td>
                          <td class="r" :class="s.cumplimiento >= 80 ? 'pct-high' : s.cumplimiento >= 50 ? 'pct-mid' : 'pct-low'">{{ s.cumplimiento }}%</td>
                        </tr>
                        <tr v-if="cumplimientoSupervisor.length === 0">
                          <td colspan="5" style="text-align:center;color:#888;font-style:italic">Sin datos</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- RESUMEN EJECUTIVO                            -->
          <!-- ============================================ -->
          <div class="report-section-block" v-if="resumenEjecutivo">
            <h3 class="report-block-title"><span class="title-bar"></span>Resumen Ejecutivo</h3>
            <div class="data-card" style="padding: 12px 16px;">
              <ul class="res">
                <li>Disponibilidad de la ronda AM: <strong>{{ informeKpis.dispPropiaPct }}%</strong> ({{ informeKpis.operativosFormatted }} de {{ informeKpis.flotaTotal }} equipos operativos).</li>
                <li v-if="resumenEjecutivo.totalPendientes > 0">{{ resumenEjecutivo.totalPendientes }} equipo(s) pendiente(s) de revisión.</li>
                <li v-if="informeEquiposEnTaller.length > 0">{{ informeEquiposEnTaller.length }} equipo(s) en taller; {{ informeEquiposEnTaller.filter(e => !e.motivo || e.motivo === '—').length }} de ellos sin actividad que respalde la intervención.</li>
              </ul>
              <div v-if="resumenEjecutivo.notasCierre" class="report-nota" style="margin-top: 8px;">
                <strong>Notas de Cierre:</strong> {{ resumenEjecutivo.notasCierre }}
              </div>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- TENDENCIA MENSUAL DE DISPONIBILIDAD          -->
          <!-- ============================================ -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Tendencia Mensual de Disponibilidad</h3>
            <div v-if="svgTrend" style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
              Promedio mensual: <strong>{{ svgTrend.avgPct }}%</strong> · Mejor día: <strong>{{ svgTrend.maxPct }}%</strong> · Día más bajo: <strong>{{ svgTrend.minPct }}%</strong>
            </div>
            <div ref="chartMensualRef" style="width:100%;height:220px;"></div>
          </div>

          <footer class="report-footer">
            <span>Informe de Disponibilidad de Flota — Gravicon</span>
            <span>Documento Oficial | Página 3 de 3</span>
          </footer>
        </div>

      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, watch, onMounted, nextTick } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { useTheme } from '../../composables/useTheme'
import { useDisponibilidadStore } from '../../stores'
import * as echarts from 'echarts'

const props = defineProps<{
  data: Record<string, unknown>[]
  planta: string
  fechaInicio?: string
  fechaFin?: string
}>()

const { theme } = useTheme()
const dispStore = useDisponibilidadStore()
const dispView = ref<'graficas' | 'detalles' | 'informe'>('graficas')
// Removed iframe reference – not needed after switching to v-html rendering

const isConcretosPlanta = computed(() => {
  return (props.planta ?? '').toLowerCase().includes('concreto')
})

const plantaKey = computed(() => {
  const p = (props.planta ?? '').toLowerCase()
  if (p.includes('acacia')) return 'acacias'
  if (p.includes('concreto')) return 'concretos'
  return 'cuncia'
})

const plantaLabel = computed(() => {
  if (plantaKey.value === 'acacias') return 'Acacías'
  if (plantaKey.value === 'cuncia') return 'Cuncia'
  return 'Concretos'
})

// Cargar datos reales desde el store de disponibilidad
onMounted(() => {
  dispStore.fetchDisponibilidad(plantaKey.value)
})

watch(() => props.planta, () => {
  dispStore.fetchDisponibilidad(plantaKey.value)
})

// Recargar también cuando cambia la fecha (para sincronizar con el filtro principal)
watch([() => props.fechaInicio, () => props.fechaFin], () => {
  // Solo recarga si el store no tiene datos para la planta actual, o si los datos son de otra planta
  const currentPlanta = plantaKey.value
  const storeData = dispStore.data
  if (!storeData || storeData.planta !== currentPlanta || storeData.placas.length === 0) {
    dispStore.fetchDisponibilidad(currentPlanta)
  }
})

// Fechas y formateo
function parseSerialDate(val: unknown): Date | null {
  if (!val) return null
  const num = Number(val)
  if (!isNaN(num) && num > 30000) {
    const utcDays = Math.floor(num - 25569)
    return new Date(utcDays * 86400 * 1000)
  }
  const s = String(val).trim()
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function getDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Filas activas: todas las inspecciones de disponibilidad cargadas en el store o props
// Solo usa datos del store si corresponden a la planta activa para evitar mostrar datos incorrectos
const activePlacasRows = computed(() => {
  const storeData = dispStore.data
  if (storeData?.placas && storeData.placas.length > 0 && storeData.planta === plantaKey.value) {
    return storeData.placas
  }
  return props.data || []
})

// Fechas con registros de inspección ordenadas cronológicamente
const fechasEncontradas = computed(() => {
  const dates: Date[] = []
  for (const r of activePlacasRows.value) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (d) dates.push(d)
  }
  dates.sort((a, b) => a.getTime() - b.getTime())
  return dates
})

function getTodayUtcKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

const effectiveCorteDate = computed<Date | null>(() => {
  const dates = fechasEncontradas.value
  if (dates.length === 0) return null

  const filterDateStr = props.fechaFin || props.fechaInicio
  if (filterDateStr) {
    const filterDate = parseSerialDate(filterDateStr)
    if (filterDate) {
      const targetTime = filterDate.getTime() + 86400000
      const candidateDates = dates.filter(d => d.getTime() <= targetTime)
      if (candidateDates.length > 0) {
        return candidateDates[candidateDates.length - 1]
      }
    }
  }

  const todayKey = getTodayUtcKey()
  const todayMatch = dates.find(d => getDateKey(d) === todayKey)
  if (todayMatch) return todayMatch

  const nowUtc = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    23, 59, 59, 999
  ))
  const pastDates = dates.filter(d => d.getTime() <= nowUtc.getTime())
  if (pastDates.length > 0) return pastDates[pastDates.length - 1]

  return dates[dates.length - 1]
})

const effectiveCorteIso = computed<string>(() => {
  return effectiveCorteDate.value ? getDateKey(effectiveCorteDate.value) : ''
})

const informeFechaLabel = computed(() => {
  if (!effectiveCorteDate.value) return 'Sin datos'
  return effectiveCorteDate.value.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
})

// KPIs calculados dinámicamente según la fecha de corte del filtro principal
// Normalización y detalle de cada registro de inspección
function getInspectionDetails(r: Record<string, unknown>) {
  const placa = String(r['Placa_Texto'] ?? r['Placa'] ?? r['Placa del Vehículo'] ?? '').trim()
  const rawTipo = String(r['Tipo de Vehiculos'] ?? r['Clase de Mantenimiento'] ?? 'MAQUINARIA').trim().toUpperCase()
  const prov = String(r['Proveedor_Texto'] ?? r['PROVEEDOR'] ?? '').trim().toUpperCase()
  const esAlquilado = rawTipo.startsWith('ALQUILA') || rawTipo.includes('ALQUILER') || prov.includes('ALQUILA')
  const baseTipo = rawTipo.replace(/^ALQUILADAS?\s*[-–:]\s*/i, '').replace(/^ALQUILER\s*[-–:]\s*/i, '').trim() || 'MAQUINARIA'
  const loc = String(r['Localizacion'] ?? r['Localización'] ?? r['Ubicación'] ?? r['Area de Trabajo'] ?? 'Planta').trim()
  const supervisor = String(r['Supervisor_Texto'] ?? r['Supervisor'] ?? r['SUPERVISOR'] ?? r['Responsable'] ?? '—')

  const revAm = Number(r['Rev_AM'] ?? r['rev_am'] ?? NaN)
  const revPm = Number(r['Rev_PM'] ?? r['rev_pm'] ?? NaN)
  const pctPlaca = Number(r['Porcentaje_Placa'] ?? r['porcentaje_placa'] ?? NaN)

  let score = 0
  if (!isNaN(pctPlaca) && pctPlaca >= 0) {
    score = pctPlaca
  } else if (!isNaN(revAm) && !isNaN(revPm)) {
    score = (revAm + revPm) / 2
  } else if (!isNaN(revAm)) {
    score = revAm
  } else if (!isNaN(revPm)) {
    score = revPm
  }

  const enTaller = String(r['¿Vehiculo en Taller?'] ?? r['Vehiculo_en_Taller'] ?? '').toUpperCase()
  const esEnTaller = enTaller === 'TRUE' || enTaller === 'Y' || enTaller === 'SÍ' || enTaller === 'SI'

  const isNoOp = score < 0.1
  const isParcial = score >= 0.1 && score < 0.9
  const isOperativo = score >= 0.9

  return {
    placa,
    rawTipo,
    prov,
    esAlquilado,
    baseTipo,
    loc,
    supervisor,
    revAm,
    revPm,
    pctPlaca,
    score,
    esEnTaller,
    isNoOp,
    isParcial,
    isOperativo,
  }
}

// KPIs calculados dinámicamente según la fecha de corte del filtro principal
const informeKpis = computed(() => {
  const records = activePlacasRows.value
  if (!records || records.length === 0) {
    return {
      flotaTotal: 0,
      flotaPropia: 0,
      alquilados: 0,
      operativos: 0,
      operativosFormatted: '0',
      noOperativos: 0,
      parciales: 0,
      dispPropiaPct: 0,
      dispCanchaPct: 0,
      coberturaPct: 0,
      inspeccionados: 0,
      diasRezago: 0,
    }
  }

  const targetIso = effectiveCorteIso.value
  const vehiculosSet = new Set<string>()
  const alquiladosSet = new Set<string>()

  let scoreSumTotal = 0
  let countTotal = 0
  let scorePropiaSum = 0
  let countPropia = 0
  let opCount = 0
  let parcialCount = 0
  let noOpCount = 0
  let inspectedCount = 0

  for (const r of records) {
    const info = getInspectionDetails(r)
    if (info.placa) {
      vehiculosSet.add(info.placa)
      if (info.esAlquilado) alquiladosSet.add(info.placa)
    }

    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const iso = getDateKey(d)
    if (targetIso && iso !== targetIso) continue

    inspectedCount++
    countTotal++
    scoreSumTotal += info.score

    if (!info.esAlquilado) {
      scorePropiaSum += info.score
      countPropia++
    }

    if (info.isOperativo) opCount++
    else if (info.isParcial) parcialCount++
    else noOpCount++
  }

  const flotaTotal = vehiculosSet.size || records.length
  const alquilados = alquiladosSet.size
  const flotaPropia = Math.max(flotaTotal - alquilados, 1)

  const operativosFormatted = parcialCount > 0
    ? (opCount + (parcialCount * 0.5)).toFixed(1).replace('.0', '').replace('.', ',')
    : String(opCount)

  const dispPropiaPct = countPropia > 0
    ? Math.round((scorePropiaSum / countPropia) * 100)
    : (countTotal > 0 ? Math.round((scoreSumTotal / countTotal) * 100) : 0)

  const dispCanchaPct = countTotal > 0
    ? Math.round((scoreSumTotal / countTotal) * 100)
    : dispPropiaPct

  const coberturaPct = flotaTotal > 0 ? Math.min(100, Math.round((inspectedCount / flotaTotal) * 100)) : 100

  let diasRezago = 0
  if (targetIso) {
    const parts = targetIso.split('-').map(Number)
    const targetDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    const diffTime = Math.abs(new Date().getTime() - targetDate.getTime())
    diasRezago = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  return {
    flotaTotal,
    flotaPropia,
    alquilados,
    operativos: opCount,
    operativosFormatted,
    noOperativos: noOpCount,
    parciales: parcialCount,
    dispPropiaPct,
    dispCanchaPct,
    coberturaPct,
    inspeccionados: inspectedCount,
    diasRezago,
  }
})

// Equipos fuera de servicio para la fecha de corte
const informeEquiposEnTaller = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return []

  const result: { placa: string; tipo: string; loc: string; revAm: string; supervisor: string; motivo: string }[] = []
  const seen = new Set<string>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    if (!info.placa || seen.has(info.placa)) continue

    if (info.isNoOp) {
      seen.add(info.placa)
      const act = String(r['Actividades en taller'] ?? r['Actividades_en_taller'] ?? '').trim()
      const provTaller = String(r['Proveedor_Texto'] ?? r['Proveedor'] ?? '').trim()
      const motivo = act ? `${act}${provTaller ? ` (${provTaller})` : ''}` : (provTaller ? `Taller: ${provTaller}` : 'Fuera de servicio / En intervención')

      result.push({
        placa: info.placa,
        tipo: info.baseTipo + (info.esAlquilado ? ' (Alquilada)' : ''),
        loc: info.loc,
        revAm: '0 (No Operativo)',
        supervisor: info.supervisor,
        motivo,
      })
    }
  }
  return result
})

// Matriz de operatividad por categoría para el informe
const matrizCategoriaData = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const map = new Map<string, { tipo: string; opProp: number; opAlq: number; parcial: number; noOp: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    const tipo = info.baseTipo

    if (!map.has(tipo)) {
      map.set(tipo, { tipo, opProp: 0, opAlq: 0, parcial: 0, noOp: 0 })
    }
    const item = map.get(tipo)!
    if (info.isNoOp) {
      item.noOp++
    } else if (info.isParcial) {
      item.parcial++
    } else if (info.esAlquilado) {
      item.opAlq++
    } else {
      item.opProp++
    }
  }

  const rows = Array.from(map.values()).map(item => {
    const total = item.opProp + item.opAlq + item.parcial + item.noOp
    const disp = total > 0 ? Math.round(((item.opProp + item.opAlq + item.parcial * 0.5) / total) * 100) : 0
    return {
      ...item,
      total,
      disp,
    }
  })

  rows.sort((a, b) => b.total - a.total)

  const totalOpProp = rows.reduce((s, r) => s + r.opProp, 0)
  const totalOpAlq = rows.reduce((s, r) => s + r.opAlq, 0)
  const totalParcial = rows.reduce((s, r) => s + r.parcial, 0)
  const totalNoOp = rows.reduce((s, r) => s + r.noOp, 0)
  const totalGeneral = totalOpProp + totalOpAlq + totalParcial + totalNoOp
  const totalDisp = totalGeneral > 0 ? Math.round(((totalOpProp + totalOpAlq + totalParcial * 0.5) / totalGeneral) * 100) : 0

  return {
    rows,
    totales: {
      opProp: totalOpProp,
      opAlq: totalOpAlq,
      parcial: totalParcial,
      noOp: totalNoOp,
      total: totalGeneral,
      disp: totalDisp,
    },
  }
})

// Lista de equipos operativos para el informe
const informeEquiposOperativos = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return []

  const result: { placa: string; tipo: string; loc: string; revAm: string; revPm: string; supervisor: string }[] = []
  const seen = new Set<string>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    if (!info.placa || seen.has(info.placa)) continue

    if (info.score > 0) {
      seen.add(info.placa)
      let amStr = 'Operativo (1.0)'
      if (info.revAm === 0) amStr = 'En taller / 0.0'
      else if (info.revAm === 0.5) amStr = 'Parcial (0.5)'

      let pmStr = 'Operativo PM (1.0)'
      if (isNaN(info.revPm)) pmStr = '—'
      else if (info.revPm === 0) pmStr = 'Cayó en PM (0.0)'
      else if (info.revPm === 0.5) pmStr = 'Parcial PM (0.5)'
      else if (info.revAm === 0 && info.revPm === 1) pmStr = 'Recuperó PM (1.0) 🟢'

      result.push({
        placa: info.placa,
        tipo: info.baseTipo + (info.esAlquilado ? ' (Alquilada)' : ''),
        loc: info.loc,
        revAm: amStr,
        revPm: pmStr,
        supervisor: info.supervisor,
      })
    }
  }
  return result
})

// Tareas de seguimiento abiertas (Pendientes)
const tareasAbiertas = computed(() => {
  const tareas = dispStore.data?.tareas || []
  if (tareas.length === 0) return []

  const result: { id: string; placa: string; fecha: string; responsable: string; actividad: string; observaciones: string; estado: string; dias: number }[] = []
  const nowUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())

  for (const t of tareas) {
    const estadoRaw = String(t['Estado_Tarea'] ?? '').trim()
    if (estadoRaw !== 'Pendiente') continue

    const fechaReg = parseSerialDate(t['Fecha_Registro'])
    if (!fechaReg) continue

    const id = String(t['ID_Tarea'] ?? '').slice(0, 8)
    const placa = String(t['Placa'] ?? t['PLACA'] ?? t['Placa_Texto'] ?? '—').trim()
    const responsable = String(t['Nombre_Responsable'] ?? t['Nombre Responsable'] ?? t['Responsable_Texto'] ?? t['Responsable'] ?? '—').trim()
    const actividad = String(t['Actividad'] ?? '—')
    const observaciones = String(t['observaciones'] ?? '—')
    const dias = Math.max(1, Math.floor((nowUtc - fechaReg.getTime()) / 86400000))
    const estado = estadoRaw.length > 6 ? estadoRaw.slice(0, 5) + '.' : estadoRaw

    const dia = String(fechaReg.getUTCDate()).padStart(2, '0')
    const mes = String(fechaReg.getUTCMonth() + 1).padStart(2, '0')
    const fecha = `${dia}/${mes}`

    result.push({ id, placa, fecha, responsable, actividad, observaciones, estado, dias })
  }

  result.sort((a, b) => b.dias - a.dias)
  return result
})

// Cumplimiento diario por supervisor
const cumplimientoSupervisor = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return []

  const supMap = new Map<string, { total: number; scoreSum: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const supervisor = String(r['Supervisor_Texto'] ?? r['Supervisor'] ?? r['SUPERVISOR'] ?? 'Sin asignar').trim()
    if (!supervisor || supervisor === '—') continue

    const info = getInspectionDetails(r)
    if (!supMap.has(supervisor)) supMap.set(supervisor, { total: 0, scoreSum: 0 })
    const item = supMap.get(supervisor)!
    item.total++
    item.scoreSum += info.score
  }

  const result: { supervisor: string; revisados: number; cumplimiento: number; color: string }[] = []
  for (const [supervisor, v] of supMap.entries()) {
    const cumplimiento = v.total > 0 ? Math.round((v.scoreSum / v.total) * 100) : 0
    const color = cumplimiento >= 85 ? '#16A34A' : cumplimiento >= 60 ? '#F59E0B' : '#DC2626'
    result.push({ supervisor, revisados: v.total, cumplimiento, color })
  }

  result.sort((a, b) => b.cumplimiento - a.cumplimiento)
  return result
})

const cumplimientoGlobalPct = computed(() => {
  const lista = cumplimientoSupervisor.value
  if (!lista.length) return 0
  const total = lista.reduce((s, v) => s + v.revisados, 0)
  const scoreSum = lista.reduce((s, v) => s + v.revisados * v.cumplimiento / 100, 0)
  return total > 0 ? Math.round(scoreSum / total * 100) : 0
})

// Día anterior al corte efectivo
const fechaAnteriorDate = computed<Date | null>(() => {
  const current = effectiveCorteDate.value
  if (!current) return null
  const dates = fechasEncontradas.value
  const idx = dates.findIndex(d => getDateKey(d) === getDateKey(current))
  if (idx > 0) return dates[idx - 1]
  return null
})

const fechaAnteriorIso = computed(() => fechaAnteriorDate.value ? getDateKey(fechaAnteriorDate.value) : '')

const fechaAnteriorLabel = computed(() => {
  if (!fechaAnteriorDate.value) return ''
  return fechaAnteriorDate.value.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
})

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const diaAnteriorNombre = computed(() => {
  if (!fechaAnteriorDate.value) return ''
  return diasSemana[fechaAnteriorDate.value.getUTCDay()]
})

const diaActualNombre = computed(() => {
  if (!effectiveCorteDate.value) return ''
  return diasSemana[effectiveCorteDate.value.getUTCDay()]
})

// Cumplimiento del día anterior
const cumplimientoSupervisorAnterior = computed(() => {
  const records = activePlacasRows.value
  const targetIso = fechaAnteriorIso.value
  if (!targetIso) return []

  const supMap = new Map<string, { total: number; scoreSum: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const supervisor = String(r['Supervisor_Texto'] ?? r['Supervisor'] ?? r['SUPERVISOR'] ?? 'Sin asignar').trim()
    if (!supervisor || supervisor === '—') continue

    const info = getInspectionDetails(r)
    if (!supMap.has(supervisor)) supMap.set(supervisor, { total: 0, scoreSum: 0 })
    const item = supMap.get(supervisor)!
    item.total++
    item.scoreSum += info.score
  }

  const result: { supervisor: string; revisados: number; cumplimiento: number; color: string }[] = []
  for (const [supervisor, v] of supMap.entries()) {
    const cumplimiento = v.total > 0 ? Math.round((v.scoreSum / v.total) * 100) : 0
    const color = cumplimiento >= 85 ? '#16A34A' : cumplimiento >= 60 ? '#F59E0B' : '#DC2626'
    result.push({ supervisor, revisados: v.total, cumplimiento, color })
  }

  result.sort((a, b) => b.cumplimiento - a.cumplimiento)
  return result
})

const cumplimientoGlobalPctAnterior = computed(() => {
  const lista = cumplimientoSupervisorAnterior.value
  if (!lista.length) return 0
  const total = lista.reduce((s, v) => s + v.revisados, 0)
  const scoreSum = lista.reduce((s, v) => s + v.revisados * v.cumplimiento / 100, 0)
  return total > 0 ? Math.round(scoreSum / total * 100) : 0
})

// Resumen ejecutivo del día
const resumenEjecutivo = computed(() => {
  const resumen = dispStore.data?.resumen || []
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return null

  let totalRevisadas = 0
  let totalPendientes = 0
  let areasCount = 0
  let porcentajeGeneral = 0
  let notasCierre = ''

  for (const r of resumen) {
    const d = parseSerialDate(r['Fecha'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    totalRevisadas += Number(r['Total_Placas_Revisadas'] ?? 0)
    totalPendientes += Number(r['Placas_Pendientes'] ?? 0)
    porcentajeGeneral = Number(r['Porcentaje_General_Dia'] ?? 0)
    const notas = String(r['Notas_Cierre'] ?? '').trim()
    if (notas) notasCierre = notas
    areasCount++
  }

  if (areasCount === 0) return null

  return {
    totalRevisadas,
    totalPendientes,
    porcentajeGeneral: Math.round(porcentajeGeneral * 100),
    notasCierre,
    areasCount,
  }
})

// Flota alquilada detallada con chips para el informe
const informeFlotaAlquilada = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return { dispPct: 0, op: 0, total: 0, chips: [] }

  const chips: { placa: string; tipo: string; estado: string; color: string }[] = []
  const seen = new Set<string>()
  let opCount = 0

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    if (!info.esAlquilado || !info.placa || seen.has(info.placa)) continue
    seen.add(info.placa)

    let estado = 'No Operativo'
    let color = '#DC2626'
    if (info.isOperativo) {
      estado = 'Operativo (1.0)'
      color = '#16A34A'
      opCount += 1
    } else if (info.isParcial) {
      estado = 'Parcial (0.5)'
      color = '#F59E0B'
      opCount += 0.5
    }

    chips.push({
      placa: info.placa,
      tipo: info.baseTipo,
      estado,
      color,
    })
  }

  const total = chips.length
  const dispPct = total > 0 ? Math.round((opCount / total) * 100) : 0

  return {
    dispPct,
    op: opCount,
    total,
    chips,
  }
})

// Movimientos de taller comparando con el corte anterior
const movimientosTaller = computed(() => {
  const dates = fechasEncontradas.value
  const targetIso = effectiveCorteIso.value
  const uniqueDatesMap = new Map<string, Date>()
  for (const d of dates) {
    uniqueDatesMap.set(getDateKey(d), d)
  }
  const uniqueEntries = Array.from(uniqueDatesMap.entries()).sort((a, b) => b[1].getTime() - a[1].getTime())
  const currIdx = uniqueEntries.findIndex(e => e[0] === targetIso)
  if (currIdx === -1 || currIdx >= uniqueEntries.length - 1) {
    return { hasPrev: false, prevIso: '', prevLabel: '', ingresaron: [], salieron: [] }
  }

  const prevIso = uniqueEntries[currIdx + 1][0]
  const prevDate = uniqueEntries[currIdx + 1][1]
  const prevLabel = `${String(prevDate.getUTCDate()).padStart(2, '0')} ${prevDate.toLocaleDateString('es-CO', { month: 'short', timeZone: 'UTC' })}`
  const records = activePlacasRows.value

  // Orden cronológico ascendente de fechas únicas de inspección
  const chronologicalEntries = Array.from(uniqueDatesMap.entries()).sort((a, b) => a[1].getTime() - b[1].getTime())

  // Para cada placa, registrar en qué fechas ISO estuvo en taller (isNoOp)
  // y cuándo fue la primera vez que apareció en taller (en toda la hoja)
  const placaEstadoPorFecha = new Map<string, Map<string, boolean>>()
  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const iso = getDateKey(d)
    const info = getInspectionDetails(r)
    if (!info.placa) continue
    let dateStatus = placaEstadoPorFecha.get(info.placa)
    if (!dateStatus) {
      dateStatus = new Map<string, boolean>()
      placaEstadoPorFecha.set(info.placa, dateStatus)
    }
    // Si hay múltiples registros por fecha, isNoOp=true tiene prioridad
    if (info.isNoOp || !dateStatus.has(iso)) {
      dateStatus.set(iso, info.isNoOp)
    }
  }

  /**
   * Calcula los Días de Paro para una placa en un corte determinado.
   * Retrocede en el historial cronológico de inspecciones para encontrar
   * la racha continua más temprana donde la placa estuvo en taller (isNoOp).
   * Luego calcula días de calendario entre ese primer día y la fecha de corte.
   */
  function calcularDiasEnTaller(placa: string, fechaCorte: Date, isoCorte: string): number {
    const statusMap = placaEstadoPorFecha.get(placa)
    if (!statusMap || !statusMap.get(isoCorte)) return 0

    const idx = chronologicalEntries.findIndex(e => e[0] === isoCorte)
    if (idx === -1) return 0

    // Retroceder desde isoCorte buscando la racha ininterrumpida de "en taller"
    let inicioRacha = chronologicalEntries[idx][1]
    for (let i = idx - 1; i >= 0; i--) {
      const pastIso = chronologicalEntries[i][0]
      const pastDate = chronologicalEntries[i][1]
      if (statusMap.get(pastIso)) {
        inicioRacha = pastDate
      } else {
        break
      }
    }

    // Días de calendario entre la primera aparición en taller y el corte
    const diffDays = Math.round((fechaCorte.getTime() - inicioRacha.getTime()) / 86400000)
    return diffDays > 0 ? diffDays : 1
  }

  type TallerEntry = { placa: string; tipo: string; loc: string; supervisor: string; actividad: string; proveedor: string; diasPendientes: number }
  const currTallerMap = new Map<string, TallerEntry>()
  const prevTallerMap = new Map<string, TallerEntry>()

  const corteDate = dates.find(d2 => getDateKey(d2) === targetIso) ?? uniqueEntries[currIdx][1]

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const iso = getDateKey(d)
    const info = getInspectionDetails(r)
    if (!info.placa || !info.isNoOp) continue
    const act = String(r['Actividades en taller'] ?? r['Actividades_en_taller'] ?? '').trim()
    const prov = String(r['Proveedor_Texto'] ?? r['Proveedor'] ?? '').trim()

    if (iso === targetIso && !currTallerMap.has(info.placa)) {
      currTallerMap.set(info.placa, {
        placa: info.placa,
        tipo: info.baseTipo,
        loc: info.loc,
        supervisor: info.supervisor,
        actividad: act,
        proveedor: prov,
        diasPendientes: calcularDiasEnTaller(info.placa, corteDate, targetIso),
      })
    }
    if (iso === prevIso && !prevTallerMap.has(info.placa)) {
      prevTallerMap.set(info.placa, {
        placa: info.placa,
        tipo: info.baseTipo,
        loc: info.loc,
        supervisor: info.supervisor,
        actividad: act,
        proveedor: prov,
        diasPendientes: calcularDiasEnTaller(info.placa, prevDate, prevIso),
      })
    }
  }

  const ingresaron: TallerEntry[] = []
  for (const [placa, data] of currTallerMap.entries()) {
    if (!prevTallerMap.has(placa)) {
      ingresaron.push(data)
    }
  }

  const salieron: TallerEntry[] = []
  for (const [placa, data] of prevTallerMap.entries()) {
    if (!currTallerMap.has(placa)) {
      salieron.push(data)
    }
  }

  return {
    hasPrev: true,
    prevIso,
    prevLabel,
    ingresaron,
    salieron,
  }
})

const svgTrend = computed(() => {
  const records = activePlacasRows.value
  if (!records || records.length === 0) return null

  const dateMap = new Map<string, { date: Date; total: number; scoreSum: number }>()
  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const key = getDateKey(d)
    const info = getInspectionDetails(r)
    if (!dateMap.has(key)) {
      dateMap.set(key, { date: d, total: 0, scoreSum: 0 })
    }
    const item = dateMap.get(key)!
    item.total++
    const amScore = !isNaN(info.revAm) ? info.revAm : info.score
    item.scoreSum += amScore
  }

  const sortedKeys = Array.from(dateMap.keys()).sort()
  const last14Keys = sortedKeys.slice(-14)
  if (last14Keys.length === 0) return null

  const points = last14Keys.map((k, i) => {
    const item = dateMap.get(k)!
    const disp = item.total > 0 ? item.scoreSum / item.total : 0
    const pct = Math.round(disp * 100)
    const n = last14Keys.length
    const x = n > 1 ? 44 + i * (640 / (n - 1)) : 364
    const y = 180 - disp * 162
    const d = item.date
    const dia = String(d.getUTCDate()).padStart(2, '0')
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dateLabel = `${dia}/${mes}`
    const isLast = i === last14Keys.length - 1
    return {
      x,
      y,
      pct,
      dateLabel,
      totalEq: item.total,
      isLast,
      color: isLast ? (pct >= 85 ? '#16A34A' : pct >= 60 ? '#F59E0B' : '#DC2626') : '#2563eb',
    }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = points.length > 0
    ? `${pathD} L${points[points.length - 1].x.toFixed(1)},180.0 L${points[0].x.toFixed(1)},180.0 Z`
    : ''

  const pcts = points.map(p => p.pct)
  const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0
  const maxPct = pcts.length > 0 ? Math.max(...pcts) : 0
  const minPct = pcts.length > 0 ? Math.min(...pcts) : 0

  return {
    points,
    pathD,
    areaD,
    avgPct,
    maxPct,
    minPct,
  }
})

const informeAnalisisTexto = computed(() => {
  const k = informeKpis.value
  const fecha = informeFechaLabel.value
  const ops = k.operativosFormatted
  const totalFlota = k.flotaTotal
  const propias = k.flotaPropia
  const alq = k.alquilados
  const dispPropia = k.dispPropiaPct
  const dispCancha = k.dispCanchaPct
  const cobertura = k.coberturaPct
  const rezago = k.diasRezago
  const noOpCount = k.noOperativos
  const parcialCount = k.parciales

  let texto = `Consolidado Operativo ${plantaLabel.value}: Evaluación de disponibilidad de la flota al corte del <strong>${fecha}</strong>. `
  texto += `Flota total evaluada: <strong>${totalFlota} equipos</strong> (${propias} propios${alq > 0 ? ` + ${alq} alquilados` : ''}). `
  texto += `Disponibilidad propia: <strong>${dispPropia}%</strong> `
  if (alq > 0) texto += `| Disponibilidad en cancha: <strong>${dispCancha}%</strong>. `
  else texto += `. `
  texto += `Equipos operativos: <strong>${ops}</strong>, `
  texto += `parciales: <strong>${parcialCount}</strong>, `
  texto += `no operativos: <strong>${noOpCount}</strong>. `
  texto += `Cobertura de inspección: <strong>${cobertura}%</strong>. `
  if (rezago > 2) {
    texto += `<br><strong>Alerta de rezago:</strong> Última inspección con ${rezago} días de antigüedad.`
  }

  const alqInfo = informeFlotaAlquilada.value
  if (alqInfo.total > 0) {
    texto += ` Flota alquilada: ${alqInfo.op} de ${alqInfo.total} operativos (${alqInfo.dispPct}% disponibilidad).`
  }

  return texto
})

// Filtrar solo las 3 plantas de Concretos
function esPlanta(loc: string): boolean {
  const plantas = ['VILLAVICENCIO', 'RESTREPO', 'ACACIAS']
  const upper = loc.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return plantas.some(p => upper.includes(p))
}

// Tendencia AM vs PM por planta (mismo día)
const tendenciaSedesAmPm = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  if (!targetIso) return []

  const map = new Map<string, { amSum: number; amN: number; pmSum: number; pmN: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    const loc = info.loc || 'Planta'
    if (!map.has(loc)) map.set(loc, { amSum: 0, amN: 0, pmSum: 0, pmN: 0 })
    const item = map.get(loc)!

    const revAm = Number(r['Rev_AM'] ?? r['rev_am'] ?? NaN)
    const revPm = Number(r['Rev_PM'] ?? r['rev_pm'] ?? NaN)

    if (!isNaN(revAm) && revAm >= 0) {
      item.amSum += revAm
      item.amN++
    }
    if (!isNaN(revPm) && revPm >= 0) {
      item.pmSum += revPm
      item.pmN++
    }
  }

  const colors = ['#4338ca', '#dc2626', '#0369a1', '#7e22ce', '#16a34a', '#ea580c']
  const list = Array.from(map.entries())
    .filter(([, v]) => v.amN > 0 || v.pmN > 0)
    .map(([nombre, v], i) => {
      const pmPct = v.pmN > 0 ? Math.round((v.pmSum / v.pmN) * 100) : 0
      const amPct = v.amN > 0 ? Math.round((v.amSum / v.amN) * 100) : 0
      return { nombre: nombre.toUpperCase(), pmPct, amPct, color: colors[i % colors.length] }
    })

  list.sort((a, b) => b.nombre.localeCompare(a.nombre))
  return list
})

// ─── ECharts: refs y renderizado ────────────────────────────
const chartTendenciaRef = ref<HTMLElement | null>(null)
const chartTipoRef = ref<HTMLElement | null>(null)
const chartSedeRef = ref<HTMLElement | null>(null)
const chartDispRef = ref<HTMLElement | null>(null)
const chartMensualRef = ref<HTMLElement | null>(null)
const chartCumpHoyRef = ref<HTMLElement | null>(null)
const chartCumpAyerRef = ref<HTMLElement | null>(null)

const CP = '#2b2256'

const chartInstances: echarts.ECharts[] = []

function destroyCharts() {
  chartInstances.forEach(c => c.dispose())
  chartInstances.length = 0
}

function renderAllCharts() {
  destroyCharts()
  nextTick(() => {
    const k = informeKpis.value
    const catData = matrizCategoriaData.value

    // ── 1. Donut Disponibilidad Global ──
    if (chartDispRef.value) {
      const chart = echarts.init(chartDispRef.value, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const dp = k.dispPropiaPct
      const opTot = k.operativos
      const flota = k.flotaTotal
      const dc = dp >= 80 ? '#16a34a' : dp >= 65 ? '#e8a020' : '#dc2626'
      chart.setOption({
        animation: false,
        title: {
          text: dp + '%',
          subtext: 'DISPONIBILIDAD\n' + opTot + ' de ' + flota + ' equipos',
          x: 'center', y: 'center',
          textStyle: { fontSize: 30, fontWeight: '900', color: dc, fontFamily: 'Arial' },
          subtextStyle: { fontSize: 8, color: '#666', fontWeight: 'bold', fontFamily: 'Arial', lineHeight: 14 }
        },
        series: [{ type: 'pie', radius: ['62%', '82%'], avoidLabelOverlap: false, label: { show: false },
          data: [{ value: dp, itemStyle: { color: dc } }, { value: 100 - dp, itemStyle: { color: '#e0d8ec' } }]
        }]
      })
    }

    // ── 2. Barras horizontales por Tipo ──
    if (chartTipoRef.value) {
      const chart = echarts.init(chartTipoRef.value, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const rows = catData.rows
      const keys = rows.map(r => r.tipo)
      const dataOp = rows.map(r => r.opProp)
      const dataAlq = rows.map(r => r.opAlq || 0)
      const dataParc = rows.map(r => r.parcial || 0)
      const dataNo = rows.map(r => r.noOp)
      const barH = Math.max(14, Math.min(32, Math.floor((340 - 8) / Math.max(keys.length, 1)) - 2))
      const dataMap: Record<string, { op: number; alq: number; parc: number; no: number }> = {}
      rows.forEach(r => { dataMap[r.tipo] = { op: r.opProp, alq: r.opAlq || 0, parc: r.parcial || 0, no: r.noOp } })
      chart.setOption({
        animation: false,
        grid: { top: 2, bottom: 2, left: 145, right: 40 },
        yAxis: { type: 'category', data: keys, axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { margin: 4, textStyle: { color: CP, fontWeight: 'bold', fontSize: 10 } } },
        xAxis: { show: false },
        series: [
          { name: 'Operativo propio', type: 'bar', stack: 'total', barWidth: barH, barCategoryGap: '6%', data: dataOp,
            itemStyle: { color: '#16a34a', borderRadius: 2 },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'Alquilado', type: 'bar', stack: 'total', barWidth: barH, barCategoryGap: '6%', data: dataAlq,
            itemStyle: { color: '#473f66', borderRadius: 2 },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'Parcial', type: 'bar', stack: 'total', barWidth: barH, barCategoryGap: '6%', data: dataParc,
            itemStyle: { color: '#e8a020', borderRadius: 2 },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'No operativo', type: 'bar', stack: 'total', barWidth: barH, barCategoryGap: '6%', data: dataNo,
            itemStyle: { color: '#dc2626', borderRadius: 2 },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { type: 'bar', stack: 'total', data: keys.map(() => 0),
            label: { show: true, position: 'right', distance: 4,
              formatter: (params: any) => {
                const d = dataMap[params.name]
                if (!d) return ''
                const tot = d.op + d.alq + d.no + d.parc
                return tot > 0 ? Math.round((d.op + d.alq + d.parc * 0.5) / tot * 100) + '%' : '0%'
              },
              textStyle: { fontWeight: 'bold', fontSize: 11,
                color: (params: any) => {
                  const d = dataMap[params.name]
                  if (!d) return '#999'
                  const tot = d.op + d.alq + d.no + d.parc
                  const disp = tot > 0 ? (d.op + d.alq + d.parc * 0.5) / tot * 100 : 0
                  return disp >= 80 ? '#16a34a' : disp >= 65 ? '#e8a020' : '#dc2626'
                } }
            }
          }
        ]
      })
    }

    // ── 3. Barras verticales por Sede ──
    if (chartSedeRef.value) {
      const chart = echarts.init(chartSedeRef.value, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const records = activePlacasRows.value
      const targetIso = effectiveCorteIso.value
      const sedeMap = new Map<string, { op: number; alq: number; parc: number; no: number }>()
      for (const r of records) {
        const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
        if (!d) continue
        if (targetIso && getDateKey(d) !== targetIso) continue
        const info = getInspectionDetails(r)
        const sede = info.loc || 'Planta'
        if (!sedeMap.has(sede)) sedeMap.set(sede, { op: 0, alq: 0, parc: 0, no: 0 })
        const item = sedeMap.get(sede)!
        if (info.esAlquilado) {
          if (info.isNoOp) item.no++
          else item.alq++
        } else {
          if (info.isNoOp) item.no++
          else if (info.isParcial) item.parc++
          else item.op++
        }
      }
      const sedes = Array.from(sedeMap.keys())
      const dataOp = sedes.map(s => sedeMap.get(s)!.op)
      const dataAlq = sedes.map(s => sedeMap.get(s)!.alq)
      const dataParc = sedes.map(s => sedeMap.get(s)!.parc)
      const dataNo = sedes.map(s => sedeMap.get(s)!.no)
      let maxSede = 0
      sedes.forEach(s => { const d = sedeMap.get(s)!; maxSede = Math.max(maxSede, d.op + d.alq + d.no + d.parc) })
      const yMax = Math.max(10, Math.ceil(maxSede / 10) * 10)
      chart.setOption({
        animation: false,
        legend: { top: 0, right: 0, textStyle: { fontSize: 9 } },
        grid: { top: 30, bottom: 30, left: 40, right: 20 },
        xAxis: { type: 'category', data: sedes, axisLabel: { fontSize: 11, color: CP, fontWeight: 'bold' } },
        yAxis: { type: 'value', max: yMax, interval: yMax / 3,
          name: 'Nº equipos', nameTextStyle: { color: '#666', fontSize: 9, fontWeight: 'bold' },
          axisLine: { show: false }, axisTick: { show: false },
          splitLine: { lineStyle: { color: '#e0d8ec', type: 'dashed' } },
          axisLabel: { fontSize: 9 } },
        series: [
          { name: 'Operativo propio', type: 'bar', stack: 'total', barMaxWidth: 52, data: dataOp, itemStyle: { color: '#16a34a', borderRadius: [0,0,2,2] },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'Alquilado', type: 'bar', stack: 'total', barMaxWidth: 52, data: dataAlq, itemStyle: { color: '#473f66' },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'Parcial', type: 'bar', stack: 'total', barMaxWidth: 52, data: dataParc, itemStyle: { color: '#e8a020' },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { name: 'No operativo', type: 'bar', stack: 'total', barMaxWidth: 52, data: dataNo, itemStyle: { color: '#dc2626', borderRadius: [2,2,0,0] },
            label: { show: true, position: 'inside', formatter: (p: any) => p.value > 0 ? p.value : '', textStyle: { color: '#fff', fontSize: 10, fontWeight: 'bold' } } },
          { type: 'bar', stack: 'total', barMaxWidth: 52, data: sedes.map(() => 0),
            label: { show: true, position: 'top', distance: 4,
              formatter: (params: any) => {
                const d = sedeMap.get(params.name)
                if (!d) return ''
                const tot = d.op + d.alq + d.no + d.parc
                return tot > 0 ? Math.round((d.op + d.alq + d.parc * 0.5) / tot * 100) + '%' : '0%'
              },
              textStyle: { fontWeight: 'bold', fontSize: 11,
                color: (params: any) => {
                  const d = sedeMap.get(params.name)
                  if (!d) return '#999'
                  const tot = d.op + d.alq + d.no + d.parc
                  const disp = tot > 0 ? (d.op + d.alq + d.parc * 0.5) / tot * 100 : 0
                  return disp >= 80 ? '#16a34a' : disp >= 65 ? '#e8a020' : '#dc2626'
                } }
            }
          }
        ]
      })
    }

    // ── 4. Línea tendencia AM vs PM por sede ──
    if (chartTendenciaRef.value) {
      const chart = echarts.init(chartTendenciaRef.value, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const sedesData = tendenciaSedesAmPm.value
      if (sedesData.length > 0) {
        const fallbackColors = ['#4338ca', '#dc2626', '#0369a1', '#7e22ce', '#16a34a', '#ea580c']
        const allVals: number[] = []
        sedesData.forEach(p => { allVals.push(p.pmPct, p.amPct) })
        const vMin = Math.min(...allVals)
        const vMax = Math.max(...allVals)
        let yTop = Math.max(0, Math.floor((vMin - 6) / 5) * 5)
        let yBottom = Math.min(100, Math.ceil((vMax + 6) / 5) * 5)
        if (yBottom - yTop < 20) { yTop = Math.max(0, yTop - 5); yBottom = Math.min(100, yBottom + 5) }
        const seriesTend = sedesData.map((p, i) => {
          const color = p.color || fallbackColors[i % fallbackColors.length]
          const lift = (i - (sedesData.length - 1) / 2) * 9
          return {
            name: p.nombre,
            type: 'line',
            data: [Number(p.amPct), Number(p.pmPct)],
            smooth: false,
            symbol: 'circle',
            symbolSize: 10,
            showSymbol: true,
            z: 3,
            lineStyle: { width: 3, color, cap: 'round', join: 'round' },
            itemStyle: { color, borderWidth: 3, borderColor: '#ffffff' },
            label: { show: true, formatter: (x: any) => x.value != null ? x.value + '%' : '',
              position: 'top', distance: 2, offset: [0, lift - 10],
              backgroundColor: 'rgba(255,255,255,0.92)', padding: [2, 5], borderRadius: 3,
              borderColor: color, borderWidth: 1,
              textStyle: { fontWeight: 'bold', fontSize: 11, color } }
          }
        })
        chart.setOption({
          animation: false,
          color: seriesTend.map(s => (s.itemStyle as any).color),
          legend: { top: 6, right: 10, itemWidth: 28, itemHeight: 14, itemGap: 16,
            textStyle: { fontSize: 11, color: CP, fontWeight: 'bold' } },
          grid: { top: 60, bottom: 32, left: 60, right: 30 },
          xAxis: { type: 'category', data: ['AM (Mañana)', 'PM (Tarde)'], boundaryGap: true,
            axisLine: { lineStyle: { color: '#999', width: 1.5 } },
            axisTick: { show: false },
            axisLabel: { margin: 12, textStyle: { color: CP, fontWeight: 'bold', fontSize: 12 } } },
          yAxis: { type: 'value', min: yTop, max: yBottom, interval: 5,
            axisLine: { show: false }, axisTick: { show: false },
            splitLine: { lineStyle: { color: '#d8d2e8', width: 1, type: 'solid' } },
            axisLabel: { formatter: '{value}%', textStyle: { color: '#444', fontSize: 10, fontWeight: 'bold' } } },
          series: seriesTend
        })
      }
    }

    // ── 5. Línea tendencia mensual ──
    if (chartMensualRef.value) {
      const chart = echarts.init(chartMensualRef.value, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const trend = svgTrend.value
      if (trend && trend.points.length > 0) {
        const fechas = trend.points.map(p => p.dateLabel)
        const pcts = trend.points.map(p => p.pct)
        chart.setOption({
          animation: false,
          grid: { top: 20, bottom: 30, left: 40, right: 20 },
          xAxis: { type: 'category', data: fechas, axisLabel: { fontSize: 8 } },
          yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', fontSize: 8 } },
          series: [{ type: 'line', data: pcts, itemStyle: { color: CP }, areaStyle: { color: '#e5e0ef' },
            label: { show: true, formatter: '{c}%', fontSize: 8 } }]
        })
      }
    }

    // ── 6. Donuts de Cumplimiento ──
    function renderCump(el: HTMLElement | null, pct: number) {
      if (!el) return
      const chart = echarts.init(el, null, { renderer: 'svg' })
      chartInstances.push(chart)
      const dc = pct >= 80 ? '#16a34a' : pct >= 50 ? '#e8a020' : '#dc2626'
      chart.setOption({
        animation: false,
        title: { text: pct + '%', subtext: 'CUMPLIMIENTO', x: 'center', y: 'center',
          textStyle: { fontSize: 18, fontWeight: '900', color: dc, fontFamily: 'Arial' },
          subtextStyle: { fontSize: 6.5, color: '#666', fontWeight: 'bold', fontFamily: 'Arial' } },
        series: [{ type: 'pie', radius: ['68%', '84%'], avoidLabelOverlap: false, label: { show: false },
          data: [{ value: pct, itemStyle: { color: dc } }, { value: 100 - pct, itemStyle: { color: '#e0d8ec' } }]
        }]
      })
    }
    renderCump(chartCumpAyerRef.value, cumplimientoGlobalPctAnterior.value)
    renderCump(chartCumpHoyRef.value, cumplimientoGlobalPct.value)
  })
}

watch([effectiveCorteIso, () => dispStore.data], () => { nextTick(renderAllCharts) }, { deep: true })
watch(dispView, () => { nextTick(renderAllCharts) })
onMounted(() => { nextTick(renderAllCharts) })

const generandoPdf = ref(false)

/** Genera el PDF del informe oficial y lo descarga directamente */
async function generarInformePdf() {
  if (generandoPdf.value) return
  generandoPdf.value = true
  try {
    renderAllCharts()
    await new Promise(r => setTimeout(r, 500))
    const elemento = document.querySelector('.report-paper') as HTMLElement
    if (!elemento) {
      console.error('No se encontró el contenedor del reporte (.report-paper)')
      return
    }
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Forzar tema claro temporalmente para que los colores del PDF salgan vivos
    const root = document.documentElement
    const temaPrevio = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('light')
    root.classList.remove('dark')

    // Esperar un frame para que el navegador aplique los estilos
    await new Promise(r => requestAnimationFrame(() => r(null)))

    try {
      // Dimensiones A4 en mm
      const pageW = 210
      const pageH = 297
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      // Función auxiliar: añadir un canvas al PDF respetando la proporción
      // y dividendo en múltiples páginas A4 si el contenido es más alto
      function addCanvasToPdf(canvas: HTMLCanvasElement, isFirst: boolean) {
        const imgW = pageW
        const imgH = (canvas.height * imgW) / canvas.width
        const imgData = canvas.toDataURL('image/png')

        if (imgH <= pageH) {
          // Cabe en una sola página
          if (!isFirst) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST')
        } else {
          // El contenido es más alto que una página A4: dividir en rebanadas
          const pxPerMm = canvas.width / imgW
          const pageHeightPx = Math.floor(pageH * pxPerMm)
          let yOffset = 0
          let firstSlice = isFirst

          while (yOffset < canvas.height) {
            const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset)
            const sliceCanvas = document.createElement('canvas')
            sliceCanvas.width = canvas.width
            sliceCanvas.height = sliceHeight
            const ctx = sliceCanvas.getContext('2d')!
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
            ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

            if (!firstSlice) pdf.addPage()
            const sliceData = sliceCanvas.toDataURL('image/png')
            const sliceHm = (sliceHeight * imgW) / canvas.width
            pdf.addImage(sliceData, 'PNG', 0, 0, imgW, sliceHm, undefined, 'FAST')

            yOffset += sliceHeight
            firstSlice = false
          }
        }
      }

      // Capturar cada .report-page individualmente para mayor nitidez
      const pages = elemento.querySelectorAll<HTMLElement>('.report-page')
      if (pages.length === 0) {
        const canvas = await html2canvas(elemento, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        addCanvasToPdf(canvas, true)
      } else {
        let first = true
        for (let i = 0; i < pages.length; i++) {
          const pageCanvas = await html2canvas(pages[i], {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: pages[i].scrollWidth,
            height: pages[i].scrollHeight,
            windowWidth: pages[i].scrollWidth,
            windowHeight: pages[i].scrollHeight,
          })
          addCanvasToPdf(pageCanvas, first)
          first = false
        }
      }
      const fechaLimpia = (informeFechaLabel.value || 'reporte')
        .replace(/[^\wáéíóúÁÉÍÓÚñÑ -]/g, '').replace(/\s+/g, '_').trim()
      pdf.save(`Disponibilidad_${plantaLabel.value}_${fechaLimpia}.pdf`)
    } finally {
      // Restaurar el tema original
      if (temaPrevio === 'dark') {
        root.setAttribute('data-theme', 'dark')
        root.classList.add('dark')
        root.classList.remove('light')
      }
    }
  } catch (err) {
    console.error('Error generando PDF:', err)
  } finally {
    generandoPdf.value = false
  }
}

const tieneAlquilados = computed(() => {
  if (!isConcretosPlanta.value) return false
  return activePlacasRows.value.some(r => {
    const info = getInspectionDetails(r)
    return info.esAlquilado
  })
})

const kpis = computed(() => {
  const records = activePlacasRows.value
  if (!records || records.length === 0) {
    return {
      flotaTotal: 0,
      flotaPropia: 0,
      alquilados: 0,
      alquiladosNoOp: 0,
      operativos: 0,
      operativosFormatted: '0',
      noOperativos: 0,
      parciales: 0,
      enTaller: 0,
      dispPropiaPct: 0,
      dispCanchaPct: 0,
      coberturaPct: 0,
      inspeccionados: 0,
      diasRezago: 0,
    }
  }

  const targetIso = effectiveCorteIso.value
  const vehiculosSet = new Set<string>()
  const alquiladosSet = new Set<string>()

  let scoreSumTotal = 0
  let countTotal = 0
  let scorePropiaSum = 0
  let countPropia = 0
  let opCount = 0
  let parcialCount = 0
  let noOpCount = 0
  let inspectedCount = 0

  for (const r of records) {
    const info = getInspectionDetails(r)
    if (info.placa) {
      vehiculosSet.add(info.placa)
      if (info.esAlquilado) alquiladosSet.add(info.placa)
    }

    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const iso = getDateKey(d)
    if (targetIso && iso !== targetIso) continue

    inspectedCount++
    countTotal++
    scoreSumTotal += info.score

    if (!info.esAlquilado) {
      scorePropiaSum += info.score
      countPropia++
    }

    if (info.isOperativo) opCount++
    else if (info.isParcial) parcialCount++
    else noOpCount++
  }

  const flotaTotal = vehiculosSet.size || records.length
  const alquilados = alquiladosSet.size
  const flotaPropia = Math.max(flotaTotal - alquilados, 1)

  const operativosFormatted = parcialCount > 0
    ? (opCount + (parcialCount * 0.5)).toFixed(1).replace('.0', '').replace('.', ',')
    : String(opCount)

  const dispPropiaPct = countPropia > 0
    ? Math.round((scorePropiaSum / countPropia) * 100)
    : (countTotal > 0 ? Math.round((scoreSumTotal / countTotal) * 100) : 0)

  const dispCanchaPct = countTotal > 0
    ? Math.round((scoreSumTotal / countTotal) * 100)
    : dispPropiaPct

  const coberturaPct = flotaTotal > 0 ? Math.min(100, Math.round((inspectedCount / flotaTotal) * 100)) : 100

  let diasRezago = 0
  if (targetIso) {
    const parts = targetIso.split('-').map(Number)
    const targetDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    const diffTime = Math.abs(new Date().getTime() - targetDate.getTime())
    diasRezago = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  return {
    flotaTotal,
    flotaPropia,
    alquilados,
    alquiladosNoOp: 0,
    operativos: opCount,
    operativosFormatted,
    noOperativos: noOpCount,
    parciales: parcialCount,
    enTaller: noOpCount,
    dispPropiaPct,
    dispCanchaPct,
    coberturaPct,
    inspeccionados: inspectedCount,
    diasRezago,
  }
})

// Variables de estilo adaptadas al tema
const isDark = computed(() => theme.value !== 'light')
const textColor = computed(() => isDark.value ? '#94a3b8' : '#475569')
const titleColor = computed(() => isDark.value ? '#f1f5f9' : '#0f172a')
const splitLineColor = computed(() => isDark.value ? 'rgba(255,255,255,0.06)' : '#e2e8f0')

// ================= GRÁFICAS ECHARTS (AGREGADOS) =================

// 1. Gráfico de Líneas: Comparativo Diario Ronda AM vs Ronda PM
const amVsPmTrendOpt = computed(() => {
  const records = activePlacasRows.value
  const datesMap = new Map<string, { amSum: number; pmSum: number; count: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const dateKey = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!datesMap.has(dateKey)) {
      datesMap.set(dateKey, { amSum: 0, pmSum: 0, count: 0 })
    }
    const dm = datesMap.get(dateKey)!
    const info = getInspectionDetails(r)
    if (!isNaN(info.revAm)) dm.amSum += info.revAm
    if (!isNaN(info.revPm)) dm.pmSum += info.revPm
    dm.count++
  }

  let dates = [...datesMap.keys()]
  let dataAM = [...datesMap.values()].map(v => v.count > 0 ? Math.round((v.amSum / v.count) * 100) : 0)
  let dataPM = [...datesMap.values()].map(v => v.count > 0 ? Math.round((v.pmSum / v.count) * 100) : 0)

  if (dates.length === 0) {
    dates = ['Día 1', 'Día 2', 'Día 3']
    dataAM = [kpis.value.dispPropiaPct, kpis.value.dispPropiaPct, kpis.value.dispPropiaPct]
    dataPM = [Math.max(0, kpis.value.dispPropiaPct - 15), Math.max(0, kpis.value.dispPropiaPct - 10), Math.max(0, kpis.value.dispPropiaPct - 12)]
  }

  return markRaw({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        if (!params || !params.length) return ''
        const date = params[0].name
        const valAM = params.find(p => p.seriesName === 'Ronda AM (Mañana)')?.value ?? '—'
        const valPM = params.find(p => p.seriesName === 'Ronda PM (Tarde)')?.value ?? '—'
        const brecha = typeof valAM === 'number' && typeof valPM === 'number' ? (valPM - valAM) : 0
        return `
          <div style="font-size:12px; font-weight:700; color:${titleColor.value}; margin-bottom:4px;">${date}</div>
          <div style="display:flex; justify-content:space-between; gap:16px; font-size:12px; color:#3b82f6;">
            <span>🌅 Ronda AM:</span> <strong>${valAM}%</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:16px; font-size:12px; color:#f59e0b;">
            <span>🌇 Ronda PM:</span> <strong>${valPM}%</strong>
          </div>
          <div style="margin-top:4px; padding-top:4px; border-top:1px solid ${splitLineColor.value}; font-size:11px; color:${brecha < 0 ? '#ef4444' : '#10b981'};">
            Brecha AM→PM: <strong>${brecha >= 0 ? '+' : ''}${brecha} pp</strong>
          </div>
        `
      },
    },
    legend: {
      data: ['Ronda AM (Mañana)', 'Ronda PM (Tarde)', 'Meta (85%)'],
      top: 0,
      textStyle: { color: textColor.value, fontSize: 12 },
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: textColor.value } },
      axisLabel: { color: textColor.value, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        name: 'Ronda AM (Mañana)',
        type: 'line',
        data: dataAM,
        smooth: true,
        symbolSize: 7,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { color: '#3b82f6', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.22)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.01)' },
            ],
          },
        },
        markLine: {
          silent: true,
          data: [{ yAxis: 85, name: 'Meta (85%)', label: { formatter: 'Meta 85%', position: 'end', color: '#10b981', fontWeight: 'bold' } }],
          lineStyle: { color: '#10b981', type: 'dashed', width: 2 },
        },
      },
      {
        name: 'Ronda PM (Tarde)',
        type: 'line',
        data: dataPM,
        smooth: true,
        symbolSize: 7,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { color: '#f59e0b', width: 2.5, type: 'solid' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.15)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.01)' },
            ],
          },
        },
      },
    ],
  })
})

// 2. Disponibilidad por Tipo de Equipo (Barras Apiladas)
const tipoEquipoOpt = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const map = new Map<string, { opPropio: number; opAlq: number; parciales: number; noOp: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    const tipo = info.baseTipo

    if (!map.has(tipo)) {
      map.set(tipo, { opPropio: 0, opAlq: 0, parciales: 0, noOp: 0 })
    }
    const cat = map.get(tipo)!
    if (info.isNoOp) {
      cat.noOp++
    } else if (info.isParcial) {
      cat.parciales++
    } else if (info.esAlquilado) {
      cat.opAlq++
    } else {
      cat.opPropio++
    }
  }

  const sortedCategories = [...map.entries()].sort((a, b) => {
    const totalA = a[1].opPropio + a[1].opAlq + a[1].parciales + a[1].noOp
    const totalB = b[1].opPropio + b[1].opAlq + b[1].parciales + b[1].noOp
    return totalA - totalB
  })

  const categories = sortedCategories.map(s => s[0])
  const opPropio = sortedCategories.map(s => s[1].opPropio)
  const opAlq = sortedCategories.map(s => s[1].opAlq)
  const parciales = sortedCategories.map(s => s[1].parciales)
  const noOp = sortedCategories.map(s => s[1].noOp)

  return markRaw({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Operativo Propio', 'Alquilado', 'Parcial (0.5)', 'No Operativo'],
      top: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
    },
    grid: { left: '3%', right: '6%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontWeight: 'bold', color: titleColor.value },
    },
    series: [
      { name: 'Operativo Propio', type: 'bar', stack: 'total', data: opPropio, itemStyle: { color: '#10b981' } },
      { name: 'Alquilado', type: 'bar', stack: 'total', data: opAlq, itemStyle: { color: '#06b6d4' } },
      { name: 'Parcial (0.5)', type: 'bar', stack: 'total', data: parciales, itemStyle: { color: '#f59e0b' } },
      { name: 'No Operativo', type: 'bar', stack: 'total', data: noOp, itemStyle: { color: '#ef4444' } },
    ],
  })
})

// 3. Dona Operatividad Global
const donaOpt = computed(() => {
  return markRaw({
    tooltip: { trigger: 'item', formatter: '{b}: <strong>{c} equipos</strong> ({d}%)' },
    legend: { orient: 'horizontal', bottom: '0', textStyle: { color: textColor.value, fontSize: 11 } },
    series: [
      {
        name: 'Operatividad',
        type: 'pie',
        radius: ['52%', '76%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: `${kpis.value.dispPropiaPct}%\nDISPONIBILIDAD`,
          fontSize: 16,
          fontWeight: 'bold',
          color: kpis.value.dispPropiaPct >= 85 ? '#10b981' : kpis.value.dispPropiaPct >= 60 ? '#f59e0b' : '#ef4444',
        },
        data: [
          { value: kpis.value.operativos, name: 'Operativos', itemStyle: { color: '#10b981' } },
          { value: kpis.value.parciales, name: 'Parciales (0,5)', itemStyle: { color: '#f59e0b' } },
          { value: kpis.value.noOperativos, name: 'No Operativos', itemStyle: { color: '#ef4444' } },
        ],
      },
    ],
  })
})



// 4. Brecha Diaria AM vs PM
const brechaDiariaOpt = computed(() => {
  const records = activePlacasRows.value
  const datesMap = new Map<string, { amSum: number; pmSum: number; count: number }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const dateKey = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!datesMap.has(dateKey)) {
      datesMap.set(dateKey, { amSum: 0, pmSum: 0, count: 0 })
    }
    const dm = datesMap.get(dateKey)!
    const info = getInspectionDetails(r)
    if (!isNaN(info.revAm)) dm.amSum += info.revAm
    if (!isNaN(info.revPm)) dm.pmSum += info.revPm
    dm.count++
  }

  const dates = [...datesMap.keys()]
  const brechas = [...datesMap.values()].map(v => {
    if (v.count === 0) return 0
    const am = Math.round((v.amSum / v.count) * 100)
    const pm = Math.round((v.pmSum / v.count) * 100)
    return pm - am
  })

  return markRaw({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: Brecha AM vs PM de <strong>{c} puntos porcentuales</strong>',
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates.length > 0 ? dates : ['Día 1'],
      axisLabel: { color: textColor.value, fontSize: 10 },
      axisLine: { lineStyle: { color: textColor.value } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} pp', color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        name: 'Brecha AM - PM',
        type: 'bar',
        barWidth: '50%',
        data: (brechas.length > 0 ? brechas : [0]).map(v => ({
          value: v,
          itemStyle: { color: v <= -30 ? '#ef4444' : v <= -20 ? '#f59e0b' : '#3b82f6', borderRadius: [0, 0, 4, 4] },
        })),
        label: { show: true, position: 'bottom', formatter: '{c}', color: textColor.value, fontSize: 10 },
      },
    ],
  })
})

// 5. Disponibilidad por Planta / Localización / Frente de Trabajo
const plantaOpt = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const locMap = new Map<string, { sumScore: number; count: number }>()

  // En Concretos mostramos localizaciones tipo "Planta" (PLANTA VILLAVICENCIO, PLANTA ACACIAS, LOGISTICA ...)
  // En Maquinaria/Cuncia mostramos solo frentes de trabajo (no PLANTA ... ni el fallback genérico "Planta")
  const esConcretos = isConcretosPlanta.value

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue

    const info = getInspectionDetails(r)
    const loc = (info.loc || '').toUpperCase().trim()

    // Excluir registros sin localización real (fallback genérico)
    if (!loc || loc === 'PLANTA' || loc === 'SIN LOCALIZACIÓN' || loc === 'N/A') continue

    // Filtro por contexto:
    // - Concretos: solo sedes tipo planta (empieza con PLANTA o LOGÍSTICA/LOGISTICA)
    // - Maquinaria: solo frentes de trabajo (excluir los que sean una sede de planta concretera)
    const esSedePlanta = loc.startsWith('PLANTA') || loc.startsWith('LOGISTIC')
    if (esConcretos && !esSedePlanta) continue
    if (!esConcretos && esSedePlanta) continue

    const existing = locMap.get(loc) ?? { sumScore: 0, count: 0 }
    existing.sumScore += info.score
    existing.count++
    locMap.set(loc, existing)
  }

  const sortedLocs = [...locMap.entries()].sort((a, b) => a[1].count - b[1].count)
  const chartTitle = esConcretos ? 'Sede / Planta' : 'Frente de Trabajo'
  const plantNames = sortedLocs.map(s => `${s[0]} (${s[1].count} eq)`)
  const dataValues = sortedLocs.map(s => {
    const item = s[1]
    const pct = item.count > 0 ? Math.round((item.sumScore / item.count) * 100) : 0
    return {
      value: pct,
      itemStyle: {
        color: pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
        borderRadius: [0, 4, 4, 0],
      },
    }
  })

  return markRaw({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `<strong>${p.name}</strong><br/>${chartTitle}: <strong>${p.value}%</strong>`
      },
    },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      data: plantNames,
      axisLabel: { fontWeight: 'bold', color: titleColor.value, fontSize: 11 },
    },
    series: [
      {
        name: 'Disponibilidad',
        type: 'bar',
        barMaxWidth: 24,
        data: dataValues,
        label: { show: true, position: 'right', formatter: '{c}%', fontWeight: 'bold', color: titleColor.value },
      },
    ],
  })
})

// 6. Top Equipos con Mayor Inactividad / Días en Taller
const topInactivosList = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const mantMap = new Map<string, number>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue
    const info = getInspectionDetails(r)
    if (!info.placa) continue
    if (info.isNoOp || info.esEnTaller) {
      mantMap.set(info.placa, (mantMap.get(info.placa) ?? 0) + 1)
    }
  }

  return [...mantMap.entries()].sort((a, b) => b[1] - a[1])
})

function buildTopInactivosOption(list: [string, number][], limit?: number) {
  const sliced = limit ? list.slice(0, limit) : list
  const equipos = sliced.map(s => s[0])
  const dias = sliced.map(s => s[1])

  return markRaw({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: <strong>{c} días inactivo / en taller</strong>' },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} d', color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: equipos,
      axisLabel: { fontWeight: 'bold', color: titleColor.value, fontSize: 11 },
    },
    series: [
      {
        name: 'Días Inactivo',
        type: 'bar',
        barMaxWidth: 22,
        data: dias.map(v => ({
          value: v,
          itemStyle: { color: v >= 2 ? '#ef4444' : '#f59e0b', borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: 'right', formatter: '{c} días', fontWeight: 'bold', color: titleColor.value },
      },
    ],
  })
}

const topInactivosOpt = computed(() => buildTopInactivosOption(topInactivosList.value, 15))
const topInactivosFullOpt = computed(() => buildTopInactivosOption(topInactivosList.value))

// ================= GRÁFICAS EXCLUSIVAS CONCRETOS =================

type EquipoDisp = { placa: string; dispPct: number; diasOp: number; tipo: string; loc: string }

const dispEquipoList = computed<EquipoDisp[]>(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const equiposMap = new Map<string, { placa: string; sumScore: number; count: number; tipo: string; loc: string }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue
    const info = getInspectionDetails(r)
    if (!info.placa) continue
    const existing = equiposMap.get(info.placa) ?? {
      placa: info.placa,
      sumScore: 0,
      count: 0,
      tipo: info.baseTipo + (info.esAlquilado ? ' [Alq]' : ''),
      loc: info.loc,
    }
    existing.sumScore += info.score
    existing.count++
    equiposMap.set(info.placa, existing)
  }

  const equipos: EquipoDisp[] = [...equiposMap.values()].map(e => ({
    placa: e.placa,
    dispPct: e.count > 0 ? Math.round((e.sumScore / e.count) * 100) : 0,
    diasOp: +e.sumScore.toFixed(1),
    tipo: e.tipo,
    loc: e.loc,
  }))

  equipos.sort((a, b) => b.dispPct - a.dispPct || b.diasOp - a.diasOp)
  return equipos
})

function buildDispEquipoOption(equipos: EquipoDisp[], limit?: number) {
  const list = limit ? equipos.slice(0, limit) : equipos
  return markRaw({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const p = params[0]
        const eq = p.data
        return `<strong>${p.name}</strong> ${eq?.tipo ? `(${eq.tipo})` : ''}<br/>Disponibilidad: <strong>${p.value}%</strong><br/>Días op.: <strong>${eq?.diasOp} días</strong>`
      },
    },
    grid: { left: '3%', right: '14%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { formatter: '{value}%', color: textColor.value, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map(e => e.placa),
      axisLabel: { color: titleColor.value, fontSize: 11, fontWeight: 'bold' },
    },
    series: [{
      name: 'Disponibilidad',
      type: 'bar',
      barMaxWidth: 22,
      data: list.map(e => ({
        value: e.dispPct,
        diasOp: e.diasOp,
        tipo: e.tipo,
        itemStyle: {
          color: e.dispPct >= 85 ? '#10b981' : e.dispPct >= 60 ? '#f59e0b' : '#ef4444',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      label: {
        show: true, position: 'right',
        formatter: (p: any) => `${p.value}% (${p.data.diasOp} d)`,
        fontSize: 10, fontWeight: 'bold', color: titleColor.value,
      },
    }],
  })
}

const dispEquipoOpt = computed(() => buildDispEquipoOption(dispEquipoList.value, 15))
const dispEquipoFullOpt = computed(() => buildDispEquipoOption(dispEquipoList.value))

type EquipoMant = { placa: string; mantPct: number; diasMant: number; tipo: string }

const incidenciaMantenimientoList = computed<EquipoMant[]>(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  const equiposMap = new Map<string, { placa: string; diasMant: number; count: number; tipo: string }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue
    const info = getInspectionDetails(r)
    if (!info.placa) continue
    const existing = equiposMap.get(info.placa) ?? {
      placa: info.placa,
      diasMant: 0,
      count: 0,
      tipo: info.baseTipo + (info.esAlquilado ? ' [Alq]' : ''),
    }
    if (info.isNoOp || info.esEnTaller) existing.diasMant++
    existing.count++
    equiposMap.set(info.placa, existing)
  }

  const equipos: EquipoMant[] = [...equiposMap.values()].map(e => ({
    placa: e.placa,
    mantPct: e.count > 0 ? Math.round((e.diasMant / e.count) * 100) : 0,
    diasMant: e.diasMant,
    tipo: e.tipo,
  }))

  equipos.sort((a, b) => b.mantPct - a.mantPct || b.diasMant - a.diasMant)
  return equipos
})

function buildIncidenciaOption(equipos: EquipoMant[], limit?: number) {
  const list = limit ? equipos.slice(0, limit) : equipos
  return markRaw({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const p = params[0]
        const eq = p.data
        return `<strong>${p.name}</strong> ${eq?.tipo ? `(${eq.tipo})` : ''}<br/>Incidencia mant.: <strong>${p.value}%</strong><br/>Días mant.: <strong>${eq?.diasMant} días</strong>`
      },
    },
    grid: { left: '3%', right: '14%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { formatter: '{value}%', color: textColor.value, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map(e => e.placa),
      axisLabel: { color: titleColor.value, fontSize: 11, fontWeight: 'bold' },
    },
    series: [{
      name: 'Incidencia Mantenimiento',
      type: 'bar',
      barMaxWidth: 22,
      data: list.map(e => ({
        value: e.mantPct,
        diasMant: e.diasMant,
        tipo: e.tipo,
        itemStyle: {
          color: e.mantPct >= 50 ? '#ef4444' : e.mantPct >= 25 ? '#f59e0b' : '#10b981',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      label: {
        show: true, position: 'right',
        formatter: (p: any) => `${p.value}% (${p.data.diasMant} d)`,
        fontSize: 10, fontWeight: 'bold', color: titleColor.value,
      },
    }],
  })
}

const incidenciaMantenimientoOpt = computed(() => buildIncidenciaOption(incidenciaMantenimientoList.value, 15))
const incidenciaMantenimientoFullOpt = computed(() => buildIncidenciaOption(incidenciaMantenimientoList.value))

/**
 * Disponibilidad por Planta y Distribución Diaria / Mensual.
 * Datos agrupados por fecha e indicador de planta de 'Reporte Placa Disponibilidad'.
 */
const dispMensualPlantaOpt = computed(() => {
  const records = activePlacasRows.value

  const dateLocMap = new Map<string, Map<string, { sum: number; count: number }>>()
  const dateMeta = new Map<string, { opTotal: number; mantTotal: number; total: number }>()
  const allLocs = new Set<string>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const dateKey = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!dateLocMap.has(dateKey)) {
      dateLocMap.set(dateKey, new Map())
      dateMeta.set(dateKey, { opTotal: 0, mantTotal: 0, total: 0 })
    }
    const info = getInspectionDetails(r)
    const val = info.score
    const loc = (info.loc || 'Sin Localización').toUpperCase()
    allLocs.add(loc)

    const locMap = dateLocMap.get(dateKey)!
    if (!locMap.has(loc)) locMap.set(loc, { sum: 0, count: 0 })
    const lm = locMap.get(loc)!
    lm.sum += val
    lm.count++

    const dm = dateMeta.get(dateKey)!
    if (info.isOperativo || info.isParcial) dm.opTotal += val
    if (info.isNoOp || info.esEnTaller) dm.mantTotal++
    dm.total++
  }

  const locArr = [...allLocs].sort()
  const dates = [...dateLocMap.keys()].sort()
  const colors = ['#3b82f6', '#e11d48', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ea580c', '#64748b']

  const series = locArr.map((loc, i) => ({
    name: loc,
    type: 'bar' as const,
    data: dates.map(d => {
      const lm = dateLocMap.get(d)?.get(loc)
      return lm && lm.count > 0 ? Math.round((lm.sum / lm.count) * 100) : 0
    }),
    itemStyle: { color: colors[i % colors.length], borderRadius: [3, 3, 0, 0] },
    label: { show: true, position: 'top' as const, fontSize: 9, fontWeight: 'bold' as const, color: textColor.value, formatter: '{c}%' },
  }))

  const promOp = dates.map(d => +(dateMeta.get(d)?.opTotal ?? 0).toFixed(1))
  const promMant = dates.map(d => +(dateMeta.get(d)?.mantTotal ?? 0).toFixed(1))

  return markRaw({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: [...locArr, 'Días Operativos', 'Días en Mantenimiento'],
      top: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: textColor.value, fontSize: 10, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: textColor.value } },
    },
    yAxis: [
      {
        type: 'value', name: '% Disp.', min: 0, max: 100,
        axisLabel: { formatter: '{value}%', color: textColor.value, fontSize: 10 },
        splitLine: { lineStyle: { color: splitLineColor.value } },
      },
      {
        type: 'value', name: 'Equipos', min: 0,
        axisLabel: { formatter: '{value}', color: textColor.value, fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      ...series,
      {
        name: 'Días Operativos', type: 'line', yAxisIndex: 1,
        data: promOp, smooth: true, symbolSize: 8,
        itemStyle: { color: '#6d28d9' }, lineStyle: { color: '#6d28d9', width: 2.5 },
        label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: '#6d28d9', formatter: '{c}' },
      },
      {
        name: 'Días en Mantenimiento', type: 'line', yAxisIndex: 1,
        data: promMant, smooth: true, symbolSize: 8,
        itemStyle: { color: '#ef4444' }, lineStyle: { color: '#ef4444', width: 2, type: 'dashed' },
        label: { show: true, position: 'bottom', fontSize: 10, fontWeight: 'bold', color: '#ef4444', formatter: '{c}' },
      },
    ],
  })
})

/**
 * Días Promedio de Operación vs. Mantenimiento por Tipo de Vehículo.
 * Datos calculados dinámicamente de 'Reporte Placa Disponibilidad'.
 */
const diasPromTipoOpt = computed(() => {
  const records = activePlacasRows.value
  const tiposMap = new Map<string, { tipo: string; sumRevAm: number; sumMant: number; placas: Set<string> }>()

  for (const r of records) {
    const info = getInspectionDetails(r)
    const tipo = info.baseTipo
    const placa = info.placa

    const existing = tiposMap.get(tipo) ?? { tipo, sumRevAm: 0, sumMant: 0, placas: new Set<string>() }
    existing.sumRevAm += info.score
    if (info.isNoOp || info.esEnTaller) existing.sumMant++
    if (placa) existing.placas.add(placa)
    tiposMap.set(tipo, existing)
  }

  const tiposArr = [...tiposMap.values()].map(t => {
    const numVehiculos = Math.max(t.placas.size, 1)
    return {
      tipo: t.tipo,
      diasOp: +(t.sumRevAm / numVehiculos).toFixed(1),
      diasMant: +(t.sumMant / numVehiculos).toFixed(1),
      vehiculos: numVehiculos,
    }
  })

  tiposArr.sort((a, b) => b.vehiculos - a.vehiculos)

  const tipos = tiposArr.map(t => `${t.tipo} (${t.vehiculos})`)
  const diasOp = tiposArr.map(t => t.diasOp)
  const diasMant = tiposArr.map(t => t.diasMant)

  return markRaw({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const tipo = params[0].name
        const op = params.find((p: any) => p.seriesName === 'Promedio Días Operativos')?.value ?? '—'
        const mant = params.find((p: any) => p.seriesName === 'Días Mantenimiento Promedio')?.value ?? '—'
        return `<strong>${tipo}</strong><br/>🟦 Op.: <strong>${op} días</strong><br/>🟥 Mant.: <strong>${mant} días</strong>`
      },
    },
    legend: {
      data: ['Días Mantenimiento Promedio', 'Promedio Días Operativos'],
      top: 0,
      textStyle: { color: textColor.value, fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: tipos,
      axisLabel: { color: textColor.value, fontSize: 10, fontWeight: 'bold', rotate: 15 },
      axisLine: { lineStyle: { color: textColor.value } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} d', color: textColor.value, fontSize: 10 },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    series: [
      {
        name: 'Días Mantenimiento Promedio', type: 'bar', barWidth: '30%',
        data: diasMant.map(v => ({
          value: v,
          itemStyle: { color: '#ef4444', borderRadius: [3, 3, 0, 0] },
        })),
        label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: textColor.value, formatter: '{c}' },
      },
      {
        name: 'Promedio Días Operativos', type: 'bar', barWidth: '30%',
        data: diasOp.map(v => ({
          value: v,
          itemStyle: { color: '#1a237e', borderRadius: [3, 3, 0, 0] },
        })),
        label: { show: true, position: 'top', fontSize: 10, fontWeight: 'bold', color: textColor.value, formatter: '{c}' },
      },
    ],
  })
})
</script>

<style scoped>
.disponibilidad-tab {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0;
}

/* Banners de estado de disponibilidad */
.disp-loading-banner,
.disp-error-banner,
.disp-empty-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.disp-loading-banner {
  background: var(--card-bg, #f0f4ff);
  border: 1px solid var(--card-border, #dbeafe);
  color: var(--navy, #172954);
}

.disp-error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.disp-empty-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.disp-retry-btn {
  margin-left: auto;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #b91c1c;
  background: transparent;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.disp-retry-btn:hover {
  background: #b91c1c;
  color: white;
}

@keyframes disp-spin {
  to { transform: rotate(360deg); }
}
.disp-spinner {
  animation: disp-spin 0.9s linear infinite;
  flex-shrink: 0;
}

.almacen-view-toggle {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.av-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-alt);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.av-btn:hover {
  border-color: var(--card-border-hover);
  color: var(--text-primary);
}

.av-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

/* Vista Detalle vacía */
.detalle-empty-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 10px);
  padding: 32px 16px;
  box-shadow: var(--shadow-sm);
}

/* ===== VISTA INFORME: estilos del resumen de disponibilidad ===== */

/* Banners de alerta (rezago / cobertura parcial) */
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md, 10px);
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid transparent;
}
.alert-banner.alert-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.alert-banner.alert-warn {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}
.alert-banner svg { flex-shrink: 0; margin-top: 1px; }

/* Tarjetas de datos (equipos en taller) */
.data-card {
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
}
.card-head {
  padding: 6px 10px;
  background: #f8fafc;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
}

/* ===== ots-bar / stats bar (estilo Maquinaria) ===== */
.ots-section { margin-top: 8px; }
.ots-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.ots-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ots-stats strong { color: var(--text-primary); font-weight: 700; }
.ots-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: .4;
}
.stat-op { color: #10b981; }
.stat-op strong { color: #10b981; }
.stat-noop { color: #ef4444; }
.stat-noop strong { color: #ef4444; }
.stat-warn { color: #f59e0b; }
.stat-warn strong { color: #f59e0b; }

.table-wrap {
  width: 100%;
  overflow-x: auto;
}
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.table-wrap th {
  background: #f8fafc;
  color: var(--navy, #172954);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 6px 10px;
  border-bottom: 1.5px solid var(--card-border, #e2e8f0);
  text-align: left;
}
.table-wrap td {
  padding: 5.5px 10px;
  border-bottom: 1px solid var(--card-border, #f1f5f9);
  vertical-align: middle;
}
.table-wrap tr:hover td { background: #f8fafc; }
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.idx-col, .idx { width: 24px; text-align: center; color: var(--text-secondary); }
.bold { font-weight: 700; }
.accent-text { color: var(--navy, #172954); }
.red { color: #dc2626; }
.green { color: #16a34a; }
.yellow { color: #b8860b; }

.table-total-row td {
  background: #f1f5f9 !important;
  font-weight: 700 !important;
  border-top: 2px solid var(--card-border, #cbd5e1) !important;
}

.empty-table {
  text-align: center;
  padding: 12px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

/* Alerts grid — section de estado operativo */
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.alert-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 10px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}
.alert-card:hover { transform: translateY(-2px); }
.alert-head { display: flex; align-items: center; gap: 7px; }
.alert-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.alert-value { font-size: 28px; font-weight: 800; color: var(--text-primary); line-height: 1.1; margin-top: 4px; }
.alert-sub { font-size: 12px; color: var(--text-secondary); }
.alert-detail { font-size: 12px; color: var(--text-secondary); margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--card-border); }

.sev-ok { border-top: 3px solid #10b981; }
.sev-warn { border-top: 3px solid #f59e0b; }
.sev-danger { border-top: 3px solid #ef4444; }
.sev-info { border-top: 3px solid #3b82f6; }

/* Section headers */
.section-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.title-bar {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: #2563eb;
  border-radius: 2px;
}
.section-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

/* Barra superior de control del informe */
.informe-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: var(--radius-md, 10px);
  padding: 12px 18px;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 12px;
}
.icb-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.icb-tag {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--navy, #172954);
}
.icb-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}
.icb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Botón de toolbar */
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--card-border, #d1d5db);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #1e293b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.tb-btn:hover {
  border-color: #93c5fd;
  background: #f0f7ff;
  color: #1d4ed8;
}
.tb-btn:active {
  transform: scale(0.97);
}
.tb-btn.primary {
  background: var(--navy, #172954);
  color: #fff;
  border-color: var(--navy, #172954);
}
.tb-btn.primary:hover {
  background: #1e3a8a;
  border-color: #1e3a8a;
}
.tb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.tb-btn svg {
  flex-shrink: 0;
}

/* Hoja / Papel de Reporte Oficial estructurado por páginas A4 */
.report-paper {
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  width: 100%;
}

.report-page {
  width: 100%;
  min-height: 297mm;
  padding: 12mm 14mm 14mm 14mm;
  background: #ffffff;
  color: #1a1a2e;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
}
.report-salto-superior {
  height: 8mm;
  flex-shrink: 0;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2.5px solid var(--navy, #172954);
  padding-bottom: 10px;
  position: relative;
  flex-wrap: wrap;
  gap: 12px;
}
.report-header::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2.5px;
  width: 74px;
  height: 2.5px;
  background: #a90707;
}
.report-header.mini {
  padding-bottom: 8px;
  margin-bottom: 2px;
  border-bottom: 1.5px solid var(--navy, #172954);
}
.report-header.mini::after {
  display: none;
}
.report-header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.report-logo {
  height: 38px;
  object-fit: contain;
}
.report-logo-mini {
  height: 24px;
  object-fit: contain;
}
.report-header-text h2 {
  font-size: 14px;
  font-weight: 700;
  color: var(--navy, #172954);
  margin: 0;
}
.report-header-text span {
  font-size: 12px;
  color: var(--text-secondary);
}
.report-header-meta {
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.report-header-meta strong {
  color: var(--text-primary);
}
.page-counter {
  font-weight: 700;
  color: var(--navy, #172954);
}

.report-title-section {
  text-align: center;
  margin: 2px 0 6px;
}
.report-title-section h1 {
  font-size: 16px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.report-intro {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.45;
}

.compact-kpi {
  margin: 2px 0 6px !important;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.report-nota {
  border-left: 3px solid var(--navy, #172954);
  background: var(--card-bg-hover, #f8fafc);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-primary);
  border-radius: 0 6px 6px 0;
  line-height: 1.4;
}
.report-nota.alerta {
  border-left-color: #a90707;
  background: #fdf1f1;
  color: #7f1d1d;
}

.report-section-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.report-block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--navy, #172954);
  margin: 0;
}

.report-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--card-border, #e2e8f0);
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
}

.table-total-row {
  background: var(--card-bg-hover, #f1f5f9) !important;
  border-top: 2px solid var(--card-border) !important;
}

/* Flota Alquilada */
.alq-card {
  padding: 8px 14px;
}
.alq-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.alq-cifra {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.alq-cifra span {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 2px;
}
.alq-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.alq-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg, #f8fafc);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  font-size: 12px;
}
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.chip-tipo {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Gráficos vectoriales SVG nítidos */
.marco {
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 3px;
  padding: 6px 8px;
  background: #fdfdfe;
}
.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}
.fila-charts {
  display: flex;
  gap: 12px;
  align-items: center;
}
.fila-charts > * {
  min-width: 0;
}
.chart-box {
  background: #fdfdfe;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 3px;
  padding: 6px 8px;
}

text.ax {
  font-size: 6.6px;
  fill: #5b6b82;
  font-family: inherit;
}
text.ax.mini {
  font-size: 5.8px;
  fill: #8d99a9;
}
text.lbl {
  font-size: 8px;
  font-weight: 700;
  font-family: inherit;
  fill: #172954;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 2px;
  stroke-linejoin: round;
}
text.cat {
  font-size: 7px;
  font-weight: 600;
  fill: #1a2230;
  font-family: inherit;
}
text.inbar {
  font-size: 7px;
  font-weight: 700;
  fill: #fff;
  font-family: inherit;
}
text.dona {
  font-size: 26px;
  font-weight: 700;
  font-family: inherit;
}

.leyenda {
  display: flex;
  gap: 10px;
  font-size: 7.2pt;
  color: #5b6b82;
  margin-top: 4px;
  flex-wrap: wrap;
}
.leyenda span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.leyenda i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

/* Ocultar botones de acciones en el reporte oficial */
.report-paper :deep(.chart-actions) {
  display: none !important;
}

/* Estilos de Impresión / Guardar PDF */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    background: #ffffff !important;
    color: #1a1a2e !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .almacen-view-toggle,
  .informe-control-bar,
  .sidebar,
  .navbar,
  .nav-header,
  .mobile-header,
  .chart-actions {
    display: none !important;
  }
  .report-paper {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
    width: 100% !important;
  }
  .report-page {
    width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    padding: 12mm 14mm 14mm 14mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    page-break-after: always !important;
    break-after: page !important;
    overflow: hidden !important;
  }
}

/* ===== Estilos Zoho: Análisis Operativo y Gráfica QuickChart ===== */
.zoho-analysis-box {
  background-color: var(--card-bg-hover, #f8fafc);
  padding: 14px 18px;
  border-radius: 6px;
  border-left: 3px solid var(--navy, #172954);
}
.zoho-analysis-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.zoho-analysis-text {
  font-size: 12px;
  color: var(--text-primary, #475569);
  line-height: 1.6;
}
.zoho-block-title {
  font-size: 13px;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.zoho-title-bar {
  background: #2563eb;
}
.zoho-chart-frame {
  border: 1px solid var(--card-border, #f1f5f9);
  border-radius: 10px;
  padding: 14px;
  background-color: #ffffff;
}
.zoho-chart-img {
  width: 100%;
  max-width: 840px;
  display: block;
  margin: 0 auto;
}

/* ===== Estilos: Tareas Abiertas, Supervisor, Resumen, Calidad ===== */
.resumen-ejecutivo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.resumen-ej-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-top: 3px solid var(--navy, #172954);
  border-radius: 6px;
  padding: 12px 8px;
  text-align: center;
}
.resumen-ej-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.resumen-ej-value {
  font-size: 22px;
  font-weight: 900;
  color: var(--text-primary, #1e293b);
  margin-top: 4px;
}

/* ===== Estilos plantilla: pills, avisos, res, alerta ===== */
.pill {
  display: inline-block;
  padding: 1.5px 7px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.p-ambar { background: #fbf3e0; color: #b8860b; }
.p-gris { background: #eef1f4; color: #5b6b82; }

.aviso {
  display: flex;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1.45;
  border: 1px solid var(--card-border, #e2e8f0);
}
.aviso.alto { background: #fdf1f1; border-color: #f0d3d3; }
.aviso.medio { background: #fbf6e9; border-color: #eee0be; }
.aviso b { display: block; margin-bottom: 1px; }
.aviso .ico { font-weight: 700; color: #a90707; }
.aviso.medio .ico { color: #b8860b; }

ul.res {
  margin: 6px 0 0;
  padding-left: 0;
  list-style: none;
}
ul.res li {
  position: relative;
  padding: 5px 0 5px 15px;
  font-size: 12px;
  line-height: 1.5;
  border-bottom: 1px solid #f0f2f5;
}
ul.res li::before {
  content: "■";
  position: absolute;
  left: 0;
  top: 4px;
  color: var(--navy, #172954);
  font-size: 7pt;
}

.table-wrap tr.alerta td {
  background: #fdf1f1;
}
.table-wrap tr.alerta td:first-child {
  box-shadow: inset 3px 0 0 #a90707;
}

/* ===== Cumplimiento: grid dos columnas (estilo API) ===== */
.comp-grid {
  display: flex;
  gap: 12px;
}
.comp-col {
  flex: 1;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-top: 3px solid var(--navy, #172954);
  border-radius: 8px;
  padding: 14px;
}
.comp-col-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--navy, #172954);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
  padding-bottom: 6px;
}
.comp-inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.comp-chart-cell {
  flex: 0 0 140px;
  text-align: center;
}
.chart-box-donut {
  width: 140px;
  height: 140px;
  margin: 0 auto;
}
.comp-sup-cell {
  flex: 1;
  min-width: 0;
}
.comp-sup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.comp-sup-table th {
  background: var(--navy, #172954);
  color: white;
  padding: 5px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
}
.comp-sup-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
}
.comp-sup-table tr:nth-child(even) td {
  background: #f8faff;
}
.pct-high { color: #16a34a; font-weight: 700; }
.pct-mid  { color: #b8860b; font-weight: 700; }
.pct-low  { color: #a90707; font-weight: 700; }
</style>
