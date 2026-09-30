import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { apiServer } from './server/vite-plugin-api'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [vue(), apiServer(), visualizer({ filename: 'stats.html', open: false })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // ECharts (y vue-echarts) y jspdf/html2canvas no se agrupan a mano: así solo se descargan
          // cuando se abre una vista con gráficas o se genera un PDF, no en el login.
          if (id.includes('node_modules/vue-echarts')) return undefined
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/@vue')) {
            return 'vendor-vue'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})
