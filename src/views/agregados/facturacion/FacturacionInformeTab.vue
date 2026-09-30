<template>
  <div class="informe-tab">
    <!-- Barra de control: rango del informe (el mismo filtro de fechas de Facturación, en la URL) + PDF -->
    <div class="informe-control-bar">
      <div class="icb-info">
        <span class="icb-tag">Informe comercial · Novasoft</span>
        <span class="icb-title">Ventas de Agregados — {{ PLANTA }} · {{ rangoTitulo }}</span>
      </div>
      <div class="icb-actions">
        <div class="icb-presets" role="group" aria-label="Rango rápido">
          <button v-for="p in PRESETS" :key="p.id" type="button" class="icb-preset" :class="{ active: presetActivo === p.id }" @click="aplicarPreset(p.id)">{{ p.label }}</button>
        </div>
        <label class="icb-corte">Desde <input type="date" :value="R.desde" :min="primeraFecha" :max="R.hasta" @change="e => cambiarDesde((e.target as HTMLInputElement).value)" /></label>
        <label class="icb-corte">Hasta <input type="date" :value="R.hasta" :min="R.desde" :max="ultimaFecha" @change="e => cambiarHasta((e.target as HTMLInputElement).value)" /></label>
        <button class="tb-btn primary" :disabled="!hayDatos || generando" @click="pdf">
          <svg v-if="!generando" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ generando ? 'Generando PDF…' : 'Descargar PDF' }}
        </button>
      </div>
    </div>

    <div v-if="!hayDatos" class="report-nota">No hay ventas en el rango seleccionado.</div>

    <div v-else ref="paperRef" class="report-paper">
      <!-- ============================================== PÁGINA 1 -->
      <div class="report-page">
        <header class="report-header">
          <div class="report-header-brand">
            <img src="/Logos/logo-azul-informe.png" alt="Gravicon" class="report-logo" loading="eager" />
            <div class="report-header-text">
              <h2>Comercial Agregados Gravicon</h2>
              <span>GRAVAS Y CONCRETOS S.A. · Agregados {{ PLANTA }}</span>
            </div>
          </div>
          <div class="report-header-meta">
            <div class="meta-item"><span>Corte:</span> <strong>{{ CORTE_LBL }}</strong></div>
            <div class="meta-item"><span>Código:</span> <strong>{{ codigo }}</strong></div>
            <div class="meta-item page-counter"><span>Pág. 1 de 4</span></div>
          </div>
        </header>

        <div class="report-title-section">
          <h1>Informe Comercial de Ventas de Agregados</h1>
          <p class="report-intro">
            Ventas de agregados de la planta <strong>{{ PLANTA }}</strong> (sucursal {{ PLANTA }} Agregados). Primero el
            <strong>despacho del día {{ flbl(hoy, true) }}</strong>, luego el <strong>acumulado {{ esMes ? `del mes (1 al ${cd} de ${MES_LBL})` : `del período (${RANGO_LBL})` }}</strong> por día,
            familia de material, material y cliente, y al final {{ proyeccion ? 'la proyección de cierre, ' : '' }}el control de calidad del dato y las conclusiones.
            Las cantidades van en toneladas: lo registrado en m³ se convierte con el factor de cada material y las toneladas despachadas
            incluyen los traslados de inventario; la venta en pesos solo cuenta lo vendido.
            Fuente: facturación Novasoft (<strong>{{ archivo.nombre }}</strong>, sucursal {{ sucursal }}).
          </p>
        </div>

        <!-- Primero los totales: facturación total y sin flete (Holcim), donaciones ni traslados -->
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>{{ esMes ? `Facturación del mes — ${MES_LBL} (1 al ${cd})` : `Facturación del período — ${RANGO_LBL}` }}</h3>
          <div class="kpi-row compact-kpi totales"><KpiCard v-for="k in kpisTotales" :key="k.label" v-bind="k" /></div>
        </div>

        <div class="report-section-block">
          <div class="zoho-analysis-box">
            <div class="zoho-analysis-label">Análisis Operativo Directivo</div>
            <div class="zoho-analysis-text" v-html="analisis"></div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Despacho del día — {{ flbl(hoy, true) }}</h3>
          <p class="section-note">Datos cargados hasta la generación del reporte; si el día no ha terminado, las cifras pueden aumentar. {{ NOTA_DT }}</p>
          <div class="kpi-row compact-kpi"><KpiCard v-for="k in kpisDia" :key="k.label" v-bind="k" /></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Toneladas por producto — {{ flbl(hoy, true) }}</h3>
          <p class="section-note">{{ NOTA_TON }}</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Registrado en</th><th class="r">Cantidad registrada</th><th class="r">Factor</th><th class="r">t vendidas</th><th class="r">t traslados</th><th class="r">t despachadas</th></tr></thead>
              <tbody>
                <tr v-for="r in tonHoy.filas" :key="r.clave">
                  <td><span class="kpi-dot tdot" :style="{ background: COL[r.fam] }"></span><span class="bold">{{ titulo(r.prod) }}</span></td><td>{{ r.u }}</td>
                  <td class="r">{{ r.reg ? `${num(r.reg)} ${r.u}` : '—' }}</td><td class="r">{{ r.u === 'm³' ? `× ${num(r.factor, 2)}` : '—' }}</td>
                  <td class="r">{{ r.vend ? num(r.vend) : '—' }}</td><td class="r">{{ r.tr ? num(r.tr) : '—' }}</td><td class="r bold">{{ num(r.vend + r.tr) }}</td>
                </tr>
                <tr class="table-total-row"><td class="bold" colspan="4">TOTAL {{ flbl(hoy) }}</td><td class="r bold">{{ num(tonHoy.tv) }}</td><td class="r bold">{{ num(tonHoy.tt) }}</td><td class="r bold">{{ num(tonHoy.tv + tonHoy.tt) }}</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>{{ esMes ? `Indicadores del mes — ${MES_LBL} (1 al ${cd})` : `Indicadores del período — ${RANGO_LBL}` }}</h3>
          <!-- KPIs por grupo (mismas tarjetas, ordenadas): totales, venta, despacho y clientes, donaciones y traslados -->
          <p class="kpi-grupo">Venta</p>
          <div class="kpi-row compact-kpi"><KpiCard v-for="k in gruposMes.venta" :key="k.label" v-bind="k" /></div>
          <p class="kpi-grupo">Despacho y clientes</p>
          <div class="kpi-row compact-kpi"><KpiCard v-for="k in gruposMes.despacho" :key="k.label" v-bind="k" /></div>
          <p class="kpi-grupo">Donaciones y traslados</p>
          <div class="kpi-row compact-kpi"><KpiCard v-for="k in gruposMes.donTras" :key="k.label" v-bind="k" /></div>
          <div v-if="vsProm < 0" class="report-nota alerta"><strong>Día por debajo del promedio:</strong> el {{ flbl(hoy) }} se vendieron {{ cop(H.venta) }}, {{ pct(Math.abs(vsProm)) }} menos que el promedio diario {{ delPer }} ({{ cop(ritmo) }}). Si el día no ha terminado, la cifra puede aumentar.</div>
          <div v-else class="report-nota"><strong>Día por encima del promedio:</strong> el {{ flbl(hoy) }} se vendieron {{ cop(H.venta) }}, {{ pct(vsProm) }} más que el promedio diario {{ delPer }} ({{ cop(ritmo) }}).<template v-if="proyeccion"> Al ritmo actual el mes cerraría en {{ cop(proyeccion.total) }}.</template></div>
        </div>

        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados {{ PLANTA }} — Gravicon</span><span>Documento Oficial · Generado {{ GENERADO }}<span class="fp-num"> | Página 1 de 4</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 2 -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Venta diaria por familia de material — {{ MES_LBL }}</h3>
          <VChart class="echart" :option="optDiario" autoresize style="height: 340px" />
        </div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Detalle de despacho por día — {{ MES_LBL }}</h3>
          <p class="section-note">Venta del día en verde cuando supera el promedio {{ delPer }} ({{ cop(ritmo) }}) y en rojo cuando queda por debajo.<template v-if="famOtros.length"> «Otros» agrupa: {{ famOtros.join(', ') }}.</template></p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Día</th><th v-for="c in colsFam" :key="c" class="r">{{ c }}</th><th class="r">Venta del día</th><th class="r">{{ hayTr ? 't vendidas' : 'Toneladas' }}</th><template v-if="hayTr"><th class="r">t traslados</th><th class="r">t despachadas</th></template><th class="r">Remisiones</th><th class="r">Clientes</th><th class="r">Venta acumulada</th></tr></thead>
              <tbody>
                <tr v-for="d in diario" :key="d.fecha" :class="{ hoy: d.fecha === hoy }">
                  <td class="bold accent-text nowrap">{{ flbl(d.fecha) }}</td>
                  <td v-for="c in colsFam" :key="c" class="r">{{ d.cols[c] ? cop(d.cols[c]) : '—' }}</td>
                  <td class="r bold" :class="d.venta >= ritmo ? 'green' : 'red'">{{ cop(d.venta) }}</td>
                  <td class="r">{{ num(d.t) }}</td>
                  <template v-if="hayTr"><td class="r">{{ d.tr ? num(d.tr) : '—' }}</td><td class="r bold">{{ num(d.t + d.tr) }}</td></template>
                  <td class="r">{{ d.rem }}</td><td class="r">{{ d.clientes }}</td><td class="r">{{ cop(d.acum) }}</td>
                </tr>
                <tr class="table-total-row">
                  <td class="bold">{{ esMes ? 'TOTAL MES' : 'TOTAL PERÍODO' }}</td>
                  <td v-for="c in colsFam" :key="c" class="r">{{ cop(totalCols[c]) }}</td>
                  <td class="r bold">{{ cop(M.venta) }}</td><td class="r">{{ num(M.t) }}</td>
                  <template v-if="hayTr"><td class="r">{{ num(M.tr) }}</td><td class="r bold">{{ num(M.t + M.tr) }}</td></template>
                  <td class="r">{{ M.rem }}</td><td class="r">{{ M.clientes }}</td><td class="r">{{ cop(M.venta) }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>
        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados {{ PLANTA }} — Gravicon</span><span>Documento Oficial · Generado {{ GENERADO }}<span class="fp-num"> | Página 2 de 4</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 3 -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Venta y remisiones por familia — {{ MES_LBL }}</h3>
          <div class="fila-charts">
            <VChart class="echart" :option="optFam" autoresize style="flex: 1.9; height: 280px" />
            <VChart class="echart" :option="optDona" autoresize style="flex: 0.9; height: 300px" />
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Matriz comercial por familia — {{ MES_LBL }}</h3>
          <p class="section-note">Precio prom.: venta ÷ toneladas.<template v-if="proyeccion"> Cierre est.: lo vendido + promedio de lunes a sábado por los días hábiles que faltan{{ proyeccion.faltanDom ? ' + promedio de domingo por los domingos que faltan.' : '.' }}</template></p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Familia</th><th class="r">Cantidad</th><th class="r">Venta</th><th class="r">Part.</th><th class="r">Remisiones</th><th class="r">Clientes</th><th class="r">Precio prom. /t</th><th class="r">Venta {{ flbl(hoy) }}</th><th v-if="proyeccion" class="r">Cierre est.</th></tr></thead>
              <tbody>
                <tr v-for="f in famsPorVenta" :key="f">
                  <td><span class="kpi-dot tdot" :style="{ background: COL[f] }"></span><span class="bold accent-text">{{ f }}</span></td>
                  <td class="r">{{ mt[f] ? `${num(mt[f], 0)} t` : '—' }}</td><td class="r bold">{{ cop(mv[f]) }}</td><td class="r">{{ pct(mv[f] / M.venta * 100) }}</td>
                  <td class="r">{{ num(mr[f], 0) }}</td><td class="r">{{ cliFam[f]?.size ?? 0 }}</td><td class="r">{{ precioFam(f) ? `${cop(precioFam(f)!)}/t` : '—' }}</td>
                  <td class="r">{{ hv[f] ? cop(hv[f]) : '—' }}</td><td v-if="proyeccion" class="r">{{ cop(proyeccion.fam[f] ?? 0) }}</td>
                </tr>
                <tr class="table-total-row">
                  <td class="bold">TOTAL {{ PLANTA.toUpperCase() }}</td><td class="r">{{ num(M.t, 0) }} t</td><td class="r bold">{{ cop(M.venta) }}</td><td class="r">100%</td>
                  <td class="r">{{ num(M.rem, 0) }}</td><td class="r">{{ M.clientes }}</td><td class="r">—</td><td class="r">{{ cop(H.venta) }}</td><td v-if="proyeccion" class="r">{{ cop(proyeccion.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Ventas por material — {{ MES_LBL }}</h3>
          <p class="section-note">Precios por tonelada. Rango en rojo cuando el precio más alto duplica o más al más bajo.</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th class="r">Líneas</th><th class="r">Cantidad (t)</th><th class="r">Venta</th><th class="r">Part.</th><th class="r">Precio prom. /t</th><th class="r">Rango de precio /t</th></tr></thead>
              <tbody>
                <tr v-for="m in materiales" :key="m.prod">
                  <td><span class="kpi-dot tdot" :style="{ background: COL[m.fam] }"></span><span class="bold">{{ titulo(m.prod) }}</span></td>
                  <td class="r">{{ m.lineas }}</td><td class="r bold">{{ m.und === 'servicio' ? 'servicio' : `${num(m.cant)} t` }}</td>
                  <td class="r bold">{{ cop(m.venta) }}</td><td class="r">{{ pct(m.venta / M.venta * 100) }}</td>
                  <td class="r">{{ promTxt(m) }}</td><td class="r" :class="{ red: disperso(m) }">{{ rangoTxt(m) }}</td>
                </tr>
                <tr class="table-total-row"><td class="bold">TOTAL</td><td class="r">{{ M.lineas }}</td><td class="r">—</td><td class="r bold">{{ cop(M.venta) }}</td><td class="r">100%</td><td class="r">—</td><td class="r">—</td></tr>
              </tbody>
            </table>
          </div></div>
          <VChart class="echart" :option="optMat" autoresize style="height: 260px" />
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Toneladas por producto — {{ esMes ? `${MES_LBL} (1 al ${cd})` : RANGO_LBL }}</h3>
          <p class="section-note">{{ NOTA_TON }}</p>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Registrado en</th><th class="r">Cantidad registrada</th><th class="r">Factor</th><th class="r">t vendidas</th><th class="r">t traslados</th><th class="r">t despachadas</th></tr></thead>
              <tbody>
                <tr v-for="r in tonPer.filas" :key="r.clave">
                  <td><span class="kpi-dot tdot" :style="{ background: COL[r.fam] }"></span><span class="bold">{{ titulo(r.prod) }}</span></td><td>{{ r.u }}</td>
                  <td class="r">{{ r.reg ? `${num(r.reg)} ${r.u}` : '—' }}</td><td class="r">{{ r.u === 'm³' ? `× ${num(r.factor, 2)}` : '—' }}</td>
                  <td class="r">{{ r.vend ? num(r.vend) : '—' }}</td><td class="r">{{ r.tr ? num(r.tr) : '—' }}</td><td class="r bold">{{ num(r.vend + r.tr) }}</td>
                </tr>
                <tr class="table-total-row"><td class="bold" colspan="4">TOTAL {{ esMes ? MES_LBL.toUpperCase() : 'DEL PERÍODO' }}</td><td class="r bold">{{ num(tonPer.tv) }}</td><td class="r bold">{{ num(tonPer.tt) }}</td><td class="r bold">{{ num(tonPer.tv + tonPer.tt) }}</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Clientes — {{ MES_LBL }} (top {{ TOP }})</h3>
          <div class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th class="idx">#</th><th>Cliente</th><th class="r">Remisiones</th><th class="r">Toneladas</th><th class="r">Venta</th><th class="r">Part.</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in clientes.slice(0, TOP)" :key="c.clave">
                  <td class="idx">{{ i + 1 }}</td>
                  <td><span class="bold">{{ c.nombre }}</span><br /><span class="sub">NIT/CC {{ c.clave }} · principal: {{ c.principal }}</span></td>
                  <td class="r">{{ c.docs }}</td><td class="r">{{ c.t ? num(c.t) : '—' }}</td><td class="r bold">{{ cop(c.venta) }}</td><td class="r">{{ pct(c.venta / M.venta * 100) }}</td>
                </tr>
                <tr v-if="clientes.length > TOP">
                  <td class="idx">—</td><td class="muted"><em>Otros {{ clientes.length - TOP }} clientes</em></td>
                  <td class="r">{{ restoCli.docs }}</td><td class="r">{{ num(restoCli.t) }}</td><td class="r">{{ cop(restoCli.venta) }}</td><td class="r">{{ pct(restoCli.venta / M.venta * 100) }}</td>
                </tr>
                <tr class="table-total-row"><td></td><td class="bold">TOTAL · {{ M.clientes }} CLIENTES</td><td class="r">{{ M.rem }}</td><td class="r">{{ num(M.t) }}</td><td class="r bold">{{ cop(M.venta) }}</td><td class="r">100%</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <div class="charts-grid cols-2 align-start">
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Rango de precios por material — {{ MES_LBL }}</h3>
            <div class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th>Material (precio por t)</th><th class="r">Mínimo</th><th class="r">Promedio</th><th class="r">Máximo</th><th class="r">Máx ÷ mín</th></tr></thead>
                <tbody>
                  <tr v-for="r in rangoPrecios" :key="r.prod + r.k">
                    <td class="bold accent-text">{{ titulo(r.prod) }}</td><td class="r">{{ cop(r.min) }}</td><td class="r bold">{{ cop(r.prom) }}</td><td class="r">{{ cop(r.max) }}</td>
                    <td class="r"><span class="pill" :class="r.disp >= 2 ? 'p-rojo' : r.disp >= 1.3 ? 'p-ambar' : 'p-verde'">×{{ num(r.disp, 1) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div></div>
          </div>
          <div class="report-section-block">
            <h3 class="report-block-title"><span class="title-bar"></span>Materiales con mayor venta — {{ MES_LBL }}</h3>
            <div class="data-card"><div class="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Material</th><th class="r">Cantidad</th><th class="r">Part. venta</th></tr></thead>
                <tbody>
                  <tr v-for="(m, i) in materiales.slice(0, 8)" :key="m.prod">
                    <td class="idx">{{ i + 1 }}</td><td class="bold accent-text">{{ titulo(m.prod) }}</td>
                    <td class="r bold">{{ m.und === 'servicio' ? 'servicio' : `${num(m.cant)} t` }}</td><td class="r">{{ pct(m.venta / M.venta * 100) }}</td>
                  </tr>
                </tbody>
              </table>
            </div></div>
          </div>
        </div>
        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados {{ PLANTA }} — Gravicon</span><span>Documento Oficial · Generado {{ GENERADO }}<span class="fp-num"> | Página 3 de 4</span></span></footer>
      </div>

      <!-- ============================================== PÁGINA 4 -->
      <div class="report-page">
        <div class="report-salto-superior"></div>
        <div v-if="proyeccion" class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Venta acumulada del mes y proyección de cierre — {{ MES_LBL }}</h3>
          <p class="section-note">Línea continua: venta acumulada real al {{ flbl(hoy) }}. Línea punteada: proyección hasta fin de mes con el promedio de lunes a sábado{{ proyeccion.faltanDom ? ' y el de domingo.' : '.' }}</p>
          <VChart class="echart" :option="optAcum" autoresize style="height: 320px" />
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Donaciones por material — {{ MES_LBL }}</h3>
          <p class="section-note">El total de documentos cuenta cada donación una vez aunque tenga varios materiales.</p>
          <div v-if="don.length" class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Familia</th><th class="r">Documentos</th><th class="r">Toneladas</th><th class="r">Part.</th><th class="r">Valor</th></tr></thead>
              <tbody>
                <tr v-for="r in porProducto(don)" :key="r.prod"><td class="bold accent-text">{{ titulo(r.prod) }}</td><td>{{ r.fam }}</td><td class="r">{{ r.docs }}</td><td class="r bold">{{ num(r.t) }}</td><td class="r">{{ tDe(don) ? pct(r.t / tDe(don) * 100) : '—' }}</td><td class="r">{{ cop(r.valor) }}</td></tr>
                <tr class="table-total-row"><td colspan="2">TOTAL DONACIONES</td><td class="r">{{ docsDe(don) }}</td><td class="r">{{ num(tDe(don)) }}</td><td class="r">100%</td><td class="r">{{ cop(sumTotal(don)) }}</td></tr>
              </tbody>
            </table>
          </div></div>
          <div v-else class="report-nota">No hay donaciones en {{ esMes ? 'el mes' : 'el período' }}.</div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Traslados de inventario por material — {{ MES_LBL }}</h3>
          <p class="section-note">Subtipo 003 de Novasoft: sin valor ni cliente. No suman a la venta, pero sí a las toneladas despachadas del día y {{ esMes ? 'del mes' : 'del período' }}.</p>
          <div v-if="tras.length" class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>Material</th><th>Familia</th><th class="r">Documentos</th><th class="r">Toneladas</th><th class="r">Part.</th><th class="r">Último</th></tr></thead>
              <tbody>
                <tr v-for="r in porProducto(tras)" :key="r.prod"><td class="bold accent-text">{{ titulo(r.prod) }}</td><td>{{ r.fam }}</td><td class="r">{{ r.docs }}</td><td class="r bold">{{ num(r.t) }}</td><td class="r">{{ tDe(tras) ? pct(r.t / tDe(tras) * 100) : '—' }}</td><td class="r">{{ flbl(r.ult) }}</td></tr>
                <tr class="table-total-row"><td colspan="2">TOTAL TRASLADOS</td><td class="r">{{ docsDe(tras) }}</td><td class="r">{{ num(tDe(tras)) }}</td><td class="r">100%</td><td></td></tr>
              </tbody>
            </table>
          </div></div>
          <div v-else class="report-nota">No hay traslados de inventario en {{ esMes ? 'el mes' : 'el período' }}.</div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Donaciones por beneficiario — {{ MES_LBL }}</h3>
          <div v-if="don.length" class="data-card"><div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Beneficiario</th><th>Material</th><th class="r">Documentos</th><th class="r">Toneladas</th><th class="r">Valor</th></tr></thead>
              <tbody>
                <tr v-for="(b, i) in beneficiarios" :key="b.nombre"><td class="idx">{{ i + 1 }}</td><td class="bold">{{ titulo(b.nombre) }}</td><td>{{ b.mat }}</td><td class="r">{{ b.docs }}</td><td class="r bold">{{ num(b.t) }}</td><td class="r">{{ cop(b.valor) }}</td></tr>
                <tr class="table-total-row"><td colspan="3">TOTAL DONACIONES</td><td class="r">{{ docsDe(don) }}</td><td class="r">{{ num(tDe(don)) }}</td><td class="r">{{ cop(sumTotal(don)) }}</td></tr>
              </tbody>
            </table>
          </div></div>
          <div v-else class="report-nota">No hay donaciones en {{ esMes ? 'el mes' : 'el período' }}.</div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Control de calidad del dato — {{ MES_LBL }}</h3>
          <p class="section-note">{{ dq.length }} hallazgos ordenados por prioridad. Cada uno trae el detalle para corregirlo en el sistema.</p>
          <div class="dq-grid">
            <div v-for="c in dq" :key="c.titulo" class="dq" :class="`dq-${c.nivel}`">
              <div class="dq-head"><span class="pill" :class="c.nivel === 'alto' ? 'p-rojo' : c.nivel === 'medio' ? 'p-ambar' : 'p-gris'">{{ c.nivel === 'alto' ? 'Prioridad alta' : c.nivel === 'medio' ? 'Revisar' : 'Informativo' }}</span><b>{{ c.titulo }}</b></div>
              <p class="dq-txt" v-html="c.texto"></p>
              <div v-if="c.tabla" class="data-card"><div class="table-wrap">
                <table>
                  <thead><tr><th v-for="(h, i) in c.tabla.cols" :key="h" :class="{ r: i > 0 && c.tabla.der !== false }">{{ h }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(f, j) in c.tabla.filas" :key="j" :class="{ 'table-total-row': f.total }">
                      <td v-for="(v, i) in f.celdas" :key="i" :class="[i === 0 ? 'bold accent-text' : (c.tabla.mono === i ? 'mono' : 'r'), f.clases?.[i]]">{{ v }}</td>
                    </tr>
                  </tbody>
                </table>
              </div></div>
            </div>
            <div v-if="!dq.length" class="report-nota">No se encontraron datos a revisar.</div>
          </div>
        </div>

        <div class="report-section-block">
          <h3 class="report-block-title"><span class="title-bar"></span>Conclusiones y resumen ejecutivo — {{ MES_LBL }}</h3>
          <div class="data-card" style="padding: 10px 14px">
            <template v-for="(g, i) in conclusiones" :key="g.titulo">
              <div class="concl-head" :style="i ? 'margin-top: 10px' : ''">{{ g.titulo }}</div>
              <ul class="res"><li v-for="(x, j) in g.items" :key="j">{{ x }}</li></ul>
            </template>
          </div>
        </div>

        <footer class="report-footer"><span>Informe Comercial de Ventas de Agregados {{ PLANTA }} — Gravicon</span><span>Documento Oficial · Generado {{ GENERADO }}<span class="fp-num"> | Página 4 de 4</span></span></footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * FacturacionInformeTab.vue — Informe Comercial de Ventas de Agregados (/:planta/facturacion/informe?desde=&hasta=).
 *
 * Réplica del informe que genera informes/generador/generar_agregados.py (mismos textos, secciones, tarjetas,
 * colores de familia, gráficas y reglas), alimentado con la facturación Novasoft. Con el rango por defecto
 * («mes a la fecha») sale igual que el del generador; con otro rango dice «período» y omite la proyección de cierre.
 * El rango es el mismo filtro de fechas de Facturación. Descarga en PDF continuo de 297 mm (hoja blanca).
 */
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkPointComponent } from 'echarts/components'
import KpiCard from '../../../components/dashboard/KpiCard.vue'
import { useQueryDate } from '../../../composables/useQueryState'
import { MESES, FAMILIAS, totalesFacturacion } from '../../../composables/useFacturacion'
import { descargarInformePdf } from '../../../utils/pdfInforme'
import type { Familia, LineaFacturacion } from '../../../types/facturacion'

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkPointComponent])

const props = defineProps<{
  lineas: LineaFacturacion[]
  /** Todas las líneas con los demás filtros, sin el de fechas: para los atajos de rango */
  lineasSinFecha?: LineaFacturacion[]
  planta: string
  plantaId: 'cuncia' | 'acacias'
  sucursal: string
  archivo: { nombre: string; modificado: string | null }
  subtipos: Record<string, string>
}>()

// ── Formatos (iguales al generador: redondeo half-up, miles con punto) ──
function num(v: number, d = 1): string {
  const f = 10 ** d
  const r = Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9) / f
  return r.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })
}
const cop = (v: number) => '$ ' + num(v, 0)
const pct = (v: number, d = 1, signo = false) => (signo && v > 0 ? '+' : '') + num(v, d) + '%'
const varTxt = (a: number, b: number) => (b ? pct((a / b - 1) * 100, 1, true) : '—')
const colorVar = (v: number) => (v >= 0 ? '#16A34A' : '#DC2626')
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase())
const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
function flbl(iso: string, largo = false): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  return `${DIAS_SEM[(d.getUTCDay() + 6) % 7]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}` + (largo ? `/${iso.slice(0, 4)}` : '')
}
const dia = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const esDom = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay() === 0
const ultimoDelMes = (iso: string) => { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) }
const fechaMedia = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1].slice(0, 3)} ${y}` }

// Familias con el color fijo del generador
const COL: Record<Familia, string> = {
  'Arena': '#172954', 'Grava': '#2563eb', 'Base y sub-base': '#93c5fd', 'Material de río': '#64748b', 'Piedra y otros': '#94a3b8', 'Fletes': '#f59e0b',
}
const TOP = 15
const PLANTA = computed(() => (props.plantaId === 'cuncia' ? 'Cuncia' : 'Acacías'))
const GENERADO = computed(() => new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''))
const NOTA_TON = 'Lo registrado en m³ se pasa a toneladas con el factor de cada material; lo registrado en toneladas queda igual. Los traslados de inventario suman a las toneladas despachadas; los fletes no (son servicio).'
const NOTA_DT = 'Donaciones y traslados de inventario no son venta: no suman a la venta. Los traslados sí suman a las toneladas despachadas (como la tabla de planta); las donaciones no.'

// ── Rango: filtro de fechas de Facturación (URL); por defecto, mes en curso hasta el último dato ──
const todas = computed(() => props.lineasSinFecha ?? props.lineas)
const fechasVenta = computed(() => [...new Set(todas.value.filter(l => l.tipo === 'venta').map(l => l.fecha))].sort())
const primeraFecha = computed(() => fechasVenta.value[0] ?? '')
const ultimaFecha = computed(() => fechasVenta.value.at(-1) ?? '')
const desdeQ = useQueryDate('desde')
const hastaQ = useQueryDate('hasta')
const R = computed(() => {
  const hasta = hastaQ.value || ultimaFecha.value
  return { desde: desdeQ.value || (hasta ? hasta.slice(0, 8) + '01' : ''), hasta }
})
function cambiarDesde(v: string) { desdeQ.value = v; if (!hastaQ.value) hastaQ.value = R.value.hasta }
function cambiarHasta(v: string) { hastaQ.value = v; if (!desdeQ.value) desdeQ.value = R.value.desde }
type PresetId = 'mes' | 'mesAnt' | '7d' | '30d' | 'todo'
const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'mes', label: 'Mes a la fecha' }, { id: 'mesAnt', label: 'Mes anterior' }, { id: '7d', label: '7 días' }, { id: '30d', label: '30 días' }, { id: 'todo', label: 'Todo' },
]
function rangoPreset(id: PresetId): [string, string] {
  const u = ultimaFecha.value
  if (id === 'mes') return [u.slice(0, 8) + '01', u]
  if (id === 'mesAnt') { const fin = dia(u.slice(0, 8) + '01', -1); return [fin.slice(0, 8) + '01', fin] }
  if (id === '7d') return [dia(u, -6), u]
  if (id === '30d') return [dia(u, -29), u]
  return [primeraFecha.value, u]
}
const presetActivo = computed(() => PRESETS.find(p => { const [a, b] = rangoPreset(p.id); return a === R.value.desde && b === R.value.hasta })?.id ?? null)
function aplicarPreset(id: PresetId) { const [a, b] = rangoPreset(id); desdeQ.value = a; hastaQ.value = b }

// ── Líneas del rango (como el generador: «mes» = ventas; traslados y donaciones aparte) ──
const enRango = computed(() => todas.value.filter(l => l.fecha >= R.value.desde && l.fecha <= R.value.hasta))
const ventas = computed(() => enRango.value.filter(l => l.tipo === 'venta'))
const tras = computed(() => enRango.value.filter(l => l.tipo === 'traslado'))
const don = computed(() => enRango.value.filter(l => l.tipo === 'donacion'))
const fechas = computed(() => [...new Set(ventas.value.map(l => l.fecha))].sort())
const hoy = computed(() => fechas.value.at(-1) ?? '')
const ayer = computed(() => (fechas.value.length > 1 ? fechas.value.at(-2)! : ''))
const hayDatos = computed(() => !!hoy.value)
const fams = computed(() => FAMILIAS.filter(f => ventas.value.some(l => l.familia === f)))
const cd = computed(() => Number(hoy.value.slice(8, 10)))

// Rango = mes (desde el día 1, dentro de un mismo mes): textos idénticos al generador
const esMes = computed(() => R.value.desde.endsWith('-01') && R.value.desde.slice(0, 7) === R.value.hasta.slice(0, 7))
const MES_LBL = computed(() => (esMes.value ? `${MESES[Number(hoy.value.slice(5, 7)) - 1]} ${hoy.value.slice(0, 4)}` : RANGO_LBL.value))
const RANGO_LBL = computed(() => (R.value.desde === R.value.hasta ? fechaMedia(R.value.desde) : `${fechaMedia(R.value.desde)} al ${fechaMedia(R.value.hasta)}`))
const rangoTitulo = computed(() => (esMes.value ? `${MES_LBL.value} (1 al ${cd.value})` : RANGO_LBL.value))
const CORTE_LBL = computed(() => { const [y, m, d] = hoy.value.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}` })
const delPer = computed(() => (esMes.value ? 'del mes' : 'del período'))
const Per = computed(() => (esMes.value ? 'Mes' : 'Período'))
const codigo = computed(() => `GRV-INF-${hoy.value.slice(0, 4)}-${PLANTA.value.toUpperCase().normalize('NFD').replace(/[^A-Z]/g, '')}-AGR-VTAS`)

