<template>
  <div class="page-layout">
    <div v-if="loading && !mant.cunciaData && !mant.acaciasData && !mant.concretosData" class="loading-state">Cargando datos de mantenimiento...</div>
    <div v-else-if="error && !mant.cunciaData && !mant.acaciasData && !mant.concretosData" class="error-state">{{ error }}</div>
    <div v-else>
      <div class="sticky-top">
        <header class="page-header">
          <h2 class="page-title">{{ isConcretos ? 'Concretos' : 'Agregados' }} Mantenimiento {{ isConcretos ? (props.localizacion || '') : plantaLabel }}</h2>
          <div class="header-actions">
            <div class="filter-group">
              <FilterBar :data="allData" date-field="FECHA" :showProvider="false" @dateRangeFilter="onDateRangeFilter" @clear="onClearFilters" />
              <template v-if="subTab === 'almacen'">
                <MultiSelect v-model="selectedTipoCompra" :options="tipoCompraDisponibles" label="Tipo Compra" icon="filter" />
                <MultiSelect v-model="selectedCentroCosto" :options="centroCostoDisponibles" label="Centro Costo" icon="filter" />
                <MultiSelect v-model="selectedProceso" :options="procesoDisponibles" label="Proceso" icon="filter" />
              </template>
              <template v-else>
                <MultiSelect v-model="selectedLineas" :options="lineasDisponibles" label="Línea" icon="filter" />
                <MultiSelect v-model="selectedVehiculos" :options="vehiculosDisponibles" label="Vehículos" icon="filter" />
                <MultiSelect v-model="selectedProveedores" :options="proveedoresDisponibles" label="Proveedor" icon="user" />
                <MultiSelect v-model="selectedEstados" :options="estadosDisponibles" label="Estado" icon="filter" />
                <MultiSelect v-model="selectedPersonalInterno" :options="personalInternoOptions" label="Personal" icon="user" />
              </template>
            </div>
            <button class="action-btn" @click="loadData(true)" :disabled="loading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {{ loading ? 'Cargando...' : 'Actualizar' }}
            </button>
            <button v-if="hasActiveFilters" class="action-btn clear" @click="onClearFilters">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Limpiar
            </button>
          </div>
        </header>
      </div>
      <nav class="tab-bar">
        <button v-for="t in tipoTabs" :key="t.id" class="tab-btn" :class="{ active: tipoTab === t.id }" @click="tipoTab = t.id">{{ t.label }} ({{ t.count }})</button>
      </nav>

      <!-- Disponibilidad: vista propia al nivel de Planta/Maquinaria -->
      <template v-if="tipoTab === 'disponibilidad'">
        <DisponibilidadTab
          :data="dataFilteredMain"
          :planta="planta"
          :fecha-inicio="fechaInicio"
          :fecha-fin="fechaFin"
        />
      </template>

      <template v-else>
      <nav class="sub-tab-bar">
        <button class="sub-tab-btn" :class="{ active: subTab === 'dashboard' }" @click="subTab = 'dashboard'">Órdenes de Trabajo</button>
        <button class="sub-tab-btn" :class="{ active: subTab === 'almacen' }" @click="subTab = 'almacen'">Almacén</button>
      </nav>

      <template v-if="subTab === 'dashboard'">
      <div class="almacen-view-toggle">
        <button class="av-btn" :class="{ active: dashboardView === 'resumen' }" @click="dashboardView = 'resumen'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Gráficas
        </button>
        <button class="av-btn" :class="{ active: dashboardView === 'ordenes' }" @click="dashboardView = 'ordenes'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Órdenes de Trabajo
        </button>
        <button class="av-btn" :class="{ active: dashboardView === 'informe' }" @click="dashboardView = 'informe'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Informe
        </button>
      </div>

      <template v-if="dashboardView === 'resumen'">
      <div class="kpi-row">
        <KpiCard :value="$$(totalGeneral)" label="Costo Total General" accent="#15223c" icon="dollar" />
        <KpiCard :value="$$(servicios)" label="Costos Servicios" accent="#3B82F6" icon="settings" />
        <KpiCard :value="$$(insumos)" label="Costos Insumos" accent="#EF4444" icon="package" />
        <KpiCard :value="fmt(totalProd) + ' m³'" label="Total Producción" accent="#10B981" icon="trending-up" />
        <KpiCard :value="$$(costoM3)" label="Costo por m³" :accent="costoM3 > 3000 ? '#EF4444' : '#10B981'" :meta="'Meta: $3.000/m³'" icon="target" />
        <KpiCard :value="String(totalOrdenes)" label="Total Órdenes" accent="#8B5CF6" icon="list" />
        <KpiCard :value="String(estadoCounts.abiertas)" label="Abiertas" accent="#EF4444" icon="activity" />
        <KpiCard :value="String(estadoCounts.cerradas)" label="Cerradas" accent="#10B981" icon="check-circle" />
        <KpiCard :value="otPctCierre + '%'" label="% Cierre" accent="#3B82F6" icon="zap" />
        <KpiCard :value="otDuracionEstimadaProm + ' h'" label="Duración Estimada Promedio" accent="#8B5CF6" icon="clock" />
        <KpiCard :value="otTiempoRealProm + ' h'" label="Tiempo Real Recepción → Cierre" accent="#06B6D4" icon="target" />
        <KpiCard :value="otConSopledPct + '%'" label="OT con Solicitud (SOPLED/Interno)" accent="#10B981" icon="package" />
      </div>

      <div class="ots-bar">
        <div class="ots-stats">
          <span><strong>{{ totalSubs }}</strong> sub-órdenes</span>
          <span class="ots-dot"></span>
          <span><strong>{{ totalSopled }}</strong> SOPLED</span>
          <span class="ots-dot"></span>
          <span>Costo total <strong>{{ $$(otsCostoTotal) }}</strong></span>
        </div>
      </div>

    <div class="charts-grid cols-2">
      <ChartCard title="Costos Mensuales" :option="costosMensualOpt" />
      <ChartCard title="Costo por m³ - Tendencia" :option="costoM3Opt" />
    </div>

    <div class="charts-grid cols-1" style="margin-top:22px">
      <ChartCard title="Costos por Placa de la Planta" :option="vehiculoGenOpt" :expand-option="vehiculoGenExpandOpt" :height="500" tall />
    </div>

      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Clase de Mantenimiento" description="Órdenes clasificadas por clase de mantenimiento" :option="claseMantenimientoOpt" :expand-option="claseMantExpandOpt" :height="300" />
        <ChartCard title="Motivos de No Ejecución" description="Solo órdenes que registran un motivo de no ejecución" :option="motivosNoEjecucionOpt" :expand-option="motivosNoEjExpandOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Órdenes por Localización" description="Órdenes según la localización registrada" :option="localizacionOpt" :expand-option="localizacionExpandOpt" :height="300" />
        <ChartCard title="Prioridad" description="Órdenes por nivel de prioridad" :option="prioridadOpt" :expand-option="prioridadExpandOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Fuente de Novedad" description="Órdenes según la fuente de novedad registrada" :option="fuenteNovedadOpt" :expand-option="fuenteNovedadExpandOpt" :height="300" />
        <ChartCard title="Tipos de Trabajo" description="Órdenes de trabajo según el tipo registrado" :option="tiposTrabajoOpt" :expand-option="tiposTrabajoExpandOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Responsables de Cierre con Más Órdenes" description="Quienes más cierran órdenes de trabajo" :option="responsablesCierreOpt" :expand-option="responsablesCierreExpandOpt" :height="300" />
        <ChartCard title="Sistemas con Más Intervención" description="Top 10 sistemas, según las sub-órdenes de cada OT" :option="sistemasOpt" :expand-option="sistemasExpandOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Personal de Intervención (Interno)" description="Técnicos de Gravicon con más intervenciones" :option="personalInternoOpt" :expand-option="personalInternoExpandOpt" :height="300" />
        <ChartCard title="Solicitantes con Más Órdenes" description="Quienes más solicitan órdenes de trabajo" :option="solicitantesOpt" :expand-option="solicitantesExpandOpt" :height="300" />
      </div>

    <div class="charts-grid cols-1" style="margin-bottom:22px">
      <ChartCard title="Órdenes Diarias" description="Abiertas y cerradas con sus costos" :option="ordenesDiariasOpt" :height="300" />
    </div>

    <div class="section-divider"></div>

    <h3 class="section-title"><span class="title-bar"></span>Costos Internos</h3>
    <p class="section-sub">Proveedores: Mantenimiento Maquinaria</p>

    <div class="kpi-row">
      <KpiCard :value="$$(intTotal)" label="Costo Total Interno" accent="#15223c" icon="dollar" />
      <KpiCard :value="$$(intServ)" label="Servicios Internos" accent="#3B82F6" icon="settings" />
      <KpiCard :value="$$(intIns)" label="Insumos Internos" accent="#EF4444" icon="package" />
      <KpiCard :value="intPct + '%'" label="% del Gasto Total" accent="#10B981" icon="chart-bar" />
      <KpiCard :value="$$(intCostoM3)" label="Costo por m³ Interno" :accent="intCostoM3 > 3000 ? '#EF4444' : '#10B981'" :meta="'Meta: $3.000/m³'" icon="target" />
      <KpiCard :value="String(intCount)" label="Órdenes Internas" accent="#06B6D4" icon="list" />
      <KpiCard :value="String(otsIntEstadoCounts.abiertas)" label="Abiertas" accent="#EF4444" icon="activity" />
      <KpiCard :value="String(otsIntEstadoCounts.cerradas)" label="Cerradas" accent="#10B981" icon="check-circle" />
      <KpiCard :value="otsIntPctCierre + '%'" label="% Cierre" accent="#3B82F6" icon="zap" />
      <KpiCard :value="otsIntDuracionEstimadaProm + ' h'" label="Duración Estimada Promedio" accent="#8B5CF6" icon="clock" />
      <KpiCard :value="otsIntTiempoRealProm + ' h'" label="Tiempo Real Recepción → Cierre" accent="#06B6D4" icon="target" />
      <KpiCard :value="otsIntConSopledPct + '%'" label="OT con Solicitud (SOPLED/Interno)" accent="#10B981" icon="package" />
    </div>

      <div class="ots-bar">
        <div class="ots-stats">
          <span><strong>{{ otsIntSubs }}</strong> sub-órdenes</span>
          <span class="ots-dot"></span>
          <span><strong>{{ otsIntSopled }}</strong> SOPLED</span>
          <span class="ots-dot"></span>
          <span>Costo total <strong>{{ $$(otsIntCostoTotal) }}</strong></span>
        </div>
      </div>

    <div class="charts-grid cols-1">
      <ChartCard title="Costo por m³ - Interno" :option="costosM3IntOpt" />
    </div>

    <div class="charts-grid cols-1" style="margin-top:22px">
      <ChartCard title="Costos Internos por Placa de la Planta" :option="vehiculoIntOpt" :height="500" tall />
    </div>
    <div class="charts-grid cols-1" style="margin-top:22px">
      <ChartCard title="Costos Internos por Proveedor" :option="intProveedorOpt" :height="500" tall />
    </div>

      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Clase de Mantenimiento" description="Órdenes clasificadas por clase de mantenimiento" :option="claseMantenimientoIntOpt" :height="300" />
        <ChartCard title="Motivos de No Ejecución" description="Solo órdenes que registran un motivo de no ejecución" :option="motivosNoEjecucionIntOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Órdenes por Localización" description="Órdenes según la localización registrada" :option="localizacionIntOpt" :height="300" />
        <ChartCard title="Prioridad" description="Órdenes por nivel de prioridad" :option="prioridadIntOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Fuente de Novedad" description="Órdenes según la fuente de novedad registrada" :option="fuenteNovedadIntOpt" :height="300" />
        <ChartCard title="Tipos de Trabajo" description="Órdenes de trabajo según el tipo registrado" :option="tiposTrabajoIntOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Responsables de Cierre con Más Órdenes" description="Quienes más cierran órdenes de trabajo" :option="responsablesCierreIntOpt" :height="300" />
        <ChartCard title="Sistemas con Más Intervención" description="Top 10 sistemas, según las sub-órdenes de cada OT" :option="sistemasIntOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Personal de Intervención" description="Técnicos de Gravicon con más intervenciones" :option="personalIntOpt" :height="300" />
        <ChartCard title="Solicitantes con Más Órdenes" description="Quienes más solicitan órdenes de trabajo" :option="solicitantesIntOpt" :height="300" />
      </div>

    <div class="charts-grid cols-1" style="margin-bottom:22px">
      <ChartCard title="Órdenes Diarias" description="Abiertas y cerradas con sus costos (Internas)" :option="ordenesDiariasIntOpt" :height="300" />
    </div>

    <div class="section-divider"></div>

    <h3 class="section-title"><span class="title-bar"></span>Costos Externos</h3>
    <p class="section-sub">Proveedores diferentes a Mantenimiento Maquinaria</p>

    <div class="kpi-row">
      <KpiCard :value="$$(extTotal)" label="Costo Total Externo" accent="#15223c" icon="dollar" />
      <KpiCard :value="$$(extServ)" label="Servicios Externos" accent="#3B82F6" icon="settings" />
      <KpiCard :value="$$(extIns)" label="Insumos Externos" accent="#EF4444" icon="package" />
      <KpiCard :value="extPct + '%'" label="% del Gasto Total" accent="#10B981" icon="chart-bar" />
      <KpiCard :value="$$(extCostoM3)" label="Costo por m³ Externo" :accent="extCostoM3 > 3000 ? '#EF4444' : '#10B981'" :meta="'Meta: $3.000/m³'" icon="target" />
      <KpiCard :value="String(extCount)" label="Órdenes Externas" accent="#06B6D4" icon="list" />
      <KpiCard :value="String(otsExtEstadoCounts.abiertas)" label="Abiertas" accent="#EF4444" icon="activity" />
      <KpiCard :value="String(otsExtEstadoCounts.cerradas)" label="Cerradas" accent="#10B981" icon="check-circle" />
      <KpiCard :value="otsExtPctCierre + '%'" label="% Cierre" accent="#3B82F6" icon="zap" />
      <KpiCard :value="otsExtDuracionEstimadaProm + ' h'" label="Duración Estimada Promedio" accent="#8B5CF6" icon="clock" />
      <KpiCard :value="otsExtTiempoRealProm + ' h'" label="Tiempo Real Recepción → Cierre" accent="#06B6D4" icon="target" />
      <KpiCard :value="otsExtConSopledPct + '%'" label="OT con Solicitud (SOPLED/Interno)" accent="#10B981" icon="package" />
    </div>

      <div class="ots-bar">
        <div class="ots-stats">
          <span><strong>{{ otsExtSubs }}</strong> sub-órdenes</span>
          <span class="ots-dot"></span>
          <span><strong>{{ otsExtSopled }}</strong> SOPLED</span>
          <span class="ots-dot"></span>
          <span>Costo total <strong>{{ $$(otsExtCostoTotal) }}</strong></span>
        </div>
      </div>

    <div class="charts-grid cols-1">
      <ChartCard title="Costo por m³ - Externo" :option="costosM3ExtOpt" />
    </div>

    <div class="charts-grid cols-1" style="margin-top:22px">
      <ChartCard title="Costos Externos por Placa de la Planta" :option="vehiculoExtOpt" :height="500" tall />
    </div>

      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Clase de Mantenimiento" description="Órdenes clasificadas por clase de mantenimiento" :option="claseMantenimientoExtOpt" :height="300" />
        <ChartCard title="Motivos de No Ejecución" description="Solo órdenes que registran un motivo de no ejecución" :option="motivosNoEjecucionExtOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Órdenes por Localización" description="Órdenes según la localización registrada" :option="localizacionExtOpt" :height="300" />
        <ChartCard title="Prioridad" description="Órdenes por nivel de prioridad" :option="prioridadExtOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Fuente de Novedad" description="Órdenes según la fuente de novedad registrada" :option="fuenteNovedadExtOpt" :height="300" />
        <ChartCard title="Tipos de Trabajo" description="Órdenes de trabajo según el tipo registrado" :option="tiposTrabajoExtOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Responsables de Cierre con Más Órdenes" description="Quienes más cierran órdenes de trabajo" :option="responsablesCierreExtOpt" :height="300" />
        <ChartCard title="Sistemas con Más Intervención" description="Top 10 sistemas, según las sub-órdenes de cada OT" :option="sistemasExtOpt" :height="300" />
      </div>
      <div class="charts-grid cols-2" style="margin-bottom:22px">
        <ChartCard title="Solicitantes con Más Órdenes" description="Quienes más solicitan órdenes de trabajo" :option="solicitantesExtOpt" :height="300" />
      </div>

    <div class="charts-grid cols-1" style="margin-bottom:22px">
      <ChartCard title="Órdenes Diarias" description="Abiertas y cerradas con sus costos (Externas)" :option="ordenesDiariasExtOpt" :height="300" />
    </div>

    </template>
    </template>

    <template v-if="subTab === 'dashboard'">
    <template v-if="dashboardView === 'ordenes'">
    <div class="ots-section">
      <div class="ots-bar">
        <div class="ots-stats">
          <span><strong>{{ dataFilteredMain.length }}</strong> órdenes</span>
          <span class="ots-dot"></span>
          <span class="stat-abiertas"><strong>{{ estadoCounts.abiertas }}</strong> abiertas</span>
          <span class="ots-dot"></span>
          <span class="stat-cerradas"><strong>{{ estadoCounts.cerradas }}</strong> cerradas</span>
        </div>
        <div class="ots-actions">
          <input v-model="otFilterInput" class="ots-search" placeholder="Buscar OT, vehículo, proveedor..." />
        </div>
      </div>

      <DataTable title="Órdenes de Trabajo — haz clic en una fila para ver su detalle" :data="otTableRows" :page-size="20" :columnWidths="otColWidths" :excludeFields="['_ot', '_rowKey']" :badgeFields="['Estado']" :defaultVisible="['Nº Orden de Trabajo', 'Fecha y Hora', 'Estado', 'PLANTA', 'PROVEEDOR', 'Tipo de Vehículo', 'Placa del Vehículo', 'Costo Total', 'Duración (horas)', 'Motivo No Ejecución', 'Observaciones']" small selectColumns exportColumns clickable :on-export="exportOtXlsx" @row-click="openOtDetail" />
    </div>
    </template>

    <template v-if="dashboardView === 'informe'">
    <div class="informe-section">
      <!-- Barra superior oficial del informe de OT -->
      <div class="informe-control-bar">
        <div class="icb-info">
          <span class="icb-tag">Reporte Oficial de Mantenimiento</span>
          <span class="icb-title">Gestión de Órdenes de Trabajo (OT) — {{ plantaLabel }}</span>
        </div>
        <div class="icb-actions" style="display: flex; gap: 8px; align-items: center;">
          <button class="tb-btn primary" @click="generarInformePdf" :disabled="!informeRows.length || generandoPdf" title="Generar y descargar archivo PDF oficial">
            <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span v-if="generandoPdf">Generando PDF...</span>
            <span v-else>Descargar PDF</span>
          </button>
        </div>
      </div>

      <!-- PORTADA Y PÁGINAS DEL REPORTE OFICIAL DE OT -->
      <div class="report-paper" v-if="informeRows.length">

        <!-- ============================================== -->
        <!-- PÁGINA 1: PORTADA EJECUTIVA, KPIS Y PERSONAL   -->
        <!-- ============================================== -->
        <div class="report-page">
          <header class="report-header">
            <div class="report-header-brand">
              <img src="/Logos/Logo_Gravicon_Azul.png" alt="Gravicon" class="report-logo" />
              <div class="report-header-text">
                <h2>Mantenimiento {{ plantaLabel }} Gravicon</h2>
                <span>GRAVAS Y CONCRETOS S.A. · {{ isConcretos ? 'Concretos' : 'Agregados' }} · {{ repTipoLabel }}</span>
              </div>
            </div>
            <div class="report-header-meta">
              <div class="meta-item"><span>Período:</span> <strong>{{ informeDesde }} al {{ informeHasta }}</strong></div>
              <div class="meta-item"><span>Código:</span> <strong>GRV-INF-{{ repReferencia }}-{{ repTipoLabel.toUpperCase() }}</strong></div>
              <div class="meta-item page-counter"><span>Pág. 1 de 3</span></div>
            </div>
          </header>

          <div class="report-title-section">
            <h1>Informe Ejecutivo de Órdenes de Trabajo</h1>
            <p class="report-intro">
              Análisis consolidado de costos, volumen de atención, intervenciones por {{ repSectionLabelVehiculo.toLowerCase() }}, desempeño de proveedores y distribución del mantenimiento correctivo vs. preventivo para <strong>{{ plantaLabel }}</strong>.
            </p>
          </div>

          <!-- 8 Tarjetas KPI Oficiales -->
          <div class="kpi-row compact-kpi">
            <KpiCard label="OT Abiertas" accent="#DC2626" icon="activity" :value="String(repAbiertas)" />
            <KpiCard label="OT Cerradas" accent="#16A34A" icon="check-circle" :value="String(repCerradas)" />
            <KpiCard label="Cerradas Mes" accent="#2563EB" icon="check" :value="String(repCerradasMes)" />
            <KpiCard label="Costo Acumulado" accent="#1D4ED8" icon="dollar" :value="$$short(repCostoTotal)" />
            <KpiCard
              label="% Cierre"
              :accent="repPctCierre >= 85 ? '#16A34A' : repPctCierre >= 60 ? '#F59E0B' : '#DC2626'"
              meta="Meta: 85%"
              icon="target"
              :value="repPctCierre + '%'"
            />
            <KpiCard label="Duración Promedio" accent="#8B5CF6" icon="clock" :value="otDuracionEstimadaProm + ' h'" />
            <KpiCard label="Gasto Interno" accent="#2563EB" icon="package" :value="$$short(repCostosProv.interno)" />
            <KpiCard label="Gasto Externo" accent="#F59E0B" icon="user" :value="$$short(repCostosProv.externo)" />
          </div>

          <!-- Análisis Operativo Directivo estilo Zoho -->
          <div class="report-section-block">
            <div class="zoho-analysis-box">
              <div class="zoho-analysis-label">Análisis Operativo Directivo — Gestión de Órdenes de Trabajo</div>
              <div class="zoho-analysis-text" v-html="informeAnalisisTexto"></div>
            </div>
          </div>

          <!-- Nota de Estado / Alertas -->
          <div v-if="repAbiertas > 0" class="report-nota alerta">
            <strong>Atención a Órdenes Abiertas ({{ repAbiertas }} OT):</strong>
            Se registran órdenes de trabajo en proceso o pendientes de cierre administrativo en el corte seleccionado.
          </div>
          <div v-else class="report-nota">
            <strong>Estado de Cierre:</strong> El 100% de las órdenes de trabajo del corte seleccionado se encuentran cerradas y liquidadas.
          </div>

          <!-- Índice de Cierre y Apertura por Persona -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Índice de Cierre y Apertura por Persona</h3>
            <div class="charts-grid cols-2">
              <div class="data-card" style="padding: 10px 14px;">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 8px; text-transform: uppercase;">
                  OT Cerradas por Persona
                </div>
                <div v-for="c in repIndiceCierreFiltrado" :key="c.label" class="rank-bar">
                  <span class="rank-label" :title="c.label">{{ c.label }}</span>
                  <div class="rank-track"><div class="rank-fill" :style="{ width: ((c.n / (repIndiceCierreFiltrado[0]?.n || 1)) * 100) + '%' }"></div></div>
                  <span class="rank-val">{{ c.n }}</span>
                </div>
                <div v-if="!repIndiceCierreFiltrado.length" class="empty-table" style="padding: 8px;">Sin cierres registrados</div>
              </div>

              <div class="data-card" style="padding: 10px 14px;">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 8px; text-transform: uppercase;">
                  OT Abiertas por Persona
                </div>
                <div v-for="c in repIndiceApertura" :key="c.label" class="rank-bar">
                  <span class="rank-label" :title="c.label">{{ c.label }}</span>
                  <div class="rank-track"><div class="rank-fill" :style="{ width: ((c.n / (repIndiceApertura[0]?.n || 1)) * 100) + '%' }"></div></div>
                  <span class="rank-val">{{ c.n }}</span>
                </div>
                <div v-if="!repIndiceApertura.length" class="empty-table" style="padding: 8px;">Sin aperturas registradas</div>
              </div>
            </div>
          </div>

          <footer class="report-footer">
            <span>Informe de Órdenes de Trabajo — Gravicon</span>
            <span>Documento Oficial | Página 1 de 3</span>
          </footer>
        </div>

        <!-- ============================================== -->
        <!-- PÁGINA 2: COSTOS, EQUIPOS Y PROVEEDORES        -->
        <!-- ============================================== -->
        <div class="report-page">
          <div class="report-salto-superior"></div>

          <!-- Costo Acumulado por Planta y Maquinaria -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Costo Acumulado por {{ repSectionLabelPlanta }} y {{ repSectionLabelMaquinaria }}</h3>
            <div class="data-card">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 26%">{{ repSectionLabelPlanta }}</th>
                      <th>{{ repSectionLabelMaquinaria }}</th>
                      <th class="r" style="width: 60px">OTs</th>
                      <th class="r" style="width: 130px">Costo Acumulado</th>
                      <th class="r" style="width: 70px">Particip.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in repCostoPlanta" :key="m.planta + '-' + m.maquina">
                      <td class="bold">{{ m.planta }}</td>
                      <td class="accent-text">{{ m.maquina }}</td>
                      <td class="r bold">{{ m.n }}</td>
                      <td class="r bold">{{ $$(m.costo) }}</td>
                      <td class="r">{{ repPct(m.costo) }}%</td>
                    </tr>
                    <tr v-if="!repCostoPlanta.length"><td colspan="5" class="empty-table">Sin datos en el período</td></tr>
                    <tr class="table-total-row">
                      <td colspan="2" class="bold">TOTAL</td>
                      <td class="r bold">{{ repRows.length }}</td>
                      <td class="r bold">{{ $$(repCostoTotal) }}</td>
                      <td class="r bold">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Costo por Tipo de Vehículo + Top 5 Vehículos Mayor Consumo -->
          <div class="report-section-block">
            <div class="charts-grid cols-2">
              <!-- Columna 1: Costo por Vehículo -->
              <div class="data-card">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; text-transform: uppercase;">
                  Costo Acumulado por {{ repSectionLabelVehiculo }}
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{{ repSectionLabelVehiculo }}</th>
                        <th class="r" style="width: 45px">OTs</th>
                        <th class="r" style="width: 100px">Costo</th>
                        <th class="r" style="width: 55px">Part.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="t in repCostoTipoVeh.slice(0, 6)" :key="t.label">
                        <td class="bold accent-text">{{ t.label }}</td>
                        <td class="r">{{ t.n }}</td>
                        <td class="r bold">{{ $$(t.costo) }}</td>
                        <td class="r">{{ repPct(t.costo) }}%</td>
                      </tr>
                      <tr v-if="!repCostoTipoVeh.length"><td colspan="4" class="empty-table">Sin datos</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Columna 2: Top 5 Vehículos con Mayor Consumo -->
              <div class="data-card">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; text-transform: uppercase;">
                  Top 5 {{ repSectionLabelVehiculo }}s con Mayor Consumo
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 24px">#</th>
                        <th>{{ repSectionLabelVehiculo }}</th>
                        <th class="r" style="width: 40px">OTs</th>
                        <th class="r" style="width: 95px">Costo</th>
                        <th class="r" style="width: 70px">Taller</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(v, i) in repTopVehiculos" :key="v.placa">
                        <td class="idx">{{ i + 1 }}</td>
                        <td class="bold accent-text">{{ v.placa }}</td>
                        <td class="r">{{ v.n }}</td>
                        <td class="r bold" style="color: #dc2626;">{{ $$(v.costo) }}</td>
                        <td class="r">{{ fmtDuracion(v.dias) || '—' }}</td>
                      </tr>
                      <tr v-if="!repTopVehiculos.length"><td colspan="5" class="empty-table">Sin datos</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Costos por Proveedores Internos y Externos -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Costos por Proveedores Internos y Externos</h3>
            <div class="charts-grid cols-2">
              <div class="data-card">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo Proveedor</th>
                        <th class="r" style="width: 50px">OTs</th>
                        <th class="r" style="width: 110px">Costo</th>
                        <th class="r" style="width: 60px">Part.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="bold"><span class="pill p-rojo" style="margin-right: 4px;">■</span> Internos (Gravicon)</td>
                        <td class="r">{{ repCostosProv.nInt }}</td>
                        <td class="r bold">{{ $$(repCostosProv.interno) }}</td>
                        <td class="r bold" style="color: #dc2626;">{{ repCostosProv.pctInt }}%</td>
                      </tr>
                      <tr>
                        <td class="bold"><span class="pill p-verde" style="margin-right: 4px;">■</span> Externos</td>
                        <td class="r">{{ repCostosProv.nExt }}</td>
                        <td class="r bold">{{ $$(repCostosProv.externo) }}</td>
                        <td class="r bold" style="color: #16a34a;">{{ repCostosProv.pctExt }}%</td>
                      </tr>
                      <tr class="table-total-row">
                        <td class="bold">TOTAL</td>
                        <td class="r bold">{{ repCostosProv.nInt + repCostosProv.nExt }}</td>
                        <td class="r bold">{{ $$(repCostosProv.total) }}</td>
                        <td class="r bold">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="data-card" style="padding: 12px 16px; display: flex; flex-direction: column; justify-content: center;">
                <div class="stack-track">
                  <div class="stack-seg seg-cor" :style="{ width: repCostosProv.pctInt + '%' }">{{ repCostosProv.pctInt ? repCostosProv.pctInt + '%' : '' }}</div>
                  <div class="stack-seg seg-prev" :style="{ width: repCostosProv.pctExt + '%' }">{{ repCostosProv.pctExt ? repCostosProv.pctExt + '%' : '' }}</div>
                </div>
                <div class="pv-legend" style="margin-top: 8px;">
                  <span style="color:#dc2626;font-weight:700;">■</span> <b>Internos</b> — {{ repCostosProv.pctInt }}% del costo ({{ $$(repCostosProv.interno) }})<br>
                  <span style="color:#16a34a;font-weight:700;">■</span> <b>Externos</b> — {{ repCostosProv.pctExt }}% del costo ({{ $$(repCostosProv.externo) }})
                </div>
              </div>
            </div>
          </div>

          <!-- Ranking de Proveedores con Mayor Uso -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Ranking de Proveedores con Mayor Uso</h3>
            <div class="data-card">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 24px">#</th>
                      <th>Proveedor</th>
                      <th class="r" style="width: 65px">N.º de OT</th>
                      <th class="r" style="width: 130px">Costo Acumulado</th>
                      <th class="r" style="width: 70px">Particip.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(p, i) in repRankProveedores.slice(0, 6)" :key="p.label">
                      <td class="idx">{{ i + 1 }}</td>
                      <td class="bold accent-text">{{ p.label }}</td>
                      <td class="r bold">{{ p.n }}</td>
                      <td class="r bold">{{ $$(p.costo) }}</td>
                      <td class="r">{{ repPct(p.costo) }}%</td>
                    </tr>
                    <tr v-if="!repRankProveedores.length"><td colspan="5" class="empty-table">Sin datos en el período</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <footer class="report-footer">
            <span>Informe de Órdenes de Trabajo — Gravicon</span>
            <span>Documento Oficial | Página 2 de 3</span>
          </footer>
        </div>

        <!-- ============================================== -->
        <!-- PÁGINA 3: CLASIFICACIÓN, SISTEMAS Y GESTIÓN    -->
        <!-- ============================================== -->
        <div class="report-page">
          <div class="report-salto-superior"></div>

          <!-- Distribución del Mantenimiento Correctivo y Preventivo -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Distribución del Mantenimiento Correctivo y Preventivo</h3>
            <div class="charts-grid cols-2">
              <div class="data-card" style="display: flex; align-items: center; justify-content: center; padding: 10px;">
                <svg viewBox="0 0 200 200" style="width: 130px; height: 130px;">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f5f9" stroke-width="20"/>
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#16a34a" stroke-width="20"
                    :stroke-dasharray="`${(repClaseMant.pctPrev / 100) * 439.82} 439.82`"
                    stroke-linecap="round" transform="rotate(-90 100 100)"/>
                  <text x="100" y="96" text-anchor="middle" fill="#16a34a" style="font-size:24px;font-weight:900;">{{ repClaseMant.pctPrev }}%</text>
                  <text x="100" y="116" text-anchor="middle" fill="#64748b" style="font-size:10px;font-weight:700;">PREVENTIVO</text>
                  <text x="100" y="130" text-anchor="middle" fill="#94a3b8" style="font-size:9px;">{{ repClaseMant.preventivo }} de {{ repClaseMant.total }} OT</text>
                </svg>
              </div>

              <div class="data-card" style="padding: 12px 16px; display: flex; flex-direction: column; justify-content: center;">
                <div class="stack-track">
                  <div class="stack-seg seg-cor" :style="{ width: repClaseMant.pctCor + '%' }">{{ repClaseMant.pctCor ? repClaseMant.pctCor + '%' : '' }}</div>
                  <div class="stack-seg seg-prev" :style="{ width: repClaseMant.pctPrev + '%' }">{{ repClaseMant.pctPrev ? repClaseMant.pctPrev + '%' : '' }}</div>
                  <div class="stack-seg seg-otro" :style="{ width: repClaseMant.pctOtro + '%' }">{{ repClaseMant.pctOtro ? repClaseMant.pctOtro + '%' : '' }}</div>
                </div>
                <div class="pv-legend" style="margin-top: 8px;">
                  <span style="color:#dc2626;font-weight:700;">■</span> <b>Correctivo</b> — {{ repClaseMant.correctivo }} OT ({{ repClaseMant.pctCor }}%)<br>
                  <span style="color:#16a34a;font-weight:700;">■</span> <b>Preventivo</b> — {{ repClaseMant.preventivo }} OT ({{ repClaseMant.pctPrev }}%)<br>
                  <span style="color:#8b8b8b;font-weight:700;">■</span> <b>Otras / Sin clasificar</b> — {{ repClaseMant.otros }} OT ({{ repClaseMant.pctOtro }}%)
                </div>
              </div>
            </div>
          </div>

          <!-- Ranking de Sistemas y Ranking de Almacén en 2 columnas -->
          <div class="report-section-block">
            <div class="charts-grid cols-2">
              <!-- Sistemas Intervenidos -->
              <div class="data-card">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; text-transform: uppercase;">
                  Sistemas con Mayor Intervención
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 24px">#</th>
                        <th>Sistema Intervenido</th>
                        <th class="r" style="width: 60px">Interv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(s, i) in repRankSistemas.slice(0, 6)" :key="s.label">
                        <td class="idx">{{ i + 1 }}</td>
                        <td class="bold accent-text">{{ s.label }}</td>
                        <td class="r bold">{{ s.n }}</td>
                      </tr>
                      <tr v-if="!repRankSistemas.length"><td colspan="3" class="empty-table">Sin intervenciones</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Elementos de Almacén -->
              <div class="data-card">
                <div class="card-head" style="font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; text-transform: uppercase;">
                  Elementos y Repuestos Solicitados
                </div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 24px">#</th>
                        <th>Elemento</th>
                        <th style="width: 45px">Und</th>
                        <th class="r" style="width: 45px">Cant.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(a, i) in repRankAlmacen.slice(0, 6)" :key="a.label">
                        <td class="idx">{{ i + 1 }}</td>
                        <td class="bold accent-text">{{ a.label }}</td>
                        <td>{{ a.und || 'UND' }}</td>
                        <td class="r bold">{{ a.n }}</td>
                      </tr>
                      <tr v-if="!repRankAlmacen.length"><td colspan="4" class="empty-table">Sin solicitudes</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Personal Interno de Intervención -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Personal de Intervención (Interno)</h3>
            <div class="data-card">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 24px">#</th>
                      <th>Técnico / Personal Interno</th>
                      <th class="r" style="width: 65px">OTs</th>
                      <th class="r" style="width: 130px">Costo Servicios</th>
                      <th class="r" style="width: 100px">Duración (horas)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(p, i) in repPersonalInterno" :key="p.label">
                      <td class="idx">{{ i + 1 }}</td>
                      <td class="bold accent-text">{{ p.label }}</td>
                      <td class="r bold">{{ p.n }}</td>
                      <td class="r bold">{{ $$(p.costoServ) }}</td>
                      <td class="r bold">{{ fmtDuracion(p.horas) }}</td>
                    </tr>
                    <tr v-if="!repPersonalInterno.length"><td colspan="5" class="empty-table">Sin datos en el período</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Resumen Ejecutivo y Conclusiones de Gestión -->
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y Resumen Ejecutivo</h3>
            <div class="data-card" style="padding: 10px 14px;">
              <ul class="res">
                <li v-for="(l, i) in repLectura" :key="i">{{ l }}</li>
              </ul>
            </div>
          </div>

          <footer class="report-footer">
            <span>Informe de Órdenes de Trabajo — Gravicon</span>
            <span>Documento Oficial | Página 3 de 3</span>
          </footer>
        </div>

      </div>

      <div v-else class="informe-empty">
        <span class="placeholder-icon">📄</span>
        <span class="placeholder-text">Genera un informe de órdenes de trabajo</span>
        <span class="placeholder-sub">Selecciona un rango de fechas para ver la vista previa en pantalla</span>
      </div>
    </div>
    </template>
    </template>

    <template v-if="subTab === 'almacen'">
    <div class="ots-section">
      <div class="almacen-view-toggle">
        <button class="av-btn" :class="{ active: almacenView === 'graficos' }" @click="almacenView = 'graficos'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Gráficas
        </button>
        <button class="av-btn" :class="{ active: almacenView === 'solicitudes' }" @click="almacenView = 'solicitudes'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Solicitudes
        </button>
      </div>

      <template v-if="almacenView === 'graficos'">
      <div class="kpi-row">
        <KpiCard :value="String(sopledDetailRows.length)" label="Solicitudes" accent="#15223c" icon="activity" />
        <KpiCard :value="String(sopledTotalItems)" label="Ítems Solicitados" accent="#3B82F6" icon="package" />
        <KpiCard v-for="([t, n]) in almacenTipoCompra" :key="t" :value="String(n)" :label="`Tipo Compra: ${t}`" :accent="almacenTipoCompraColors[t] ?? '#8B5CF6'" :icon="almacenTipoCompraIcons[t] ?? 'clock'" />
      </div>

      <div class="charts-grid cols-2" style="margin-top:24px">
        <ChartCard title="Productos Más Solicitados (Frecuencia)" :option="almacenSolicitudesOpt" :height="320" />
        <ChartCard title="Productos con Mayor Cantidad Solicitada" :option="almacenCantidadOpt" :height="320" />
      </div>

      <div class="charts-grid cols-2" style="margin-top:20px">
        <ChartCard title="Participación de Costo por Centro de Costo" :option="almacenCentroCostoPieOpt" :height="300" />
        <ChartCard title="Quiénes Aprueban Más" :option="almacenApruebaOpt" :height="320" />
      </div>

      <div class="charts-grid cols-2" style="margin-top:20px">
        <ChartCard title="Motivos de No Salida" :option="almacenMotivosNoSalidaOpt" :height="320" />
        <ChartCard title="Quiénes Solicitan Más" :option="almacenSolicitantesOpt" :height="320" />
      </div>

      <div class="charts-grid cols-1" style="margin-top:20px">
        <ChartCard title="Líneas con Más Salidas de Almacén" description="Localización de la OT que solicita más pedidos" :option="almacenLocalizacionOpt" :height="320" />
      </div>

      <div style="margin-top:20px">
        <ChartCard title="Solicitudes Diarias" :option="almacenDiarioOpt" :height="300" />
      </div>
      </template>

      <template v-else>
      <DataTable title="Solicitudes de Almacén" :data="sopledDetailRows" :page-size="20" :columnWidths="almacenColWidths" :excludeFields="['_sop', '_ot', 'ID (ID_OT_SOLPED)']" :badgeFields="['Tipo Compra']" :defaultVisible="['No. Pedido', 'Tipo Compra', 'Proceso', 'Solicitante', 'Aprueba', 'Ítems']" small selectColumns exportColumns clickable :on-export="exportSopledXlsx" @row-click="openSopledDetail" />
      </template>
    </div>
    </template>

    <Teleport to="body">
      <div v-if="detalleOT" class="modal-overlay" @click.self="detalleOT = null">
        <div class="modal-panel ot-modal-panel">
          <button class="modal-close" @click="detalleOT = null">✕</button>

          <div class="ot-workspace">

            <!-- VENTANA 1: Orden de Trabajo -->
            <section class="ot-window ot-window-order">
              <div class="ot-doc">

                <div class="hdr">
                  <div class="hdr-logo">
                    <img src="/Logos/Logo-Gravicon-Nuevo.png" alt="GRAVICON" />
                  </div>
                  <div class="hdr-info">
                    <div class="co">GRAVICON S.A. - {{ isConcretos ? 'CONCRETOS' : 'AGREGADOS' }} {{ isConcretos ? (props.localizacion || '') : plantaLabel }}</div>
                    <div class="ref">Código: F-195 - Versión: 12 - Fecha: Agosto 2026</div>
                    <div class="ot-title">Orden de trabajo</div>
                  </div>
                  <div class="hdr-folio">
                    <div class="folio-lbl">Folio OT: <span class="folio-num">{{ detalleOT['N\u00ba Orden de Trabajo'] ?? '' }}</span></div>
                    <div class="folio-date">Reg: {{ detalleOT['FECHA'] != null ? serialDate(detalleOT['FECHA']) : '' }} <span v-if="detalleOT['Hora'] != null">{{ serialTime(detalleOT['Hora']) }}</span></div>
                  </div>
                </div>

                <table class="meta-container">
                  <tbody>
                  <tr>
                    <td class="meta-label">Solicitante:</td>
                    <td class="meta-value">{{ detalleOT['Solicitante'] ?? '' }}</td>
                    <td class="meta-label">Fecha Solicitud:</td>
                    <td class="meta-value">{{ serialDate(detalleOT['FECHA']) }} <span v-if="detalleOT['Hora'] != null">{{ serialTime(detalleOT['Hora']) }}</span></td>
                  </tr>
                  <tr>
                    <td class="meta-label">Responsable Proveedor:</td>
                    <td class="meta-value">{{ detalleOT['PROVEEDOR'] ?? '' }}</td>
                    <td class="meta-label">Fecha y Hora Recepción OT:</td>
                    <td class="meta-value">{{ detalleOT['Fecha Recepción'] != null ? serialDateTime(detalleOT['Fecha Recepción']) : '' }}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Estado Actual:</td>
                    <td class="meta-value">{{ detalleOT['Estado'] ?? '' }}</td>
                    <td class="meta-label">Fecha y Hora Devolución OT:</td>
                    <td class="meta-value">{{ detalleOT['Fecha Cierre'] != null ? serialDateTime(detalleOT['Fecha Cierre']) : '' }}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Tipo de OT:</td>
                    <td class="meta-value" style="font-weight:bold">{{ detalleOT['Tipo de OT'] ?? '' }}</td>
                    <td class="meta-label">Duración Estimada:</td>
                    <td class="meta-value">{{ fmtDuracion(detalleOT['Duración (horas)']) }}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Costo Servicios:</td>
                    <td class="meta-value">{{ $$(rowServicios(detalleOT)) }}</td>
                    <td class="meta-label">Costo Insumos:</td>
                    <td class="meta-value">{{ $$(rowInsumos(detalleOT)) }}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Costo Total:</td>
                    <td class="meta-value" style="font-weight:bold;color:#3827f5">{{ $$(rowCosto(detalleOT)) }}</td>
                    <td style="width:25%"></td>
                    <td style="width:25%"></td>
                  </tr>
                  <tr v-if="detalleOT['Motivo No Ejecución']">
                    <td class="meta-label">Motivo No Ejecución:</td>
                    <td class="meta-value" colspan="3">{{ detalleOT['Motivo No Ejecución'] }}</td>
                  </tr>
                  <tr v-if="detalleOT['Observaciones']">
                    <td class="meta-label">Observaciones:</td>
                    <td class="meta-value" colspan="3">{{ detalleOT['Observaciones'] }}</td>
                  </tr>
                  </tbody>
                </table>

                <div class="equipo-block">
                  <div class="equipo-tag">Identificador de Equipo / Planta</div>
                  <div class="equipo-nombre">{{ detalleOT['Vehiculo Descripción'] || detalleOT['Placa del Vehículo'] || detalleOT['Tipo de Vehículo'] }}</div>

                  <table class="grid-table">
                    <tbody>
                    <tr>
                      <td class="grid-label">Localización:</td>
                      <td class="grid-value">{{ detalleOT['Localización'] }}</td>
                      <td class="grid-label">Horómetro:</td>
                      <td class="grid-value">{{ detalleOT['Horómetro'] }}</td>
                    </tr>
                    <tr>
                      <td class="grid-label">Prioridad:</td>
                      <td class="grid-value" style="text-transform:uppercase;font-weight:bold">{{ detalleOT['Prioridad'] }}</td>
                      <td class="grid-label">Tipo Mantenimiento:</td>
                      <td class="grid-value">{{ detalleOT['Tipo de Mantenimiento'] }}</td>
                    </tr>
                    <tr>
                      <td class="grid-label">Plan Ligado:</td>
                      <td class="grid-value">{{ detalleOT['Fuente_Novedad'] }}</td>
                      <td class="grid-label">Clase Mantenimiento:</td>
                      <td class="grid-value">{{ detalleOT['Clase Mantenimiento'] }}</td>
                    </tr>
                    <tr>
                      <td class="grid-label">Tipo Trabajo:</td>
                      <td class="grid-value">{{ detalleOT['Tipo Trabajo'] }}</td>
                      <td class="grid-label"></td>
                      <td class="grid-value"></td>
                    </tr>
                    <tr v-if="detalleOT['Marca Llanta'] || detalleOT['Posición Llanta']">
                      <td class="grid-label" style="border-top:1px dashed #ddd;padding-top:8px">Marca Llanta:</td>
                      <td class="grid-value" style="border-top:1px dashed #ddd;padding-top:8px">{{ detalleOT['Marca Llanta'] }}</td>
                      <td class="grid-label" style="border-top:1px dashed #ddd;padding-top:8px">Posición Llanta:</td>
                      <td class="grid-value" style="border-top:1px dashed #ddd;padding-top:8px">{{ detalleOT['Posición Llanta'] }}</td>
                    </tr>
                    <tr v-if="detalleOT['Tipo Actividad Llanta'] || detalleOT['Destino Llanta']">
                      <td class="grid-label">Tipo Actividad Llanta:</td>
                      <td class="grid-value">{{ detalleOT['Tipo Actividad Llanta'] }}</td>
                      <td class="grid-label">Destino Llanta:</td>
                      <td class="grid-value">{{ detalleOT['Destino Llanta'] }}</td>
                    </tr>
                    <tr v-if="detalleOT['Condición Llanta']">
                      <td class="grid-label">Condición Llanta:</td>
                      <td class="grid-value">{{ detalleOT['Condición Llanta'] }}</td>
                      <td class="grid-label"></td>
                      <td class="grid-value"></td>
                    </tr>
                    <tr v-if="detalleOT['Personal'] || detalleOT['Responsable Cierre']">
                      <td class="grid-label" style="border-top:1px dashed #ddd;padding-top:8px">Personal Intervención:</td>
                      <td class="grid-value" colspan="3" style="border-top:1px dashed #ddd;padding-top:8px;font-weight:normal;color:#1a1a1a">{{ detalleOT['Personal'] || detalleOT['Responsable Cierre'] }}</td>
                    </tr>
                    </tbody>
                  </table>
                </div>

                <div class="task-wrapper">
                  <div class="sec-bar">{{ detalleOT['Tipo Trabajo'] ?? 'Sub-Órdenes de Trabajo' }}</div>

                  <div v-if="!(detalleOT['_subOrdenes'] as any[])?.length" style="padding:8px 0;color:#999;font-size:11px">Sin sub-órdenes registradas</div>
                  <div v-for="(sub, si) in (detalleOT['_subOrdenes'] as any[])" :key="si" class="task-card">
                    <div class="task-left">
                      <div class="task-desc">{{ sub.sistemaTexto || 'Sistema por definir' }} - {{ sub.descripcion }}</div>
                      <div class="task-meta-line"><b>Solicitante:</b> {{ detalleOT['Solicitante'] ?? '' }}</div>
                    </div>
                    <div class="task-right">
                      <div class="tr-icons-row">
                        <span class="tr-icon-box">≡</span>
                        <span class="tr-icon-box orange">●</span>
                      </div>
                      <div class="tr-info-line"><b>Prioridad:</b> {{ detalleOT['Prioridad'] }}</div>
                      <div class="tr-info-line" v-if="detalleOT['Duración (horas)'] != null"><b>Duración aprox:</b> {{ fmtDuracion(detalleOT['Duración (horas)']) }}</div>
                      <div class="tr-info-line"><b>Tipo de trabajo:</b> {{ detalleOT['Tipo Trabajo'] }}</div>
                    </div>
                  </div>
                </div>

                <div class="sopled-doc-actions" v-if="detalleOT['_rowKey'] || detalleOT['Enlace PDF']">
                  <a v-if="detalleOT['_rowKey']" :href="appOtUrl(detalleOT)" target="_blank" rel="noopener" class="doc-btn primary">Abrir en la app de AppSheet →</a>
                  <a v-if="detalleOT['Enlace PDF']" :href="pdfUrl(detalleOT['Enlace PDF'], 'Ordenes_Ot', OT_PDF_FOLDER)" target="_blank" class="doc-btn">Ver PDF original →</a>
                </div>

              </div>
            </section>

            <!-- VENTANA 2: Almacén (Solicitudes SOPLED) -->
            <section class="ot-window ot-window-warehouse">
              <header class="ot-window-header">
                <h3>Almacén</h3>
                <span v-if="otSopledItems.length" class="ot-wh-badge">{{ otSopledItems.length }} ítems</span>
              </header>
              <div class="ot-window-body">
                <div v-if="!otSopledItems.length" class="ot-panel-placeholder">
                  <span class="placeholder-icon">📦</span>
                  <span class="placeholder-text">Sin solicitudes</span>
                  <span class="placeholder-sub">Esta OT no tiene ítems de almacén</span>
                </div>
                <DataTable v-if="otSopledRows.length" title="Solicitudes de Almacén" :data="otSopledRows" :page-size="10" :columnWidths="almacenColWidths" :excludeFields="['_sop', '_ot']" :badgeFields="['Tipo Compra']" :defaultVisible="otSopledDefaultVisible" small clickable @row-click="openSopledDetailFromOT" />
              </div>
            </section>

            <!-- VENTANA 3: Cronología -->
            <section class="ot-window ot-window-timeline">
              <header class="ot-window-header">
                <h3>Cronología</h3>
              </header>
              <div class="ot-window-body">
                <div v-if="!otTimeline.length" class="ot-panel-placeholder">
                  <span class="placeholder-icon">🕐</span>
                  <span class="placeholder-text">Sin eventos</span>
                  <span class="placeholder-sub">No hay registros disponibles</span>
                </div>
                <div v-else class="crono-list">
                  <div v-for="(ev, i) in otTimeline" :key="i" class="crono-item">
                    <span class="crono-dot" :class="ev.tipo"></span>
                    <div class="crono-content">
                      <div class="crono-head">
                        <span class="crono-accion" :class="ev.tipo">{{ ev.accion }}</span>
                        <span class="crono-fecha">{{ ev.fecha }} <small v-if="ev.hora">{{ ev.hora }}</small></span>
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
              </div>
            </section>

          </div>

        </div>
      </div>

      <div v-if="sopledDetail" class="modal-overlay" @click.self="sopledDetail = null">
        <div class="modal-panel sopled-panel">
          <button class="modal-close" @click="sopledDetail = null">✕</button>

          <div class="ot-workspace sopled-workspace">

            <!-- VENTANA 1: Solicitud -->
            <section class="ot-window ot-window-order">
              <div class="sopled-doc">
            <div class="hdr">
              <div class="hdr-logo">
                <img src="/Logos/Logo-Gravicon-Nuevo.png" alt="GRAVICON" />
              </div>
              <div class="hdr-info">
                <div class="co">GRAVICON S.A. - {{ isConcretos ? 'CONCRETOS' : 'AGREGADOS' }} {{ (sopledDetail.ot['PLANTA'] ?? 'CUNCIA') }}</div>
                <div class="ref">Fecha: {{ sopledDetail.sop.fecha != null ? serialDate(sopledDetail.sop.fecha) : '' }}</div>
                <div class="doc-title">Solicitud de pedido interno</div>
              </div>
              <div class="hdr-folio">
                <div class="folio-lbl">No. Pedido: <span class="folio-num">{{ sopledDetail.sop.noPedido ?? '' }}</span></div>
                <div class="folio-date">Reg: {{ sopledDetail.sop.fecha != null ? serialDate(sopledDetail.sop.fecha) : '' }} <span v-if="sopledDetail.sop.hora != null"> {{ serialTime(sopledDetail.sop.hora) }}</span></div>
              </div>
            </div>

            <table class="meta-container">
              <tbody>
              <tr>
                <td class="meta-label">No. Orden OT:</td>
                <td class="meta-value important">{{ sopledDetail.ot['Nº Orden de Trabajo'] ?? '' }}</td>
                <td class="meta-label">Fecha Solicitud:</td>
                <td class="meta-value">{{ sopledDetail.sop.fecha != null ? serialDate(sopledDetail.sop.fecha) : '' }} <span v-if="sopledDetail.sop.hora != null">{{ serialTime(sopledDetail.sop.hora) }}</span></td>
              </tr>
              <tr>
                <td class="meta-label">Tipo de Compra:</td>
                <td class="meta-value" :class="String(sopledDetail.sop.tipoCompra).toLowerCase() === 'urgente' ? 'urgent' : ''">{{ sopledDetail.sop.tipoCompra ?? '' }}</td>
                <td class="meta-label">Centro de Costo:</td>
                <td class="meta-value">{{ sopledDetail.sop.centroCosto ?? '' }}</td>
              </tr>
              <tr>
                <td class="meta-label">Industria:</td>
                <td class="meta-value">Agregados</td>
                <td class="meta-label">Planta:</td>
                <td class="meta-value">{{ (sopledDetail.ot['PLANTA'] ?? 'CUNCIA') }}</td>
              </tr>
              <tr>
                <td class="meta-label">Proceso:</td>
                <td class="meta-value" style="border-bottom: none;">{{ sopledDetail.sop.procesoTexto ?? '' }}</td>
                <td class="meta-label"></td>
                <td class="meta-value" style="border-bottom: none;"></td>
              </tr>
              </tbody>
            </table>

            <div class="sec-bar">Detalle de Materiales Solicitados</div>

            <table class="items-table">
              <thead>
              <tr>
                <th class="col-cant center">Cant.</th>
                <th class="col-id">ID Ítem</th>
                <th class="col-ref">Referencia</th>
                <th class="col-desc">Descripción del Material</th>
                <th class="col-unid center">U. Medida</th>
                <th class="col-obs">Observaciones</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(it, i) in (sopledDetail.sop._subSopled ?? [])" :key="i">
                <td class="col-cant center">{{ it.cantidad }}</td>
                <td class="col-id">{{ it.idItem }}</td>
                <td class="col-ref">{{ it.referencia }}</td>
                <td class="col-desc">{{ it.descripcionTexto || it.descripcion }}</td>
                <td class="col-unid center">{{ it.und }}</td>
                <td class="col-obs">{{ it.observacion }}</td>
              </tr>
              <tr v-if="!(sopledDetail.sop._subSopled ?? []).length">
                <td colspan="6" class="sopled-doc-empty">Sin ítems registrados</td>
              </tr>
              </tbody>
            </table>

            <div class="firma-container">
              <div class="firma-col">
                <div class="firma-linea"></div>
                <div class="firma-leyenda">{{ sopledDetail.sop.solicitanteTexto ?? '' }}</div>
                <div class="firma-sub">{{ sopledDetail.sop.cargSolicitante ?? '' }} · Solicitado por</div>
              </div>
              <div class="firma-space"></div>
              <div class="firma-col">
                <div class="firma-linea"></div>
                <div class="firma-leyenda">{{ sopledDetail.sop.apruebaTexto ?? '' }}</div>
                <div class="firma-sub">{{ sopledDetail.sop.cargoAprueba ?? '' }} · Aprobado por</div>
              </div>
            </div>

            <div class="sopled-doc-actions">
              <a :href="appSopledUrl(sopledDetail.sop)" target="_blank" rel="noopener" class="doc-btn primary">Abrir en la app de AppSheet →</a>
              <a :href="pdfUrl(sopledDetail.sop.enlacePdf, 'Sopled', SOPLED_PDF_FOLDER)" target="_blank" class="doc-btn">Abrir PDF original →</a>
              <button class="doc-btn" @click="viewOtFromSopled">Ver detalle completo de la OT →</button>
            </div>
            </div>
            </section>

            <!-- VENTANA 2: Cronología -->
            <section class="ot-window ot-window-timeline">
              <header class="ot-window-header">
                <h3>Cronología</h3>
              </header>
              <div class="ot-window-body">
                <div v-if="!sopledTimeline.length" class="ot-panel-placeholder">
                  <span class="placeholder-icon">🕐</span>
                  <span class="placeholder-text">Sin eventos</span>
                  <span class="placeholder-sub">No hay registros de la solicitud</span>
                </div>
                <div v-else class="crono-list">
                  <div v-for="(ev, i) in sopledTimeline" :key="i" class="crono-item">
                    <span class="crono-dot" :class="ev.tipo"></span>
                    <div class="crono-content">
                      <div class="crono-head">
                        <span class="crono-accion" :class="ev.tipo">{{ ev.accion }}</span>
                        <span class="crono-fecha">{{ ev.fecha }} <small v-if="ev.hora">{{ ev.hora }}</small></span>
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
              </div>
            </section>

          </div>
        </div>
      </div>

    </Teleport>

      </template> <!-- cierre v-else que envuelve sub-tabs Planta/Maquinaria -->

    </div>
  </div>
