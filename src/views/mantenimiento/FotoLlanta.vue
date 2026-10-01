<template>
  <a v-if="url" class="foto-llanta" :class="{ grande }" :href="url" target="_blank" rel="noopener" :title="titulo">
    <img :src="url" :alt="titulo" />
  </a>
  <span v-else class="foto-llanta vacia" :class="{ grande, error }" :title="error ? `No se pudo abrir la foto: ${valor}` : 'Cargando foto…'">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    <span>{{ error ? 'Sin acceso' : '…' }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * FotoLlanta.vue — Miniatura de una foto de evidencia de inspección de llantas.
 * La foto se pide a /api/llantas/foto con el token (la API la busca en Drive) y se muestra como blob:,
 * que la CSP permite; al hacer clic se abre en tamaño completo. Sirve también dentro del PDF del informe.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{ valor: string; titulo?: string; grande?: boolean }>()
const url = ref('')
const error = ref(false)

async function cargar() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''; error.value = false
  try {
    const token = useAuthStore().accessToken
    const res = await fetch(`/api/llantas/foto?f=${encodeURIComponent(props.valor)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').startsWith('image/')) throw new Error(String(res.status))
    url.value = URL.createObjectURL(await res.blob())
  } catch { error.value = true }
}
watch(() => props.valor, cargar, { immediate: true })
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value) })
</script>

<style scoped>
.foto-llanta { display: inline-flex; width: 56px; height: 56px; border-radius: 6px; overflow: hidden; border: 1px solid var(--card-border, #e2e8f0); background: var(--bg-alt, #f1f5f9); flex-shrink: 0; }
.foto-llanta.grande { width: 120px; height: 90px; }
.foto-llanta img { width: 100%; height: 100%; object-fit: cover; display: block; }
.foto-llanta.vacia { flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #94a3b8; font-size: 9px; }
.foto-llanta.vacia.error { color: #b8860b; }
</style>