// ── Agregaciones (mismas definiciones del generador) ──
const esT = (l: LineaFacturacion) => l.familia !== 'Fletes'
function resumen(ls: LineaFacturacion[]) {
  return {
    venta: ls.reduce((a, l) => a + l.total, 0), t: ls.filter(esT).reduce((a, l) => a + l.toneladas, 0),
    rem: new Set(ls.map(l => l.doc)).size, clientes: new Set(ls.map(l => l.nit || l.cliente)).size, lineas: ls.length,
  }
}
type PorFam = Record<Familia, number>
function porFam(ls: LineaFacturacion[], campo: 'venta' | 't' | 'rem'): PorFam {
  const out = Object.fromEntries(FAMILIAS.map(f => [f, 0])) as PorFam
  if (campo === 'rem') {
    const docs: Record<string, Set<string>> = {}
    for (const l of ls) (docs[l.familia] ??= new Set()).add(l.doc)
    for (const f of FAMILIAS) out[f] = docs[f]?.size ?? 0
    return out
  }
  for (const l of ls) out[l.familia] += campo === 'venta' ? l.total : esT(l) ? l.toneladas : 0
  return out
}
const tDe = (ls: LineaFacturacion[]) => ls.filter(esT).reduce((a, l) => a + l.toneladas, 0)
const docsDe = (ls: LineaFacturacion[]) => new Set(ls.map(l => l.doc)).size
const sumTotal = (ls: LineaFacturacion[]) => ls.reduce((a, l) => a + l.total, 0)

