import { build } from 'bun'

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  external: ['@gravito/core'],
})
