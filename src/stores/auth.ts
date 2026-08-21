import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
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

  /** Referencia para desuscribir el listener onAuthStateChange */
  let authUnsubscribe: (() => void) | null = null

  /** Restaura sesión previa y suscribe cambios de autenticación en tiempo real */
  async function initialize() {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user ?? null
    } catch (e) {
      console.error('[auth] initialize error:', e)
      session.value = null
      user.value = null
    } finally {
      loading.value = false
    }

    if (!authUnsubscribe) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
        session.value = newSession
        user.value = newSession?.user ?? null
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
    }
  }

  return {
    user, session, loading, isAuthenticated, userEmail, accessToken,
    initialize, signIn, signOut,
  }
})
