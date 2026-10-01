<template>
  <div class="informe-tab">
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Reporte oficial de mantenimiento</span>
        <span class="icb-title">Macro Informe Analítico de Llantas — Concretos · {{ periodoTxt }}</span>
      </div>
      <div class="icb-actions">
        <button class="tb-btn primary" :disabled="!m.hayInspecciones.value || generandoPdf" @click="pdf">
          <svg v-if="!generandoPdf" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ generandoPdf ? 'Generando PDF…' : 'Descargar PDF' }}
        </button>
      </div>
    </div>

    <div v-if="!m.hayInspecciones.value" class="report-nota">No hay inspecciones de llantas en el rango de fechas y filtros seleccionados.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1: RESUMEN EJECUTIVO -->
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/logo-azul-informe.png" alt="Gravicon" class="report-logo report-logo--claro" loading="eager" />
            <!-- En tema oscuro (solo en pantalla) va el logo blanco oficial; el PDF siempre usa el azul -->
            <img src="/Logos/logo-blanco.webp" alt="" aria-hidden="true" class="report-logo report-logo--oscuro" loading="eager" />
            <div class="report-header-text">
              <h2>Gestión de Llantas Concretos Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Mantenimiento de Maquinaria</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div><span>Corte:</span> <strong>{{ corteTxt }}</strong></div>
            <div><span>Código:</span> <strong>{{ codigo }}</strong></div>
            <div class="page-counter"><span>Pág. 1 de 5</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Macro Informe Analítico de Llantas</h1>
          <p class="report-intro">
            Auditoría del estado de las llantas de la flota de Concretos con la última inspección de cada llanta
            <strong>{{ periodoLargo }}</strong>{{ plantasTxt ? ` en ${plantasTxt}` : '' }}: primero el resumen ejecutivo (semáforo, presiones y brecha de compras),
            luego el análisis de desgaste por causa y marca, los requerimientos para almacén y compras, las fichas de intervención de las
            10 placas más comprometidas y, al final, la calidad del dato y las conclusiones. Fuente: FleetControl_Llantas (inventario e
            inspecciones) y órdenes de trabajo de llantas de Mantenimiento Concretos.
          </p>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis operativo</div>
            <div class="zoho-analysis-text" v-html="analisis"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>1. Resumen ejecutivo y KPIs</h3>
          <div class="kpi-row compact-kpi">
            <KpiCard label="1.1 Volumen evaluado" :value="`${fmtN(m.volumen.value.llantas, 0)} llantas`" accent="#15223c" icon="list" :meta="`${m.volumen.value.placas} placas inspeccionadas`" />
            <KpiCard label="Cambio inmediato" :value="fmtN(m.semaforo.value.inmediato, 0)" :accent="SEMAFORO_COLOR.inmediato" icon="alert-circle" :meta="`${pctTxt(pctDe(m.semaforo.value.inmediato))} de las llantas`" />
            <KpiCard label="Cambio proyectado" :value="fmtN(m.semaforo.value.proyectado, 0)" :accent="SEMAFORO_COLOR.proyectado" icon="clock" :meta="`${pctTxt(pctDe(m.semaforo.value.proyectado))} · 30-60 días`" />
            <KpiCard label="Buen estado" :value="fmtN(m.semaforo.value.bueno, 0)" :accent="SEMAFORO_COLOR.bueno" icon="check-circle" :meta="`${pctTxt(pctDe(m.semaforo.value.bueno))} de las llantas`" />
            <KpiCard label="1.3 PSI medido" :value="pctTxt(m.presiones.value.pctMedidas)" accent="#0EA5E9" icon="target" :meta="`${pctTxt(m.presiones.value.pctCorrecta)} con presión correcta`" />
            <KpiCard label="Desgaste promedio" :value="m.conDesgaste.value.length ? `${fmtN(m.desgasteProm.value, 2)} mm/mes` : '—'" accent="#F97316" icon="trending-up" :meta="`${m.devoradoras.value.length} llantas > ${fmtN(DESGASTE_ALTO, 1)} mm/mes`" />
            <KpiCard label="1.4 Pendientes de compra" :value="fmtN(m.brecha.value.reales.length, 0)" accent="#DC2626" icon="package" :meta="sinCosto ? 'sin costo en la hoja' : cop(m.brecha.value.compra)" />
            <KpiCard label="1.4 Falsas alarmas" :value="fmtN(m.brecha.value.falsas.length, 0)" accent="#10B981" icon="dollar" :meta="sinCosto ? 'costo evitado: sin costo en la hoja' : `costo evitado ${cop(m.brecha.value.ahorro)}`" />
          </div>
        </div>

        <div class="report-section-block">
          <div class="charts-grid cols-2 align-start">
            <div>
              <h3 class="report-block-title"><span class="title-bar"></span>1.2 Semáforo global</h3>
              <p class="section-note">Criterio por posición: crítica (remanente en el umbral de su grupo o descarte directo) = cambio inmediato; atención = proyectado.</p>
              <VChart class="echart" :option="tema(optSemaforo)" autoresize style="height: 240px" />
            </div>
            <div>
              <h3 class="report-block-title"><span class="title-bar"></span>1.3 Auditoría de presiones (PSI)</h3>
              <p class="section-note">Correcta entre {{ PSI_MIN }} y {{ PSI_MAX }} PSI; 0 o vacío = sin medir.</p>
              <div class="data-card"><div class="table-wrap">
                <table>
                  <thead><tr><th>Planta</th><th class="r">Correcta</th><th class="r">Baja</th><th class="r">Alta</th><th class="r">Sin medir</th><th class="r">% medido</th></tr></thead>
                  <tbody>
                    <tr v-for="p in presionesPlanta" :key="p.planta">
                      <td class="bold nowrap"><span class="dot" :style="{ background: colorPlanta(p.planta) }"></span>{{ p.planta }}</td>
                      <td class="r">{{ p.Correcta }}</td><td class="r" :class="{ red: p.Baja }">{{ p.Baja }}</td><td class="r" :class="{ red: p.Alta }">{{ p.Alta }}</td>
                      <td class="r">{{ p['Sin medir'] }}</td><td class="r bold">{{ pctTxt(p.pct) }}</td>
                    </tr>
                  </tbody>
                  <tfoot><tr class="table-total-row">
                    <td>Total</td><td class="r">{{ m.presiones.value.Correcta }}</td><td class="r">{{ m.presiones.value.Baja }}</td><td class="r">{{ m.presiones.value.Alta }}</td>
                    <td class="r">{{ m.presiones.value['Sin medir'] }}</td><td class="r">{{ pctTxt(m.presiones.value.pctMedidas) }}</td>
                  </tr></tfoot>
                </table>
              </div></div>
            </div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>1.4 Costo evitado y brecha de compras</h3>
          <p class="section-note">
            Llantas en cambio inmediato cruzadas con lo ya montado: si la llanta ya se dio de baja, hay otra registrada en su posición después
            de la inspección o la placa tiene una OT de montaje posterior, es una «falsa alarma» y no se debe volver a comprar.
          </p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Pos.</th><th>Marca</th><th>Dimensión</th><th class="r">Remanente</th><th>Estado en la compra</th></tr></thead>
              <tbody>
                <tr v-for="l in m.brecha.value.pendientes.slice(0, 20)" :key="l.id" :class="{ alerta: !m.brecha.value.falsas.includes(l) }">
                  <td class="bold accent-text">{{ l.placa }}</td><td>{{ l.posicion || '—' }}</td><td>{{ l.marca }}</td><td>{{ l.dimension }}</td>
                  <td class="r bold red">{{ fmtN(l.insp!.remanente, 1) }} mm</td>
                  <td><span class="pill" :class="m.brecha.value.falsas.includes(l) ? 'p-verde' : 'p-rojo'">{{ m.brecha.value.falsas.includes(l) ? 'Ya cambiada (falsa alarma)' : 'Pendiente de compra' }}</span></td>
                </tr>
                <tr v-if="!m.brecha.value.pendientes.length"><td colspan="6" class="muted">Sin llantas en cambio inmediato en el período.</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Macro Informe Analítico de Llantas — Concretos</span><span>Documento oficial<span class="fp-num"> | Página 1 de 5</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 2: ANÁLISIS CAUSAL Y RENDIMIENTO -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <div class="charts-grid cols-2 align-start">
            <div>
              <h3 class="report-block-title"><span class="title-bar"></span>2.1 Distribución causal: desgaste vs. daño</h3>
              <p class="section-note">
                Causa de las {{ m.semaforo.value.inmediato }} llantas en cambio inmediato: {{ m.resumenCausal.value.desgaste }} por desgaste natural y
                {{ m.resumenCausal.value.dano }} por daño en la operación (cortes, hernias, alambre a la vista).
              </p>
              <VChart v-if="m.causas.value.length" class="echart" :option="tema(optCausas)" autoresize style="height: 220px" />
              <div v-else class="report-nota">Sin llantas en cambio inmediato en el período.</div>
            </div>
            <div>
              <h3 class="report-block-title"><span class="title-bar"></span>2.4 Patrones de desgaste irregular</h3>
              <p class="section-note">Alerta de problemas crónicos de alineación, balanceo, presión o suspensión.</p>
              <div class="data-card"><div class="table-wrap">
                <table>
                  <thead><tr><th>Patrón</th><th class="r">Llantas</th><th>Acción</th></tr></thead>
                  <tbody>
                    <tr v-for="p in m.patrones.value" :key="p.patron"><td class="bold">{{ p.patron }}</td><td class="r bold" :class="{ red: p.n }">{{ p.n }}</td><td class="muted">{{ p.accion }}</td></tr>
                  </tbody>
                </table>
              </div></div>
            </div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>2.2 Velocidad de desgaste (mm/mes) y CPK — llantas «devoradoras»</h3>
          <p class="section-note">
            ((Remanente anterior − remanente actual) ÷ días entre mediciones) × 30. Anterior = inspección previa o profundidad inicial con su fecha.
            En rojo, más de {{ fmtN(DESGASTE_ALTO, 1) }} mm/mes. Promedio de la flota: <strong>{{ fmtN(m.desgasteProm.value, 2) }} mm/mes</strong>
            en {{ m.conDesgaste.value.length }} llantas medidas.
            <template v-if="sinCosto"> El CPK (costo por kilómetro) no se calcula: la hoja no tiene el costo de compra.</template>
          </p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Pos.</th><th>Marca</th><th>Dimensión</th><th class="r">Anterior</th><th class="r">Actual</th><th class="r">Días</th><th class="r">mm/mes</th><th class="r">CPK</th></tr></thead>
              <tbody>
                <tr v-for="l in m.devoradoras.value.slice(0, 15)" :key="l.id">
                  <td class="bold accent-text">{{ l.placa }}</td><td>{{ l.posicion || '—' }}</td><td>{{ l.marca }}</td><td>{{ l.dimension }}</td>
                  <td class="r">{{ fmtN(l.anterior!.remanente, 1) }} mm</td><td class="r">{{ fmtN(l.insp!.remanente, 1) }} mm</td>
                  <td class="r">{{ Math.round(l.insp!.fecha - l.anterior!.fecha) }}</td>
                  <td class="r bold red">{{ fmtN(l.desgasteMes!, 2) }}</td>
                  <td class="r">{{ cpk(l) }}</td>
                </tr>
                <tr v-if="!m.devoradoras.value.length"><td colspan="9" class="muted">Ninguna llanta supera {{ fmtN(DESGASTE_ALTO, 1) }} mm/mes en el período.</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>2.3 Rendimiento por marca</h3>
          <p class="section-note">Remanente promedio y desgaste por fabricante, sin datos atípicos (remanentes de 0 o más de 30 mm y desgastes negativos). En servicio = meses desde el montaje (cronología); vida restante = meses hasta el límite de su posición al ritmo actual; vida total = la suma.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Marca</th><th class="r">Llantas</th><th class="r">Remanente prom.</th><th class="r">Desgaste prom.</th><th class="r">En servicio</th><th class="r">Vida restante</th><th class="r">Vida total est.</th><th class="r">Cambio inmediato</th></tr></thead>
              <tbody>
                <tr v-for="b in m.porMarca.value" :key="b.marca">
                  <td class="bold accent-text">{{ b.marca }}</td><td class="r">{{ b.n }}</td><td class="r">{{ fmtN(b.remanente, 1) }} mm</td>
                  <td class="r" :class="{ red: (b.desgaste ?? 0) > DESGASTE_ALTO }">{{ b.desgaste !== null ? fmtN(b.desgaste, 2) + ' mm/mes' : '—' }}</td>
                  <td class="r">{{ vidaMarca(b.marca)?.mesesServicio != null ? fmtN(vidaMarca(b.marca)!.mesesServicio!, 1) + ' meses' : '—' }}</td>
                  <td class="r">{{ b.vidaMeses !== null ? fmtN(b.vidaMeses, 0) + ' meses' : '—' }}</td>
                  <td class="r bold">{{ vidaMarca(b.marca)?.vidaTotal != null ? fmtN(vidaMarca(b.marca)!.vidaTotal!, 1) + ' meses' : '—' }}</td>
                  <td class="r" :class="{ 'red bold': b.inmediato }">{{ b.inmediato || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Macro Informe Analítico de Llantas — Concretos</span><span>Documento oficial<span class="fp-num"> | Página 2 de 5</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 3: PROYECCIÓN LOGÍSTICA Y COMPRAS -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Alertas por criterio de inspección</h3>
          <p class="section-note">
            Cada llanta se evalúa con el criterio de su posición (direccional ≤ 3 mm, tracción ≤ 3 mm, arrastre ≤ 2 mm, OTR ≤ 5 mm, livianos ≤ 2 mm y
            condiciones de descarte directo). Una falla en las posiciones 1 a 4 pesa {{ fmtN(FACTOR_DIRECCIONAL, 1) }}× y escala a <strong>Urgencia absoluta (Prioridad 0)</strong>.
          </p>
          <div class="kpi-row compact-kpi">
            <KpiCard label="Urgencia absoluta (P0)" :value="fmtN(ra.urgencia, 0)" accent="#B91C1C" icon="alert-circle" :meta="ra.placasUrgencia.length ? `${ra.placasUrgencia.length} placas` : 'sin fallas en P1-P4'" />
            <KpiCard label="Críticas · Nivel 1" :value="fmtN(ra.nivel1, 0)" accent="#EF4444" icon="zap" meta="compra inmediata" />
            <KpiCard label="Críticas · Nivel 2" :value="fmtN(ra.nivel2, 0)" accent="#F97316" icon="package" meta="próxima SOLPED" />
            <KpiCard label="Rotaciones / bloqueos" :value="`${ra.rotaciones} / ${ra.bloqueos}`" accent="#8B5CF6" icon="activity" meta="P1-P2 a tracción · OT bloqueadas" />
          </div>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Pos.</th><th>Grupo</th><th class="r">Pmín</th><th>Motivo</th><th>Prioridad (SOLPED)</th><th>Acción operativa</th></tr></thead>
              <tbody>
                <tr v-for="l in alertasCriticas.slice(0, 20)" :key="l.id" :class="{ alerta: l.alerta!.urgenciaAbsoluta }">
                  <td class="bold accent-text">{{ l.placa }}</td><td>{{ l.posicion || '—' }}</td><td class="nowrap">{{ l.alerta!.categoria }}</td>
                  <td class="r bold red">{{ l.insp && l.insp.remanente > 0 ? fmtN(l.insp.remanente, 1) + ' mm' : '—' }}</td>
                  <td class="txt-largo">{{ l.alerta!.motivos.join(' · ') }}</td>
                  <td><span class="pill" :class="l.alerta!.urgenciaAbsoluta ? 'p-rojo' : /Nivel 1/.test(l.alerta!.prioridad) ? 'p-ambar' : 'p-gris'">{{ l.alerta!.urgenciaAbsoluta ? 'Prioridad 0' : l.alerta!.prioridad }}</span></td>
                  <td class="txt-largo muted">{{ l.alerta!.accion }}</td>
                </tr>
                <tr v-if="!alertasCriticas.length"><td colspan="7" class="muted">Sin llantas críticas según los criterios de inspección.</td></tr>
              </tbody>
            </table>
          </div></div>
          <p v-if="alertasCriticas.length > 20" class="section-note">Se muestran 20 de {{ alertasCriticas.length }}; la lista completa está en la vista Alertas.</p>
          <div v-if="ra.rotaciones || ra.bloqueos || ra.noNuevas" class="report-nota">
            <template v-if="ra.rotaciones"><strong>Cascada de posiciones:</strong> {{ ra.rotaciones }} {{ ra.rotaciones === 1 ? 'llanta' : 'llantas' }} de P1-P2 entre {{ fmtN(ROTACION_MIN, 0) }} y {{ fmtN(ROTACION_MAX, 0) }} mm: rotar al eje de tracción. </template>
            <template v-if="ra.noNuevas">{{ ra.noNuevas }} en P1-P2 no se montaron nuevas ({{ PROF_NUEVA_MIN }}-18 mm). </template>
            <template v-if="ra.bloqueos"><strong>Bloqueo de OT:</strong> {{ ra.bloqueos }} reencauchadas o reparadas en posiciones 1 a 4.</template>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>3.1 Requerimientos a 0 días — dimensión × planta</h3>
          <p class="section-note">Llantas en cambio inmediato: guía para que el almacén despache hoy.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Dimensión</th><th v-for="p in m.requerimientos.value.plantas" :key="p" class="r">{{ p }}</th><th class="r">Total</th></tr></thead>
              <tbody>
                <tr v-for="f in m.requerimientos.value.filas" :key="f.dimension">
                  <td class="bold accent-text">{{ f.dimension }}</td>
                  <td v-for="p in m.requerimientos.value.plantas" :key="p" class="r">{{ f.porPlanta[p] || '' }}</td>
                  <td class="r bold">{{ f.total }}</td>
                </tr>
                <tr v-if="!m.requerimientos.value.filas.length"><td :colspan="2 + m.requerimientos.value.plantas.length" class="muted">Sin requerimientos inmediatos.</td></tr>
              </tbody>
              <tfoot v-if="m.requerimientos.value.filas.length"><tr class="table-total-row">
                <td>Total</td>
                <td v-for="p in m.requerimientos.value.plantas" :key="p" class="r">{{ m.requerimientos.value.filas.reduce((a, f) => a + (f.porPlanta[p] || 0), 0) }}</td>
                <td class="r">{{ m.requerimientos.value.total }}</td>
              </tr></tfoot>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>3.2 Candidatas a reencauche (30-60 días)</h3>
          <p class="section-note">Remanente entre {{ fmtN(REENCAUCHE_MIN, 1) }} y {{ fmtN(REENCAUCHE_MAX, 1) }} mm y sin cortes en la carcasa: enviarlas a tiempo salva la carcasa.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Pos.</th><th>Marca</th><th>Dimensión</th><th>Planta</th><th class="r">Remanente</th><th class="r">Desgaste</th><th>DOT</th></tr></thead>
              <tbody>
                <tr v-for="l in m.reencauche.value.slice(0, 25)" :key="l.id">
                  <td class="bold accent-text">{{ l.placa }}</td><td>{{ l.posicion || '—' }}</td><td>{{ l.marca }}</td><td>{{ l.dimension }}</td><td>{{ l.planta }}</td>
                  <td class="r bold">{{ fmtN(l.insp!.remanente, 1) }} mm</td>
                  <td class="r">{{ l.desgasteMes !== null ? fmtN(l.desgasteMes, 2) + ' mm/mes' : '—' }}</td>
                  <td :class="{ red: (l.dotAnios ?? 0) > DOT_ANIOS }">{{ l.dotFecha ? `${l.dotFecha.getUTCFullYear()} (${fmtN(l.dotAnios!, 1)} años)` : 'Ilegible' }}</td>
                </tr>
                <tr v-if="!m.reencauche.value.length"><td colspan="8" class="muted">Sin candidatas a reencauche en el período.</td></tr>
              </tbody>
            </table>
          </div></div>
          <p v-if="m.reencauche.value.length > 25" class="section-note">Se muestran 25 de {{ m.reencauche.value.length }}; el listado completo está en Inventario.</p>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>3.3 Cronología de cambios del período</h3>
          <p class="section-note">
            Cambios registrados en la hoja <strong>Cronologia_Llantas_Concreos</strong> (montajes, rotaciones, cambios de placa, bajas, reencauches),
            del más reciente al más antiguo: {{ cambiosPeriodo.length }} {{ cambiosPeriodo.length === 1 ? 'registro' : 'registros' }} en el período.
          </p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Evento</th><th>Placa</th><th>Pos.</th><th>Llanta</th><th>Detalle</th><th>Responsable</th><th>Fuente</th></tr></thead>
              <tbody>
                <tr v-for="(g, i) in cambiosPeriodo.slice(0, 20)" :key="i">
                  <td class="nowrap">{{ fechaTxt(Math.floor(g.e.fecha)) }}</td>
                  <td class="nowrap"><span class="dot" :style="{ background: EVENTO_COLOR[g.e.tipo] }"></span><b>{{ g.e.titulo }}</b></td>
                  <td class="bold accent-text">{{ g.e.placa }}</td><td>{{ g.posiciones.join(', ') || '—' }}</td>
                  <td class="nowrap">{{ g.e.tipo === 'ot' ? 'Placa' : g.llantas.length > 1 ? `${g.llantas.length} llantas` : `${g.e.llanta.marca}${g.e.llanta.serie ? ' · ' + g.e.llanta.serie : ''}` }}</td>
                  <td class="txt-largo muted">{{ g.llantas.length > 1 && g.e.tipo !== 'ot' ? `${[...new Set(g.llantas.map(l => l.marca))].join(', ')}` : g.e.detalle }}</td>
                  <td class="muted">{{ g.e.responsable || '—' }}</td>
                  <td><span class="pill" :class="g.e.fuente === 'Cronología' ? 'p-verde' : 'p-gris'">{{ g.e.fuente }}</span></td>
                </tr>
                <tr v-if="!cambiosPeriodo.length"><td colspan="8" class="muted">La hoja de cronología no tiene cambios registrados en el período.</td></tr>
              </tbody>
            </table>
          </div></div>
          <p v-if="cambiosPeriodo.length > 20" class="section-note">Se muestran 20 de {{ cambiosPeriodo.length }} entradas; la historia completa de cada llanta está en su ficha (Inventario).</p>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>5.1 Intervenciones mecánicas urgentes</h3>
          <p class="section-note">Placas con cambio inmediato o desgaste acelerado: las OT que deben abrirse de inmediato.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Placa</th><th>Tipo · planta</th><th class="r">Inmediato</th><th class="r">Desgaste</th><th>OT a abrir</th></tr></thead>
              <tbody>
                <tr v-for="p in urgentes" :key="p.placa" class="alerta">
                  <td class="bold accent-text">{{ p.placa }}</td><td>{{ p.tipo }} · {{ p.planta }}</td>
                  <td class="r bold red">{{ p.inmediato || '—' }}</td>
                  <td class="r" :class="{ red: (p.desgaste ?? 0) > DESGASTE_ALTO }">{{ p.desgaste !== null ? fmtN(p.desgaste, 2) + ' mm/mes' : '—' }}</td>
                  <td class="txt-largo">{{ m.planIntervencion(p.llantas)[0] }}</td>
                </tr>
                <tr v-if="!urgentes.length"><td colspan="5" class="muted">Sin intervenciones urgentes.</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <footer class="report-footer"><span>Macro Informe Analítico de Llantas — Concretos</span><span>Documento oficial<span class="fp-num"> | Página 3 de 5</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 4: FICHAS DE INTERVENCIÓN POR PLACA -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>4. Fichas de intervención por placa — top {{ m.top10.value.length }}</h3>
          <p class="section-note">Perfil y confiabilidad del dato, semáforo del vehículo, llantas a intervenir con su evidencia fotográfica, vencimiento de carcasa (DOT &gt; {{ DOT_ANIOS }} años), cronología reciente de la placa y plan para la OT.</p>
        </div>
        <div v-for="p in m.top10.value" :key="p.placa" class="ficha">
          <div class="ficha-head">
            <div>
              <b class="ficha-placa">{{ p.placa }}</b>
              <span class="muted"> · {{ p.tipo }} · {{ p.planta }} · {{ fechaTxt(p.fecha) }} · {{ p.evaluador || 'Sin evaluador' }}</span>
            </div>
            <div class="ficha-sem">
              <span class="pill p-rojo">{{ p.inmediato }} inmediato</span>
              <span class="pill p-ambar">{{ p.proyectado }} proyectado</span>
              <span class="pill p-verde">{{ p.bueno }} bien</span>
            </div>
          </div>
          <!-- 4.2 Semáforo del vehículo: barra proporcional -->
          <div class="ficha-barra">
            <i :style="{ width: pctBarra(p.inmediato, p.llantas.length), background: SEMAFORO_COLOR.inmediato }"></i>
            <i :style="{ width: pctBarra(p.proyectado, p.llantas.length), background: SEMAFORO_COLOR.proyectado }"></i>
            <i :style="{ width: pctBarra(p.bueno, p.llantas.length), background: SEMAFORO_COLOR.bueno }"></i>
          </div>
          <!-- 4.1 Perfil y confiabilidad -->
          <div class="ficha-perfil">
            <span>Lectura: <b>{{ p.lectura ? fmtN(p.lectura, 0) + (p.unidad ? ' ' + p.unidad : '') : 'sin registrar' }}</b></span>
            <span>Llantas: <b>{{ p.llantas.length }}{{ p.llantasEquipo ? ` de ${p.llantasEquipo}` : '' }}</b></span>
            <span>Montaje: <b>{{ montajePlaca(p.llantas) }}</b></span>
            <span>Desgaste: <b :class="{ red: (p.desgaste ?? 0) > DESGASTE_ALTO }">{{ p.desgaste !== null ? fmtN(p.desgaste, 2) + ' mm/mes' : '—' }}</b></span>
            <span>Confiabilidad: <span class="pill" :class="p.confianza >= 0.8 ? 'p-verde' : p.confianza >= 0.6 ? 'p-ambar' : 'p-rojo'">{{ Math.round(p.confianza * 100) }} % · {{ p.confianza >= 0.8 ? 'confiable' : p.confianza >= 0.6 ? 'revisar' : 'dudoso' }}</span></span>
          </div>
          <div v-if="p.controles.some(c => !c.ok)" class="ficha-controles">Falla: {{ p.controles.filter(c => !c.ok).map(c => c.control.toLowerCase()).join(' · ') }}</div>
          <!-- 4.3 Matriz de daños (llantas que no están en buen estado) con evidencia y 4.4 DOT -->
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Pos.</th><th>Marca</th><th>Dimensión</th><th class="r">Ext / Cen / Int</th><th class="r">PSI</th><th>Diagnóstico</th><th>DOT</th><th>Foto</th></tr></thead>
              <tbody>
                <tr v-for="l in llantasFicha(p.llantas)" :key="l.id" :class="{ alerta: l.semaforo === 'inmediato' }">
                  <td class="bold">{{ l.posicion || '—' }}</td><td>{{ l.marca }}</td><td>{{ l.dimension }}</td>
                  <td class="r">{{ fmtN(l.insp!.ext, 0) }} / {{ fmtN(l.insp!.cen, 0) }} / {{ fmtN(l.insp!.int, 0) }}</td>
                  <td class="r" :class="{ red: l.presion === 'Baja' || l.presion === 'Alta' }">{{ l.insp!.psi || '—' }}</td>
                  <td class="txt-largo"><span class="pill" :class="l.semaforo === 'inmediato' ? 'p-rojo' : l.semaforo === 'proyectado' ? 'p-ambar' : 'p-gris'">{{ l.semaforo ? SEMAFORO_LBL[l.semaforo] : '—' }}</span> {{ l.insp!.condiciones.join(', ') }}</td>
                  <td :class="{ 'red bold': (l.dotAnios ?? 0) > DOT_ANIOS }">{{ l.dotFecha ? String(l.dotFecha.getUTCFullYear()) + ((l.dotAnios ?? 0) > DOT_ANIOS ? ' · vencida' : '') : 'Ilegible' }}</td>
                  <td>
                    <div v-if="p.fotos.length" class="fotos-celda"><FotoLlanta v-for="(f, i) in p.fotos.slice(0, 3)" :key="i" :valor="f" :titulo="`${p.placa} · foto ${i + 1}`" /></div>
                    <span v-else class="muted nowrap">Sin foto</span>
                  </td>
                </tr>
                <tr v-if="!llantasFicha(p.llantas).length"><td colspan="8" class="muted">Todas las llantas en buen estado; la placa entra por desgaste acelerado.</td></tr>
              </tbody>
            </table>
          </div></div>
          <!-- Cronología reciente de la placa (montajes, rotaciones, OT; sin repetir las mediciones) -->
          <div v-if="historiaPlaca(p.llantas).length" class="ficha-crono">
            <span class="ficha-crono-tit">Cronología reciente</span>
            <span v-for="(e, i) in historiaPlaca(p.llantas)" :key="i" class="ficha-crono-ev">
              <i :style="{ background: EVENTO_COLOR[e.tipo] }"></i><b>{{ fechaTxt(Math.floor(e.fecha)) }}</b> {{ e.titulo }}{{ e.posicion ? ` · pos. ${e.posicion}` : '' }}
            </span>
          </div>
          <!-- 4.5 Plan de intervención -->
          <ul class="res ficha-plan"><li v-for="(t, i) in m.planIntervencion(p.llantas)" :key="i">{{ t }}</li></ul>
        </div>
        <div v-if="!m.top10.value.length" class="report-nota">Ninguna placa requiere intervención en el período.</div>

        <footer class="report-footer"><span>Macro Informe Analítico de Llantas — Concretos</span><span>Documento oficial<span class="fp-num"> | Página 4 de 5</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 5: CALIDAD DEL DATO Y CONCLUSIONES -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — 5.2 depuración de datos y errores de toma</h3>
          <p v-if="avisos.length" class="section-note">{{ avisos.length }} {{ avisos.length === 1 ? 'hallazgo' : 'hallazgos ordenados por prioridad' }}. Tareas para el analista o el inspector: cada uno trae el detalle para corregirlo en la hoja.</p>
          <div class="dq-grid">
            <div v-for="c in avisos" :key="c.titulo" class="dq" :class="`dq-${c.nivel}`">
              <div class="dq-head"><span class="pill" :class="pillNivel(c.nivel)">{{ etiquetaNivel(c.nivel) }}</span><b>{{ c.titulo }}</b></div>
              <p class="dq-txt" v-html="c.texto"></p>
              <div v-if="c.tabla" class="data-card"><div class="table-wrap">
                <table>
                  <thead><tr><th v-for="(h, i) in c.tabla.cols" :key="h" :class="{ r: i > 0 && c.tabla.der !== false && !c.tabla.izq?.includes(i) }">{{ h }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(f, j) in c.tabla.filas" :key="j" :class="{ 'table-total-row': f.total }">
                      <td v-for="(v, i) in f.celdas" :key="i" :class="[i === 0 ? 'bold accent-text' : (c.tabla.mono === i ? 'mono' : (c.tabla.der === false || c.tabla.izq?.includes(i) ? '' : 'r')), f.clases?.[i]]">{{ v }}</td>
                    </tr>
                  </tbody>
                </table>
              </div></div>
            </div>
            <div v-if="!avisos.length" class="report-nota">Sin hallazgos: inventario e inspecciones completos en el período.</div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo</h3>
          <div class="data-card" style="padding: 10px 14px">
            <template v-for="(g, i) in conclusiones" :key="g.titulo">
              <div class="concl-head" :style="i ? 'margin-top: 10px' : ''">{{ g.titulo }}</div>
              <ul class="res"><li v-for="(x, j) in g.items" :key="j" v-html="x"></li></ul>
            </template>
          </div>
        </div>

        <footer class="report-footer"><span>Macro Informe Analítico de Llantas — Concretos</span><span>Documento oficial · Generado {{ generado }}<span class="fp-num"> | Página 5 de 5</span></span></footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * InformeLlantasTab.vue — «Macro Informe Analítico de Llantas» de la hoja ESTRUCTURA
 * (…/maquinaria/llantas/informe). Secciones: 1 resumen ejecutivo (volumen, semáforo, presiones, brecha de
 * compras), 2 análisis causal y rendimiento (causas, desgaste/CPK, marcas, patrones), 3 proyección logística
 * (requerimientos a 0 días, reencauche), 4 fichas de intervención top 10 y 5 tareas (intervenciones urgentes y
 * depuración de datos como «Control de calidad del dato»), con las conclusiones agrupadas.
 * Mismo estilo que los demás informes (informe.css): tema oscuro solo en pantalla, PDF siempre en blanco.
 */
import { type Hallazgo, etiquetaNivel, pillNivel, porPrioridad } from '../../utils/calidadDato'
import { computed, ref } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import KpiCard from '../../components/dashboard/KpiCard.vue'
import FotoLlanta from './FotoLlanta.vue'
import { descargarInformePdf } from '../../utils/pdfInforme'
import { useTemaInforme } from '../../composables/useTemaInforme'
import { useLlantasStore, useMantenimientoStore } from '../../stores'
import { COLOR_PLANTA, COLOR_EXTRA, fmtN, cop } from '../../composables/useGraficasConcreto'
import {
  useLlantas, isoDe, type Llanta, type FiltrosLlantas, type Semaforo, type EventoLlanta, EVENTO_COLOR, agruparEventos,
  FACTOR_DIRECCIONAL, ROTACION_MIN, ROTACION_MAX, PROF_NUEVA_MIN, PSI_MIN, PSI_MAX, DESGASTE_ALTO, DOT_ANIOS, REENCAUCHE_MIN, REENCAUCHE_MAX, SEMAFORO_LBL, SEMAFORO_COLOR,
} from '../../composables/useLlantas'

use([CanvasRenderer, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])
// En tema oscuro las gráficas se ven con colores para fondo oscuro; el PDF siempre sale en papel blanco
const { tema } = useTemaInforme()

const props = defineProps<{ filtros: FiltrosLlantas }>()
const store = useLlantasStore()
const mant = useMantenimientoStore()
const m = useLlantas(
  computed(() => store.data as Record<string, unknown> | null),
  computed(() => (mant.concretosData?.rows ?? []) as Record<string, unknown>[]),
  computed(() => props.filtros),
)

const pctTxt = (n: number) => `${fmtN(Number.isFinite(n) ? n : 0, 1)} %`
const pctDe = (n: number) => (m.volumen.value.llantas ? (n / m.volumen.value.llantas) * 100 : 0)
const colorPlanta = (p: string) => COLOR_PLANTA[p] ?? COLOR_EXTRA[0]
const fechaTxt = (s: number) => { const iso = isoDe(Number(s) || 0); return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—' }
const pctBarra = (n: number, t: number) => (t ? `${(n / t) * 100}%` : '0%')
const sinCosto = computed(() => m.financiero.value.conCosto === 0)
/** CPK: costo de la llanta ÷ km recorridos desde la medición anterior (solo con costo y lectura en km) */
function cpk(l: Llanta): string {
  if (!l.costo || l.insp?.unidad !== 'km') return '—'
  const previa = l.historial.filter(h => h.fecha < l.insp!.fecha && h.unidad === 'km' && h.lectura > 0).pop()
  const km = previa ? l.insp!.lectura - previa.lectura : 0
  return km > 0 ? cop(l.costo / km) + '/km' : '—'
}
/** Llantas de la ficha: las que no están en buen estado o tienen condición irregular / DOT vencido */
const llantasFicha = (ls: Llanta[]) => ls.filter(l => l.semaforo !== 'bueno' || l.insp!.condiciones.length || (l.dotAnios ?? 0) > DOT_ANIOS)
  .sort((a, b) => (a.insp!.remanente - b.insp!.remanente))

// ---------------------------------------------------------------- Período y encabezado
const desde = computed(() => props.filtros.fechaInicio || '')
const hasta = computed(() => props.filtros.fechaFin || '')
const corteIso = computed(() => hasta.value || isoDe(m.ultimaFecha.value))
const corteTxt = computed(() => (corteIso.value ? fechaTxt(Math.round(Date.parse(corteIso.value) / 86400000) + 25569) : '—'))
const periodoTxt = computed(() => (desde.value || hasta.value
  ? `${desde.value ? fechaTxt(Math.round(Date.parse(desde.value) / 86400000) + 25569) : 'inicio'} a ${corteTxt.value}`
  : `corte ${corteTxt.value}`))
const periodoLargo = computed(() => (desde.value || hasta.value ? `entre ${periodoTxt.value.replace(' a ', ' y el ')}` : `de todas las inspecciones registradas (corte ${corteTxt.value})`))
const plantasTxt = computed(() => m.plantas.value.join(', '))
const codigo = computed(() => `GRV-INF-${(corteIso.value || '').slice(0, 4)}-CONCRETOS-LLANTAS`)
const generado = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })

const presionesPlanta = computed(() => Object.entries(m.presiones.value.porPlanta).map(([planta, c]) => {
  const total = c.Correcta + c.Baja + c.Alta + c['Sin medir']
  return { planta, ...c, pct: total ? ((total - c['Sin medir']) / total) * 100 : 0 }
}))
/** Cambios del período sin las mediciones de inspección (esas van en las secciones 1 y 2) */
const cambiosPeriodo = computed(() => agruparEventos(m.eventos.value.filter(e => e.fuente === 'Cronología')))
const vidaMarca = (marca: string) => m.vidaPorMarca.value.find(v => v.marca === marca)
/** Fecha de montaje más antigua de las llantas de la placa */
function montajePlaca(ls: Llanta[]): string {
  const f = ls.map(l => m.vida(l).inicio).filter(x => x > 0)
  return f.length ? fechaTxt(Math.min(...f)) : 'sin fecha'
}
/** Últimos 6 eventos de las llantas de la placa (una sola inspección por fecha, sin repetirla por llanta) */
function historiaPlaca(ls: Llanta[]): EventoLlanta[] {
  const vistos = new Set<string>()
  return ls.flatMap(l => m.lineaTiempo(l)).filter(e => e.fecha > 0 && e.fuente === 'Cronología')
    .sort((a, b) => b.fecha - a.fecha)
    .filter(e => {
      const k = e.tipo === 'inspeccion' || e.tipo === 'ot' || e.tipo === 'montaje' ? `${e.tipo}|${Math.floor(e.fecha)}|${e.tipo === 'ot' ? e.titulo : ''}` : `${e.tipo}|${e.fecha}|${e.idLlanta}`
      if (vistos.has(k)) return false
      vistos.add(k); return true
    }).slice(0, 6)
    .map(e => (e.tipo === 'inspeccion' ? { ...e, titulo: 'Inspección de la placa', posicion: '' } : e.tipo === 'montaje' ? { ...e, posicion: '' } : e))
}
const ra = computed(() => m.resumenAlertas.value)
const alertasCriticas = computed(() => m.alertas.value.filter(l => l.alerta!.nivel === 'Crítica'))
const urgentes = computed(() => m.porPlaca.value.filter(p => p.inmediato > 0 || (p.desgaste ?? 0) > DESGASTE_ALTO)
  .sort((a, b) => b.inmediato - a.inmediato || (b.desgaste ?? 0) - (a.desgaste ?? 0)).slice(0, 10))

// ---------------------------------------------------------------- Gráficas (colores para papel blanco)
const optSemaforo = computed(() => {
  const datos = (['inmediato', 'proyectado', 'bueno'] as Semaforo[]).map(k => ({ name: SEMAFORO_LBL[k], value: m.semaforo.value[k], itemStyle: { color: SEMAFORO_COLOR[k] } })).filter(d => d.value)
  const total = datos.reduce((a, d) => a + d.value, 0)
  return {
    animation: false, textStyle: { fontFamily: 'Lato, Segoe UI, sans-serif' },
    tooltip: { trigger: 'item' as const, formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} llantas (${fmtN(p.percent, 1)} %)` },
    legend: { orient: 'vertical' as const, right: 4, top: 'middle', icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { color: '#475569', fontSize: 11 },
      formatter: (n: string) => { const d = datos.find(x => x.name === n); return `${n}  ${d?.value ?? 0} (${fmtN(total ? (d?.value ?? 0) / total * 100 : 0, 0)} %)` } },
    series: [{
      type: 'pie' as const, radius: ['46%', '72%'], center: ['30%', '50%'], itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'center' as const, formatter: () => `{v|${total}}\n{s|llantas}`, rich: { v: { fontSize: 18, fontWeight: 700, color: '#0f172a' }, s: { fontSize: 10, color: '#64748b' } } },
      emphasis: { label: { show: true } }, labelLine: { show: false }, data: datos,
    }],
  }
})
const optCausas = computed(() => {
  const lista = m.causas.value
  return {
    animation: false, textStyle: { fontFamily: 'Lato, Segoe UI, sans-serif' },
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    grid: { left: 8, right: 36, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value' as const, show: false, max: (v: { max: number }) => v.max * 1.15 },
    yAxis: { type: 'category' as const, inverse: true, data: lista.map(c => c.causa), axisTick: { show: false }, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#475569', fontSize: 10.5 } },
    series: [{ type: 'bar' as const, barWidth: '58%', data: lista.map(c => ({ value: c.n, itemStyle: { color: c.grupo === 'Daño' ? '#EF4444' : '#F59E0B', borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: '#475569', fontSize: 10.5, fontWeight: 700 as const } }],
  }
})

// ---------------------------------------------------------------- Análisis, calidad del dato y conclusiones
const analisis = computed(() => {
  const v = m.volumen.value, s = m.semaforo.value, p = m.presiones.value, f = m.financiero.value
  const partes = [
    `Se evaluaron <strong>${fmtN(v.llantas, 0)} llantas en ${v.placas} placas</strong>. `,
    s.inmediato ? `<span class="red"><strong>${s.inmediato}</strong> requieren cambio inmediato</span>` : '<span class="green">Ninguna requiere cambio inmediato</span>',
    `, ${s.proyectado} cambio proyectado y ${s.bueno} están en buen estado (${pctTxt(pctDe(s.bueno))}). `,
    `La presión se midió en el ${pctTxt(p.pctMedidas)} de las llantas y el ${pctTxt(p.pctCorrecta)} de las medidas está en el rango correcto. `,
  ]
  if (m.conDesgaste.value.length) partes.push(`El desgaste promedio es de <strong>${fmtN(m.desgasteProm.value, 2)} mm/mes</strong>; ${m.devoradoras.value.length} llantas superan ${fmtN(DESGASTE_ALTO, 1)} mm/mes. `)
  if (m.resumenAlertas.value.urgencia) partes.push(`<span class="red"><strong>Urgencia absoluta:</strong> ${m.resumenAlertas.value.urgencia} llantas críticas en las posiciones 1 a 4 (jerarquía direccional) en ${m.resumenAlertas.value.placasUrgencia.join(', ')}</span>. `)
  if (m.brecha.value.falsas.length) partes.push(`${m.brecha.value.falsas.length} de las llantas marcadas para cambio ya fueron reemplazadas y no deben comprarse otra vez. `)
  if (f.otN) partes.push(`En el período se cerraron ${f.otN} OT de llantas por <strong>${cop(f.otCosto)}</strong>.`)
  return partes.join('')
})

const avisos = computed<Hallazgo[]>(() => {
  const c = m.calidad.value
  const out: Hallazgo[] = []
  const max = 15
  if (c.sinInspeccion.length) out.push({ nivel: 'alto', titulo: `${c.sinInspeccion.length} ${c.sinInspeccion.length === 1 ? 'placa' : 'placas'} con llantas montadas sin inspección en el período`,
    texto: 'Sin inspección no hay semáforo, presión ni desgaste de esas llantas. <b>Acción:</b> programarlas en la próxima ronda de inspección.',
    tabla: { cols: ['Placa', 'Tipo', 'Planta', 'Llantas', 'Última inspección'], der: false,
      filas: c.sinInspeccion.slice(0, max).map(p => ({ celdas: [p.placa, p.tipo, p.planta, String(p.n), p.ultima ? fechaTxt(p.ultima) : 'Nunca'] })) } })
  if (c.sinId.length) out.push({ nivel: 'alto', titulo: `${c.sinId.length} ${c.sinId.length === 1 ? 'medición' : 'mediciones'} de llantas sin ID trazable`,
    texto: 'La sub-inspección apunta a una llanta que no existe en el inventario: la medición no se puede seguir en el tiempo. <b>Acción:</b> corregir el Id_Llanta o registrar la llanta.',
    tabla: { cols: ['Id sub-inspección', 'Placa', 'Id llanta', 'Marca', 'Posición'], der: false, mono: 2,
      filas: c.sinId.slice(0, max).map(s => ({ celdas: [String(s['Id'] ?? ''), String(s['Placa'] ?? ''), String(s['Id Llanta'] ?? '') || '(vacío)', String(s['Marca'] ?? ''), String(s['Posición'] ?? '')] })) } })
  if (m.desgasteNegativo.value.length) out.push({ nivel: 'medio', titulo: `${m.desgasteNegativo.value.length} llantas con más profundidad que en la medición anterior`,
    texto: 'El remanente no puede aumentar: es un error de toma o de la profundidad inicial. <b>Acción:</b> repetir la medición y corregir el dato.',
    tabla: { cols: ['Placa', 'Pos.', 'Anterior', 'Actual', 'mm/mes'], filas: m.desgasteNegativo.value.slice(0, max).map(l => ({
      celdas: [l.placa, l.posicion || '—', `${fmtN(l.anterior!.remanente, 1)} mm`, `${fmtN(l.insp!.remanente, 1)} mm`, fmtN(l.desgasteMes!, 2)] })) } })
  if (c.fechaInicialMala.length) {
    const porPlaca = [...c.fechaInicialMala.reduce((a, l) => a.set(l.placa, (a.get(l.placa) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])
    out.push({ nivel: 'medio', titulo: `${c.fechaInicialMala.length} llantas inspeccionadas sin medición anterior válida`,
      texto: `No tienen inspección previa ni «Fecha inicial» válida (vacía o mal digitada, p. ej. 158092): no se puede calcular su velocidad de desgaste. <b>Acción:</b> corregir la fecha inicial en el inventario.`,
      tabla: { cols: ['Placa', 'Llantas'], filas: porPlaca.slice(0, max).map(([p, n]) => ({ celdas: [p, String(n)] })) } })
  }
  if (c.lecturaMala.length) out.push({ nivel: 'medio', titulo: `${c.lecturaMala.length} inspecciones sin lectura de odómetro u horómetro confiable`,
    texto: 'Sin la lectura (o sin su unidad, km u horas) no se puede calcular el costo por kilómetro ni validar el desgaste. <b>Acción:</b> registrar «Valor» y «Unidad de Registro» en cada inspección.',
    tabla: { cols: ['Placa', 'Fecha', 'Lectura', 'Unidad'], der: false, filas: c.lecturaMala.slice(0, max).map(i => ({ celdas: [i.placa, fechaTxt(i.fecha), i.lectura ? fmtN(i.lectura, 1) : 'Vacía', i.unidad || 'Sin unidad'] })) } })
  if (c.incompletas.length) out.push({ nivel: 'medio', titulo: `${c.incompletas.length} inspecciones incompletas`,
    texto: 'Se midieron menos llantas de las que tiene el equipo según el maestro. <b>Acción:</b> completar las posiciones faltantes.',
    tabla: { cols: ['Placa', 'Fecha', 'Medidas', 'Del equipo'], filas: c.incompletas.slice(0, max).map(i => ({ celdas: [i.placa, fechaTxt(i.fecha), String(i.inspeccionadas), String(i.llantasEquipo)] })) } })
  if (c.psiSinMedir.length) out.push({ nivel: 'medio', titulo: `${c.psiSinMedir.length} llantas inspeccionadas sin presión (PSI 0 o vacío)`,
    texto: 'El personal de patio debe tomar la presión en cada inspección. <b>Acción:</b> reforzar la toma de presión.',
    tabla: { cols: ['Placa', 'Pos.', 'Marca'], der: false, filas: c.psiSinMedir.slice(0, max).map(l => ({ celdas: [l.placa, l.posicion || '—', l.marca] })) } })
  if (m.volumen.value.posicionesVacias) out.push({ nivel: 'info', titulo: `${m.volumen.value.posicionesVacias} posiciones reportadas como «No tiene llanta»`,
    texto: 'La inspección marca la posición vacía pero el inventario tiene una llanta asignada. <b>Acción:</b> actualizar el estado o la ubicación de esa llanta.' })
  if (c.sinSerie.length) out.push({ nivel: 'info', titulo: `${c.sinSerie.length} llantas sin serie, marca o dimensión`,
    texto: 'Sin estos datos la llanta no se puede identificar en el patio. <b>Acción:</b> completarlos en el inventario.',
    tabla: { cols: ['Id', 'Placa', 'Serie', 'Marca', 'Dimensión'], der: false, mono: 0, filas: c.sinSerie.slice(0, max).map(l => ({ celdas: [l.id, l.placa, l.serie || '—', l.marca, l.dimension] })) } })
  if (c.dotIlegible.length) out.push({ nivel: 'info', titulo: `${c.dotIlegible.length} llantas sin DOT legible`,
    texto: `Sin la fecha de fabricación no se puede controlar el vencimiento de la carcasa (más de ${DOT_ANIOS} años). <b>Acción:</b> registrar el DOT al montar la llanta.` })
  if (c.sinCosto || c.sinEstado) out.push({ nivel: 'info', titulo: 'Inventario sin costo o sin estado',
    texto: `${c.sinCosto} llantas sin costo de adquisición (la valorización, el costo evitado y el CPK quedan en cantidades) y ${c.sinEstado} sin estado de inventario. <b>Acción:</b> completar «Costo adquisición» y «Estado de inventario».` })
  if (c.variantesMarca.length) out.push({ nivel: 'info', titulo: `${c.variantesMarca.length} marcas escritas de varias formas`,
    texto: 'Se unifican para el informe, pero conviene corregirlas en la hoja para que los filtros coincidan.',
    tabla: { cols: ['Marca', 'Variantes'], der: false, izq: [1], filas: c.variantesMarca.map(v => ({ celdas: [v.marca, v.variantes.join(' · ')] })) } })
  if (!c.fotos && m.semaforo.value.inmediato) out.push({ nivel: 'info', titulo: 'Sin evidencia fotográfica de las llantas críticas',
    texto: 'La hoja de evidencias no tiene fotos: la matriz fotográfica de daños queda vacía. <b>Acción:</b> marcar «¿Requiere evidencia fotográfica?» en las llantas en cambio inmediato.' })
  const rc = m.resumenCronologia.value
  const sinEnlace = m.cronologia.value.filter(x => !x.idLlanta && !x.idInspeccion)
  if (sinEnlace.length) out.push({ nivel: 'medio', titulo: `${sinEnlace.length} registros de cronología sin llanta ni inspección`,
    texto: 'El Id_Formulario no coincide con ninguna llanta del inventario ni con una inspección: el cambio no se puede ubicar en la historia. <b>Acción:</b> revisar el Id del formulario.',
    tabla: { cols: ['Id historial', 'Id formulario', 'Hoja', 'Fecha', 'Acción'], der: false, mono: 1,
      filas: sinEnlace.slice(0, 15).map(x => ({ celdas: [x.id, x.idFormulario || '(vacío)', x.hoja, fechaTxt(Math.floor(x.fecha)), x.accion] })) } })
  if (!rc.registrosHoja) out.push({ nivel: 'info', titulo: 'La hoja de cronología de llantas está vacía',
    texto: 'Sin la cronología no hay fecha de montajes, rotaciones, cambios de placa ni bajas: la historia de cada llanta se reconstruye con el inventario, las inspecciones y las OT. <b>Acción:</b> activar el registro de cambios en Cronologia_Llantas_Concreos.' })
  return porPrioridad(out)
})

const cronoConcl = computed(() => {
  // Solo la hoja Cronologia_Llantas_Concreos (los indicadores de vida útil salen del montaje inicial y las inspecciones)
  const of = m.eventos.value.filter(e => e.fuente === 'Cronología')
  const n = (t: string) => of.filter(e => e.tipo === t).length
  const out = [of.length
    ? `${of.length} cambios registrados en la hoja de cronología: ${n('montaje')} montajes, ${n('rotacion')} rotaciones, ${n('traslado')} cambios de placa, ${n('baja')} bajas y ${n('reencauche')} reencauches.`
    : 'La hoja de cronología no tiene cambios registrados en el período.']
  const mejor = m.vidaPorMarca.value.filter(v => v.n >= 5 && v.vidaTotal !== null)[0]
  if (mejor) out.push(`Mayor vida útil estimada (al menos 5 llantas): <strong>${mejor.marca}</strong>, con ${fmtN(mejor.vidaTotal!, 1)} meses entre el montaje y la vida restante.`)
  return out
})

const conclusiones = computed(() => {
  const s = m.semaforo.value, f = m.financiero.value, pl = m.planes.value
  const flota: string[] = [], desgaste: string[] = [], logistica: string[] = [], tareas: string[] = [], datos: string[] = []
  flota.push(`Se inspeccionaron <strong>${fmtN(m.volumen.value.llantas, 0)} llantas</strong> en ${m.volumen.value.placas} placas: ${s.inmediato} en cambio inmediato, ${s.proyectado} proyectado y ${s.bueno} en buen estado.`)
  if (m.criticos.value[0]) flota.push(`La placa más comprometida es <strong>${m.criticos.value[0].placa}</strong> (${m.criticos.value[0].inmediato} inmediato, ${m.criticos.value[0].proyectado} proyectado).`)
  flota.push(`Presión medida en el ${pctTxt(m.presiones.value.pctMedidas)} de las llantas; ${m.presiones.value.Baja + m.presiones.value.Alta} fuera de rango.`)
  if (m.conDesgaste.value.length) desgaste.push(`Desgaste promedio de ${fmtN(m.desgasteProm.value, 2)} mm/mes; ${m.devoradoras.value.length} llantas por encima de ${fmtN(DESGASTE_ALTO, 1)} mm/mes.`)
  const r = m.resumenCausal.value
  if (r.desgaste + r.dano) desgaste.push(`De los cambios inmediatos, ${r.desgaste} son por desgaste natural y ${r.dano} por daño en la operación${r.dano > r.desgaste ? ' — se pierde más por malas condiciones de operación que por uso' : ''}.`)
  const mejor = m.porMarca.value.filter(b => b.desgaste !== null && b.nDesgaste >= 5).sort((a, b) => (a.desgaste as number) - (b.desgaste as number))[0]
  if (mejor) desgaste.push(`La marca con menor desgaste (al menos 5 llantas medidas) es <strong>${mejor.marca}</strong> con ${fmtN(mejor.desgaste as number, 2)} mm/mes.`)
  const irregular = m.patrones.value.filter(p => p.n).sort((a, b) => b.n - a.n)[0]
  if (irregular) desgaste.push(`El patrón irregular más frecuente es «${irregular.patron.toLowerCase()}» (${irregular.n} llantas): ${irregular.accion.toLowerCase()}.`)
  const req = m.requerimientos.value.filas[0]
  logistica.push(req ? `Almacén debe despachar ${m.requerimientos.value.total} llantas; la medida más pedida es <strong>${req.dimension}</strong> (${req.total}).` : 'No hay requerimientos inmediatos para el almacén.')
  logistica.push(`${m.reencauche.value.length} llantas son candidatas a reencauche en 30-60 días.`)
  if (m.brecha.value.falsas.length) logistica.push(`${m.brecha.value.falsas.length} cambios ya se hicieron (falsas alarmas): sacarlos de la lista de compras.`)
  if (f.otN) logistica.push(`${f.otN} OT de llantas en el período por ${cop(f.otCosto)}; el principal proveedor es ${m.proveedores.value[0]?.proveedor ?? '—'}.`)
  if (ra.value.urgencia) tareas.push(`Prioridad 0 (urgencia absoluta): inmovilizar y cambiar ${ra.value.urgencia} llantas de las posiciones 1 a 4 en <strong>${ra.value.placasUrgencia.join(', ')}</strong>.`)
  if (ra.value.rotaciones) tareas.push(`Rotar ${ra.value.rotaciones} llantas de P1-P2 al eje de tracción (cascada de posiciones).`)
  if (ra.value.bloqueos) tareas.push(`${ra.value.bloqueos} llantas reencauchadas o reparadas están en posiciones 1 a 4: retirarlas.`)
  tareas.push(pl.alertas ? `Planes de acción: ${pl.atendidas} de ${pl.alertas} alertas (${pctTxt(pl.pct)}) ya tienen OT de llantas cerrada.` : 'Sin alertas abiertas en la última inspección.')
  if (urgentes.value.length) tareas.push(`Abrir OT de inmediato para: <strong>${urgentes.value.map(p => p.placa).join(', ')}</strong>.`)
  const vencidas = m.inspeccionadas.value.filter(l => (l.dotAnios ?? 0) > DOT_ANIOS).length
  if (vencidas) tareas.push(`${vencidas} llantas tienen la carcasa vencida (DOT de más de ${DOT_ANIOS} años): riesgo de estallido.`)
  if (avisos.value.length) {
    datos.push(`${avisos.value.length} ${avisos.value.length === 1 ? 'hallazgo' : 'hallazgos'} de calidad del dato para depurar la próxima semana.`)
    datos.push(...avisos.value.filter(a => a.nivel === 'alto').map(a => `Revisar: ${a.titulo.toLowerCase()}.`))
  } else datos.push('Sin hallazgos: los datos del período están completos.')
  return [
    { titulo: 'Estado de la flota', items: flota },
    { titulo: 'Desgaste y operación', items: desgaste.length ? desgaste : ['Sin mediciones anteriores para calcular el desgaste.'] },
    { titulo: 'Logística y compras', items: logistica },
    { titulo: 'Cronología y vida útil', items: cronoConcl.value },
    { titulo: 'Tareas pendientes', items: tareas },
    { titulo: 'Calidad del dato', items: datos },
  ]
})

// ---------------------------------------------------------------- PDF
const paperRef = ref<HTMLElement | null>(null)
const generandoPdf = ref(false)
async function pdf() {
  if (!paperRef.value || generandoPdf.value) return
  generandoPdf.value = true
  try {
    await descargarInformePdf(paperRef.value, `Informe_Llantas_Concretos_${corteIso.value || 'corte'}.pdf`)
  } catch (e) {
    console.error('[informe-llantas] Error generando PDF:', e)
  } finally {
    generandoPdf.value = false
  }
}
</script>

<style scoped src="../concretos/tabs/informe.css"></style>
<style scoped>
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.txt-largo { white-space: normal; min-width: 180px; }
.nowrap { white-space: nowrap; }
.fotos-celda { display: flex; gap: 4px; }
.fotos-celda :deep(.foto-llanta) { width: 40px; height: 40px; }
.ficha-crono { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11px; color: var(--text-secondary); align-items: center; }
.ficha-crono-tit { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: .4px; }
.ficha-crono-ev { display: inline-flex; align-items: center; gap: 5px; }
.ficha-crono-ev i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.ficha-crono-ev b { color: var(--text-primary); font-weight: 600; }
/* Fichas de intervención por placa */
.ficha { border: 1px solid var(--card-border); border-left: 4px solid #a90707; border-radius: 4px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; break-inside: avoid; }
.ficha-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12px; }
.ficha-placa { font-size: 14px; color: var(--navy); letter-spacing: .3px; }
.ficha-sem { display: flex; gap: 6px; flex-wrap: wrap; }
.ficha-barra { display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: #eef1f4; }
.ficha-barra i { display: block; height: 100%; }
.ficha-perfil { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 11.5px; color: var(--text-secondary); }
.ficha-perfil b { color: var(--text-primary); }
.ficha-controles { font-size: 11px; color: #b8860b; }
.ficha-plan li { font-size: 11.5px; padding: 3px 0 3px 15px; }
.ficha-plan li::before { top: 2px; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .ficha { border-color: var(--card-border); border-left-color: #f87171; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .ficha-barra { background: rgba(255,255,255,.08); }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .ficha-controles { color: #fcd34d; }
@media (max-width: 640px) {
  .txt-largo { min-width: 160px; }
}
</style>
