import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'

/**
 * Singleton que mantiene la instancia del cliente admin de Supabase (service role).
 * Se reusa entre llamadas para evitar crear múltiples conexiones.
 */
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null

/**
 * Obtiene (o crea) el cliente Supabase con permisos de administrador (service role).
 * Requiere SUPABASE_SERVICE_ROLE_KEY: sin ella no hay fallback a la anon key,
 * porque las operaciones admin (usuarios, permisos, lockout) fallarían en silencio.
 * @throws {Error} Si faltan las variables de entorno necesarias.
 * @returns Cliente Supabase listo para bypassear RLS.
 */
export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    dotenv.config({ path: '.env.local' })
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    // Node < 22 no trae WebSocket nativo; Supabase Realtime requiere `ws`.
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: ws as any },
    })
  }
  return supabaseAdminInstance
}

/**
 * Cliente efímero para validar credenciales (signInWithPassword).
 * Se crea uno por intento: si se usara el cliente admin, su sesión quedaría con el
 * JWT del último usuario que inició sesión y las consultas a la BD dejarían de
 * ejecutarse como service_role.
 */
function createAuthOnlyClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: ws as any },
  })
}

/** Rutas permitidas mientras el usuario tiene pendiente el cambio de contraseña. */
const PASSWORD_CHANGE_ALLOWED = new Set(['/me', '/me/password'])

/** Indica si la cuenta está bloqueada (ban de Supabase vigente). */
export function isBanned(user: { banned_until?: string | null } | null | undefined): boolean {
  const until = (user as any)?.banned_until
  return !!until && new Date(until).getTime() > Date.now()
}

/**
 * Middleware de autenticación para Express: valida el Bearer token contra Supabase Auth.
 * Si es válido, asigna `req.user` y llama a `next()`. Si no, responde con 401.
 * @param req - Objeto de petición Express.
 * @param res - Objeto de respuesta Express.
 * @param next - Función next de Express.
 */
export async function authenticateRequest(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido.' })
  }
  const token = authHeader.slice(7)
  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json({ error: 'Token inválido o expirado.' })
  }
  if (isBanned(data.user)) {
    return res.status(403).json({ error: 'Cuenta bloqueada. Contacte al administrador del sistema.', code: 'ACCOUNT_BLOCKED' })
  }
  // Cuentas nuevas o con contraseña restablecida solo pueden cambiar su contraseña.
  if (data.user.app_metadata?.must_change_password && !PASSWORD_CHANGE_ALLOWED.has(req.path)) {
    return res.status(403).json({ error: 'Debe cambiar su contraseña antes de continuar.', code: 'PASSWORD_CHANGE_REQUIRED' })
  }
  req.user = data.user
  next()
}

// ── Permisos por vista (servidor) ─────────────────────────────────────

const PERMS_TTL_MS = 60_000
const permsCache = new Map<string, { perms: Record<string, boolean>; exp: number }>()

/** Invalida la caché de permisos (tras guardar cambios desde el panel). */
export function invalidatePermsCache(email?: string) {
  if (email) permsCache.delete(email.toLowerCase())
  else permsCache.clear()
}

/**
 * Permisos { vista: permitido } del usuario, con caché de 60 s.
 * Si la consulta falla se lanza el error: ante la duda, se niega el acceso.
 */
export async function getUserPerms(email: string): Promise<Record<string, boolean>> {
  const key = email.toLowerCase()
  const hit = permsCache.get(key)
  if (hit && hit.exp > Date.now()) return hit.perms
  const { data, error } = await (getSupabaseAdmin() as any)
    .from('permisos_vista').select('vista,permitido').eq('email', key)
  if (error) {
    // Tabla aún no creada (migración pendiente): sin restricciones configuradas todavía.
    if (error.code === 'PGRST205' || error.code === '42P01') return {}
    throw error
  }
  const perms: Record<string, boolean> = {}
  for (const r of data ?? []) perms[r.vista] = !!r.permitido
  permsCache.set(key, { perms, exp: Date.now() + PERMS_TTL_MS })
  return perms
}

/** Misma regla que el frontend: bloqueada si la vista o algún padre está en false. */
export function permsAllow(perms: Record<string, boolean>, vista: string): boolean {
  const parts = vista.split('/')
  for (let i = 1; i <= parts.length; i++) {
    if (perms[parts.slice(0, i).join('/')] === false) return false
  }
  return true
}

/**
 * Middleware: exige permiso sobre al menos una de las vistas indicadas.
 * Acepta claves fijas o una función que las calcula desde la petición.
 */