</template>

/**
 * EquiposDashboard.vue — Dashboard de mantenimiento de equipos y flota.
 * Consolida datos de useMantenimientoStore y useProduccionStore, permitiendo
 * filtrar por rango de fechas, vehículo y proveedor. Calcula costos totales,
 * costo por M³, tendencias mensuales y detalle por orden de trabajo.
 */
<script setup lang="ts">
import { computed, markRaw, nextTick, onMounted, ref, watch } from 'vue'
import { useMantenimientoStore, useProduccionStore } from '../stores'
import { useConcretoStore } from '../stores/concreto'
import ChartCard from '../components/dashboard/ChartCard.vue'
import DisponibilidadTab from './mantenimiento/DisponibilidadTab.vue'
import DataTable from '../components/dashboard/DataTable.vue'
import FilterBar from '../components/dashboard/FilterBar.vue'
import MultiSelect from '../components/ui/MultiSelect.vue'
import KpiCard from '../components/dashboard/KpiCard.vue'
import { useTheme } from '../composables/useTheme'
import { serialToDate, dateToSerial } from '../utils/dates'
import { buildXlsx, downloadXlsx } from '../utils/xlsx'
import { hBarLayout, hBarAxisLabel, hBarGrid, hBarTooltip, hBarValueSpace } from '../utils/chartLayout'
import { useViewportWidth } from '../composables/useViewportWidth'

