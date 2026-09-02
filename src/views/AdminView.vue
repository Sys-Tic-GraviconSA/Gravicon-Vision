<template>
  <div class="page-layout">
    <header class="page-header">
      <h2 class="page-title">Configuración</h2>
      <span class="badge-role" :class="roleClass">{{ userRole }}</span>
    </header>

    <div class="admin-grid">
      <div class="admin-card">
        <h3>Mi Cuenta</h3>
        <div class="config-row"><span>Nombre</span><strong>{{ userName }}</strong></div>
        <div class="config-row"><span>Correo</span><strong>{{ authStore.userEmail }}</strong></div>
      </div>

      <div class="admin-card">
        <h3>Administrar Permisos</h3>
        <p class="admin-desc">Selecciona un usuario y define qué vistas puede ver. Todo queda dentro de Configuración.</p>

        <div class="user-select-row">
          <label>Usuario</label>
          <select v-model="selectedUser" class="user-select">
            <option v-for="u in usuarios" :key="u.email" :value="u.email">{{ u.email }} — {{ u.role }}</option>
          </select>
        </div>

        <div class="perm-table">
          <div class="perm-header">
            <span>Vista</span>
            <span class="perm-role" style="display:flex; align-items:center; justify-content:center; gap:6px;"><input type="checkbox" :checked="allChecked" @change="toggleAll" /> Permitir</span>
          </div>
          <label v-for="vista in filteredVistas" :key="vista.key" class="perm-row">
            <span class="perm-vista">{{ vista.label }}</span>
            <span class="perm-check">
              <input type="checkbox" :checked="!!userPerms[selectedUser]?.[vista.key]" @change="toggleUserPerm(vista.key)" />
            </span>
          </label>
        </div>

        <div class="admin-actions">
          <button class="action-btn" @click="guardar" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar permisos' }}</button>
          <span v-if="saved" class="saved-msg">Guardado</span>
        </div>
      </div>
    </div>

    <div class="admin-card" style="margin-top:20px">
      <h3>Vista previa — {{ selectedUser }}</h3>
      <div class="preview-chips">
        <span v-for="vista in filteredVistas.filter(v=> userPerms[selectedUser]?.[v.key])" :key="vista.key" class="preview-chip">{{ vista.label }}</span>
        <span v-if="!filteredVistas.filter(v=> userPerms[selectedUser]?.[v.key]).length" class="preview-empty">Sin vistas permitidas en filtro</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const userRole = computed(() => (authStore.user as any)?.user_metadata?.role || (authStore.user as any)?.app_metadata?.role || 'usuario')
const roleClass = computed(() => userRole.value === 'admin' ? 'role-admin' : 'role-user')
const userName = computed(() => {
  const email = authStore.userEmail
  if (!email) return ''
  const name = email.split('@')[0]
  return name.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
})

const vistas = [
  { key: 'cuncia', label: 'Cuncia — General' },
  { key: 'cuncia/produccion', label: 'Cuncia — Producción' },
  { key: 'cuncia/produccion/informe', label: 'Cuncia — Producción / Informe' },
  { key: 'cuncia/programacion', label: 'Cuncia — Programación' },
  { key: 'cuncia/mantenimiento', label: 'Cuncia — Mantenimiento' },
  { key: 'cuncia/mantenimiento/planta', label: 'Cuncia — Mant. Planta' },
  { key: 'cuncia/mantenimiento/maquinaria', label: 'Cuncia — Mant. Maquinaria' },
  { key: 'cuncia/mantenimiento/disponibilidad', label: 'Cuncia — Mant. Disponibilidad' },
  { key: 'cuncia/mantenimiento/tareas', label: 'Cuncia — Mant. Tareas' },
  { key: 'acacias', label: 'Acacias — General' },
  { key: 'acacias/produccion', label: 'Acacias — Producción' },
  { key: 'acacias/produccion/informe', label: 'Acacias — Producción / Informe' },
  { key: 'acacias/programacion', label: 'Acacias — Programación' },
  { key: 'acacias/mantenimiento', label: 'Acacias — Mantenimiento' },
  { key: 'acacias/mantenimiento/planta', label: 'Acacias — Mant. Planta' },
  { key: 'acacias/mantenimiento/maquinaria', label: 'Acacias — Mant. Maquinaria' },
  { key: 'concretos', label: 'Concretos — General' },
  { key: 'concretos/mantenimiento', label: 'Concretos — Mantenimiento' },
  { key: 'concretos/mantenimiento/planta', label: 'Concretos — Mant. Planta (Villavicencio/Acacias/Restrepo)' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'admin', label: 'Panel Admin' },
]
const vistaSearch = ref('')
const filteredVistas = computed(() => {
  const q = vistaSearch.value.toLowerCase().trim()
  if (!q) return vistas
  return vistas.filter(v => v.label.toLowerCase().includes(q) || v.key.toLowerCase().includes(q))
})