const hoyLs = computed(() => ventas.value.filter(l => l.fecha === hoy.value))
const M = computed(() => ({ ...resumen(ventas.value), tr: tDe(tras.value) }))
const H = computed(() => resumen(hoyLs.value))
const A = computed(() => resumen(ventas.value.filter(l => l.fecha === ayer.value)))
const DIAS_OP = computed(() => fechas.value.length)
const ritmo = computed(() => (DIAS_OP.value ? M.value.venta / DIAS_OP.value : 0))
const vsProm = computed(() => (ritmo.value ? (H.value.venta / ritmo.value - 1) * 100 : 0))
const vsAyer = computed(() => (A.value.venta ? (H.value.venta / A.value.venta - 1) * 100 : 0))
const mv = computed(() => porFam(ventas.value, 'venta'))
const mr = computed(() => porFam(ventas.value, 'rem'))
const mt = computed(() => porFam(ventas.value, 't'))
const hv = computed(() => porFam(hoyLs.value, 'venta'))
const promFam = computed(() => Object.fromEntries(FAMILIAS.map(f => [f, DIAS_OP.value ? mv.value[f] / DIAS_OP.value : 0])) as PorFam)
const cliFam = computed(() => { const o: Partial<Record<Familia, Set<string>>> = {}; for (const l of ventas.value) (o[l.familia] ??= new Set()).add(l.nit || l.cliente); return o })
const precioProm = (ls: LineaFacturacion[]) => { const s = ls.filter(l => esT(l) && l.toneladas > 0); const q = s.reduce((a, l) => a + l.toneladas, 0); return q ? s.reduce((a, l) => a + l.total, 0) / q : null }
const precioFam = (f: Familia) => precioProm(ventas.value.filter(l => l.familia === f))
const ventaDia = (f: string, fam?: Familia) => ventas.value.filter(l => l.fecha === f && (!fam || l.familia === fam)).reduce((a, l) => a + l.total, 0)

