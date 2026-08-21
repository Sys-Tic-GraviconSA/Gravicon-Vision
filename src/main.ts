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
  app.use(router)

  const auth = useAuthStore()
  await auth.initialize()
  await router.isReady()

  app.mount('#app')
}

bootstrap()
