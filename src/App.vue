<template>
  <template v-if="route.path === '/login'">
    <router-view />
  </template>
  <template v-else>
    <div class="app-layout">
      <!-- Mobile Top Bar -->
      <header class="mobile-header">
        <button class="mobile-menu-btn" @click="collapsed = !collapsed" title="Menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span class="mobile-logo">GRAVICON</span>
        <div style="width: 36px;"></div>
      </header>

      <!-- Overlay for Mobile Sidebar -->
      <div v-if="!collapsed" class="sidebar-overlay" @click="collapsed = true"></div>

      <aside class="sidebar" :class="{ collapsed }">
        <div class="sidebar-header">
          <button class="collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? 'Expandir menú' : 'Colapsar menú'" :style="{ marginLeft: collapsed ? '0' : 'auto' }">
            <svg v-if="!collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <nav class="nav">
          <button class="nav-section" :class="{ active: openMenus.agr }" @click="toggle('agr')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="2,20 12,2 22,20"/><line x1="12" y1="2" x2="12" y2="20"/></svg>
            <span v-if="!collapsed">Agregados</span>
            <svg v-if="!collapsed" class="chevron" :class="{ open: openMenus.agr }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-if="!collapsed && openMenus.agr" class="nav-children">
            <router-link to="/cuncia" class="nav-child" active-class="active" @click="handleLinkClick">Cuncia</router-link>
            <router-link to="/acacias" class="nav-child" active-class="active" @click="handleLinkClick">Acacias</router-link>
          </div>

          <button class="nav-section" :class="{ active: openMenus.concreto }" @click="toggle('concreto')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span v-if="!collapsed">Concretos</span>
            <svg v-if="!collapsed" class="chevron" :class="{ open: openMenus.concreto }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-if="!collapsed && openMenus.concreto" class="nav-children">
            <router-link to="/concretos" class="nav-child" active-class="active" @click="handleLinkClick">General</router-link>
          </div>

          <router-link v-if="userRole==='admin'" to="/admin" class="nav-section" active-class="active" @click="handleLinkClick">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span v-if="!collapsed">Administración</span>
          </router-link>
        </nav>

        <!-- Sidebar Footer with Avatar and Theme / Logout controls -->
        <div class="sidebar-footer" style="position:relative">
          <div class="user-info" v-if="!collapsed" @click="toggleUserMenu" style="cursor:pointer">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-details">
              <span class="user-name">{{ authStore.userEmail }}</span>
              <span class="user-role" style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; display:block;">{{ userRole }}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:auto; opacity:.5; flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div v-if="collapsed" class="user-avatar" @click="toggleUserMenu" style="cursor:pointer; margin:0 auto;">{{ userInitial }}</div>
          <div v-if="showUserMenu" class="user-menu">
            <div class="user-menu-header">
              <strong style="font-size:12px; display:block; overflow:hidden; text-overflow:ellipsis;">{{ authStore.userEmail }}</strong>
              <span class="role-badge" :class="userRole==='admin'?'role-admin':''">{{ userRole }}</span>
            </div>
            <router-link to="/admin" class="user-menu-item" @click="closeUserMenu">⚙️ Configuración</router-link>
            <router-link to="/admin" class="user-menu-item" @click="closeUserMenu">🛡️ Panel Administrativo — {{ userRole }}</router-link>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" @click="handleLogout" style="width:100%; text-align:left; background:none; border:none;">Cerrar sesión</button>
          </div>
          <div class="footer-actions" :class="{ collapsed }">
            <button class="theme-btn" @click="toggleTheme" :title="theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'">
              <svg v-if="theme === 'light'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <button class="logout-btn" @click="handleLogout" title="Cerrar sesión">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main" :class="{ collapsed }">
        <router-view v-slot="{ Component }">
          <transition name="slide" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </main>
    </div>
  </template>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useTheme } from './composables/useTheme'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()

const collapsed = ref(false)

function handleDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.sidebar-footer')) closeUserMenu()
}
onMounted(() => {
  collapsed.value = window.innerWidth <= 768
  document.addEventListener('click', handleDocClick)
})
onUnmounted(() => document.removeEventListener('click', handleDocClick))
const openMenus = reactive({ agr: true, concreto: true })

const userInitial = computed(() => authStore.userEmail.charAt(0).toUpperCase())
const userRole = computed(() => (authStore.user as any)?.user_metadata?.role || (authStore.user as any)?.app_metadata?.role || 'usuario')
const showUserMenu = ref(false)
function toggleUserMenu() { showUserMenu.value = !showUserMenu.value }
function closeUserMenu() { showUserMenu.value = false }

function toggle(key: 'agr' | 'concreto') {
  openMenus[key] = !openMenus[key]
}

