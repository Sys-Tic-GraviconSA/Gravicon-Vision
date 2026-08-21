import { ref } from 'vue'

export type Theme = 'light' | 'dark'

/** Estado reactivo global del tema (compartido entre componentes) */
const theme = ref<Theme>('dark')

/**
 * Composable para manejo de tema claro/oscuro.
 * Persiste la preferencia en localStorage y escucha cambios del sistema.
 */
export function useTheme() {
  /** Alterna entre tema claro y oscuro */
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  /** Aplica el tema actual al `<html>` (data-theme + clase CSS) */
  function applyTheme() {
    const root = document.documentElement
    if (theme.value === 'light') {
      root.setAttribute('data-theme', 'light')
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.setAttribute('data-theme', 'dark')
      root.classList.add('dark')
      root.classList.remove('light')
    }
  }

  /**
   * Inicializa el tema:
   * - Restaura desde localStorage si existe
   * - Lee preferencia del sistema (prefers-color-scheme) si no hay almacenado
   * - Escucha cambios del sistema cuando no hay preferencia explícita
   */
  function initTheme() {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      theme.value = stored
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        theme.value = e.matches ? 'dark' : 'light'
        applyTheme()
      }
    })
  }

  return {
    theme,
    toggleTheme,
    initTheme,
  }
}
