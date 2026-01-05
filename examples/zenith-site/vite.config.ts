import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: './src/client', // Source of client code
  build: {
    outDir: '../../static/build', // Output to static/build
    emptyOutDir: true,
    manifest: true, // Generate manifest.json for backend mapping
    rollupOptions: {
      input: resolve(process.cwd(), 'src/client/app.tsx'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    // Proxy backend API requests
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy all page routes to backend
      '/zh-TW': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/en': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Root path
      '/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass(req) {
          // Don't proxy Vite's own requests
          if (req.url?.startsWith('/@') || req.url?.includes('.')) {
            return req.url
          }
        },
      },
    },
  },
})
