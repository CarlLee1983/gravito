import { resolve } from 'node:path'
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
      // Root and general routes
      '/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass(req) {
          // 1. Don't proxy Vite internal requests
          if (req.url?.startsWith('/@') || req.url?.includes('node_modules')) {
            return req.url
          }
          // 2. Don't proxy static assets or source files that Vite should handle
          // Simplified regex to match extension followed by optional query string
          const assetRegex = /\.(png|jpg|jpeg|gif|svg|ico|webp|js|css|json|txt|tsx|ts|jsx)(\?.*)?$/
          if (req.url?.match(assetRegex) || req.url?.includes('/.well-known/')) {
            return req.url
          }
        },
      },
    },
  },
})