const usuarios = ref<{email:string, role:string}[]>([
  { email: authStore.userEmail, role: userRole.value },
].filter((v,i,a)=> a.findIndex(x=>x.email===v.email)===i))
const selectedUser = ref(usuarios.value[0]?.email || authStore.userEmail)
async function cargarUsuarios() {
  try {
    const token = authStore.accessToken
    if (!token) return
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const data = await res.json()
    const list = (data.users || []).map((u:any)=>({ email: u.email, role: u.role }))
    // Merge with current user if not in list
    for (const u of list) if (!usuarios.value.find(x=>x.email===u.email)) usuarios.value.push(u)
    // Ensure all real users are in list
    if (list.length) {
      usuarios.value = list
      if (!list.find((u:any)=>u.email===selectedUser.value)) selectedUser.value = list[0].email
    }
  } catch {}
}
onMounted(cargarUsuarios)
watch(() => authStore.userEmail, (e) => {
  if (e && !usuarios.value.find(u=>u.email===e)) usuarios.value.push({ email: e, role: userRole.value })
})

const userPerms = ref<Record<string, Record<string, boolean>>>({})
function ensureUser(email: string) {
  if (!userPerms.value[email]) {
    userPerms.value[email] = {}
    for (const v of vistas) userPerms.value[email][v.key] = true
  }
}
for (const u of usuarios.value) ensureUser(u.email)
watch(selectedUser, (e) => ensureUser(e))

const allChecked = computed(() => vistas.every(v => !!userPerms.value[selectedUser.value]?.[v.key]))
function toggleAll() {
  const target = !allChecked.value
  ensureUser(selectedUser.value)
  for (const v of vistas) userPerms.value[selectedUser.value][v.key] = target
  guardar()
}
function toggleUserPerm(vistaKey: string) {
  ensureUser(selectedUser.value)
  userPerms.value[selectedUser.value][vistaKey] = !userPerms.value[selectedUser.value][vistaKey]
  guardar()
}

const saving = ref(false)
const saved = ref(false)
async function guardar() {
  saving.value = true
  await new Promise(r => setTimeout(r, 600))
  // TODO: POST /api/admin/permisos { email: selectedUser, perms: userPerms[selectedUser] } con service_role
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
.config-actions { margin-top:12px; }
.role-pill { background:var(--accent-light); color:var(--accent); padding:2px 8px; border-radius:6px; font-size:11px; text-transform:uppercase; }
.admin-desc { font-size:12px; color:var(--text-secondary); margin:0 0 12px; }
.user-select-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.user-select-row label { font-size:12px; font-weight:600; color:var(--text-secondary); }
.user-select { flex:1; padding:8px 10px; border:1px solid var(--card-border); border-radius:8px; background:var(--bg); color:var(--text-primary); font-size:13px; }
.perm-table { display:flex; flex-direction:column; gap:2px; max-height:420px; overflow:auto; border:1px solid var(--card-border); border-radius:8px; padding:4px; }
.perm-header, .perm-row { display:grid; grid-template-columns: 1fr 80px; gap:8px; align-items:center; padding:6px 8px; border-radius:6px; font-size:12px; }
.perm-header { background:var(--bg-alt); font-weight:700; color:var(--text-secondary); text-transform:uppercase; font-size:10px; position:sticky; top:0; z-index:1; }
.perm-row { background: transparent; cursor:pointer; }
.perm-row:hover { background:var(--card-bg-hover); }
.perm-vista { font-weight:500; }
.perm-check { text-align:center; }
.perm-check input { accent-color: var(--accent); width:16px; height:16px; }
.admin-actions { display:flex; align-items:center; gap:12px; margin-top:12px; }
.saved-msg { color:var(--success); font-size:12px; font-weight:600; }
.preview-chips { display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px; margin-top:12px; }
.preview-chip { display:flex; align-items:center; justify-content:center; text-align:center; min-height:64px; padding:10px; border:1px solid var(--card-border); border-radius:10px; background:var(--card-bg); color:var(--text-primary); font-size:11px; font-weight:600; line-height:1.3; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.preview-empty { font-size:12px; color:var(--text-tertiary); text-align:center; padding:20px; border:1px dashed var(--card-border); border-radius:8px; }
</style>
