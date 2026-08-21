"""Genera `docs/plantilla-disponibilidad.html`: la plantilla del reporte diario
de disponibilidad, planta por planta, documentada bloque a bloque.

No es una maqueta: importa `plantilla.py` y dibuja cada bloque con las MISMAS
funciones y el MISMO CSS que salen a diario en el PDF, sobre datos de ejemplo.
Si el reporte cambia, se regenera y el documento cambia con él:

    python3 docs/plantilla_doc.py
"""
import locale
import re
import sys
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import config                      # noqa: E402
import plantilla as P              # noqa: E402

# mismos meses en español que el PDF diario
for _loc in ("es_CO.UTF-8", "es_ES.UTF-8", "es_CO", "C"):
    try:
        locale.setlocale(locale.LC_TIME, _loc)
        break
    except locale.Error:
        continue

SALIDA = Path(__file__).parent / "plantilla-disponibilidad.html"
e = P.e


# ── el CSS del reporte, reutilizado tal cual dentro de `.rp` ────────────────
def prefijar(css, pref=".rp"):
    """Mismo CSS del PDF, encapsulado para poder mostrarlo dentro del documento."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = []
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        sel, cuerpo = m.group(1).strip(), m.group(2).strip()
        if sel.startswith("@"):                      # @page no aplica en pantalla
            continue
        partes = []
        for s in (x.strip() for x in sel.split(",")):
            if not s:
                continue
            partes.append(":root" if s == ":root" else
                          f"{pref} *" if s == "*" else
                          pref if s == "body" else f"{pref} {s}")
        out.append(", ".join(partes) + "{" + cuerpo + "}")
    return "\n".join(out)


# ── datos de ejemplo (no son cifras reales: ilustran el formato) ────────────
HOY = date(2026, 8, 11)


def _serie():
    base = [.46, .46, .52, .58, .61, .55, .49, .46, .53, .67, .71, .68, .74, .79]
    s, d = [], HOY - timedelta(days=len(base) - 1)
    for i, v in enumerate(base):
        s.append({"fecha": d + timedelta(days=i), "disp": v, "revisadas": 22 + i % 3,
                  "parcial": i == 8})
    return s


TIPOS = {
    "MIXER": {"n": 12, "parcial": 1, "no_op": 3, "disp": 0.71, "op_prop": 7, "op_alq": 1},
    "VOLQUETA": {"n": 8, "parcial": 1, "no_op": 1, "disp": 0.81, "op_prop": 6, "op_alq": 0},
    "AUTOBOMBA": {"n": 4, "parcial": 0, "no_op": 1, "disp": 0.75, "op_prop": 2, "op_alq": 1},
    "CARGADOR": {"n": 3, "parcial": 1, "no_op": 1, "disp": 0.50, "op_prop": 1, "op_alq": 0},
}
PLANTAS_G = {
    "CUNCIA": {"n": 14, "op": 10, "disp": 0.71},
    "GUAYURIBA": {"n": 6, "op": 5, "disp": 0.83},
    "LÍNEA 3": {"n": 4, "op": 2, "disp": 0.50},
    "SIN PLANTA IDENTIFICADA": {"n": 3, "op": 2, "disp": 0.67},
}

def tipos_propios():
    """Las mismas categorías sin la flota alquilada: lo que ve una planta de
    agregados, donde no se alquila."""
    out = {}
    for k, v in TIPOS.items():
        n = v["n"] - v["op_alq"]
        out[k] = dict(v, n=n, op_alq=0,
                      disp=(v["op_prop"] + 0.5 * v["parcial"]) / n)
    return out


D_AM, D_PM, OP, N = 0.74, 0.31, 17.5, 24


def kpis_demo():
    t = [P.kpi(24, "Flota propia", "equipos del módulo"),
         ("<!--ALQ-->" + P.kpi(4, "Alquilados", "1 fuera de operación",
                               P.NAVY, P.G.NAVY_MED)),
         P.kpi("17,5", "Operativos", "3 parciales", P.VERDE, P.VERDE),
         P.kpi(5, "No operativos", "4 en taller", P.ROJO, P.ROJO),
         P.kpi(f"{D_AM:.0%}", "Disponibilidad propia", f"ronda AM del {HOY:%d/%m}",
               P.color_disp(D_AM), P.color_disp(D_AM)),
         "<!--ALQ-->" + P.kpi("76%", "Disponible en cancha", "21,5 de 28 propios+alq.",
                              P.color_disp(.76), P.color_disp(.76)),
         P.kpi("92%", "Cobertura", "22 de 24 revisados", P.color_disp(.92),
               P.color_disp(.92)),
         P.kpi(0, "Días de rezago", "desde la última captura", P.NAVY, P.NAVY)]
    return "".join(t)


def _eq(nom, placa):
    return f"<div class='eq'>{nom}</div><div class='cod'>{placa}</div>"


PILL = {"rojo": "p-rojo", "verde": "p-verde", "ambar": "p-ambar", "gris": "p-gris"}


def pill(txt, c):
    return f"<span class='pill {PILL[c]}'>{txt}</span>"


# ── andamiaje del documento ────────────────────────────────────────────────
SEC = []          # (id, titulo) para el índice lateral


def seccion(sid, titulo, cuerpo, kicker=""):
    SEC.append((sid, titulo))
    k = f"<div class='kicker'>{kicker}</div>" if kicker else ""
    return f"<section id='{sid}'>{k}<h2>{titulo}</h2>{cuerpo}</section>"


def bloque(nombre, cuerpo, fuente=None, regla=None, cond=None, orden=None):
    """Ficha de un bloque del reporte: vista previa + de dónde sale + la regla."""
    cls = f"bloque{' cond ' + cond if cond else ''}"
    tag = (f"<span class='tag tag-cond'>solo {cond}</span>" if cond else "")
    ord_ = f"<span class='ord'>{orden}</span>" if orden else ""
    f = (f"<div class='meta-b'><b>Fuente</b>{fuente}</div>" if fuente else "")
    r = (f"<div class='meta-b regla'><b>Regla</b>{regla}</div>" if regla else "")
    return (f"<div class='{cls}'><h3>{ord_}{nombre}{tag}</h3>"
            f"<div class='rp'>{cuerpo}</div>{f}{r}</div>")


def tabla_doc(cols, filas, clase="", attrs=None):
    th = "".join(f"<th>{c}</th>" for c in cols)
    tr = "".join(f"<tr{(attrs or {}).get(i, '')}>"
                 + "".join(f"<td>{c}</td>" for c in f) + "</tr>"
                 for i, f in enumerate(filas))
    return (f"<table class='doc {clase}'><thead><tr>{th}</tr></thead>"
            f"<tbody>{tr}</tbody></table>")


# ── secciones ──────────────────────────────────────────────────────────────
def sec_ficha():
    filas = []
    for k, p in config.PLANTAS.items():
        filas.append([
            f"<b class='p-nom'>{e(p['nombre'])}</b>",
            e(p["negocio"]),
            f"<code>{e(p['codigo'].format(anio=HOY.year))}</code>",
            f"<code>{e(p['libro'])}</code>",
            ("<span class='si'>sí</span>" if p["usa_alquilados"]
             else "<span class='no'>no</span>"),
            e(config.WHATSAPP_GRUPOS.get(k, "—")),
        ])
    t = tabla_doc(["Planta", "Negocio", "Código del informe", "Libro de OT (AppSheet)",
                   "Alquilados", "Grupo de WhatsApp"], filas, "plantas",
                  {i: f" data-k='{k}'" for i, k in enumerate(config.PLANTAS)})
    return seccion("ficha", "Una plantilla, tres plantas", f"""
      <p>El reporte diario de disponibilidad es <b>un solo formato</b> que se emite tres
      veces, una por operación. Cambian el libro de origen, el código del informe y el
      grupo de destino; <b>la estructura de páginas, el cálculo y el orden de los
      bloques son idénticos</b>. La única diferencia de contenido es la flota
      alquilada: en agregados no se alquila, así que esos bloques no se imprimen —
      un «0» ahí se leería como un dato que falta.</p>
      {t}
      <div class='avisos'>
        <div class='av'><b>Cuándo sale</b> Todos los días hábiles a las 8:30
          (<code>com.gravicon.disponibilidad-flota</code> → <code>run.sh</code>).</div>
        <div class='av'><b>Por dónde</b> Los tres PDF a Telegram como copia de control
          de la Dirección; además cada planta a su grupo de WhatsApp vía el puente
          Gravi.</div>
        <div class='av'><b>Una entrega por planta, canal y día</b> La guarda vive en
          <code>datos/enviados.json</code>: la clave de Telegram es desnuda
          (<code>concretos</code>) y la de WhatsApp lleva sufijo
          (<code>concretos@whatsapp</code>), para que entregar por un canal no deje
          mudo al otro.</div>
      </div>""", "Ficha del entregable")


def sec_anatomia():
    p1 = ["Encabezado de marca", "Título e intro", "8 tarjetas KPI", "Nota de contexto",
          "Tendencia AM (14 días)", "Tipo de equipo · dona · AM vs PM",
          "Flota alquilada"]
    resto = ["Matriz por categoría", "Disponibilidad por planta",
             "Movimientos de taller", "Equipos en intervención",
             "Parados sin ingreso a taller", "Equipos operativos",
             "Tareas de seguimiento", "Cumplimiento por supervisor",
             "Resumen ejecutivo", "Control de calidad del dato"]
    hoja = lambda tit, items, cls="": (
        f"<div class='hoja {cls}'><div class='hoja-h'>"
        f"<span class='hl'></span><span class='hm'>Corte · código · pág.</span></div>"
        + "".join(f"<div class='hb'>{i}</div>" for i in items)
        + f"<div class='hoja-f'>{tit}</div></div>")
    return seccion("anatomia", "Anatomía del documento", f"""
      <p>Página A4 de alto fijo (297&nbsp;mm) con encabezado de marca arriba y pie
      absoluto abajo. <b>La portada es fija</b>; todo lo que sigue se reparte solo:
      el empaquetador estima la altura de cada bloque en milímetros y corta donde
      toca, repitiendo el encabezado de la tabla que quedó partida. Chrome no
      reflowa dentro de una página de alto fijo — si no empaquetáramos nosotros, el
      contenido se derramaría encima de la página siguiente.</p>
      <div class='hojas'>
        {hoja('Página 1 — portada', p1, 'portada')}
        {hoja('Páginas 2…n — detalle', resto)}
      </div>
      <div class='avisos'>
        <div class='av'><b>Alto útil</b> 224&nbsp;mm por página
          (<code>ALTO_UTIL_MM</code>), ya descontados márgenes, encabezado y pie.</div>
        <div class='av'><b>Número de páginas</b> No es fijo: depende de cuántos
          equipos haya en taller y cuántas tareas estén abiertas. Suele ir de 4 a 8.</div>
      </div>""", "Cómo se arma")


def sec_portada():
    b = []
    b.append(bloque("Encabezado de marca y título", f"""
      <header class="marca" style="position:relative">
        <img class="logo" src="{P._logo_uri()}" alt="Gravicon"/>
        <div class="meta"><b class="v-titulo">Mantenimiento Concretos Gravicon</b>
          GRAVAS Y CONCRETOS S.A.<br/>Villavicencio, Meta ·
          <span class="v-negocio">Concretos</span><br/>
          Corte: <b>{HOY:%d de %B de %Y}</b><br/>
          <b class="v-codigo">GRV-INF-2026-CONCRETOS-DISP</b> · Pág. 1 de 6</div>
      </header>
      <h1>Reporte de Disponibilidad de Equipos</h1>
      <p class="intro">Operatividad de la flota de <span class="v-nombre">Concretos</span>
      al corte del {HOY:%d de %B de %Y}: disponibilidad por tipo de equipo, equipos en
      intervención con su fecha estimada de salida, seguimiento de tareas de los
      supervisores y control de calidad del dato capturado. Las cifras se recalculan
      desde el detalle por placa del módulo de disponibilidad.</p>""",
        fuente="Título, negocio y código salen de <code>config.PLANTAS</code>; "
               "el corte es la última fecha con inspección cargada, no la de hoy.",
        regla="El filete rojo bajo el logo es el único rojo estructural: el resto del "
              "rojo se reserva para alertas.", orden="1"))

    b.append(bloque("Tarjetas KPI", f"<div class='kpis'>{kpis_demo()}</div>",
        fuente="Todas se recalculan desde la pestaña de placas del día de corte.",
        regla="Dos tarjetas son condicionales: «Alquilados» y «Disponible en cancha» "
              "solo se imprimen donde hay flota alquilada medida por placa. "
              "«Operativos» lleva decimales porque un parcial vale 0,5.", orden="2"))

    b.append(bloque("Nota de contexto", """
      <div class="nota alerta"><b>Este informe describe el 08/08/2026, no el día de
      hoy.</b> La última inspección cargada tiene 3 días. Mientras no se reponga la
      captura, la disponibilidad real de la flota es desconocida.</div>
      <div class="nota">La disponibilidad se calcula sobre los 22 equipos efectivamente
      inspeccionados. 2 equipo(s) de la flota no se revisaron y quedan fuera del
      denominador: MIXER 09, VOLQUETA 14.</div>""",
        fuente="Se elige <b>una sola</b> nota, en este orden de prioridad: "
               "alquilados sin detalle por placa → rezago mayor a "
               f"{config.DIAS_FRESCURA_ALERTA} días → equipos sin inspeccionar.",
        regla="Si no aplica ninguna, el bloque no se imprime. La nota roja existe "
              "para que un informe viejo no se lea como el de hoy.", orden="3"))

    b.append(bloque("Tendencia de disponibilidad — ronda AM, día a día", f"""
      <h2>Tendencia de disponibilidad — ronda AM, día a día</h2>
      <div class="marco">{P.svg_tendencia(_serie(), config.META_DISPONIBILIDAD)}</div>
      <p class="intro" style="margin:5px 0 0">Se compara siempre la misma ronda (AM)
      contra sí misma. Mezclar la ronda PM de un día con la AM del siguiente produce
      saltos que no corresponden a cambios en la flota.</p>""",
        fuente="Últimos 14 días con inspección, recalculados placa a placa. "
               "<b>Nunca</b> desde la hoja de resumen diario.",
        regla="La meta punteada es "
              f"{config.META_DISPONIBILIDAD:.0%}. El último punto firme va en rojo. "
              "Los días con la captura a medio hacer salen como punto hueco "
              "«captura incompleta» y <b>no forman parte de la línea</b>: su "
              "porcentaje describe la captura, no la flota.", orden="4"))

    leyenda = ("<div class='leyenda'>"
               f"<span><i style='background:{P.VERDE}'></i>Operativo propio</span>"
               f"<span class='lg-alq'><i style='background:{P.TEAL}'></i>"
               "Operativo alquilado</span>"
               f"<span><i style='background:{P.AMBAR}'></i>Parcial (0,5)</span>"
               f"<span><i style='background:{P.ROJO}'></i>No operativo</span></div>")
    b.append(bloque("Disponibilidad por tipo de equipo", f"""
      <h2>Disponibilidad por tipo de equipo — {HOY:%d/%m}<span class="con-alq"> ·
        propia + alquilada</span></h2>
      <div class="fila">
        <div style="flex:1.9"><div class="con-alq">{P.svg_barras_tipo(TIPOS)}</div>
          <div class="sin-alq">{P.svg_barras_tipo(tipos_propios())}</div>{leyenda}</div>
        <div style="flex:0.85">{P.svg_dona(D_AM, OP, N)}</div>
        <div style="flex:1">{P.svg_am_pm(D_AM, D_PM)}
          <div class="leyenda" style="justify-content:center">AM vs PM del mismo
          día</div></div>
      </div>""",
        fuente="Categorías = <code>Tipo de Vehiculos</code> de cada placa inspeccionada.",
        regla="Las tres piezas van juntas en una fila. La comparación AM/PM es del "
              "<b>mismo día</b>: la brecha mide cumplimiento de la ronda de la tarde, "
              "no una caída de la flota — la PM casi nunca se completa.", orden="5"))

    chips = "".join(
        f"<span class='chip'><b>{pl}</b><span class='chip-t'>{ti}</span>"
        f"<i style='background:{col}'></i></span>"
        for pl, ti, col in [("WPT-482", "AUTOBOMBA", P.VERDE),
                            ("SXT-115", "MIXER", P.VERDE),
                            ("TAX-733", "MIXER", P.AMBAR),
                            ("ARS-901", "AUTOBOMBA", P.ROJO)])
    b.append(bloque("Flota alquilada", f"""
      <h2>Flota alquilada — {HOY:%d/%m}</h2>
      <div class="marco alq">
        <div class="alq-cifra" style="color:{P.color_disp(.75)}">75%
          <span>3 de 4 operativos</span></div>
        <div class="chips">{chips}</div>
      </div>
      <div class="chips-off">Fuera de la operación: KJU-220 — 10+ días en cero sin
        intervención. No cuentan en el denominador.</div>""",
        fuente="Placas cuyo <code>Tipo de Vehiculos</code> empieza por "
               "<code>ALQUILADAS - …</code>. El «Área de Trabajo» del resumen "
               "<b>no sirve</b> para identificarlas.",
        regla="Va aparte de la gráfica por categoría para que la serie de flota "
              "propia siga siendo comparable. Si hay resúmenes del área «Alquiladas» "
              "pero ninguna placa asociada, no se dibuja: se emite la nota roja.",
        cond="Concretos", orden="6"))
    return seccion("portada", "Portada — página 1", "".join(b), "Bloque a bloque")


def sec_detalle():
    b = []
    filas_m = []
    for k, v in TIPOS.items():
        filas_m.append(f"<tr><td><b>{k}</b></td>"
                       f"<td>{v['n'] - v['parcial'] - v['no_op']}</td>"
                       f"<td class='c-alq' style='color:{P.TEAL}'>{v['op_alq'] or '—'}</td>"
                       f"<td>{v['parcial']}</td><td>{v['no_op']}</td><td>{v['n']}</td>"
                       f"<td><b style='color:{P.color_disp(v['disp'])}'>"
                       f"{v['disp']:.0%}</b></td></tr>")
    filas_m.append(f"<tr><td><b>TOTAL FLOTA</b></td><td><b>19</b></td>"
                   f"<td class='c-alq'><b style='color:{P.TEAL}'>2</b></td>"
                   f"<td><b>3</b></td><td><b>6</b></td><td><b>27</b></td>"
                   f"<td><b style='color:{P.color_disp(.74)}'>74%</b></td></tr>")
    b.append(bloque("Matriz de operatividad por categoría", f"""
      <h2>Matriz de operatividad por categoría</h2>
      <table><thead><tr><th>Categoría</th><th>Operativos</th>
        <th class='c-alq'>de ellos alq.</th><th>Parciales</th><th>No operativos</th>
        <th>Total</th><th>Disp.</th></tr></thead>
        <tbody>{''.join(filas_m)}</tbody></table>
      <p class="intro" style="margin:5px 0 0">Un equipo parcial (0,5) operó parte del
      día. La disponibilidad pondera esos medios puntos; el conteo de «no operativos»
      no los incluye.</p>""",
        fuente="Mismo agregado que la gráfica de portada, en cifras.",
        regla="La columna «de ellos alq.» solo aparece donde hay alquilados. "
              "La fila TOTAL FLOTA cierra la tabla.", orden="7"))

    b.append(bloque("Disponibilidad por planta", f"""
      <h2>Disponibilidad por planta</h2>
      <div class="marco">{P.svg_barras_planta(PLANTAS_G)}</div>
      <p class="intro" style="margin:5px 0 0">La planta <b>no se registra en el módulo
      de disponibilidad</b>: se infiere de la localización de las órdenes de trabajo de
      cada equipo. Se identificó la de <b>24 de 27</b> equipos del día; el resto queda
      agrupado aparte y no se le atribuye disponibilidad a ninguna planta.</p>""",
        fuente="Cruce con <code>Localización</code> de las OT del equipo.",
        regla="El ancho de la barra es proporcional al tamaño de la flota de cada "
              "planta: una planta de 1 equipo no puede leerse igual que una de 20. "
              "«SIN PLANTA IDENTIFICADA» va en gris, sin semáforo.", orden="8"))

    b.append(bloque("Movimientos de taller", """
      <h2>Movimientos de taller — 08/08 → 11/08</h2>
      <h3>↓ Ingresaron a taller (2)</h3>
      <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Actividad / Necesidad</th>
        <th>Proveedor</th><th>Supervisor</th><th>Días p/ salida</th></tr></thead>
        <tbody>
        <tr><td>""" + _eq("MIXER 07", "SXT-493") + """</td><td>MIXER</td>
          <td>Cambio de bomba hidráulica</td><td>Hidráulicos del Llano</td>
          <td>J. Ramírez</td><td>""" + pill("3", "gris") + """</td></tr>
        <tr><td>""" + _eq("CARGADOR 02", "OT-1180") + """</td><td>CARGADOR</td>
          <td>Motor — revisión de turbo</td><td>Taller interno</td>
          <td>A. Peña</td><td>""" + pill("12", "ambar") + """</td></tr>
        </tbody></table>
      <h3>↑ Salieron de taller (1)</h3>
      <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Actividad / Necesidad</th>
        <th>Proveedor</th><th>Supervisor</th><th>Días p/ salida</th></tr></thead>
        <tbody><tr><td>""" + _eq("VOLQUETA 05", "TAX-733") + """</td><td>VOLQUETA</td>
          <td>Suspensión</td><td>Serviteca Meta</td><td>J. Ramírez</td>
          <td><span class='cod'>—</span></td></tr></tbody></table>""",
        fuente="Diferencia entre la inspección del corte y la inspección anterior.",
        regla="Contesta «qué cambió desde ayer», que es lo que se pregunta en la "
              "reunión de la mañana. Si no hay una inspección previa con qué comparar, "
              "el bloque entero no se imprime.", orden="9"))

    b.append(bloque("Equipos en intervención", """
      <h2>Equipos en intervención (4 en taller)</h2>
      <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Actividades / Necesidades</th>
        <th>Proveedor</th><th>Supervisor</th><th>Orden de trabajo</th>
        <th>Días p/ salida</th></tr></thead><tbody>
      <tr><td>""" + _eq("MIXER 07", "SXT-493") + """</td><td>MIXER</td>
        <td><div>Cambio de bomba hidráulica</div>
        <div class='cod'>Requiere repuesto importado</div></td>
        <td>Hidráulicos del Llano</td><td>J. Ramírez</td><td>OT-2214</td>
        <td>""" + pill("3", "gris") + """</td></tr>
      <tr><td>""" + _eq("CARGADOR 02", "OT-1180") + """</td><td>CARGADOR</td>
        <td><div>Motor — revisión de turbo</div></td><td>Taller interno</td>
        <td>A. Peña</td><td>OT-2201, OT-2209</td>
        <td>""" + pill("12", "ambar") + """</td></tr>
      <tr class='alerta'><td>""" + _eq("AUTOBOMBA 01", "ARS-175") + """</td>
        <td>AUTOBOMBA</td><td><div>Sin actividad registrada</div></td><td>—</td>
        <td>C. Molina</td><td>""" + pill("sin OT", "rojo") + """</td>
        <td>""" + pill("6 d. vencido", "rojo") + """</td></tr>
      </tbody></table>
      <p class="intro" style="margin:5px 0 0">«Días p/ salida» = fecha estimada de
      salida menos la fecha de corte. En rojo, los equipos sin orden de trabajo abierta
      que respalde la intervención.</p>""",
        fuente="Placas del corte marcadas <code>¿Vehiculo en Taller?</code> = sí, "
               "cruzadas contra las OT abiertas del equipo.",
        regla="Ordenados por días de permanencia, de mayor a menor. La fila roja "
              "significa <b>equipo parado sin OT que lo respalde</b>: es el hallazgo "
              "accionable del informe, no un adorno. «6 d. vencido» = la fecha "
              "estimada de salida ya pasó.", orden="10"))

    b.append(bloque("Parados sin ingreso a taller", """
      <h3>Parados sin ingreso a taller (2)</h3>
      <p class="intro" style="margin:5px 0 0">Figuran como no operativos pero no están
      marcados en taller ni tienen intervención asociada: hoy nadie los está
      atendiendo.</p>
      <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Supervisor</th>
        <th>Observación</th></tr></thead><tbody>
      <tr class='alerta'><td>""" + _eq("MIXER 11", "WPT-482") + """</td><td>MIXER</td>
        <td>C. Molina</td><td>—</td></tr>
      <tr class='alerta'><td>""" + _eq("VOLQUETA 09", "KJU-220") + """</td>
        <td>VOLQUETA</td><td>A. Peña</td><td>Sin operador asignado</td></tr>
      </tbody></table>""",
        fuente="<code>Rev_AM = 0</code> y sin marca de taller ni intervención.",
        regla="Bloque condicional: si no hay ninguno, no se imprime. Todas las filas "
              "van en alerta a propósito — un equipo parado que nadie está atendiendo "
              "es peor que uno en taller.", orden="11"))

    b.append(bloque("Equipos operativos", """
      <h2>Equipos operativos (19)</h2>
      <table><thead><tr><th>Equipo</th><th>Tipo</th><th>Supervisor</th>
        <th>Estado AM</th><th>Cambio en PM</th></tr></thead><tbody>
      <tr><td>""" + _eq("MIXER 03", "SXT-115") + """</td><td>MIXER</td>
        <td>J. Ramírez</td><td>""" + pill("operativo", "verde") + """</td>
        <td><span class='cod'>—</span></td></tr>
      <tr><td>""" + _eq("MIXER 04", "TAX-556") + """</td><td>MIXER</td>
        <td>J. Ramírez</td><td>""" + pill("parcial", "ambar") + """</td>
        <td>""" + pill("cayó en PM", "ambar") + """</td></tr>
      <tr><td>""" + _eq("VOLQUETA 02", "ARS-901") + """</td><td>VOLQUETA</td>
        <td>A. Peña</td><td>""" + pill("operativo", "verde") + """</td>
        <td><span class='cod'>—</span></td></tr>
      </tbody></table>""",
        fuente="Placas con <code>Rev_AM</code> mayor que 0.",
        regla="«Cambio en PM» solo se marca cuando la tarde <b>empeora</b> respecto "
              "a la mañana y hay ronda PM registrada.", orden="12"))

    b.append(bloque("Tareas de seguimiento abiertas", """
      <h2>Tareas de seguimiento abiertas (3)</h2>
      <table><thead><tr><th>Placa</th><th>Actividad</th><th>Responsable</th>
        <th>Estado</th><th>Registro</th><th>Días abierta</th></tr></thead><tbody>
      <tr class='alerta'><td>SXT-493</td>
        <td><div>Cotizar bomba hidráulica</div>
          <div class='cod'>Proveedor no responde desde el 04/08</div></td>
        <td>C. Molina</td><td>""" + pill("Pendiente", "rojo") + """</td>
        <td>28/07</td><td>""" + pill("14", "ambar") + """</td></tr>
      <tr><td>TAX-733</td><td><div>Programar alineación</div></td><td>A. Peña</td>
        <td>""" + pill("En proceso", "ambar") + """</td><td>09/08</td>
        <td>""" + pill("2", "gris") + """</td></tr>
      </tbody></table>""",
        fuente="Pestaña de tareas del módulo, unida a la inspección por "
               "<code>ID_Inspeccion</code>.",
        regla="Se marcan en alerta las abiertas hace más de 7 días.", orden="13"))

    tarj = lambda f, ej, tot, pct, sup: (
        f"<div class='marco' style='flex:1'><h3 style='margin-top:0'>{f} · "
        f"{ej}/{tot} ejecutadas</h3><div style='font-size:15pt;font-weight:700;"
        f"color:{P.color_disp(pct)};margin-bottom:4px'>{pct:.0%}</div>"
        + P.tabla(["Supervisor", "T.", "Ej.", "P.", "%"],
                  [[n, t, f"<b style='color:{P.VERDE}'>{x}</b>",
                    f"<b style='color:{P.ROJO}'>{t - x}</b>",
                    f"<b style='color:{P.color_disp(x / t)}'>{x / t:.0%}</b>"]
                   for n, t, x in sup]) + "</div>")
    b.append(bloque("Cumplimiento diario por supervisor", f"""
      <h2>Cumplimiento diario por supervisor</h2>
      <div class="dos">
        {tarj('10/08/2026', 7, 9, 7 / 9, [('J. Ramírez', 4, 4), ('A. Peña', 5, 3)])}
        {tarj('11/08/2026', 5, 8, 5 / 8, [('J. Ramírez', 3, 2), ('C. Molina', 5, 3)])}
      </div>
      <div class="nota alerta"><b>3 tarea(s) se cerraron con 5 días o más de rezago.</b>
      Cerrar en bloque tareas viejas hace que el indicador de cumplimiento diario marque
      0% durante días y luego salte a 100%: el promedio resultante no mide
      seguimiento.</div>""",
        fuente="Tareas registradas y cerradas en cada uno de los dos últimos días "
               "con captura.",
        regla="Dos días lado a lado, no un promedio del mes. La nota de cierres en "
              "bloque solo aparece cuando de verdad los hubo.", orden="14"))

    b.append(bloque("Resumen ejecutivo y control de calidad del dato", """
      <h2>Resumen ejecutivo</h2>
      <ul class="res">
        <li>Disponibilidad de la ronda AM: 74% (17,5 de 24 equipos), 11 puntos por
          debajo de la meta de 85%.</li>
        <li>La categoría más crítica es CARGADOR: 50%, con 1 de 3 equipos parados.</li>
        <li>4 equipos en taller; 1 de ellos sin orden de trabajo que respalde la
          intervención.</li>
        <li>2 equipos figuran parados sin ingreso a taller ni intervención asociada.</li>
      </ul>
      <h2>Control de calidad del dato</h2>
      <div class="aviso alto"><span class="ico">!</span><span><b>2 equipos de la flota
        no se inspeccionaron</b>Salen del denominador, así que la disponibilidad
        publicada está calculada sobre 22 de 24 equipos.</span></div>
      <div class="aviso medio"><span class="ico">!</span><span><b>La ronda PM quedó a
        medias</b>Se registraron 7 de 22 placas. La brecha AM–PM de este informe mide
        la inspección, no la flota.</span></div>""",
        fuente="Ambos bloques se derivan de lo ya calculado; no leen nada nuevo.",
        regla="El resumen ejecutivo es <b>generado</b>, no redactado a mano: si una "
              "frase no está, es porque la condición no se cumplió. El control de "
              "calidad se imprime siempre, aunque sea para decir «sin "
              "observaciones».", orden="15"))

    b.append(bloque("Pie de página", """
      <footer style="position:relative;left:0;right:0;bottom:0">
        <span>Informe de Disponibilidad de Flota — Gravicon</span>
        <span>Generado 11/08/2026 08:31 · GRV-INF-2026-CONCRETOS-DISP</span>
      </footer>""",
        fuente="Se repite en todas las páginas, con la hora real de generación.",
        regla="Va en posición absoluta con <code>z-index</code> por encima de las "
              "decoraciones, y la página es de alto fijo — si fuera "
              "<code>min-height</code>, el pie salta de hoja.", orden="16"))
    return seccion("detalle", "Detalle — páginas 2 en adelante", "".join(b))


def sec_mensaje():
    return seccion("mensaje", "El mensaje que acompaña al PDF", """
      <p>Casi nadie abre el PDF en el celular: el mensaje tiene que sostenerse solo.
      Se arma con el mismo contenido en los dos canales y <b>distinto marcado</b> —
      mandar <code>&lt;b&gt;</code> a WhatsApp no falla, imprime las etiquetas crudas
      en el grupo.</p>
      <div class="chats">
        <div class="chat tg"><div class="chat-h">Telegram · copia de control</div>
          <div class="burbuja"><b>CONCRETOS · Disponibilidad 74%</b> 🟡<br/>
            Corte 11/08/2026 · 17,5 de 24 equipos operativos<br/>
            ▲ +6 pp contra el 10/08 (68%)<br/>
            🔧 4 en taller · 2 parados sin intervención<br/>
            🚜 Con 4 alquilados: <b>76%</b> en cancha (21,5 de 28)<br/>
            Categoría más crítica: <b>CARGADOR</b> 50% (1 de 3 parados)<br/>
            ⚠️ 2 equipos sin inspeccionar · 1 parados sin OT</div></div>
        <div class="chat wa"><div class="chat-h">WhatsApp · grupo de la planta</div>
          <div class="burbuja"><span class="wb">👋 ¡Buenos días, equipo!</span>
            <b>Disponibilidad de flota</b> · 11/08/2026<br/><br/>
            <b>CONCRETOS · Disponibilidad 74%</b> 🟡<br/>
            Corte 11/08/2026 · 17,5 de 24 equipos operativos<br/>
            ▲ +6 pp contra el 10/08 (68%)<br/>
            🔧 4 en taller · 2 parados sin intervención<br/><br/>
            <i>El PDF trae el detalle por placa y las OT abiertas.</i> — Gravi 🤖</div>
          </div>
      </div>
      <div class='avisos'>
        <div class='av'><b>Semáforo</b> 🟢 ≥85% · 🟡 ≥60% · 🔴 por debajo.</div>
        <div class='av'><b>La comparación es AM contra AM</b> y salta los días con
          captura incompleta, para no anunciar recuperaciones que no ocurrieron.</div>
        <div class='av'><b>WhatsApp encola, no entrega.</b> El puente escribe en
          <code>outbox/</code>; «encolado» no prueba que el grupo lo haya
          recibido.</div>
      </div>""", "Telegram y WhatsApp")


def sec_reglas():
    filas = [
        ["<code>Rev_AM</code> / <code>Rev_PM</code>",
         "<b>1</b> operativo · <b>0,5</b> parcial · <b>0</b> no operativo",
         "Es la única métrica del informe."],
        ["Disponibilidad",
         "Σ <code>Rev_AM</code> ÷ placas revisadas ese día",
         "Verificado contra el PDF original de Cuncia del 06/08/2026: 46%, 11 de 24, "
         "categoría por categoría."],
        ["No operativo", "<code>Rev_AM = 0</code>",
         "Incluye equipos parados aunque no estén marcados en taller."],
        ["Cobertura", "placas revisadas ÷ flota registrada",
         "Si una placa deja de inspeccionarse sale del denominador y la "
         "disponibilidad <b>sube sola</b>. Por eso se publica al lado."],
        ["Días p/ salida", "<code>Fecha_Salida</code> − fecha de corte",
         "Negativo = fecha estimada ya vencida."],
        ["Meta", f"{config.META_DISPONIBILIDAD:.0%}",
         "Línea punteada de la tendencia y umbral del semáforo verde."],
        ["Rezago", f"más de {config.DIAS_FRESCURA_ALERTA} días sin captura",
         "Dispara la nota roja de portada y la alerta del mensaje."],
    ]
    return seccion("reglas", "Reglas de cálculo", f"""
      {tabla_doc(['Concepto', 'Definición', 'Por qué importa'], filas, 'reglas')}
      <h3 class='sub'>Tres trampas que el formato evita a propósito</h3>
      <div class='trampas'>
        <div class='tr'><b>La hoja de resumen diario no se usa</b>
          <code>Porcentaje_General_Dia</code> y <code>Total_Placas_Revisadas</code>
          traen filas sueltas por tipo y contadores sin cerrar. El reporte del
          proveedor las usa para su tendencia mensual y por eso publica cifras que no
          existen. <b>Todo se recalcula desde la pestaña de placas.</b></div>
        <div class='tr'><b>AM y PM no se mezclan</b> El original grafica «Ayer PM vs
          Hoy AM» y dibuja una recuperación de 42 puntos que nunca ocurrió: la ronda
          de la tarde no se completa y se registra en cero. Aquí AM va contra AM, y la
          brecha AM–PM se muestra aparte como control de la inspección.</div>
        <div class='tr'><b>El informe no está desactualizado: la ronda no se hizo</b>
          Cuando una planta sale con corte de días atrás, casi siempre el origen no
          tiene inspección de ese día — no es caché ni error. Acacías inspecciona día
          de por medio; Concretos es el único que cumple a diario.</div>
      </div>""", "El cálculo")


def sec_datos():
    hojas = [
        ["<code>placas</code>", "<code>id_inspeccion</code>, <code>rev_am</code>, "
         "<code>rev_pm</code>",
         "<b>La fuente de todo.</b> Una fila por placa inspeccionada por día."],
        ["<code>disponibilidad</code>", "<code>id_disponibilidad</code>, "
         "<code>total_placas_revisadas</code>",
         "Resumen del día. Solo se usa para leer el «Área de Trabajo»; sus totales "
         "<b>no</b> se publican."],
        ["<code>tareas</code>", "<code>id_tarea</code>, <code>id_inspeccion</code>, "
         "<code>estado_tarea</code>", "Seguimiento y cumplimiento por supervisor."],
        ["<code>ot</code>", "<code>c_orden_ot</code>, <code>estado</code>",
         "Órdenes de trabajo: respaldo de la intervención y planta del equipo."],
    ]
    return seccion("datos", "De dónde sale el dato", f"""
      <p>Cada libro es un AppSheet: cada pestaña es una tabla del modelo relacional y
      se identifica por <b>la firma de sus columnas</b>, no por el nombre de la
      pestaña — que cambia sin avisar.</p>
      {tabla_doc(['Tabla', 'Firma de columnas', 'Para qué se usa'], hojas, 't-hojas')}
      <div class='avisos'>
        <div class='av alerta'><b>El conector de Drive trunca estos libros.</b>
          Concretos devolvía 117 de 564 inspecciones y por eso los alquilados no
          aparecían. La ingesta va por <code>gspread</code> con la cuenta de servicio
          <code>radar-compras@…</code>.</div>
        <div class='av'><b>Dos llamadas por libro</b> (metadatos +
          <code>values_batch_get</code>): una por hoja revienta la cuota de Sheets
          (60/min → 429). Caché en <code>datos/cache_&lt;planta&gt;.json</code>.</div>
        <div class='av'><b>El alquilado se marca en el tipo, no en el área:</b>
          prefijo <code>ALQUILADAS - MIXER/AUTOBOMBA</code> en
          <code>Tipo de Vehiculos</code>.</div>
      </div>
      <h3 class='sub'>La cadena, de punta a punta</h3>
      <div class='flujo'>
        <div class='fp'><code>ingesta.py</code><span>lee los 3 libros y cachea</span></div>
        <div class='fp'><code>metricas.py</code><span>recalcula placa a placa</span></div>
        <div class='fp'><code>plantilla.py</code><span>HTML + SVG de marca</span></div>
        <div class='fp'><code>generar.py</code><span>arma y pagina el PDF</span></div>
        <div class='fp'><code>notificar.py</code><span>Telegram</span></div>
        <div class='fp'><code>whatsapp.py</code><span>encola al puente</span></div>
      </div>""", "Contrato de datos")


def sec_visual():
    swatch = lambda hex_, nom, uso: (
        f"<div class='sw'><i style='background:{hex_}'></i>"
        f"<div><b>{nom}</b><code>{hex_}</code><span>{uso}</span></div></div>")
    return seccion("visual", "Sistema visual", f"""
      <div class='swatches'>
        {swatch(P.NAVY, 'Navy', 'Marca, títulos, encabezados de tabla, línea de serie')}
        {swatch(P.ROJO, 'Rojo', 'Solo alertas y el dato del día — nunca de fondo')}
        {swatch(P.VERDE, 'Verde', 'Operativo propio · disponibilidad ≥ 85%')}
        {swatch(P.AMBAR, 'Ámbar', 'Parcial (0,5) · disponibilidad ≥ 60%')}
        {swatch(P.TEAL, 'Teal', 'Operativo alquilado — se distingue del propio')}
        {swatch(P.GRIS, 'Gris', 'Sin planta identificada · captura incompleta')}
      </div>
      <div class='avisos'>
        <div class='av'><b>Semáforo</b> <code>color_disp(p)</code>: verde ≥ 85%,
          ámbar ≥ 60%, rojo por debajo. Se aplica igual al número, a la barra y a la
          dona.</div>
        <div class='av'><b>Tipografía</b> Sans industrial (<code>var(--sans)</code>),
          cuerpo 9,2 pt, tablas 7,6 pt. Nada de serif: eso es otra marca.</div>
        <div class='av'><b>Gráficas en SVG inline</b> Chrome headless las imprime sin
          depender de red ni de librerías externas.</div>
      </div>
      <h3 class='sub'>Clases que se repiten</h3>
      {tabla_doc(['Clase', 'Qué es'], [
        ["<code>.kpi</code>", "Tarjeta de cifra grande con filete de color arriba."],
        ["<code>.nota</code> / <code>.nota.alerta</code>",
         "Bloque de contexto con barra lateral; la variante alerta va en rojo."],
        ["<code>.marco</code>", "Caja clara que envuelve una gráfica."],
        ["<code>.pill</code> (<code>p-verde</code>, <code>p-ambar</code>, "
         "<code>p-rojo</code>, <code>p-gris</code>)", "Etiqueta de estado."],
        ["<code>tr.alerta</code>", "Fila roja con filete: el hallazgo accionable."],
        ["<code>.aviso.alto</code> / <code>.medio</code>",
         "Avisos del control de calidad del dato."],
        ["<code>.chip</code>", "Placa alquilada con su punto de estado."],
      ], 'clases')}""", "Color, tipografía y clases")


# ── documento ──────────────────────────────────────────────────────────────
DOC_CSS = """
*{box-sizing:border-box}
body{margin:0;font-family:var(--sans);color:var(--ink);background:#f4f6f8;
     font-size:15px;line-height:1.55}
