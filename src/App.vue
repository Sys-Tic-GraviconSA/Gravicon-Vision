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
        </nav>

        <!-- Sidebar Footer with Avatar and Theme / Logout controls -->
        <div class="sidebar-footer">
          <div class="user-info" v-if="!collapsed">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-details">
              <span class="user-name">{{ authStore.userEmail }}</span>
            </div>
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
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useTheme } from './composables/useTheme'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()

const collapsed = ref(false)

onMounted(() => {
  collapsed.value = window.innerWidth <= 768
})
const openMenus = reactive({ agr: true, concreto: true })

const userInitial = computed(() => authStore.userEmail.charAt(0).toUpperCase())

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
