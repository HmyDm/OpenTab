import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'
import Inspector from 'unplugin-vue-dev-locator/vite'


export default defineConfig({
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-vue-next')) {
              return 'lucide-icons';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [
    vue(),
    crx({ manifest }),
    Inspector(),
  ],
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5174,
      protocol: 'ws',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ 定义 @ = src
    },
  },
})