a{color:var(--navy)}
.wrap{display:flex;align-items:flex-start;max-width:1320px;margin:0 auto;gap:28px;
      padding:0 24px 80px}
main{flex:1;min-width:0}
/* portada */
.hero{background:var(--navy);color:#fff;padding:34px 0 30px;margin-bottom:26px;
      border-bottom:5px solid var(--red)}
.hero-in{max-width:1320px;margin:0 auto;padding:0 24px;display:flex;gap:26px;
         align-items:center;flex-wrap:wrap}
.hero img{height:52px;background:#fff;padding:7px 11px;border-radius:4px}
.hero h1{font-size:26px;margin:0;letter-spacing:.2px}
.hero p{margin:5px 0 0;color:#c7d0e2;font-size:14px;max-width:720px}
/* selector de planta */
.selector{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
.selector button{font:inherit;font-size:13px;font-weight:600;color:#fff;cursor:pointer;
    background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.28);
    border-radius:4px;padding:8px 15px;transition:.15s}
.selector button:hover{background:rgba(255,255,255,.18)}
.selector button[aria-pressed=true]{background:#fff;color:var(--navy);
    border-color:#fff}
.selector small{display:block;font-weight:400;font-size:10.5px;opacity:.75}
/* índice */
nav.idx{position:sticky;top:18px;width:212px;flex:0 0 212px;font-size:13.5px}
nav.idx ol{list-style:none;margin:0;padding:14px 0;background:#fff;border-radius:6px;
     border:1px solid var(--hair)}
nav.idx li a{display:block;padding:6px 16px;color:var(--soft);text-decoration:none;
     border-left:3px solid transparent}
nav.idx li a:hover{background:var(--mist);color:var(--navy)}
nav.idx li a.act{border-left-color:var(--red);color:var(--navy);font-weight:600}
/* secciones */
section{background:#fff;border:1px solid var(--hair);border-radius:6px;
        padding:24px 26px 28px;margin-bottom:22px;scroll-margin-top:16px}
.kicker{font-size:11px;text-transform:uppercase;letter-spacing:1.3px;
        color:var(--red);font-weight:700;margin-bottom:3px}
section>h2{font-size:21px;margin:0 0 14px;color:var(--navy);
     border-bottom:2px solid var(--navy);padding-bottom:8px}
section p{color:var(--soft);margin:0 0 14px}
h3.sub{font-size:14px;text-transform:uppercase;letter-spacing:.7px;color:var(--navy);
       margin:26px 0 10px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.87em;
     background:var(--mist);padding:1px 5px;border-radius:3px;color:var(--navy)}
/* tablas del documento */
table.doc{width:100%;border-collapse:collapse;font-size:13.5px;margin:6px 0 4px}
table.doc th{background:var(--navy);color:#fff;text-align:left;padding:8px 10px;
     font-size:11px;text-transform:uppercase;letter-spacing:.6px}
table.doc td{padding:9px 10px;border-bottom:1px solid #eceff3;vertical-align:top;
     color:var(--soft)}
table.doc tbody tr:nth-child(even){background:#fafbfc}
table.doc .p-nom{color:var(--navy)}
table.plantas tr.fila-act td{background:#eef3fb;box-shadow:inset 3px 0 0 var(--red)}
.si{color:var(--green);font-weight:700}.no{color:var(--steel)}
table.reglas td:first-child{color:var(--ink);font-weight:600;width:20%}
table.t-hojas td:first-child{width:18%}
table.clases td:first-child{width:34%}
/* avisos */
.avisos{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;
        margin-top:16px}
.av{background:var(--mist);border-left:3px solid var(--navy);padding:11px 14px;
    font-size:13.5px;color:var(--soft);border-radius:0 4px 4px 0}
.av.alerta{border-left-color:var(--red);background:#fdf1f1}
.av b{display:block;color:var(--ink);margin-bottom:2px}
/* esqueleto de hojas */
.hojas{display:flex;gap:26px;flex-wrap:wrap;margin:6px 0 4px}
.hoja{width:206px;border:1px solid var(--hair);border-radius:4px;background:#fff;
      padding:9px;box-shadow:0 2px 7px rgba(23,41,84,.07)}
.hoja-h{display:flex;justify-content:space-between;align-items:center;
        border-bottom:2px solid var(--navy);padding-bottom:6px;margin-bottom:7px}
.hl{width:52px;height:11px;background:var(--navy);border-radius:2px}
.hm{font-size:7.5px;color:var(--steel)}
.hb{font-size:10.5px;color:var(--soft);background:var(--mist);border-radius:3px;
    padding:5px 7px;margin-bottom:4px;border-left:2px solid var(--navy)}
.hoja.portada .hb:first-child{border-left-color:var(--red)}
.hoja-f{font-size:10px;color:var(--steel);border-top:1px solid var(--hair);
        padding-top:5px;margin-top:6px;text-align:center}
/* ficha de bloque */
.bloque{border:1px solid var(--hair);border-radius:5px;margin:0 0 18px;overflow:hidden}
.bloque h3{margin:0;background:var(--mist);padding:10px 14px;font-size:14px;
     color:var(--navy);border-bottom:1px solid var(--hair);display:flex;
     align-items:center;gap:9px}
.ord{background:var(--navy);color:#fff;width:21px;height:21px;border-radius:50%;
     display:inline-flex;align-items:center;justify-content:center;font-size:11px;
     flex:0 0 21px}
.tag{margin-left:auto;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;
     font-weight:700;padding:3px 9px;border-radius:10px}
.tag-cond{background:#fdeaea;color:var(--red)}
.meta-b{font-size:13px;color:var(--soft);padding:9px 14px;
        border-top:1px solid #eceff3;background:#fcfdfd}
.meta-b b{display:inline-block;min-width:52px;color:var(--navy);font-size:11px;
     text-transform:uppercase;letter-spacing:.6px;vertical-align:top}
.meta-b.regla{background:#fff}
/* la vista previa: CSS real del reporte, a escala */
.rp{background:#fff;padding:15px 17px;font-size:9.2pt}
.rp h1{margin:6px 0 5px}
.rp h2:first-child,.rp h3:first-child{margin-top:0}
.rp header.marca{margin-bottom:2px}
.rp footer{position:relative!important;left:0!important;right:0!important;
    bottom:0!important}
/* chats */
.chats{display:flex;gap:18px;flex-wrap:wrap}
.chat{flex:1;min-width:290px}
.chat-h{font-size:11px;text-transform:uppercase;letter-spacing:.7px;font-weight:700;
        color:var(--steel);margin-bottom:7px}
.burbuja{font-size:13.5px;line-height:1.6;padding:13px 15px;border-radius:10px;
         color:var(--ink)}
.chat.tg .burbuja{background:#e8f2fb;border:1px solid #cfe3f5;border-top-left-radius:3px}
.chat.wa .burbuja{background:#e4f7d9;border:1px solid #cbeab9;border-top-left-radius:3px}
.wb{display:block;margin-bottom:2px}
/* trampas */
.trampas{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:13px}
.tr{border:1px solid var(--hair);border-top:3px solid var(--red);border-radius:4px;
    padding:12px 14px;font-size:13.5px;color:var(--soft);background:#fff}
.tr b{display:block;color:var(--ink);margin-bottom:4px}
/* flujo */
.flujo{display:flex;gap:9px;flex-wrap:wrap;align-items:stretch}
.fp{flex:1;min-width:132px;background:var(--mist);border-radius:4px;padding:10px 12px;
    border-left:3px solid var(--navy);position:relative}
.fp code{background:none;padding:0;font-size:12.5px;font-weight:600}
.fp span{display:block;font-size:11.5px;color:var(--steel);margin-top:2px}
/* swatches */
.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.sw{display:flex;gap:11px;align-items:flex-start;border:1px solid var(--hair);
    border-radius:4px;padding:10px 12px}
.sw i{width:26px;height:26px;border-radius:4px;flex:0 0 26px;margin-top:2px}
.sw b{display:block;font-size:13.5px}
.sw code{font-size:11px;background:none;padding:0;color:var(--steel)}
.sw span{display:block;font-size:11.5px;color:var(--steel);line-height:1.4}
/* variantes por planta */
body[data-planta=cuncia] .cond,body[data-planta=acacias] .cond,
body[data-planta=cuncia] .c-alq,body[data-planta=acacias] .c-alq,
body[data-planta=cuncia] .lg-alq,body[data-planta=acacias] .lg-alq,
body[data-planta=cuncia] .kpis>*:nth-child(2),
body[data-planta=acacias] .kpis>*:nth-child(2),
body[data-planta=cuncia] .kpis>*:nth-child(6),
body[data-planta=acacias] .kpis>*:nth-child(6),
body[data-planta=cuncia] .con-alq,body[data-planta=acacias] .con-alq,
body[data-planta=concretos] .sin-alq{display:none}
.pie-doc{max-width:1320px;margin:0 auto;padding:22px 24px 40px;color:var(--steel);
     font-size:12.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
@media print{nav.idx,.selector{display:none}body{background:#fff}
  section{break-inside:avoid;box-shadow:none}}
@media(max-width:900px){nav.idx{display:none}.wrap{padding:0 14px 50px}}
"""

JS = """
const P={cuncia:{n:'Cuncia',t:'Mantenimiento Cuncia Gravicon',g:'Agregados',
  c:'GRV-INF-2026-CUNCIA-DISP'},
 concretos:{n:'Concretos',t:'Mantenimiento Concretos Gravicon',g:'Concretos',
  c:'GRV-INF-2026-CONCRETOS-DISP'},
 acacias:{n:'Acacías',t:'Mantenimiento Acacías Gravicon',g:'Agregados',
  c:'GRV-INF-2026-ACACIAS-DISP'}};
function pintar(k){const p=P[k];document.body.dataset.planta=k;
 document.querySelectorAll('.v-titulo').forEach(x=>x.textContent=p.t);
 document.querySelectorAll('.v-negocio').forEach(x=>x.textContent=p.g);
 document.querySelectorAll('.v-codigo').forEach(x=>x.textContent=p.c);
 document.querySelectorAll('.v-nombre').forEach(x=>x.textContent=p.n);
 document.querySelectorAll('.selector button').forEach(b=>
   b.setAttribute('aria-pressed', b.dataset.k===k));
 document.querySelectorAll('table.plantas tbody tr').forEach(tr=>
   tr.classList.toggle('fila-act', tr.dataset.k===k));}
document.querySelectorAll('.selector button').forEach(b=>
  b.addEventListener('click',()=>pintar(b.dataset.k)));
pintar('concretos');
const sec=[...document.querySelectorAll('section')],enl=[...document.querySelectorAll('nav.idx a')];
addEventListener('scroll',()=>{let i=0;sec.forEach((s,j)=>{
  if(s.getBoundingClientRect().top<160)i=j});
  enl.forEach((a,j)=>a.classList.toggle('act',j===i))},{passive:true});
"""


def main():
    cuerpo = "".join([sec_ficha(), sec_anatomia(), sec_portada(), sec_detalle(),
                      sec_mensaje(), sec_reglas(), sec_datos(), sec_visual()])
    idx = "".join(f"<li><a href='#{i}'>{t}</a></li>" for i, t in SEC)
    botones = "".join(
        f"<button data-k='{k}' aria-pressed='false'>{e(p['nombre'])}"
        f"<small>{e(p['negocio'])}</small></button>"
        for k, p in config.PLANTAS.items())
    css = P.G.css_variables() + DOC_CSS + prefijar(P.CSS)
    html = f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plantilla · Reporte de Disponibilidad de Flota — Gravicon</title>
<style>{css}</style></head><body data-planta="concretos">
<div class="hero"><div class="hero-in">
  <img src="{P._logo_uri()}" alt="Gravicon"/>
  <div><h1>Plantilla del Reporte de Disponibilidad</h1>
    <p>El formato que sale todos los días hábiles a las 8:30 para Cuncia, Concretos y
    Acacías: qué bloque va en cada página, de dónde sale cada cifra y qué regla la
    gobierna. Las vistas previas usan el mismo código y el mismo CSS que el PDF real,
    con datos de ejemplo.</p></div>
  <div class="selector">{botones}</div>
</div></div>
<div class="wrap"><nav class="idx"><ol>{idx}</ol></nav><main>{cuerpo}</main></div>
<div class="pie-doc"><span>Gravas y Concretos S.A. · Documento interno de formato</span>
  <span>Generado desde <code>plantilla.py</code> · {date.today():%d/%m/%Y}</span></div>
<script>{JS}</script></body></html>"""
    SALIDA.write_text(html, encoding="utf-8")
    print(f"✓ {SALIDA}  ({len(html)/1024:.0f} KB · {len(SEC)} secciones)")


if __name__ == "__main__":
    main()