// Cierre estimado (solo si el rango es el mes en curso): vendido + promedio lun–sáb × hábiles que faltan + promedio dom × domingos que faltan
const proyeccion = computed(() => {
  if (!esMes.value || R.value.hasta >= ultimoDelMes(R.value.hasta) || !hoy.value) return null
  const hab = fechas.value.filter(f => !esDom(f)), dom = fechas.value.filter(esDom)
  const vendeDom = dom.length > 0
  const faltan: string[] = []
  for (let f = dia(hoy.value, 1); f <= ultimoDelMes(hoy.value); f = dia(f, 1)) faltan.push(f)
  const faltanHab = faltan.filter(f => !esDom(f)).length, faltanDom = vendeDom ? faltan.filter(esDom).length : 0
  const cierre = (fam?: Familia) => {
    const ph = hab.length ? hab.reduce((a, f) => a + ventaDia(f, fam), 0) / hab.length : 0
    const pd = dom.length ? dom.reduce((a, f) => a + ventaDia(f, fam), 0) / dom.length : 0
    return fechas.value.reduce((a, f) => a + ventaDia(f, fam), 0) + ph * faltanHab + pd * faltanDom
  }
  return { total: cierre(), fam: Object.fromEntries(fams.value.map(f => [f, cierre(f)])) as Partial<PorFam>, faltanHab, faltanDom, ph: hab.length ? hab.reduce((a, f) => a + ventaDia(f), 0) / hab.length : 0, pd: dom.length ? dom.reduce((a, f) => a + ventaDia(f), 0) / dom.length : 0, vendeDom }
})

// ── Tarjetas: desglose por familia (punto + etiqueta + valor), igual que detalle() del generador ──
function detalle(valores: Partial<Record<Familia, string>>, extra?: Partial<Record<Familia, string>>, solo?: Familia[]) {
  return (solo ?? fams.value).map(f => `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${COL[f]}'></span><span class='kpi-det-lbl'>${f}</span> <strong>${valores[f] ?? ''}</strong>` +
    (extra ? ` <span class='kpi-det-pct'>${extra[f] ?? ''}</span>` : '') + '</div>').join('')
}
const mapFam = (fn: (f: Familia) => string) => Object.fromEntries(fams.value.map(f => [f, fn(f)])) as Partial<Record<Familia, string>>
const famsT = computed(() => fams.value.filter(f => f !== 'Fletes' && mt.value[f] > 0))
function famsDe(ls: LineaFacturacion[]) { return FAMILIAS.filter(f => ls.some(l => l.familia === f)) }

