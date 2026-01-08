import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  root: './src/client',
  build: {
    outDir: '../../static/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(process.cwd(), 'src/client/app.ts'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
    proxy: {
      '/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass(req) {
          if (req.url?.startsWith('/@') || req.url?.includes('.')) {
            return req.url
          }
        },
      },
    },
  },
})
