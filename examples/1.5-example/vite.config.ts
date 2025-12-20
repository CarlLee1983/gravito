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
      input: './app.tsx',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    origin: 'http://localhost:5173', // For HMR usage later if we get advanced
  },
})