function kpisDonTras(d: LineaFacturacion[], t: LineaFacturacion[], cuando: string) {
  const fd = famsDe(d), ft = famsDe(t)
  const tFam = (ls: LineaFacturacion[], fs: Familia[]) => Object.fromEntries(fs.map(f => [f, num(tDe(ls.filter(l => l.familia === f)), 1) + ' t']))
  return [
    { label: `Donaciones ${cuando}`, value: num(tDe(d), 1) + ' t', accent: '#8B5CF6', icon: 'package', meta: `${docsDe(d)} documentos`, detail: fd.length ? detalle(tFam(d, fd), undefined, fd) : undefined },
    { label: `Valor Donado ${cuando}`, value: cop(sumTotal(d)), accent: '#8B5CF6', icon: 'dollar', meta: 'no suma a la venta' },
    { label: `Beneficiarios ${cuando}`, value: String(new Set(d.map(l => l.nit || l.cliente)).size), accent: '#10B981', icon: 'users', meta: 'sin repetir' },
    { label: `Traslados ${cuando}`, value: num(tDe(t), 1) + ' t', accent: '#64748B', icon: 'truck', meta: `${docsDe(t)} documentos`, detail: ft.length ? detalle(tFam(t, ft), undefined, ft) : undefined },
  ]
}

const kpisDia = computed(() => {
  const h = H.value, hvv = hv.value, av = porFam(ventas.value.filter(l => l.fecha === ayer.value), 'venta')
  const hr = porFam(hoyLs.value, 'rem'), ht = porFam(hoyLs.value, 't')
  const trHoy = tras.value.filter(l => l.fecha === hoy.value), trT = tDe(trHoy), htr = porFam(trHoy, 't')
  const hc: Partial<Record<Familia, Set<string>>> = {}
  for (const l of hoyLs.value) (hc[l.familia] ??= new Set()).add(l.nit || l.cliente)
  return [
    { label: 'Venta del Día', value: cop(h.venta), accent: '#2563EB', icon: 'dollar', meta: `${h.rem} remisiones`,
      detail: detalle(mapFam(f => cop(hvv[f])), mapFam(f => `(${pct(h.venta ? hvv[f] / h.venta * 100 : 0)})`)) },
    { label: 'Toneladas del Día', value: num(h.t + trT) + ' t', accent: '#172954', icon: 'package',
      meta: trT ? `vendidas ${num(h.t)} t · traslados ${num(trT)} t` : 'vendidas, sin traslados',
      detail: detalle(mapFam(f => num(ht[f] + htr[f]) + ' t'), undefined, famsT.value) },
    { label: 'Remisiones del Día', value: String(h.rem), accent: '#8B5CF6', icon: 'list', meta: `${h.clientes} clientes`, detail: detalle(mapFam(f => String(hr[f]))) },
    { label: 'Clientes del Día', value: String(h.clientes), accent: '#10B981', icon: 'users', meta: 'sin repetir', detail: detalle(mapFam(f => String(hc[f]?.size ?? 0))) },
    { label: ayer.value ? `Vs. ${flbl(ayer.value)}` : 'Vs. día anterior', value: varTxt(h.venta, A.value.venta), accent: colorVar(vsAyer.value), icon: 'clock',
      meta: cop(A.value.venta), detail: detalle(mapFam(f => varTxt(hvv[f], av[f]))) },
    { label: 'Venta Promedio Diaria', value: cop(ritmo.value), accent: '#0EA5E9', icon: 'trending-up', meta: `${DIAS_OP.value} días`, detail: detalle(mapFam(f => cop(promFam.value[f]))) },
    { label: 'Vs. Promedio Diario', value: pct(vsProm.value, 1, true), accent: colorVar(vsProm.value), icon: 'target', meta: 'venta', detail: detalle(mapFam(f => varTxt(hvv[f], promFam.value[f]))) },
    { label: `Venta Acumulada ${Per.value}`, value: cop(M.value.venta), accent: '#172954', icon: 'chart-bar', meta: esMes.value ? `1 al ${cd.value}` : `${DIAS_OP.value} días`,
      detail: detalle(mapFam(f => cop(mv.value[f]))) },
    ...kpisDonTras(don.value.filter(l => l.fecha === hoy.value), tras.value.filter(l => l.fecha === hoy.value), 'del Día'),
  ]
})

// Totales del período: toneladas y valor facturado, normales y sin flete Holcim, donaciones ni traslados
const kpisTotales = computed(() => {
  const x = totalesFacturacion(enRango.value)
  const fila = (color: string, lbl: string, valor: string) => `<div class='kpi-detail-row'><span class='kpi-dot' style='background:${color}'></span><span class='kpi-det-lbl'>${lbl}</span> <strong>${valor}</strong></div>`
  return [
    // Valor: todo lo facturado y sin flete Holcim ni donaciones (los traslados no tienen valor)
    { label: 'Facturación Total', value: cop(x.valorTotal), accent: '#2563EB', icon: 'dollar', meta: 'con flete y donaciones',
      detail: fila('#2563EB', 'Venta', cop(x.venta)) + (x.fleteHolcim ? fila(COL.Fletes, 'Incluye flete', cop(x.fleteHolcim)) : '') + fila('#8B5CF6', 'Donaciones', cop(x.valorDonado)) },
    { label: 'Facturación sin Flete', value: cop(x.valorNeto), accent: '#0F766E', icon: 'check-circle', meta: 'sin flete ni donaciones',
      detail: fila(COL.Fletes, 'Sin flete Holcim', x.fleteHolcim ? '− ' + cop(x.fleteHolcim) : 'no hay') + fila('#94a3b8', 'Sin donaciones', '− ' + cop(x.valorDonado)) },
    // Toneladas: todo lo que salió y solo lo vendido (el flete no tiene toneladas)
    { label: 'Toneladas Totales', value: num(x.tTotal, 0) + ' t', accent: '#172954', icon: 'truck', meta: 'con traslados y donaciones',
      detail: fila('#2563EB', 'Vendidas', num(x.tNeta, 0) + ' t') +
        (x.tFleteHolcim ? fila(COL.Fletes, 'Flete Holcim', num(x.tFleteHolcim, 0) + ' t <span class="kpi-det-pct">(en vendidas)</span>') : '') +
        fila('#64748B', 'Traslados', num(x.tTraslados, 0) + ' t') + fila('#8B5CF6', 'Donadas', num(x.tDonadas, 1) + ' t') },
    { label: 'Toneladas Netas', value: num(x.tNeta, 0) + ' t', accent: '#0F766E', icon: 'package', meta: 'solo vendidas',
      detail: fila('#2563EB', 'Vendidas', num(x.tNeta, 0) + ' t') + fila('#94a3b8', 'Sin traslados', '− ' + num(x.tTraslados, 0) + ' t') + fila('#94a3b8', 'Sin donaciones', '− ' + num(x.tDonadas, 1) + ' t') },
  ]
})

const kpisMes = computed(() => {
  const m = M.value, p = precioProm(ventas.value)
  const cierre = proyeccion.value
  return [
    { label: `Venta del ${Per.value}`, value: cop(m.venta), accent: '#2563EB', icon: 'dollar', meta: esMes.value ? `1 al ${cd.value}` : `${DIAS_OP.value} días`, detail: detalle(mapFam(f => cop(mv.value[f]))) },
    { label: 'Toneladas Despachadas', value: num(m.t + m.tr, 0) + ' t', accent: '#172954', icon: 'package',
      meta: m.tr ? `vendidas ${num(m.t, 0)} t · traslados ${num(m.tr, 0)} t` : 'vendidas, sin traslados',
      detail: detalle(mapFam(f => num(mt.value[f] + porFam(tras.value, 't')[f], 0) + ' t'), undefined, famsT.value) },
    { label: 'Remisiones', value: num(m.rem, 0), accent: '#8B5CF6', icon: 'list', meta: `${num(m.lineas, 0)} líneas`, detail: detalle(mapFam(f => num(mr.value[f], 0))) },
    { label: 'Precio Promedio por t', value: p ? cop(p) : '—', accent: '#172954', icon: 'target', meta: 'venta ÷ t', detail: detalle(mapFam(f => { const x = precioFam(f); return x ? cop(x) : '—' })) },
    { label: 'Clientes Activos', value: String(m.clientes), accent: '#10B981', icon: 'users', meta: 'sin repetir', detail: detalle(mapFam(f => String(cliFam.value[f]?.size ?? 0))) },
    { label: 'Venta Promedio Diaria', value: cop(ritmo.value), accent: '#64748B', icon: 'activity', meta: `${DIAS_OP.value} días con venta`, detail: detalle(mapFam(f => cop(promFam.value[f]))) },
    cierre
      ? { label: 'Cierre Estimado Mes', value: cop(cierre.total), accent: '#F59E0B', icon: 'trending-up',
          meta: `faltan ${cierre.faltanHab} háb.` + (cierre.faltanDom ? ` + ${cierre.faltanDom} dom.` : ''), detail: detalle(mapFam(f => cop(cierre.fam[f] ?? 0))) }
      : { label: 'Días con Venta', value: String(DIAS_OP.value), accent: '#F59E0B', icon: 'clock', meta: `${fechaMedia(R.value.desde)} – ${fechaMedia(R.value.hasta)}` },
    { label: 'Ticket por Remisión', value: m.rem ? cop(m.venta / m.rem) : '—', accent: '#0EA5E9', icon: 'target', meta: 'venta ÷ remisiones',
      detail: detalle(mapFam(f => (mr.value[f] ? cop(mv.value[f] / mr.value[f]) : '—'))) },
    ...kpisDonTras(don.value, tras.value, `del ${Per.value}`),
  ]
})

