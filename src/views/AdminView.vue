<template>
  <div class="page-layout">
    <header class="page-header">
      <img :src="theme === 'dark' ? '/Logos/logo-blanco.webp' : '/Logos/logo-azul.webp'" alt="Gravicon" class="page-logo" />
      <h2 class="page-title">Configuración</h2>
      <span class="badge-role" :class="roleClass">{{ roleLabel }}</span>
    </header>

    <div v-if="authStore.mustChangePassword" class="alert-banner">
      <strong>Debe cambiar su contraseña temporal.</strong> Por seguridad no podrá usar el tablero hasta definir una contraseña propia.
    </div>

    <div class="account-grid">
      <div class="admin-card">
        <h3>Mi Cuenta</h3>
        <div class="config-row"><span>Nombre</span><strong>{{ userName }}</strong></div>
        <div class="config-row"><span>Correo</span><strong>{{ authStore.userEmail }}</strong></div>
        <div class="config-row"><span>Rol</span><strong>{{ roleLabel }}</strong></div>
      </div>

      <form class="admin-card" :class="{ 'card-highlight': authStore.mustChangePassword }" @submit.prevent="cambiarPassword" autocomplete="off">
        <h3>Cambiar contraseña</h3>
        <label class="field">
          <span>Contraseña actual</span>
          <input v-model="pwForm.current" class="text-input" type="password" required autocomplete="current-password" />
        </label>
        <label class="field">
          <span>Nueva contraseña</span>
          <input v-model="pwForm.next" class="text-input" type="password" required autocomplete="new-password" />
          <ul class="pw-rules">
            <li v-for="r in reglas(pwForm.next)" :key="r.label" :class="{ ok: r.ok }">{{ r.ok ? '✓' : '•' }} {{ r.label }}</li>
          </ul>
        </label>
        <label class="field">
          <span>Confirmar nueva contraseña</span>
          <input v-model="pwForm.confirm" class="text-input" type="password" required autocomplete="new-password" />
          <small v-if="pwForm.confirm && pwForm.confirm !== pwForm.next" class="error-msg">No coincide con la nueva contraseña.</small>
        </label>
        <div class="admin-actions">
          <button type="submit" class="action-btn" :disabled="pwSaving || !pwFormValido"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg> {{ pwSaving ? 'Guardando…' : 'Actualizar contraseña' }}</button>
          <span v-if="pwMsg" class="saved-msg">{{ pwMsg }}</span>
          <span v-if="pwError" class="error-msg">{{ pwError }}</span>
        </div>
      </form>
    </div>

    <div v-if="!authStore.isSuperAdmin && !authStore.mustChangePassword" class="admin-card restricted">
      <h3>Administración de usuarios</h3>
      <p class="admin-desc">La creación de usuarios y la gestión de permisos están restringidas al administrador del sistema (sys.tic). Si necesitas acceso a otra vista, solicítalo a TIC.</p>
    </div>

    <template v-else-if="authStore.isSuperAdmin">
      <div class="admin-grid">
        <!-- Lista de usuarios -->
        <div class="admin-card users-card">
          <div class="card-head">
            <h3>Usuarios <span class="count">{{ usuarios.length }}</span></h3>
            <button class="action-btn" @click="abrirNuevo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nuevo usuario</button>
          </div>
          <input v-model="userSearch" class="text-input" type="search" placeholder="Buscar correo…" />
          <SkeletonLoader v-if="loadingUsers" variant="list" :rows="6" label="Cargando usuarios…" />
          <div v-else-if="usersError" class="error-msg">{{ usersError }}</div>
          <ul v-else class="user-list">
            <li v-for="u in filteredUsers" :key="u.id">
              <button class="user-item" :class="{ active: u.email === selectedUser }" @click="seleccionar(u.email)">
                <span class="user-email">{{ u.email }}</span>
                <span class="user-meta">
                  <span class="role-pill" :class="'pill-' + u.role">{{ rolLabel(u.role) }}</span>
                  <span v-if="u.banned" class="role-pill pill-banned">Bloqueado</span>
                  <span v-else-if="u.must_change_password" class="role-pill pill-pending">Clave temporal</span>
                  <span class="last-login">{{ u.last_sign_in_at ? 'Últ. ingreso ' + fmtFecha(u.last_sign_in_at) : 'Nunca ingresó' }}</span>
                </span>
              </button>
            </li>
            <li v-if="!filteredUsers.length" class="muted">Sin resultados</li>
          </ul>
        </div>

        <!-- Editor de permisos -->
        <div class="admin-card">
          <template v-if="selected">
            <div class="card-head">
              <h3>Permisos — {{ selected.email }}</h3>
              <label v-if="selected.role !== 'superadmin'" class="check-all">
                <input type="checkbox" :checked="allChecked" :indeterminate.prop="someChecked && !allChecked" @change="setAll(!allChecked)" />
                Todas
              </label>
            </div>

            <div v-if="selected.role !== 'superadmin'" class="account-actions">
              <label class="inline-field">
                <span>Rol</span>
                <select class="text-input compact" :value="selected.role" :disabled="accionando" @change="cambiarRol(($event.target as HTMLSelectElement).value)">
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button class="action-btn clear" :disabled="accionando" @click="abrirReset"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg> Restablecer contraseña</button>
              <button v-if="!selected.banned" class="action-btn danger" :disabled="accionando" @click="bloquear(true)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Bloquear acceso</button>
              <button v-else class="action-btn success" :disabled="accionando" @click="bloquear(false)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Desbloquear</button>
              <button class="action-btn danger" :disabled="accionando" @click="abrirEliminar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Eliminar usuario</button>
              <span v-if="accionMsg" class="saved-msg">{{ accionMsg }}</span>
              <span v-if="accionError" class="error-msg">{{ accionError }}</span>
            </div>

            <p v-if="selected.role === 'superadmin'" class="admin-desc">El administrador del sistema tiene acceso total; sus permisos no se pueden restringir.</p>

            <template v-else>
              <div v-if="migracionPendiente" class="alert-banner">
                <strong>Permisos sin activar.</strong> Falta crear la tabla de permisos en Supabase: ejecute
                <code>supabase/003_blindaje_seguridad.sql</code> en el SQL Editor. Mientras tanto todos los usuarios ven todas las vistas.
              </div>
              <SkeletonLoader v-if="loadingPerms" variant="list" :rows="8" label="Cargando permisos…" />
              <div v-else class="perm-groups">
                <section v-for="g in grupos" :key="g.id" class="perm-group">
                  <label class="group-head">
                    <input type="checkbox" :checked="groupState(g) === 'all'" :indeterminate.prop="groupState(g) === 'some'" @change="setGroup(g, groupState(g) !== 'all')" />
                    <span>{{ g.label }}</span>
                    <span class="group-count">{{ g.vistas.filter(v => draft[v.key]).length }}/{{ g.vistas.length }}</span>
                  </label>
                  <label v-for="v in g.vistas" :key="v.key" class="perm-row" :class="{ disabled: bloqueadaPorPadre(v.key) }" :style="{ paddingLeft: 12 + nivel(v.key) * 16 + 'px' }">
                    <input type="checkbox" :checked="!!draft[v.key] && !bloqueadaPorPadre(v.key)" :title="bloqueadaPorPadre(v.key) ? 'Al marcarla se habilita también su sección, solo con esta vista' : undefined" @change="marcar(v.key, ($event.target as HTMLInputElement).checked)" />
                    <span>{{ v.label }}</span>
                  </label>
                </section>
              </div>

              <div class="admin-actions">
                <button class="action-btn" @click="guardar" :disabled="saving || !dirty"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {{ saving ? 'Guardando…' : 'Guardar permisos' }}</button>
                <button class="action-btn clear" @click="descartar" :disabled="saving || !dirty"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Descartar</button>
                <span v-if="dirty && !saving" class="dirty-msg">Cambios sin guardar</span>
                <span v-if="saved" class="saved-msg">Guardado</span>
                <span v-if="saveError" class="error-msg">{{ saveError }}</span>
              </div>
            </template>
          </template>
          <p v-else class="muted">Selecciona un usuario para editar sus permisos.</p>
        </div>
      </div>
    </template>

    <!-- Modal: nuevo usuario -->
    <div v-if="showNuevo" class="modal-backdrop" @click.self="cerrarNuevo">
      <form class="modal" @submit.prevent="crearUsuario" autocomplete="off">
        <h3>Nuevo usuario</h3>
        <label class="field">
          <span>Correo</span>
          <input v-model.trim="nuevo.email" class="text-input" type="email" required placeholder="nombre@gravicon.com.co" autocomplete="off" />
        </label>
        <label class="field">
          <span>Contraseña temporal</span>
          <div class="pw-row">
            <input v-model="nuevo.password" class="text-input" :type="showPw ? 'text' : 'password'" required autocomplete="new-password" />
            <button type="button" class="action-btn clear" @click="showPw = !showPw" :title="showPw ? 'Ocultar' : 'Ver'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button type="button" class="action-btn clear" @click="nuevo.password = generarPassword(); showPw = true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Generar</button>
          </div>
          <ul class="pw-rules">
            <li v-for="r in reglas(nuevo.password)" :key="r.label" :class="{ ok: r.ok }">{{ r.ok ? '✓' : '•' }} {{ r.label }}</li>
          </ul>
        </label>
        <label class="field">
          <span>Rol</span>
          <select v-model="nuevo.role" class="text-input">
            <option value="usuario">Usuario</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label class="field">
          <span>Permisos iniciales</span>
          <select v-model="nuevo.permsFrom" class="text-input">
            <option value="">Sin vistas (asignar después)</option>
            <option value="*">Todas las vistas</option>
            <option v-for="g in grupos" :key="g.id" :value="g.id">Solo {{ g.label }}</option>
          </select>
        </label>
        <p class="admin-desc">El usuario deberá cambiar esta contraseña en su primer ingreso. Compártala por un canal privado.</p>
        <p v-if="createError" class="error-msg">{{ createError }}</p>
        <div class="admin-actions end">
          <button type="button" class="action-btn clear" @click="cerrarNuevo" :disabled="creating">Cancelar</button>
          <button type="submit" class="action-btn primary" :disabled="creating || !passwordValida(nuevo.password) || !nuevo.email"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> {{ creating ? 'Creando…' : 'Crear usuario' }}</button>
        </div>
      </form>
    </div>

    <!-- Modal: eliminar usuario (se confirma escribiendo el correo) -->
    <div v-if="showEliminar && selected" class="modal-backdrop" @click.self="showEliminar = false">
      <form class="modal" @submit.prevent="eliminar" autocomplete="off">
        <h3>Eliminar usuario</h3>
        <p class="admin-desc">
          Se eliminará la cuenta de <strong>{{ selected.email }}</strong> de forma <strong>definitiva</strong>: no podrá volver a ingresar y se borran sus permisos.
          La cuenta es compartida: también <strong>pierde el acceso a Indicadores</strong> y se borra su perfil allí.
          Esta acción no se puede deshacer. Si solo quiere impedir el acceso por un tiempo, use «Bloquear acceso».
        </p>
        <label class="admin-desc" for="confirmar-eliminar">Para confirmar, escriba el correo del usuario:</label>
        <input id="confirmar-eliminar" v-model="confirmarEmail" class="text-input mono" type="text" :placeholder="selected.email" autocomplete="off" spellcheck="false" />
        <p v-if="accionError" class="error-msg">{{ accionError }}</p>
        <div class="admin-actions end">
          <button type="button" class="action-btn clear" @click="showEliminar = false" :disabled="accionando">Cancelar</button>
          <button type="submit" class="action-btn danger" :disabled="accionando || confirmarEmail.trim().toLowerCase() !== selected.email.toLowerCase()">{{ accionando ? 'Eliminando…' : 'Eliminar definitivamente' }}</button>
        </div>
      </form>
    </div>

    <!-- Modal: restablecer contraseña -->
    <div v-if="showReset && selected" class="modal-backdrop" @click.self="showReset = false">
      <form class="modal" @submit.prevent="restablecer" autocomplete="off">
        <h3>Restablecer contraseña</h3>
        <p class="admin-desc">Nueva contraseña temporal para <strong>{{ selected.email }}</strong>. Deberá cambiarla al ingresar.</p>
        <div class="pw-row">
          <input v-model="resetPw" class="text-input mono" type="text" required autocomplete="new-password" />
          <button type="button" class="action-btn clear" @click="resetPw = generarPassword()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Generar</button>
        </div>
        <ul class="pw-rules">
          <li v-for="r in reglas(resetPw)" :key="r.label" :class="{ ok: r.ok }">{{ r.ok ? '✓' : '•' }} {{ r.label }}</li>
        </ul>
        <p v-if="accionError" class="error-msg">{{ accionError }}</p>
        <div class="admin-actions end">
          <button type="button" class="action-btn clear" @click="showReset = false" :disabled="accionando">Cancelar</button>
          <button type="submit" class="action-btn primary" :disabled="accionando || !passwordValida(resetPw)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg> {{ accionando ? 'Guardando…' : 'Restablecer' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import SkeletonLoader from '../components/ui/SkeletonLoader.vue'
