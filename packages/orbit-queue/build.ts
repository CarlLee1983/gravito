import { build } from 'bun'

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['gravito-core'],
})

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'cjs',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['gravito-core'],
})

console.log('✅ Build completed')