// Orden de lectura de los KPIs del período (kpisMes tiene siempre 12, en este orden:
// 0 venta · 1 toneladas · 2 remisiones · 3 precio · 4 clientes · 5 promedio diario · 6 cierre/días con venta · 7 ticket · 8–11 donaciones y traslados)
const gruposMes = computed(() => {
  const k = kpisMes.value
  return {
    venta: [k[0], k[5], k[6], k[3]],
    despacho: [k[1], k[2], k[7], k[4]],
    donTras: k.slice(8),
  }
})

// ── Toneladas por producto: una fila por producto y unidad registrada (como la tabla de planta) ──
function tablaToneladas(v: LineaFacturacion[], t: LineaFacturacion[]) {
  const g = new Map<string, { clave: string; prod: string; u: string; reg: number; vend: number; tr: number; factor: number; fam: Familia }>()
  for (const [l, esTr] of [...v.map(l => [l, false] as const), ...t.map(l => [l, true] as const)]) {
    if (!esT(l)) continue
    const u = l.factor !== 1 ? 'm³' : 't'
    const clave = `${l.producto}|${u}`
    const o = g.get(clave) ?? { clave, prod: l.producto, u, reg: 0, vend: 0, tr: 0, factor: l.factor, fam: l.familia }
    if (esTr) o.tr += l.toneladas
    else { o.reg += l.cantidad; o.vend += l.toneladas }
    g.set(clave, o)
  }
  const filas = [...g.values()].sort((a, b) => Number(a.u !== 'm³') - Number(b.u !== 'm³') || (b.vend + b.tr) - (a.vend + a.tr))
  return { filas, tv: filas.reduce((a, o) => a + o.vend, 0), tt: filas.reduce((a, o) => a + o.tr, 0) }
}
const tonHoy = computed(() => tablaToneladas(hoyLs.value, tras.value.filter(l => l.fecha === hoy.value)))
const tonPer = computed(() => tablaToneladas(ventas.value, tras.value))

// ── Detalle diario: las 3 familias con más venta + «Otros» ──
const famTop = computed(() => [...fams.value].sort((a, b) => mv.value[b] - mv.value[a]).slice(0, 3))
const famOtros = computed(() => fams.value.filter(f => !famTop.value.includes(f)))
const colsFam = computed(() => [...famTop.value, ...(famOtros.value.length ? ['Otros'] : [])])
const colsDe = (vf: PorFam) => Object.fromEntries([...famTop.value.map(f => [f, vf[f]]), ...(famOtros.value.length ? [['Otros', famOtros.value.reduce((a, f) => a + vf[f], 0)]] : [])]) as Record<string, number>
const hayTr = computed(() => tras.value.length > 0)
const diario = computed(() => {
  let acum = 0
  return fechas.value.map(fecha => {
    const ls = ventas.value.filter(l => l.fecha === fecha), r = resumen(ls)
    acum += r.venta
    return { fecha, cols: colsDe(porFam(ls, 'venta')), venta: r.venta, t: r.t, tr: tDe(tras.value.filter(l => l.fecha === fecha)), rem: r.rem, clientes: r.clientes, acum }
  })
})
const totalCols = computed(() => colsDe(mv.value))
const famsPorVenta = computed(() => [...fams.value].sort((a, b) => mv.value[b] - mv.value[a]))

// ── Materiales (precio por t; los fletes van por servicio) ──
interface Mat { prod: string; fam: Familia; und: 't' | 'servicio'; cant: number; venta: number; lineas: number; codigos: Set<string>; pu: Record<string, number[]>; vu: Record<string, number>; qu: Record<string, number> }
const matMap = computed(() => {
  const m = new Map<string, Mat>()
  for (const l of ventas.value) {
    const o = m.get(l.producto) ?? { prod: l.producto, fam: l.familia, und: esT(l) ? 't' : 'servicio', cant: 0, venta: 0, lineas: 0, codigos: new Set(), pu: {}, vu: {}, qu: {} }
    const k = esT(l) ? 't' : 'servicio', q = esT(l) ? l.toneladas : l.cantidad
    o.cant += esT(l) ? l.toneladas : 0; o.venta += l.total; o.lineas++; o.codigos.add(l.item)
    ;(o.pu[k] ??= []).push(q ? l.total / q : 0); o.vu[k] = (o.vu[k] ?? 0) + l.total; o.qu[k] = (o.qu[k] ?? 0) + q
    m.set(l.producto, o)
  }
  return m
})
const materiales = computed(() => [...matMap.value.values()].sort((a, b) => b.venta - a.venta))
const lblU = (k: string) => (k === 'servicio' ? '' : `/${k}`)
const promTxt = (o: Mat) => Object.keys(o.pu).filter(k => o.qu[k]).map(k => `${cop(o.vu[k] / o.qu[k])}${lblU(k)}`).join(' · ')
const rangoTxt = (o: Mat) => Object.entries(o.pu).map(([k, v]) => `${cop(Math.min(...v))} – ${cop(Math.max(...v))}${lblU(k)}`).join(' · ')
const disperso = (o: Mat) => Object.values(o.pu).some(v => Math.min(...v) > 0 && Math.max(...v) / Math.min(...v) >= 2)
const rangoPrecios = computed(() => [...matMap.value.values()].flatMap(o => Object.entries(o.pu).map(([k, v]) => ({ prod: o.prod, k, n: v.length, min: Math.min(...v), max: Math.max(...v), prom: o.qu[k] ? o.vu[k] / o.qu[k] : 0 })))
  .sort((a, b) => b.n - a.n).slice(0, 8).map(r => ({ ...r, disp: r.min ? r.max / r.min : 1 })))

// ── Clientes ──
const clientes = computed(() => {
  const m = new Map<string, { clave: string; nombre: string; docs: Set<string>; t: number; venta: number; fams: Partial<PorFam> }>()
  for (const l of ventas.value) {
    const k = l.nit || l.cliente
    const o = m.get(k) ?? { clave: k, nombre: l.cliente, docs: new Set(), t: 0, venta: 0, fams: {} }
    o.docs.add(l.doc); o.venta += l.total; o.t += esT(l) ? l.toneladas : 0; o.fams[l.familia] = (o.fams[l.familia] ?? 0) + l.total
    m.set(k, o)
  }
  return [...m.values()].sort((a, b) => b.venta - a.venta).map(o => ({
    ...o, docs: o.docs.size, principal: (Object.entries(o.fams).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? '') as Familia,
  }))
})
const restoCli = computed(() => { const r = clientes.value.slice(TOP); return { docs: r.reduce((a, c) => a + c.docs, 0), t: r.reduce((a, c) => a + c.t, 0), venta: r.reduce((a, c) => a + c.venta, 0) } })

// ── Donaciones y traslados ──
function porProducto(ls: LineaFacturacion[]) {
  const m = new Map<string, { prod: string; fam: Familia; docs: Set<string>; t: number; valor: number; ult: string }>()
  for (const l of ls) {
    const o = m.get(l.producto) ?? { prod: l.producto, fam: l.familia, docs: new Set(), t: 0, valor: 0, ult: '' }
    o.docs.add(l.doc); o.t += esT(l) ? l.toneladas : 0; o.valor += l.total; o.ult = l.fecha > o.ult ? l.fecha : o.ult
    m.set(l.producto, o)
  }
  return [...m.values()].sort((a, b) => b.t - a.t).map(o => ({ ...o, docs: o.docs.size }))
}
const beneficiarios = computed(() => {
  const m = new Map<string, { nombre: string; docs: Set<string>; t: number; valor: number; mat: Set<string> }>()
  for (const l of don.value) {
    const o = m.get(l.cliente) ?? { nombre: l.cliente, docs: new Set(), t: 0, valor: 0, mat: new Set() }
    o.docs.add(l.doc); o.t += esT(l) ? l.toneladas : 0; o.valor += l.total; o.mat.add(titulo(l.producto))
    m.set(l.cliente, o)
  }
  return [...m.values()].sort((a, b) => b.t - a.t).map(o => ({ ...o, docs: o.docs.size, mat: [...o.mat].sort().join(', ') }))
})

