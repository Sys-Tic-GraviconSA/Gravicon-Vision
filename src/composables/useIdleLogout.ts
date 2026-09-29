import { onMounted, onUnmounted } from 'vue'

/** Minutos de inactividad antes de cerrar la sesión automáticamente. */
export const IDLE_TIMEOUT_MIN = 30
const STORAGE_KEY = 'gv:last-activity'
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'] as const

/**
 * Cierra la sesión tras IDLE_TIMEOUT_MIN minutos sin actividad.
 * La última actividad se comparte entre pestañas vía localStorage, así una pestaña
 * olvidada no cierra la sesión de otra que sí se está usando.
 */
export function useIdleLogout(isActive: () => boolean, onIdle: () => void) {
  const timeoutMs = IDLE_TIMEOUT_MIN * 60_000
  let lastLocal = Date.now()
  let lastWrite = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function touch() {
    lastLocal = Date.now()
    // Escritura limitada a una cada 15 s para no saturar el storage con mousemove.
    if (lastLocal - lastWrite > 15_000) {
      lastWrite = lastLocal
      try { localStorage.setItem(STORAGE_KEY, String(lastLocal)) } catch { /* storage bloqueado */ }
    }
  }

  function lastActivity(): number {
    try {
      const shared = Number(localStorage.getItem(STORAGE_KEY) || 0)
      return Math.max(lastLocal, shared)
    } catch {
      return lastLocal
    }
  }

  function check() {
    if (isActive() && Date.now() - lastActivity() > timeoutMs) onIdle()
  }

  onMounted(() => {
    touch()
    for (const e of EVENTS) window.addEventListener(e, touch, { passive: true })
    timer = setInterval(check, 30_000)
  })
  onUnmounted(() => {
    for (const e of EVENTS) window.removeEventListener(e, touch)
    if (timer) clearInterval(timer)
  })

  return { touch }
}
