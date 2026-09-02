import { Router, type RequestHandler } from 'express'
import { analyzeAll, analyzeSpreadsheet, getSheetData, getSpreadsheetMeta } from '../api/_lib/sheets.js'
import { buildMantenimientoOtRows } from '../api/_lib/mantenimiento-ot.js'
import { loadDisponibilidadData } from '../api/_lib/disponibilidad.js'
import { loadCunciaProduccion, loadAcaciasProduccion } from '../api/_lib/produccion.js'
import { SPREADSHEETS } from '../api/_lib/google.js'
import {
  getSupabaseAdmin,
  authenticateRequest,
  handleLogin,
} from '../api/_lib/auth-helpers.js'

const VALID_KEYS = new Set(Object.keys(SPREADSHEETS))

/**
 * Crea un router Express con todas las rutas de la API.
 * Incluye autenticación, health check, spreadsheets, análisis y datos de negocio.
 * @param loginLimiter - Middleware opcional de rate limiting para login.
 * @returns Router de Express configurado.
 */
export function createApiRouter(loginLimiter?: RequestHandler) {
  const router = Router()

  /** POST /api/auth/login - Inicio de sesión con rate limiting opcional. */
  router.post('/auth/login', loginLimiter ?? ((_req, _res, next) => next()), async (req, res) => {
    const result = await handleLogin(req, { isProduction: process.env.NODE_ENV === 'production' })
    return res.status(result.status).json(result.body)
  })

  /** GET /api/health - Health check. */
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() })
  })

  /** GET /api/spreadsheets - Lista todos los spreadsheets registrados. */
  router.get('/spreadsheets', authenticateRequest, async (_req, res) => {
    try {
      const list = Object.entries(SPREADSHEETS).map(([key, id]) => ({ key, id }))
      res.json(list)
    } catch (err) {
      console.error('[spreadsheets]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/spreadsheets/meta?key= - Metadatos de un spreadsheet. */
  router.get('/spreadsheets/meta', authenticateRequest, async (req, res) => {
    try {
      const key = req.query.key as string
      if (!key || !VALID_KEYS.has(key)) {
        return res.status(400).json({ error: 'Invalid spreadsheet key' })
      }
      const sheets = await getSpreadsheetMeta(key)
      res.json({ key, sheets })
    } catch (err) {
      console.error('[spreadsheets-meta]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/spreadsheets/data?key=&sheet= - Datos de un spreadsheet/hoja. */
  router.get('/spreadsheets/data', authenticateRequest, async (req, res) => {
    try {
      const key = req.query.key as string
      if (!key || !VALID_KEYS.has(key)) {
        return res.status(400).json({ error: 'Invalid spreadsheet key' })
      }
      const sheetName = req.query.sheet as string | undefined
      if (sheetName && !/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s&-]+$/.test(sheetName)) {
        return res.status(400).json({ error: 'Invalid sheet name' })
      }
      const data = await getSheetData(key, sheetName)
      res.json(data)
    } catch (err) {
      console.error('[spreadsheets-data]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/spreadsheets/analyze?key= - Análisis de un spreadsheet. */
  router.get('/spreadsheets/analyze', authenticateRequest, async (req, res) => {
    try {
      const key = req.query.key as string
      if (!key || !VALID_KEYS.has(key)) {
        return res.status(400).json({ error: 'Invalid spreadsheet key' })
      }
      const id = SPREADSHEETS[key]
      if (!id) return res.status(404).json({ error: 'Not found' })
      const analysis = await analyzeSpreadsheet(key, id)
      res.json(analysis)
    } catch (err) {
      console.error('[spreadsheets-analyze]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/analyze-all - Analiza todos los spreadsheets. */
  router.get('/analyze-all', authenticateRequest, async (_req, res) => {
    try {
      const results = await analyzeAll()
      res.json(results)
    } catch (err) {
      console.error('[analyze-all]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/proyecciones-clientes/data - Proyecciones de clientes desde Supabase. */
  router.get('/proyecciones-clientes/data', authenticateRequest, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('proyecciones_clientes')
        .select('*')
        .order('fecha', { ascending: true })
        .limit(100000)
      if (error) throw error
      res.json({ rows: data ?? [], total: data?.length ?? 0 })
    } catch (err) {
      console.error('[proyecciones-clientes]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/proyecciones-planta/data - Proyecciones diarias por planta. */
  router.get('/proyecciones-planta/data', authenticateRequest, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('proyecciones_planta')
        .select('*')
        .order('fecha', { ascending: true })
        .limit(100000)
      if (error) throw error
      res.json({ rows: data ?? [], total: data?.length ?? 0 })
    } catch (err) {
      console.error('[proyecciones-planta]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/mantenimiento-ot-cuncia/data - OT Cuncía + Sub OT + Sopled + Sub Sopled. */
  router.get('/mantenimiento-ot-cuncia/data', authenticateRequest, async (req, res) => {
    try {
      const force = req.query.force === 'true'
      const rows = await buildMantenimientoOtRows('ordenes_ot_cuncia', 'maestro_cuncia', 'CUNCIA', force)
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[mantenimiento-ot-cuncia]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/mantenimiento-ot-acacias/data - OT Acacias + Sub OT + Sopled + Sub Sopled. */
  router.get('/mantenimiento-ot-acacias/data', authenticateRequest, async (req, res) => {
    try {
      const force = req.query.force === 'true'
      const rows = await buildMantenimientoOtRows('ordenes_ot_acacias', 'maestro_acacias', 'ACACIAS', force)
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[mantenimiento-ot-acacias]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/mantenimiento-ot-concretos/data - OT Concretos + Sub OT + Sopled + Sub Sopled. */
  router.get('/mantenimiento-ot-concretos/data', authenticateRequest, async (req, res) => {
    try {
      const force = req.query.force === 'true'
      const rows = await buildMantenimientoOtRows('ordenes_ot_concretos', 'maestro_concretos', 'CONCRETOS', force)
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[mantenimiento-ot-concretos]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/disponibilidad/data - Datos de disponibilidad placa a placa y tareas por planta. */
  router.get('/disponibilidad/data', authenticateRequest, async (req, res) => {
    try {
      const planta = (String(req.query.planta ?? 'cuncia').toLowerCase()) as any
      const force = req.query.force === 'true'
      const data = await loadDisponibilidadData(planta, force)
      res.json(data)
    } catch (err) {
      console.error('[disponibilidad-data]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/produccion-agregados-acacias/data - Producción agregados Acacias (Supabase). */
  router.get('/produccion-agregados-acacias/data', authenticateRequest, async (_req, res) => {
    try {
      const result = await loadAcaciasProduccion()
      res.json(result)
    } catch (err) {
      console.error('[produccion-agregados-acacias]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/produccion-agregados-cuncia/data - Producción agregados Cuncia (Supabase). */
  router.get('/produccion-agregados-cuncia/data', authenticateRequest, async (_req, res) => {
    try {
      const result = await loadCunciaProduccion()
      res.json(result)
    } catch (err) {
      console.error('[produccion-agregados-cuncia]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/programacion-agregados/data - Programación de agregados desde Zoho Creator. */
  router.get('/programacion-agregados/data', authenticateRequest, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('registros_zoho_creator_programacion_agregados')
        .select('*')
        .order('fecha_de_servicio', { ascending: false })
        .limit(100000)
      if (error) throw error
      res.json({ rows: data ?? [], total: data?.length ?? 0 })
    } catch (err) {
      console.error('[programacion-agregados]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/concreto/data - Datos de concreto (order_price + order_detail). */
  router.get('/concreto/data', authenticateRequest, async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin()
      const limit = 100000
      const [resPrice, resDetail] = await Promise.all([
        supabase.from('order_price').select('*', { count: 'exact', head: false }).limit(limit),
        supabase.from('order_detail').select('remision,tiempos_hphora_programada').limit(limit),
      ])
      if (resPrice.error) throw resPrice.error
      if (resDetail.error) throw resDetail.error
      if (resPrice.count && resPrice.count > limit) {
        console.warn(`[concreto-data] order_price truncado: ${resPrice.count} filas, devolviendo ${limit}`)
      }
      res.json({ price: resPrice.data, detail: resDetail.data, count: resPrice.count })
    } catch (err) {
      console.error('[concreto-data]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/admin/users - Lista usuarios reales de Supabase Auth (solo admin) */
  router.get('/admin/users', authenticateRequest, async (req, res) => {
    try {
      const user = (req as any).user
      const role = (user as any)?.user_metadata?.role || (user as any)?.app_metadata?.role
      if (role !== 'admin') return res.status(403).json({ error: 'Forbidden: solo admin' })
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) throw error
      const users = data.users.map(u => ({ id: u.id, email: u.email, role: (u.user_metadata as any)?.role || (u.app_metadata as any)?.role || 'usuario', created_at: u.created_at }))
      res.json({ users })
    } catch (err) {
      console.error('[admin-users]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** GET /api/admin/permisos?email= - Permisos de un usuario */
  router.get('/admin/permisos', authenticateRequest, async (req, res) => {
    try {
      const email = String(req.query.email ?? '').trim()
      if (!email) return res.status(400).json({ error: 'email requerido' })
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.from('permisos_vista').select('vista,permitido').eq('email', email)
      if (error) throw error
      res.json({ perms: data ?? [] })
    } catch (err) {
      console.error('[admin-permisos-get]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** POST /api/admin/permisos - Guardar permisos (solo admin) */
  router.post('/admin/permisos', authenticateRequest, async (req, res) => {
    try {
      const user = (req as any).user
      const role = (user as any)?.user_metadata?.role || (user as any)?.app_metadata?.role
      if (role !== 'admin') return res.status(403).json({ error: 'Forbidden: solo admin' })
      const { email, perms } = req.body as { email: string; perms: Record<string, boolean> }
      if (!email || !perms || typeof perms !== 'object') return res.status(400).json({ error: 'email y perms requeridos' })
      const supabase = getSupabaseAdmin()
      const { data: list } = await supabase.auth.admin.listUsers()
      const target = list.users.find(u => u.email === email)
      const user_id = target?.id ?? null
      await (supabase as any).from('permisos_vista').delete().eq('email', email)
      const rows = Object.entries(perms).map(([vista, permitido]) => ({ email, vista, permitido, user_id }))
      if (rows.length) {
        const { error } = await (supabase as any).from('permisos_vista').insert(rows as any)
        if (error) throw error
      }
      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-permisos-post]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** GET /api/pdf-resolve - Resuelve redirecciones de enlaces PDF de Google Drive. */
  router.get('/pdf-resolve', async (req, res) => {
    const url = req.query.url
    if (typeof url !== 'string' || !url) {
      return res.status(400).json({ error: 'url required' })
    }
    try {
      const resp = await fetch(url, { redirect: 'follow' })
      const finalUrl = resp.url
      const m = finalUrl.match(/\/d\/([^/?]+)/)
      if (m) {
        res.json({ previewUrl: `https://drive.google.com/file/d/${m[1]}/preview` })
      } else {
        res.status(404).json({ error: 'No se pudo resolver el enlace del PDF' })
      }
    } catch (err) {
      console.error('[pdf-resolve]', err)
      res.status(500).json({ error: 'Error resolving PDF URL' })
    }
  })

  return router
}