// ── Control de calidad del dato: una tarjeta por hallazgo, con su tabla ──
interface TablaDq { cols: string[]; filas: { celdas: string[]; total?: boolean; clases?: Record<number, string> }[]; mono?: number; der?: boolean }
const nativoT = computed(() => todas.value.some(l => l.registrado === 't'))
const dq = computed(() => {
  const out: { nivel: 'alto' | 'medio' | 'info'; titulo: string; texto: string; tabla?: TablaDq }[] = []
  const v = ventas.value
  const dispersos = [...matMap.value.values()].flatMap(o => Object.entries(o.pu).filter(([, p]) => Math.min(...p) > 0 && Math.max(...p) / Math.min(...p) >= 2).map(([k, p]) => ({ o, k, p })))
    .sort((a, b) => Math.max(...b.p) / Math.min(...b.p) - Math.max(...a.p) / Math.min(...a.p))
  if (dispersos.length) out.push({ nivel: 'alto', titulo: `${dispersos.length} ${dispersos.length === 1 ? 'material' : 'materiales'} con precios muy dispares`,
    texto: 'El precio más alto duplica o más al más bajo del mismo material. <b>Acción:</b> revisar descuentos, listas de precio o errores de digitación.',
    tabla: { cols: ['Material', 'Líneas', 'Precio mínimo', 'Promedio', 'Precio máximo', 'Variación'],
      filas: dispersos.slice(0, 8).map(({ o, k, p }) => ({ celdas: [titulo(o.prod), String(p.length), cop(Math.min(...p)) + lblU(k), (o.qu[k] ? cop(o.vu[k] / o.qu[k]) : '—') + lblU(k), cop(Math.max(...p)) + lblU(k), `×${num(Math.max(...p) / Math.min(...p), 1)}`], clases: { 5: 'r bold red' } })) } })
  const varCod = [...matMap.value.values()].filter(o => o.codigos.size > 1).sort((a, b) => b.venta - a.venta)
  if (varCod.length) out.push({ nivel: 'medio', titulo: `${varCod.length} ${varCod.length === 1 ? 'material' : 'materiales'} con varios códigos de ítem`,
    texto: 'El mismo material se registra con códigos distintos (mayúsculas, espacios o unidad). En el informe se agruparon por la descripción. <b>Acción:</b> unificar el código en el sistema.',
    tabla: { cols: ['Material', 'Códigos usados', 'Líneas', 'Venta'], mono: 1, filas: varCod.map(o => ({ celdas: [titulo(o.prod), [...o.codigos].sort().join(', '), String(o.lineas), cop(o.venta)] })) } })
  const m4 = [...new Set(v.filter(l => /\bM4\b/.test(l.descripcion)).map(l => l.descripcion))].sort()
  if (m4.length) out.push({ nivel: 'medio', titulo: 'Unidad «M4» en la descripción', texto: 'Se convierte a toneladas igual que M3. <b>Acción:</b> corregir la descripción en el sistema.',
    tabla: { cols: ['Material', 'Líneas', 'Toneladas'], filas: m4.map(d => { const x = v.filter(l => l.descripcion === d); return { celdas: [titulo(d), String(x.length), num(tDe(x)) + ' t'] } }) } })
  const sinU = [...new Set(v.filter(l => l.registrado === 'sin unidad').map(l => l.producto))].sort()
  if (sinU.length) out.push({ nivel: 'medio', titulo: `${sinU.length} ${sinU.length === 1 ? 'material' : 'materiales'} sin unidad en la descripción`,
    texto: (nativoT.value ? 'Se toman como toneladas, sin conversión. ' : 'Se registran por volumen y se pasan a toneladas (× factor del material). ') + '<b>Acción:</b> agregar la unidad a la descripción en el sistema.',
    tabla: { cols: ['Material', 'Líneas', 'Toneladas'], filas: sinU.map(p => { const x = v.filter(l => l.producto === p && l.registrado === 'sin unidad'); return { celdas: [titulo(p), String(x.length), num(tDe(x)) + ' t'] } }) } })
  const conv = v.filter(l => esT(l) && l.factor !== 1)
  if (conv.length) {
    const g = new Map<string, { n: number; reg: number; t: number; f: number }>()
    for (const l of conv) { const o = g.get(l.producto) ?? { n: 0, reg: 0, t: 0, f: l.factor }; o.n++; o.reg += l.cantidad; o.t += l.toneladas; g.set(l.producto, o) }
    const filas = [...g.entries()].sort((a, b) => b[1].t - a[1].t)
    const sinFactor = [...new Set(conv.filter(l => !l.factorPropio).map(l => titulo(l.producto)))]
    out.push({ nivel: 'info', titulo: 'Líneas registradas en volumen pasadas a toneladas',
      texto: `${conv.length} líneas vienen registradas en volumen (${nativoT.value ? 'M3/M4' : 'M3/M4 o sin unidad'}) en el sistema; se pasaron a toneladas con el factor de cada material (toneladas = m³ × factor) y su precio por tonelada es el precio del documento ÷ el factor.` +
        (sinFactor.length ? ` Sin factor propio en la tabla, usan 1,55: ${sinFactor.join(', ')}.` : '') + (nativoT.value ? ' <b>Acción:</b> registrarlas en toneladas.' : ''),
      tabla: { cols: ['Material', 'Líneas', 'Registrado', 'Factor', 'Toneladas'],
        filas: [...filas.map(([p, o]) => ({ celdas: [titulo(p), String(o.n), num(o.reg) + ' m³', `× ${num(o.f, 2)}`, num(o.t) + ' t'], clases: { 3: 'r bold', 4: 'r bold' } })),
          { celdas: ['TOTAL', String(conv.length), num(filas.reduce((a, [, o]) => a + o.reg, 0)) + ' m³', '', num(filas.reduce((a, [, o]) => a + o.t, 0)) + ' t'], total: true }] } })
  }
  if (fams.value.includes('Fletes')) {
    const fl = v.filter(l => !esT(l))
    out.push({ nivel: 'info', titulo: 'Fletes incluidos en la venta',
      texto: `${cop(mv.value.Fletes)} (${pct(M.value.venta ? mv.value.Fletes / M.value.venta * 100 : 0)} de la venta) corresponden a fletes (${num(fl.reduce((a, l) => a + l.cantidad, 0))} t transportadas) y no a material; no suman en las toneladas vendidas.` })
  }
  return out
})

// ── Análisis y conclusiones (mismo texto que el generador) ──
const analisis = computed(() => {
  const m = M.value, h = H.value, c = proyeccion.value
  const famLider = [...fams.value].sort((a, b) => mv.value[b] - mv.value[a])[0]
  const matLider = materiales.value[0]
  const top5 = clientes.value.slice(0, 5), conc5 = m.venta ? top5.reduce((a, x) => a + x.venta, 0) / m.venta * 100 : 0
  const vol = m.tr ? `${num(m.t, 0)} t de material vendido y ${num(m.t + m.tr, 0)} t despachadas contando ${num(m.tr, 0)} t de traslados` : `${num(m.t, 0)} t de material despachado`
  return `Al corte del <strong>${CORTE_LBL.value}</strong> la planta <strong>${PLANTA.value}</strong> lleva una venta de <strong>${cop(m.venta)}</strong> ` +
    `en <strong>${num(m.rem, 0)} remisiones</strong> a ${m.clientes} clientes, con ${vol}. ` +
    `El día ${flbl(hoy.value)} se vendieron <strong>${cop(h.venta)}</strong> en ${h.rem} remisiones, ` +
    `<strong class='${vsProm.value >= 0 ? 'green' : 'red'}'>${pct(vsProm.value, 1, true)}</strong> frente al promedio diario de ${cop(ritmo.value)}` +
    (ayer.value ? ` y ${varTxt(h.venta, A.value.venta)} frente al ${flbl(ayer.value)}` : '') + '. ' +
    (c ? `Al ritmo actual el mes cerraría cerca de <strong>${cop(c.total)}</strong> (promedio de lunes a sábado para los ${c.faltanHab} días hábiles que faltan` + (c.faltanDom ? ` y de domingo para los ${c.faltanDom} domingos` : '') + '). ' : '') +
    (famLider ? `${famLider} aporta el ${pct(m.venta ? mv.value[famLider] / m.venta * 100 : 0)} de la venta` : '') +
    (matLider ? ` y el material con más venta es ${titulo(matLider.prod)} (${cop(matLider.venta)})` : '') + `. Los 5 clientes principales concentran el ${pct(conc5)} de la venta.`
})

const conclusiones = computed(() => {
  const m = M.value, c = proyeccion.value
  const ventaDe = (f: string) => ventaDia(f)
  const mejor = [...fechas.value].sort((a, b) => ventaDe(b) - ventaDe(a))[0], peor = [...fechas.value].sort((a, b) => ventaDe(a) - ventaDe(b))[0]
  const matLider = materiales.value[0]
  const dispersos = [...matMap.value.values()].filter(disperso).length
  const top5 = clientes.value.slice(0, 5), conc5 = m.venta ? top5.reduce((a, x) => a + x.venta, 0) / m.venta * 100 : 0
  const ritmoTxt = c
    ? `Cierre estimado del mes: ${cop(c.total)}` + (c.vendeDom ? `; los domingos venden en promedio ${cop(c.pd)} frente a ${cop(c.ph)} entre semana.` : '.')
    : `Período de ${DIAS_OP.value} días con venta, del ${fechaMedia(R.value.desde)} al ${fechaMedia(R.value.hasta)}.`
  return [
    { titulo: 'Venta y ritmo', items: [
      `Venta acumulada de ${cop(m.venta)} en ${DIAS_OP.value} días con despacho; promedio de ${cop(ritmo.value)} por día.`,
      ritmoTxt,
      `Mejor día: ${flbl(mejor)} (${cop(ventaDe(mejor))}); día más bajo: ${flbl(peor)} (${cop(ventaDe(peor))}).`,
    ] },
    { titulo: 'Materiales', items: [
      famsPorVenta.value.map(f => `${f} ${pct(m.venta ? mv.value[f] / m.venta * 100 : 0)}`).join(' · ') + ' de la venta.',
      ...(matLider ? [`${titulo(matLider.prod)} es el material con más venta: ${cop(matLider.venta)} (${matLider.und === 'servicio' ? 'servicio' : num(matLider.cant) + ' t'}).`] : []),
      ...(dispersos ? [`${dispersos} ${dispersos === 1 ? 'material tiene' : 'materiales tienen'} precios con diferencias de 2 veces o más entre la venta más barata y la más cara.`] : []),
    ] },
    { titulo: 'Clientes', items: [
      `${m.clientes} clientes compraron en ${esMes.value ? 'el mes' : 'el período'}; los 5 principales (${top5.slice(0, 3).map(x => titulo(x.nombre)).join(', ')}…) concentran el ${pct(conc5)} de la venta.`,
      `Ticket promedio por remisión: ${m.rem ? cop(m.venta / m.rem) : '—'}.`,
    ] },
  ]
})

