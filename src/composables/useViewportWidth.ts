import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * useViewportWidth — Ancho actual del viewport en px, reactivo.
 * Se actualiza en el evento `resize` de la ventana con un pequeño debounce,
 * para evitar recomputar el layout de decenas de gráficos en cada frame.
 */
export function useViewportWidth() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)
  let timer: ReturnType<typeof setTimeout> | undefined

  function update() {
    clearTimeout(timer)
    timer = setTimeout(() => { width.value = window.innerWidth }, 100)
  }

  onMounted(() => window.addEventListener('resize', update))
  onBeforeUnmount(() => {
    window.removeEventListener('resize', update)
    clearTimeout(timer)
  })

  return width
}