import { useTheme } from '../composables/useTheme'

const authStore = useAuthStore()
const { theme } = useTheme()

const ROLE_LABELS: Record<string, string> = { superadmin: 'Administrador del sistema', admin: 'Admin', usuario: 'Usuario' }
const rolLabel = (r: string) => ROLE_LABELS[r] ?? r
const roleLabel = computed(() => rolLabel(authStore.role))
const roleClass = computed(() => authStore.role === 'usuario' ? 'role-user' : 'role-admin')
const userName = computed(() => {
  const email = authStore.userEmail
  if (!email) return ''
  return email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
})

interface Vista { key: string; label: string }
interface Grupo { id: string; label: string; vistas: Vista[] }

/** Vistas agrupadas por planta. La primera vista de cada grupo es la raíz (su clave = id del grupo). */
// Las claves son las rutas de cada pantalla (el router las usa tal cual para permitir o bloquear).
// No cambiar claves existentes: se perderían los permisos ya asignados. Solo el texto se puede ajustar.

/**
 * Mantenimiento (/:planta/mantenimiento/:area/:seccion/:vista, ver useRutaMantenimiento).
 * Disponibilidad, Llantas y Combustible tienen además una clave general (…/mantenimiento/disponibilidad,
 * …/inspeccion, …/combustible) que aplica a todas las áreas.
 */