// ── Gráficas (mismas del generador; colores para papel blanco) ──
const FONT = "'Lato','Segoe UI',Arial,sans-serif", CP = '#172954'
const mill = (v: number) => '$ ' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M'
const base = { animation: false, textStyle: { fontFamily: FONT } }
const leg = { top: 0, right: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 8 }
const ejeY = (f: (v: number) => string) => ({ type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#e0d8ec', type: 'dashed' } }, axisLabel: { fontSize: 9, formatter: f } })

// 1. Venta diaria por familia + total + promedio (como en el generador)
const optDiario = computed(() => {
  const f = fechas.value, fs = fams.value
  const tot = f.map(d => ventaDia(d)), promLbl = `Promedio ${mill(ritmo.value)}/día`
  const s: any[] = fs.map((fam, i) => ({ name: fam, type: 'bar', stack: 't', barMaxWidth: 28, data: f.map(d => Math.round(ventaDia(d, fam))),
    itemStyle: { color: COL[fam], borderRadius: i === fs.length - 1 ? [2, 2, 0, 0] : 0 } }))
  s.push({ name: 'Total', type: 'bar', stack: 't', data: f.map(() => 0), label: { show: true, position: 'top', formatter: (p: any) => mill(tot[p.dataIndex]), color: CP, fontSize: 9, fontWeight: 'bold' } })
  s.push({ name: promLbl, type: 'line', data: f.map(() => Math.round(ritmo.value)), symbol: 'none', lineStyle: { type: 'dashed', color: '#64748b', width: 1.2 }, itemStyle: { color: '#64748b' } })
  return { ...base, legend: { ...leg, data: [...fs, promLbl] }, grid: { top: 32, bottom: 24, left: 58, right: 8 },
    xAxis: { type: 'category', data: f.map(d => `${d.slice(8)}/${d.slice(5, 7)}`), axisTick: { show: false }, axisLabel: { fontSize: 9, color: CP, fontWeight: 'bold' } },
    yAxis: ejeY(mill), series: s }
})
// 2. Venta y remisiones por familia
const optFam = computed(() => {
  const f = [...fams.value].sort((a, b) => mv.value[a] - mv.value[b])
  return { ...base, legend: { ...leg, right: 'center' },
    grid: [{ top: 26, bottom: 4, left: 120, width: '32%' }, { top: 26, bottom: 4, left: '62%', width: '24%' }],
    xAxis: [{ gridIndex: 0, show: false }, { gridIndex: 1, show: false }],
    yAxis: [{ gridIndex: 0, type: 'category', data: f, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 11 } },
      { gridIndex: 1, type: 'category', data: f, show: false }],
    series: [
      { name: 'Venta ($)', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, barWidth: 18, itemStyle: { color: CP },
        data: f.map(x => ({ value: Math.round(mv.value[x]), itemStyle: { color: COL[x], borderRadius: 2 } })),
        label: { show: true, position: 'right', formatter: (p: any) => cop(p.value), fontSize: 10, fontWeight: 'bold', color: CP } },
      { name: 'Remisiones', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, barWidth: 18, itemStyle: { color: '#16a34a', borderRadius: 2 },
        data: f.map(x => mr.value[x]), label: { show: true, position: 'right', formatter: (p: any) => Number(p.value).toLocaleString('es-CO'), fontSize: 10, fontWeight: 'bold', color: '#16a34a' } }] }
})
// 3. Dona de participación
const optDona = computed(() => ({ ...base,
  legend: { bottom: 0, left: 'center', orient: 'vertical', itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, fontWeight: 'bold', color: CP },
    formatter: (n: string) => `${n}  ${(M.value.venta ? mv.value[n as Familia] / M.value.venta * 100 : 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%` },
  title: { text: mill(M.value.venta), subtext: `VENTA ${esMes.value ? 'DEL MES' : 'DEL PERÍODO'}\nPARTICIPACIÓN`, left: 'center', top: '19%',
    textStyle: { fontSize: 17, fontWeight: 900, color: CP }, subtextStyle: { fontSize: 8, color: '#666', fontWeight: 'bold', lineHeight: 12 } },
  series: [{ type: 'pie', radius: ['34%', '50%'], center: ['50%', '30%'], label: { show: false },
    data: fams.value.map(f => ({ name: f, value: Math.round(mv.value[f]), itemStyle: { color: COL[f] } })) }] }))
// 4. Top materiales por venta
const optMat = computed(() => {
  const top = materiales.value.slice(0, 10).reverse()
  return { ...base, grid: { top: 6, bottom: 4, left: 8, right: 70, containLabel: true }, xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: top.map(o => titulo(o.prod).slice(0, 30)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CP, fontWeight: 'bold', fontSize: 10 } },
    series: [{ type: 'bar', barWidth: 14, data: top.map(o => ({ value: Math.round(o.venta), itemStyle: { color: COL[o.fam], borderRadius: [0, 2, 2, 0] } })),
      label: { show: true, position: 'right', formatter: (p: any) => mill(p.value), color: CP, fontSize: 10, fontWeight: 'bold' } }] }
})
// 5. Venta acumulada del mes + proyección
const optAcum = computed(() => {
  const c = proyeccion.value
  if (!c) return {}
  const dias: string[] = []
  for (let f = R.value.desde; f <= ultimoDelMes(hoy.value); f = dia(f, 1)) dias.push(f)
  const real: (number | null)[] = [], proj: (number | null)[] = []
  let acc = 0
  for (const d of dias) {
    if (d <= hoy.value) { acc += ventaDia(d); real.push(Math.round(acc)); proj.push(d === hoy.value ? Math.round(acc) : null) }
    else { acc += esDom(d) ? (c.vendeDom ? c.pd : 0) : c.ph; real.push(null); proj.push(Math.round(acc)) }
  }
  return { ...base, legend: { ...leg, data: ['Venta acumulada', 'Proyección'] }, grid: { top: 34, bottom: 24, left: 64, right: 90 },
    xAxis: { type: 'category', data: dias.map(d => d.slice(8)), boundaryGap: false, axisTick: { show: false }, axisLabel: { fontSize: 9, color: CP, fontWeight: 'bold' } },
    yAxis: ejeY(mill),
    series: [
      { name: 'Venta acumulada', type: 'line', data: real, symbolSize: 5, lineStyle: { width: 2.5, color: CP }, itemStyle: { color: CP }, areaStyle: { color: 'rgba(23,41,84,.08)' },
        label: { show: true, position: 'top', fontSize: 8, color: CP, fontWeight: 'bold', formatter: (p: any) => ((p.dataIndex % 4 === 0 || real[p.dataIndex + 1] == null) && p.value != null ? mill(p.value) : '') } },
      { name: 'Proyección', type: 'line', data: proj, symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: '#dc2626' }, itemStyle: { color: '#dc2626' },
        markPoint: { symbol: 'rect', symbolSize: [1, 1], data: [{ coord: [dias.length - 1, Math.round(c.total)], value: Math.round(c.total) }],
          label: { show: true, position: 'top', formatter: () => 'est. ' + mill(c.total), color: '#dc2626', fontSize: 10, fontWeight: 'bold' } } }] }
})

// ── PDF ──
const paperRef = ref<HTMLElement | null>(null)
const generando = ref(false)
async function pdf() {
  if (!paperRef.value || generando.value) return
  generando.value = true
  try {
    const nombre = PLANTA.value.normalize('NFD').replace(/[^A-Za-z]/g, '')
    const periodo = esMes.value ? hoy.value.slice(0, 7) : `${R.value.desde}_a_${R.value.hasta}`
    await descargarInformePdf(paperRef.value, `Informe_Ventas_Agregados_${nombre}_${periodo}.pdf`)
  } catch (e) {
    console.error('[informe-facturacion] Error generando PDF:', e)
  } finally {
    generando.value = false
  }
}
</script>

<style scoped src="../../concretos/tabs/informe.css"></style>
<style scoped>
.icb-presets { display: flex; gap: 4px; flex-wrap: wrap; }
.icb-preset {
  padding: 5px 10px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap;
  border: 1px solid var(--card-border); border-radius: 6px; background: transparent; color: var(--text-secondary);
}
.icb-preset:hover { color: var(--text-primary); border-color: var(--card-border-hover); }
.icb-preset.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }

/* Elementos del generador de agregados que no trae informe.css */
.nowrap { white-space: nowrap; }
.tdot { display: inline-block; margin-right: 6px; width: 6px; height: 6px; border-radius: 50%; vertical-align: 1px; }
.compact-kpi :deep(.kpi-det-lbl) { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; min-width: 100px; padding-right: 6px; color: #3B82F6; }
.compact-kpi :deep(.kpi-det-pct) { color: var(--text-tertiary); font-size: 10px; }
.compact-kpi :deep(.kpi-detail-row) { flex-wrap: nowrap; white-space: nowrap; }
.compact-kpi :deep(.kpi-detail strong) { white-space: nowrap; }
.dq-grid { display: flex; flex-direction: column; gap: 10px; }
.dq { border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 4px; padding: 10px 12px; background: #fff; }
.dq-alto { border-left-color: #a90707; }
.dq-medio { border-left-color: #b8860b; }
.dq-info { border-left-color: #94a3b8; }
.dq-head { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #1a1a2e; }
.dq-txt { font-size: 11.5px; color: #475569; margin: 4px 0 8px; }
.dq .data-card { margin-top: 2px; }

/* Tema oscuro solo en pantalla (el PDF usa .pdf-capturing y sale blanco): el azul marino de «Arena» no se ve sobre fondo oscuro */
[data-theme="dark"] .report-paper:not(.pdf-capturing) :deep(.kpi-dot[style*="#172954"]),
[data-theme="dark"] .report-paper:not(.pdf-capturing) .tdot[style*="23, 41, 84"] { background: #a5b4fc !important; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .dq { background: var(--card-bg); border-color: var(--card-border); }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .dq-alto { border-left-color: #f87171; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .dq-medio { border-left-color: #fbbf24; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .dq-head { color: #e2e8f0; }
[data-theme="dark"] .report-paper:not(.pdf-capturing) .dq-txt { color: #a3b1c6; }
@media (max-width: 640px) {
  .icb-presets { width: 100%; }
  .icb-preset { flex: 1; }
}
.kpi-grupo { margin: 10px 0 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--text-secondary); }
</style>
