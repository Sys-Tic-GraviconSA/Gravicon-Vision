<template>
  <div class="inspeccion-tab">
    <!-- Vistas con ruta propia: …/maquinaria/llantas/graficas | inventario | informe -->
    <div class="almacen-view-toggle">
      <RouterLink class="av-btn" :to="rutaMant.enlace({ llantas: 'graficas' })" replace :class="{ active: vista === 'graficas' }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Gráficas
      </RouterLink>
      <RouterLink class="av-btn" :to="rutaMant.enlace({ llantas: 'alertas' })" replace :class="{ active: vista === 'alertas' }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Alertas<span v-if="m.resumenAlertas.value.criticas" class="av-badge">{{ m.resumenAlertas.value.criticas }}</span>
      </RouterLink>
      <RouterLink class="av-btn" :to="rutaMant.enlace({ llantas: 'inventario' })" replace :class="{ active: vista === 'inventario' }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Inventario
      </RouterLink>
      <RouterLink class="av-btn" :to="rutaMant.enlace({ llantas: 'informe' })" replace :class="{ active: vista === 'informe' }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Informe
      </RouterLink>
    </div>

    <SkeletonLoader v-if="store.loading && !store.data" :kpis="4" :charts="2" label="Cargando inventario de llantas…" />
    <div v-else-if="store.error && !store.data" class="disp-banner err">Error: {{ store.error }}</div>
    <div v-else-if="!m.llantas.value.length" class="disp-banner warn">
      Sin llantas para los filtros seleccionados. Se lee de la hoja <strong>FleetControl_Llantas · Inventario_Llantas_Concretros</strong>.
    </div>

    <template v-else>
      <!-- ================= GRÁFICAS (tablero de la hoja ESTRUCTURA) ================= -->
      <template v-if="vista === 'graficas'">
        <div v-if="!m.hayInspecciones.value" class="disp-banner warn">
          No hay inspecciones de llantas en el rango de fechas: el semáforo, las presiones y el desgaste se calculan con las inspecciones del período.
        </div>

        <h3 class="section-title"><span class="title-bar"></span>Control financiero y operativo</h3>
        <div class="kpi-row">
          <KpiCard v-for="k in kpisFinancieros" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :detail="k.detail" :meta="k.meta" />
        </div>

        <h3 class="section-title"><span class="title-bar"></span>Estado de la flota en la inspección</h3>
        <div class="kpi-row">
          <KpiCard v-for="k in kpisInspeccion" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :detail="k.detail" :meta="k.meta" />
        </div>
        <div class="charts-grid cols-3">
          <ChartCard title="Semáforo Global de Llantas" :description="`Última inspección de cada llanta con el criterio de su posición: crítica = cambio inmediato; atención = proyectado`" :option="optSemaforo" :height="300" />
          <ChartCard title="Cumplimiento de Planes de Acción" description="Llantas con plan de acción en la última inspección que ya tienen una OT de llantas cerrada después" :option="optPlanes" :height="300" />
          <ChartCard title="Auditoría de Presiones (PSI)" :description="`Llantas por rango de presión y planta: correcta entre ${PSI_MIN} y ${PSI_MAX} PSI`" :option="optPresiones" :height="300" />
        </div>

        <h3 class="section-title"><span class="title-bar"></span>Tendencia y composición</h3>
        <div class="charts-grid cols-2">
          <ChartCard title="Composición de Flota por Referencia" description="Llantas montadas y en stock por dimensión (sin las dadas de baja)" :option="optComposicion" :height="340" />
          <ChartCard title="Rendimiento de Vida Útil por Marca" :description="`Meses en servicio desde el montaje y meses que le quedan hasta el límite de su posición al ritmo de desgaste actual (vida total estimada en el tooltip)`" :option="optVidaMarca" :height="340" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard title="Desgaste por Marca" description="Desgaste promedio (mm/mes; menor = más vida útil); al lado, el remanente promedio" :option="optMarcas" :height="340" />
          <ChartCard title="Participación de Proveedores" description="Valor de las OT de llantas por proveedor en el período; al lado, el número de OT" :option="optProveedores" :height="340" />
        </div>

        <h3 class="section-title"><span class="title-bar"></span>Rankings operativos y gestión por excepción</h3>
        <div class="charts-grid cols-2">
          <ChartCard :title="`Top Vehículos Críticos (Alerta Roja)`" description="Placas con más llantas en cambio inmediato; al lado, las de cambio proyectado" :option="optCriticos" :expand-option="optCriticosTodos" :height="400" />
          <ChartCard title="Tasa de Desgaste: Peores vs. Mejores" :description="`Top 5 y bottom 5 de placas por mm perdidos al mes (mínimo 3 llantas medidas); en rojo, más de ${DESGASTE_ALTO} mm/mes`" :option="optDesgaste" :height="400" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard :title="`Índice de Cuidado Operacional — Top ${TOP} por Mejorar`" description="Puntaje 0-100 por placa: 50 % presiones correctas + 50 % llantas sin cortes ni desgarros; menor puntaje primero" :option="optCuidado" :expand-option="optCuidadoTodos" :height="420" />
          <ChartCard title="Requerimientos a 0 Días por Dimensión" description="Llantas en cambio inmediato por medida y planta: lo que el almacén debe despachar hoy" :option="optRequerimientos" :height="420" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard title="Distribución Causal: Desgaste vs. Daño" description="Causa de las llantas en cambio inmediato: desgaste natural (ámbar) o daño por operación (rojo)" :option="optCausas" :height="320" />
          <ChartCard title="Patrones de Desgaste Irregular" :description="`Llantas con cada patrón en la última inspección (alineación, presión, diferencia transversal > ${DIF_TRANSVERSAL} mm)`" :option="optPatrones" :height="320" />
        </div>
      </template>

      <!-- ================= ALERTAS (hoja «CRITERIOS INSPECCIÓN LLANTAS») ================= -->
      <template v-else-if="vista === 'alertas'">
        <div v-if="!m.hayInspecciones.value" class="disp-banner warn">No hay inspecciones de llantas en el rango de fechas: las alertas se calculan con la última inspección de cada llanta.</div>
        <div v-if="m.resumenAlertas.value.urgencia" class="disp-banner err">
          <strong>Urgencia absoluta (Prioridad 0):</strong>&nbsp;{{ m.resumenAlertas.value.urgencia }} {{ m.resumenAlertas.value.urgencia === 1 ? 'llanta crítica' : 'llantas críticas' }} en las posiciones 1 a 4 (jerarquía direccional) en
          {{ m.resumenAlertas.value.placasUrgencia.join(', ') }}. Inmovilizar y retirar antes de operar.
        </div>
        <div class="kpi-row">
          <KpiCard v-for="k in kpisAlertas" :key="k.label" :label="k.label" :value="k.value" :icon="k.icon" :accent="k.accent" :detail="k.detail" />
        </div>
        <div class="charts-grid cols-2">
          <ChartCard title="Alertas por Grupo de Posición" description="Llantas críticas y en atención según el criterio de su posición (direccional, tracción, arrastre, OTR, livianos)" :option="optAlertasGrupo" :height="320" />
          <ChartCard title="Alertas Críticas por Prioridad de Compra y Planta" description="Prioridad 0 = falla en posiciones 1 a 4; Nivel 1 = inmediata; Nivel 2 = próxima SOLPED" :option="optAlertasPrioridad" :height="320" />
        </div>
        <DataTable
          title="Alertas activas — clic en una fila para ver la ficha de la llanta"
          :data="alertasRows"
          :page-size="20"
          :badgeFields="['Clasificación', 'Prioridad SOLPED']"
          :defaultVisible="['Placa', 'Pos.', 'Grupo', 'Marca', 'Dimensión', 'Pmín (mm)', 'Clasificación', 'Motivo', 'Prioridad SOLPED', 'Acción']"
          small selectColumns exportColumns clickable
          @row-click="openDetalle"
        />
        <div class="criterios-card">
          <h3 class="section-title"><span class="title-bar"></span>Criterios de inspección aplicados</h3>
          <div class="criterios-wrap">
            <table class="criterios">
              <thead><tr><th>Posición</th><th>Función</th><th class="r">Atención</th><th class="r">Crítica</th><th>Descarte directo</th><th>Prioridad (SOLPED)</th><th>Acción inmediata</th></tr></thead>
              <tbody>
                <tr v-for="(c, k) in CRITERIOS" :key="k">
                  <td><b>{{ k }}</b><small>{{ c.posiciones }}</small></td><td>{{ c.funcion }}</td>
                  <td class="r">{{ c.atencion > c.critico ? `≤ ${fmtN(c.atencion, 1)} mm` : '—' }}</td><td class="r"><b>≤ {{ fmtN(c.critico, 1) }} mm</b></td>
                  <td>{{ c.descarte.map(d => d.nombre).join(' · ') }}</td><td>{{ c.prioridad }}</td><td>{{ c.accion }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="reglas">
            <li><b>Regla 1 · Jerarquía direccional:</b> cualquier falla en las posiciones 1 a 4 pesa {{ fmtN(FACTOR_DIRECCIONAL, 1) }}× y escala a Urgencia absoluta (Prioridad 0) en el informe.</li>
            <li><b>Regla 2 · Cascada de posiciones:</b> en P1-P2 solo llantas nuevas ({{ PROF_NUEVA_MIN }}-18 mm); al llegar a {{ fmtN(ROTACION_MIN, 1) }}-{{ fmtN(ROTACION_MAX, 1) }} mm se sugiere rotar al eje de tracción; las reencauchadas van a arrastre (P11-P18).</li>
            <li><b>Regla 3 · Bloqueo de OT:</b> una llanta reencauchada o con reparación estructural no se puede montar en las posiciones 1 a 4 ({{ m.resumenAlertas.value.bloqueos }} casos hoy).</li>
          </ul>
        </div>
      </template>

      <!-- ================= INVENTARIO ================= -->
      <template v-else-if="vista === 'inventario'">
        <div class="disp-banner" :class="m.cronologia.value.length ? 'ok' : 'warn'">
          <template v-if="m.cronologia.value.length">Inventario {{ fechaFin ? `al ${fechaTxt(Math.round(Date.parse(fechaFin) / 86400000) + 25569)}` : 'actual' }} armado con la hoja <strong>Cronologia_Llantas_Concreos</strong>: los cambios posteriores al corte se deshacen y cada llanta muestra su último cambio.</template>
          <template v-else>La hoja <strong>Cronologia_Llantas_Concreos</strong> aún no tiene registros: el inventario se muestra con el estado actual de la hoja de inventario. Apenas se registren cambios, el inventario se arma con la cronología a la fecha de corte del filtro.</template>
        </div>
        <DataTable
          title="Inventario de Llantas — clic en una fila para ver la ficha"
          :data="invTableRows"
          :page-size="25"
          :badgeFields="['Estado', 'Semáforo']"
          :defaultVisible="['Id', 'Nº Serie', 'Marca', 'Dimensión', 'Estado', 'Ubicación', 'Tipo de Vehículo', 'Planta', 'Posición', 'Remanente (mm)', 'Semáforo', 'PSI', 'Días en Servicio', 'Último Cambio', 'Costo']"
          small selectColumns exportColumns clickable
          @row-click="openDetalle"
        />
      </template>

      <!-- ================= INFORME ================= -->
      <InformeLlantasTab v-else :filtros="filtros" />
    </template>

    <!-- Ficha de llanta: mismo modal de 3 ventanas que el detalle de una OT (documento · tabla · cronología) -->
    <Transition name="modal-pop">
    <div v-if="detalle" class="modal-overlay" @click.self="detalle = null">
      <div class="modal-panel ot-modal-panel">
        <button class="modal-close" @click="detalle = null">✕</button>

        <div class="ot-workspace">

          <!-- VENTANA 1: Ficha de la llanta -->
          <section class="ot-window ot-window-order">
          <div class="ot-doc">
          <div class="hdr">
            <div class="hdr-logo"><img src="/Logos/logo-azul-informe.png" alt="GRAVICON" @error="($event.target as HTMLImageElement).style.display='none'" /></div>
            <div class="hdr-info">
              <div class="co">GRAVICON S.A. - CONCRETOS</div>
              <div class="ref">Código: F-LL-01 - Versión: 1 - Gestión de Llantas</div>
              <div class="ot-title">Ficha de Llanta</div>
            </div>
            <div class="hdr-folio">
              <div class="folio-lbl">No. serie: <span class="folio-num">{{ detalle.serie || '—' }}</span></div>
              <div class="folio-date">Id registro: {{ detalle.id }}</div>
              <div class="folio-date">Registro: {{ fechaTxt(detalle.fechaRegistro) }}</div>
            </div>
          </div>

          <!-- Datos tal como están en la hoja Inventario_Llantas_Concretros -->
          <div class="sec-bar">Datos del inventario</div>
          <table class="meta-container"><tbody>
            <tr>
              <td class="meta-label">Marca:</td><td class="meta-value">{{ detalle.marca }}</td>
              <td class="meta-label">Modelo:</td><td class="meta-value">{{ detalle.modelo || '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Dimensión:</td><td class="meta-value">{{ detalle.dimension }}</td>
              <td class="meta-label">Fecha de fabricación (DOT):</td>
              <td class="meta-value" :style="{ color: (detalle.dotAnios ?? 0) > DOT_ANIOS ? '#dc2626' : undefined, fontWeight: (detalle.dotAnios ?? 0) > DOT_ANIOS ? 'bold' : undefined }">
                {{ detalle.dotFecha ? fechaTxt(Math.round(detalle.dotFecha.getTime() / 86400000) + 25569) : detalle.dotTexto || '—' }}<template v-if="detalle.dotAnios !== null"> ({{ fmtN(detalle.dotAnios, 1) }} años)</template>
              </td>
            </tr>
            <tr>
              <td class="meta-label">Fecha de compra:</td><td class="meta-value">{{ fechaTxt(detalle.fechaCompra) }}</td>
              <td class="meta-label">Costo adquisición:</td><td class="meta-value" style="font-weight:bold;color:#3827f5">{{ detalle.costo > 0 ? cop(detalle.costo) : '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Estado de inventario:</td><td class="meta-value" style="font-weight:bold">{{ detalle.estado }}</td>
              <td class="meta-label">Planta:</td><td class="meta-value">{{ detalle.planta }}</td>
            </tr>
          </tbody></table>

          <!-- Vehículo y posición (campos Placa, Tipo de Vehiculo, Posición en el vehiculo, Eje, Lado, Tipo de aplicación) -->
          <div class="equipo-block">
            <div class="equipo-tag">Vehículo asignado</div>
            <div class="equipo-nombre">{{ detalle.vehiculo || detalle.placa }}</div>
            <table class="grid-table"><tbody>
              <tr>
                <td class="grid-label">Placa:</td><td class="grid-value" style="font-weight:bold">{{ detalle.placa }}</td>
                <td class="grid-label">Tipo de vehículo:</td><td class="grid-value">{{ detalle.tipo }}</td>
              </tr>
              <tr>
                <td class="grid-label">Posición en el vehículo:</td><td class="grid-value" style="font-weight:bold">{{ detalle.posicion ? 'P' + detalle.posicion : '—' }}</td>
                <td class="grid-label">Tipo de aplicación:</td><td class="grid-value">{{ detalle.aplicacion || '—' }}</td>
              </tr>
              <tr>
                <td class="grid-label">Eje:</td><td class="grid-value">{{ detalle.eje || '—' }}</td>
                <td class="grid-label">Lado:</td><td class="grid-value">{{ detalle.lado || '—' }}</td>
              </tr>
            </tbody></table>
          </div>

          <!-- Montaje inicial (Fecha inicial, profundidades iniciales y Valor / Unidad de Registro) -->
          <div class="sec-bar">Montaje inicial</div>
          <table class="meta-container"><tbody>
            <tr>
              <td class="meta-label">Fecha inicial:</td><td class="meta-value">{{ fechaTxt(detalle.fechaInicial) }}</td>
              <td class="meta-label">Lectura del equipo:</td><td class="meta-value">{{ detalle.lecturaInicial ? fmtN(detalle.lecturaInicial, 1) + (detalle.unidadInicial ? ' ' + detalle.unidadInicial : '') : '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Prof. inicial ext / cen / int:</td><td class="meta-value">{{ numTxt(detalle.profIniExt) }} / {{ numTxt(detalle.profIniCen) }} / {{ numTxt(detalle.profIniInt) }} mm</td>
              <td class="meta-label">Fecha de registro:</td><td class="meta-value">{{ fechaTxt(detalle.fechaRegistro) }}</td>
            </tr>
          </tbody></table>

          <!-- Última inspección (Sub_Inspec_Llantas) con su clasificación por criterio de posición -->
          <div class="sec-bar">Última inspección</div>
          <table v-if="detalle.insp" class="meta-container"><tbody>
            <tr>
              <td class="meta-label">Fecha:</td><td class="meta-value">{{ fechaTxt(detalle.insp.fecha) }}</td>
              <td class="meta-label">Evaluador:</td><td class="meta-value">{{ detalle.insp.evaluador || '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Prof. ext / cen / int:</td><td class="meta-value">{{ numTxt(detalle.insp.ext) }} / {{ numTxt(detalle.insp.cen) }} / {{ numTxt(detalle.insp.int) }} mm</td>
              <td class="meta-label">Remanente (Pmín):</td>
              <td class="meta-value" :style="{ fontWeight: 'bold', color: detalle.semaforo ? SEMAFORO_COLOR[detalle.semaforo] : undefined }">
                {{ numTxt(detalle.insp.remanente) }} mm<template v-if="detalle.semaforo"> · {{ SEMAFORO_LBL[detalle.semaforo] }}</template>
              </td>
            </tr>
            <tr>
              <td class="meta-label">PSI:</td><td class="meta-value">{{ detalle.insp.psi ? detalle.insp.psi + ' · ' + detalle.presion : 'Sin medir' }}</td>
              <td class="meta-label">Lectura del equipo:</td><td class="meta-value">{{ detalle.insp.lectura ? fmtN(detalle.insp.lectura, 1) + (detalle.insp.unidad ? ' ' + detalle.insp.unidad : '') : '—' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Condiciones irregulares:</td><td class="meta-value" colspan="3">{{ detalle.insp.condiciones.join(' · ') || 'Sin novedad / Operativa' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Plan de acción:</td><td class="meta-value" colspan="3">{{ detalle.insp.plan.join(' · ') || '—' }}</td>
            </tr>
          </tbody></table>
          <div v-else class="doc-empty">Sin inspecciones en el rango de fechas seleccionado.</div>

          <!-- Criterio de inspección por posición -->
          <div v-if="detalle.alerta" class="alerta-doc" :class="detalle.alerta.nivel === 'Crítica' ? 'critica' : detalle.alerta.nivel === 'Atención' ? 'atencion' : 'ok'">
            <div class="alerta-doc-head">
              <b>{{ detalle.alerta.nivel === 'OK' ? 'Sin alerta' : detalle.alerta.nivel }}</b>
              <span>{{ detalle.alerta.categoria }}{{ detalle.alerta.criterio ? ` · crítica ≤ ${fmtN(detalle.alerta.criterio.critico, 1)} mm` : '' }}</span>
              <span v-if="detalle.alerta.nivel !== 'OK'" class="alerta-doc-prio">{{ detalle.alerta.prioridad }}</span>
            </div>
            <div v-if="detalle.alerta.motivos.length">{{ detalle.alerta.motivos.join(' · ') }}</div>
            <div class="alerta-doc-accion">{{ detalle.alerta.accion }}</div>
            <div v-for="(x, i) in detalle.alerta.sugerencias" :key="i" class="alerta-doc-sug">{{ x }}</div>
            <div v-if="detalle.alerta.bloqueoOt" class="alerta-doc-bloqueo">{{ detalle.alerta.bloqueoOt }}</div>
          </div>

          <!-- Indicadores calculados con el montaje inicial y las inspecciones -->
          <div class="sec-bar">Indicadores</div>
          <div class="vida-grid">
            <div><span>Desgaste</span><b>{{ detalle.desgasteMes !== null ? fmtN(detalle.desgasteMes, 2) + ' mm/mes' : '—' }}</b><small>{{ detalle.anterior ? 'desde ' + fechaTxt(detalle.anterior.fecha) : 'sin medición anterior válida' }}</small></div>
            <div><span>Días desde el montaje</span><b>{{ vidaDet.diasServicio !== null ? fmtN(vidaDet.diasServicio, 0) + ' días' : '—' }}</b><small>{{ vidaDet.inicio ? 'desde ' + fechaTxt(vidaDet.inicio) : 'sin fecha inicial' }}</small></div>
            <div><span>Caucho consumido</span><b>{{ vidaDet.mmConsumidos !== null ? fmtN(vidaDet.mmConsumidos, 1) + ' mm' : '—' }}</b><small>de {{ numTxt(detalle.profInicial) }} mm iniciales</small></div>
            <div><span>Recorrido</span><b>{{ vidaDet.recorrido !== null ? fmtN(vidaDet.recorrido, 0) + ' ' + (vidaDet.unidad || 'u.') : '—' }}</b><small>{{ vidaDet.porMm !== null ? fmtN(vidaDet.porMm, 0) + ' por mm' : 'lecturas no comparables' }}</small></div>
            <div><span>Vida restante</span><b>{{ vidaDet.vidaRestanteMeses !== null ? fmtN(vidaDet.vidaRestanteMeses, 1) + ' meses' : '—' }}</b><small>hasta el límite de su posición</small></div>
            <div><span>Vida total estimada</span><b>{{ vidaDet.vidaTotalMeses !== null ? fmtN(vidaDet.vidaTotalMeses, 1) + ' meses' : '—' }}</b><small>montaje + restante</small></div>
          </div>

          <div class="sec-bar">Evidencia fotográfica ({{ fotosDet.length }})</div>
          <div v-if="fotosDet.length" class="fotos-grid">
            <div v-for="f in fotosDet" :key="f.valor" class="foto-item"><FotoLlanta :valor="f.valor" grande :titulo="`Inspección del ${fechaTxt(f.fecha)}`" /><small>{{ fechaTxt(f.fecha) }}</small></div>
          </div>
          <div v-else class="doc-empty">Sin fotos: las inspecciones de esta llanta no tienen evidencia fotográfica cargada.</div>

        </div>
          </section>

          <!-- VENTANA 2: Inspecciones de la llanta -->
          <section class="ot-window ot-window-warehouse">
            <header class="ot-window-header">
              <h3>Inspecciones</h3>
              <span v-if="detalle.historial.length" class="ot-wh-badge">{{ detalle.historial.length }} {{ detalle.historial.length === 1 ? 'medición' : 'mediciones' }}</span>
            </header>
            <div class="ot-window-body">
              <div v-if="!detalle.historial.length" class="ot-panel-placeholder">
                <span class="placeholder-icon">🛞</span>
                <span class="placeholder-text">Sin inspecciones</span>
                <span class="placeholder-sub">Esta llanta no tiene mediciones registradas</span>
              </div>
              <DataTable v-else title="Mediciones de la llanta" :data="inspeccionesDet" :page-size="10" :searchable="false"
                :defaultVisible="['Fecha', 'Placa / Pos.', 'Ext / Cen / Int', 'Remanente', 'PSI', 'Condición', 'Plan de Acción', 'Evaluador']" small />
            </div>
          </section>

          <!-- VENTANA 3: Cronología -->
          <section class="ot-window ot-window-timeline">
            <header class="ot-window-header">
              <h3>Cronología</h3>
            </header>
            <div class="ot-window-body">
              <CronologiaLista :eventos="cronoDet" vacio-titulo="Sin cambios registrados" vacio-texto="La hoja Cronologia_Llantas_Concreos no tiene registros de esta llanta" />
            </div>
          </section>

        </div>

      </div>
    </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * InspeccionLlantasTab.vue — Concretos → Mantenimiento → Maquinaria → Llantas.
 * Implementa el «DASHBOARD» de la hoja ESTRUCTURA (FleetControl_Llantas): fichas de control financiero y
 * operativo, semáforo, presiones, cumplimiento de planes, composición por referencia, rendimiento por marca,
 * proveedores, rankings (críticos, desgaste, cuidado operacional) e inventario dinámico. El informe
 * (Macro Informe Analítico) está en InformeLlantasTab. Los filtros son los de arriba (EquiposDashboard).
 */
import { donaCentro } from '../../utils/chartLayout'
import SkeletonLoader from '../../components/ui/SkeletonLoader.vue'
import { computed, onMounted, ref } from 'vue'
import { useLlantasStore, useMantenimientoStore } from '../../stores'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import ChartCard from '../../components/dashboard/ChartCard.vue'
import DataTable from '../../components/dashboard/DataTable.vue'
import InformeLlantasTab from './InformeLlantasTab.vue'
import FotoLlanta from './FotoLlanta.vue'
import CronologiaLista, { type CronoVista } from '../../components/mantenimiento/CronologiaLista.vue'
import { useRutaMantenimiento } from '../../composables/useRutaMantenimiento'
import {
  useLlantas, isoDe, type Llanta, type FiltrosLlantas, type Semaforo, type Presion, type TipoEvento, type EventoLlanta, EVENTO_LBL as EVENTO_TITULO,
  CRITERIOS, FACTOR_DIRECCIONAL, ROTACION_MIN, ROTACION_MAX, PROF_NUEVA_MIN, PSI_MIN, PSI_MAX, DESGASTE_ALTO, DIF_TRANSVERSAL, DOT_ANIOS, REENCAUCHE_MIN, REENCAUCHE_MAX, SEMAFORO_LBL, SEMAFORO_COLOR,
} from '../../composables/useLlantas'
import { COLOR_PLANTA, COLOR_EXTRA, PALETA, AZUL, FONT, fmtN, cop, copCorto, pct, punto, vacio, emphasis, useEstiloGraficas } from '../../composables/useGraficasConcreto'

const props = defineProps<{
  /** Rango del filtro de fechas de arriba (YYYY-MM-DD) */
  fechaInicio?: string
  fechaFin?: string
  /** Selección de los filtros de arriba (vacío = todos) */
  plantas?: string[]
  tipos?: string[]
  placas?: string[]
  marcas?: string[]
}>()

const rutaMant = useRutaMantenimiento()
const vista = rutaMant.vistaLlantas
const store = useLlantasStore()
const mant = useMantenimientoStore()
onMounted(() => {
  if (!store.data) void store.fetchData()
  // Las OT de llantas salen de las órdenes de Concretos (ya las carga Mantenimiento)
  if (!mant.concretosData && !mant.loading) void mant.fetchConcretos()
})

const filtros = computed<FiltrosLlantas>(() => ({
  fechaInicio: props.fechaInicio, fechaFin: props.fechaFin,
  plantas: props.plantas, tipos: props.tipos, placas: props.placas, marcas: props.marcas,
}))
const m = useLlantas(
  computed(() => store.data as Record<string, unknown> | null),
  computed(() => (mant.concretosData?.rows ?? []) as Record<string, unknown>[]),
  filtros,
)

const TOP = 15
const { isLight, chartTextColor, tinta, labelPill, base, leyenda, barrasH } = useEstiloGraficas()
const color = (p: string) => COLOR_PLANTA[p] ?? COLOR_EXTRA[0]
const numTxt = (v: unknown) => { const n = Number(v); return n > 0 ? fmtN(n, 1) : '—' }
const fechaTxt = (s: number) => { const iso = isoDe(Number(s) || 0); return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—' }

// ---------------------------------------------------------------- KPIs
const fila = (dot: string, lbl: string, val: string, extra = '') =>
  `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${dot}'></span><span class='kpi-label-int'>${lbl}</span> <strong>${val}</strong>${extra ? ` <span style='color:var(--text-tertiary);font-size:10px'>${extra}</span>` : ''}</div>`
const nota = (t: string) => `<div class='kpi-detail-row' style='color:var(--text-tertiary);font-size:10px'>${t}</div>`
const sinCosto = computed(() => m.financiero.value.conCosto === 0)
/** Valor en pesos o «sin costo» si la hoja no tiene el costo de adquisición */
const pesos = (v: number) => (sinCosto.value ? 'sin costo' : copCorto(v))

const kpisFinancieros = computed(() => {
  const f = m.financiero.value, s = m.suministro.value, pl = m.planes.value
  const notaCosto = sinCosto.value ? nota('La hoja no tiene el costo de adquisición de las llantas') : nota(`Costo promedio por llanta: ${cop(m.costoPromedio.value)}`)
  return [
    { label: 'Costo Inversión en Llantas', value: cop(f.inversion), icon: 'dollar', accent: '#2563EB',
      detail: fila('#3B82F6', 'OT de llantas', cop(f.otCosto), `${f.otN} OT`) + fila('#10B981', 'Compras', cop(f.compraCosto), `${f.compradas} llantas`) + (sinCosto.value ? nota('Compras sin costo cargado en la hoja') : '') },
    { label: 'Costo Consumo de Llantas', value: sinCosto.value ? `${fmtN(f.bajas, 0)} llantas` : cop(f.bajasValor), icon: 'trending-up', accent: '#DC2626',
      detail: fila('#EF4444', 'Dadas de baja', fmtN(f.bajas, 0), pesos(f.bajasValor)) + notaCosto },
    { label: 'Valorización de Inventario Activo', value: sinCosto.value ? `${fmtN(f.rodando + f.stock, 0)} llantas` : cop(f.rodandoValor + f.stockValor), icon: 'package', accent: '#0F766E',
      detail: fila('#10B981', 'Rodando', fmtN(f.rodando, 0), pesos(f.rodandoValor)) + fila('#3B82F6', 'Almacén / taller', fmtN(f.stock, 0), pesos(f.stockValor))
        + (f.sinEstado ? nota(`${fmtN(f.sinEstado, 0)} llantas sin estado de inventario`) : '') },
    { label: 'Tasa de Renovación', value: `${fmtN(f.compradas, 0)} : ${fmtN(f.bajas, 0)}`, icon: 'activity', accent: '#8B5CF6', meta: undefined,
      detail: nota('Compras : bajas del período') + fila('#10B981', 'Nuevas ingresadas', fmtN(f.compradas, 0), pesos(f.compraCosto)) + fila('#EF4444', 'Carcasas desechadas', fmtN(f.bajas, 0), pesos(f.bajasValor))
        + nota('Nuevas = con fecha de compra en el período') },
    { label: 'Eficiencia de Suministro', value: s.solicitadas ? pct(s.pct, 0) : '—', icon: 'truck', accent: s.solicitadas && s.pct < 50 ? '#DC2626' : '#16A34A',
      detail: fila('#EF4444', 'Solicitadas por inspección', fmtN(s.solicitadas, 0), pesos(s.valorSolicitado)) + fila('#10B981', 'Ya montadas / atendidas', fmtN(s.atendidas, 0))
        + nota('Cambio inmediato con baja, llanta nueva en la posición u OT de montaje posterior') },
    { label: 'Índice de Recuperación (Reencauche)', value: fmtN(f.reencauche, 0), icon: 'zap', accent: '#06B6D4',
      detail: fila('#06B6D4', 'Candidatas a reencauche', fmtN(m.reencauche.value.length, 0), `${fmtN(REENCAUCHE_MIN, 1)}-${fmtN(REENCAUCHE_MAX, 1)} mm sin cortes`)
        + nota(f.reencauche ? 'Llantas en reencauche (estado u OT)' : 'La hoja aún no registra llantas enviadas a reencauche') },
    { label: 'Stock vs. Colocadas', value: `${fmtN(f.stock, 0)} en stock`, icon: 'layers', accent: '#64748B',
      detail: fila('#3B82F6', 'En almacén / taller', fmtN(f.stock, 0)) + fila('#10B981', 'Colocadas (rodando)', fmtN(f.rodando, 0)) + fila('#94a3b8', 'Total inventario', fmtN(f.total, 0)) },
    { label: 'Cumplimiento de Planes de Acción', value: pl.alertas ? pct(pl.pct, 0) : '—', icon: 'check-circle', accent: pl.alertas && pl.pct < 60 ? '#DC2626' : '#16A34A',
      detail: fila('#F59E0B', 'Alertas en la inspección', fmtN(pl.alertas, 0), `${pl.placas} placas`) + fila('#10B981', 'Con OT cerrada después', fmtN(pl.atendidas, 0), `${pl.placasAtendidas} placas`) },
  ]
})

const kpisInspeccion = computed(() => {
  const v = m.volumen.value, s = m.semaforo.value, p = m.presiones.value
  return [
    { label: 'Volumen Evaluado', value: `${fmtN(v.llantas, 0)} llantas`, icon: 'list', accent: '#15223c',
      detail: fila('#3B82F6', 'Placas inspeccionadas', fmtN(v.placas, 0)) + fila('#8B5CF6', 'Inspecciones', fmtN(v.inspecciones, 0), `${v.rondas} rondas`)
        + (v.posicionesVacias ? nota(`${v.posicionesVacias} posiciones reportadas sin llanta`) : '') },
    { label: 'Cambio Inmediato', value: fmtN(s.inmediato, 0), icon: 'alert-circle', accent: s.inmediato ? '#DC2626' : '#16A34A',
      meta: v.llantas ? pct(s.inmediato / v.llantas * 100, 0) : undefined,
      detail: fila(SEMAFORO_COLOR.proyectado, 'Cambio proyectado', fmtN(s.proyectado, 0)) + fila(SEMAFORO_COLOR.bueno, 'Buen estado', fmtN(s.bueno, 0)) },
    { label: 'Auditoría de Presiones', value: pct(p.pctMedidas, 0), icon: 'target', accent: p.pctMedidas < 90 ? '#F59E0B' : '#0EA5E9', meta: undefined,
      detail: nota('Llantas con PSI medido') + fila('#10B981', 'Correcta', fmtN(p.Correcta, 0)) + fila('#3B82F6', 'Baja', fmtN(p.Baja, 0)) + fila('#EF4444', 'Alta', fmtN(p.Alta, 0)) + fila('#94a3b8', 'Sin medir', fmtN(p['Sin medir'], 0)) },
    { label: 'Velocidad de Desgaste', value: m.conDesgaste.value.length ? fmtN(m.desgasteProm.value, 2) + ' mm/mes' : '—', icon: 'clock', accent: m.desgasteProm.value > DESGASTE_ALTO ? '#DC2626' : '#F97316',
      detail: fila('#EF4444', `Más de ${fmtN(DESGASTE_ALTO, 1)} mm/mes`, fmtN(m.devoradoras.value.length, 0), 'llantas') + nota(`${fmtN(m.conDesgaste.value.length, 0)} llantas con medición anterior válida`) },
    { label: 'Costo Evitado (Falsas Alarmas)', value: sinCosto.value ? `${fmtN(m.brecha.value.falsas.length, 0)} llantas` : cop(m.brecha.value.ahorro), icon: 'dollar', accent: '#10B981',
      detail: fila('#EF4444', 'Pendientes de compra', fmtN(m.brecha.value.reales.length, 0), pesos(m.brecha.value.compra)) + fila('#10B981', 'Ya cambiadas', fmtN(m.brecha.value.falsas.length, 0))
        + nota('Cambio inmediato que ya tiene reemplazo: no se debe volver a comprar') },
  ]
})

// ---------------------------------------------------------------- Gráficas
/** Dona con el total en el centro (mismo estilo que Combustible) */
function dona(lista: { nombre: string; valor: number; color: string }[], centro: string, unidad = 'llantas') {
  const total = lista.reduce((a, x) => a + x.valor, 0)
  return vacio({
    ...base(),
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `${punto(p.color)} <b>${p.name}</b><br/>${fmtN(p.value, 0)} ${unidad} (${pct(p.percent)})` },
    legend: {
      type: 'scroll' as const, orient: 'horizontal' as const, left: 'center', bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 12,
      textStyle: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
      data: lista.map(x => x.nombre),
    },
    series: [donaCentro({
      center: ['50%', '44%'], radio: '40%', valor: fmtN(total, 0), sub: centro, font: FONT, tamano: 16,
      color: isLight.value ? '#0f172a' : '#f1f5f9', colorSub: chartTextColor.value,
    }), {
      type: 'pie' as const, radius: ['40%', '62%'], center: ['50%', '44%'], avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
      data: lista.map(x => {
        const chica = total ? x.valor / total < 0.04 : false
        return { name: x.nombre, value: x.valor, itemStyle: { color: x.color }, label: { show: !chica }, labelLine: { show: !chica } }
      }),
      label: { formatter: (p: any) => pct(p.percent, 0), fontSize: 11, fontWeight: 600, fontFamily: FONT, color: chartTextColor.value },
    }],
  }, total > 0)
}
const optSemaforo = computed(() => dona((['inmediato', 'proyectado', 'bueno'] as Semaforo[])
  .map(k => ({ nombre: SEMAFORO_LBL[k], valor: m.semaforo.value[k], color: SEMAFORO_COLOR[k] })).filter(x => x.valor), 'inspeccionadas'))
const optComposicion = computed(() => {
  const l = m.composicion.value
  const top = l.slice(0, 7), resto = l.slice(7)
  const lista = top.map(([n, v], i) => ({ nombre: n, valor: v, color: PALETA[(i % (PALETA.length - 1)) + 1] }))
  if (resto.length) lista.push({ nombre: 'Otras', valor: resto.reduce((a, [, v]) => a + v, 0), color: '#94a3b8' })
  return dona(lista, 'llantas')
})

// Medidor: % de alertas de la última inspección con OT de llantas cerrada después
const optPlanes = computed(() => {
  const pl = m.planes.value
  const c = pl.pct >= 80 ? '#16A34A' : pl.pct >= 50 ? '#F59E0B' : '#DC2626'
  return vacio({
    ...base(),
    tooltip: { formatter: () => `<b>Cumplimiento de planes de acción</b><br/>${pl.atendidas} de ${pl.alertas} llantas con alerta tienen OT de llantas cerrada después<br/>` +
      pl.porPlan.slice(0, 6).map(([p, n]) => `${punto('#F59E0B')} ${p}: <b>${n}</b>`).join('<br/>') },
    series: [{
      type: 'gauge' as const, startAngle: 200, endAngle: -20, min: 0, max: 100, radius: '92%', center: ['50%', '60%'],
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: c } },
      axisLine: { roundCap: true, lineStyle: { width: 16, color: [[1, isLight.value ? '#e2e8f0' : 'rgba(255,255,255,0.08)']] as any } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, anchor: { show: false },
      title: { offsetCenter: [0, '32%'], fontSize: 11, fontFamily: FONT, color: chartTextColor.value },
      detail: { valueAnimation: true, offsetCenter: [0, '-2%'], fontSize: 28, fontWeight: 700, fontFamily: FONT, color: tinta.value, formatter: (v: number) => fmtN(v, 0) + '%' },
      data: [{ value: +pl.pct.toFixed(1), name: `${pl.atendidas} de ${pl.alertas} alertas atendidas` }],
    }],
  }, pl.alertas > 0)
})

// Presiones por rango y planta: barras horizontales agrupadas (una por planta)
const optPresiones = computed(() => {
  const rangos: Presion[] = ['Correcta', 'Baja', 'Alta', 'Sin medir']
  const pp = m.presiones.value.porPlanta
  const ps = m.plantas.value.filter(p => pp[p])
  return vacio({
    ...barrasH(rangos, ps.map(p => ({
      name: p, type: 'bar', barMaxWidth: 16, barGap: '15%', emphasis,
      data: rangos.map(r => pp[p][r] || 0), itemStyle: { color: color(p), borderRadius: [0, 4, 4, 0] },
      label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? fmtN(v.value, 0) : '') },
    })), ['000'], {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => `<b>${params[0].axisValueLabel}</b><br/>` + params.filter(x => x.value).map(x => `${punto(color(x.seriesName))} ${x.seriesName}: <b>${x.value}</b> llantas`).join('<br/>'),
    }, true),
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
  }, ps.length > 0)
})

const optMarcas = computed(() => {
  const lista = m.porMarca.value.filter(x => x.desgaste !== null).sort((a, b) => (a.desgaste as number) - (b.desgaste as number)).slice(0, 12)
  const txt = (x: typeof lista[number]) => `${fmtN(x.desgaste as number, 2)} mm/mes · ${fmtN(x.remanente, 1)} mm`
  return vacio(barrasH(lista.map(x => x.marca), [{
    name: 'mm/mes', type: 'bar', barWidth: '62%', emphasis,
    data: lista.map(x => ({ value: +(x.desgaste as number).toFixed(2), itemStyle: { color: (x.desgaste as number) > DESGASTE_ALTO ? '#EF4444' : AZUL, borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (v: any) => txt(lista[v.dataIndex]) },
  }], lista.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const x = lista[params[0].dataIndex]
      return `<b>${x.marca}</b><br/>${punto(AZUL)} Desgaste: <b>${fmtN(x.desgaste as number, 2)} mm/mes</b> (${x.nDesgaste} llantas medidas)<br/>` +
        `Remanente promedio: <b>${fmtN(x.remanente, 1)} mm</b> en ${x.n} llantas` + (x.vidaMeses !== null ? `<br/>Vida restante estimada: <b>${fmtN(x.vidaMeses, 0)} meses</b>` : '') +
        (x.inmediato ? `<br/>${punto('#EF4444')} ${x.inmediato} en cambio inmediato` : '') },
  }, false), lista.length > 0)
})

const optProveedores = computed(() => {
  const lista = m.proveedores.value.slice(0, 10)
  const txt = (x: typeof lista[number]) => `${copCorto(x.costo)} · ${x.n} OT`
  return vacio(barrasH(lista.map(x => x.proveedor), [{
    name: 'Valor', type: 'bar', barWidth: '62%', emphasis,
    data: lista.map((x, i) => ({ value: Math.round(x.costo), itemStyle: { color: PALETA[(i % (PALETA.length - 1)) + 1], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (v: any) => txt(lista[v.dataIndex]) },
  }], lista.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const x = lista[params[0].dataIndex]; const tot = m.proveedores.value.reduce((a, p) => a + p.costo, 0)
      return `<b>${x.proveedor}</b><br/>${cop(x.costo)} en ${x.n} OT de llantas (${pct(tot ? x.costo / tot * 100 : 0)})` },
  }, false), lista.length > 0)
})

// Críticos: inmediato y proyectado lado a lado por placa (barras agrupadas, sin apilar)
function opcionCriticos(lista: typeof m.criticos.value) {
  return vacio({
    ...barrasH(lista.map(x => x.placa), [
      { name: SEMAFORO_LBL.inmediato, type: 'bar', barMaxWidth: 14, barGap: '15%', emphasis, data: lista.map(x => x.inmediato),
        itemStyle: { color: SEMAFORO_COLOR.inmediato, borderRadius: [0, 4, 4, 0] }, label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') } },
      { name: SEMAFORO_LBL.proyectado, type: 'bar', barMaxWidth: 14, emphasis, data: lista.map(x => x.proyectado),
        itemStyle: { color: SEMAFORO_COLOR.proyectado, borderRadius: [0, 4, 4, 0] }, label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') } },
    ], ['00'], {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const x = lista[params[0].dataIndex]
        return `<b>${x.placa}</b> <span style="color:#94a3b8">· ${x.tipo} · ${x.planta}</span><br/>` +
          `${punto(SEMAFORO_COLOR.inmediato)} Cambio inmediato: <b>${x.inmediato}</b><br/>${punto(SEMAFORO_COLOR.proyectado)} Proyectado: <b>${x.proyectado}</b><br/>` +
          `${punto(SEMAFORO_COLOR.bueno)} Buen estado: <b>${x.bueno}</b>` + (x.desgaste !== null ? `<br/>Desgaste: ${fmtN(x.desgaste, 2)} mm/mes` : '') },
    }, true),
    legend: leyenda([{ name: SEMAFORO_LBL.inmediato, itemStyle: { color: SEMAFORO_COLOR.inmediato } }, { name: SEMAFORO_LBL.proyectado, itemStyle: { color: SEMAFORO_COLOR.proyectado } }]),
  }, lista.length > 0)
}
const optCriticos = computed(() => opcionCriticos(m.criticos.value.slice(0, TOP)))
const optCriticosTodos = computed(() => opcionCriticos(m.criticos.value))

const optDesgaste = computed(() => {
  const r = m.rankingDesgaste.value
  const peores = r.slice(0, 5)
  const mejores = r.length > 5 ? r.slice(-Math.min(5, r.length - 5)).reverse() : []
  const lista = [...peores, ...mejores]
  const txt = (x: typeof lista[number]) => `${fmtN(x.desgaste as number, 2)} mm/mes`
  return vacio(barrasH(lista.map(x => x.placa), [{
    name: 'mm/mes', type: 'bar', barWidth: '62%', emphasis,
    data: lista.map((x, i) => ({ value: +(x.desgaste as number).toFixed(2),
      itemStyle: { color: i < peores.length ? ((x.desgaste as number) > DESGASTE_ALTO ? '#EF4444' : '#F59E0B') : '#10B981', borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right', formatter: (v: any) => txt(lista[v.dataIndex]) },
  }], lista.map(txt), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const i = params[0].dataIndex, x = lista[i]
      // Por cada 1.000 km (u horas), con las llantas que tienen lectura del equipo válida
      const mil = x.llantas.map(l => m.vida(l).mmPorMil).filter((v): v is number => v !== null)
      const u = x.llantas.map(l => m.vida(l).unidad).find(Boolean) || 'km'
      return `<b>${x.placa}</b> <span style="color:#94a3b8">· ${x.tipo} · ${x.planta}</span><br/>${i < peores.length ? 'Entre los 5 peores' : 'Entre los 5 mejores'}: <b>${txt(x)}</b><br/>${x.nDesgaste} llantas con medición anterior` +
        (mil.length ? `<br/>${fmtN(mil.reduce((a, v) => a + v, 0) / mil.length, 2)} mm por cada 1.000 ${u}` : '<br/><span style="color:#94a3b8">Sin lectura válida para mm por 1.000 km</span>') },
  }, false), lista.length > 0)
})

function opcionCuidado(lista: typeof m.rankingCuidado.value) {
  const ps = m.plantas.value.filter(p => lista.some(x => x.planta === p))
  const txt = (x: typeof lista[number]) => fmtN(x.cuidado, 0) + ' pts'
  return vacio({
    ...barrasH(lista.map(x => x.placa), [
      { name: 'Puntaje', type: 'bar', barWidth: '62%', emphasis,
        data: lista.map(x => ({ value: +x.cuidado.toFixed(1), itemStyle: { color: color(x.planta), borderRadius: [0, 4, 4, 0] } })),
        label: { ...labelPill.value, position: 'right', formatter: (v: any) => txt(lista[v.dataIndex]) } },
      // Series vacías solo para que la leyenda muestre el color de cada planta
      ...ps.map(p => ({ name: p, type: 'bar', data: [], itemStyle: { color: color(p) } })),
    ], lista.map(txt), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const x = lista[params[0].dataIndex]
        return `<b>${x.placa}</b> <span style="color:#94a3b8">· ${x.tipo} · ${x.planta}</span><br/>Índice: <b>${fmtN(x.cuidado, 0)} / 100</b><br/>` +
          `${punto('#10B981')} Presión correcta: ${pct(x.pctPresion, 0)}<br/>${punto('#EF4444')} Llantas con cortes o desgarros: ${x.conDano} de ${x.llantas.length}` },
    }, ps.length > 1),
    ...(ps.length > 1 ? { legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))) } : {}),
  }, lista.length > 0)
}
const cuidadoAsc = computed(() => [...m.rankingCuidado.value].reverse())
const optCuidado = computed(() => opcionCuidado(cuidadoAsc.value.slice(0, TOP)))
const optCuidadoTodos = computed(() => opcionCuidado(cuidadoAsc.value))

const optRequerimientos = computed(() => {
  const r = m.requerimientos.value
  return vacio({
    ...barrasH(r.filas.map(f => f.dimension), r.plantas.map(p => ({
      name: p, type: 'bar', barMaxWidth: 16, barGap: '15%', emphasis,
      data: r.filas.map(f => f.porPlanta[p] ?? 0), itemStyle: { color: color(p), borderRadius: [0, 4, 4, 0] },
      label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') },
    })), ['00'], {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const f = r.filas[params[0].dataIndex]
        return `<b>${f.dimension}</b><br/>` + r.plantas.filter(p => f.porPlanta[p]).map(p => `${punto(color(p))} ${p}: <b>${f.porPlanta[p]}</b>`).join('<br/>') + `<br/>Total: <b>${f.total}</b> llantas` },
    }, true),
    legend: leyenda(r.plantas.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
  }, r.filas.length > 0)
})

const optCausas = computed(() => {
  const lista = m.causas.value
  const col = (g: string) => (g === 'Daño' ? '#EF4444' : '#F59E0B')
  return vacio({
    ...barrasH(lista.map(c => c.causa), [
      { name: 'Llantas', type: 'bar', barWidth: '58%', emphasis,
        data: lista.map(c => ({ value: c.n, itemStyle: { color: col(c.grupo), borderRadius: [0, 4, 4, 0] } })),
        label: { ...labelPill.value, position: 'right' } },
      { name: 'Desgaste', type: 'bar', data: [], itemStyle: { color: col('Desgaste') } },
      { name: 'Daño', type: 'bar', data: [], itemStyle: { color: col('Daño') } },
    ], lista.map(c => String(c.n)), {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const c = lista[params[0].dataIndex]; return `<b>${c.causa}</b> <span style="color:#94a3b8">· ${c.grupo}</span><br/>${c.n} llantas en cambio inmediato` },
    }, true),
    legend: leyenda([{ name: 'Desgaste', itemStyle: { color: col('Desgaste') } }, { name: 'Daño', itemStyle: { color: col('Daño') } }]),
  }, lista.length > 0)
})

const optPatrones = computed(() => {
  const lista = m.patrones.value.filter(p => p.n > 0)
  return vacio(barrasH(lista.map(p => p.patron), [{
    name: 'Llantas', type: 'bar', barWidth: '58%', emphasis,
    data: lista.map((p, i) => ({ value: p.n, itemStyle: { color: PALETA[(i % (PALETA.length - 1)) + 1], borderRadius: [0, 4, 4, 0] } })),
    label: { ...labelPill.value, position: 'right' },
  }], lista.map(p => String(p.n)), {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => { const p = lista[params[0].dataIndex]; return `<b>${p.patron}</b><br/>${p.n} llantas<br/>Acción: ${p.accion}` },
  }, false), lista.length > 0)
})

// ---------------------------------------------------------------- Alertas por criterio de inspección
const kpisAlertas = computed(() => {
  const a = m.resumenAlertas.value
  return [
    { label: 'Urgencia Absoluta (Prioridad 0)', value: fmtN(a.urgencia, 0), icon: 'alert-circle', accent: a.urgencia ? '#B91C1C' : '#16A34A',
      detail: a.placasUrgencia.length ? nota(`Placas: ${a.placasUrgencia.join(', ')}`) : nota('Sin fallas críticas en posiciones 1 a 4') },
    { label: 'Críticas · Nivel 1 (Inmediata)', value: fmtN(a.nivel1, 0), icon: 'zap', accent: '#EF4444', detail: nota('Fuera de las posiciones 1-4; compra inmediata') },
    { label: 'Críticas · Nivel 2 (Próxima SOLPED)', value: fmtN(a.nivel2, 0), icon: 'package', accent: '#F97316', detail: nota('Tracción por desgaste y ejes de arrastre') },
    { label: 'En Atención', value: fmtN(a.atencion, 0), icon: 'clock', accent: '#F59E0B', detail: nota('Remanente en el umbral de atención: programar en 30-60 días') },
    { label: 'Rotaciones Sugeridas', value: fmtN(a.rotaciones, 0), icon: 'activity', accent: '#8B5CF6',
      detail: nota(`P1-P2 con ${fmtN(ROTACION_MIN, 0)}-${fmtN(ROTACION_MAX, 0)} mm: pasar a tracción`) + (a.noNuevas ? fila('#3B82F6', 'P1-P2 sin llanta nueva', fmtN(a.noNuevas, 0)) : '') },
    { label: 'Bloqueos de OT', value: fmtN(a.bloqueos, 0), icon: 'settings', accent: a.bloqueos ? '#B91C1C' : '#64748B', detail: nota('Reencauchadas o reparadas montadas en posiciones 1-4') },
  ]
})
const GRUPOS = ['Direccional', 'Segundo direccional', 'Tracción', 'Arrastre', 'OTR', 'Liviano'] as const
const optAlertasGrupo = computed(() => {
  const pc = m.resumenAlertas.value.porCategoria
  const gs = GRUPOS.filter(g => pc[g] && (pc[g].critica || pc[g].atencion))
  return vacio({
    ...barrasH([...gs], [
      { name: 'Crítica', type: 'bar', barMaxWidth: 14, barGap: '15%', emphasis, data: gs.map(g => pc[g].critica), itemStyle: { color: '#EF4444', borderRadius: [0, 4, 4, 0] },
        label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') } },
      { name: 'Atención', type: 'bar', barMaxWidth: 14, emphasis, data: gs.map(g => pc[g].atencion), itemStyle: { color: '#F59E0B', borderRadius: [0, 4, 4, 0] },
        label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') } },
    ], ['000'], { trigger: 'axis', axisPointer: { type: 'shadow' } }, true),
    legend: leyenda([{ name: 'Crítica', itemStyle: { color: '#EF4444' } }, { name: 'Atención', itemStyle: { color: '#F59E0B' } }]),
  }, gs.length > 0)
})
const optAlertasPrioridad = computed(() => {
  const crit = m.alertas.value.filter(l => l.alerta!.nivel === 'Crítica')
  const prioridad = (l: Llanta) => (l.alerta!.urgenciaAbsoluta ? 'Prioridad 0' : /Nivel 1/.test(l.alerta!.prioridad) ? 'Nivel 1' : 'Nivel 2')
  const cats = ['Prioridad 0', 'Nivel 1', 'Nivel 2'].filter(c => crit.some(l => prioridad(l) === c))
  const ps = m.plantas.value.filter(p => crit.some(l => l.planta === p))
  return vacio({
    ...barrasH(cats, ps.map(p => ({
      name: p, type: 'bar', barMaxWidth: 16, barGap: '15%', emphasis, data: cats.map(c => crit.filter(l => l.planta === p && prioridad(l) === c).length),
      itemStyle: { color: color(p), borderRadius: [0, 4, 4, 0] }, label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? v.value : '') },
    })), ['000'], { trigger: 'axis', axisPointer: { type: 'shadow' } }, true),
    legend: leyenda(ps.map(p => ({ name: p, itemStyle: { color: color(p) } }))),
  }, cats.length > 0)
})
const alertasRows = computed(() => m.alertas.value.map(l => {
  const a = l.alerta!
  return {
    'Id': l.id, 'Severidad': +a.severidad.toFixed(1), 'Placa': l.placa, 'Planta': l.planta, 'Tipo de Vehículo': l.tipo, 'Pos.': l.posicion || '—',
    'Grupo': a.categoria, 'Marca': l.marca, 'Dimensión': l.dimension,
    'Pmín (mm)': l.insp && l.insp.remanente > 0 ? l.insp.remanente : null,
    'Umbral (mm)': a.criterio ? `${fmtN(a.criterio.critico, 1)} / ${fmtN(a.criterio.atencion, 1)}` : '',
    'Clasificación': a.nivel === 'OK' ? 'Sugerencia' : a.nivel, 'Motivo': a.motivos.join(' · ') || a.sugerencias.join(' · '),
    'Prioridad SOLPED': a.prioridad, 'Acción': a.accion, 'Sugerencia': a.sugerencias.join(' · '), 'Bloqueo de OT': a.bloqueoOt ?? '',
    'Última Inspección': l.insp ? fechaTxt(l.insp.fecha) : '',
  }
}))

// ---------------------------------------------------------------- Inventario dinámico (tabla estilo OT)
const invTableRows = computed(() => m.llantas.value.map(l => ({
  'Id': l.id, 'Nº Serie': l.serie, 'Marca': l.marca, 'Modelo': l.modelo, 'Dimensión': l.dimension,
  'Estado': l.estado, 'Ubicación': l.ubicacion, 'Placa': l.placa, 'Tipo de Vehículo': l.tipo, 'Planta': l.planta,
  'Posición': l.posicion, 'Eje': l.eje, 'Lado': l.lado, 'Aplicación': l.aplicacion,
  'Prof. Inicial (mm)': l.profInicial || null,
  'Remanente (mm)': l.insp ? l.insp.remanente : null,
  'Semáforo': l.semaforo ? SEMAFORO_LBL[l.semaforo] : '',
  'Grupo de Posición': l.alerta?.categoria ?? '',
  'Prioridad SOLPED': l.alerta && l.alerta.nivel !== 'OK' ? l.alerta.prioridad : '',
  'PSI': l.insp?.psi || null,
  'Desgaste (mm/mes)': l.desgasteMes !== null ? +l.desgasteMes.toFixed(2) : null,
  'Última Inspección': l.insp ? fechaTxt(l.insp.fecha) : '',
  'Condiciones': l.insp?.condiciones.join(', ') ?? '',
  'Plan de Acción': l.insp?.plan.join(', ') ?? '',
  'DOT': l.dotTexto,
  'Días en Servicio': m.vida(l).diasServicio !== null ? Math.round(m.vida(l).diasServicio as number) : null,
  'mm Consumidos': m.vida(l).mmConsumidos !== null ? +(m.vida(l).mmConsumidos as number).toFixed(1) : null,
  'Recorrido': m.vida(l).recorrido !== null ? `${fmtN(m.vida(l).recorrido as number, 0)} ${m.vida(l).unidad || 'u.'}` : '',
  'Rendimiento por mm': m.vida(l).porMm !== null ? +(m.vida(l).porMm as number).toFixed(0) : null,
  'Rotaciones': m.vida(l).rotaciones,
  'Vida Restante (meses)': m.vida(l).vidaRestanteMeses !== null ? +(m.vida(l).vidaRestanteMeses as number).toFixed(1) : null,
  'Costo': l.costo || null,
  'Último Cambio': l.ultimoCambio ? fechaTxt(Math.floor(l.ultimoCambio.fecha)) + ' · ' + (l.ultimoCambio.accion || EVENTO_TITULO[l.ultimoCambio.tipo]) : '',
  'Cambiado por': l.ultimoCambio?.usuario ?? '',
})))
const detalle = ref<Llanta | null>(null)
function openDetalle(row: Record<string, unknown>) {
  detalle.value = m.llantas.value.find(l => l.id === row['Id']) ?? null
}
// Ficha: vida útil, línea de tiempo y fotos de la llanta abierta
const vidaDet = computed(() => m.vida(detalle.value!))
const lineaDet = computed(() => (detalle.value ? m.lineaTiempo(detalle.value) : []))
const fotosDet = computed(() => (detalle.value?.historial ?? []).flatMap(h => m.fotosInspeccion(h.idInspeccion).map(valor => ({ valor, fecha: h.fecha }))))

// ---------------------------------------------------------------- Formato de la cronología de las OT
/** Tipo de evento de llantas → color de la cronología de las OT (crear, modificar, mover, eliminar) */
const TIPO_VISTA: Record<TipoEvento, CronoVista['tipo']> = {
  compra: 'crear', registro: 'crear', montaje: 'crear', inspeccion: 'modificar', rotacion: 'mover', traslado: 'mover', desmontaje: 'mover',
  reencauche: 'modificar', baja: 'eliminar', correccion: 'modificar', modificacion: 'modificar', ot: 'modificar',
}
/** Hora del serial como hh:mm:ss (igual que la cronología de las OT); vacía si es medianoche */
function horaTxt(s: number): string {
  const seg = Math.round((s % 1) * 86400)
  if (seg <= 0 || seg >= 86400) return ''
  return [Math.floor(seg / 3600), Math.floor((seg % 3600) / 60), seg % 60].map(x => String(x).padStart(2, '0')).join(':')
}
/** Evento de la llanta → entrada de la cronología; los reconstruidos llevan una etiqueta discreta con su fuente */
function aVista(e: EventoLlanta, extra: Partial<CronoVista> = {}): CronoVista {
  return {
    tipo: TIPO_VISTA[e.tipo], accion: e.titulo, fecha: e.fecha ? fechaTxt(Math.floor(e.fecha)) : 'Sin fecha', hora: e.fecha ? horaTxt(e.fecha) : '',
    detalle: e.detalle, cambios: e.cambios, usuario: e.responsable,
    etiqueta: e.fuente === 'Cronología' ? '' : `Reconstruido · ${e.fuente}`, ...extra,
  }
}
/** Ficha: cronología de la llanta SOLO con la hoja Cronologia_Llantas_Concreos (la más reciente arriba) */
const cronoDet = computed<CronoVista[]>(() => [...lineaDet.value].filter(e => e.fuente === 'Cronología').reverse()
  .map(e => aVista(e, { sub: [e.placa, e.posicion ? `P${e.posicion}` : ''].filter(Boolean).join(' · ') })))
/** Ficha: mediciones de la llanta para la tabla de la ventana 2 */
const inspeccionesDet = computed(() => [...(detalle.value?.historial ?? [])].reverse().map(h => ({
  'Fecha': fechaTxt(h.fecha),
  'Placa / Pos.': `${detalle.value!.placa}${h.posicion ? ' · P' + h.posicion : ''}`,
  'Ext / Cen / Int': `${numTxt(h.profExterna)} / ${numTxt(h.profCentral)} / ${numTxt(h.profInterna)}`,
  'Remanente': (() => { const v = [h.profExterna, h.profCentral, h.profInterna].map(Number).filter(x => x > 0); return v.length ? `${fmtN(Math.min(...v), 1)} mm` : '—' })(),
  'PSI': h.psi || '—',
  'Condición': h.condiciones || '—',
  'Plan de Acción': h.planAccion || '—',
  'Lectura': h.lectura ? `${fmtN(h.lectura, 0)}${h.unidad ? ' ' + h.unidad : ''}` : '—',
  'Evaluador': h.evaluador || '—',
})))
// Vida útil por marca: meses en servicio y meses restantes lado a lado (barras agrupadas)
const optVidaMarca = computed(() => {
  const lista = m.vidaPorMarca.value.slice(0, 12)
  return vacio({
    ...barrasH(lista.map(x => x.marca), [
      { name: 'En servicio', type: 'bar', barMaxWidth: 12, barGap: '15%', emphasis, data: lista.map(x => +(x.mesesServicio ?? 0).toFixed(1)),
        itemStyle: { color: '#3B82F6', borderRadius: [0, 4, 4, 0] }, label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? fmtN(v.value, 1) : '') } },
      { name: 'Restante', type: 'bar', barMaxWidth: 12, emphasis, data: lista.map(x => +(x.vidaRestante ?? 0).toFixed(1)),
        itemStyle: { color: '#10B981', borderRadius: [0, 4, 4, 0] }, label: { ...labelPill.value, position: 'right', formatter: (v: any) => (v.value ? fmtN(v.value, 1) : '') } },
    ], ['00,0'], {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => { const x = lista[params[0].dataIndex]
        return `<b>${x.marca}</b> <span style="color:#94a3b8">· ${x.n} llantas</span><br/>${punto('#3B82F6')} En servicio: <b>${x.mesesServicio !== null ? fmtN(x.mesesServicio, 1) + ' meses' : '—'}</b><br/>` +
          `${punto('#10B981')} Restante: <b>${x.vidaRestante !== null ? fmtN(x.vidaRestante, 1) + ' meses' : '—'}</b><br/>Vida total estimada: <b>${x.vidaTotal !== null ? fmtN(x.vidaTotal, 1) + ' meses' : '—'}</b>` +
          (x.porMm !== null ? `<br/>Rendimiento: ${fmtN(x.porMm, 0)} por mm (${x.nPorMm} llantas con lectura válida)` : '') + (x.rotaciones ? `<br/>Rotaciones: ${x.rotaciones}` : '') },
    }, true),
    legend: leyenda([{ name: 'En servicio', itemStyle: { color: '#3B82F6' } }, { name: 'Restante', itemStyle: { color: '#10B981' } }]),
  }, lista.length > 0)
})
</script>

<style scoped>
.inspeccion-tab { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }

.almacen-view-toggle { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.av-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none;
  color: var(--text-secondary); background: var(--bg-alt); border: 1px solid var(--card-border);
  border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast);
}
.av-btn:hover { border-color: var(--card-border-hover); color: var(--text-primary); }
.av-btn.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.av-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #EF4444; color: #fff; font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
/* Tabla de criterios de inspección */
.criterios-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg, 12px); padding: 16px 18px; margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.criterios-card .section-title { margin: 0; }
.criterios-wrap { width: 100%; overflow-x: auto; }
.criterios { width: 100%; min-width: 860px; border-collapse: collapse; font-size: 12px; }
.criterios th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--text-tertiary); padding: 6px 8px; border-bottom: 1.5px solid var(--card-border); }
.criterios td { padding: 7px 8px; border-bottom: 1px solid var(--card-border); color: var(--text-secondary); vertical-align: top; }
.criterios td b { color: var(--text-primary); }
.criterios td small { display: block; font-size: 10.5px; color: var(--text-tertiary); }
.criterios .r { text-align: right; white-space: nowrap; }
.reglas { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
.reglas b { color: var(--text-primary); }

.disp-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.disp-banner.err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.disp-banner.ok { background: var(--accent-light); border: 1px solid var(--card-border); color: var(--text-secondary); }
.disp-banner.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
[data-theme="dark"] .disp-banner.warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); color: #fcd34d; }
[data-theme="dark"] .disp-banner.err { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.3); color: #fca5a5; }

/* Mismo tratamiento de títulos y KPIs que Combustible */
.kpi-row :deep(.kpi-value) { font-size: 19px; flex-wrap: wrap; overflow-wrap: anywhere; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 14px 0 0; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px; }
.title-bar { width: 14px; height: 2px; background: var(--accent); display: inline-block; border-radius: 1px; }

/* ── Copia exacta del modal de OT (EquiposDashboard): overlay, panel, ventanas y tabla de la ventana 2 ── */
/* Modal — diseño profesional */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(15,23,42,.55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
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
  animation: modalIn .32s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(.94) } to { opacity:1; transform:translateY(0) scale(1) } }
/* Transición de entrada/salida de los modales (fondo se desvanece, panel se achica al salir) */
.modal-pop-enter-active, .modal-pop-leave-active { transition: opacity 0.2s ease; }
.modal-pop-enter-from, .modal-pop-leave-to { opacity: 0; }
.modal-pop-leave-active .modal-panel,
.modal-pop-leave-active .placa-detail-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.modal-pop-leave-to .modal-panel,
.modal-pop-leave-to .placa-detail-panel { transform: scale(0.96); opacity: 0; }
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
  /* Modal: ocupar casi toda la pantalla (igual que en Mantenimiento) */
  .modal-overlay { padding: 10px; align-items: flex-end; }
  .modal-panel { max-width: 100%; max-height: 94vh; border-radius: 14px 14px 0 0; }
}
/* Ficha de llanta (ventana 1): documento en papel como la OT */

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
.ot-doc .equipo-sub { font-size: 11px; font-weight: 600; color: #555; }
.ot-doc .grid-table { width: 100%; border-collapse: collapse; }
.ot-doc .grid-table td { padding: 4px 6px; font-size: 10.5px; vertical-align: middle; }
.ot-doc .grid-label { color: #555; font-weight: bold; }
.ot-doc .grid-value { color: #1a1a1a; }
.ot-doc .sec-bar { font-size: 11px; font-weight: bold; color: #1a1a1a; text-align: left; padding: 6px 0; margin: 15px 0 8px; text-transform: uppercase; border-top: .5px solid #ccc; border-bottom: .5px solid #ccc; }
.ot-doc .doc-empty { font-size: 10px; color: #999; font-style: italic; padding: 4px 6px; }
.ot-doc thead .grid-label { border-bottom: 1px solid #ccc; text-transform: uppercase; font-size: 9px; }


.vida-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.vida-grid > div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 9px; display: flex; flex-direction: column; gap: 1px; }
.vida-grid span { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; }
.vida-grid b { font-size: 14px; color: #3827F5; }
.vida-grid small { font-size: 9.5px; color: #777; }
.alerta-doc { border: 1px solid #e5e7eb; border-left: 4px solid #10b981; border-radius: 6px; padding: 8px 10px; margin: 8px 0 4px; font-size: 10.5px; color: #555; display: flex; flex-direction: column; gap: 3px; }
.alerta-doc.critica { border-left-color: #dc2626; background: #fef2f2; }
.alerta-doc.atencion { border-left-color: #f59e0b; background: #fffbeb; }
.alerta-doc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.alerta-doc-head b { font-size: 11.5px; text-transform: uppercase; color: #1a1a1a; }
.alerta-doc.critica .alerta-doc-head b { color: #b91c1c; }
.alerta-doc.atencion .alerta-doc-head b { color: #b45309; }
.alerta-doc-prio { margin-left: auto; font-weight: bold; color: #1a1a1a; }
.alerta-doc-accion { font-weight: bold; color: #1a1a1a; }
.alerta-doc-sug { color: #3827f5; }
.alerta-doc-bloqueo { color: #dc2626; font-weight: bold; }
.fotos-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.foto-item { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 9.5px; color: #666; }

@media (max-width: 640px) {
  .ot-doc { padding: 14px 12px; }
  .ot-doc .hdr, .ot-doc .hdr-logo, .ot-doc .hdr-info, .ot-doc .hdr-folio { display: block; width: auto; padding-left: 0; text-align: left; }
  .ot-doc .meta-container td, .ot-doc .grid-table td { display: block; width: auto; }
  .av-btn { padding: 8px 12px; }
  .vida-grid { grid-template-columns: 1fr 1fr; }
}
</style>
