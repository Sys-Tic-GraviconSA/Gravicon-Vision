<template>
  <div class="page-layout">
    <header class="page-header">
      <h2 class="page-title">Panel Administrativo</h2>
      <span class="badge-role" :class="roleClass">{{ userRole }}</span>
    </header>

    <div class="admin-grid">
      <div class="admin-card">
        <h3>Mi Configuración</h3>
        <div class="config-row"><span>Email</span><strong>{{ authStore.userEmail }}</strong></div>
        <div class="config-row"><span>Rol</span><strong class="role-pill">{{ userRole }}</strong></div>
        <div class="config-row"><span>ID</span><code>{{ authStore.user?.id?.slice(0,8) }}…</code></div>
      </div>

      <div class="admin-card">
        <h3>Permisos por Vista</h3>
        <p class="admin-desc">Activa qué puede ver cada rol. (Conectado a <code>permisos_vista</code> — service_role)</p>
        <div class="perm-table">
          <div class="perm-header">
            <span>Vista</span>
            <span v-for="r in roles" :key="r" class="perm-role">{{ r }}</span>
          </div>
          <label v-for="vista in vistas" :key="vista.key" class="perm-row">
            <span class="perm-vista">{{ vista.label }}</span>
            <span v-for="r in roles" :key="r" class="perm-check">
              <input type="checkbox" :checked="permMatrix[`${vista.key}:${r}`]" @change="togglePerm(vista.key, r)" />
            </span>
          </label>
        </div>
        <button class="action-btn" style="margin-top:12px" @click="guardar" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
        <span v-if="saved" class="saved-msg">✓ Guardado</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const userRole = computed(() => (authStore.user as any)?.user_metadata?.role || (authStore.user as any)?.app_metadata?.role || 'usuario')
const roleClass = computed(() => userRole.value === 'admin' ? 'role-admin' : 'role-user')

const roles = ['admin', 'supervisor', 'operario', 'usuario']
const vistas = [
  { key: 'cuncia', label: 'Cuncia' },
  { key: 'cuncia/produccion', label: 'Cuncia · Producción' },
  { key: 'cuncia/mantenimiento', label: 'Cuncia · Mantenimiento' },
  { key: 'cuncia/informe', label: 'Cuncia · Informe' },
  { key: 'acacias', label: 'Acacias' },
  { key: 'acacias/produccion', label: 'Acacias · Producción' },
  { key: 'concretos', label: 'Concretos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'admin', label: 'Panel Admin' },
]

const permMatrix = ref<Record<string, boolean>>({})
for (const v of vistas) for (const r of roles) permMatrix.value[`${v.key}:${r}`] = r === 'admin' || r === 'usuario' ? true : false

const saving = ref(false)
const saved = ref(false)
function togglePerm(vista: string, role: string) {
  const k = `${vista}:${role}`
  permMatrix.value[k] = !permMatrix.value[k]
}
async function guardar() {
  saving.value = true
  // TODO: POST /api/admin/permisos con service_role — por ahora solo local
  await new Promise(r => setTimeout(r, 600))
  saving.value = false
  saved.value = true
  setTimeout(() => saved.value = false, 2000)
}
</script>

<style scoped>
.page-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.badge-role { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; }
.badge-role.role-admin { background:#1e293b; color:#fff; }
.badge-role.role-user { background:#e2e8f0; color:#475569; }
.admin-grid { display:grid; grid-template-columns: 340px 1fr; gap:20px; }
@media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
.admin-card { background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; padding:18px; }
.admin-card h3 { font-size:14px; font-weight:700; margin:0 0 12px; color:var(--text-primary); }
.config-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--card-border); font-size:13px; }
.config-row span { color:var(--text-secondary); }
.role-pill { background:var(--accent-light); color:var(--accent); padding:2px 8px; border-radius:6px; font-size:11px; text-transform:uppercase; }
.admin-desc { font-size:12px; color:var(--text-secondary); margin:0 0 12px; }
.perm-table { display:flex; flex-direction:column; gap:2px; }
.perm-header, .perm-row { display:grid; grid-template-columns: 1fr repeat(4, 60px); gap:8px; align-items:center; padding:6px 8px; border-radius:6px; font-size:12px; }
.perm-header { background:var(--bg-alt); font-weight:700; color:var(--text-secondary); text-transform:uppercase; font-size:10px; }
.perm-row { background: transparent; cursor:pointer; }
.perm-row:hover { background:var(--card-bg-hover); }
.perm-vista { font-weight:500; }
.perm-role { text-align:center; font-weight:600; }
.perm-check { text-align:center; }
.perm-check input { accent-color: var(--accent); width:16px; height:16px; }
.saved-msg { margin-left:10px; color:var(--success); font-size:12px; font-weight:600; }
</style>
