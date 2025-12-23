import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  root: './src/client',
  build: {
    outDir: '../../static/build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/client/app.ts'),
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
    cors: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
    },
  },
})