function vistasMantenimiento(p: string, concretos: boolean): Vista[] {
  const m = `${p}/mantenimiento`
  const area = (a: 'planta' | 'maquinaria', nombre: string): Vista[] => [
    { key: `${m}/${a}`, label: `Mant. ${nombre}` },
    { key: `${m}/${a}/ordenes`, label: `${nombre} · Órdenes de Trabajo` },
    { key: `${m}/${a}/ordenes/graficas`, label: 'Órdenes · Gráficas' },
    { key: `${m}/${a}/ordenes/detalle`, label: 'Órdenes · Detalle' },
    { key: `${m}/${a}/ordenes/informe`, label: 'Órdenes · Informe' },
    { key: `${m}/${a}/almacen`, label: `${nombre} · Almacén` },
    { key: `${m}/${a}/almacen/graficas`, label: 'Almacén · Gráficas' },
    { key: `${m}/${a}/almacen/solicitudes`, label: 'Almacén · Solicitudes' },
    { key: `${m}/${a}/gerencial`, label: `${nombre} · Gerencial` },
    { key: `${m}/${a}/disponibilidad`, label: `${nombre} · Disponibilidad` },
    { key: `${m}/${a}/disponibilidad/graficas`, label: 'Disponibilidad · Gráficas' },
    { key: `${m}/${a}/disponibilidad/informe`, label: 'Disponibilidad · Informe' },
    ...(concretos ? [{ key: `${m}/${a}/combustible`, label: `${nombre} · Combustible` }] : []),
    // Llantas solo existe en Maquinaria de Concretos (en la URL «llantas»; su clave general es …/inspeccion)
    ...(concretos && a === 'maquinaria' ? [
      { key: `${m}/${a}/llantas`, label: `${nombre} · Llantas` },
      { key: `${m}/${a}/llantas/graficas`, label: 'Llantas · Gráficas' },
      { key: `${m}/${a}/llantas/alertas`, label: 'Llantas · Alertas' },
      { key: `${m}/${a}/llantas/inventario`, label: 'Llantas · Inventario' },
      { key: `${m}/${a}/llantas/informe`, label: 'Llantas · Informe' },
    ] : []),
  ]
  return [
    { key: m, label: 'Mantenimiento' },
    { key: `${m}/disponibilidad`, label: 'Mant. Disponibilidad (todas las áreas)' },
    ...(concretos ? [
      { key: `${m}/inspeccion`, label: 'Mant. Llantas (todas las vistas)' },
      { key: `${m}/combustible`, label: 'Mant. Combustible (todas las áreas)' },
    ] : []),
    ...area('planta', 'Planta'),
    ...area('maquinaria', 'Maquinaria'),
    { key: `${m}/tareas`, label: 'Mant. Tareas' },
    { key: `${m}/tareas/graficas`, label: 'Tareas · Gráficas' },
    { key: `${m}/tareas/tabla`, label: 'Tareas · Tabla' },
    { key: `${m}/tareas/informe`, label: 'Tareas · Informe' },
  ]
}