function handleLinkClick() {
  if (window.innerWidth <= 768) {
    collapsed.value = true
  }
}

async function handleLogout() {
  await authStore.signOut()
  router.replace('/login')
}
</script>

<style>
.app-layout { display: flex; min-height: 100vh; }

.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  overflow: hidden;
  transition: width var(--transition-slow), background-color var(--transition-base), border-color var(--transition-base);
  border-right: 1px solid var(--card-border);
}
.sidebar.collapsed { width: var(--sidebar-collapsed); }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--card-border);
  min-height: 64px;
  flex-shrink: 0;
}
.sidebar.collapsed .sidebar-header {
  padding: 16px 8px;
  justify-content: center;
}

.collapse-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.collapse-btn:hover {
  background: var(--card-bg-hover);
  color: var(--sidebar-text-hover);
  border-color: var(--card-border-hover);
}

.nav {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar.collapsed .nav {
  padding: 10px 6px;
  align-items: center;
}

.nav-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  color: var(--sidebar-text);
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 450;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  position: relative;
}
.sidebar.collapsed .nav-section {
  justify-content: center;
  padding: 8px;
  width: 40px;
  border-radius: 8px;
}
.nav-section:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-section.active { color: var(--sidebar-text-hover); background: var(--sidebar-active); }
.nav-section svg { flex-shrink: 0; opacity: .6; }
.nav-section:hover svg,
.nav-section.active svg { opacity: 1; }

.chevron { margin-left: auto; transition: transform var(--transition-base); opacity: .3; }
.chevron.open { transform: rotate(180deg); }

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 30px;
  margin-bottom: 6px;
}

.nav-child {
  display: block;
  padding: 6px 12px;
  color: var(--sidebar-text);
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 450;
  transition: all var(--transition-fast);
  position: relative;
}
.nav-child:hover { color: var(--sidebar-text-hover); background: var(--sidebar-hover); }
.nav-child.active { color: var(--sidebar-text-hover); background: var(--sidebar-active); }

.sidebar-footer {
  border-top: 1px solid var(--card-border);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  transition: all var(--transition-base);
}
.sidebar.collapsed .sidebar-footer {
  padding: 12px 8px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details { overflow: hidden; }

.user-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.user-menu {
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  margin-bottom: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 10;
}
.sidebar.collapsed .user-menu {
  left: 56px;
  bottom: 12px;
  right: auto;
  width: 220px;
}
.user-menu-header {
  padding: 8px 10px;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 4px;
}
.role-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--bg-alt);
  color: var(--text-secondary);
}
.role-badge.role-admin {
  background: #1e293b;
  color: #fff;
}
.user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background .15s;
}
.user-menu-item:hover {
  background: var(--card-bg-hover);
}
.user-menu-divider {
  height: 1px;
  background: var(--card-border);
  margin: 4px 0;
}

.footer-actions {
  display: flex;
  gap: 6px;
}
.footer-actions.collapsed {
  flex-direction: column;
  width: 100%;
  align-items: center;
}

.theme-btn,
.logout-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.theme-btn:hover {
  background: var(--card-bg-hover);
  color: var(--sidebar-text-hover);
  border-color: var(--card-border-hover);
}

.logout-btn:hover {
  color: var(--danger);
  border-color: var(--danger-light);
  background: var(--danger-light);
}

.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  min-height: 100vh;
  transition: margin-left var(--transition-slow), background-color var(--transition-base);
  position: relative;
}
.main.collapsed { margin-left: var(--sidebar-collapsed); }

.mobile-header {
  display: none;
}

@media (max-width: 768px) {
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    background: var(--sidebar-bg);
    border-bottom: 1px solid var(--card-border);
    padding: 0 16px;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 90;
    backdrop-filter: blur(8px);
  }
  
  .mobile-menu-btn {
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 6px;
    transition: background-color var(--transition-fast);
  }
  .mobile-menu-btn:hover {
    background: var(--sidebar-hover);
  }
  
  .mobile-logo {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: var(--accent);
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 190;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 200;
    width: var(--sidebar-width);
    transition: transform var(--transition-slow), background-color var(--transition-base);
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width);
    border-right: none;
  }
  
  .sidebar.collapsed .collapse-btn {
    display: none;
  }
  
  .main {
    margin-left: 0 !important;
    margin-top: 56px;
  }
  
  .main.collapsed {
    margin-left: 0 !important;
  }
}

@media print {
  .sidebar,
  .mobile-header,
  .sidebar-overlay,
  .collapse-btn,
  .almacen-view-toggle,
  .informe-control-bar,
  .informe-bar {
    display: none !important;
  }
  .main {
    margin-left: 0 !important;
    margin-top: 0 !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .app-layout {
    display: block !important;
  }
}
</style>
