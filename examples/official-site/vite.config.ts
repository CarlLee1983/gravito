import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: './src/client', // Source of client code
  resolve: {
    alias: {
      '@gravito/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@gravito/photon': path.resolve(__dirname, '../../packages/photon/src/index.ts'),
      '@gravito/ion': path.resolve(__dirname, '../../packages/ion/src/index.ts'),
      '@gravito/prism': path.resolve(__dirname, '../../packages/prism/src/index.ts'),
      '@gravito/freeze': path.resolve(__dirname, '../../packages/freeze/src/index.ts'),
      '@gravito/freeze-react': path.resolve(__dirname, '../../packages/freeze-react/src/index.ts'),
      '@gravito/stasis': path.resolve(__dirname, '../../packages/stasis/src/index.ts'),
      '@gravito/constellation': path.resolve(
        __dirname,
        '../../packages/constellation/src/index.ts'
      ),
    },
  },
  build: {
    outDir: '../../static/build', // Output to static/build
    emptyOutDir: true,
    manifest: true, // Generate manifest.json for backend mapping
    rollupOptions: {
      input: path.resolve(__dirname, 'src/client/app.tsx'),
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
    strictPort: true, // Ensure port consistency for proxy
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
