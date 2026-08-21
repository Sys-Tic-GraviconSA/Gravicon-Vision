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
 * Usa SUPABASE_SERVICE_ROLE_KEY, y fallback a VITE_SUPABASE_ANON_KEY.
 * @throws {Error} Si faltan las variables de entorno necesarias.
 * @returns Cliente Supabase listo para bypassear RLS.
 */
export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    dotenv.config({ path: '.env.local' })
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or key')
    }
    // Node < 22 no trae WebSocket nativo; Supabase Realtime requiere `ws`.
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey, {
      realtime: { transport: ws as any },
    })
  }
  return supabaseAdminInstance
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
  req.user = data.user
  next()
}

interface LockoutState {
  count: number
  lockUntil: number
}

/** Almacén en memoria para bloqueos por intentos fallidos. */
const lockoutStore = new Map<string, LockoutState>()

/** Máximo de intentos fallidos antes de bloquear. */
const MAX_FAILED_ATTEMPTS = 5

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

  if (emailLock && emailLock.lockUntil <= now) lockoutStore.delete(`email:${cleanEmail}`)
  if (ipLock && ipLock.lockUntil <= now) lockoutStore.delete(`ip:${ip}`)

  // Try DB as fallback for serverless consistency
  const db = getLockoutDb()
  if (db) {
    const { data } = await db.select('*').or(`identifier.eq.${cleanEmail},identifier.eq.${ip}`).maybeSingle()
    if (data?.locked_until && new Date(data.locked_until).getTime() > now) {
      return { isLocked: true, remainingMs: new Date(data.locked_until).getTime() - now }
    }
  }

  return { isLocked: false, remainingMs: 0 }
}

/**
 * Registra un intento fallido de inicio de sesión.
 * Si se supera MAX_FAILED_ATTEMPTS, bloquea el correo e IP.
 * Persiste en BD como fire-and-forget para consistencia serverless.
 * @param email - Correo del usuario.
 * @param ip - Dirección IP del cliente.
 */
export async function recordFailedAttempt(email: string, ip: string) {
  const now = Date.now()
  const cleanEmail = email.toLowerCase().trim()

  const emailKey = `email:${cleanEmail}`
  const ipKey = `ip:${ip}`

  // Always update in-memory (fast path)
  const emailState = lockoutStore.get(emailKey) ?? { count: 0, lockUntil: 0 }
  emailState.count++
  if (emailState.count >= MAX_FAILED_ATTEMPTS) {
    emailState.lockUntil = now + LOCKOUT_DURATION_MS
  }
  lockoutStore.set(emailKey, emailState)

  const ipState = lockoutStore.get(ipKey) ?? { count: 0, lockUntil: 0 }
  ipState.count++
  if (ipState.count >= MAX_FAILED_ATTEMPTS) {
    ipState.lockUntil = now + LOCKOUT_DURATION_MS
  }
  lockoutStore.set(ipKey, ipState)

  // Sync to DB for serverless consistency (fire-and-forget)
  const db = getLockoutDb()
  if (db) {
    const lockedUntil = emailState.lockUntil > now ? new Date(emailState.lockUntil).toISOString() : null
    for (const id of [cleanEmail, ip]) {
      try {
        await db.upsert({
          identifier: id,
          attempt_count: 1,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString(),
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
      await db.delete().or(`identifier.eq.${cleanEmail},identifier.eq.${ip}`)
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
    const password = typeof rawPassword === 'string' ? rawPassword.trim() : ''
    const ip = getClientIp(req)

    if (!email || !password) {
      return { status: 400, body: { error: 'El correo y la contraseña son obligatorios.' } }
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

    const { data, error } = await getSupabaseAdmin().auth.signInWithPassword({ email, password })

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
