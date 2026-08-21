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
      <!-- Tarjetas KPI con el diseño y tamaño estándar de 4 columnas (2 filas) -->
      <div class="kpi-row">
        <KpiCard
          label="Flota Propia"
          accent="#15223c"
          icon="package"
          :value="String(kpis.flotaPropia)"
        />

        <KpiCard
          v-if="tieneAlquilados || isConcretosPlanta"
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
          v-if="tieneAlquilados || isConcretosPlanta"
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
      <!-- CONCRETOS: Gráficas de Disponibilidad                     -->
      <!-- ======================================================= -->
      <template v-if="isConcretosPlanta">

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
            description="Evolución mensual por planta (Acacias, Restrepo, Villavicencio) con línea de promedio de mantenimiento"
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
      </template>

      <!-- ======================================================= -->
      <!-- AGREGADOS: Gráficas originales de disponibilidad         -->
      <!-- ======================================================= -->
      <template v-else>
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
    </template>

    <!-- ========================================== -->
    <!-- VISTA 2: DETALLES (VACÍO POR AHORA)        -->
    <!-- ========================================== -->
    <template v-else-if="dispView === 'detalles'">
      <div class="detalle-empty-wrapper">
        <EmptyState
          title="Detalle de Disponibilidad"
          description="Esta sección de detalle se encuentra en preparación."
        />
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
        <div class="icb-actions">
          <button class="tb-btn primary" @click="imprimirReporte" title="Imprimir o guardar en PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <!-- PORTADA: Encabezado institucional -->
      <div class="report-paper">
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
          </div>
        </header>

        <div class="report-title-section">
          <h1>Reporte de Disponibilidad de Equipos</h1>
          <p class="report-intro">
            Operatividad de la flota de <strong>{{ plantaLabel }}</strong> al corte del <strong>{{ informeFechaLabel }}</strong>:
            disponibilidad por tipo de equipo, seguimiento de maquinaria operativa, equipos en intervención de taller y control de calidad del dato capturado.
          </p>
        </div>

        <!-- 8 Tarjetas KPI Oficiales -->
        <div class="kpi-row" style="margin: 12px 0 16px;">
          <KpiCard label="Flota Propia" accent="#172954" icon="package" :value="String(informeKpis.flotaPropia)" />
          <KpiCard v-if="tieneAlquilados || isConcretosPlanta" label="Alquilados" accent="#2a3f6b" icon="truck" :value="String(informeKpis.alquilados)" />
          <KpiCard label="Operativos" accent="#1f7a3d" icon="check-circle" :value="informeKpis.operativosFormatted" />
          <KpiCard label="No Operativos" accent="#a90707" icon="activity" :value="String(informeKpis.noOperativos)" />
          <KpiCard
            label="Disponibilidad Propia"
            :accent="informeKpis.dispPropiaPct >= 85 ? '#1f7a3d' : informeKpis.dispPropiaPct >= 60 ? '#b8860b' : '#a90707'"
            meta="Meta: 85%"
            icon="target"
            :value="informeKpis.dispPropiaPct + '%'"
          />
          <KpiCard
            v-if="tieneAlquilados || isConcretosPlanta"
            label="Disponible en Cancha"
            :accent="informeKpis.dispCanchaPct >= 85 ? '#1f7a3d' : informeKpis.dispCanchaPct >= 60 ? '#b8860b' : '#a90707'"
            icon="trending-up"
            :value="informeKpis.dispCanchaPct + '%'"
          />
          <KpiCard label="Cobertura" accent="#1f7a3d" icon="zap" :value="informeKpis.coberturaPct + '%'" />
          <KpiCard label="Días de Rezago" accent="#172954" icon="clock" :value="String(informeKpis.diasRezago)" />
        </div>

        <!-- Nota de Contexto / Alertas -->
        <div v-if="informeKpis.diasRezago > 2" class="report-nota alerta">
          <strong>Advertencia de Rezago ({{ informeKpis.diasRezago }} días):</strong>
          La última inspección cargada para este corte tiene más de 2 días de rezago frente a la fecha actual.
        </div>
        <div v-else-if="informeKpis.coberturaPct < 90" class="report-nota">
          <strong>Nota de Cobertura:</strong> La disponibilidad se calcula sobre los {{ informeKpis.inspeccionados }} equipos efectivamente inspeccionados ({{ informeKpis.coberturaPct }}% del total).
        </div>

        <!-- Gráfica de Tendencia AM (14 días con meta 85%) -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Tendencia de Disponibilidad — Ronda AM, Día a Día</h3>
          <div class="charts-grid cols-1">
            <ChartCard
              title="Evolución Histórica Ronda AM"
              description="Comparativa diaria de la ronda de la mañana frente a la meta institucional (85%)"
              :option="amVsPmTrendOpt"
              :height="280"
            />
          </div>
        </div>

        <!-- Bloque Fila: Tipo de Equipo + Comparativo AM vs PM + Dona Global -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Operatividad por Tipo de Equipo y Comparativo AM vs PM</h3>
          <div class="charts-grid cols-2">
            <ChartCard
              title="Disponibilidad por Categoría de Equipo"
              description="Desglose por tipo de vehículo en el corte seleccionado"
              :option="tipoEquipoOpt"
              :height="300"
            />
            <ChartCard
              title="Comparativo Ronda AM vs Ronda PM"
              description="% global operativo en la ronda de la mañana (AM) vs la ronda de la tarde (PM) para el corte seleccionado"
              :option="amVsPmDiaOpt"
              :height="300"
            />
          </div>
          <div class="charts-grid cols-1" style="margin-top: 12px;">
            <ChartCard
              title="Operatividad Global — Distribución de Flota"
              description="Distribución porcentual de operatividad sobre la flota total del módulo"
              :option="donaOpt"
              :height="260"
            />
          </div>
        </div>

        <!-- Flota Alquilada (Solo si aplica) -->
        <div v-if="(tieneAlquilados || isConcretosPlanta) && informeFlotaAlquilada.total > 0" class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Flota Alquilada — Detalle por Placa</h3>
          <div class="data-card alq-card">
            <div class="alq-summary">
              <div class="alq-cifra" :style="{ color: informeFlotaAlquilada.dispPct >= 85 ? '#1f7a3d' : informeFlotaAlquilada.dispPct >= 60 ? '#b8860b' : '#a90707' }">
                {{ informeFlotaAlquilada.dispPct }}%
                <span>{{ informeFlotaAlquilada.op }} de {{ informeFlotaAlquilada.total }} operativos</span>
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
                    <th class="r" v-if="tieneAlquilados || isConcretosPlanta">De ellos Alq.</th>
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
                    <td class="r" v-if="tieneAlquilados || isConcretosPlanta" style="color: #06b6d4">{{ cat.opAlq || '—' }}</td>
                    <td class="r yellow">{{ cat.parcial || '—' }}</td>
                    <td class="r" :class="cat.noOp > 0 ? 'red' : ''">{{ cat.noOp }}</td>
                    <td class="r bold">{{ cat.total }}</td>
                    <td class="r bold" :class="cat.disp >= 85 ? 'green' : cat.disp >= 60 ? 'yellow' : 'red'">{{ cat.disp }}%</td>
                  </tr>
                  <tr class="table-total-row">
                    <td class="bold">TOTAL FLOTA</td>
                    <td class="r bold green">{{ matrizCategoriaData.totales.opProp }}</td>
                    <td class="r bold" v-if="tieneAlquilados || isConcretosPlanta" style="color: #06b6d4">{{ matrizCategoriaData.totales.opAlq }}</td>
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

        <!-- Movimientos de Taller (Comparativo con corte anterior) -->
        <div v-if="movimientosTaller.hasPrev" class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Movimientos de Taller — {{ movimientosTaller.prevLabel }} → {{ informeFechaLabel }}</h3>
          <div class="charts-grid cols-2">
            <div class="data-card">
              <div class="card-head" style="color: #ef4444;">
                ↓ Ingresaron a Taller ({{ movimientosTaller.ingresaron.length }})
              </div>
              <div v-if="movimientosTaller.ingresaron.length === 0" class="empty-table" style="padding: 16px;">
                Sin nuevos ingresos a taller
              </div>
              <div v-else class="table-wrap">
                <table>
                  <thead><tr><th>Equipo</th><th>Tipo</th><th>Actividad / Necesidad</th><th>Proveedor</th><th>Supervisor</th><th class="r">Días P/</th></tr></thead>
                  <tbody>
                    <tr v-for="eq in movimientosTaller.ingresaron" :key="eq.placa">
                      <td class="bold accent-text">{{ eq.placa }}</td>
                      <td>{{ eq.tipo }}</td>
                      <td>{{ eq.actividad || '—' }}</td>
                      <td>{{ eq.proveedor || '—' }}</td>
                      <td>{{ eq.supervisor }}</td>
                      <td class="r bold" :class="eq.diasPendientes > 5 ? 'red' : eq.diasPendientes > 2 ? 'yellow' : ''">{{ eq.diasPendientes > 0 ? eq.diasPendientes + ' d' : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="data-card">
              <div class="card-head" style="color: #10b981;">
                ↑ Salieron de Taller ({{ movimientosTaller.salieron.length }})
              </div>
              <div v-if="movimientosTaller.salieron.length === 0" class="empty-table" style="padding: 16px;">
                Sin salidas de taller registradas
              </div>
              <div v-else class="table-wrap">
                <table>
                  <thead><tr><th>Equipo</th><th>Tipo</th><th>Actividad / Necesidad</th><th>Proveedor</th><th>Supervisor</th><th class="r">Días P/</th></tr></thead>
                  <tbody>
                    <tr v-for="eq in movimientosTaller.salieron" :key="eq.placa">
                      <td class="bold accent-text">{{ eq.placa }}</td>
                      <td>{{ eq.tipo }}</td>
                      <td>{{ eq.actividad || '—' }}</td>
                      <td>{{ eq.proveedor || '—' }}</td>
                      <td>{{ eq.supervisor }}</td>
                      <td class="r bold">{{ eq.diasPendientes > 0 ? eq.diasPendientes + ' d' : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Disponibilidad por Planta / Frente -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>{{ isConcretosPlanta ? 'Disponibilidad por Sede / Planta' : 'Disponibilidad por Frente de Trabajo / Maquinaria' }}</h3>
          <div class="charts-grid cols-1">
            <ChartCard
              :title="isConcretosPlanta ? 'Disponibilidad por Sede' : 'Disponibilidad por Frente'"
              :description="isConcretosPlanta ? 'Porcentaje operativo por sede de planta concretera (Villavicencio, Acacias, Restrepo, Logística)' : 'Porcentaje operativo por frente de extracción o beneficio de maquinaria'"
              :option="plantaOpt"
              :height="260"
            />
          </div>
        </div>

        <!-- Equipos en Intervención / Fuera de Servicio -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Equipos Fuera de Servicio / En Taller</h3>
          <div class="data-card">
            <div v-if="informeEquiposEnTaller.length === 0" class="empty-table">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Todos los equipos se encuentran operativos en este corte
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
                    <th>Actividad / Diagnóstico</th>
                    <th class="r">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(eq, i) in informeEquiposEnTaller" :key="eq.placa">
                    <td class="idx">{{ i + 1 }}</td>
                    <td class="bold accent-text">{{ eq.placa }}</td>
                    <td>{{ eq.tipo }}</td>
                    <td>{{ eq.loc }}</td>
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
          <h3 class="report-block-title"><span class="title-bar"></span>Equipos Operativos en Cancha</h3>
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

      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, watch, onMounted } from 'vue'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { useTheme } from '../../composables/useTheme'
import { useDisponibilidadStore } from '../../stores'

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

// Fechas y formateo
function parseSerialDate(val: unknown): Date | null {
  if (!val) return null
  const num = Number(val)
  if (!isNaN(num) && num > 30000) {
    const utcDays = Math.floor(num - 25569)
    return new Date(utcDays * 86400 * 1000)
  }
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? null : d
}

function getDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Filas activas: todas las inspecciones de disponibilidad cargadas en el store o props
const activePlacasRows = computed(() => {
  if (dispStore.data?.placas && dispStore.data.placas.length > 0) {
    return dispStore.data.placas
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

// Fecha de corte efectiva: si el filtro principal tiene fecha, toma la inspección más cercana (<= fecha); de lo contrario la última disponible
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

  // Por defecto toma la última inspección registrada en la base de datos
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
    let color = '#a90707'
    if (info.isOperativo) {
      estado = 'Operativo (1.0)'
      color = '#1f7a3d'
      opCount += 1
    } else if (info.isParcial) {
      estado = 'Parcial (0.5)'
      color = '#b8860b'
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

  // Mapa fecha ISO → días transcurridos en taller (para calcular diasPendientes)
  // Para cada placa en taller hoy, rastreamos desde cuándo viene en taller
  const placaFirstTallerDate = new Map<string, Date>()
  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const info = getInspectionDetails(r)
    if (!info.placa || !info.isNoOp) continue
    const existing = placaFirstTallerDate.get(info.placa)
    if (!existing || d < existing) placaFirstTallerDate.set(info.placa, d)
  }

  type TallerEntry = { placa: string; tipo: string; loc: string; supervisor: string; actividad: string; proveedor: string; diasPendientes: number }
  const currTallerMap = new Map<string, TallerEntry>()
  const prevTallerMap = new Map<string, TallerEntry>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const iso = getDateKey(d)
    const info = getInspectionDetails(r)
    if (!info.placa) continue

    if (info.isNoOp) {
      const act = String(r['Actividades en taller'] ?? r['Actividades_en_taller'] ?? '').trim()
      const prov = String(r['Proveedor_Texto'] ?? r['Proveedor'] ?? '').trim()
      const firstDate = placaFirstTallerDate.get(info.placa)
      const corteDate = dates.find(d2 => getDateKey(d2) === targetIso) ?? d
      const diasPendientes = firstDate ? Math.round((corteDate.getTime() - firstDate.getTime()) / 86400000) : 0
      const data: TallerEntry = {
        placa: info.placa,
        tipo: info.baseTipo,
        loc: info.loc,
        supervisor: info.supervisor,
        actividad: act,
        proveedor: prov,
        diasPendientes,
      }
      if (iso === targetIso) currTallerMap.set(info.placa, data)
      if (iso === prevIso) prevTallerMap.set(info.placa, data)
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

function imprimirReporte() {
  window.print()
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

// 3b. Comparativo AM vs PM del día de corte por tipo de equipo (barras agrupadas)
// 3b. Comparativo AM vs PM global del día de corte (dos barras simples)
const amVsPmDiaOpt = computed(() => {
  const records = activePlacasRows.value
  const targetIso = effectiveCorteIso.value
  let amSum = 0, pmSum = 0, amCount = 0, pmCount = 0

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    if (targetIso && getDateKey(d) !== targetIso) continue
    const info = getInspectionDetails(r)
    if (!isNaN(info.revAm)) { amSum += info.revAm; amCount++ }
    if (!isNaN(info.revPm)) { pmSum += info.revPm; pmCount++ }
  }

  const pctAM = amCount > 0 ? Math.round((amSum / amCount) * 100) : 0
  const pctPM = pmCount > 0 ? Math.round((pmSum / pmCount) * 100) : 0
  const brecha = pctPM - pctAM
  const brechaColor = brecha >= 0 ? '#10b981' : '#ef4444'

  return markRaw({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: () => {
        return `Ronda AM: <strong>${pctAM}%</strong><br/>Ronda PM: <strong>${pctPM}%</strong><br/><span style="color:${brechaColor}">Brecha: ${brecha >= 0 ? '+' : ''}${brecha} pp</span>`
      },
    },
    grid: { left: '6%', right: '12%', bottom: '8%', top: '12%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: textColor.value },
      splitLine: { lineStyle: { color: splitLineColor.value } },
    },
    yAxis: {
      type: 'category',
      data: ['Ronda PM', 'Ronda AM'],
      axisLabel: { fontWeight: 'bold', color: titleColor.value, fontSize: 13 },
    },
    series: [
      {
        name: 'Ronda',
        type: 'bar',
        barWidth: 40,
        data: [
          {
            value: pctPM,
            itemStyle: {
              color: pctPM >= 85 ? '#f59e0b' : pctPM >= 60 ? '#fbbf24' : '#ef4444',
              borderRadius: [0, 6, 6, 0],
            },
          },
          {
            value: pctAM,
            itemStyle: {
              color: pctAM >= 85 ? '#3b82f6' : pctAM >= 60 ? '#60a5fa' : '#ef4444',
              borderRadius: [0, 6, 6, 0],
            },
          },
        ],
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => `${p.value}%`,
          fontWeight: 'bold',
          fontSize: 14,
          color: titleColor.value,
        },
        markLine: {
          silent: true,
          data: [{ xAxis: 85, name: 'Meta 85%' }],
          lineStyle: { color: '#10b981', type: 'dashed', width: 2 },
          label: { formatter: 'Meta 85%', color: '#10b981', fontWeight: 'bold', position: 'end' },
        },
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

  const datesMap = new Map<string, {
    dateKey: string
    acaciasSum: number; acaciasCount: number
    restrepoSum: number; restrepoCount: number
    villaSum: number; villaCount: number
    opTotal: number; mantTotal: number; total: number
  }>()

  for (const r of records) {
    const d = parseSerialDate(r['Fecha'] ?? r['FECHA'])
    if (!d) continue
    const dateKey = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!datesMap.has(dateKey)) {
      datesMap.set(dateKey, {
        dateKey,
        acaciasSum: 0, acaciasCount: 0,
        restrepoSum: 0, restrepoCount: 0,
        villaSum: 0, villaCount: 0,
        opTotal: 0, mantTotal: 0, total: 0,
      })
    }
    const dm = datesMap.get(dateKey)!
    const info = getInspectionDetails(r)
    const val = info.score
    const loc = info.loc.toUpperCase()

    if (loc.includes('ACACIA')) {
      dm.acaciasSum += val
      dm.acaciasCount++
    } else if (loc.includes('RESTREPO')) {
      dm.restrepoSum += val
      dm.restrepoCount++
    } else {
      dm.villaSum += val
      dm.villaCount++
    }

    if (info.isOperativo || info.isParcial) dm.opTotal += val
    if (info.isNoOp || info.esEnTaller) dm.mantTotal++
    dm.total++
  }

  const entries = [...datesMap.values()]
  const dates = entries.map(e => e.dateKey)
  const acacias = entries.map(e => e.acaciasCount > 0 ? Math.round((e.acaciasSum / e.acaciasCount) * 100) : 0)
  const restrepo = entries.map(e => e.restrepoCount > 0 ? Math.round((e.restrepoSum / e.restrepoCount) * 100) : 0)
  const villa = entries.map(e => e.villaCount > 0 ? Math.round((e.villaSum / e.villaCount) * 100) : 0)
  const promOp = entries.map(e => +e.opTotal.toFixed(1))
  const promMant = entries.map(e => +e.mantTotal.toFixed(1))

  return markRaw({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Acacías', 'Restrepo', 'Villavicencio', 'Días Operativos', 'Días en Mantenimiento'],
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
      {
        name: 'Acacías', type: 'bar',
        data: acacias,
        itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 9, fontWeight: 'bold', color: textColor.value, formatter: '{c}%' },
      },
      {
        name: 'Restrepo', type: 'bar',
        data: restrepo,
        itemStyle: { color: '#e11d48', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 9, fontWeight: 'bold', color: textColor.value, formatter: '{c}%' },
      },
      {
        name: 'Villavicencio', type: 'bar',
        data: villa,
        itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] },
        label: { show: true, position: 'top', fontSize: 9, fontWeight: 'bold', color: textColor.value, formatter: '{c}%' },
      },
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

.almacen-view-toggle {
  display: flex;
  gap: 8px;
}

.av-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.av-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent, #3b82f6);
}

.av-btn.active {
  color: #ffffff;
  background: var(--navy, #172954);
  border-color: var(--navy, #172954);
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
  font-size: 13.5px;
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
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.card-head {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  background: var(--card-bg-hover, #f9fafb);
  border-bottom: 1px solid var(--card-border);
}
.table-wrap { overflow-x: auto; }
.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table-wrap thead tr { background: var(--card-bg-hover, #f9fafb); }
.table-wrap th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap;
}
.table-wrap th.r, .table-wrap td.r { text-align: right; }
.table-wrap td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--card-border);
  color: var(--text-primary);
  vertical-align: middle;
}
.table-wrap tbody tr:last-child td { border-bottom: none; }
.table-wrap tbody tr:hover { background: var(--card-bg-hover, #f9fafb); }
.table-wrap .idx { color: var(--text-secondary); font-size: 11px; width: 28px; }
.table-wrap .bold { font-weight: 700; }
.table-wrap .accent-text { color: var(--navy, #172954); }
.table-wrap .red { color: #ef4444; font-weight: 700; }
.table-wrap .yellow { color: #f59e0b; font-weight: 600; }
.table-wrap .green { color: #10b981; font-weight: 700; }

/* Empty table state */
.empty-table {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  color: var(--text-secondary);
  font-size: 13.5px;
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
.alert-detail { font-size: 11.5px; color: var(--text-secondary); margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--card-border); }

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
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.title-bar {
  display: inline-block;
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: var(--navy, #172954);
  flex-shrink: 0;
}
.section-sub {
  font-size: 12.5px;
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
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--navy, #172954);
}
.icb-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.icb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Hoja / Papel de Reporte Oficial */
.report-paper {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  padding: 24px 28px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2.5px solid var(--navy, #172954);
  padding-bottom: 12px;
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
.report-header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.report-logo {
  height: 42px;
  object-fit: contain;
}
.report-header-text h2 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.report-header-text span {
  font-size: 11.5px;
  color: var(--text-secondary);
}
.report-header-meta {
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.45;
}
.report-header-meta strong {
  color: var(--text-primary);
}

.report-title-section {
  text-align: center;
  margin: 4px 0;
}
.report-title-section h1 {
  font-size: 18px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  margin: 0 0 6px;
}
.report-intro {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.5;
}

.report-nota {
  border-left: 3px solid var(--navy, #172954);
  background: var(--card-bg-hover, #f8fafc);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 0 6px 6px 0;
  line-height: 1.45;
}
.report-nota.alerta {
  border-left-color: #a90707;
  background: #fdf1f1;
  color: #7f1d1d;
}

.report-section-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.report-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--navy, #172954);
  margin: 0;
}

.table-total-row {
  background: var(--card-bg-hover, #f1f5f9) !important;
  border-top: 2px solid var(--card-border) !important;
}

/* Flota Alquilada */
.alq-card {
  padding: 16px 20px;
}
.alq-summary {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}
.alq-cifra {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.alq-cifra span {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 4px;
}
.alq-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}
.alq-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  background: var(--bg, #f8fafc);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  font-size: 12.5px;
}
.chip-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.chip-tipo {
  font-size: 11px;
  color: var(--text-secondary);
}

/* Estilos de Impresión / Guardar PDF */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .almacen-view-toggle,
  .informe-control-bar,
  .sidebar,
  .navbar,
  .nav-header {
    display: none !important;
  }
  .report-paper {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .report-section-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}

</style>
