<template>
  <div class="page-layout">
    <header class="page-header">
      <h2 class="page-title">Concretos</h2>
    </header>

    <nav class="tab-bar">
      <button v-for="t in tabs" :key="t.id" class="tab-btn" :class="{ active: activeTab === t.id }" @click="navigateTo(t.id)">{{ t.label }}</button>
    </nav>

    <!-- Tab: Producción -->
    <ProduccionView v-if="activeTab === 'produccion'" />

    <!-- Tab: Mantenimiento -->
    <EquiposDashboard v-if="activeTab === 'mantenimiento'" planta="concretos" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProduccionView from './ProduccionView.vue'
import EquiposDashboard from '../EquiposDashboard.vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'produccion', label: 'Producción' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
]

const activeTab = computed(() => {
  if (route.path.includes('/mantenimiento')) return 'mantenimiento'
  return 'produccion'
})

function navigateTo(tab: string) {
  if (tab === 'produccion') router.push('/concretos')
  else router.push(`/concretos/${tab}`)
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 0;
}
.page-title { margin: 0; }

.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--card-border);
  margin-bottom: 24px;
  overflow-x: auto;
  background: rgba(255,255,255,0.06);
  border-radius: var(--radius-md);
  padding: 2px;
}
.tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
.tab-btn.active { color: var(--accent); background: rgba(255,255,255,0.1); font-weight: 600; }
</style>