const props = defineProps<{ planta: string; localizacion?: string }>()

const plantaLabel = computed(() => {
  const p = props.planta?.toLowerCase()
  if (p === 'acacias') return 'Acacias'
  if (p === 'concretos') return props.localizacion ? `Concretos ${props.localizacion}` : 'Concretos'
  return 'Cuncia'
})
const isAcacias = computed(() => props.planta?.toLowerCase() === 'acacias')
const isConcretos = computed(() => props.planta?.toLowerCase() === 'concretos')

const tipoTab = ref('planta')
const tipoTabs = ref<{ id: string; label: string; count: number }[]>([])
const subTab = ref('dashboard')
const dashboardView = ref<'resumen' | 'ordenes' | 'informe'>('resumen')
const almacenView = ref<'graficos' | 'solicitudes'>('graficos')
function rowCosto(r: Record<string, unknown>): number {
  return (Number(r['Costo servicios']) || 0) + (Number(r['Costos Insumos']) || 0)
}
const detalleOT = ref<Record<string, unknown> | null>(null)
function serialDate(serial: unknown): string {
  if (serial == null || serial === '') return ''
  const n = Number(serial)
  if (isNaN(n)) return String(serial)
  return serialToDate(n).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function serialTime(serial: unknown): string {
  if (serial == null || serial === '') return ''
  const n = Number(serial)
  if (isNaN(n) || n < 0 || n >= 1) return ''
  const totalSec = Math.floor(n * 86400)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
function serialDateTime(serial: unknown): string {
  if (serial == null || serial === '') return ''
  const n = Number(serial)
  if (isNaN(n)) return String(serial)
  const intPart = Math.floor(n)
  const frac = n - intPart
  const date = serialDate(intPart)
  const time = serialTime(frac)
  return time ? `${date} ${time}` : date
}

/** SOPLED de la OT actual (para Window 2: Almacén) */
const otSopledItems = computed(() => {
  if (!detalleOT.value) return []
  const sops = detalleOT.value['_sopled']
  if (!Array.isArray(sops)) return []
  const items: Record<string, unknown>[] = []
  for (const sop of sops) {
    const subItems = sop?._subSopled ?? []
    for (const it of subItems) {
      items.push({
        pedido: sop?.noPedido ?? '',
        fecha: sop?.fecha != null ? serialDate(sop.fecha) : '',
        solicitante: sop?.solicitanteTexto ?? '',
        tipoCompra: sop?.tipoCompra ?? '',
        idItem: it?.idItem ?? '',
        referencia: it?.referencia ?? '',
        descripcion: it?.descripcionTexto || it?.descripcion || '',
        cantidad: it?.cantidad ?? '',
        und: it?.und ?? '',
        observacion: it?.observacion ?? '',
      })
    }
  }
  return items
})

/** Filas por pedido SOPLED de la OT actual, mismo formato/orden que la tabla principal de Almacén. */
const otSopledRows = computed(() => {
  if (!detalleOT.value) return []
  const sops = detalleOT.value['_sopled']
  if (!Array.isArray(sops)) return []
  return sops.map(sop => ({
    'No. Pedido': sop?.noPedido ?? '',
    'Tipo Compra': sop?.tipoCompra ?? '',
    'Proceso': sop?.procesoTexto ?? '',
    'Solicitante': sop?.solicitanteTexto ?? '',
    'Aprueba': sop?.apruebaTexto ?? '',
    'Ítems': sop?._subSopled?.length ?? 0,
    'Fecha': sop?.fecha != null ? serialDate(sop.fecha) : '',
    'Centro Costo': sop?.centroCosto ?? '',
    'Cargo Solicitante': sop?.cargSolicitante ?? '',
    'Cargo Aprueba': sop?.cargoAprueba ?? '',
    '_sop': sop,
    '_ot': detalleOT.value,
  }))
})

const otSopledDefaultVisible = ['No. Pedido', 'Tipo Compra', 'Proceso', 'Solicitante', 'Aprueba', 'Ítems']

/** Abre el detalle del pedido SOPLED desde la ventana Almacén del modal OT. */
function openSopledDetailFromOT(row: Record<string, unknown>) {
  sopledDetail.value = { sop: row['_sop'], ot: row['_ot'] as Record<string, unknown>, fromOt: true }
}

/** Timeline de la OT actual (para Window 3: Cronología).
 * Solo muestra los eventos reales de la hoja Cronología (campo _cronologia);
 * nunca inventa eventos. Si no hay registros queda vacía. */
interface CronoCambio { campo: string; de: string; a: string }
interface CronoEvent {
  tipo: 'crear' | 'modificar' | 'mover' | 'eliminar'
  accion: string
  fecha: string
  hora: string
  detalle: string
  cambios: CronoCambio[]
  usuario: string
}
function cronoTipo(accion: string): CronoEvent['tipo'] {
  const a = accion.toLowerCase()
  if (a.includes('cre') || a.includes('registr') || a.includes('apertur')) return 'crear'
  if (a.includes('elimin') || a.includes('anul') || a.includes('cier') || a.includes('final')) return 'eliminar'
  if (a.includes('recep') || a.includes('mover') || a.includes('trasl')) return 'mover'
  return 'modificar'
}

/** Parsea el Detalle_Cambio de la hoja Cronología en cambios estructurados.
 * Soporta: formato Agregados ("Cambios detectados:" con bullets) y
 * formato Concretos (JSON con {"cambios": {"campo": {"antes", "despues"}}}). */
function parseCronoCambios(detalle: string): CronoCambio[] {
  if (!detalle) return []
  const trimmed = detalle.trim()
  // Formato Concretos: JSON con campo "cambios" o "datos_iniciales"
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed)
      // Creación: datos_iniciales → mostrar como "Se creó con..."
      if (obj?.evento === 'Creación' && obj?.datos_iniciales && typeof obj.datos_iniciales === 'object') {
        const out: CronoCambio[] = []
        for (const [campo, valor] of Object.entries(obj.datos_iniciales) as [string, unknown][]) {
          const a = String(valor ?? '').trim()
          if (a) out.push({ campo, de: '', a })
        }
        return out
      }
      // Modificación: cambios
      const cambios = obj?.cambios
      if (cambios && typeof cambios === 'object') {
        const out: CronoCambio[] = []
        for (const [campo, vals] of Object.entries(cambios) as [string, { antes?: string; despues?: string }][]) {
          const de = String(vals?.antes ?? '').trim()
          const a = String(vals?.despues ?? '').trim()
          if (de || a) out.push({ campo, de, a })
        }
        return out
      }
    } catch {
      // JSON truncado: extraer cambios parciales con regex
      // Intentar Creación
      const crearMatch = trimmed.match(/"datos_iniciales"\s*:\s*\{([\s\S]*)$/)
      if (crearMatch) {
        const out: CronoCambio[] = []
        const fieldRe = /"([^"]+)"\s*:\s*"([^"]*)"/g
        let m: RegExpExecArray | null
        while ((m = fieldRe.exec(crearMatch[1])) !== null) {
          const a = m[2].trim()
          if (a) out.push({ campo: m[1], de: '', a })
        }
        if (out.length) return out
      }
      // Intentar Modificación
      const cambiosMatch = trimmed.match(/"cambios"\s*:\s*\{([\s\S]*)$/)
      if (cambiosMatch) {
        const out: CronoCambio[] = []
        const fieldRe = /"([^"]+)"\s*:\s*\{\s*"antes"\s*:\s*"([^"]*)"\s*,\s*"despues"\s*:\s*"([^"]*)"/g
        let m: RegExpExecArray | null
        while ((m = fieldRe.exec(cambiosMatch[1])) !== null) {
          out.push({ campo: m[1], de: m[2], a: m[3] })
        }
        if (out.length) return out
      }
    }
  }
  // Formato Agregados: "Cambios detectados: campo: de -> a • campo2: ..."
  const m = trimmed.match(/Cambios(?:\s*detectados)?:\s*(.*)$/s)
  if (!m) return []
  const out: CronoCambio[] = []
  for (const part of m[1].split('•').map((s) => s.trim()).filter(Boolean)) {
    const ci = part.indexOf(':')
    if (ci < 0) continue
    const campo = part.slice(0, ci).trim()
    if (!campo) continue
    const rest = part.slice(ci + 1).trim()
    const ai = rest.indexOf('->')
    let de = ''
    let a = ''
    if (ai >= 0) {
      de = rest.slice(0, ai).trim()
      a = rest.slice(ai + 2).trim()
    } else {
      a = rest
    }
    if (!a) continue
    out.push({ campo, de, a })
  }
  return out
}

const otTimeline = computed<CronoEvent[]>(() => {
  if (!detalleOT.value) return []
  const ot = detalleOT.value
  const events: CronoEvent[] = []
  const cronos = ot['_cronologia']
  if (Array.isArray(cronos) && cronos.length) {
    for (const c of cronos as { fecha?: unknown; hora?: unknown; usuario?: string; accion?: string; detalle?: string }[]) {
      const det = String(c.detalle ?? '')
      const cambios = parseCronoCambios(det)
      if (!cambios.length) continue
      events.push({
        tipo: cronoTipo(String(c.accion ?? '')),
        accion: String(c.accion ?? 'Cambio'),
        fecha: c.fecha != null ? serialDate(c.fecha) : '',
        hora: c.hora != null ? serialTime(c.hora) : '',
        detalle: det,
        cambios,
        usuario: String(c.usuario ?? ''),
      })
    }
    return events
  }
  return events
})

const otFilterInput = ref('')
const otFilter = ref('')
let otFilterTimer: ReturnType<typeof setTimeout> | undefined
watch(otFilterInput, (v) => {
  clearTimeout(otFilterTimer)
  otFilterTimer = setTimeout(() => { otFilter.value = v }, 200)
})
function estadoClass(e: string): string {
  const v = e.toLowerCase().trim()
  if (v === 'cerrada' || v === 'finalizada') return 'ok'
  if (v === 'abierta' || v === 'pendiente' || v === 'en proceso') return 'warn'
  return ''
}

const ordenesMostradas = computed(() => {
  let arr = [...dataFilteredMain.value]
  const q = otFilter.value.toLowerCase().trim()
  if (q) {
    arr = arr.filter(r =>
      String(r['N\u00ba Orden de Trabajo'] ?? '').toLowerCase().includes(q) ||
      String(r['Tipo de Veh\u00edculo'] ?? '').toLowerCase().includes(q) ||
      String(r['Placa del Veh\u00edculo'] ?? '').toLowerCase().includes(q) ||
      String(r['PROVEEDOR'] ?? '').toLowerCase().includes(q)
    )
  }
  arr.sort((a, b) => Number(b['FECHA']) - Number(a['FECHA']))
  return arr
})

const otTableRows = computed<Record<string, unknown>[]>(() => ordenesMostradas.value.map((r) => ({
  'Nº Orden de Trabajo': r['Nº Orden de Trabajo'] ?? '',
  'Fecha y Hora': otDateTime(r),
  'Estado': r['Estado'] ?? '',
  'PLANTA': r['PLANTA'] ?? '',
  'PROVEEDOR': r['PROVEEDOR'] ?? '',
  'Tipo de Vehículo': r['Tipo de Vehículo'] ?? '',
  'Placa del Vehículo': r['Placa del Vehículo'] ?? '',
  'Costo Total': (Number(r['Costo servicios']) || 0) + (Number(r['Costos Insumos']) || 0),
  ...r,
  _ot: r,
})))

function otDateTime(r: Record<string, unknown>): string {
  const d = serialDate(r['FECHA'])
  const t = serialTime(r['Hora'])
  return `${d}${t ? ' ' + t : ''}`
}

function openOtDetail(row: Record<string, unknown>) {
  detalleOT.value = (row['_ot'] as Record<string, unknown>) ?? null
}

const totalSubs = computed(() => {
  let n = 0
  for (const r of dataFilteredMain.value) {
    const subs = r['_subOrdenes']
    if (Array.isArray(subs)) n += subs.length
  }
  return n
})

const totalSopled = computed(() => {
  let n = 0
  for (const r of dataFilteredMain.value) {
    const s = r['_sopled']
    if (Array.isArray(s)) n += s.length
  }
  return n
})

const otsCostoTotal = computed(() => {
  let t = 0
  for (const r of dataFilteredMain.value) {
    t += Number(r['Costo servicios']) + Number(r['Costos Insumos'])
  }
  return t
})

const estadoCounts = computed(() => {
  let abiertas = 0, cerradas = 0
  for (const r of dataFilteredMain.value) {
    const cls = estadoClass(String(r['Estado'] ?? ''))
    if (cls === 'ok') cerradas++
    else if (cls === 'warn') abiertas++
  }
  return { abiertas, cerradas }
})

const otPctCierre = computed(() => {
  const total = estadoCounts.value.abiertas + estadoCounts.value.cerradas
  return total > 0 ? ((estadoCounts.value.cerradas / total) * 100).toFixed(1) : '0.0'
})