export function requireView(vistas: string[] | ((req: any) => string[])) {
  return async (req: any, res: any, next: any) => {
    try {
      if (isSuperAdmin(req.user)) return next()
      const keys = typeof vistas === 'function' ? vistas(req) : vistas
      const perms = await getUserPerms(req.user.email)
      if (keys.some(k => permsAllow(perms, k))) return next()
      return res.status(403).json({ error: 'No tiene permiso para ver esta información.' })
    } catch (err) {
      console.error('[require-view]', err)
      return res.status(503).json({ error: 'No se pudieron verificar los permisos.' })
    }
  }
}

// ── Auditoría ─────────────────────────────────────────────────────────

/**
 * Registra una acción administrativa en `audit_log` (y siempre en consola).
 * Nunca lanza: la auditoría no debe romper la operación principal.
 */
export async function audit(req: any, action: string, target: string | null, details: Record<string, unknown> = {}) {
  const actor = req.user?.email ?? 'anon'
  const ip = getClientIp(req)
  console.info(`[audit] ${actor} ${action} ${target ?? ''} ${JSON.stringify(details)}`)
  try {
    const { error } = await (getSupabaseAdmin() as any).from('audit_log').insert({ actor, action, target, ip, details })
    if (error && error.code !== 'PGRST205') console.error('[audit]', error.message)
  } catch (err) {
    console.error('[audit]', err)
  }
}

/**
 * Correos con privilegio de super-administrador (crear usuarios y administrar permisos).
 * Configurable con SUPERADMIN_EMAILS (separados por coma); por defecto solo sys.tic.
 */
export function getSuperAdminEmails(): string[] {
  const raw = process.env.SUPERADMIN_EMAILS || 'sys.tic@gravicon.com.co'
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

/**
 * Indica si el usuario autenticado es super-administrador.
 * Se basa en el correo verificado por Supabase Auth, nunca en user_metadata
 * (que el propio usuario puede modificar con supabase.auth.updateUser).
 */
export function isSuperAdmin(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.toLowerCase().trim()
  return !!email && getSuperAdminEmails().includes(email)
}

/**
 * Rol efectivo de un usuario. Solo confía en app_metadata (editable únicamente
 * con service role); user_metadata lo controla el usuario y no sirve para autorizar.
 */
export function getUserRole(user: { email?: string | null; app_metadata?: Record<string, any> } | null | undefined): string {
  if (isSuperAdmin(user)) return 'superadmin'
  return (user?.app_metadata?.role as string) || 'usuario'
}

/** Middleware: exige que `req.user` (ya autenticado) sea super-administrador. */
export function requireSuperAdmin(req: any, res: any, next: any) {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Solo el administrador del sistema puede realizar esta acción.' })
  }
  next()
}

/** Longitud mínima de contraseña para usuarios nuevos. */
export const MIN_PASSWORD_LENGTH = 10

/**
 * Valida la política de contraseñas: mínimo 10 caracteres con mayúscula,
 * minúscula, número y símbolo.
 * @returns Mensaje de error o null si es válida.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (password.length > 72) return 'La contraseña no puede superar 72 caracteres.'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'La contraseña debe incluir mayúscula, minúscula, número y símbolo.'
  }
  return null
}

interface LockoutState {
  count: number
  lockUntil: number
}

/** Almacén en memoria para bloqueos por intentos fallidos. */
const lockoutStore = new Map<string, LockoutState>()

/** Máximo de intentos fallidos por correo antes de bloquear. */
const MAX_FAILED_ATTEMPTS = 5

/** Máximo por IP: más alto porque toda una oficina puede salir por la misma IP. */
const MAX_FAILED_ATTEMPTS_IP = 20

/** Duración del bloqueo en milisegundos (15 minutos). */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/**
 * Obtiene la referencia a la tabla `login_attempts` para operaciones de lockout.
 * @returns Query builder de Supabase o null si falla.
 */
function getLockoutDb() {
  try {
    return getSupabaseAdmin().from('login_attempts') as any
  } catch (err) {
    console.error('[lockout-db]', err)
    return null
  }
}

