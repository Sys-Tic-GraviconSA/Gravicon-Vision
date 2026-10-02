import { Router, type RequestHandler } from 'express'
import compression from 'compression'
import { conCache, TTL_SUPABASE_MS } from '../api/_lib/cache.js'
import { analyzeAll, analyzeSpreadsheet, getSheetData, getSpreadsheetMeta } from '../api/_lib/sheets.js'
import { buildMantenimientoOtRows } from '../api/_lib/mantenimiento-ot.js'
import { buildLlantasData } from '../api/_lib/llantas.js'
import { leerFotoLlanta } from '../api/_lib/llantas-fotos.js'
import { loadDisponibilidadData } from '../api/_lib/disponibilidad.js'
import { loadCunciaProduccion, loadAcaciasProduccion } from '../api/_lib/produccion.js'
import { SPREADSHEETS } from '../api/_lib/google.js'
import { loadFacturacion, compactar, SUCURSALES, type PlantaFacturacion } from '../api/_lib/facturacion.js'
import {
  getSupabaseAdmin,
  authenticateRequest,
  requireSuperAdmin,
  requireView,
  invalidatePermsCache,
  getUserPerms,
  audit,
  verifyPassword,
  isBanned,
  isSuperAdmin,
  getUserRole,
  handleLogin,
  getClientIp,
  checkLockout,
  recordFailedAttempt,
  sanitizeEmail,
  validateEmail,
  validateNewPassword,
} from '../api/_lib/auth-helpers.js'

const VALID_KEYS = new Set(Object.keys(SPREADSHEETS))

/** Formato permitido para claves de vista, p. ej. `cuncia/mantenimiento/planta`. */
const VISTA_KEY_RE = /^[a-z0-9]+(\/[a-z0-9-]+){0,4}$/

/** Valida y normaliza el mapa { vista: permitido } recibido del cliente. */
function sanitizePerms(raw: unknown): Record<string, boolean> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length > 200) return null
  const out: Record<string, boolean> = {}
  for (const [k, v] of entries) {
    if (!VISTA_KEY_RE.test(k) || typeof v !== 'boolean') return null
    out[k] = v
  }
  return out
}

/** Hosts permitidos para /api/pdf-resolve (evita usarlo como proxy SSRF). */
const PDF_RESOLVE_HOSTS = new Set(['drive.google.com', 'docs.google.com', 'goo.gl', 'forms.gle'])

/**
 * Crea un router Express con todas las rutas de la API.
 * Incluye autenticación, health check, spreadsheets, análisis y datos de negocio.
 * @param loginLimiter - Middleware opcional de rate limiting para login.
 * @returns Router de Express configurado.
 */
