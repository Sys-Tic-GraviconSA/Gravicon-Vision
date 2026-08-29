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
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-echarts')) {
            return 'vendor-vue'
          }
          if (id.includes('node_modules/echarts')) {
            return 'vendor-echarts'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas') || id.includes('node_modules/html2pdf')) {
            return 'vendor-pdf'
          }
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})
