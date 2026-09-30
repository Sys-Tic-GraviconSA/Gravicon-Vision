import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { borrarCacheLocal } from '../utils/cacheLocal'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

/**
 * useAuthStore — Manejo de sesión de usuario con Supabase.
 *
 * - initialize: restaura sesión al cargar y suscribe cambios en tiempo real
 * - signIn: login contra API propia (rate-limited) + setSession en Supabase
 * - signOut: cierre de sesión con limpieza garantizada del estado local
 */
export const useAuthStore = defineStore('auth', () => {
  /** Usuario autenticado actual (null si no hay sesión) */
  const user = ref<User | null>(null)
  /**
   * Sesión activa, mantenida en memoria y sincronizada vía onAuthStateChange.
   * Sirve como fuente única para el access token: evita llamar a
   * supabase.auth.getSession() en cada request (esa llamada serializa a
   * través de un lock interno de auth-js y se vuelve un cuello de botella
   * cuando varias peticiones se disparan en paralelo).
   */
  const session = ref<Session | null>(null)
  /** Indica si ya se resolvió el estado inicial de autenticación */
  const loading = ref(true)

  /** Verdadero si hay un usuario autenticado */
  const isAuthenticated = computed(() => !!user.value)
  /** Email del usuario autenticado (cadena vacía si no hay sesión) */
  const userEmail = computed(() => user.value?.email ?? '')
  /** Access token JWT actual, listo para usar en headers Authorization */
  const accessToken = computed(() => session.value?.access_token ?? null)

  /**
   * Rol y permisos de vista resueltos por el servidor (/api/me). El rol nunca se lee
   * de user_metadata en el cliente: el usuario puede editarlo y no es confiable.
   */
  const profile = ref<{ role: string; superadmin: boolean; mustChangePassword: boolean; perms: Record<string, boolean>; tourVersion?: number } | null>(null)
  let profilePromise: Promise<void> | null = null

  const role = computed(() => profile.value?.role ?? 'usuario')
  const isSuperAdmin = computed(() => !!profile.value?.superadmin)
  const mustChangePassword = computed(() => !!profile.value?.mustChangePassword)
  /** Mientras no se verifiquen los permisos se niega todo (fail-closed). */
  const DENY_ALL = { cuncia: false, acacias: false, concretos: false, clientes: false }

  /** Carga rol y permisos del usuario autenticado. Reusa la petición en curso. */
  function loadProfile(force = false): Promise<void> {
    if (!session.value) { profile.value = null; return Promise.resolve() }
    if (profilePromise && !force) return profilePromise
    const token = session.value.access_token
    profilePromise = (async () => {
      try {
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401 || res.status === 403) {
          // Token revocado o cuenta bloqueada: se cierra la sesión local.
          await signOut()
          return
        }
        profile.value = res.ok ? await res.json() : { role: 'usuario', superadmin: false, mustChangePassword: false, perms: DENY_ALL }
      } catch (e) {
        console.error('[auth] loadProfile error:', e)
        profile.value = { role: 'usuario', superadmin: false, mustChangePassword: false, perms: DENY_ALL }
      }
    })()
    return profilePromise
  }

  /**
   * Indica si el usuario puede ver una vista (p. ej. `cuncia/mantenimiento`).
   * Una vista queda bloqueada si ella o cualquiera de sus padres está en `false`.
   * Sin registro explícito se permite (compatibilidad con usuarios existentes).
   */
  function canView(key: string): boolean {
    if (!profile.value) return false
    if (profile.value.superadmin) return true
    const parts = key.split('/')
    for (let i = 1; i <= parts.length; i++) {
      if (profile.value.perms[parts.slice(0, i).join('/')] === false) return false
    }
    return true
  }

  /** Referencia para desuscribir el listener onAuthStateChange */
  let authUnsubscribe: (() => void) | null = null

  /** Restaura sesión previa y suscribe cambios de autenticación en tiempo real */
  async function initialize() {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
      if (data.session) await loadProfile(true)
    } catch (e) {
      console.error('[auth] initialize error:', e)
      session.value = null
      user.value = null
    } finally {
      loading.value = false
    }

    if (!authUnsubscribe) {
      const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, newSession: Session | null) => {
        const prevUserId = user.value?.id
        session.value = newSession
        user.value = newSession?.user ?? null
        if (!newSession) { profile.value = null; profilePromise = null }
        else if (event === 'SIGNED_IN' && newSession.user.id !== prevUserId) loadProfile(true)
      })
      authUnsubscribe = sub?.subscription?.unsubscribe ?? null
    }
  }


  /** Inicio de sesión contra API propia (rate-limited) + setSession en Supabase */
  async function signIn(email: string, password: string): Promise<{ session: unknown; user: User }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error || 'Error al iniciar sesión')
    }

    const { data: setData, error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    })

    if (sessionError) throw sessionError
    session.value = setData.session
    user.value = result.user
    await loadProfile(true)
    return result
  }


  /** Cierre de sesión con limpieza garantizada del estado local */
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (e) {
      console.error('[auth] signOut error:', e)
    } finally {
      session.value = null
      user.value = null
      profile.value = null
      profilePromise = null
      // Borra los datos guardados en este navegador: copia local (IndexedDB) y caché HTTP de la API
      await borrarCacheLocal()
      try { await fetch('/api/salir', { method: 'POST' }) } catch { /* sin red: la copia local ya se borró */ }
    }
  }

  /** Registra en el servidor que el usuario vio la guía de inicio (terminada u omitida). */
  async function marcarTourVisto(version: number): Promise<void> {
    if (profile.value) profile.value.tourVersion = version
    const token = session.value?.access_token
    if (!token) return
    try {
      await fetch('/api/me/tour', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
    } catch (e) {
      console.error('[auth] marcarTourVisto:', e)
    }
  }

  return {
    user, session, loading, isAuthenticated, userEmail, accessToken,
    profile, role, isSuperAdmin, mustChangePassword, canView, loadProfile, marcarTourVisto,
    initialize, signIn, signOut,
  }
})
