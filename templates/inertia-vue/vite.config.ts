import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  root: './src/client',
  build: {
    outDir: '../../static/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: './src/client/app.ts',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    origin: 'http://localhost:5173',
  },
})
