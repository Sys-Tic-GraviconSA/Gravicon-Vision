import { computed, type ComputedRef } from 'vue'
import type { SheetData } from '../stores/concreto'
import type { DashboardData, PlantOpData } from '../types'
import { parseRows } from './useConcretoData'
import { getWeekNumber } from '../utils/dates'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Formatea fecha ISO a "D MMM" (ej. "5 Ene") */
export const fmtDate = (iso: string) => {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]}`
}

/** Extrae clave YYYY-MM de una fecha ISO */
const monthKeyFromDate = (iso: string) => iso?.slice(0, 7) || ''

/** Parsea string ISO a Date usando zona horaria -05:00 (Colombia) */
function isoToDate(iso: string): Date {
  if (!iso) return new Date()
  return new Date(iso + 'T12:00:00-05:00')
}

/** Obtiene el número de día de la semana (0=Dom, 6=Sáb) desde ISO */
function getDayNum(iso: string): number {
  return isoToDate(iso).getDay()
}

/** Determina si un servicio implica bomba de concreto (excluye estacionaria) */
function isConBomba(servicio: string): boolean {
  return servicio !== 'Sin Bomba' && servicio !== '' && !servicio.toLowerCase().includes('estacionaria')
}



/**
 * Composable principal del dashboard de concreto.
 * Procesa datos crudos de SheetData en un único barrido (single pass) para
 * generar todas las métricas agregadas: KPIs, plantas, clientes, obras,
 * mixers, bombas, conductores, resistencias, tendencias y datos operativos
 * por planta (horario, diario, semanal, día de semana).
 *
 * Separa filas de concreto (concRows) de filas de agregados (aggRows) y
 * produce DATA (DashboardData) y PLANT_OP (por planta).
 */
export function useDashboardData(data: ComputedRef<SheetData | null>, lastUpdate?: ComputedRef<string | null>) {
  const rows = computed(() => parseRows(data.value))

  const DATA = computed<DashboardData>(() => {
    const concRows = rows.value.filter(r => !r.isAgg)
    const aggRows = rows.value.filter(r => r.isAgg)

    function extractResistencia(mezcla: string): string {
      const values = mezcla.match(/\b(14|17|21|24|28|35|40)\b/g)
      if (values) {
        const max = Math.max(...values.map(Number))
        return `${max} MPa`
      }
      return '21 MPa'
    }

    // ── single pass: build ALL maps + accumulate KPIs ──
    let tVol = 0, tDesp = 0, despConBombeo = 0
    const clientesSet = new Set<string>()
    const obrasSet = new Set<string>()
    const mixersSet = new Set<string>()
    const fechasSet = new Set<string>()
    const monthsSet = new Set<string>()

    const byCliente = new Map<string, { vols: number[]; plantas: Set<string>; obras: Set<string>; despachos: number; conBomba: number }>()
    const byObra = new Map<string, { vols: number[]; cliente: string; planta: string; despachos: number }>()
    const byMezcla = new Map<string, { vols: number[]; despachos: number }>()
    const byResistencia = new Map<string, { vols: number[]; despachos: number }>()
    const semanalMap = new Map<number, Record<string, number>>()
    const byPlanta = new Map<string, { vols: number[]; despachos: number; clientes: Set<string>; obras: Set<string>; conBomba: number }>()
    const byMixer = new Map<string, number[]>()
    const byConductor = new Map<string, number[]>()
    const byBomba = new Map<string, { vols: number[]; operarios: Set<string> }>()
    const byPlantaBombeo = new Map<string, { con: number[]; sin: number[] }>()
    const cliPorPlanta = new Map<string, Map<string, number[]>>()

    for (const r of concRows) {
      tVol += r.cant; tDesp++
      if (isConBomba(r.servicio)) despConBombeo++
      clientesSet.add(r.cliente)
      obrasSet.add(r.proyecto || r.frente || '')
      if (r.mixer) mixersSet.add(r.mixer)
      fechasSet.add(r.fecha)
      monthsSet.add(monthKeyFromDate(r.fecha))

      // byCliente
      const cl = byCliente.get(r.cliente) ?? { vols: [], plantas: new Set(), obras: new Set(), despachos: 0, conBomba: 0 }
      cl.vols.push(r.cant); cl.plantas.add(r.planta); cl.despachos++; if (isConBomba(r.servicio)) cl.conBomba++
      byCliente.set(r.cliente, cl)

      // byObra
      const pr = r.proyecto || r.frente || 'Sin Obra'
      const ob = byObra.get(pr) ?? { vols: [], cliente: r.cliente, planta: r.planta, despachos: 0 }
      ob.vols.push(r.cant); ob.despachos++
      byObra.set(pr, ob)

      // byMezcla
      const mz = byMezcla.get(r.mezcla) ?? { vols: [], despachos: 0 }
      mz.vols.push(r.cant); mz.despachos++
      byMezcla.set(r.mezcla, mz)

      // byResistencia
      const resistencia = extractResistencia(r.mezcla)
      const rs = byResistencia.get(resistencia) ?? { vols: [], despachos: 0 }
      rs.vols.push(r.cant); rs.despachos++
      byResistencia.set(resistencia, rs)

      // semanal stacked
      const wk = getWeekNumber(r.fechaSerial)
      const sc = semanalMap.get(wk) ?? {}
      sc[r.planta] = (sc[r.planta] || 0) + r.cant
      semanalMap.set(wk, sc)

      // byPlanta
      const pl = byPlanta.get(r.planta) ?? { vols: [], despachos: 0, clientes: new Set(), obras: new Set(), conBomba: 0 }
      pl.vols.push(r.cant); pl.despachos++; pl.clientes.add(r.cliente); pl.obras.add(r.proyecto || r.frente || ''); if (isConBomba(r.servicio)) pl.conBomba++
      byPlanta.set(r.planta, pl)

      // byMixer
      if (r.mixer) {
        const mx = byMixer.get(r.mixer) ?? []
        mx.push(r.cant)
        byMixer.set(r.mixer, mx)
      }

      // byConductor
      if (r.conductor) {
        const cd = byConductor.get(r.conductor) ?? []
        cd.push(r.cant)
        byConductor.set(r.conductor, cd)
      }

      // byBomba
      if (isConBomba(r.servicio)) {
        const bomba = r.bomba || r.servicio || 'Autobomba'
        const bb = byBomba.get(bomba) ?? { vols: [], operarios: new Set() }
        bb.vols.push(r.cant)
        if (r.operario) bb.operarios.add(r.operario)
        byBomba.set(bomba, bb)
      }

      // byPlantaBombeo
      const pbm = byPlantaBombeo.get(r.planta) ?? { con: [], sin: [] }
      if (isConBomba(r.servicio)) pbm.con.push(r.cant)
      else pbm.sin.push(r.cant)
      byPlantaBombeo.set(r.planta, pbm)

      // clientesPorPlanta (nested map)
      let pp = cliPorPlanta.get(r.planta)
      if (!pp) { pp = new Map(); cliPorPlanta.set(r.planta, pp) }
      const pcli = pp.get(r.cliente) ?? []
      pcli.push(r.cant)
      pp.set(r.cliente, pcli)
    }

    // ── derived values from maps (O(m) only) ──
    const clientes = [...byCliente.entries()].map(([cliente, v]) => ({
      cliente,
      volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
      despachos: v.despachos,
      plantas: [...v.plantas].sort(),
      obras: v.obras.size,
      promDespacho: +(v.vols.reduce((a, b) => a + b, 0) / v.despachos).toFixed(1),
      pctBombeo: +((v.conBomba / v.despachos) * 100).toFixed(1),
    })).sort((a, b) => b.volDespachado - a.volDespachado)

    const obras = [...byObra.entries()].map(([obra, v]) => ({
      obra,
      volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
      despachos: v.despachos,
      cliente: v.cliente,
      planta: v.planta,
    })).sort((a, b) => b.volDespachado - a.volDespachado)

    const resistencias = [...byResistencia.entries()].map(([resistencia, v]) => ({
      resistencia,
      valor: parseInt(resistencia.replace(/\D/g, ''), 10) || 0,
      volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
      despachos: v.despachos,
    })).sort((a, b) => b.volDespachado - a.volDespachado)

    const elementos = [...byMezcla.entries()].map(([elemento, v]) => ({
      elemento,
      volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
      despachos: v.despachos,
      pctTotal: tVol ? +((v.vols.reduce((a, b) => a + b, 0) / tVol) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.volDespachado - a.volDespachado)

    const semanalStacked = [...semanalMap.entries()].map(([num, plantas]) => ({
      semana: `S${num}`,
      Acacias: +(plantas['Acacias'] || 0).toFixed(2),
      Restrepo: +(plantas['Restrepo'] || 0).toFixed(2),
      Villavicencio: +(plantas['Villavicencio'] || 0).toFixed(2),
    })).sort((a, b) => a.semana.localeCompare(b.semana))

    const plantas = ['Acacias', 'Restrepo', 'Villavicencio'].map(p => {
      const cur = byPlanta.get(p) ?? { vols: [], despachos: 0, clientes: new Set(), obras: new Set(), conBomba: 0 }
      const vol = cur.vols.reduce((a, b) => a + b, 0)
      return {
        planta: p,
        despachos: cur.despachos,
        volProgramado: 0,
        volDespachado: +vol.toFixed(2),
        promDespacho: cur.despachos ? +(vol / cur.despachos).toFixed(1) : 0,
        clientesUnicos: cur.clientes.size,
        obrasActivas: cur.obras.size,
        pctBombeo: cur.despachos ? +((cur.conBomba / cur.despachos) * 100).toFixed(1) : 0,
      }
    }).sort((a, b) => b.volDespachado - a.volDespachado)

    const mixers = [...byMixer.entries()].map(([mixer, vols]) => ({
      mixer,
      volDespachado: +vols.reduce((a, b) => a + b, 0).toFixed(2),
      viajes: vols.length,
      promCarga: +(vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(1),
    })).sort((a, b) => b.volDespachado - a.volDespachado)

    const conductores = [...byConductor.entries()].map(([conductor, vols]) => ({
      conductor,
      viajes: vols.length,
      volTransportado: +vols.reduce((a, b) => a + b, 0).toFixed(2),
    })).sort((a, b) => b.volTransportado - a.volTransportado)

    const bombas = [...byBomba.entries()].map(([bomba, v]) => {
      const totalVol = v.vols.reduce((a, b) => a + b, 0)
      const bombeos = v.vols.length
      return {
        bomba,
        volBombeado: +totalVol.toFixed(2),
        servicios: bombeos,
        operario: v.operarios.size === 1 ? [...v.operarios][0] : undefined,
        bombeos,
        volPorBombeo: bombeos ? +(totalVol / bombeos).toFixed(1) : undefined,
      }
    }).sort((a, b) => b.volBombeado - a.volBombeado)

    const bombeoPorPlanta = ['Acacias', 'Restrepo', 'Villavicencio'].map(p => {
      const cur = byPlantaBombeo.get(p) ?? { con: [], sin: [] }
      return {
        planta: p,
        conBombeo: +cur.con.reduce((a, b) => a + b, 0).toFixed(2),
        sinBombeo: +cur.sin.reduce((a, b) => a + b, 0).toFixed(2),
      }
    })

    const clientesPorPlanta: DashboardData['clientesPorPlanta'] = { Acacias: [], Restrepo: [], Villavicencio: [] }
    for (const p of ['Acacias', 'Restrepo', 'Villavicencio'] as const) {
      const clMap = cliPorPlanta.get(p)
      if (clMap) {
        clientesPorPlanta[p] = [...clMap.entries()].map(([cliente, vols]) => ({
          cliente,
          volDespachado: +vols.reduce((a, b) => a + b, 0).toFixed(2),
          despachos: vols.length,
        })).sort((a, b) => b.volDespachado - a.volDespachado)
      }
    }

    const fechas = [...fechasSet].sort()
    const fechaInicio = fechas[0] || ''
    const fechaFin = fechas[fechas.length - 1] || ''
    const availableMonths = [...monthsSet].sort()

    // ── AGREGADOS (single pass) ──
    let aggVol = 0, aggDesp = 0
    const byClientAgg = new Map<string, { vol: number; desp: number }>()
    const bySemanaAgg = new Map<number, { vol: number; desp: number }>()
    const byMezclaAgg = new Map<string, { vol: number; desp: number }>()
    const aggClientesSet = new Set<string>()

    for (const r of aggRows) {
      aggVol += r.cant; aggDesp++
      aggClientesSet.add(r.cliente)

      const ca = byClientAgg.get(r.cliente) ?? { vol: 0, desp: 0 }
      ca.vol += r.cant; ca.desp++
      byClientAgg.set(r.cliente, ca)

      const wk = getWeekNumber(r.fechaSerial)
      const sa = bySemanaAgg.get(wk) ?? { vol: 0, desp: 0 }
      sa.vol += r.cant; sa.desp++
      bySemanaAgg.set(wk, sa)

      const mz = r.mezcla || 'Desconocido'
      const ma = byMezclaAgg.get(mz) ?? { vol: 0, desp: 0 }
      ma.vol += r.cant; ma.desp++
      byMezclaAgg.set(mz, ma)
    }

    const totalAggVol = aggVol || 1
    const agg = {
      kpis: {
        totalVol: +aggVol.toFixed(2),
        despachos: aggDesp,
        clientes: aggClientesSet.size,
        promDespacho: aggDesp ? +(aggVol / aggDesp).toFixed(1) : 0
      },
      clientes: [...byClientAgg.entries()].map(([cliente, v]) => ({
        cliente, volDespachado: +v.vol.toFixed(2), despachos: v.desp
      })).sort((a, b) => b.volDespachado - a.volDespachado),
      semanal: [...bySemanaAgg.entries()].map(([semana, v]) => ({
        semana, label: `S${semana}`, volDespachado: +v.vol.toFixed(2), despachos: v.desp
      })).sort((a, b) => a.semana - b.semana),
      mezclas: [...byMezclaAgg.entries()].map(([mezcla, v]) => ({
        mezcla, volDespachado: +v.vol.toFixed(2), despachos: v.desp,
        pct: +((v.vol / totalAggVol) * 100).toFixed(1)
      })).sort((a, b) => b.volDespachado - a.volDespachado)
    }

    return {
      kpis: {
        totalDespachos: tDesp,
        totalVolProgramado: 0,
        totalVolDespachado: +tVol.toFixed(2),
        totalCancelado: 0,
        cumplimiento: 0,
        volPromDespacho: tDesp ? +(tVol / tDesp).toFixed(1) : 0,
        clientesUnicos: clientesSet.size,
        obrasActivas: obrasSet.size,
        diasOperacion: fechas.length,
        mixersActivos: mixersSet.size,
        despachosConBombeo: despConBombeo,
        pctBombeo: tDesp ? +((despConBombeo / tDesp) * 100).toFixed(1) : 0,
        volBajoCO2: 15,
      },
      plantas,
      semanalStacked,
      clientes,
      elementos,
      obras,
      mixers,
      bombas,
      conductores,
      resistencias,
      bombeoPorPlanta,
      clientesPorPlanta,
      meta: { fechaInicio, fechaFin, availableMonths, lastUpdate: lastUpdate?.value ?? undefined },
      agg,
    }
  })

  const PLANT_OP = computed<Record<string, PlantOpData>>(() => {
    const result: Record<string, PlantOpData> = {}
    const allRows = rows.value.filter(r => !r.isAgg)

    const buildOne = (rows: typeof allRows): PlantOpData => {
      const byFecha = new Map<string, number[]>()
      const byMixer = new Map<string, { vols: number[]; clientes: Set<string>; obras: Set<string> }>()
      for (const r of rows) {
        const cur = byFecha.get(r.fecha) ?? []
        cur.push(r.cant)
        byFecha.set(r.fecha, cur)
        const mc = byMixer.get(r.mixer) ?? { vols: [], clientes: new Set(), obras: new Set() }
        mc.vols.push(r.cant); mc.clientes.add(r.cliente); mc.obras.add(r.proyecto || r.frente || '')
        byMixer.set(r.mixer, mc)
      }

      let diario = [...byFecha.entries()].map(([fecha, vols]) => ({
        fecha,
        volDespachado: +vols.reduce((a, b) => a + b, 0).toFixed(2),
        despachos: vols.length,
      })).sort((a, b) => a.fecha.localeCompare(b.fecha))
      if (diario.length >= 2) {
        const dateMap = new Map(diario.map(d => [d.fecha, d]))
        const start = isoToDate(diario[0].fecha)
        const end = isoToDate(diario[diario.length - 1].fecha)
        const filled: typeof diario = []
        const cur = new Date(start)
        while (cur <= end) {
          const key = cur.toISOString().slice(0, 10)
          filled.push(dateMap.get(key) ?? { fecha: key, volDespachado: 0, despachos: 0 })
          cur.setDate(cur.getDate() + 1)
        }
        diario = filled
      }

      const horaMap = new Map<number, { vol: number; desp: number }>()
      for (const r of rows) {
        if (r.hora != null) {
          const cur = horaMap.get(r.hora) ?? { vol: 0, desp: 0 }
          cur.vol += r.cant; cur.desp++
          horaMap.set(r.hora, cur)
        }
      }
      const horario = Array.from({ length: 14 }, (_, i) => {
        const h = i + 4
        const cur = horaMap.get(h) ?? { vol: 0, desp: 0 }
        return { hora: h, label: `${String(h).padStart(2, '0')}:00`, volDespachado: +cur.vol.toFixed(2), despachos: cur.desp }
      })

      const semanasMap = new Map<number, { vols: number[]; clientes: Set<string>; viajes: number }>()
      for (const r of rows) {
        const wk = getWeekNumber(r.fechaSerial)
        const cur = semanasMap.get(wk) ?? { vols: [], clientes: new Set(), viajes: 0 }
        cur.vols.push(r.cant); cur.clientes.add(r.cliente); cur.viajes++
        semanasMap.set(wk, cur)
      }
      const semanal = [...semanasMap.entries()].map(([semana, v]) => ({
        semana,
        label: `S${semana}`,
        volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
        despachos: v.viajes,
        clientesActivos: v.clientes.size,
        promDespacho: v.viajes ? +(v.vols.reduce((a, b) => a + b, 0) / v.viajes).toFixed(1) : 0,
      })).sort((a, b) => a.semana - b.semana)

      const byDiaNum = new Map<number, { vols: number[]; despachos: number; dias: Set<string> }>()
      for (const r of rows) {
        const dn = getDayNum(r.fecha)
        const cur = byDiaNum.get(dn) ?? { vols: [], despachos: 0, dias: new Set() }
        cur.vols.push(r.cant); cur.despachos++; cur.dias.add(r.fecha)
        byDiaNum.set(dn, cur)
      }
      const diaSemana = [...byDiaNum.entries()].map(([diaNum, v]) => ({
        dia: DAY_NAMES[diaNum] || 'N/A',
        diaNum,
        volDespachado: +v.vols.reduce((a, b) => a + b, 0).toFixed(2),
        despachos: v.despachos,
        promVol: v.dias.size ? +(v.vols.reduce((a, b) => a + b, 0) / v.dias.size).toFixed(1) : 0,
      })).sort((a, b) => a.diaNum - b.diaNum)

      const totalVol = rows.reduce((s, r) => s + r.cant, 0)
      return {
        horario,
        diario,
        semanal,
        diaSemana,
        kpis: {
          totalVol: +totalVol.toFixed(2),
          despachos: rows.length,
          clientes: new Set(rows.map(r => r.cliente)).size,
          obras: new Set(rows.map(r => r.proyecto || r.frente || '')).size,
          promDespacho: rows.length ? +(totalVol / rows.length).toFixed(1) : 0,
          diasOp: new Set(rows.map(r => r.fecha)).size,
          pctBombeo: rows.length ? +((rows.filter(r => isConBomba(r.servicio)).length / rows.length) * 100).toFixed(1) : 0,
        },
      }
    }

    result['Todas'] = buildOne(allRows)
    for (const p of ['Acacias', 'Restrepo', 'Villavicencio'] as const) {
      result[p] = buildOne(allRows.filter(r => r.planta === p))
    }
    return result
  })

  return { DATA, PLANT_OP }
}
