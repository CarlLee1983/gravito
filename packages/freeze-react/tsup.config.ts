import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Disabled to avoid memory exhaustion
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node18',
  external: ['react', '@inertiajs/react', '@gravito/freeze'],
})