function vistasAgregados(p: string): Vista[] {
  return [
    { key: p, label: 'Acceso general' },
    { key: `${p}/produccion`, label: 'Producción' },
    { key: `${p}/produccion/graficas`, label: 'Producción · Gráficas' },
    { key: `${p}/produccion/detalles`, label: 'Producción · Detalles' },
    { key: `${p}/produccion/informe`, label: 'Producción · Informe' },
    { key: `${p}/facturacion`, label: 'Despacho' },
    { key: `${p}/facturacion/graficas`, label: 'Despacho · Gráficas' },
    { key: `${p}/facturacion/detalle`, label: 'Despacho · Detalle' },
    { key: `${p}/facturacion/informe`, label: 'Despacho · Informe' },
    { key: `${p}/facturacion/balance`, label: 'Despacho · Producción vs Despacho' },
    { key: `${p}/programacion`, label: 'Programación' },
    { key: `${p}/programacion/gravicon`, label: 'Programación · Gravicon' },
    { key: `${p}/programacion/cliente`, label: 'Programación · Cliente' },
    ...vistasMantenimiento(p, false),
  ]
}
const grupos: Grupo[] = [
  { id: 'cuncia', label: 'Cuncía', vistas: vistasAgregados('cuncia') },
  { id: 'acacias', label: 'Acacías', vistas: vistasAgregados('acacias') },
  { id: 'concretos', label: 'Concretos', vistas: [
    { key: 'concretos', label: 'Acceso general' },
    { key: 'concretos/produccion', label: 'Producción' },
    { key: 'concretos/produccion/planta', label: 'Producción Planta' },
    { key: 'concretos/produccion/planta/graficas', label: 'Producción Planta · Gráficas' },
    { key: 'concretos/produccion/planta/informe', label: 'Producción Planta · Informe' },
    { key: 'concretos/produccion/proyeccion', label: 'Proyección Comercial' },
    { key: 'concretos/produccion/proyeccion/graficas', label: 'Proyección Comercial · Gráficas' },
    { key: 'concretos/produccion/proyeccion/informe', label: 'Proyección Comercial · Informe' },
    ...vistasMantenimiento('concretos', true),
  ] },
  { id: 'clientes', label: 'Clientes', vistas: [
    { key: 'clientes', label: 'Acceso general' },
  ] },
]
const allKeys = grupos.flatMap(g => g.vistas.map(v => v.key))

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${authStore.accessToken ?? ''}` }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

async function apiError(res: Response, fallback: string) {
  try { return (await res.json()).error || fallback } catch { return fallback }
}

// ── Política de contraseñas (mismas reglas que valida el servidor) ──
function reglas(p: string) {
  return [
    { label: 'Mínimo 10 caracteres', ok: p.length >= 10 && p.length <= 72 },
    { label: 'Mayúscula y minúscula', ok: /[a-z]/.test(p) && /[A-Z]/.test(p) },
    { label: 'Un número', ok: /\d/.test(p) },
    { label: 'Un símbolo', ok: /[^A-Za-z0-9]/.test(p) },
  ]
}
const passwordValida = (p: string) => reglas(p).every(r => r.ok)

// ── Cambio de contraseña propia ─────────────────────────
const pwForm = reactive({ current: '', next: '', confirm: '' })
const pwSaving = ref(false)
const pwMsg = ref('')
const pwError = ref('')
const pwFormValido = computed(() => !!pwForm.current && passwordValida(pwForm.next) && pwForm.next === pwForm.confirm)

async function cambiarPassword() {
  pwSaving.value = true
  pwMsg.value = ''
  pwError.value = ''
  try {
    const res = await fetch('/api/me/password', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    })
    if (!res.ok) { pwError.value = await apiError(res, 'No se pudo cambiar la contraseña.'); return }
    Object.assign(pwForm, { current: '', next: '', confirm: '' })
    pwMsg.value = 'Contraseña actualizada'
    await authStore.loadProfile(true)
    if (authStore.isSuperAdmin && !usuarios.value.length) cargarUsuarios()
    setTimeout(() => (pwMsg.value = ''), 3000)
  } catch {
    pwError.value = 'No se pudo cambiar la contraseña.'
  } finally {
    pwSaving.value = false
  }
}

// ── Usuarios ─────────────────────────────────────────────
interface Usuario { id: string; email: string; role: string; created_at: string; last_sign_in_at: string | null; banned: boolean; must_change_password: boolean }
const usuarios = ref<Usuario[]>([])
const loadingUsers = ref(false)
const usersError = ref('')
const userSearch = ref('')
const selectedUser = ref('')
const selected = computed(() => usuarios.value.find(u => u.email === selectedUser.value) ?? null)
const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase().trim()
  return q ? usuarios.value.filter(u => u.email.toLowerCase().includes(q)) : usuarios.value
})

const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

async function cargarUsuarios() {
  loadingUsers.value = true
  usersError.value = ''
  try {
    const res = await fetch('/api/admin/users', { headers: authHeaders() })
    if (!res.ok) { usersError.value = await apiError(res, 'No se pudieron cargar los usuarios.'); return }
    const data = await res.json()
    usuarios.value = (data.users as Usuario[]).sort((a, b) => a.email.localeCompare(b.email))
    if (!selected.value && usuarios.value.length) seleccionar(usuarios.value[0].email)
  } catch {
    usersError.value = 'No se pudieron cargar los usuarios.'
  } finally {
    loadingUsers.value = false
  }
}

// ── Permisos ─────────────────────────────────────────────
const draft = reactive<Record<string, boolean>>({})
const original = ref<Record<string, boolean>>({})
const loadingPerms = ref(false)
/** La tabla permisos_vista aún no existe en Supabase (falta ejecutar supabase/003_blindaje_seguridad.sql) */
const migracionPendiente = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const dirty = computed(() => allKeys.some(k => !!draft[k] !== !!original.value[k]))
const allChecked = computed(() => allKeys.every(k => draft[k]))
const someChecked = computed(() => allKeys.some(k => draft[k]))

/** Profundidad de la vista en la ruta (cuncia = 0, cuncia/produccion = 1, …) */
const nivel = (key: string) => key.split('/').length - 1
/** Una vista no se puede marcar si algún nivel superior de su ruta está desmarcado */
function bloqueadaPorPadre(key: string): boolean {
  const partes = key.split('/')
  for (let i = 1; i < partes.length; i++) {
    const padre = partes.slice(0, i).join('/')
    if (padre in draft && !draft[padre]) return true
  }
  // Secciones de Mantenimiento con clave general (aplica a todas las áreas): …/planta/disponibilidad depende de …/disponibilidad
  if (partes[1] === 'mantenimiento' && partes.length >= 4) {
    const general = ({ disponibilidad: 'disponibilidad', llantas: 'inspeccion', combustible: 'combustible' } as Record<string, string>)[partes[3]]
    const clave = general && `${partes[0]}/mantenimiento/${general}`
    if (clave && clave in draft && !draft[clave]) return true
  }
  return false
}

/** Clave general de Mantenimiento de la que depende una sección (…/maquinaria/llantas → …/inspeccion) */
const GENERAL_DE: Record<string, string> = { disponibilidad: 'disponibilidad', llantas: 'inspeccion', combustible: 'combustible' }
function generalDe(key: string): string | null {
  const partes = key.split('/')
  if (partes[1] !== 'mantenimiento' || partes.length < 4 || !GENERAL_DE[partes[3]]) return null
  const g = `${partes[0]}/mantenimiento/${GENERAL_DE[partes[3]]}`
  return g in draft ? g : null
}
/** Padres de una clave, de arriba abajo: niveles superiores de la ruta y, al final, su clave general */
function padres(key: string): string[] {
  const partes = key.split('/')
  const ruta = partes.slice(1).map((_, i) => partes.slice(0, i + 1).join('/')).filter(k => k in draft)
  const g = generalDe(key)
  return g ? [...ruta, g] : ruta
}

/**
 * Marcar o desmarcar una vista. Cada vista tiene su permiso; para dar SOLO una vista (p. ej. solo Llantas)
 * basta con marcarla aunque su sección esté apagada: se encienden sus niveles superiores, pero las demás vistas
 * de esos niveles quedan apagadas (antes no se veían) y se encienden todas las vistas de lo marcado.
 * Marcar la clave general de una sección (Llantas, Disponibilidad, Combustible) enciende esa sección en sus áreas.
 */
function marcar(key: string, valor: boolean) {
  if (!valor) { draft[key] = false; return }
  const camino = padres(key)
  for (const p of camino) {
    if (draft[p]) continue
    draft[p] = true
    for (const k of allKeys) {
      if (!k.startsWith(p + '/') || k === key || camino.includes(k) || key.startsWith(k + '/') || k.startsWith(key + '/')) continue
      draft[k] = false
    }
  }
  draft[key] = true
  for (const k of allKeys) if (k.startsWith(key + '/')) draft[k] = true
  // Clave general (…/mantenimiento/inspeccion): enciende la sección correspondiente en cada área
  const partes = key.split('/')
  if (partes.length === 3 && partes[1] === 'mantenimiento') {
    const seccion = Object.entries(GENERAL_DE).find(([, g]) => g === partes[2])?.[0]
    if (seccion) for (const k of allKeys) {
      const q = k.split('/')
      if (q.length === 4 && q[0] === partes[0] && q[1] === 'mantenimiento' && q[3] === seccion && !draft[k]) marcar(k, true)
    }
  }
}

function groupState(g: Grupo): 'all' | 'some' | 'none' {
  const n = g.vistas.filter(v => draft[v.key]).length
  return n === g.vistas.length ? 'all' : n ? 'some' : 'none'
}
function setGroup(g: Grupo, value: boolean) { for (const v of g.vistas) draft[v.key] = value }
function setAll(value: boolean) { for (const k of allKeys) draft[k] = value }

async function seleccionar(email: string) {
  if (dirty.value && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
  selectedUser.value = email
  saveError.value = ''
  if (selected.value?.role === 'superadmin') return
  loadingPerms.value = true
  try {
    const res = await fetch(`/api/admin/permisos?email=${encodeURIComponent(email)}`, { headers: authHeaders() })
    const body = res.ok ? await res.json() : { perms: [] }
    migracionPendiente.value = !!body.migracionPendiente
    const rows: { vista: string; permitido: boolean }[] = body.perms ?? []
    const map = Object.fromEntries(rows.map(r => [r.vista, r.permitido]))
    // Sin registro = permitido (mismo criterio que canView en el store).
    const next: Record<string, boolean> = {}
    for (const k of allKeys) next[k] = map[k] !== false
    original.value = next
    Object.assign(draft, next)
  } finally {
    loadingPerms.value = false
  }
}

function descartar() { Object.assign(draft, original.value) }

async function guardar() {
  if (!selected.value) return
  saving.value = true
  saveError.value = ''
  try {
    const perms = Object.fromEntries(allKeys.map(k => [k, !!draft[k]]))
    const res = await fetch('/api/admin/permisos', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ email: selected.value.email, perms }),
    })
    if (!res.ok) { saveError.value = await apiError(res, 'No se pudieron guardar los permisos.'); return }
    original.value = perms
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch {
    saveError.value = 'No se pudieron guardar los permisos.'
  } finally {
    saving.value = false
  }
}

// ── Acciones sobre cuentas ───────────────────────────────
const accionando = ref(false)
const accionMsg = ref('')
const accionError = ref('')
const showReset = ref(false)
const resetPw = ref('')

async function accionCuenta(path: string, body: Record<string, unknown>, okMsg: string, method: 'POST' | 'DELETE' = 'POST'): Promise<boolean> {
  if (!selected.value) return false
  accionando.value = true
  accionMsg.value = ''
  accionError.value = ''
  try {
    const url = `/api/admin/users/${selected.value.id}${path ? `/${path}` : ''}`
    const res = await fetch(url, method === 'DELETE'
      ? { method, headers: authHeaders() }
      : { method, headers: authHeaders(true), body: JSON.stringify(body) })
    if (!res.ok) { accionError.value = await apiError(res, 'No se pudo completar la acción.'); return false }
    accionMsg.value = okMsg
    setTimeout(() => (accionMsg.value = ''), 2500)
    await cargarUsuarios()
    return true
  } catch {
    accionError.value = 'No se pudo completar la acción.'
    return false
  } finally {
    accionando.value = false
  }
}

function bloquear(blocked: boolean) {
  if (!selected.value) return
  if (blocked && !confirm(`¿Bloquear el acceso de ${selected.value.email}? Su sesión actual dejará de funcionar de inmediato.`)) return
  accionCuenta('block', { blocked }, blocked ? 'Acceso bloqueado' : 'Acceso restablecido')
}

function cambiarRol(role: string) {
  accionCuenta('role', { role }, 'Rol actualizado')
}

function abrirReset() {
  resetPw.value = generarPassword()
  accionError.value = ''
  showReset.value = true
}

async function restablecer() {
  if (await accionCuenta('reset-password', { password: resetPw.value }, 'Contraseña restablecida')) showReset.value = false
}

// ── Eliminar usuario ────────────────────────────────────
const showEliminar = ref(false)
const confirmarEmail = ref('')

function abrirEliminar() {
  confirmarEmail.value = ''
  accionError.value = ''
  showEliminar.value = true
}

async function eliminar() {
  const u = selected.value
  if (!u || confirmarEmail.value.trim().toLowerCase() !== u.email.toLowerCase()) return
  // Se deselecciona antes de recargar la lista: el usuario eliminado ya no existe
  const ok = await accionCuenta('', {}, `Usuario ${u.email} eliminado`, 'DELETE')
  if (!ok) return
  showEliminar.value = false
  // Descarta cambios de permisos pendientes del usuario eliminado (evita el aviso de «cambios sin guardar»)
  for (const k of allKeys) draft[k] = !!original.value[k]
  selectedUser.value = ''
  if (usuarios.value.length) seleccionar(usuarios.value[0].email)
}

// ── Nuevo usuario ────────────────────────────────────────
const showNuevo = ref(false)
const showPw = ref(false)
const creating = ref(false)
const createError = ref('')
const nuevo = reactive({ email: '', password: '', role: 'usuario', permsFrom: '' })

function generarPassword(): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?-_']
  const all = sets.join('')
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const chars = sets.map(s => s[rnd(s.length)])
  while (chars.length < 14) chars.push(all[rnd(all.length)])
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

function abrirNuevo() {
  Object.assign(nuevo, { email: '', password: generarPassword(), role: 'usuario', permsFrom: '' })
  createError.value = ''
  showPw.value = true
  showNuevo.value = true
}
function cerrarNuevo() { if (!creating.value) showNuevo.value = false }

async function crearUsuario() {
  creating.value = true
  createError.value = ''
  try {
    const perms = Object.fromEntries(allKeys.map(k => [
      k,
      nuevo.permsFrom === '*' || (!!nuevo.permsFrom && (k === nuevo.permsFrom || k.startsWith(nuevo.permsFrom + '/'))),
    ]))
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ email: nuevo.email, password: nuevo.password, role: nuevo.role, perms }),
    })
    if (!res.ok) { createError.value = await apiError(res, 'No se pudo crear el usuario.'); return }
    const { user } = await res.json()
    showNuevo.value = false
    nuevo.password = ''
    await cargarUsuarios()
    await seleccionar(user.email)
  } catch {
    createError.value = 'No se pudo crear el usuario.'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await authStore.loadProfile()
  if (authStore.isSuperAdmin) cargarUsuarios()
})
</script>

<style scoped>
.page-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.page-logo { height:38px; width:auto; padding-right:14px; border-right:1px solid var(--card-border); }
.badge-role { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; }
.badge-role.role-admin { background:#1e293b; color:#fff; }
.badge-role.role-user { background:#e2e8f0; color:#475569; }
/* Lista de usuarios más ancha: el correo completo, el rol y el último ingreso caben sin cortarse */
.admin-grid { display:grid; grid-template-columns: minmax(380px, 460px) 1fr; gap:20px; margin-top:20px; }
@media (max-width: 1100px) { .admin-grid { grid-template-columns: minmax(320px, 380px) 1fr; } }
@media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
.admin-card { background:var(--card-bg); border:1px solid var(--card-border); border-radius:12px; padding:18px; min-width:0; }
.account-card { max-width:520px; }
.restricted { margin-top:20px; max-width:520px; }
.admin-card h3 { font-size:14px; font-weight:700; margin:0; color:var(--text-primary); }
.account-card h3, .restricted h3 { margin-bottom:12px; }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.count { font-size:11px; font-weight:600; color:var(--text-tertiary); margin-left:4px; }
.config-row { display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid var(--card-border); font-size:13px; }
.config-row span { color:var(--text-secondary); }
.config-row strong { overflow-wrap:anywhere; text-align:right; }
.admin-desc { font-size:12px; color:var(--text-secondary); margin:0; line-height:1.5; }
.muted { font-size:12px; color:var(--text-tertiary); padding:8px 0; }

.text-input { width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid var(--card-border); border-radius:8px; background:var(--bg); color:var(--text-primary); font-size:13px; }
.text-input:focus { outline:2px solid var(--accent); outline-offset:-1px; }

.user-list { list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:2px; max-height:520px; overflow:auto; }
.user-item { width:100%; text-align:left; background:none; border:1px solid transparent; border-radius:8px; padding:8px 10px; cursor:pointer; color:var(--text-primary); display:flex; flex-direction:column; gap:4px; }
.user-item:hover { background:var(--card-bg-hover); }
.user-item.active { border-color:var(--accent); background:var(--accent-light); }
.user-email { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.user-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.last-login { font-size:11px; color:var(--text-tertiary); }
.role-pill { padding:1px 7px; border-radius:6px; font-size:10px; font-weight:700; text-transform:uppercase; background:var(--bg-alt); color:var(--text-secondary); }
.role-pill.pill-superadmin { background:#1e293b; color:#fff; }
.role-pill.pill-admin { background:var(--accent-light); color:var(--accent); }
.role-pill.pill-banned { background:var(--danger-light); color:var(--danger); }

.check-all { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--text-secondary); cursor:pointer; }
.perm-groups { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px; }
.perm-group { border:1px solid var(--card-border); border-radius:10px; padding:6px; }
.group-head { display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-primary); background:var(--bg-alt); border-radius:6px; cursor:pointer; }
.group-count { margin-left:auto; font-size:11px; color:var(--text-tertiary); font-weight:600; }
.perm-row { display:flex; align-items:center; gap:8px; padding:6px 8px 6px 20px; border-radius:6px; font-size:12px; cursor:pointer; }
.perm-row:hover { background:var(--card-bg-hover); }
/* Vista bajo una sección apagada: se ve atenuada, pero se puede marcar (enciende solo ese camino) */
.perm-row.disabled { opacity:.55; }
.perm-groups input[type=checkbox], .check-all input { accent-color: var(--accent); width:15px; height:15px; }

.admin-actions { display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap; }
.admin-actions.end { justify-content:flex-end; }

/* Botones: mismo sistema que .action-btn del dashboard (EquiposDashboard) */
.action-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:7px 13px; border:1px solid transparent; border-radius:var(--radius-md); background:var(--accent-light); color:var(--accent); font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; transition:all var(--transition-fast); white-space:nowrap; }
.action-btn:hover:not(:disabled) { background:rgba(59,130,246,.2); }
.action-btn:active:not(:disabled) { transform:scale(.97); }
.action-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.action-btn:disabled { opacity:.5; cursor:not-allowed; }
.action-btn svg { flex-shrink:0; }
.action-btn.primary { background:var(--accent); color:#fff; }
.action-btn.primary:hover:not(:disabled) { background:var(--accent-hover); }
.action-btn.clear { background:transparent; color:var(--text-secondary); border-color:var(--card-border); }
.action-btn.clear:hover:not(:disabled) { background:var(--bg-alt); color:var(--text-primary); border-color:var(--card-border-hover); }
.action-btn.danger { background:var(--danger-light); color:var(--danger); }
.action-btn.danger:hover:not(:disabled) { background:rgba(239,68,68,.2); }
.action-btn.success { background:var(--success-light); color:var(--success); }
.action-btn.success:hover:not(:disabled) { background:rgba(16,185,129,.2); }

.account-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px; max-width:900px; }
.account-grid .admin-card { display:flex; flex-direction:column; gap:10px; }
.account-grid h3 { margin-bottom:2px; }
.card-highlight { border-color:var(--warning); box-shadow:0 0 0 3px var(--warning-light); }
.alert-banner { margin-bottom:16px; padding:12px 14px; border-radius:var(--radius-md); background:var(--warning-light); border:1px solid var(--warning); color:var(--text-primary); font-size:13px; }
.account-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:10px 0 14px; margin-bottom:14px; border-bottom:1px solid var(--card-border); }
.inline-field { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--text-secondary); margin-right:4px; }
.text-input.compact { width:auto; padding:6px 8px; font-size:12px; }
.text-input.mono { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing:.02em; }
.role-pill.pill-pending { background:var(--warning-light); color:var(--warning); }
.saved-msg { color:var(--success); font-size:12px; font-weight:600; }
.dirty-msg { color:var(--text-secondary); font-size:12px; }
.error-msg { color:var(--danger); font-size:12px; font-weight:600; margin:0; }

.modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:100; padding:16px; }
.modal { background:linear-gradient(var(--card-bg), var(--card-bg)), var(--bg); border:1px solid var(--card-border); border-radius:12px; padding:20px; width:100%; max-width:440px; display:flex; flex-direction:column; gap:12px; box-shadow:0 20px 40px rgba(0,0,0,.2); }
.modal h3 { font-size:15px; margin:0 0 4px; }
.field { display:flex; flex-direction:column; gap:6px; font-size:12px; font-weight:600; color:var(--text-secondary); }
.pw-row { display:flex; gap:6px; }
.pw-rules { list-style:none; padding:0; margin:2px 0 0; display:grid; grid-template-columns:1fr 1fr; gap:2px 10px; font-weight:500; font-size:11px; color:var(--text-tertiary); }
.pw-rules li.ok { color:var(--success); }
</style>
