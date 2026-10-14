/**
 * useGraficasComercial.ts — Gráficas del módulo Comercial (Leads, F227 y Embudo) con el mismo estilo de
 * Concretos y Mantenimiento (useGraficasConcreto): barras por mes, comparativos horizontales
 * (total vs. logrado con su tasa), donas y el embudo.
 */
import { computed } from 'vue'
import { use } from 'echarts/core'
import { FunnelChart } from 'echarts/charts'
import { donaCentro } from '../../utils/chartLayout'
import { MESES_CORTOS, FONT, fmtN, pct, punto, vacio, useEstiloGraficas } from '../../composables/useGraficasConcreto'
import { tasa } from '../../composables/useComercial'

use([FunnelChart])

export const GRIS_CLARO = '#cbd5e1', GRIS_OSCURO = '#334155'
export const AZUL = '#3B82F6', VERDE = '#16A34A', MORADO = '#8B5CF6', AMBAR = '#F59E0B'

/** «2026-03» → «Mar 26» */
export const etiquetaMes = (m: string) => `${MESES_CORTOS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`

export interface Serie { name: string; color: string; data: number[] }
export interface Comparativo { nombre: string; total: number; logrado: number }

export function useGraficasComercial() {
  const { isLight, chartTextColor, labelPill, base, leyenda, ejeX, ejeY, barrasH, zoom } = useEstiloGraficas()
  const gris = computed(() => (isLight.value ? GRIS_CLARO : GRIS_OSCURO))
  const tinta = computed(() => (isLight.value ? '#0f172a' : '#f1f5f9'))

  /**
   * Barras por mes. `etiqueta` (opcional) va encima de la última serie, p. ej. la tasa del mes.
   */
  function porMes(meses: string[], series: Serie[], fmt: (v: number) => string, etiqueta?: (i: number) => string) {
    const z = zoom(meses.length)
    return vacio({
      ...base(),
      tooltip: {
        trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
        formatter: (ps: any[]) => `<b>${ps[0].axisValueLabel}</b><br/>` +
          ps.map(p => `${punto(p.color)} ${p.seriesName}: <b>${fmt(Number(p.value) || 0)}</b>`).join('<br/>') +
          (etiqueta ? `<br/>${etiqueta(ps[0].dataIndex)}` : ''),
      },
      legend: leyenda(series.map(s => ({ name: s.name, itemStyle: { color: s.color } }))),
      grid: { left: 12, right: 12, top: 44, bottom: z.gridBottom, containLabel: true },
      xAxis: ejeX(meses.map(etiquetaMes)),
      yAxis: ejeY(),
      dataZoom: z.dataZoom,
      series: series.map((s, i) => ({
        name: s.name, type: 'bar' as const, barMaxWidth: 26, barGap: '10%', data: s.data,
        itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
        label: i === series.length - 1
          ? { ...labelPill.value, position: 'top' as const, formatter: (x: any) => (etiqueta ? etiqueta(x.dataIndex) : fmt(x.value)) }
          : { show: false },
      })),
    }, meses.length > 0)
  }

  /**
   * Comparativo horizontal: barra gris = total (p. ej. cotizaciones) y de color = logrado (aprobadas),
   * con «logrado / total · tasa» a la derecha. Ordenado por total.
   */
  function comparativo(items: Comparativo[], nombres: { total: string; logrado: string }, color = AZUL, fmt: (v: number) => string = v => fmtN(v)) {
    const lista = [...items].sort((a, b) => b.total - a.total)
    const textos = lista.map(x => `${fmt(x.logrado)} / ${fmt(x.total)} · ${pct(tasa(x.logrado, x.total), 0)}`)
    return vacio(barrasH(lista.map(x => x.nombre), [
      { name: nombres.total, type: 'bar', barWidth: '62%', barGap: '-100%', data: lista.map(x => x.total), itemStyle: { color: gris.value, borderRadius: [0, 4, 4, 0] }, label: { show: false } },
      {
        name: nombres.logrado, type: 'bar', barWidth: '62%', data: lista.map(x => x.logrado), itemStyle: { color, borderRadius: [0, 4, 4, 0] },
        label: { ...labelPill.value, position: 'right', formatter: (x: any) => textos[x.dataIndex] },
      },
    ], textos, {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = lista[ps[0].dataIndex]
        return `<b>${x.nombre}</b><br/>${punto(gris.value)} ${nombres.total}: <b>${fmt(x.total)}</b><br/>${punto(color)} ${nombres.logrado}: <b>${fmt(x.logrado)}</b> (${pct(tasa(x.logrado, x.total))})` },
    }, false), lista.length > 0)
  }

  /** Barras horizontales simples (un valor por categoría) */
  function ranking(items: { nombre: string; valor: number; detalle?: string }[], color: string, fmt: (v: number) => string) {
    const lista = [...items].sort((a, b) => b.valor - a.valor)
    const textos = lista.map(x => fmt(x.valor))
    return vacio(barrasH(lista.map(x => x.nombre), [{
      name: 'Valor', type: 'bar', barWidth: '62%', data: lista.map(x => x.valor), itemStyle: { color, borderRadius: [0, 4, 4, 0] },
      label: { ...labelPill.value, position: 'right', formatter: (x: any) => textos[x.dataIndex] },
    }], textos, {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (ps: any[]) => { const x = lista[ps[0].dataIndex]; return `<b>${x.nombre}</b><br/>${punto(color)} <b>${fmt(x.valor)}</b>${x.detalle ? `<br/>${x.detalle}` : ''}` },
    }, false), lista.length > 0)
  }

  function dona(items: { name: string; value: number; color: string }[], centro: string, sub: string, fmt: (v: number) => string = v => fmtN(v)) {
    const lista = items.filter(x => x.value > 0)
    return vacio({
      ...base(),
      tooltip: { trigger: 'item' as const, formatter: (p: any) => `${punto(p.color)} <b>${p.name}</b><br/>${fmt(p.value)} (${pct(p.percent)})` },
      legend: {
        orient: 'vertical' as const, right: 8, top: 'middle', icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 12,
        textStyle: { fontFamily: FONT, fontWeight: 600 as const, color: chartTextColor.value, fontSize: 11 },
        data: lista.map(x => x.name),
        formatter: (n: string) => { const x = lista.find(y => y.name === n); return x ? `${n}  ${fmt(x.value)}` : n },
      },
      series: [donaCentro({ center: ['34%', '52%'], radio: '42%', valor: centro, sub, font: FONT, color: tinta.value, colorSub: chartTextColor.value }), {
        type: 'pie' as const, radius: ['42%', '68%'], center: ['34%', '52%'],
        itemStyle: { borderRadius: 4, borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 2 },
        label: { show: true, position: 'inside' as const, formatter: (p: any) => (p.percent >= 5 ? pct(p.percent, 0) : ''), fontSize: 11, fontWeight: 700, fontFamily: FONT, color: '#fff' },
        labelLine: { show: false },
        data: lista.map(x => ({ name: x.name, value: x.value, itemStyle: { color: x.color } })),
      }],
    }, lista.length > 0)
  }

  /** Embudo: cada etapa con su cantidad y el % frente a la primera (las etapas no se reordenan) */
  function embudo(etapas: { name: string; value: number; color: string; nota?: string }[]) {
    const primero = etapas[0]?.value ?? 0
    return vacio({
      ...base(),
      tooltip: { trigger: 'item' as const, formatter: (p: any) => { const e = etapas[p.dataIndex]
        return `${punto(e.color)} <b>${e.name}</b><br/>${fmtN(e.value)} clientes · ${pct(tasa(e.value, primero))} de los posibles clientes` +
          (p.dataIndex > 0 && etapas[p.dataIndex - 1].value ? `<br/>${pct(tasa(e.value, etapas[p.dataIndex - 1].value))} de la etapa anterior` : '') +
          (e.nota ? `<br/><span style="color:#94a3b8">${e.nota}</span>` : '') } },
      series: [{
        type: 'funnel' as const, sort: 'none' as const, left: '8%', right: '8%', top: 12, bottom: 12, minSize: '18%', maxSize: '100%', gap: 4,
        label: { show: true, position: 'inside' as const, fontFamily: FONT, fontSize: 12, fontWeight: 700 as const, color: '#fff',
          formatter: (p: any) => `${p.name}\n${fmtN(p.value)} · ${pct(tasa(p.value, primero), 0)}` },
        itemStyle: { borderColor: isLight.value ? '#fff' : '#0b0f1a', borderWidth: 1 },
        data: etapas.map(e => ({ name: e.name, value: e.value, itemStyle: { color: e.color } })),
      }],
    }, primero > 0)
  }

  return { porMes, comparativo, ranking, dona, embudo, gris }
}
