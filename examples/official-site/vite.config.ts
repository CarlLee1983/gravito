import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: './src/client', // Source of client code
  build: {
    outDir: '../../static/build', // Output to static/build
    emptyOutDir: true,
    manifest: true, // Generate manifest.json for backend mapping
    rollupOptions: {
      input: 'app.tsx',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
    // 代理後端 API 請求
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