/** Promedio de la duración estimada (Duración_Estimada, en horas). */
const otDuracionEstimadaProm = computed(() => {
  let sum = 0, n = 0
  for (const r of dataFilteredMain.value) {
    const v = r['Duración (horas)']
    if (typeof v === 'number' && !isNaN(v)) { sum += v; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})

/** Promedio real entre Fecha Recepción y Fecha Cierre (en horas) — tiempo de respuesta efectivo. */
const otTiempoRealProm = computed(() => {
  let sum = 0, n = 0
  for (const r of dataFilteredMain.value) {
    const rec = Number(r['Fecha Recepción'])
    const cie = Number(r['Fecha Cierre'])
    if (!isNaN(rec) && !isNaN(cie) && rec > 0 && cie > rec) { sum += (cie - rec) * 24; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})

const localizacionRanking = computed(() => rankBy(dataFilteredMain.value, 'Localización', 12))
const prioridadRanking = computed(() => rankBy(dataFilteredMain.value, 'Prioridad', 6))
const fuenteNovedadRanking = computed(() => rankBy(dataFilteredMain.value, 'Fuente_Novedad', 10))
const otConSopledPct = computed(() => {
  const n = dataFilteredMain.value.length
  if (!n) return '0.0'
  const c = dataFilteredMain.value.filter(r => Array.isArray(r['_sopled']) && (r['_sopled'] as any[]).length).length
  return ((c / n) * 100).toFixed(1)
})

function rankBy(items: Record<string, unknown>[], field: string, limit = Infinity): [string, number][] {
  const map = new Map<string, number>()
  for (const r of items) {
    const label = String(r[field] ?? '').trim()
    if (!label) continue
    map.set(label, (map.get(label) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

/** Igual que rankBy, pero para campos con varios valores separados por coma (ej. varios técnicos en una misma OT): cuenta cada uno por separado. */
function rankByMultiValue(items: Record<string, unknown>[], field: string, limit = Infinity): [string, number][] {
  const map = new Map<string, number>()
  for (const r of items) {
    const raw = String(r[field] ?? '').trim()
    if (!raw) continue
    for (const part of raw.split(',')) {
      const label = part.trim()
      if (!label) continue
      map.set(label, (map.get(label) || 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}

/** Sistemas más intervenidos: cuenta apariciones en las sub-órdenes de cada OT. */
const sistemasRanking = computed(() => {
  const map = new Map<string, number>()
  for (const r of dataFilteredMain.value) {
    const subs = r['_subOrdenes']
    if (!Array.isArray(subs)) continue
    for (const s of subs) {
      const label = String(s?.sistemaTexto || s?.sistema || '').trim()
      if (!label) continue
      map.set(label, (map.get(label) || 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})

/** Costo total por Localización */
const costoTotalLocalizacion = computed(() => {
  const sums = new Map<string, number>()
  for (const r of dataFilteredMain.value) {
    const loc = String(r['Localización'] ?? '').trim()
    if (!loc) continue
    const cost = (Number(r['Costo servicios']) || 0) + (Number(r['Costos Insumos']) || 0)
    sums.set(loc, (sums.get(loc) || 0) + cost)
  }
  return sums
})

/** Costo total por Sistema (distribuido proporcionalmente entre sub-órdenes) */
/** Solicitantes con más órdenes abiertas. */
const solicitantesRanking = computed(() => rankBy(dataFilteredMain.value, 'Solicitante', 10))

/** Responsables de cierre con más órdenes cerradas. */
const responsablesCierreRanking = computed(() => rankBy(dataFilteredMain.value, 'Responsable Cierre', 10))

/** Tipos de trabajo más frecuentes. */
const tiposTrabajoRanking = computed(() => rankBy(dataFilteredMain.value, 'Tipo Trabajo', 10))

/** Clases de mantenimiento más frecuentes. */
const claseMantenimientoRanking = computed(() => rankBy(dataFilteredMain.value, 'Clase Mantenimiento', 10))

/** Motivos de no ejecución más frecuentes (solo OTs que registran un motivo). */
const motivosNoEjecucionRanking = computed(() => rankBy(dataFilteredMain.value.filter(r => String(r['Motivo No Ejecución'] ?? '').trim()), 'Motivo No Ejecución', 10))

/**
 * Personal de intervención: participaciones + horas reales + costo total.
 * Horas reales calculadas entre Fecha Recepción y Fecha Cierre.
 * Costo = Costo servicios + Costos Insumos.
 */
const personalInternoRanking = computed((): { label: string; n: number; horas: number; costo: number }[] => {
  const map = new Map<string, { n: number; horas: number; costo: number }>()
  for (const r of dataFilteredMain.value.filter(isInterno)) {
    const rec = Number(r['Fecha Recepción']) || 0
    const cie = Number(r['Fecha Cierre']) || 0
    const horas = (rec && cie && cie > rec) ? (cie - rec) * 24 : (Number(r['Duración (horas)']) || 0)

    const personalDetalles = r['_personalDetalles']
    if (Array.isArray(personalDetalles) && personalDetalles.length > 0) {
      const nPersonas = personalDetalles.length
      for (const p of personalDetalles) {
        const label = String(p.nombre || '').trim()
        if (!label) continue
        const e = map.get(label) || { n: 0, horas: 0, costo: 0 }
        e.n++
        e.horas += nPersonas > 0 ? horas / nPersonas : horas
        e.costo += Number(p.costo) || 0
        map.set(label, e)
      }
    } else {
      const raw = String(r['Personal'] ?? '').trim()
      if (!raw) continue
      const personas = raw.split(',').map(s => s.trim()).filter(Boolean)
      const costoTotal = Number(r['Costo servicios']) || 0
      const nPersonas = personas.length || 1
      for (const label of personas) {
        const e = map.get(label) || { n: 0, horas: 0, costo: 0 }
        e.n++
        e.horas += horas / nPersonas
        e.costo += costoTotal / nPersonas
        map.set(label, e)
      }
    }
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.n - a.n).slice(0, 10)
})

interface AlmacenItem { referencia: string; descripcion: string; und: string; solicitudes: number; cantidadTotal: number }

/** Productos de almacén más solicitados, agregados desde los ítems de SOPLED de cada OT.
 * Solo respeta el filtro de fechas (no vehículos/proveedor, que pertenecen a la vista de OT).
 * `solicitudes` = número de pedidos (ID_OT_SOLPED) distintos que incluyen el producto. */
const MAX_CANTIDAD = 1000
const almacenItems = computed(() => {
  const map = new Map<string, AlmacenItem>()
  const seen = new Map<string, Set<string>>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const sopId = String(sop?.idSopled ?? '')
      const items = sop?._subSopled
      if (!Array.isArray(items)) continue
      for (const it of items) {
        const ref = String(it?.referencia ?? '').trim()
        const desc = String(it?.descripcionTexto || it?.descripcion || '').trim()
        const key = (ref || desc).toUpperCase()
        if (!key) continue
        // Ignora cantidades erróneas de captura (ej. "RETENEDOR 190X220X15" con CANTIDAD 19022015)
        const cantidad = Number(it?.cantidad) || 0
        if (!(cantidad >= 0 && cantidad <= MAX_CANTIDAD)) continue
        let cur = map.get(key)
        if (!cur) {
          cur = { referencia: ref, descripcion: desc, und: String(it?.und ?? ''), solicitudes: 0, cantidadTotal: 0 }
          map.set(key, cur)
          seen.set(key, new Set<string>())
        }
        if (sopId) seen.get(key)!.add(sopId)
        cur.cantidadTotal += cantidad
      }
    }
  }
  for (const [k, v] of map) v.solicitudes = seen.get(k)?.size ?? 0
  return [...map.values()].sort((a, b) => b.solicitudes - a.solicitudes || b.cantidadTotal - a.cantidadTotal)
})

/** Cabeceras SOPLED aplanadas con contexto de la OT (solo filtro de fechas).
 * Solo se muestran columnas propias del SOPLED (sin datos de la OT ni proveedor). */
const sopledDetailRows = computed(() => {
  const rows: Record<string, unknown>[] = []
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const tipoCompra = String(sop?.tipoCompra ?? '').trim()
      const centroCosto = String(sop?.centroCosto ?? '').trim()
      const proceso = String(sop?.procesoTexto ?? '').trim()
      if (selectedTipoCompra.value.size > 0 && !selectedTipoCompra.value.has(tipoCompra)) continue
      if (selectedCentroCosto.value.size > 0 && !selectedCentroCosto.value.has(centroCosto)) continue
      if (selectedProceso.value.size > 0 && !selectedProceso.value.has(proceso)) continue
      rows.push({
        'No. Pedido': sop?.noPedido ?? '',
        'Tipo Compra': tipoCompra,
        'Proceso': proceso,
        'Solicitante': sop?.solicitanteTexto ?? '',
        'Aprueba': sop?.apruebaTexto ?? '',
        'Ítems': (sop?._subSopled?.length ?? 0),
        'ID (ID_OT_SOLPED)': sop?.idSopled ?? '',
        'Fecha': sop?.fecha != null ? serialDate(sop.fecha) : '',
        'Centro Costo': centroCosto,
        'Cargo Solicitante': sop?.cargSolicitante ?? '',
        'Cargo Aprueba': sop?.cargoAprueba ?? '',
        '_sop': sop,
        '_ot': r,
      })
    }
  }
  return rows
})

/** Total de ítems sub-SOPLED sin aplanar (evita cargar filas de más). */
const sopledTotalItems = computed(() => {
  let n = 0
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) n += (sop?._subSopled?.length ?? 0)
  }
  return n
})

const sopledDetail = ref<{ sop: any; ot: Record<string, unknown>; fromOt?: boolean } | null>(null)

const APPSHEET_APP = 'BasedeDatosOT-Cuncia-786536387-26-07-04'
const APPSHEET_APP_ID = 'e8afdd38-d350-4a2c-b625-7ac50594298f'
const APPSHEET_VIEW_SOPLED = 'Sopled_Detail'
const APPSHEET_VSS_SOPLED = 'H4sIAAAAAAAAA7WSUUvDMBSF_0q5z5nMunZbHrUiQxRRYw-2Q7LmFoJpU9rUOUr_u7fdxkRFZtG35CT3yz3npoZXhZu5FfEL8LA-7m5xCxzqCBbbHCPgEVyZzBZGR8AiuBfpTpwbrWJlK-lIdB5QKmlKZ5ZZLDJTRtBAw_pAc43yOUArlO4gK3aAWCyB13_QGP8HswyUxMyqRGHRPtDiCLyH0XGLIuFHEEUGaWXFWmPntwXtCSeVM3g0xtI1iTRUBoGwgkBpTpI7dP3BcDIY-gvX5ecjfjE-c73RxPP9p65ws4vCk9N1PPXH0FAzv59Xr2w_MU7P8kPhd9l9NcXgpjBVfkliSD9rbgp7WAeYiErbpdBV-9HCVdMmkJi4KlEuyVNfL-Usu37LRSbvjKS2EqFLbN4BIcG-qH4DAAA='
const APPSHEET_VIEW_OT = 'Orden_de_Trabajo_Detail'

const APPSHEET_CONCRETOS_APP = 'SIGMAGraviconSA-Concretos-786536387'
const APPSHEET_CONCRETOS_APP_ID = '761f612d-81a1-4c1d-bf08-8e12fdd48ecf'
const APPSHEET_CONCRETOS_VSS_SOPLED = 'H4sIAAAAAAAAA7WST0vEMBDFv0qZcxGX9WKOWpFFXMXKXppFYjOVYJqU_HFdSr-7k-6KIrJo0VvyMvPLvJf08KJwUwZRPwOr-o_dFW6BQc_hftshB8bh3JrgrOaQc1iKdieWVqtahSgzidktSiWtzxYmoDPWcxhgyKdAO43yocAglB4h6_wdEtAD6_9gMPYPZnNQEk1QjUKXLkg4Au9hdJxQJBwEUWTQxiAeNY5-CTSQ9PvUJjn8wvi5o0-N3ziAO7vZzTCrZ8fz05M59V46G7szEit639K6MK57ouvYGqpd2qN9PFR942SaAQr0NRqpzNP4LwpsRNRhJXRMX6NaDymtxtbRo1yR_6m-_cJcvHbCyGsryUIjtMfhDaGnEFgwAwAA'
const SOPLED_PDF_FOLDER = 'https://drive.google.com/drive/folders/1mdwlJTDy7WBVLqCc-DIYZcUyxPVOn1Pe'
const OT_PDF_FOLDER = 'https://drive.google.com/drive/folders/1w7oEojvR9j5lBCTIZgSNJANlcjdksR_C'

/** Deep link a la app de AppSheet para abrir el detalle de una fila concreta de la tabla Sopled. */
function appSopledUrl(sop: { idSopled?: string }): string {
  const appId = isConcretos.value ? APPSHEET_CONCRETOS_APP_ID : APPSHEET_APP_ID
  const app = isConcretos.value ? APPSHEET_CONCRETOS_APP : APPSHEET_APP
  const vss = isConcretos.value ? APPSHEET_CONCRETOS_VSS_SOPLED : APPSHEET_VSS_SOPLED
  const base = `https://www.appsheet.com/start/${appId}?platform=desktop#appName=${app}&vss=${vss}`
  if (sop?.idSopled) return `${base}&row=${encodeURIComponent(sop.idSopled)}&view=${encodeURIComponent(APPSHEET_VIEW_SOPLED)}`
  return `${base}&view=${encodeURIComponent(APPSHEET_VIEW_SOPLED)}`
}

/** Deep link a la app de AppSheet para abrir el detalle de una OT concreta (row key = ID_OT).
 * Sin vss: los snapshots de AppSheet anclan una fila y pisan el row= dinámico.
 * Igual que Almacén, que funciona con row + view. */
function appOtUrl(ot: { _rowKey?: string }): string {
  const appId = isConcretos.value ? APPSHEET_CONCRETOS_APP_ID : APPSHEET_APP_ID
  const app = isConcretos.value ? APPSHEET_CONCRETOS_APP : APPSHEET_APP
  const base = `https://www.appsheet.com/start/${appId}?platform=desktop#appName=${app}`
  if (ot?._rowKey) return `${base}&row=${encodeURIComponent(ot._rowKey)}&view=${encodeURIComponent(APPSHEET_VIEW_OT)}`
  return `${base}&view=${encodeURIComponent(APPSHEET_VIEW_OT)}`
}

function pdfUrl(path: unknown, table: string, folder: string): string {
  if (typeof path !== 'string' || !path) return folder
  if (/^https?:\/\//i.test(path)) return path
  const app = isConcretos.value ? APPSHEET_CONCRETOS_APP : APPSHEET_APP
  const q = new URLSearchParams({ appName: app, tableName: table, fileName: path })
  return `https://www.appsheet.com/template/gettablefileurl?${q.toString()}`
}

function openSopledDetail(row: Record<string, unknown>) {
  sopledDetail.value = { sop: row['_sop'], ot: row['_ot'] as Record<string, unknown>, fromOt: false }
}
function viewOtFromSopled() {
  if (!sopledDetail.value) return
  const ot = sopledDetail.value.ot
  sopledDetail.value = null
  detalleOT.value = ot
}

/** Cronología de la solicitud: eventos de la hoja Cronología que tocan la SOLPED
 * (misma fuente y formato estructurado que la cronología de la OT). */
const sopledTimeline = computed<CronoEvent[]>(() => {
  const ot = sopledDetail.value?.ot
  if (!ot) return []
  const cronos = ot['_cronologia']
  const events: CronoEvent[] = []
  if (!Array.isArray(cronos)) return events
  for (const c of cronos as { fecha?: unknown; hora?: unknown; usuario?: string; accion?: string; detalle?: string }[]) {
    const det = String(c.detalle ?? '')
    if (!/SOLPED/i.test(det)) continue
    const cambios = parseCronoCambios(det)
    if (!cambios.length) continue
    events.push({
      tipo: cronoTipo(String(c.accion ?? '')),
      accion: String(c.accion ?? 'Cambio'),
      fecha: c.fecha != null ? serialDate(c.fecha) : '',
      hora: c.hora != null ? serialTime(c.hora) : '',
      detalle: det,
      cambios,
      usuario: String(c.usuario ?? ''),
    })
  }
  return events
})

/** Exporta el módulo Almacén a XLSX: hoja 1 = solicitudes, hoja 2 = ítems relacionados por ID. */
function exportSopledXlsx() {
  const headers = ['ID (ID_OT_SOLPED)', 'Fecha', 'No. Pedido', 'Tipo Compra', 'Centro Costo', 'Proceso', 'Solicitante', 'Cargo Solicitante', 'Aprueba', 'Cargo Aprueba', 'Ítems']
  const rows: unknown[][] = []
  const itemsRows: unknown[][] = []
  for (const row of sopledDetailRows.value) {
    const sop = row['_sop'] as { idSopled?: string; noPedido?: string; _subSopled?: { idItem?: string; cantidad: number; referencia: string; descripcion: string; descripcionTexto: string; und: string; observacion: string; motivoNoSalida: string }[] } | undefined
    rows.push([
      sop?.idSopled ?? '',
      row['Fecha'] ?? '',
      row['No. Pedido'] ?? '',
      row['Tipo Compra'] ?? '',
      row['Centro Costo'] ?? '',
      row['Proceso'] ?? '',
      row['Solicitante'] ?? '',
      row['Cargo Solicitante'] ?? '',
      row['Aprueba'] ?? '',
      row['Cargo Aprueba'] ?? '',
      row['Ítems'] ?? 0,
    ])
    for (const it of (sop?._subSopled ?? [])) {
      itemsRows.push([
        it.idItem ?? '',
        sop?.idSopled ?? '',
        sop?.noPedido ?? '',
        it.cantidad,
        it.referencia ?? '',
        it.descripcionTexto || it.descripcion || '',
        it.und ?? '',
        it.observacion ?? '',
      ])
    }
  }
const blob = buildXlsx([
    { name: 'Solicitudes', headers, rows },
    { name: 'Ítems', headers: ['ID Ítem (ID_Ot_Sub_SOLPED)', 'ID Solicitud (ID_OT_SOLPED)', 'No. Pedido', 'Cantidad', 'Referencia', 'Descripción', 'U. Medida', 'Observaciones'], rows: itemsRows },
  ])
  downloadXlsx(blob, `Almacen-SOPLED-${plantaLabel.value}.xlsx`)
}

function exportOtXlsx() {
  const tableRows = otTableRows.value
  const exclude = new Set(['_ot', '_subOrdenes', 'FECHA', 'Hora', 'Costo servicios', 'Costos Insumos'])
  const headers: string[] = tableRows.length
    ? Object.keys(tableRows[0]).filter((k) => !exclude.has(k))
    : []
  const rows: unknown[][] = []
  const subRows: unknown[][] = []
  for (const [, r] of tableRows.entries()) {
    const nro = r['Nº Orden de Trabajo'] ?? ''
    rows.push(headers.map((h) => r[h] ?? ''))
    const subs = (r['_subOrdenes'] as { sistema?: string; sistemaTexto?: string; descripcion?: string }[] | undefined) ?? []
    for (const s of subs) {
      subRows.push([nro, s.sistema ?? '', s.sistemaTexto ?? '', s.descripcion ?? ''])
    }
  }
  const sheets: { name: string; headers: string[]; rows: unknown[][] }[] = [
    { name: 'Órdenes de Trabajo', headers, rows },
  ]
  if (subRows.length) {
    sheets.push({ name: 'Sub-Órdenes', headers: ['Nº Orden de Trabajo', 'Sistema', 'Sistema Texto', 'Descripción del Trabajo'], rows: subRows })
  }
  const blob = buildXlsx(sheets)
  downloadXlsx(blob, `Ordenes-de-Trabajo-${plantaLabel.value}.xlsx`)
}

function almacenLabel(it: AlmacenItem): string {
  const d = it.descripcion || it.referencia
  return d.length > 28 ? d.slice(0, 26) + '…' : d
}
const almacenSolicitudesRanking = computed<[string, number][]>(() =>
  almacenItems.value.slice(0, 10).map(it => [almacenLabel(it), it.solicitudes])
)
/** Datos enriquecidos para el tooltip de cantidad (cantidad + nº de solicitudes + unidad). */
const almacenCantidadDetalle = computed(() =>
  [...almacenItems.value].sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 10).map(it => ({
    name: almacenLabel(it),
    value: Math.round(it.cantidadTotal * 100) / 100,
    solicitudes: it.solicitudes,
    und: it.und,
  }))
)
const almacenCantidadOpt = computed(() => {
  const items = almacenCantidadDetalle.value
  const barData = items.map((d, i) => ({ value: d.value, itemStyle: { color: palette[i % palette.length] } }))
  const valueTexts = items.map(d => Math.round(d.value).toLocaleString('es-CO'))
  const layout = hBarLayout(items.map(e => e.name), hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
  color: palette,
  tooltip: { trigger: 'item' as const, formatter: (p: any) => {
    const det = items.find(d => d.name === p.name)
    const und = det?.und ? ` ${det.und}` : ''
    return `${p.name}<br/>Cantidad: ${Number(p.value).toLocaleString('es-CO')}${und}<br/>Solicitudes: ${det?.solicitudes ?? ''}`
  } },
  grid: hBarGrid(layout.labelSpace, layout.valueSpace),
  xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  yAxis: { type: 'category' as const, data: items.map(e => e.name), axisLabel: hBarAxisLabel(layout.labelSpace) },
  series: [{
    name: 'Cantidad',
    type: 'bar',
    data: barData,
    barWidth: '60%',
    label: { show: true, position: 'right' as const, fontWeight: 700 as const, fontSize: 11, color: chartTextColor.value, formatter: (p: any) => p.value.toLocaleString('es-CO') },
    itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
  }],
  })
})

/** Valor por centro de costo (participación porcentual del costo de insumos en el almacén). */
const almacenCentroCostoValor = computed(() => {
  const map = new Map<string, number>()
  for (const r of filteredData.value) {
    const costoOt = Number(r['Costos Insumos']) || 0
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      if (!Array.isArray(sop?._subSopled)) continue
      if (!(sop._subSopled?.length)) continue
      const cc = String(sop?.centroCosto ?? '').trim()
      const key = cc || 'Sin centro de costo'
      // el costo de la OT se reparte entre todos sus SOPLED con ítems
      map.set(key, (map.get(key) ?? 0) + costoOt / (sops.filter(s => Array.isArray(s._subSopled) && s._subSopled.length).length || 1))
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v * 100) / 100] as [string, number])
})

function buildPieOpt(entries: [string, number][], _title: string, sum: number, money = true) {
  const data = entries.slice(0, 8).map(([name, value]) => ({ name, value }))
  void sum
  const fmtVal = (v: number) => money ? '$' + v.toLocaleString('es-CO') : String(v)
  return {
    color: palette,
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${fmtVal(Number(p.value))} (${p.percent}%)` },
    legend: { type: 'scroll' as const, orient: 'vertical' as const, right: 10, top: 10, textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['38%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => p.percent + '%', fontSize: 10 },
      data,
    }],
  }
}

/** Torta de conteos (solicitudes/aprobaciones) con un color distinto por segmento. */
function buildCountPieOpt(entries: [string, number][], withTotal = true) {
  const data = entries.slice(0, 8).map(([name, value]) => ({ name, value }))
  const total = data.reduce((s, d) => s + d.value, 0)
  void withTotal
  return {
    color: palette,
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${Number(p.value).toLocaleString('es-CO')} (${p.percent}%)` },
    legend: { type: 'scroll' as const, orient: 'vertical' as const, right: 10, top: 10, textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 } },
    graphic: [{
      type: 'text' as const, left: '38%', top: '50%', style: { text: String(total), textAlign: 'center', fill: chartTextColor.value, fontWeight: 700, fontSize: 18 },
    }],
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['38%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => p.percent + '%', fontSize: 10 },
      data,
    }],
  }
}
const almacenCentroCostoPieOpt = computed(() => markRaw(buildPieOpt(almacenCentroCostoValor.value, 'Valor por Centro de Costo', 0)))

/** Conteo de solicitudes por Tipo de Compra (para KPIs). key = tipoCompra. */
const almacenTipoCompra = computed(() => {
  const map = new Map<string, number>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const t = String(sop?.tipoCompra ?? '').trim()
      const key = t || 'Sin tipo'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})
const almacenTipoCompraColors: Record<string, string> = {
  'Urgente': '#EF4444',
  'Normal': '#10B981',
  'Sin tipo': '#94a3b8',
}
const almacenTipoCompraIcons: Record<string, string> = {
  'Urgente': 'zap',
  'Normal': 'check-circle',
  'Sin tipo': 'clock',
}

/** Quiénes solicitan más (solicitante de cada pedido de almacén). */
const almacenSolicitantesRanking = computed(() => rankBy(sopledDetailRows.value, 'Solicitante', 10))

/** Quiénes aprueban más pedidos. */
const almacenApruebaRanking = computed(() => rankBy(sopledDetailRows.value, 'Aprueba', 10))

/** Motivos de no salida (solo ítems que registran un motivo). */
const almacenMotivosNoSalidaRanking = computed(() => {
  const map = new Map<string, number>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const items = sop?._subSopled
      if (!Array.isArray(items)) continue
      for (const it of items) {
        const m = String(it?.motivoNoSalida ?? '').trim()
        if (!m) continue
        map.set(m, (map.get(m) ?? 0) + 1)
      }
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})

/** Localización (línea) que más solicita salida de almacén. */
const almacenLocalizacionRanking = computed(() => {
  const map = new Map<string, number>()
  for (const r of sopledDetailRows.value) {
    const loc = String((r['_ot'] as Record<string, unknown>)?.['Localización'] ?? '').trim() || 'Sin localización'
    map.set(loc, (map.get(loc) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
})

/** Solicitudes por día (etiquetas + serie) para la gráfica de líneas diaria. */
const almacenDiario = computed(() => {
  const map = new Map<string, number>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      if (sop?.fecha == null) continue
      const d = new Date((Number(sop.fecha) - 25569) * 86400 * 1000)
      if (isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  const labels = [...map.keys()].sort()
  const short = labels.map(l => {
    const [y, m, day] = l.split('-')
    const d = new Date(Number(y), Number(m) - 1, Number(day))
    return `${Number(day)} ${d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`
  })
  const vals = labels.map(l => map.get(l) ?? 0)
  return { labels: short, vals }
})
const almacenDiarioOpt = computed(() => markRaw({
  color: [palette[1]],
  tooltip: { trigger: 'axis' as const },
  grid: { left: 40, right: 20, bottom: 40, top: 30, containLabel: true },
  xAxis: { type: 'category' as const, data: almacenDiario.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, interval: Math.ceil(almacenDiario.value.labels.length / 12) } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  series: [{
    name: 'Solicitudes', type: 'line', smooth: true, data: almacenDiario.value.vals,
    areaStyle: { opacity: 0.25 }, label: labelLine.value,
  }],
}))

const ordenesDiarias = computed(() => {
  const map = new Map<string, { abiertas: number; cerradas: number; costoAbiertas: number; costoCerradas: number }>()
  for (const r of dataFilteredMain.value) {
    const v = Number(r['FECHA'])
    if (!v) continue
    const d = new Date((v - 25569) * 86400 * 1000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    const e = map.get(key) ?? { abiertas: 0, cerradas: 0, costoAbiertas: 0, costoCerradas: 0 }
    const cls = estadoClass(String(r['Estado'] ?? ''))
    const cost = (Number(r['Costo servicios']) || 0) + (Number(r['Costos Insumos']) || 0)
    if (cls === 'ok') { e.cerradas++; e.costoCerradas += cost }
    else if (cls === 'warn') { e.abiertas++; e.costoAbiertas += cost }
    map.set(key, e)
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const labels: string[] = []
  const totals: number[] = []
  const abiertas: number[] = []
  const cerradas: number[] = []
  const costAb: number[] = []
  const costCer: number[] = []
  for (const [k, v] of sorted) {
    const d = new Date(k + 'T00:00:00Z')
    labels.push(d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    totals.push(v.abiertas + v.cerradas)
    abiertas.push(v.abiertas)
    cerradas.push(v.cerradas)
    costAb.push(v.costoAbiertas)
    costCer.push(v.costoCerradas)
  }
  return { labels, totals, abiertas, cerradas, costAb, costCer }
})

const ordenesDiariasOpt = computed(() => markRaw({
  color: ['#3B82F6'],
  tooltip: {
    trigger: 'axis' as const,
    formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params
      const dia = p.name ?? ''
      const idx = p.dataIndex ?? 0
      const total = Number(p.value) || 0
      const ab = ordenesDiarias.value.abiertas[idx] ?? 0
      const ce = ordenesDiarias.value.cerradas[idx] ?? 0
      const costAb = ordenesDiarias.value.costAb[idx] ?? 0
      const costCer = ordenesDiarias.value.costCer[idx] ?? 0
      return `<b>${dia}</b><br/>` +
        `<span style="color:#EF4444">\u25CF</span> Abiertas: <b>${ab}</b> — $${Math.round(costAb).toLocaleString('es-CO')}<br/>` +
        `<span style="color:#10B981">\u25CF</span> Cerradas: <b>${ce}</b> — $${Math.round(costCer).toLocaleString('es-CO')}<br/>` +
        `<span style="color:#3B82F6">\u25CF</span> Total: <b>${total}</b> — $${Math.round(costAb + costCer).toLocaleString('es-CO')}`
    },
  },
  grid: { left: 40, right: 20, bottom: 40, top: 30, containLabel: true },
  xAxis: { type: 'category' as const, data: ordenesDiarias.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, interval: Math.ceil(ordenesDiarias.value.labels.length / 12) } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  series: [{
    name: 'Órdenes', type: 'line', smooth: true, data: ordenesDiarias.value.totals,
    areaStyle: { opacity: 0.25 }, label: labelLine.value,
  }],
}))

const almacenColWidths: Record<string, string> = {
  'ID (ID_OT_SOLPED)': '120px',
  'Fecha': '100px',
  'No. Pedido': '100px',
  'Tipo Compra': '140px',
  'Centro Costo': '140px',
  'Proceso': '170px',
  'Solicitante': '160px',
  'Cargo Solicitante': '150px',
  'Aprueba': '160px',
  'Cargo Aprueba': '150px',
  'Ítems': '60px',
}

const otColWidths: Record<string, string> = {
  'Nº Orden de Trabajo': '110px',
  'Fecha y Hora': '140px',
  'Estado': '110px',
  'PLANTA': '90px',
  'PROVEEDOR': '220px',
  'Tipo de Vehículo': '170px',
  'Placa del Vehículo': '110px',
  'Costo Total': '120px',
  'Duración (horas)': '120px',
  'Motivo No Ejecución': '200px',
  'Observaciones': '240px',
}

const palette = ['#15223c', '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#A855F7']

const { theme } = useTheme()
const viewportW = useViewportWidth()
const chartTextColor = computed(() => theme.value === 'light' ? '#475569' : '#94a3b8')
const labelLine = computed(() => ({
  show: true,
  formatter: (p: any) => typeof p.value === 'number' ? p.value.toLocaleString('es-CO') : p.value,
  fontSize: 11,
  fontWeight: 600 as const,
  color: theme.value === 'light' ? '#334155' : '#e2e8f0',
  backgroundColor: theme.value === 'light' ? 'rgba(255,255,255,.92)' : 'rgba(11,15,26,.88)',
  padding: [2, 6] as [number, number],
  borderRadius: 4,
  overflow: 'breakAll' as const,
}))
const labelLineCurrency = computed(() => ({
  ...labelLine.value,
  formatter: (p: any) => '$' + Math.round(Number(p.value)).toLocaleString('es-CO'),
}))

const mant = useMantenimientoStore()
const prod = useProduccionStore()
const concretoStore = useConcretoStore()

const loading = computed(() => mant.loading || prod.loading || concretoStore.loading)
const error = computed(() => mant.error || prod.error)

const fechaInicio = ref('')
const fechaFin = ref('')
const selectedVehiculos = ref<Set<string>>(new Set())
const selectedProveedores = ref<Set<string>>(new Set())
const selectedEstados = ref<Set<string>>(new Set())
const selectedPersonalInterno = ref<Set<string>>(new Set())

/* ── INFORME OFICIAL DE GESTIÓN DE OT (Vista previa + PDF nítido en el cliente) ── */
const informeMinSerial = computed(() => {
  const all = dataFilteredMain.value
  if (!all.length) return null
  const serials = all.map(r => Number(r['FECHA'])).filter(v => typeof v === 'number' && !isNaN(v) && v > 0)
  return serials.length ? Math.min(...serials) : null
})
const informeMaxSerial = computed(() => {
  const all = dataFilteredMain.value
  if (!all.length) return null
  const serials = all.map(r => Number(r['FECHA'])).filter(v => typeof v === 'number' && !isNaN(v) && v > 0)
  return serials.length ? Math.max(...serials) : null
})
const informeDesde = computed(() => {
  if (fechaInicio.value) return fechaInicio.value
  if (informeMinSerial.value) return serialToDate(informeMinSerial.value).toISOString().slice(0, 10)
  return ''
})
const informeHasta = computed(() => {
  if (fechaFin.value) return fechaFin.value
  if (informeMaxSerial.value) return serialToDate(informeMaxSerial.value).toISOString().slice(0, 10)
  return informeDesde.value
})
const informeRows = computed(() => {
  return [...dataFilteredMain.value].sort((a, b) => Number(a['FECHA']) - Number(b['FECHA']))
})
const repRows = informeRows
const repReferencia = computed(() => `${new Date().getFullYear()}-${plantaLabel.value.toUpperCase()}`)
/** Tipo de mantenimiento activo en la pestaña: Planta o Maquinaria (por defecto Planta). */
const repTipoLabel = computed(() => tipoTab.value === 'planta' ? 'Planta' : 'Maquinaria')
const isPlanta = computed(() => tipoTab.value === 'planta')
const repSectionLabelPlanta = computed(() => isPlanta.value ? 'Línea' : 'Planta')
const repSectionLabelMaquinaria = computed(() => isPlanta.value ? 'Equipo Planta' : 'Maquinaria')
const repSectionLabelVehiculo = computed(() => isPlanta.value ? 'Equipo Planta' : 'Vehículo')

const repAbiertas = computed(() => repRows.value.filter(r => estadoClass(String(r['Estado'] ?? '')) === 'warn').length)
const repCerradas = computed(() => repRows.value.filter(r => estadoClass(String(r['Estado'] ?? '')) === 'ok').length)
/** OTs cerradas cuya fecha de cierre cae dentro del rango del informe. */
const repCerradasMes = computed(() => {
  if (!informeMaxSerial.value) return repCerradas.value
  let n = 0
  for (const r of repRows.value) {
    if (estadoClass(String(r['Estado'] ?? '')) !== 'ok') continue
    const c = Number(r['Fecha Cierre'])
    if (c && c === informeMaxSerial.value) n++
  }
  return n || repCerradas.value
})
const repCostoTotal = computed(() => repRows.value.reduce((s, r) => s + rowServicios(r) + rowInsumos(r), 0))
const repPctCierre = computed(() => {
  const total = repAbiertas.value + repCerradas.value
  return total > 0 ? Math.round((repCerradas.value / total) * 100) : 0
})
function repPct(part: number): number {
  return repCostoTotal.value > 0 ? Math.round((part / repCostoTotal.value) * 100) : 0
}

/** Cuenta por categoría según una llave calculada por fila. */
function groupCount(rows: Record<string, unknown>[], keyFn: (r: Record<string, unknown>) => string, limit = 8): { label: string; n: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const label = keyFn(r)
    if (!label) continue
    map.set(label, (map.get(label) || 0) + 1)
  }
  return [...map.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, limit)
}

/** Agrupa por campo acumulando nº de OTs y costo (servicios + insumos). */
function groupCosto(rows: Record<string, unknown>[], field: string, limit = 12, multi = false): { label: string; n: number; costo: number }[] {
  const map = new Map<string, { n: number; costo: number }>()
  for (const r of rows) {
    const raw = String(r[field] ?? '').trim()
    if (!raw) continue
    const parts = multi ? raw.split(/[,;]/) : [raw]
    for (const part of parts) {
      const label = part.trim()
      if (!label) continue
      const e = map.get(label) ?? { n: 0, costo: 0 }
      e.n++
      e.costo += rowServicios(r) + rowInsumos(r)
      map.set(label, e)
    }
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.costo - a.costo).slice(0, limit)
}

/** Extrae un tipo corto de la descripción de planta/maquinaria (ej. "CARGADOR : 950…" → "CARGADOR"). */
function vehTypeLabel(text: string): string {
  const t = text.trim()
  const colon = t.indexOf(':')
  const cut = colon > 0 ? t.slice(0, colon) : t
  return cut.trim() || t || 'SIN TIPO'
}

/** Índice de cierre: OTs agrupadas por responsable de cierre. */
const repIndiceCierre = computed(() => rankBy(repRows.value, 'Responsable Cierre', 8).map(([label, n]) => ({ label, n })))

/** Índice de cierre filtrado (sin filtro adicional). */
const repIndiceCierreFiltrado = computed(() =>
  repIndiceCierre.value.filter(c => c.label)
)

/** Índice de apertura: OTs agrupadas por la persona que las abrió (solicitante). */
const repIndiceApertura = computed(() => groupCount(repRows.value, r => String(r['Solicitante'] ?? '').trim(), 8))

/** Costo acumulado por planta (Localización) y maquinaria (tipo de vehículo). */
const repCostoPlanta = computed(() => {
  const map = new Map<string, { planta: string; maquina: string; n: number; costo: number }>()
  for (const r of repRows.value) {
    const planta = String(r['Localización'] ?? '').trim() || 'SIN PLANTA'
    const maquina = String(r['Placa del Vehículo'] ?? '').trim() || vehTypeLabel(String(r['Tipo de Vehículo'] ?? ''))
    const key = planta + '|' + maquina
    const e = map.get(key) ?? { planta, maquina, n: 0, costo: 0 }
    e.n++
    e.costo += rowServicios(r) + rowInsumos(r)
    map.set(key, e)
  }
  return [...map.values()].sort((a, b) => b.costo - a.costo).slice(0, 14)
})

/** Costo acumulado por placa de vehículo. */
const repCostoTipoVeh = computed(() => {
  const map = new Map<string, { n: number; costo: number }>()
  for (const r of repRows.value) {
    const label = String(r['Placa del Vehículo'] ?? '').trim() || vehTypeLabel(String(r['Tipo de Vehículo'] ?? ''))
    const e = map.get(label) ?? { n: 0, costo: 0 }
    e.n++
    e.costo += rowServicios(r) + rowInsumos(r)
    map.set(label, e)
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.costo - a.costo).slice(0, 12)
})

/** Top 5 vehículos con mayor consumo y horas acumuladas en taller. */
const repTopVehiculos = computed(() => {
  const map = new Map<string, { placa: string; n: number; costo: number; dias: number }>()
  for (const r of repRows.value) {
    const placa = String(r['Placa del Vehículo'] ?? '').trim() || vehTypeLabel(String(r['Tipo de Vehículo'] ?? ''))
    const e = map.get(placa) ?? { placa, n: 0, costo: 0, dias: 0 }
    e.n++
    e.costo += rowServicios(r) + rowInsumos(r)
    const d = Number(r['Duración (horas)'])
    if (!Number.isNaN(d) && d > 0) e.dias += d
    map.set(placa, e)
  }
  return [...map.values()].sort((a, b) => b.costo - a.costo).slice(0, 5)
})

/** Costos por proveedores internos (Gravicon) y externos. */
const repCostosProv = computed(() => {
  let interno = 0, externo = 0, nInt = 0, nExt = 0
  for (const r of repRows.value) {
    const c = rowServicios(r) + rowInsumos(r)
    if (isInterno(r)) { interno += c; nInt++ } else { externo += c; nExt++ }
  }
  const total = interno + externo
  return {
    interno, externo, nInt, nExt, total,
    pctInt: total ? Math.round((interno / total) * 100) : 0,
    pctExt: total ? Math.round((externo / total) * 100) : 0,
  }
})

/** Ranking de proveedores con mayor uso (nº de OT y acumulado $). */
const repRankProveedores = computed(() => groupCosto(repRows.value, 'PROVEEDOR', 10))

/** Ranking por persona: OTs realizadas y acumulado $. */
const repRankPersonas = computed(() => {
  const map = new Map<string, { n: number; costo: number }>()
  for (const r of repRows.value) {
    const raw = String(r['Personal'] ?? '').trim() || String(r['Responsable Cierre'] ?? '').trim() || String(r['Solicitante'] ?? '').trim()
    for (const part of raw.split(/[,;]/)) {
      const label = part.trim()
      if (!label) continue
      const e = map.get(label) ?? { n: 0, costo: 0 }
      e.n++
      e.costo += rowServicios(r) + rowInsumos(r)
      map.set(label, e)
    }
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.costo - a.costo).slice(0, 10)
})

/** Personal interno de intervención: costo servicios y duración estimada. */
const repPersonalInterno = computed(() => {
  const map = new Map<string, { n: number; costoServ: number; horas: number }>()
  for (const r of repRows.value.filter(isInterno)) {
    const raw = String(r['Personal'] ?? '').trim() || String(r['Responsable Cierre'] ?? '').trim()
    const personas = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    const costoServ = Number(r['Costo servicios']) || 0
    const horas = Number(r['Duración (horas)']) || 0
    const n = personas.length || 1
    for (const label of personas) {
      const e = map.get(label) || { n: 0, costoServ: 0, horas: 0 }
      e.n++
      e.costoServ += costoServ / n
      e.horas += horas / n
      map.set(label, e)
    }
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.costoServ - a.costoServ).slice(0, 10)
})

/** Distribución del mantenimiento correctivo / preventivo (Clase de Mantenimiento). */
const repClaseMant = computed(() => {
  let correctivo = 0, preventivo = 0, otros = 0
  for (const r of repRows.value) {
    const v = String(r['Clase Mantenimiento'] ?? '').trim().toUpperCase()
    if (v.includes('CORRECTIVO')) correctivo++
    else if (v.includes('PREVENTIVO')) preventivo++
    else otros++
  }
  const total = correctivo + preventivo + otros
  const pctCor = total ? Math.round((correctivo / total) * 100) : 0
  const pctPrev = total ? Math.round((preventivo / total) * 100) : 0
  return { correctivo, preventivo, otros, total, pctCor, pctPrev, pctOtro: total ? 100 - pctCor - pctPrev : 0 }
})

/** Ranking de sistemas con mayor intervención a partir de las sub-órdenes de cada OT. */
const repRankSistemas = computed(() => {
  const map = new Map<string, number>()
  for (const r of repRows.value) {
    const subs = r['_subOrdenes']
    if (!Array.isArray(subs)) continue
    for (const s of subs as { sistema?: string; sistemaTexto?: string }[]) {
      const label = String(s?.sistemaTexto || s?.sistema || '').trim()
      if (!label) continue
      map.set(label, (map.get(label) || 0) + 1)
    }
  }
  return [...map.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 8)
})

/** Ranking de elementos de almacén más solicitados (suma de cantidades en sub-solped). */
const repRankAlmacen = computed(() => {
  const map = new Map<string, { n: number; und: string }>()
  for (const r of repRows.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops as { _subSopled?: { descripcion?: string; descripcionTexto?: string; cantidad?: number; und?: string }[] }[]) {
      const items = sop?._subSopled
      if (!Array.isArray(items)) continue
      for (const it of items) {
        const label = String(it?.descripcionTexto || it?.descripcion || '').trim()
        if (!label) continue
        const e = map.get(label) ?? { n: 0, und: String(it?.und ?? '').trim() }
        e.n += Number(it?.cantidad) || 1
        map.set(label, e)
      }
    }
  }
  return [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.n - a.n).slice(0, 8)
})

const repLectura = computed(() => {
  const list: string[] = []
  const total = repRows.value.length
  list.push(`Entre el ${informeDesde.value} y el ${informeHasta.value} se gestionaron ${total} órdenes de trabajo: ${repCerradas.value} cerradas y ${repAbiertas.value} abiertas (índice de cierre ${repPctCierre.value}%).`)
  list.push(`El costo acumulado del período ascendió a ${$$(repCostoTotal.value)}: ${$$(repCostosProv.value.interno)} (${repCostosProv.value.pctInt}%) en proveedores internos y ${$$(repCostosProv.value.externo)} (${repCostosProv.value.pctExt}%) en proveedores externos.`)
  if (repClaseMant.value.total > 0) list.push(`La ejecución se distribuyó en ${repClaseMant.value.pctCor}% correctivo, ${repClaseMant.value.pctPrev}% preventivo y ${repClaseMant.value.pctOtro}% de otras clasificaciones.`)
  const top = repTopVehiculos.value[0]
  if (top) list.push(`El ${repSectionLabelVehiculo.value.toLowerCase()} con mayor consumo fue ${top.placa} con ${$$(top.costo)} y ${fmtDuracion(top.dias) || '—'} en taller.`)
  if (repAbiertas.value > 0) list.push(`Existen ${repAbiertas.value} OT abiertas; se recomienda dar seguimiento prioritario a su cierre administrativo u operativo.`)
  else list.push('No hay OT abiertas en el período: el cierre de las órdenes se mantiene al día.')
  return list
})

const informeAnalisisTexto = computed(() => {
  const total = repRows.value.length
  const desde = informeDesde.value
  const hasta = informeHasta.value
  const costo = $$(repCostoTotal.value)
  const pctCierre = repPctCierre.value
  const abiertas = repAbiertas.value
  const cerradas = repCerradas.value
  const top = repTopVehiculos.value[0]

  let texto = `Consolidado de Mantenimiento <strong>${plantaLabel.value}</strong>: Evaluación ejecutiva de órdenes de trabajo para el período del <strong>${desde}</strong> al <strong>${hasta}</strong>. `
  texto += `Volumen total intervenido: <strong>${total} órdenes de trabajo</strong> (${cerradas} cerradas y ${abiertas} abiertas), logrando una tasa de efectividad de cierre del <strong>${pctCierre}%</strong>. `
  texto += `Inversión acumulada: <strong>${costo}</strong>, ejecutada en ${$$(repCostosProv.value.interno)} (${repCostosProv.value.pctInt}%) mediante recursos internos de Gravicon y ${$$(repCostosProv.value.externo)} (${repCostosProv.value.pctExt}%) en proveedores externos especializados. `
  if (repClaseMant.value.total > 0) {
    texto += `Distribución operativa: <strong>${repClaseMant.value.pctPrev}% Preventivo</strong> frente a un <strong>${repClaseMant.value.pctCor}% Correctivo</strong>. `
  }
  if (top) {
    texto += `Mayor concentración de costo y permanencia en taller: <strong>${top.placa}</strong> (${$$(top.costo)}${top.dias > 0 ? ` · ${fmtDuracion(top.dias)}` : ''}). `
  }
  if (abiertas > 0) {
    texto += `<br><strong>Seguimiento Prioritario:</strong> Se registran ${abiertas} orden(es) abierta(s) en proceso de atención o cierre administrativo.`
  } else {
    texto += `<br><strong>Gestión al Día:</strong> No se evidencian órdenes abiertas en el período consultado.`
  }
  return texto
})

const generandoPdf = ref(false)

/** Genera el PDF del informe oficial de OT con captura nítida por página (html2canvas + jsPDF) */
async function generarInformePdf() {
  if (generandoPdf.value || !informeRows.value.length) return
  generandoPdf.value = true
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 400))
    const elemento = document.querySelector('.report-paper') as HTMLElement
    if (!elemento) {
      console.error('No se encontró el contenedor del reporte (.report-paper)')
      return
    }
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Forzar tema claro temporalmente para que los colores del PDF salgan vivos y nítidos
    const root = document.documentElement
    const temaPrevio = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    root.classList.add('light')
    root.classList.remove('dark')

    await new Promise(r => requestAnimationFrame(() => r(null)))

    try {
      const pageW = 210
      const pageH = 297
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      function addCanvasToPdf(canvas: HTMLCanvasElement, isFirst: boolean) {
        const imgW = pageW
        const imgH = (canvas.height * imgW) / canvas.width
        const imgData = canvas.toDataURL('image/png')

        if (imgH <= pageH) {
          if (!isFirst) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST')
        } else {
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
      const filename = `Informe_Gestion_OT_${plantaLabel.value}_${informeDesde.value || 'reporte'}_al_${informeHasta.value || 'corte'}.pdf`
      pdf.save(filename)
    } finally {
      if (temaPrevio) {
        root.setAttribute('data-theme', temaPrevio)
        if (temaPrevio === 'dark') {
          root.classList.add('dark')
          root.classList.remove('light')
        }
      }
    }
  } catch (err) {
    console.error('[generarInformePdf]', err)
  } finally {
    generandoPdf.value = false
  }
}

async function loadData(forceRefresh = false) {
  fechaInicio.value = ''
  fechaFin.value = ''
  selectedVehiculos.value = new Set()
  selectedProveedores.value = new Set()
  selectedLineas.value = new Set()
  selectedEstados.value = new Set()
  selectedPersonalInterno.value = new Set()
  selectedTipoCompra.value = new Set()
  selectedCentroCosto.value = new Set()
  selectedProceso.value = new Set()

  if (isConcretos.value) {
    await Promise.all([mant.fetchConcretos(forceRefresh), concretoStore.fetchData()])
  } else if (isAcacias.value) {
    await Promise.all([mant.fetchAcacias(forceRefresh), prod.fetchAcacias()])
  } else {
    await Promise.all([mant.fetchCuncia(forceRefresh), prod.fetchCuncia()])
  }

  const data = allData.value
  if (data?.length) {
    const serials = data.map(r => Number(r['FECHA'])).filter(v => typeof v === 'number' && !isNaN(v) && v > 0)
    if (serials.length) {
      const maxD = serialToDate(Math.max(...serials))
      const hace7 = new Date(maxD)
      hace7.setDate(hace7.getDate() - 7)
      fechaInicio.value = hace7.toISOString().slice(0, 10)
      fechaFin.value = maxD.toISOString().slice(0, 10)
    }
  }
  selectedLineas.value = new Set(lineasDisponibles.value)
  selectedVehiculos.value = new Set(vehiculosDisponibles.value)
  selectedProveedores.value = new Set(proveedoresDisponibles.value)
  selectedEstados.value = new Set(estadosDisponibles.value)
  selectedPersonalInterno.value = new Set(personalInternoOptions)
  selectedTipoCompra.value = new Set(tipoCompraDisponibles.value)
  selectedCentroCosto.value = new Set(centroCostoDisponibles.value)
  selectedProceso.value = new Set(procesoDisponibles.value)

  const countTipo = (raw: Record<string, unknown>[], tipo: string) =>
    raw.filter(r => String(r['Tipo de Mantenimiento'] ?? '').trim().toUpperCase() === tipo).length
  const raw = isConcretos.value ? (mant.concretosData?.rows ?? []) : isAcacias.value ? (mant.acaciasData?.rows ?? []) : (mant.cunciaData?.rows ?? [])
  tipoTabs.value = [
    { id: 'planta', label: 'Planta', count: countTipo(raw, 'PLANTA') },
    { id: 'maquinaria', label: 'Maquinaria', count: countTipo(raw, 'MAQUINARIA') },
    { id: 'disponibilidad', label: 'Disponibilidad', count: raw.length },
  ]
}

onMounted(() => {
  loadData()
})

watch(() => props.planta, () => {
  loadData()
})

watch(tipoTab, () => {
  void nextTick(() => {
    selectedVehiculos.value = new Set(vehiculosDisponibles.value)
    selectedProveedores.value = new Set(proveedoresDisponibles.value)
    selectedLineas.value = new Set(lineasDisponibles.value)
    selectedEstados.value = new Set(estadosDisponibles.value)
    selectedPersonalInterno.value = new Set(personalInternoOptions)
    selectedTipoCompra.value = new Set(tipoCompraDisponibles.value)
    selectedCentroCosto.value = new Set(centroCostoDisponibles.value)
    selectedProceso.value = new Set(procesoDisponibles.value)
  })
})

function fmt(n: number) { return n.toLocaleString('es-CO') }
function $$(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
/** Versión abreviada para KPI cards: muestra $1.2M o $890K en lugar del valor completo */
function $$short(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return '$' + (n / 1_000_000_000).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'B'
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 'K'
  return $$(n)
}
function rowServicios(r: Record<string, unknown>): number {
  return Number(r['Costo servicios']) || 0
}
function rowInsumos(r: Record<string, unknown>): number {
  return Number(r['Costos Insumos']) || 0
}
/** Formatea Duración_Estimada (en días, con decimales largos) a un texto legible. */
function fmtDuracion(v: unknown): string {
  const n = Number(v)
  if (v == null || Number.isNaN(n) || n <= 0) return ''
  if (n < 1) return `${Math.round(n * 60)} min`
  const h = Math.round(n * 10) / 10
  return `${h} h`
}

const cleanedData = computed(() => {
  const rawRows = isConcretos.value ? (mant.concretosData?.rows ?? []) : isAcacias.value ? (mant.acaciasData?.rows ?? []) : (mant.cunciaData?.rows ?? [])
  return rawRows.map(r => {
    const cleanRow: Record<string, any> = {}
    for (const [k, v] of Object.entries(r)) {
      cleanRow[k.trim()] = v
    }
    return cleanRow
  })
})

const allData = computed(() => {
  const base = cleanedData.value.filter(r => {
    const p = String(r['PLANTA'] ?? '').trim().toUpperCase()
    if (isConcretos.value) {
      if (p !== 'CONCRETOS' && p !== '') return false
    } else {
      if (!(isAcacias.value ? p === 'ACACIAS' : (p === 'CUNCIA' || p === 'CUNCA'))) return false
    }
    if (isConcretos.value && props.localizacion) {
      const loc = String(r['Localización'] ?? '').trim().toUpperCase()
      if (loc !== props.localizacion.toUpperCase()) return false
    }
    return true
  })
  // Disponibilidad usa toda la flota sin filtrar por tipo
  if (tipoTab.value === 'disponibilidad') return base
  // Filter by tipo de mantenimiento tab
  if (tipoTab.value === 'planta') {
    return base.filter(r => String(r['Tipo de Mantenimiento'] ?? '').trim().toUpperCase() === 'PLANTA')
  }
  return base.filter(r => String(r['Tipo de Mantenimiento'] ?? '').trim().toUpperCase() === 'MAQUINARIA')
})

const prodRows = computed(() => {
  if (isConcretos.value) return concretoStore.data?.rows ?? []
  if (isAcacias.value) return prod.acaciasData?.rows ?? []
  return prod.cunciaData?.rows ?? []
})

/** Mapeo: Localización de OTs → nombre de columna en producción */
const LOCALIZACION_TO_LINEA: Record<string, string> = {
  'cañaveral': 'Cañaveral',
  'guatubí': 'Guayuriba',
  'guatubi': 'Guayuriba',
  'guayuriba': 'Guayuriba',
  'línea 3': 'Linea 3',
  'linea 3': 'Linea 3',
  'planta cañaveral': 'Cañaveral',
  'planta guatubí': 'Guayuriba',
  'planta guayuriba': 'Guayuriba',
  'planta línea 3': 'Linea 3',
  'planta linea 3': 'Linea 3',
}

function normalizeLocalizacion(loc: string): string {
  const key = loc.trim().toLowerCase()
  return LOCALIZACION_TO_LINEA[key] ?? loc.trim()
}

/** Nombres de columnas de líneas en datos de producción (excluye metadatos) */
const PROD_META_KEYS = ['Fecha', 'Total de M³', 'M³ Proyectado', 'PROVEEDOR', '% Cumplimiento', 'ID_Registro']
const prodLineNames = computed(() => {
  const first = prodRows.value[0]
  if (!first) return [] as string[]
  return Object.keys(first).filter(k => !PROD_META_KEYS.includes(k))
})

const selectedLineas = ref<Set<string>>(new Set())
/** Líneas disponibles: Localización de OTs (+ columnas de producción solo para Agregados) */
const lineasDisponibles = computed(() => {
  const set = new Set<string>()
  for (const r of allData.value) {
    const loc = String(r['Localización'] ?? '').trim()
    if (loc) set.add(normalizeLocalizacion(loc))
  }
  if (!isConcretos.value) {
    for (const ln of prodLineNames.value) set.add(ln)
  }
  return [...set].sort()
})

const selectedTipoCompra = ref<Set<string>>(new Set())
const tipoCompraDisponibles = computed(() => {
  const set = new Set<string>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const v = String(sop?.tipoCompra ?? '').trim()
      if (v) set.add(v)
    }
  }
  return [...set].sort()
})
const selectedCentroCosto = ref<Set<string>>(new Set())
const centroCostoDisponibles = computed(() => {
  const set = new Set<string>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const v = String(sop?.centroCosto ?? '').trim()
      if (v) set.add(v)
    }
  }
  return [...set].sort()
})
const selectedProceso = ref<Set<string>>(new Set())
const procesoDisponibles = computed(() => {
  const set = new Set<string>()
  for (const r of filteredData.value) {
    const sops = r['_sopled']
    if (!Array.isArray(sops)) continue
    for (const sop of sops) {
      const v = String(sop?.procesoTexto ?? '').trim()
      if (v) set.add(v)
    }
  }
  return [...set].sort()
})

/** Producción filtrada por fecha */
const prodFilteredByDate = computed(() => {
  const since = fechaInicio.value ? dateToSerial(fechaInicio.value) : -Infinity
  const until = fechaFin.value ? dateToSerial(fechaFin.value) : Infinity
  return prodRows.value.filter(r => {
    const v = Number(r['Fecha'])
    return typeof v === 'number' && !isNaN(v) && v >= since && v <= until
  })
})

/** Producción filtrada por fecha + línea (suma solo columnas seleccionadas) */
const prodFiltered = computed(() => {
  const rows = prodFilteredByDate.value
  if (isConcretos.value) return rows
  const hasFilter = selectedLineas.value.size > 0 && selectedLineas.value.size !== prodLineNames.value.length
  if (!hasFilter || !prodLineNames.value.length) return rows
  return rows.map(r => {
    let total = 0
    for (const ln of prodLineNames.value) {
      if (selectedLineas.value.has(ln)) total += Number(r[ln]) || 0
    }
    return { ...r, 'Total de M³': total }
  })
})

const filteredData = computed(() => {
  const since = fechaInicio.value ? dateToSerial(fechaInicio.value) : -Infinity
  const until = fechaFin.value ? dateToSerial(fechaFin.value) : Infinity
  return allData.value.filter(r => {
    const v = Number(r['FECHA'])
    return typeof v === 'number' && !isNaN(v) && v >= since && v <= until
  })
})

const vehiculosDisponibles = computed(() => {
  const map = new Set<string>()
  for (const r of filteredData.value) {
    const t = isConcretos.value
      ? String(r['Tipo Vehículo'] ?? '').trim()
      : String(r['Placa del Vehículo'] ?? '').trim()
    if (t) map.add(t)
  }
  return [...map].sort()
})

const proveedoresDisponibles = computed(() => {
  const map = new Set<string>()
  for (const r of filteredData.value) {
    const p = String(r['PROVEEDOR'] ?? '').trim()
    if (p) map.add(p)
  }
  return [...map].sort()
})

const estadosDisponibles = computed(() => {
  const map = new Set<string>()
  for (const r of filteredData.value) {
    const e = String(r['Estado'] ?? '').trim()
    if (e) map.add(e)
  }
  return [...map].sort()
})

const personalInternoOptions = ['Todos', 'Interno', 'Externo']

const hasActiveFilters = computed(() => {
  if (fechaInicio.value || fechaFin.value) return true
  if (selectedLineas.value.size > 0 && selectedLineas.value.size !== lineasDisponibles.value.length) return true
  if (selectedVehiculos.value.size > 0 && selectedVehiculos.value.size !== vehiculosDisponibles.value.length) return true
  if (selectedProveedores.value.size > 0 && selectedProveedores.value.size !== proveedoresDisponibles.value.length) return true
  if (selectedEstados.value.size > 0 && selectedEstados.value.size !== estadosDisponibles.value.length) return true
  if (selectedPersonalInterno.value.size > 0 && selectedPersonalInterno.value.size < personalInternoOptions.length) return true
  if (selectedTipoCompra.value.size > 0 && selectedTipoCompra.value.size !== tipoCompraDisponibles.value.length) return true
  if (selectedCentroCosto.value.size > 0 && selectedCentroCosto.value.size !== centroCostoDisponibles.value.length) return true
  if (selectedProceso.value.size > 0 && selectedProceso.value.size !== procesoDisponibles.value.length) return true
  return false
})

const dataFilteredMain = computed(() => {
  const hasVehiculoFilter = selectedVehiculos.value.size > 0 && selectedVehiculos.value.size !== vehiculosDisponibles.value.length
  const hasProveedorFilter = selectedProveedores.value.size > 0 && selectedProveedores.value.size !== proveedoresDisponibles.value.length
  const hasLineaFilter = selectedLineas.value.size > 0 && selectedLineas.value.size !== lineasDisponibles.value.length
  const hasEstadoFilter = selectedEstados.value.size > 0 && selectedEstados.value.size !== estadosDisponibles.value.length
  const hasPersonalFilter = selectedPersonalInterno.value.size > 0 && selectedPersonalInterno.value.size < personalInternoOptions.length
  if (!hasVehiculoFilter && !hasProveedorFilter && !hasLineaFilter && !hasEstadoFilter && !hasPersonalFilter) return filteredData.value
   return filteredData.value.filter(r => {
    if (hasVehiculoFilter) {
      const vehiculoVal = isConcretos.value
        ? String(r['Tipo Vehículo'] ?? '').trim()
        : String(r['Placa del Vehículo'] ?? '').trim()
      if (!selectedVehiculos.value.has(vehiculoVal)) return false
    }
    if (hasProveedorFilter && !selectedProveedores.value.has(String(r['PROVEEDOR'] ?? '').trim())) return false
    if (hasLineaFilter && !selectedLineas.value.has(normalizeLocalizacion(String(r['Localización'] ?? '')))) return false
    if (hasEstadoFilter && !selectedEstados.value.has(String(r['Estado'] ?? '').trim())) return false
    if (hasPersonalFilter) {
      const esInt = isInterno(r)
      if (selectedPersonalInterno.value.has('Interno') && !esInt) return false
      if (selectedPersonalInterno.value.has('Externo') && esInt) return false
    }
    return true
  })
})

function onDateRangeFilter(range: { from: string | null; to: string | null }) {
  fechaInicio.value = range.from ?? ''
  fechaFin.value = range.to ?? ''
}

function onClearFilters() {
  fechaInicio.value = ''
  fechaFin.value = ''
  selectedLineas.value = new Set(lineasDisponibles.value)
  selectedVehiculos.value = new Set(vehiculosDisponibles.value)
  selectedProveedores.value = new Set(proveedoresDisponibles.value)
  selectedEstados.value = new Set(estadosDisponibles.value)
  selectedPersonalInterno.value = new Set(personalInternoOptions)
  selectedTipoCompra.value = new Set(tipoCompraDisponibles.value)
  selectedCentroCosto.value = new Set(centroCostoDisponibles.value)
  selectedProceso.value = new Set(procesoDisponibles.value)
}

function isInterno(r: Record<string, unknown>): boolean {
  const prov = String(r['PROVEEDOR'] ?? '').trim().toUpperCase()
  return prov.startsWith('GRAVICON INTERNO')
}
function isAcpm(r: Record<string, unknown>): boolean {
  return String(r['Observaciones'] ?? '').trim().toUpperCase().includes('ACPM')
}

const partition = computed(() => {
  const int: Record<string, unknown>[] = []
  const ext: Record<string, unknown>[] = []
  const acpm: Record<string, unknown>[] = []
  for (const r of dataFilteredMain.value) {
    if (isInterno(r)) int.push(r)
    else ext.push(r)
    if (isAcpm(r)) acpm.push(r)
  }
  return { int, ext, acpm }
})

function buildDiarias(rows: Record<string, unknown>[]) {
  const map = new Map<string, { abiertas: number; cerradas: number; costoAbiertas: number; costoCerradas: number }>()
  for (const r of rows) {
    const v = Number(r['FECHA'])
    if (!v) continue
    const d = new Date((v - 25569) * 86400 * 1000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    const e = map.get(key) ?? { abiertas: 0, cerradas: 0, costoAbiertas: 0, costoCerradas: 0 }
    const cls = estadoClass(String(r['Estado'] ?? ''))
    const cost = (Number(r['Costo servicios']) || 0) + (Number(r['Costos Insumos']) || 0)
    if (cls === 'ok') { e.cerradas++; e.costoCerradas += cost }
    else if (cls === 'warn') { e.abiertas++; e.costoAbiertas += cost }
    map.set(key, e)
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const labels: string[] = []; const totals: number[] = []; const abiertas: number[] = []; const cerradas: number[] = []; const costAb: number[] = []; const costCer: number[] = []
  for (const [k, v] of sorted) {
    const d = new Date(k + 'T00:00:00Z')
    labels.push(d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    totals.push(v.abiertas + v.cerradas); abiertas.push(v.abiertas); cerradas.push(v.cerradas); costAb.push(v.costoAbiertas); costCer.push(v.costoCerradas)
  }
  return { labels, totals, abiertas, cerradas, costAb, costCer }
}
function buildDiariasOpt(data: ReturnType<typeof buildDiarias>) {
  return markRaw({
    color: ['#3B82F6'],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const dia = p.name ?? ''; const idx = p.dataIndex ?? 0; const total = Number(p.value) || 0
        return `<b>${dia}</b><br/>` +
          `<span style="color:#EF4444">\u25CF</span> Abiertas: <b>${data.abiertas[idx] ?? 0}</b> — $${Math.round(data.costAb[idx] ?? 0).toLocaleString('es-CO')}<br/>` +
          `<span style="color:#10B981">\u25CF</span> Cerradas: <b>${data.cerradas[idx] ?? 0}</b> — $${Math.round(data.costCer[idx] ?? 0).toLocaleString('es-CO')}<br/>` +
          `<span style="color:#3B82F6">\u25CF</span> Total: <b>${total}</b> — $${Math.round((data.costAb[idx] ?? 0) + (data.costCer[idx] ?? 0)).toLocaleString('es-CO')}`
      },
    },
    grid: { left: 40, right: 20, bottom: 40, top: 30, containLabel: true },
    xAxis: { type: 'category' as const, data: data.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value, interval: Math.ceil(data.labels.length / 12) } },
    yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    series: [{ name: 'Órdenes', type: 'line', smooth: true, data: data.totals, areaStyle: { opacity: 0.25 }, label: labelLine.value }],
  })
}
const ordenesDiariasInt = computed(() => buildDiarias(partition.value.int))
const ordenesDiariasIntOpt = computed(() => buildDiariasOpt(ordenesDiariasInt.value))
const ordenesDiariasExt = computed(() => buildDiarias(partition.value.ext))
const ordenesDiariasExtOpt = computed(() => buildDiariasOpt(ordenesDiariasExt.value))

const dataFilteredNoAcpm = computed(() => dataFilteredMain.value.filter(r => !isAcpm(r)))

const generalKpi = computed(() => {
  let serv = 0, ins = 0
  for (const r of dataFilteredNoAcpm.value) {
    serv += Number(r['Costo servicios']) || 0
    ins += Number(r['Costos Insumos']) || 0
  }
  return { serv, ins, total: serv + ins, count: dataFilteredNoAcpm.value.length }
})

function monthLabelFromSerial(s: number): string {
  const d = new Date((s - 25569) * 86400 * 1000)
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

const totalProd = computed(() => {
  let t = 0
  for (const r of prodFiltered.value) {
    t += Number((r as Record<string, unknown>)['Total de M³']) || Number((r as Record<string, unknown>)['Cant. Concreto']) || 0
  }
  return t
})

const prodMapByMonth = computed(() => {
  const map = new Map<string, number>()
  for (const r of prodFiltered.value) {
    const f = Number((r as Record<string, unknown>)['Fecha'])
    if (!f) continue
    const key = monthLabelFromSerial(f)
    const m3 = Number((r as Record<string, unknown>)['Total de M³']) || Number((r as Record<string, unknown>)['Cant. Concreto']) || 0
    map.set(key, (map.get(key) || 0) + m3)
  }
  return map
})

function aggMonthly(rows: Record<string, unknown>[], prodMap?: Map<string, number>, includeProd = false) {
  const map = new Map<string, { serv: number; ins: number; first: number }>()
  for (const r of rows) {
    const f = Number(r['FECHA'])
    if (!f) continue
    const key = monthLabelFromSerial(f)
    const e = map.get(key)
    if (e) {
      e.serv += Number(r['Costo servicios']) || 0
      e.ins += Number(r['Costos Insumos']) || 0
      if (f < e.first) e.first = f
    } else {
      map.set(key, { serv: Number(r['Costo servicios']) || 0, ins: Number(r['Costos Insumos']) || 0, first: f })
    }
  }
  const sorted = [...map.entries()].sort((a, b) => a[1].first - b[1].first)
  const labels: string[] = []
  const serv: number[] = []
  const ins: number[] = []
  const vals: number[] | undefined = includeProd && prodMap ? [] : undefined
  for (const [k, v] of sorted) {
    labels.push(k); serv.push(v.serv); ins.push(v.ins)
    if (vals !== undefined && prodMap) {
      const p = prodMap.get(k) || 0
      vals.push(p > 0 ? (v.serv + v.ins) / p : 0)
    }
  }
  return { labels, serv, ins, vals }
}

const totalGeneral = computed(() => generalKpi.value.total)
const servicios = computed(() => generalKpi.value.serv)
const insumos = computed(() => generalKpi.value.ins)
const costoM3 = computed(() => totalProd.value > 0 ? generalKpi.value.total / totalProd.value : 0)
const totalOrdenes = computed(() => generalKpi.value.count)

const monthlyGen = computed(() => aggMonthly(dataFilteredNoAcpm.value))
const costosMensualOpt = computed(() => markRaw({
  color: [palette[1], '#EF4444'],
  tooltip: {
    trigger: 'axis' as const,
    formatter: (params: any) => {
      const arr = Array.isArray(params) ? params : [params]
      const mes = arr[0]?.name ?? ''
      let serv = 0, ins = 0
      for (const p of arr) {
        const v = Number(p.value) || 0
        if (p.seriesName === 'Servicios') serv = v
        else ins = v
      }
      const total = serv + ins
      return `<b>${mes}</b><br/>` +
        `<span style="color:${palette[1]}">\u25CF</span> Servicios: <b>$${Math.round(serv).toLocaleString('es-CO')}</b><br/>` +
        `<span style="color:#EF4444">\u25CF</span> Insumos: <b>$${Math.round(ins).toLocaleString('es-CO')}</b><br/>` +
        `<span style="color:#1f2937">\u25CF</span> Total: <b>$${Math.round(total).toLocaleString('es-CO')}</b>`
    },
  },
  grid: { left: 60, right: 30, bottom: 60, top: 50, containLabel: true },
  xAxis: { type: 'category' as const, data: monthlyGen.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value } },
  yAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
  series: [
    { name: 'Servicios', type: 'line', smooth: true, data: monthlyGen.value.serv, areaStyle: { opacity: 0.25 }, label: labelLine.value },
    { name: 'Insumos', type: 'line', smooth: true, data: monthlyGen.value.ins, areaStyle: { opacity: 0.25 }, label: labelLine.value },
  ],
  legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
}))

const costM3Gen = computed(() => aggMonthly(dataFilteredNoAcpm.value, prodMapByMonth.value, true))
const costoM3Opt = computed(() => markRaw({
  color: [palette[4]],
  tooltip: {
    trigger: 'axis' as const,
    formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params
      const mes = p.name ?? ''
      const valor = Number(p.value) || 0
      const idx = costM3Gen.value.labels.indexOf(mes)
      const vals = costM3Gen.value.vals || []
      let diff = ''
      if (idx > 0 && vals[idx - 1]) {
        const anterior = Number(vals[idx - 1]) || 0
        if (anterior > 0) {
          const pct = ((valor - anterior) / anterior * 100).toFixed(1)
          const flecha = Number(pct) > 0 ? '↑' : Number(pct) < 0 ? '↓' : '→'
          diff = `<br/>vs Mes Anterior: <b>${Number(pct) > 0 ? '+' : ''}${pct}% ${flecha}</b>`
        }
      }
      return `<b>${mes}</b><br/>Costo/m³: <b>$${Math.round(valor).toLocaleString('es-CO')}</b>${diff}`
    },
  },
  grid: { left: 60, right: 30, bottom: 60, top: 50, containLabel: true },
  xAxis: { type: 'category' as const, data: costM3Gen.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value } },
  yAxis: { type: 'value' as const, interval: 1000, max: Math.max(Math.max(...(costM3Gen.value.vals || [3000]), 3000) * 1.15, 3500), axisLabel: { show: false }, splitLine: { show: false } },
  series: [{
    type: 'line', smooth: true, data: costM3Gen.value.vals, areaStyle: { opacity: 0.3 },
    label: labelLineCurrency.value,
  }],
}))

const intRows = computed(() => partition.value.int)
const intKpi = computed(() => {
  let serv = 0, ins = 0
  for (const r of intRows.value) { serv += Number(r['Costo servicios']) || 0; ins += Number(r['Costos Insumos']) || 0 }
  return { serv, ins, total: serv + ins, count: intRows.value.length }
})
const intServ = computed(() => intKpi.value.serv)
const intIns = computed(() => intKpi.value.ins)
const intTotal = computed(() => intKpi.value.total)
const intPct = computed(() => totalGeneral.value > 0 ? ((intKpi.value.total / totalGeneral.value) * 100).toFixed(1) : '0.0')
const intCount = computed(() => intKpi.value.count)
const intCostoM3 = computed(() => totalProd.value > 0 ? intKpi.value.total / totalProd.value : 0)

const otsIntEstadoCounts = computed(() => {
  let abiertas = 0, cerradas = 0
  for (const r of intRows.value) {
    const cls = estadoClass(String(r['Estado'] ?? ''))
    if (cls === 'ok') cerradas++
    else if (cls === 'warn') abiertas++
  }
  return { abiertas, cerradas }
})
const otsIntPctCierre = computed(() => {
  const total = otsIntEstadoCounts.value.abiertas + otsIntEstadoCounts.value.cerradas
  return total > 0 ? ((otsIntEstadoCounts.value.cerradas / total) * 100).toFixed(1) : '0.0'
})
const otsIntDuracionEstimadaProm = computed(() => {
  let sum = 0, n = 0
  for (const r of intRows.value) {
    const v = r['Duración (horas)']
    if (typeof v === 'number' && !isNaN(v)) { sum += v; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})
const otsIntTiempoRealProm = computed(() => {
  let sum = 0, n = 0
  for (const r of intRows.value) {
    const rec = Number(r['Fecha Recepción'])
    const cie = Number(r['Fecha Cierre'])
    if (!isNaN(rec) && !isNaN(cie) && rec > 0 && cie > rec) { sum += (cie - rec) * 24; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})
const otsIntConSopledPct = computed(() => {
  const n = intRows.value.length
  if (!n) return '0.0'
  const c = intRows.value.filter(r => Array.isArray(r['_sopled']) && (r['_sopled'] as any[]).length).length
  return ((c / n) * 100).toFixed(1)
})
const otsIntCostoTotal = computed(() => {
  let t = 0
  for (const r of intRows.value) { t += Number(r['Costo servicios']) + Number(r['Costos Insumos']) }
  return t
})
const otsIntSubs = computed(() => {
  let n = 0
  for (const r of intRows.value) { const subs = r['_subOrdenes']; if (Array.isArray(subs)) n += subs.length }
  return n
})
const otsIntSopled = computed(() => {
  let n = 0
  for (const r of intRows.value) { const s = r['_sopled']; if (Array.isArray(s)) n += s.length }
  return n
})
const sistemasIntRanking = computed(() => {
  const map = new Map<string, number>()
  for (const r of intRows.value) {
    const subs = r['_subOrdenes']
    if (!Array.isArray(subs)) continue
    for (const s of subs) {
      const label = String(s?.sistemaTexto || s?.sistema || '').trim()
      if (!label) continue
      map.set(label, (map.get(label) || 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})
const localizacionIntRanking = computed(() => rankBy(intRows.value, 'Localización', 12))
const prioridadIntRanking = computed(() => rankBy(intRows.value, 'Prioridad', 6))
const fuenteNovedadIntRanking = computed(() => rankBy(intRows.value, 'Fuente_Novedad', 10))
const tiposTrabajoIntRanking = computed(() => rankBy(intRows.value, 'Tipo Trabajo', 10))
const claseMantenimientoIntRanking = computed(() => rankBy(intRows.value, 'Clase Mantenimiento', 10))
const motivosNoEjecucionIntRanking = computed(() => rankBy(intRows.value.filter(r => String(r['Motivo No Ejecución'] ?? '').trim()), 'Motivo No Ejecución', 10))
const personalIntRanking = computed(() => rankByMultiValue(intRows.value, 'Personal', 10))
const solicitantesIntRanking = computed(() => rankBy(intRows.value, 'Solicitante', 10))
const responsablesCierreIntRanking = computed(() => rankBy(intRows.value, 'Responsable Cierre', 10))

const costM3Int = computed(() => aggMonthly(intRows.value, prodMapByMonth.value, true))
const costosM3IntOpt = computed(() => markRaw({
  color: ['#EF4444'],
  tooltip: { trigger: 'axis' as const, valueFormatter: (v: number) => '$' + Math.round(v).toLocaleString('es-CO') + '/m³' },
  grid: { left: 60, right: 30, bottom: 60, top: 50, containLabel: true },
  xAxis: { type: 'category' as const, data: costM3Int.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value } },
  yAxis: { type: 'value' as const, interval: 1000, max: Math.max(Math.max(...(costM3Int.value.vals || [3000]), 3000) * 1.15, 3500), axisLabel: { show: false }, splitLine: { show: false } },
  series: [{ name: 'Costo Interno/m³', type: 'line', smooth: true, data: costM3Int.value.vals, areaStyle: { opacity: 0.3 }, label: labelLineCurrency.value }],
}))

const extRows = computed(() => partition.value.ext)
const extKpi = computed(() => {
  let serv = 0, ins = 0
  for (const r of extRows.value) { serv += Number(r['Costo servicios']) || 0; ins += Number(r['Costos Insumos']) || 0 }
  return { serv, ins, total: serv + ins, count: extRows.value.length }
})
const extServ = computed(() => extKpi.value.serv)
const extIns = computed(() => extKpi.value.ins)
const extTotal = computed(() => extKpi.value.total)
const extPct = computed(() => totalGeneral.value > 0 ? ((extKpi.value.total / totalGeneral.value) * 100).toFixed(1) : '0.0')
const extCount = computed(() => extKpi.value.count)
const extCostoM3 = computed(() => totalProd.value > 0 ? extKpi.value.total / totalProd.value : 0)

const otsExtEstadoCounts = computed(() => {
  let abiertas = 0, cerradas = 0
  for (const r of extRows.value) {
    const cls = estadoClass(String(r['Estado'] ?? ''))
    if (cls === 'ok') cerradas++
    else if (cls === 'warn') abiertas++
  }
  return { abiertas, cerradas }
})
const otsExtPctCierre = computed(() => {
  const total = otsExtEstadoCounts.value.abiertas + otsExtEstadoCounts.value.cerradas
  return total > 0 ? ((otsExtEstadoCounts.value.cerradas / total) * 100).toFixed(1) : '0.0'
})
const otsExtDuracionEstimadaProm = computed(() => {
  let sum = 0, n = 0
  for (const r of extRows.value) {
    const v = r['Duración (horas)']
    if (typeof v === 'number' && !isNaN(v)) { sum += v; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})
const otsExtTiempoRealProm = computed(() => {
  let sum = 0, n = 0
  for (const r of extRows.value) {
    const rec = Number(r['Fecha Recepción'])
    const cie = Number(r['Fecha Cierre'])
    if (!isNaN(rec) && !isNaN(cie) && rec > 0 && cie > rec) { sum += (cie - rec) * 24; n++ }
  }
  return n > 0 ? (sum / n).toFixed(1) : '0.0'
})
const otsExtConSopledPct = computed(() => {
  const n = extRows.value.length
  if (!n) return '0.0'
  const c = extRows.value.filter(r => Array.isArray(r['_sopled']) && (r['_sopled'] as any[]).length).length
  return ((c / n) * 100).toFixed(1)
})
const otsExtCostoTotal = computed(() => {
  let t = 0
  for (const r of extRows.value) { t += Number(r['Costo servicios']) + Number(r['Costos Insumos']) }
  return t
})
const otsExtSubs = computed(() => {
  let n = 0
  for (const r of extRows.value) { const subs = r['_subOrdenes']; if (Array.isArray(subs)) n += subs.length }
  return n
})
const otsExtSopled = computed(() => {
  let n = 0
  for (const r of extRows.value) { const s = r['_sopled']; if (Array.isArray(s)) n += s.length }
  return n
})
const sistemasExtRanking = computed(() => {
  const map = new Map<string, number>()
  for (const r of extRows.value) {
    const subs = r['_subOrdenes']
    if (!Array.isArray(subs)) continue
    for (const s of subs) {
      const label = String(s?.sistemaTexto || s?.sistema || '').trim()
      if (!label) continue
      map.set(label, (map.get(label) || 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
})
const localizacionExtRanking = computed(() => rankBy(extRows.value, 'Localización', 12))
const prioridadExtRanking = computed(() => rankBy(extRows.value, 'Prioridad', 6))
const fuenteNovedadExtRanking = computed(() => rankBy(extRows.value, 'Fuente_Novedad', 10))
const tiposTrabajoExtRanking = computed(() => rankBy(extRows.value, 'Tipo Trabajo', 10))
const claseMantenimientoExtRanking = computed(() => rankBy(extRows.value, 'Clase Mantenimiento', 10))
const motivosNoEjecucionExtRanking = computed(() => rankBy(extRows.value.filter(r => String(r['Motivo No Ejecución'] ?? '').trim()), 'Motivo No Ejecución', 10))
const solicitantesExtRanking = computed(() => rankBy(extRows.value, 'Solicitante', 10))
const responsablesCierreExtRanking = computed(() => rankBy(extRows.value, 'Responsable Cierre', 10))

const costM3Ext = computed(() => aggMonthly(extRows.value, prodMapByMonth.value, true))
const costosM3ExtOpt = computed(() => markRaw({
  color: ['#EF4444'],
  tooltip: { trigger: 'axis' as const, valueFormatter: (v: number) => '$' + Math.round(v).toLocaleString('es-CO') + '/m³' },
  grid: { left: 60, right: 30, bottom: 60, top: 50, containLabel: true },
  xAxis: { type: 'category' as const, data: costM3Ext.value.labels, axisLabel: { fontWeight: 600 as const, color: chartTextColor.value } },
  yAxis: { type: 'value' as const, interval: 1000, max: Math.max(Math.max(...(costM3Ext.value.vals || [3000]), 3000) * 1.15, 3500), axisLabel: { show: false }, splitLine: { show: false } },
  series: [{ name: 'Costo Externo/m³', type: 'line', smooth: true, data: costM3Ext.value.vals, areaStyle: { opacity: 0.3 }, label: labelLineCurrency.value }],
}))


function buildBarOpt(data: Record<string, unknown>[], groupBy: 'Tipo de Vehículo' | 'Placa del Vehículo' | 'PROVEEDOR', limit?: number) {
  const map = new Map<string, { serv: number; ins: number }>()
  for (const r of data) {
    const t = String(r[groupBy] ?? '').trim() || '(Sin ' + groupBy + ')'
    const e = map.get(t)
    if (e) { e.serv += Number(r['Costo servicios']) || 0; e.ins += Number(r['Costos Insumos']) || 0 }
    else { map.set(t, { serv: Number(r['Costo servicios']) || 0, ins: Number(r['Costos Insumos']) || 0 }) }
  }
  const sorted = [...map.entries()].sort((a, b) => (b[1].serv + b[1].ins) - (a[1].serv + a[1].ins))
  const maxTotal = sorted.length > 0 ? sorted[0][1].serv + sorted[0][1].ins : 1
  const effectiveLimit = limit ?? (groupBy === 'Placa del Vehículo' ? 10 : 15)
  const labels: string[] = []; const serv: number[] = []; const ins: number[] = []
  for (const [k, v] of sorted.slice(0, effectiveLimit)) { labels.push(k); serv.push(v.serv); ins.push(v.ins) }
  // Oculta la etiqueta si el segmento es demasiado angosto para el texto: cada
  // carácter del monto formateado exige una fracción mínima del total máximo
  // (proxy del ancho de barra en píxeles), en vez de un umbral fijo que dejaba
  // texto sobresaliendo de la gráfica en barras cortas.
  const segLabel = {
    show: true,
    position: 'inside' as const,
    formatter: (p: any) => {
      const text = '$' + Math.round(p.value).toLocaleString('es-CO')
      const minShare = text.length * 0.011
      return p.value >= maxTotal * minShare ? text : ''
    },
    fontSize: 10,
    fontWeight: 600 as const,
    color: '#fff',
  }
  const layout = hBarLayout(labels, 56, viewportW.value)
  return {
    color: [palette[1], '#EF4444'],
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const arr = Array.isArray(params) ? params : [params]
        const nombre = labels[arr[0]?.dataIndex] ?? arr[0]?.name ?? ''
        const serv = Number(arr[0]?.value) || 0
        const ins = Number(arr[1]?.value) || 0
        const total = serv + ins
        return `<b>${nombre}</b><br/>` +
          `<span style="color:${palette[1]}">\u25CF</span> Servicios: <b>$${Math.round(serv).toLocaleString('es-CO')}</b><br/>` +
          `<span style="color:#EF4444">\u25CF</span> Insumos: <b>$${Math.round(ins).toLocaleString('es-CO')}</b><br/>` +
          `<span style="color:#1f2937">\u25CF</span> Total: <b>$${Math.round(total).toLocaleString('es-CO')}</b>`
      },
    },
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category' as const, data: labels, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [
      { name: 'Servicios', type: 'bar', data: serv, stack: 'total', barWidth: '70%', label: segLabel, itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] } },
      { name: 'Insumos', type: 'bar', data: ins, stack: 'total', barWidth: '70%', label: segLabel, itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] } },
    ],
    legend: { bottom: 0, textStyle: { fontWeight: 600, color: chartTextColor.value } },
  }
}

const vehiculoGenOpt = computed(() => markRaw(buildBarOpt(dataFilteredNoAcpm.value, 'Placa del Vehículo')))
const vehiculoIntOpt = computed(() => markRaw(buildBarOpt(intRows.value, 'Placa del Vehículo')))
const vehiculoExtOpt = computed(() => markRaw(buildBarOpt(extRows.value, 'Placa del Vehículo')))

const intProveedorOpt = computed(() => markRaw(buildBarOpt(intRows.value, 'PROVEEDOR')))

/** Gráfica de barras horizontal por conteo (rankings de sistemas, proveedores, responsables). */
/** Barras horizontales por conteo con un color distinto por barra. */
function buildCountBarColorOpt(entries: [string, number][], seriesName: string) {
  const labels = entries.map(e => e[0])
  const data = entries.map((e, i) => ({ value: e[1], itemStyle: { color: palette[i % palette.length] } }))
  const valueTexts = entries.map(e => e[1].toLocaleString('es-CO'))
  const layout = hBarLayout(labels, hBarValueSpace(valueTexts, 34), viewportW.value)
  return {
    color: palette,
    tooltip: hBarTooltip(labels),
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category' as const, data: labels, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: seriesName,
      type: 'bar',
      data,
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  }
}

const sistemasOpt = computed(() => {
  const entries = sistemasRanking.value
  const labels = entries.map(e => e[0])
  const data = entries.map((e, i) => ({ value: e[1], itemStyle: { color: palette[i % palette.length] } }))
  const valueTexts = entries.map(e => e[1].toLocaleString('es-CO'))
  const layout = hBarLayout(labels, hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
    color: palette,
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const nombre = labels[p.dataIndex] ?? p.name ?? ''
        const cant = Number(p.value) || 0
        return `<b>${nombre}</b><br/>Intervenciones: <b>${cant}</b>`
      },
    },
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category' as const, data: labels, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: 'Intervenciones',
      type: 'bar',
      data,
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})

const localizacionOpt = computed(() => {
  const entries = localizacionRanking.value
  const data = entries.slice(0, 8).map(([name, value]) => ({ name, value }))
  const total = data.reduce((s, d) => s + d.value, 0)
  return markRaw({
    color: palette,
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: any) => {
        const nombre = p.name ?? ''
        const cant = Number(p.value) || 0
        const pct = p.percent ?? 0
        const costo = costoTotalLocalizacion.value.get(nombre)
        const costoStr = costo != null ? `<br/>Costo Total: <b>$${Math.round(costo).toLocaleString('es-CO')}</b>` : ''
        return `<b>${nombre}</b><br/>Órdenes: <b>${cant}</b> (${pct}%)${costoStr}`
      },
    },
    legend: { type: 'scroll' as const, orient: 'vertical' as const, right: 10, top: 10, textStyle: { fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 } },
    graphic: [{
      type: 'text' as const, left: '38%', top: '50%', style: { text: String(total), textAlign: 'center', fill: chartTextColor.value, fontWeight: 700, fontSize: 18 },
    }],
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['38%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: (p: any) => p.percent + '%', fontSize: 10 },
      data,
    }],
  })
})
const prioridadOpt = computed(() => markRaw(buildCountPieOpt(prioridadRanking.value, false)))
const fuenteNovedadOpt = computed(() => markRaw(buildCountPieOpt(fuenteNovedadRanking.value, false)))
const solicitantesOpt = computed(() => markRaw(buildCountBarColorOpt(solicitantesRanking.value, 'Órdenes')))
const responsablesCierreOpt = computed(() => markRaw(buildCountPieOpt(responsablesCierreRanking.value, false)))
const tiposTrabajoOpt = computed(() => markRaw(buildCountPieOpt(tiposTrabajoRanking.value, false)))
const claseMantenimientoOpt = computed(() => markRaw(buildCountPieOpt(claseMantenimientoRanking.value, false)))
const motivosNoEjecucionOpt = computed(() => markRaw(buildCountPieOpt(motivosNoEjecucionRanking.value, false)))
const personalInternoOpt = computed(() => {
  const items = personalInternoRanking.value
  const labels = items.map(e => e.label)
  const data = items.map((e, i) => ({ value: e.n, horas: e.horas, costo: e.costo, itemStyle: { color: palette[i % palette.length] } }))
  const valueTexts = items.map(e => e.n.toLocaleString('es-CO'))
  const layout = hBarLayout(labels, hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
    color: palette,
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p?.dataIndex ?? 0
        const item = items[idx]
        if (!item) return ''
        return `<b>${item.label}</b><br/>` +
          `Participaciones: <b>${item.n}</b><br/>` +
          `Horas reales: <b>${Math.round(item.horas)} h</b><br/>` +
          `Precio servicios: <b>$${Math.round(item.costo).toLocaleString('es-CO')}</b>`
      },
    },
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category' as const, data: labels, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: 'Participaciones',
      type: 'bar',
      data,
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})
const almacenSolicitudesOpt = computed(() => markRaw(buildPieOpt(almacenSolicitudesRanking.value, 'Productos Más Solicitados (Frecuencia)', 0, false)))
const almacenSolicitantesOpt = computed(() => markRaw(buildCountBarColorOpt(almacenSolicitantesRanking.value, 'Solicitudes')))
const almacenApruebaOpt = computed(() => markRaw(buildCountPieOpt(almacenApruebaRanking.value, false)))
const almacenMotivosNoSalidaOpt = computed(() => markRaw(buildCountPieOpt(almacenMotivosNoSalidaRanking.value, false)))
const almacenLocalizacionOpt = computed(() => markRaw(buildCountBarColorOpt(almacenLocalizacionRanking.value, 'Solicitudes')))

const sistemasIntOpt = computed(() => markRaw(buildCountBarColorOpt(sistemasIntRanking.value, 'Intervenciones')))
const localizacionIntOpt = computed(() => markRaw(buildCountPieOpt(localizacionIntRanking.value, false)))
const prioridadIntOpt = computed(() => markRaw(buildCountPieOpt(prioridadIntRanking.value, false)))
const fuenteNovedadIntOpt = computed(() => markRaw(buildCountPieOpt(fuenteNovedadIntRanking.value, false)))
const tiposTrabajoIntOpt = computed(() => markRaw(buildCountPieOpt(tiposTrabajoIntRanking.value, false)))
const claseMantenimientoIntOpt = computed(() => markRaw(buildCountPieOpt(claseMantenimientoIntRanking.value, false)))
const motivosNoEjecucionIntOpt = computed(() => markRaw(buildCountPieOpt(motivosNoEjecucionIntRanking.value, false)))
const personalIntOpt = computed(() => markRaw(buildCountBarColorOpt(personalIntRanking.value, 'Órdenes')))
const solicitantesIntOpt = computed(() => markRaw(buildCountBarColorOpt(solicitantesIntRanking.value, 'Órdenes')))
const responsablesCierreIntOpt = computed(() => markRaw(buildCountPieOpt(responsablesCierreIntRanking.value, false)))

const sistemasExtOpt = computed(() => markRaw(buildCountBarColorOpt(sistemasExtRanking.value, 'Intervenciones')))
const localizacionExtOpt = computed(() => markRaw(buildCountPieOpt(localizacionExtRanking.value, false)))
const prioridadExtOpt = computed(() => markRaw(buildCountPieOpt(prioridadExtRanking.value, false)))
const fuenteNovedadExtOpt = computed(() => markRaw(buildCountPieOpt(fuenteNovedadExtRanking.value, false)))
const tiposTrabajoExtOpt = computed(() => markRaw(buildCountPieOpt(tiposTrabajoExtRanking.value, false)))
const claseMantenimientoExtOpt = computed(() => markRaw(buildCountPieOpt(claseMantenimientoExtRanking.value, false)))
const motivosNoEjecucionExtOpt = computed(() => markRaw(buildCountPieOpt(motivosNoEjecucionExtRanking.value, false)))
const solicitantesExtOpt = computed(() => markRaw(buildCountBarColorOpt(solicitantesExtRanking.value, 'Órdenes')))
const responsablesCierreExtOpt = computed(() => markRaw(buildCountPieOpt(responsablesCierreExtRanking.value, false)))

/* ── Expand: opciones sin límite para el modal ── */
const vehiculoGenExpandOpt = computed(() => markRaw(buildBarOpt(dataFilteredNoAcpm.value, 'Placa del Vehículo', Infinity)))
const localizacionExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Localización'), 'Órdenes')))
const prioridadExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Prioridad'), 'Órdenes')))
const fuenteNovedadExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Fuente_Novedad'), 'Órdenes')))
const tiposTrabajoExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Tipo Trabajo'), 'Órdenes')))
const claseMantExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Clase Mantenimiento'), 'Órdenes')))
const motivosNoEjExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value.filter(r => String(r['Motivo No Ejecución'] ?? '').trim()), 'Motivo No Ejecución'), 'Órdenes')))
const personalInternoExpandOpt = computed(() => {
  const map = new Map<string, { n: number; horas: number; costo: number }>()
  for (const r of dataFilteredMain.value.filter(isInterno)) {
    const rec = Number(r['Fecha Recepción']) || 0
    const cie = Number(r['Fecha Cierre']) || 0
    const horas = (rec && cie && cie > rec) ? (cie - rec) * 24 : (Number(r['Duración (horas)']) || 0)

    const personalDetalles = r['_personalDetalles']
    if (Array.isArray(personalDetalles) && personalDetalles.length > 0) {
      const nPersonas = personalDetalles.length
      for (const p of personalDetalles) {
        const label = String(p.nombre || '').trim()
        if (!label) continue
        const e = map.get(label) || { n: 0, horas: 0, costo: 0 }
        e.n++
        e.horas += nPersonas > 0 ? horas / nPersonas : horas
        e.costo += Number(p.costo) || 0
        map.set(label, e)
      }
    } else {
      const raw = String(r['Personal'] ?? '').trim()
      if (!raw) continue
      const personas = raw.split(',').map(s => s.trim()).filter(Boolean)
      const costoTotal = Number(r['Costo servicios']) || 0
      const nPersonas = personas.length || 1
      for (const label of personas) {
        const e = map.get(label) || { n: 0, horas: 0, costo: 0 }
        e.n++
        e.horas += horas / nPersonas
        e.costo += costoTotal / nPersonas
        map.set(label, e)
      }
    }
  }
  const items = [...map.entries()].map(([label, e]) => ({ label, ...e })).sort((a, b) => b.n - a.n)
  const labels = items.map(e => e.label)
  const data = items.map((e, i) => ({ value: e.n, horas: e.horas, costo: e.costo, itemStyle: { color: palette[i % palette.length] } }))
  const valueTexts = items.map(e => e.n.toLocaleString('es-CO'))
  const layout = hBarLayout(labels, hBarValueSpace(valueTexts, 34), viewportW.value)
  return markRaw({
    color: palette,
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p?.dataIndex ?? 0
        const item = items[idx]
        if (!item) return ''
        return `<b>${item.label}</b><br/>` +
          `Participaciones: <b>${item.n}</b><br/>` +
          `Horas reales: <b>${Math.round(item.horas)} h</b><br/>` +
          `Precio servicios: <b>$${Math.round(item.costo).toLocaleString('es-CO')}</b>`
      },
    },
    grid: hBarGrid(layout.labelSpace, layout.valueSpace),
    xAxis: { type: 'value' as const, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category' as const, data: labels, axisLabel: hBarAxisLabel(layout.labelSpace) },
    series: [{
      name: 'Participaciones',
      type: 'bar',
      data,
      barWidth: '65%',
      label: { show: true, position: 'right' as const, fontWeight: 600 as const, fontSize: 11, color: chartTextColor.value },
      itemStyle: { borderRadius: [0, 4, 4, 0] as [number, number, number, number] },
    }],
  })
})
const solicitantesExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Solicitante'), 'Órdenes')))
const responsablesCierreExpandOpt = computed(() => markRaw(buildCountBarColorOpt(rankBy(dataFilteredMain.value, 'Responsable Cierre'), 'Órdenes')))
const sistemasExpandOpt = computed(() => markRaw(buildCountBarColorOpt(sistemasRanking.value.map(([l, n]) => [l, n] as [string, number]), 'Intervenciones')))
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
}

