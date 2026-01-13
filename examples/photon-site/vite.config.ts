import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/client/app.tsx'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Add origin for proper asset loading when accessed from Photon server
    origin: 'http://localhost:5173',
  },
})
