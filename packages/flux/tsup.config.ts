import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/bun.ts', 'src/index.node.ts', 'src/cli/flux-visualize.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Disabled to avoid memory exhaustion
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['@gravito/core', 'bun:sqlite', 'bun'],
  target: 'node18',
})
