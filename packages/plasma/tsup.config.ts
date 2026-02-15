import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Disable to avoid memory exhaustion; generate manually in build.ts
  external: ['bun'],
  clean: true,
})