.page-title {
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group .dropdown-toggle,
.filter-group :deep(.dropdown-toggle) {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 6px 4px;
  box-shadow: none;
}

.filter-group .dropdown-toggle:hover,
.filter-group :deep(.dropdown-toggle:hover) {
  background: transparent;
  color: var(--accent);
}

.filter-group .badge,
.filter-group :deep(.badge) {
  background: transparent;
  padding: 0 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-light);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.action-btn:hover {
  background: rgba(59,130,246,.2);
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-btn.clear {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--card-border);
}
.action-btn.clear:hover {
  background: var(--bg-alt);
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-group {
    width: 100%;
    flex-wrap: wrap;
  }
  .header-actions {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .section-sub { font-size: 11px; }
  .page-header {
    align-items: flex-start;
  }
  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-group .filter-bar,
  .filter-group .multi-select {
    width: 100%;
  }
  .sub-tab-bar {
    flex-wrap: wrap;
    gap: 4px;
  }
  .sub-tab-btn {
    flex: 1 1 auto;
    text-align: center;
  }
  .ots-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .ots-stats {
    flex-wrap: wrap;
  }
  .ots-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .ots-search {
    flex: 1;
    min-width: 0;
  }
  .day-toggle {
    flex-wrap: wrap;
  }

  /* Modal: ocupar casi toda la pantalla */
  .modal-overlay {
    padding: 10px;
    align-items: flex-end;
  }
  .modal-panel {
    max-width: 100%;
    max-height: 94vh;
    border-radius: 14px 14px 0 0;
  }
  .modal-head {
    padding: 16px 16px 12px;
  }
  .modal-body {
    padding: 14px 16px 24px;
  }
  .mh-right {
    flex-wrap: wrap;
  }

  /* Documento SOPLED: evitar desbordes horizontales */
  .sopled-doc {
    padding: 18px 14px;
    overflow-x: auto;
  }
  .sopled-doc .items-table {
    min-width: 560px;
  }

  /* Grid de tarjetas del modal ocupa una columna */
  .mc-cards-mini {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .almacen-view-toggle {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .av-btn {
    justify-content: center;
  }
  .sub-tab-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .mh-left {
    align-items: flex-start;
  }
  .modal-logo { height: 22px; }
  .mh-ot { font-size: 17px; }
  .sop-grid {
    grid-template-columns: 1fr;
  }
  .sopled-doc-actions {
    flex-wrap: wrap;
  }
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: var(--text-tertiary);
}
.error-state {
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: var(--danger);
}

.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 28px 0 16px; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }
.section-sub { font-size: 12px; color: var(--text-tertiary); margin: 0 0 16px; }

.table-collapse { margin-top: 24px; }
.table-collapse-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}
.table-collapse-toggle:hover { color: var(--accent); }
.chevron { font-size: 13px; transition: transform var(--transition-fast); color: var(--text-tertiary); }
.chevron.open { transform: rotate(90deg); }

.table-month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 4px;
}
.table-month-nav button {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: var(--bg-alt);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  line-height: 1;
}
.table-month-nav button:hover:not(:disabled) { background: var(--accent-light); color: var(--accent); }
.table-month-nav button:disabled { opacity: .3; cursor: default; }
.table-month-nav span {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 90px;
  text-align: center;
}

.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 24px;
  overflow-x: auto;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  padding: 2px;
}
.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
  border-radius: var(--radius-sm);
}
.tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); }
.tab-btn.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--accent); background: rgba(255,255,255,0.12); }

