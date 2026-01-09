import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/bun.ts', 'src/index.node.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['@gravito/core', 'bun:sqlite', 'bun'],
  target: 'node18',
})