/**
 * Obtiene la dirección IP del cliente desde los headers o socket.
 * @param req - Objeto de petición.
 * @returns IP del cliente o cadena vacía.
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  // En Vercel x-real-ip lo fija la plataforma; x-forwarded-for puede traer valores del cliente.
  const real = req.headers?.['x-real-ip']
  if (typeof real === 'string' && real) return real.trim()
  const raw = req.headers?.['x-forwarded-for']
  const forwarded = Array.isArray(raw) ? raw[0] : raw
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (typeof req.socket?.remoteAddress === 'string') return req.socket.remoteAddress
  return ''
}

/**
 * Verifica si el correo o IP están bloqueados por demasiados intentos fallidos.
 * Revisa primero el caché en memoria y luego la BD como respaldo.
 * @param email - Correo del usuario.
 * @param ip - Dirección IP del cliente.
 * @returns Objeto con `isLocked` y `remainingMs` de tiempo restante de bloqueo.
 */
export async function checkLockout(email: string, ip: string): Promise<{ isLocked: boolean; remainingMs: number }> {
  const now = Date.now()
  const cleanEmail = email.toLowerCase().trim()
  
  // Check in-memory first
  const emailLock = lockoutStore.get(`email:${cleanEmail}`)
  const ipLock = lockoutStore.get(`ip:${ip}`)

  if (emailLock && emailLock.lockUntil > now) {
    return { isLocked: true, remainingMs: emailLock.lockUntil - now }
  }
  if (ipLock && ipLock.lockUntil > now) {
    return { isLocked: true, remainingMs: ipLock.lockUntil - now }
  }

  // Solo se limpian bloqueos vencidos; lockUntil = 0 significa "contando intentos, sin bloqueo"
  // (antes se borraba también ese caso y el contador nunca pasaba de 1).
  if (emailLock && emailLock.lockUntil > 0 && emailLock.lockUntil <= now) lockoutStore.delete(`email:${cleanEmail}`)
  if (ipLock && ipLock.lockUntil > 0 && ipLock.lockUntil <= now) lockoutStore.delete(`ip:${ip}`)

  // Try DB as fallback for serverless consistency
  const db = getLockoutDb()
  if (db) {
    // .in() en vez de .or() con interpolación: la IP viene de un header controlable por el cliente.
    // Sin maybeSingle(): con filas de correo e IP a la vez devolvía error y se saltaba el bloqueo.
    const { data } = await db.select('locked_until').in('identifier', [cleanEmail, ip].filter(Boolean))
    const lockedUntil = Math.max(0, ...((data ?? []) as { locked_until: string | null }[])
      .map(r => (r.locked_until ? new Date(r.locked_until).getTime() : 0)))
    if (lockedUntil > now) {
      return { isLocked: true, remainingMs: lockedUntil - now }
    }
  }

  return { isLocked: false, remainingMs: 0 }
}

/**
 * Registra un intento fallido de inicio de sesión.
 * Bloquea el correo a los MAX_FAILED_ATTEMPTS y la IP a los MAX_FAILED_ATTEMPTS_IP.
 * El conteo se persiste en BD para que el bloqueo aplique entre instancias serverless.
 * @param email - Correo del usuario.
 * @param ip - Dirección IP del cliente.
 */
export async function recordFailedAttempt(email: string, ip: string) {
  const now = Date.now()
  const cleanEmail = email.toLowerCase().trim()
  const db = getLockoutDb()

  // En serverless cada instancia tiene su propia memoria: se toma el mayor entre
  // el conteo local y el persistido para que el bloqueo sea global.
  const dbCounts = new Map<string, { count: number; updated: number }>()
  if (db) {
    try {
      const { data } = await db.select('identifier,attempt_count,updated_at').in('identifier', [cleanEmail, ip].filter(Boolean))
      for (const r of data ?? []) dbCounts.set(r.identifier, { count: r.attempt_count ?? 0, updated: new Date(r.updated_at).getTime() })
    } catch (err) { console.error('[record-failed-attempt]', err) }
  }

  const pairs: [string, string][] = [[`email:${cleanEmail}`, cleanEmail], [`ip:${ip}`, ip]]
  for (const [memKey, id] of pairs) {
    if (!id) continue
    const state = lockoutStore.get(memKey) ?? { count: 0, lockUntil: 0 }
    const persisted = dbCounts.get(id)
    // Intentos de hace más de la ventana de bloqueo ya no cuentan.
    const persistedCount = persisted && now - persisted.updated < LOCKOUT_DURATION_MS ? persisted.count : 0
    state.count = Math.max(state.count, persistedCount) + 1
    const max = memKey.startsWith('ip:') ? MAX_FAILED_ATTEMPTS_IP : MAX_FAILED_ATTEMPTS
    if (state.count >= max) state.lockUntil = now + LOCKOUT_DURATION_MS
    lockoutStore.set(memKey, state)

    if (db) {
      try {
        await db.upsert({
          identifier: id,
          attempt_count: state.count,
          locked_until: state.lockUntil > now ? new Date(state.lockUntil).toISOString() : null,
          updated_at: new Date(now).toISOString(),
        }, { onConflict: 'identifier' })
      } catch (err) { console.error('[record-failed-attempt]', err) }
    }
  }
}

