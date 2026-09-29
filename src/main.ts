import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import { useTheme } from './composables/useTheme'
import './style.css'

async function bootstrap() {
  const { initTheme } = useTheme()
  initTheme()

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // La sesión y los permisos se cargan antes de instalar el router: la primera navegación
  // (y sus redirecciones por defecto) ya conocen qué vistas puede ver el usuario
  const auth = useAuthStore()
  await auth.initialize()
  app.use(router)
  await router.isReady()

  app.mount('#app')
}

bootstrap()