export function createApiRouter(loginLimiter?: RequestHandler) {
  const router = Router()

  // Comprime las respuestas (JSON de hasta 14 MB baja a ~1 MB) y evita el límite de 4,5 MB de Vercel
  router.use(compression({ threshold: 1024 }))

  // Caché HTTP: los datos (GET …/data) se guardan en el navegador pero siempre se revalidan con ETag
  // (304 si no cambiaron); lo demás (perfil, administración, login) nunca se guarda.
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', req.method === 'GET' && req.path.endsWith('/data') ? 'private, no-cache' : 'no-store')
    if (req.method === 'GET' && req.path.endsWith('/data')) res.setHeader('Vary', 'Authorization')
    next()
  })

  /** POST /api/salir - Al cerrar sesión, pide al navegador borrar su caché HTTP de este sitio. */
  router.post('/salir', (_req, res) => {
    res.setHeader('Clear-Site-Data', '"cache"')
    res.status(204).end()
  })

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
  router.get('/spreadsheets', authenticateRequest, requireSuperAdmin, async (_req, res) => {
    try {
      const list = Object.entries(SPREADSHEETS).map(([key, id]) => ({ key, id }))
      res.json(list)
    } catch (err) {
      console.error('[spreadsheets]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/spreadsheets/meta?key= - Metadatos de un spreadsheet. */
  router.get('/spreadsheets/meta', authenticateRequest, requireSuperAdmin, async (req, res) => {
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
  router.get('/spreadsheets/data', authenticateRequest, requireSuperAdmin, async (req, res) => {
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
  router.get('/spreadsheets/analyze', authenticateRequest, requireSuperAdmin, async (req, res) => {
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
  router.get('/analyze-all', authenticateRequest, requireSuperAdmin, async (_req, res) => {
    try {
      const results = await analyzeAll()
      res.json(results)
    } catch (err) {
      console.error('[analyze-all]', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /** GET /api/proyecciones-clientes/data - Proyecciones de clientes desde Supabase. */
  router.get('/proyecciones-clientes/data', authenticateRequest, requireView(['concretos', 'clientes']), async (req, res) => {
    try {
      const rows = await conCache('proyecciones_clientes', TTL_SUPABASE_MS, async () => {
        const { data, error } = await getSupabaseAdmin()
          .from('proyecciones_clientes')
          .select('*')
          .order('fecha', { ascending: true })
          .limit(100000)
        if (error) throw error
        return data ?? []
      }, req.query.force === 'true')
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[proyecciones-clientes]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/proyecciones-planta/data - Proyecciones diarias por planta. */
  router.get('/proyecciones-planta/data', authenticateRequest, requireView(['concretos']), async (req, res) => {
    try {
      const rows = await conCache('proyecciones_planta', TTL_SUPABASE_MS, async () => {
        const { data, error } = await getSupabaseAdmin()
          .from('proyecciones_planta')
          .select('*')
          .order('fecha', { ascending: true })
          .limit(100000)
        if (error) throw error
        return data ?? []
      }, req.query.force === 'true')
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[proyecciones-planta]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/mantenimiento-ot-cuncia/data - OT Cuncía + Sub OT + Sopled + Sub Sopled. */
  router.get('/mantenimiento-ot-cuncia/data', authenticateRequest, requireView(['cuncia/mantenimiento']), async (req, res) => {
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
  router.get('/mantenimiento-ot-acacias/data', authenticateRequest, requireView(['acacias/mantenimiento']), async (req, res) => {
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
  router.get('/mantenimiento-ot-concretos/data', authenticateRequest, requireView(['concretos/mantenimiento']), async (req, res) => {
    try {
      const force = req.query.force === 'true'
      const rows = await buildMantenimientoOtRows('ordenes_ot_concretos', 'maestro_concretos', 'CONCRETOS', force)
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[mantenimiento-ot-concretos]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/llantas/data - Inventario de llantas + inspecciones + detalle (FleetControl_Llantas). Solo Concretos → Mantenimiento → Llantas (permiso …/inspeccion). */
  router.get('/llantas/data', authenticateRequest, requireView(['concretos/mantenimiento/inspeccion']), async (req, res) => {
    try {
      const force = req.query.force === 'true'
      const data = await conCache('llantas', TTL_SUPABASE_MS, () => buildLlantasData(force), force)
      res.json(data)
    } catch (err) {
      console.error('[llantas]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/llantas/foto?f=… - Foto de evidencia de una inspección de llantas (URL, ID o ruta de Drive). */
  router.get('/llantas/foto', authenticateRequest, requireView(['concretos/mantenimiento/inspeccion']), async (req, res) => {
    try {
      const valor = String(req.query.f ?? '').slice(0, 500)
      const foto = valor ? await leerFotoLlanta(valor) : null
      if (!foto) return res.status(404).json({ error: 'Foto no encontrada.' })
      res.setHeader('Content-Type', foto.tipo)
      // La foto no cambia: el navegador la guarda una hora (privada, por usuario)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(foto.datos)
    } catch (err) {
      console.error('[llantas-foto]', err)
      res.status(404).json({ error: 'Foto no disponible.' })
    }
  })

  /** GET /api/disponibilidad/data - Datos de disponibilidad placa a placa y tareas por planta. */
  router.get('/disponibilidad/data', authenticateRequest, requireView(req => [`${String(req.query.planta ?? 'cuncia').toLowerCase()}/mantenimiento`]), async (req, res) => {
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
  router.get('/produccion-agregados-acacias/data', authenticateRequest, requireView(['acacias']), async (req, res) => {
    try {
      const result = await conCache('produccion-acacias', TTL_SUPABASE_MS, loadAcaciasProduccion, req.query.force === 'true')
      res.json(result)
    } catch (err) {
      console.error('[produccion-agregados-acacias]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/produccion-agregados-cuncia/data - Producción agregados Cuncia (Supabase). */
  router.get('/produccion-agregados-cuncia/data', authenticateRequest, requireView(['cuncia']), async (req, res) => {
    try {
      const result = await conCache('produccion-cuncia', TTL_SUPABASE_MS, loadCunciaProduccion, req.query.force === 'true')
      res.json(result)
    } catch (err) {
      console.error('[produccion-agregados-cuncia]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/programacion-agregados/data - Programación de agregados desde Zoho Creator. */
  router.get('/programacion-agregados/data', authenticateRequest, requireView(['cuncia/programacion', 'acacias/programacion']), async (req, res) => {
    try {
      const rows = await conCache('registros_zoho_creator_programacion_agregados', TTL_SUPABASE_MS, async () => {
        const { data, error } = await getSupabaseAdmin()
          .from('registros_zoho_creator_programacion_agregados')
          .select('*')
          .order('fecha_de_servicio', { ascending: false })
          .limit(100000)
        if (error) throw error
        return data ?? []
      }, req.query.force === 'true')
      res.json({ rows, total: rows.length })
    } catch (err) {
      console.error('[programacion-agregados]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/concreto/data - Datos de concreto (order_price + order_detail). */
  router.get('/concreto/data', authenticateRequest, requireView(['concretos']), async (req, res) => {
    try {
      const datos = await conCache('concreto', TTL_SUPABASE_MS, async () => {
        const supabase = getSupabaseAdmin()
        const limit = 100000
        const [resPrice, resDetail, resCanc] = await Promise.all([
          supabase.from('order_price').select('*', { count: 'exact', head: false }).limit(limit),
          // Pedido y tiempos de viaje del mixer (cargue, salida, llegada a obra, salida de obra, regreso) para las tablas de operación
          supabase.from('order_detail').select('remision,no_de_pedido,tiempos_hphora_programada,tiempos_icinicio_de_cargue,tiempos_fcfin_de_cargue,' +
            'tiempos_spsalida_de_planta,tiempos_llollegada_a_obra,tiempos_sosalida_de_obra,tiempos_llpllegada_a_planta,bomba,operario').limit(limit),
          // Viajes cancelados o reubicados: no llegan a order_price; el motivo viene en observaciones
          supabase.from('order_detail').select('fecha,remision,no_de_pedido,planta,cliente,obra,comercial,mixer,conductor,concreto_mezcla,concreto_cantidad,observaciones')
            .eq('estado', 'Cancelado').limit(limit),
        ])
        if (resPrice.error) throw resPrice.error
        if (resDetail.error) throw resDetail.error
        if (resCanc.error) throw resCanc.error
        if (resPrice.count && resPrice.count > limit) {
          console.warn(`[concreto-data] order_price truncado: ${resPrice.count} filas, devolviendo ${limit}`)
        }
        return { price: resPrice.data, detail: resDetail.data, cancelados: resCanc.data, count: resPrice.count }
      }, req.query.force === 'true')
      res.json(datos)
    } catch (err) {
      console.error('[concreto-data]', err)
      res.status(500).json({ error: 'Error interno del servidor.' })
    }
  })

  /** GET /api/facturacion-agregados/data?planta=cuncia|acacias&force=true - Facturación Novasoft (Excel en Drive) de una planta */
  router.get('/facturacion-agregados/data',
    authenticateRequest,
    requireView(req => [`${String(req.query.planta ?? '').toLowerCase()}/facturacion`]),
    async (req, res) => {
      const planta = String(req.query.planta ?? '').toLowerCase()
      if (!(planta in SUCURSALES)) return res.status(400).json({ error: 'Planta inválida' })
      try {
        res.json(compactar(await loadFacturacion(planta as PlantaFacturacion, req.query.force === 'true')))
      } catch (err: any) {
        console.error('[facturacion-agregados]', err?.message ?? err)
        res.status(err?.status ?? 500).json({ error: err?.status === 503 ? err.message : 'No se pudo leer el archivo de facturación.' })
      }
    })

  /** GET /api/me - Rol efectivo y permisos de vista del usuario autenticado. */
  router.get('/me', authenticateRequest, async (req, res) => {
    const user = (req as any).user
    let perms: Record<string, boolean> = {}
    try {
      perms = await getUserPerms(user.email)
    } catch (err) {
      // Sin permisos verificables el frontend bloquea todo salvo Configuración.
      console.error('[me] permisos_vista:', err)
      perms = { cuncia: false, acacias: false, concretos: false, clientes: false }
    }
    res.json({
      email: user.email,
      role: getUserRole(user),
      superadmin: isSuperAdmin(user),
      mustChangePassword: !!user.app_metadata?.must_change_password,
      perms,
      // Versión de la guía de inicio que ya vio (0 = nunca); se guarda en el servidor para no repetirla en otro equipo
      tourVersion: Number(user.app_metadata?.tour_version) || 0,
    })
  })

  /** POST /api/me/tour - Marca como vista (terminada u omitida) la guía de inicio. */
  router.post('/me/tour', authenticateRequest, async (req, res) => {
    try {
      const user = (req as any).user
      const version = Number(req.body?.version)
      if (!Number.isInteger(version) || version < 1 || version > 1000) return res.status(400).json({ error: 'Versión inválida.' })
      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
        app_metadata: { ...user.app_metadata, tour_version: version },
      })
      if (error) throw error
      res.json({ ok: true })
    } catch (err) {
      console.error('[me-tour]', err)
      res.status(500).json({ error: 'No se pudo guardar el estado de la guía.' })
    }
  })

  /** POST /api/me/password - Cambia la contraseña propia verificando la actual. */
  router.post('/me/password', authenticateRequest, async (req, res) => {
    try {
      const user = (req as any).user
      const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
      const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
      if (!current || !next) return res.status(400).json({ error: 'Complete la contraseña actual y la nueva.' })
      const pwError = await validateNewPassword(next)
      if (pwError) return res.status(400).json({ error: pwError })
      if (next === current) return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual.' })

      const ip = getClientIp(req)
      const lock = await checkLockout(user.email, ip)
      if (lock.isLocked) return res.status(429).json({ error: 'Demasiados intentos. Intente más tarde.' })
      if (!(await verifyPassword(user.email, current))) {
        await recordFailedAttempt(user.email, ip)
        return res.status(400).json({ error: 'La contraseña actual no es correcta.' })
      }

      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
        password: next,
        app_metadata: { ...user.app_metadata, must_change_password: false },
      })
      if (error) throw error
      await audit(req, 'password.change', user.email)
      res.json({ ok: true })
    } catch (err) {
      console.error('[me-password]', err)
      res.status(500).json({ error: 'No se pudo cambiar la contraseña.' })
    }
  })

  /** GET /api/admin/users - Lista usuarios reales de Supabase Auth (solo super-admin) */
  router.get('/admin/users', authenticateRequest, requireSuperAdmin, async (_req, res) => {
    try {
      const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1000 })
      if (error) throw error
      const users = data.users.map(u => ({
        id: u.id,
        email: u.email,
        role: getUserRole(u),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned: isBanned(u as any),
        must_change_password: !!(u.app_metadata as any)?.must_change_password,
      }))
      res.json({ users })
    } catch (err) {
      console.error('[admin-users]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** POST /api/admin/users - Crea un usuario nuevo (solo super-admin / sys.tic). */
  router.post('/admin/users', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const email = sanitizeEmail(req.body?.email)
      const password = typeof req.body?.password === 'string' ? req.body.password : ''
      const role = req.body?.role === 'admin' ? 'admin' : 'usuario'
      const perms = sanitizePerms(req.body?.perms)

      if (!email || !validateEmail(email)) return res.status(400).json({ error: 'Correo inválido.' })
      const pwError = await validateNewPassword(password)
      if (pwError) return res.status(400).json({ error: pwError })

      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // El rol va en app_metadata: el usuario no puede modificarlo desde el cliente.
        // La contraseña es temporal: se exige cambiarla en el primer ingreso.
        app_metadata: { role, must_change_password: true },
      })
      if (error) {
        const msg = /already|registered|exists/i.test(error.message) ? 'Ya existe un usuario con ese correo.' : 'No se pudo crear el usuario.'
        console.error('[admin-users-create]', error.message)
        return res.status(400).json({ error: msg })
      }

      if (perms && Object.keys(perms).length) {
        const rows = Object.entries(perms).map(([vista, permitido]) => ({ email, vista, permitido, user_id: data.user.id }))
        const { error: permError } = await (supabase as any).from('permisos_vista').insert(rows)
        if (permError) console.error('[admin-users-create-perms]', permError)
      }

      await audit(req, 'user.create', email, { role, perms: perms ? Object.keys(perms).filter(k => perms[k]).length : 0 })
      res.status(201).json({ user: { id: data.user.id, email, role, created_at: data.user.created_at } })
    } catch (err) {
      console.error('[admin-users-create]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** Busca un usuario por id y rechaza operar sobre el super-admin. */
  async function loadTargetUser(req: any, res: any) {
    const id = String(req.params.id ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) { res.status(400).json({ error: 'Usuario inválido.' }); return null }
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(id)
    if (error || !data.user) { res.status(404).json({ error: 'Usuario no encontrado.' }); return null }
    if (isSuperAdmin(data.user)) { res.status(400).json({ error: 'No se puede modificar la cuenta del administrador del sistema.' }); return null }
    return data.user
  }

  /** POST /api/admin/users/:id/block - Bloquea o desbloquea una cuenta (solo super-admin). */
  router.post('/admin/users/:id/block', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const target = await loadTargetUser(req, res)
      if (!target) return
      const blocked = req.body?.blocked === true
      // ~100 años = bloqueo indefinido; authenticateRequest rechaza sus tokens vigentes al instante.
      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(target.id, { ban_duration: blocked ? '876000h' : 'none' })
      if (error) throw error
      await audit(req, blocked ? 'user.block' : 'user.unblock', target.email ?? target.id)
      res.json({ ok: true, blocked })
    } catch (err) {
      console.error('[admin-block]', err)
      res.status(500).json({ error: 'No se pudo actualizar la cuenta.' })
    }
  })

  /** POST /api/admin/users/:id/role - Cambia el rol (usuario/admin) (solo super-admin). */
  router.post('/admin/users/:id/role', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const target = await loadTargetUser(req, res)
      if (!target) return
      const role = req.body?.role === 'admin' ? 'admin' : 'usuario'
      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(target.id, { app_metadata: { ...target.app_metadata, role } })
      if (error) throw error
      await audit(req, 'user.role', target.email ?? target.id, { role })
      res.json({ ok: true, role })
    } catch (err) {
      console.error('[admin-role]', err)
      res.status(500).json({ error: 'No se pudo cambiar el rol.' })
    }
  })

  /**
   * DELETE /api/admin/users/:id - Elimina la cuenta de forma definitiva (solo super-admin).
   * Borra también sus permisos de vista y sus intentos de ingreso; la auditoría se conserva.
   * OJO: auth.users es compartido con la app Indicadores (indicadores.perfiles cae en cascada):
   * eliminar la cuenta también le quita ese acceso. Decisión del usuario (2026-09-30).
   * El super-admin no se puede eliminar (loadTargetUser) ni nadie puede eliminarse a sí mismo.
   */
  router.delete('/admin/users/:id', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const target = await loadTargetUser(req, res)
      if (!target) return
      if (target.id === (req as any).user.id) return res.status(400).json({ error: 'No puede eliminar su propia cuenta.' })
      const email = (target.email ?? '').toLowerCase()
      const sb = getSupabaseAdmin()
      const { error } = await sb.auth.admin.deleteUser(target.id)
      if (error) throw error
      // Limpieza de datos asociados (permisos_vista también cae por la FK user_id; aquí se cubren filas solo con email)
      if (email) {
        await sb.from('permisos_vista').delete().eq('email', email)
        await sb.from('login_attempts').delete().eq('identifier', email)
        invalidatePermsCache(email)
      }
      await audit(req, 'user.delete', email || target.id)
      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-delete]', err)
      res.status(500).json({ error: 'No se pudo eliminar el usuario.' })
    }
  })

  /** POST /api/admin/users/:id/reset-password - Asigna contraseña temporal (solo super-admin). */
  router.post('/admin/users/:id/reset-password', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const target = await loadTargetUser(req, res)
      if (!target) return
      const password = typeof req.body?.password === 'string' ? req.body.password : ''
      const pwError = await validateNewPassword(password)
      if (pwError) return res.status(400).json({ error: pwError })
      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(target.id, {
        password,
        app_metadata: { ...target.app_metadata, must_change_password: true },
      })
      if (error) throw error
      await audit(req, 'user.reset_password', target.email ?? target.id)
      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-reset-password]', err)
      res.status(500).json({ error: 'No se pudo restablecer la contraseña.' })
    }
  })

  /** GET /api/admin/ingresos?email= - Últimos ingresos de un usuario: fecha, hora, IP, navegador y resultado (solo super-admin) */
  router.get('/admin/ingresos', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const email = sanitizeEmail(String(req.query.email ?? ''))
      if (!email || !validateEmail(email)) return res.status(400).json({ error: 'email requerido' })
      const { data, error } = await (getSupabaseAdmin() as any).from('audit_log')
        .select('created_at,action,ip,details')
        .eq('target', email).in('action', ['login', 'login.fail', 'login.blocked'])
        .order('created_at', { ascending: false }).limit(50)
      if (error?.code === 'PGRST205') return res.json({ ingresos: [] })
      if (error) throw error
      res.json({ ingresos: (data ?? []).map((r: any) => ({ fecha: r.created_at, resultado: r.action, ip: r.ip ?? '', ua: r.details?.ua ?? '' })) })
    } catch (err) {
      console.error('[admin-ingresos]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** GET /api/admin/permisos?email= - Permisos de un usuario (solo super-admin) */
  router.get('/admin/permisos', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const email = sanitizeEmail(String(req.query.email ?? ''))
      if (!email || !validateEmail(email)) return res.status(400).json({ error: 'email requerido' })
      const { data, error } = await (getSupabaseAdmin() as any).from('permisos_vista').select('vista,permitido').eq('email', email)
      // Tabla aún no creada (migración 003 pendiente): sin permisos guardados, se avisa al panel
      if (error?.code === 'PGRST205') return res.json({ perms: [], migracionPendiente: true })
      if (error) throw error
      res.json({ perms: data ?? [] })
    } catch (err) {
      console.error('[admin-permisos-get]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** POST /api/admin/permisos - Guardar permisos (solo super-admin) */
  router.post('/admin/permisos', authenticateRequest, requireSuperAdmin, async (req, res) => {
    try {
      const email = sanitizeEmail(req.body?.email)
      const perms = sanitizePerms(req.body?.perms)
      if (!email || !validateEmail(email) || !perms) return res.status(400).json({ error: 'email y perms requeridos' })
      const supabase = getSupabaseAdmin() as any
      const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (listError) throw listError
      const target = list.users.find((u: any) => u.email?.toLowerCase() === email)
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' })
      if (isSuperAdmin(target)) return res.status(400).json({ error: 'El administrador del sistema siempre tiene acceso total.' })

      const rows = Object.entries(perms).map(([vista, permitido]) => ({
        email, vista, permitido, user_id: target.id, updated_at: new Date().toISOString(),
      }))
      if (rows.length) {
        const { error } = await supabase.from('permisos_vista').upsert(rows, { onConflict: 'email,vista' })
        if (error) throw error
      }
      invalidatePermsCache(email)
      await audit(req, 'perms.update', email, { denegadas: Object.keys(perms).filter(k => !perms[k]) })
      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-permisos-post]', err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  /** GET /api/pdf-resolve - Resuelve redirecciones de enlaces PDF de Google Drive. */
  router.get('/pdf-resolve', authenticateRequest, async (req, res) => {
    const url = req.query.url
    if (typeof url !== 'string' || !url) {
      return res.status(400).json({ error: 'url required' })
    }
    let parsed: URL
    try { parsed = new URL(url) } catch { return res.status(400).json({ error: 'url inválida' }) }
    if (parsed.protocol !== 'https:' || !PDF_RESOLVE_HOSTS.has(parsed.hostname)) {
      return res.status(400).json({ error: 'Host no permitido' })
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