/**
 * Limpia los intentos fallidos tras un login exitoso.
 * Elimina entradas del caché en memoria y de la BD.
 * @param email - Correo del usuario.
 * @param ip - Dirección IP del cliente.
 */
export async function resetFailedAttempts(email: string, ip: string) {
  const cleanEmail = email.toLowerCase().trim()
  lockoutStore.delete(`email:${cleanEmail}`)
  lockoutStore.delete(`ip:${ip}`)

  // Clean up DB
  const db = getLockoutDb()
  if (db) {
    try {
      await db.delete().in('identifier', [cleanEmail, ip].filter(Boolean))
    } catch (err) { console.error('[reset-failed-attempts]', err) }
  }
}

export interface LoginResult {
  status: number
  body: Record<string, unknown>
}

/**
 * Ejecuta el flujo completo de login: validación, HTTPS check, lockout check,
 * autenticación contra Supabase, registro de intentos fallidos.
 * @param req - Petición con body (email, password) y headers.
 * @param envCheck - Indica si el entorno es producción (fuerza HTTPS).
 * @returns LoginResult con status HTTP y body JSON.
 */
export async function handleLogin(req: { body?: { email?: string; password?: string }; headers: Record<string, string | string[] | undefined> }, envCheck?: { isProduction: boolean }): Promise<LoginResult> {
  try {
    const rawEmail = req.body?.email
    const rawPassword = req.body?.password

    const email = sanitizeEmail(rawEmail)
    const password = typeof rawPassword === 'string' ? rawPassword : ''
    const ip = getClientIp(req)

    if (!email || !password) {
      return { status: 400, body: { error: 'El correo y la contraseña son obligatorios.' } }
    }

    if (email.length > 254 || password.length > 128) {
      return { status: 400, body: { error: 'Credenciales inválidas.' } }
    }

    if (!validateEmail(email)) {
      return { status: 400, body: { error: 'El formato del correo es inválido.' } }
    }

    if (envCheck?.isProduction) {
      const proto = req.headers['x-forwarded-proto']
      const protocol = Array.isArray(proto) ? proto[0] : proto
      if (protocol !== 'https') {
        return { status: 403, body: { error: 'Conexión insegura. HTTPS es obligatorio.' } }
      }
    }

    const lockout = await checkLockout(email, ip)
    if (lockout.isLocked) {
      const remainingMinutes = Math.ceil(lockout.remainingMs / 60_000)
      return {
        status: 429,
        body: {
          error: `Acceso bloqueado temporalmente por seguridad. Intente de nuevo en ${remainingMinutes} minutos.`,
          locked: true,
          remainingMs: lockout.remainingMs,
        },
      }
    }

    const { data, error } = await createAuthOnlyClient().auth.signInWithPassword({ email, password })

    if (error) {
      await recordFailedAttempt(email, ip)
      return { status: 401, body: { error: 'Credenciales inválidas.' } }
    }

    await resetFailedAttempts(email, ip)

    return { status: 200, body: { session: data.session, user: data.user } }
  } catch (err) {
    console.error('[handleLogin]', err)
    return { status: 500, body: { error: 'Error interno del servidor.' } }
  }
}

/** Verifica la contraseña actual de un usuario sin crear sesión persistente. */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const { error } = await createAuthOnlyClient().auth.signInWithPassword({ email, password })
  return !error
}

/**
 * Sanitiza un string eliminando caracteres HTML peligrosos.
 * @param val - Valor a sanitizar.
 * @returns String limpio o vacío.
 */
export function sanitizeInput(val: string): string {
  if (typeof val !== 'string') return ''
  return val.replace(/[<>&"'`]/g, '').trim()
}

/**
 * Sanitiza un correo eliminando espacios y caracteres peligrosos, normaliza a minúsculas.
 * @param val - Correo a sanitizar.
 * @returns Correo limpio o vacío.
 */
export function sanitizeEmail(val: string | undefined): string {
  if (typeof val !== 'string') return ''
  return val.replace(/[<>&"'`\s]/g, '').toLowerCase().trim()
}

/**
 * Valida el formato de un correo electrónico.
 * @param email - Correo a validar.
 * @returns `true` si el formato es válido.
 */
export function validateEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return re.test(email)
}
