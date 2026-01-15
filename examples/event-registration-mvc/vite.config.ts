import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/client'),
    },
  },
  build: {
    manifest: true,
    outDir: 'public/build',
    rollupOptions: {
      input: 'src/client/app.ts',
    },
  },
  server: {
    origin: 'http://localhost:5173',
  },
})
