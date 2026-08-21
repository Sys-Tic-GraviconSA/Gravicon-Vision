<template>
  <AuthLayout title="Bienvenido" subtitle="Inicia sesión en tu cuenta">
    <div v-if="error" class="error-msg" :style="{ color: isDark ? '#fca5a5' : '#dc2626', background: 'rgba(239,68,68,0.15)' }">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="login-form">
      <div class="field">
        <label for="email" class="input-label" :style="{ color: isDark ? '#94a3b8' : '#475569' }">Correo electrónico</label>
        <input id="email" v-model="email" type="email" autocomplete="email" autofocus placeholder="nombre@correo" required
          :style="inputStyle"
          :disabled="storeLoading" />
      </div>

      <div class="field">
        <label for="password" class="input-label" :style="{ color: isDark ? '#94a3b8' : '#475569' }">Contraseña</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" required
          :style="inputStyle"
          :disabled="storeLoading" />
      </div>

      <button type="submit" class="btn-primary" :disabled="storeLoading || !email || !password"
        :style="btnStyle">
        <span v-if="storeLoading" class="spinner"></span>
        <template v-else>Iniciar sesión</template>
      </button>

      <div class="form-footer" :style="{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)' }">
        <p :style="{ color: isDark ? '#64748b' : '#94a3b8' }">
          Acceso exclusivo para colaboradores de<br />
          <span class="footer-brand">Gravas, Agregados y Concretos S.A.</span>
        </p>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTheme } from '../composables/useTheme'
import AuthLayout from '../components/AuthLayout.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { theme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

const email = ref('')
const password = ref('')
const storeLoading = ref(false)
const error = ref('')

const inputStyle = computed(() =>
  isDark.value
    ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }
    : { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.15)', color: '#1e293b' }
)

const btnStyle = computed(() => ({
  background: isDark.value
    ? 'linear-gradient(135deg, #1a3a6b 0%, #0f2244 100%)'
    : 'linear-gradient(135deg, #1e3a6e 0%, #152d55 100%)',
  boxShadow: '0 4px 20px rgba(26, 58, 107, 0.5)',
}))

async function handleSubmit() {
  error.value = ''
  storeLoading.value = true
  try {
    await authStore.signIn(email.value, password.value)
    const redirectTo = route.query.redirect as string | undefined
    router.replace(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
  } catch (err: any) {
    console.error('[login-view]', err)
    error.value = err.message || 'Correo o contraseña inválidos'
  } finally {
    storeLoading.value = false
  }
}
</script>

<style scoped>
.input-label { font-size: 14px; font-weight: 500; transition: color 0.5s; }

.login-form { display: flex; flex-direction: column; gap: 20px; }

.field { display: flex; flex-direction: column; gap: 8px; }

input {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}
input:focus { box-shadow: 0 0 0 2px rgba(74,144,217,0.4); }
input:disabled { opacity: 0.5; cursor: not-allowed; }
input::placeholder { color: var(--text-tertiary); }

.error-msg {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 8px;
}

.btn-primary {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-weight: 600;
  color: white;
  font-size: 14px;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:active:not(:disabled) { transform: scale(0.99); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.form-footer {
  margin-top: 24px;
  padding-top: 24px;
}
.form-footer p {
  font-size: 12px;
  text-align: center;
  margin: 0;
}
.footer-brand { font-weight: 600; color: var(--accent); }
</style>
