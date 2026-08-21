<template>
  <div class="auth-root">
    <ParticlesBackground :dark="isDark" />

    <button class="theme-toggle" @click="toggleThemeLocal" type="button">
      <svg v-if="!isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </button>

    <div class="left-panel">
      <img :src="isDark ? logoWhite : logoBlue" alt="Gravicon" class="logo" />

      <div class="hero-section">
        <h2 :class="['hero-title', theme]">
          Plataforma integral<br />
          <span class="hero-accent">de gestión</span> para<br />
          Agregados y Concretos
        </h2>
        <p :class="['hero-desc', theme]">
          Optimiza operaciones, controla calidad y toma decisiones basadas en datos.
        </p>

        <div class="features-grid">
          <div v-for="(f, i) in features" :key="f.title" :class="['feature-card', theme]">
            <div class="feature-icon" v-html="featureIcons[i]"></div>
            <p :class="['feature-title', theme]">{{ f.title }}</p>
            <p :class="['feature-desc', theme]">{{ f.desc }}</p>
          </div>
        </div>
      </div>

      <p :class="['tagline', theme]">Gravas, Agregados y Concretos S.A. © 2026 &mdash; Frank Mina</p>
    </div>

    <div class="right-panel">
      <div class="right-inner">
        <div class="mobile-logo">
          <img :src="isDark ? logoWhite : logoBlue" alt="Gravicon" class="logo" />
        </div>

        <div :class="['form-card', theme]">
          <div class="form-header">
            <h1 :class="['form-title', theme]">{{ title }}</h1>
            <p v-if="subtitle" :class="['form-subtitle', theme]">{{ subtitle }}</p>
          </div>

          <slot />


        </div>

        <p v-if="footer" :class="['footer-text', theme]">{{ footer }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import ParticlesBackground from './ParticlesBackground.vue'

defineProps<{
  title: string
  subtitle?: string
  footer?: string
}>()

const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

function toggleThemeLocal() {
  toggleTheme()
}

const logoWhite = '/Logos/Logo_Gravicon_Blanco.png'
const logoBlue = '/Logos/Logo_Gravicon_Azul.png'

const features = [
  { title: 'Gestión de Proyectos', desc: 'Controla tus obras y proyectos en tiempo real' },
  { title: 'Logística y Despacho', desc: 'Seguimiento de entregas y flota de vehículos' },
  { title: 'Control de Calidad', desc: 'Estándares certificados en gravas y concretos' },
  { title: 'Reportes e Indicadores', desc: 'Métricas clave para la toma de decisiones' },
]

const featureIcons = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.65l-2.48-3.2A1 1 0 0 0 18.52 9H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15a10 10 0 0 1 20 0"/><path d="M2 15h20"/><path d="M6 15v-4a6 6 0 0 1 12 0v4"/><path d="M12 11v4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-3"/><path d="M12 16v-7"/><path d="M17 16V8"/></svg>',
]
</script>

<style scoped>
.auth-root {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  transition: background var(--transition-base);
  position: relative;
}

.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.theme-toggle:hover { transform: scale(1.1); border-color: var(--card-border-hover); }

.left-panel {
  display: none;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 64px;
  position: relative;
  z-index: 10;
}
@media (min-width: 1024px) { .left-panel { display: flex; } }

.logo { height: 64px; width: auto; object-fit: contain; align-self: flex-start; }

.hero-section { display: flex; flex-direction: column; gap: 16px; }
.hero-title { font-size: 36px; font-weight: 800; line-height: 1.15; margin: 0; }
.hero-title.dark { color: var(--text-primary); }
.hero-title.light { color: var(--text-primary); }
.hero-accent { color: var(--accent); }
.hero-desc { font-size: 16px; margin: 0 0 24px; }
.hero-desc.dark { color: var(--text-secondary); }
.hero-desc.light { color: var(--text-secondary); }

.features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.feature-card { border-radius: var(--radius-md); padding: 16px; }
.feature-card.dark { background: var(--card-bg); border: 1px solid var(--card-border); }
.feature-card.light { background: var(--card-bg); border: 1px solid var(--card-border); }
.feature-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 12px;
  background: var(--accent-light);
}
.feature-icon :deep(svg) { width: 16px; height: 16px; color: var(--accent); }
.feature-title { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
.feature-title.dark { color: var(--text-primary); }
.feature-title.light { color: var(--text-primary); }
.feature-desc { font-size: 12px; margin: 0; }
.feature-desc.dark { color: var(--text-secondary); }
.feature-desc.light { color: var(--text-secondary); }

.tagline { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
.tagline.dark { color: var(--text-tertiary); }
.tagline.light { color: var(--text-tertiary); }

.right-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 24px 16px;
  position: relative;
  z-index: 10;
}
@media (min-width: 1024px) {
  .right-panel { width: 480px; min-width: 480px; padding: 40px 24px; }
}

.right-inner { width: 100%; max-width: 420px; }

.mobile-logo { display: flex; justify-content: center; margin-bottom: 32px; }
@media (min-width: 1024px) { .mobile-logo { display: none; } }

.form-card { border-radius: var(--radius-lg); padding: 32px; }
.form-card.dark { background: var(--bg-elevated); border: 1px solid var(--card-border); box-shadow: var(--shadow-xl); }
.form-card.light { background: var(--bg-elevated); border: 1px solid var(--card-border); box-shadow: var(--shadow-xl); }

.form-header { text-align: center; margin-bottom: 28px; }
.form-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.form-title.dark { color: var(--text-primary); }
.form-title.light { color: var(--text-primary); }
.form-subtitle { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
.form-subtitle.dark { color: var(--text-secondary); }
.form-subtitle.light { color: var(--text-secondary); }

.footer-text { text-align: center; font-size: 13px; margin-top: 24px; }
.footer-text.dark { color: var(--text-tertiary); }
.footer-text.light { color: var(--text-tertiary); }

@media (max-width: 480px) {
  .form-card { padding: 24px 20px; }
}
</style>