.sub-tab-bar {
  display: flex;
  gap: 2px;
  margin-bottom: 20px;
}
.sub-tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}
.sub-tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
.sub-tab-btn.active { color: var(--accent); background: rgba(255,255,255,0.1); font-weight: 600; }

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
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--bg-alt);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
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

.ots-section { margin-top: 8px; }

.informe-section {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Barra superior oficial del informe de OT */
.informe-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 12px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  gap: 12px;
}
.icb-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.icb-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
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
  color: #ffffff;
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

.informe-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 20px;
  border: 1px dashed var(--card-border);
  border-radius: var(--radius-lg);
  text-align: center;
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
.report-header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.report-logo {
  height: 38px;
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
.title-bar {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: #2563eb;
  border-radius: 2px;
}

.zoho-analysis-box {
  background-color: var(--card-bg-hover, #f8fafc);
  padding: 12px 16px;
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
.table-wrap tr:hover td {
  background: #f8fafc;
}
.table-wrap th.r, .table-wrap td.r {
  text-align: right;
}
.idx-col, .idx {
  width: 24px;
  text-align: center;
  color: var(--text-secondary);
}
.bold {
  font-weight: 700;
}
.accent-text {
  color: var(--navy, #172954);
}
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

.rank-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.rank-label {
  width: 110px;
  font-size: 11px;
  font-weight: 700;
  color: var(--navy, #172954);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-track {
  flex: 1;
  height: 12px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.rank-fill {
  height: 100%;
  background: var(--navy, #172954);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.rank-val {
  width: 28px;
  text-align: right;
  font-size: 11px;
  font-weight: 700;
  color: var(--navy, #172954);
}

.stack-track {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  background: #e2e8f0;
  margin: 4px 0;
}
.stack-seg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
}
.seg-cor { background: #dc2626; }
.seg-prev { background: #16a34a; }
.seg-otro { background: #8b8b8b; }
.pv-legend {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.pv-legend b {
  color: var(--navy, #172954);
}

.pill {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.p-rojo { background: #fdeaea; color: #a90707; }
.p-verde { background: #e9f4ed; color: #1f7a3d; }
.p-ambar { background: #fbf3e0; color: #b8860b; }
.p-gris { background: #eef1f4; color: #5b6b82; }

ul.res {
  margin: 4px 0 0;
  padding-left: 0;
  list-style: none;
}
ul.res li {
  position: relative;
  padding-left: 14px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-primary);
  margin-bottom: 4px;
}
ul.res li::before {
  content: "•";
  position: absolute;
  left: 2px;
  color: var(--navy, #172954);
  font-weight: 800;
}

.report-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--card-border, #e2e8f0);
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
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
  .tab-bar,
  .sub-tab-bar,
  .header-actions,
  .filter-group,
  .sticky-top,
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

.ots-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.day-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.day-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 18px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--bg-alt);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}
.day-btn .day-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}
.day-btn .day-date {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: capitalize;
}
.day-btn:hover {
  border-color: var(--card-border-hover);
  background: var(--accent-light);
}
.day-btn.active {
  background: var(--accent-light);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.day-btn.active .day-label { color: var(--accent); }
.day-btn.hoy.active { border-color: #E8913A; box-shadow: 0 0 0 3px rgba(232,145,58,.12); }
.day-btn.hoy.active .day-label { color: #E8913A; }
.empty-cell {
  text-align: center;
  color: var(--text-tertiary);
  padding: 24px !important;
}
.ots-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.ots-stats strong {
  color: var(--text-primary);
  font-weight: 700;
}
.ots-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: .4;
}
.ots-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ots-search {
  padding: 8px 12px 8px 32px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  background: var(--bg);
  color: var(--text-primary);
  font-size: 13px;
  min-width: 220px;
  outline: none;
  transition: border-color var(--transition-fast);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
}
.ots-search:focus { border-color: var(--accent); }
.ots-search::placeholder { color: var(--text-tertiary); }
.ots-expand-all {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ots-expand-all:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  background: var(--card-bg);
}
.ot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}
.ot-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-alt);
  padding: 11px 8px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap;
  user-select: none;
}
.ot-table thead th.col-nro,
.ot-table thead th.col-fecha,
.ot-table thead th.col-tipo,
.ot-table thead th.col-placa,
.ot-table thead th.col-costo {
  cursor: pointer;
  transition: color var(--transition-fast);
}
.ot-table thead th:hover { color: var(--accent); }
.sort-arrow { font-size: 9px; margin-left: 2px; }
.ot-table tbody td {
  padding: 11px 8px;
  border-bottom: 1px solid var(--card-border);
  color: var(--text-secondary);
}
.ot-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ot-row:hover { background: rgba(255,255,255,0.04); }
.ot-row.expanded { background: rgba(255,255,255,0.06); }
.col-expand { width: 32px; text-align: center; }
.col-nro { width: 100px; font-weight: 600; color: var(--text-primary); }
.col-fecha { width: 100px; font-size: 12px; }
.col-tipo { width: 130px; }
.col-placa { width: 130px; }
.col-proveedor { }
.col-estado { width: 100px; }
.col-costo {
  width: 130px;
  text-align: right;
  font-weight: 600;
  font-family: 'Lato', sans-serif;
}
.costo-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.sub-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px; height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  font-family: 'Lato', sans-serif;
}
.estado-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255,255,255,0.06);
  color: var(--text-tertiary);
}
.estado-badge.ok {
  background: rgba(16,185,129,0.15);
  color: #10b981;
}
.estado-badge.warn {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.col-expand { width: 32px; text-align: center; }
.stat-abiertas { color: #ef4444; }
.stat-cerradas { color: #10b981; }
.pdf-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
}
.pdf-link:hover { text-decoration: underline; }
.ots-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* Modal — diseño profesional */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal-panel {
  background: var(--bg);
  border-radius: 16px;
  max-width: 920px; width: 100%;
  max-height: 92vh; overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0,0,0,.5);
  position: relative;
  animation: modalIn .25s ease;
}
@keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(.98) } to { opacity:1; transform:translateY(0) scale(1) } }
.modal-close {
  position: absolute; top: 16px; right: 16px; z-index: 5;
  width: 38px; height: 38px; border: 1px solid #d1d5db; border-radius: 50%;
  background: #fff; color: #374151;
  font-size: 17px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,.12);
  transition: all .2s;
}
.modal-close:hover { background: #ef4444; border-color: #ef4444; color: #fff; }

/* Botón de cerrar del modal OT: fijo en la esquina de la pantalla, fuera del panel */
.ot-modal-panel .modal-close {
  position: fixed;
  top: 16px;
  right: 16px;
}

/* Header */
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 20px 28px 16px;
  border-bottom: 1px solid var(--card-border);
  flex-wrap: wrap;
}
.mh-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.modal-logo { height: 26px; width: auto; margin-right: 4px; object-fit: contain; }
.mh-ot { margin: 0; font-size: 20px; letter-spacing: -.3px; font-weight: 800; }
.mh-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
  background: rgba(100,116,139,.15); color: #94a3b8;
}
.mh-badge.cerrada { background: rgba(16,185,129,.15); color: #10b981; }
.mh-badge.abierta { background: rgba(59,130,246,.15); color: #3b82f6; }
.mh-badge.alta { background: rgba(239,68,68,.15); color: #ef4444; }
.mh-badge.media { background: rgba(245,158,11,.15); color: #f59e0b; }
.mh-badge.baja { background: rgba(59,130,246,.15); color: #3b82f6; }
.mh-right { display: flex; align-items: center; gap: 12px; font-size: 13px; }
.mh-vehiculo { color: var(--text-secondary); }
.mh-placa { font-weight: 700; color: var(--text-primary); font-family: 'Lato', sans-serif; font-size: 12px; background: var(--bg-alt); padding: 2px 8px; border-radius: 6px; }
.mh-costo { font-family: 'Lato', sans-serif; font-weight: 700; color: var(--accent); font-size: 15px; }

/* Body */
.modal-body { padding: 20px 28px 28px; }

/* Documento SOPLED (estilo Solicitud de Pedido Interno — réplica del PDF de AppSheet) */
/* Modal SOPLED: documento + cronología a ancho completo, igual desde el tab Almacén que desde el modal OT */
.sopled-panel {
  width: 95vw;
  max-width: 1600px;
  height: 92vh;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}
.sopled-panel .modal-close {
  position: fixed;
  top: 16px;
  right: 16px;
}
/* Solicitud (izquierda) + Cronología (derecha) */
.ot-workspace.sopled-workspace {
  grid-template-columns: 1.5fr 1fr;
  grid-template-rows: 1fr;
  grid-template-areas: "order timeline";
}

/* Modal OT: contenedor transparente, ocupa casi toda la pantalla */
.ot-modal-panel {
  width: 95vw;
  max-width: 1600px;
  height: 92vh;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* Workspace de 3 ventanas independientes */
.ot-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    "order warehouse"
    "order timeline";
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* Base de cada ventana */
.ot-window {
  background: #ffffff;
  border: 1px solid #dfe3e8;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* VENTANA 1: Orden de Trabajo — NO tiene header propio, el documento ya lo trae */
.ot-window-order {
  grid-area: order;
  overflow-y: auto;
}

/* VENTANA 2: Almacén */
.ot-window-warehouse {
  grid-area: warehouse;
}

/* VENTANA 3: Cronología */
.ot-window-timeline {
  grid-area: timeline;
}

/* Header de ventana (Almacén y Cronología) */
.ot-window-header {
  flex: 0 0 auto;
  height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}
.ot-window-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}
/* Almacén y Cronología siguen el diseño del documento de la OT (papel blanco, azul, Arial) */
.ot-window-warehouse .ot-window-header h3,
.ot-window-timeline .ot-window-header h3 {
  font-family: 'Lato', sans-serif;
  font-size: 12px;
  color: #3827f5;
  text-transform: uppercase;
  letter-spacing: .4px;
}

/* Body de ventana (contenido con scroll independiente) */
.ot-window-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Placeholder para ventanas vacías */
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

/* Almacén — tabla de ítems SOPLED */
.ot-wh-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(59,130,246,.12);
  color: #3b82f6;
}
/* Responsive: una sola columna en pantallas pequeñas */
@media (max-width: 900px) {
  .ot-modal-panel {
    width: 100vw;
    height: 100vh;
  }
  .sopled-panel {
    width: 100vw;
    height: 100vh;
  }
  .ot-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      "order"
      "warehouse"
      "timeline";
    overflow-y: auto;
  }
  .ot-workspace.sopled-workspace {
    grid-template-rows: auto auto;
    grid-template-areas:
      "order"
      "timeline";
  }
  .ot-window-order { min-height: 500px; }
  .ot-window-warehouse,
  .ot-window-timeline { min-height: 300px; }
}
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
.ot-doc .grid-label { color: #555; font-weight: bold; width: 25%; }
.ot-doc .grid-value { color: #1a1a1a; width: 25%; }
.ot-doc .sec-bar { font-size: 11px; font-weight: bold; color: #1a1a1a; text-align: left; padding: 6px 0; margin: 15px 0 8px 0; text-transform: uppercase; border-top: 0.5px solid #ccc; border-bottom: 0.5px solid #ccc; }
.ot-doc .task-wrapper { display: block; }
.ot-doc .task-card { display: table; width: 100%; border-bottom: 0.5px solid #e0e0e0; padding: 8px 0; background: #fff; }
.ot-doc .task-left { display: table-cell; width: 68%; vertical-align: top; padding-right: 15px; }
.ot-doc .task-desc { font-size: 11.5px; font-weight: bold; color: #1a1a1a; margin-bottom: 6px; text-transform: uppercase; }
.ot-doc .task-meta-line { font-size: 9.5px; color: #555; margin-top: 4px; text-transform: uppercase; }
.ot-doc .task-meta-line b { color: #1a1a1a; font-weight: bold; }
.ot-doc .task-right { display: table-cell; width: 32%; padding-left: 15px; border-left: 0.5px solid #ddd; vertical-align: top; font-size: 9.5px; }
.ot-doc .tr-icons-row { margin-bottom: 6px; display: block; }
.ot-doc .tr-icon-box { display: inline-block; width: 22px; height: 22px; border: 1px solid #ccc; background: #f9f9f9; text-align: center; line-height: 20px; font-size: 11px; margin-right: 4px; border-radius: 3px; color: #666; }
.ot-doc .tr-icon-box.orange { background: #f39c12; color: #fff; border-color: #e67e22; }
.ot-doc .tr-info-line { margin-top: 3px; color: #444; text-transform: uppercase; }
.ot-doc .tr-info-line b { color: #1a1a1a; font-weight: bold; }
.ot-doc .firma-container { display: table; width: 100%; margin-top: 25px; clear: both; }
.ot-doc .firma-col { display: table-cell; width: 45%; vertical-align: bottom; }
.ot-doc .firma-space { display: table-cell; width: 10%; }
.ot-doc .firma-linea { border-bottom: 1px solid #444; margin-bottom: 6px; height: 40px; }
.ot-doc .firma-leyenda { font-size: 9.5px; color: #333; font-weight: bold; text-transform: uppercase; }
.sopled-doc { padding: 34px 38px 30px; font-family: 'Lato', sans-serif; font-size: 11px; line-height: 1.3; color: #1a1a1a; }

/* Encabezado */
.sopled-doc .hdr { display: table; width: 100%; border-bottom: 2px solid #3827f5; padding-bottom: 8px; margin-bottom: 14px; }
.sopled-doc .hdr-logo { display: table-cell; width: 25%; vertical-align: middle; }
.sopled-doc .hdr-logo img { max-width: 140px; height: auto; }
.sopled-doc .hdr-info { display: table-cell; width: 50%; vertical-align: middle; padding-left: 15px; }
.sopled-doc .co { font-size: 12px; font-weight: bold; color: #3827f5; text-transform: uppercase; }
.sopled-doc .ref { font-size: 9px; color: #555; margin-top: 2px; }
.sopled-doc .doc-title { font-size: 14px; font-weight: bold; color: #3827f5; margin-top: 4px; text-transform: uppercase; }
.sopled-doc .hdr-folio { display: table-cell; width: 25%; text-align: right; vertical-align: middle; }
.sopled-doc .folio-lbl { font-size: 10px; color: #333; font-weight: bold; }
.sopled-doc .folio-num { font-size: 14px; font-weight: bold; color: #d9534f; }
.sopled-doc .folio-date { font-size: 8.5px; color: #666; }

/* Metadatos */
.sopled-doc .meta-container { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
.sopled-doc .meta-container td { padding: 4px 6px; font-size: 10px; vertical-align: middle; }
.sopled-doc .meta-label { font-weight: bold; color: #333; width: 20%; }
.sopled-doc .meta-value { color: #555; border-bottom: 1px dashed #ccc; width: 30%; }
.sopled-doc .meta-value.important { color: #3827f5; font-weight: bold; }
.sopled-doc .meta-value.urgent { color: #e53e3e; font-weight: bold; }

/* Barra de sección */
.sopled-doc .sec-bar {
  font-size: 11px; font-weight: bold; color: #1a1a1a; text-align: left;
  padding: 6px 0; margin: 4px 0 8px 0; text-transform: uppercase;
  border-top: 0.5px solid #ccc; border-bottom: 0.5px solid #ccc;
}

/* Tabla de materiales */
.sopled-doc .items-table {
  width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 18px;
  border: 1px solid #d7dae3; border-radius: 8px; overflow: hidden;
}
.sopled-doc .items-table th {
  background: #3827f5; color: #fff; font-size: 9px; font-weight: bold; text-transform: uppercase;
  letter-spacing: 0.3px; padding: 8px 6px; text-align: left; white-space: nowrap;
  border-right: 1px solid rgba(255,255,255,0.25);
}
.sopled-doc .items-table th:last-child { border-right: none; }
.sopled-doc .items-table th.center { text-align: center; }
.sopled-doc .items-table td {
  padding: 8px 8px; font-size: 10px; color: #1a1a1a;
  border-bottom: 0.5px solid #e0e0e0; border-right: 1px solid #edeff5; vertical-align: top;
}
.sopled-doc .items-table td:last-child { border-right: none; }
.sopled-doc .items-table td.center { text-align: center; }
.sopled-doc .items-table tr:nth-child(even) td { background: #f8f9fa; }
.sopled-doc .items-table tr:last-child td { border-bottom: none; }
.sopled-doc .col-cant { width: 7%; }
.sopled-doc .col-id { width: 14%; font-family: 'Lato', sans-serif; font-size: 9px; }
.sopled-doc .col-ref { width: 12%; }
.sopled-doc .col-desc { width: 30%; }
.sopled-doc .col-unid { width: 8%; }
.sopled-doc .col-obs { width: 33%; }
.sopled-doc .sopled-doc-empty { text-align: center; color: #999; }

/* Firmas */
.sopled-doc .firma-container { display: table; width: 100%; margin-top: 25px; }
.sopled-doc .firma-col { display: table-cell; width: 45%; vertical-align: bottom; }
.sopled-doc .firma-space { display: table-cell; width: 10%; }
.sopled-doc .firma-linea { border-bottom: 1px solid #444; margin-bottom: 6px; height: 40px; }
.sopled-doc .firma-leyenda { font-size: 9.5px; color: #333; font-weight: bold; text-transform: uppercase; }
.sopled-doc .firma-sub { font-size: 9px; color: #777; margin-top: 2px; }

.sopled-doc-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 20px; padding-top: 14px; border-top: 1px solid #edeff5; }
.doc-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--bg-alt);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all var(--transition-fast);
}
.doc-btn:hover { border-color: var(--card-border-hover); color: var(--text-primary); text-decoration: none; }
.doc-btn.primary { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.doc-btn.primary:hover { background: rgba(59,130,246,.2); }

/* Documento OT (estilo PDF) */
.sopled-doc .sec-count { color: #3827f5; background: rgba(56,39,245,.08); padding: 1px 7px; border-radius: 10px; font-size: 9px; margin-left: 4px; }
.sopled-doc .meta-value.important { color: #3827f5; font-weight: bold; }
.sopled-doc .grid-value.strong { font-weight: bold; color: #3827f5; text-transform: uppercase; }
.sopled-doc .doc-chip {
  display: inline-block; font-size: 9px; font-weight: bold; text-transform: uppercase;
  padding: 2px 8px; border-radius: 10px; background: rgba(56,39,245,.1); color: #3827f5;
}
.sopled-doc .doc-chip.cerrada { background: rgba(16,185,129,.14); color: #059669; }
.sopled-doc .doc-chip.abierta { background: rgba(59,130,246,.14); color: #2563eb; }
.sopled-doc .doc-chip.alta { background: rgba(239,68,68,.14); color: #dc2626; }
.sopled-doc .doc-chip.media { background: rgba(245,158,11,.16); color: #d97706; }
.sopled-doc .doc-chip.baja { background: rgba(59,130,246,.14); color: #2563eb; }
.sopled-doc .sec-bar { text-align: left; }

.sopled-doc .equipo-block {
  background: #f8f9fa; border: 1px solid #3827f5; border-radius: 4px;
  padding: 12px 14px; margin-bottom: 16px;
}
.sopled-doc .equipo-tag { font-size: 9px; font-weight: bold; color: #3827f5; text-transform: uppercase; letter-spacing: .4px; }
.sopled-doc .equipo-nombre { font-size: 15px; font-weight: bold; color: #3827f5; margin: 2px 0 8px; }
.sopled-doc .grid-table { width: 100%; border-collapse: collapse; }
.sopled-doc .grid-table td { padding: 4px 6px; font-size: 10.5px; vertical-align: middle; }
.sopled-doc .grid-label { color: #555; font-weight: bold; width: 22%; }
.sopled-doc .grid-value { color: #1a1a1a; width: 28%; }

.sopled-doc .task-card {
  display: table; width: 100%; border-bottom: 0.5px solid #e0e0e0;
  padding: 10px 0; background: #fff; page-break-inside: avoid;
}
.sopled-doc .task-left { display: table-cell; width: 68%; vertical-align: top; padding-right: 16px; }
.sopled-doc .task-desc { font-size: 11.5px; font-weight: bold; color: #1a1a1a; margin-bottom: 5px; text-transform: uppercase; }
.sopled-doc .task-meta-line { font-size: 9.5px; color: #555; margin-top: 4px; text-transform: uppercase; }
.sopled-doc .task-meta-line b { color: #1a1a1a; font-weight: bold; }
.sopled-doc .task-right { display: table-cell; width: 32%; padding-left: 16px; border-left: 0.5px solid #ddd; vertical-align: top; font-size: 9.5px; }
.sopled-doc .tr-icons-row { margin-bottom: 6px; }
.sopled-doc .tr-icon-box {
  display: inline-block; width: 22px; height: 22px; border: 1px solid #ccc; background: #f9f9f9;
  text-align: center; line-height: 20px; font-size: 11px; margin-right: 4px; border-radius: 3px; color: #666;
}
.sopled-doc .tr-icon-box.orange { background: #f39c12; color: #fff; border-color: #e67e22; }
.sopled-doc .tr-info-line { margin-top: 3px; color: #444; text-transform: uppercase; }
.sopled-doc .tr-info-line b { color: #1a1a1a; font-weight: bold; }

.sopled-doc .obs-block { margin: 6px 0 16px; }
.sopled-doc .obs-item { padding: 8px 2px; border-bottom: 0.5px solid #eee; }
.sopled-doc .obs-item:first-child { padding-top: 0; }
.sopled-doc .obs-item > span { display: block; font-size: 9px; font-weight: bold; color: #3827f5; text-transform: uppercase; margin-bottom: 3px; }
.sopled-doc .obs-item p { margin: 0; font-size: 11px; color: #1a1a1a; line-height: 1.4; }

.sopled-doc .sop-led { border: 1px solid #edeff5; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }
.sopled-doc .sop-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.sopled-doc .sop-num { font-size: 11px; font-weight: bold; color: #3827f5; }
.sopled-doc .sop-type { font-size: 9.5px; font-weight: bold; color: #d97706; text-transform: uppercase; }
.sopled-doc .sop-links { display: flex; gap: 10px; }
.sopled-doc .sop-links .lnk { font-size: 10px; color: #3827f5; font-weight: bold; }
.sopled-doc .sop-grid { display: flex; flex-wrap: wrap; gap: 8px 24px; }
.sopled-doc .sop-grid > div { min-width: 120px; }
.sopled-doc .sop-grid span { display: block; font-size: 8.5px; color: #777; text-transform: uppercase; }
.sopled-doc .sop-grid b { font-size: 10.5px; color: #1a1a1a; }
.sopled-doc .sop-items { margin-top: 8px; border-top: 1px dashed #e0e0e0; padding-top: 8px; }
.sopled-doc .sop-item { display: flex; gap: 10px; padding: 4px 0; border-bottom: 0.5px solid #f0f2f6; }
.sopled-doc .sop-item:last-child { border-bottom: none; }
.sopled-doc .sop-item-qty { font-family: 'Lato', sans-serif; font-size: 10px; font-weight: bold; color: #3827f5; white-space: nowrap; min-width: 70px; }
.sopled-doc .sop-item-info { display: flex; flex-direction: column; gap: 1px; }
.sopled-doc .sop-item-ref { font-size: 10px; font-weight: bold; color: #1a1a1a; }
.sopled-doc .sop-item-desc { font-size: 9.5px; color: #555; }

.sopled-doc .crono-list { border-left: 2px solid #edeff5; margin: 4px 0 16px 6px; padding-left: 14px; }
.sopled-doc .crono-item { margin-bottom: 12px; position: relative; }
.sopled-doc .crono-dot { position: absolute; left: -21px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; }
.sopled-doc .crono-dot.creacion, .sopled-doc .crono-dot.apertura { background: #3b82f6; }
.sopled-doc .crono-dot.cierre, .sopled-doc .crono-dot.cerrada { background: #10b981; }
.sopled-doc .crono-dot.anulacion { background: #ef4444; }
.sopled-doc .crono-head { display: flex; justify-content: space-between; gap: 10px; }
.sopled-doc .crono-accion { font-size: 10.5px; font-weight: bold; color: #1a1a1a; text-transform: uppercase; }
.sopled-doc .crono-accion.cierre, .sopled-doc .crono-accion.cerrada { color: #059669; }
.sopled-doc .crono-accion.apertura { color: #2563eb; }
.sopled-doc .crono-fecha { font-size: 9.5px; color: #888; white-space: nowrap; }
.sopled-doc .crono-detail { font-size: 10px; color: #555; margin-top: 2px; }
.sopled-doc .crono-user { font-size: 9px; color: #999; margin-top: 2px; }



/* Grid de tarjetas */
.mc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.mc-card {
  background: var(--bg-alt);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 12px 16px 14px;
}
.mc-card.mc-costos {
  background: linear-gradient(135deg, rgba(59,130,246,.06), rgba(59,130,246,.02));
  border-color: rgba(59,130,246,.15);
}
.mc-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .7px; color: var(--accent);
  margin-bottom: 8px;
}
.mc-fields { display: flex; flex-direction: column; gap: 1px; }
.mc-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; padding: 3px 0;
  font-size: 12px;
}
.mc-row > span:first-child { color: var(--text-tertiary); white-space: nowrap; font-size: 11px; }
.mc-row > span:last-child { color: var(--text-primary); text-align: right; font-weight: 500; word-break: break-word; }
.mc-row .mono { font-family: 'Lato', sans-serif; }
.mc-row small { color: var(--text-tertiary); font-size: 10px; }
.mc-total { border-top: 1px solid var(--card-border); margin-top: 3px; padding-top: 5px; }
.clr-accent { color: var(--accent) !important; font-weight: 700 !important; font-size: 13px; }
.tag-yn {
  display: inline-block; padding: 1px 8px; border-radius: 10px;
  font-size: 10px; font-weight: 600;
}
.tag-yn.yes { background: rgba(16,185,129,.15); color: #10b981; }
.tag-yn.no { background: rgba(100,116,139,.15); color: #94a3b8; }
.lnk { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 12px; }
.lnk:hover { text-decoration: underline; }

/* Bloques grandes */
.mc-block {
  background: var(--bg-alt);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.mc-tag {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 10px;
  background: var(--accent); color: #fff;
  font-size: 11px; font-weight: 700;
  vertical-align: middle; margin-left: 6px;
}
.mc-desc { margin-bottom: 12px; }
.mc-desc:last-child { margin-bottom: 0; }
.mc-desc strong {
  display: block; font-size: 10px; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-tertiary); margin-bottom: 4px;
}
.mc-desc p { margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; }

/* Mini cards (sub-ordenes) */
.mc-cards-mini {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
}
.mini-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 10px 12px;
  transition: border-color .15s;
}
.mini-card:hover { border-color: var(--accent); }
.mini-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.mini-code { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .3px; }
.mini-name { font-size: 10px; color: var(--text-tertiary); }
.mini-body { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }

/* SOPLED */
.sop-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  margin-top: 10px;
  overflow: hidden;
}
.sop-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg-alt);
  border-bottom: 1px solid var(--card-border);
}
.sop-head-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.sop-head-right { display: flex; align-items: center; gap: 10px; }
.sop-num { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.sop-date { font-size: 11px; color: var(--text-tertiary); }
.sop-date small { font-size: 10px; }
.sop-type {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px;
  padding: 2px 8px; border-radius: 8px;
  background: rgba(245,158,11,.12); color: #f59e0b;
}
.sop-body { padding: 12px 16px 14px; }
.sop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 4px 20px;
  font-size: 11px;
}
.sop-grid > div { display: flex; gap: 6px; }
.sop-grid span { color: var(--text-tertiary); white-space: nowrap; }
.sop-grid b { color: var(--text-primary); font-weight: 500; }
.sop-items {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--card-border);
}
.sop-items-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text-tertiary);
  margin-bottom: 6px;
}
.sop-item {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 5px 0;
  border-bottom: 1px solid var(--card-border);
}
.sop-item:last-child { border-bottom: none; }
.sop-item-qty {
  color: var(--accent); font-weight: 700; white-space: nowrap;
  min-width: 44px; font-size: 12px;
}
.sop-item-info { display: flex; flex-direction: column; gap: 1px; }
.sop-item-ref { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.sop-item-desc { font-size: 11px; color: var(--text-secondary); }

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
.crono-line { display: flex; gap: 10px; }
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

/* Tabla de Almacén dentro del modal OT — mismo diseño de documento (papel blanco, tinta oscura, azul) */
.ot-window-warehouse :deep(.table-wrapper) {
  background: #ffffff;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  backdrop-filter: none;
  box-shadow: none;
}
.ot-window-warehouse :deep(.table-header) { border-bottom: 1px solid #e5e7eb; }
.ot-window-warehouse :deep(.table-title) { color: #1a1a1a; font-family: 'Lato', sans-serif; }
.ot-window-warehouse :deep(.table-count) { color: #555; background: #f1f5f9; }
.ot-window-warehouse :deep(.search-wrapper) { background: #f1f5f9; color: #64748b; }
.ot-window-warehouse :deep(.search-input) { color: #1a1a1a; }
.ot-window-warehouse :deep(.search-input::placeholder) { color: #94a3b8; }
.ot-window-warehouse :deep(.export-btn) { color: #3827f5; border-color: #d1d5db; background: transparent; }
.ot-window-warehouse :deep(.export-btn:hover) { background: rgba(56,39,245,.08); border-color: transparent; }
.ot-window-warehouse :deep(.dropdown-toggle) { background: #f1f5f9; color: #475569; }
.ot-window-warehouse :deep(.dropdown-summary) { color: #94a3b8; }
.ot-window-warehouse :deep(.dropdown-menu),
.ot-window-warehouse :deep(.col-menu) { background: #ffffff; border-color: #e2e8f0; box-shadow: 0 10px 30px -5px rgba(0,0,0,.18); }
.ot-window-warehouse :deep(.dropdown-all),
.ot-window-warehouse :deep(.dropdown-item),
.ot-window-warehouse :deep(.col-item) { color: #475569; }
.ot-window-warehouse :deep(.dropdown-all:hover),
.ot-window-warehouse :deep(.dropdown-item:hover) { background: rgba(56,39,245,.06); }
.ot-window-warehouse :deep(.dropdown-all) { border-bottom-color: #e2e8f0; }
.ot-window-warehouse :deep(.col-menu-reset) { color: #475569; border-color: #e2e8f0; }
.ot-window-warehouse :deep(.table th) { background: #f8f9fa; color: #1a1a1a; border-bottom: 2px solid #e5e7eb; font-family: 'Lato', sans-serif; }
.ot-window-warehouse :deep(.table td) { color: #1a1a1a; border-bottom: 1px solid #eef2f7; }
.ot-window-warehouse :deep(.table tbody tr:nth-child(even) td) { background: #fafbfc; }
.ot-window-warehouse :deep(.table tbody tr:hover td),
.ot-window-warehouse :deep(.table tbody tr:hover) { background: #eef2ff; }
.ot-window-warehouse :deep(.table-pagination) { color: #1a1a1a; border-top-color: #e5e7eb; }
.ot-window-warehouse :deep(.table-pagination button) { background: #f1f5f9; color: #475569; }
.ot-window-warehouse :deep(.table-pagination button:hover:not(:disabled)) { background: rgba(56,39,245,.08); color: #3827f5; }

@media (max-width: 768px) {
  .section-sub { font-size: 11px; }
}
</style>

<style>
/* ═══════════════════════════════════════════════════
   Paginación del informe para el PDF (html2pdf, modo 'css' + 'legacy').
   Las reglas CSS controlan qué elementos NO deben partirse entre páginas.
   Los saltos explícitos se hacen con divs .html2pdf__page-break en el template.
   ═══════════════════════════════════════════════════ */
.reporte-doc .section-title { page-break-after: avoid; break-after: avoid; }
.reporte-doc .doc-header,
.reporte-doc .doc-header-static,
.reporte-doc .doc-title-wrap,
.reporte-doc .note-bar,
.reporte-doc .kpi-table,
.reporte-doc .chart-row,
.reporte-doc .exec-box,
.reporte-doc .footer,
.reporte-doc .page-header-mini { page-break-inside: avoid; break-inside: avoid; }
.reporte-doc tr { page-break-inside: avoid; break-inside: avoid; }
.reporte-doc table { border-collapse: collapse; }
/* Responsive: allow horizontal scroll on small screens */
.informe-section { overflow-x: auto; }
@media print {
  @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
  .informe-bar,
  .ots-bar,
  .almacen-view-toggle,
  .informe-controls { display: none !important; }
  .informe-section { overflow: visible !important; }
  .reporte-doc {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    max-width: 100% !important;
    background: #ffffff !important;
    color: #1a1a2e !important;
  }
}
</style>
