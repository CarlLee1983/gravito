import { $ } from 'bun'

console.log('🧹 Cleaning dist directory...')
await $`rm -rf dist`

console.log('📦 Building ESM bundle...')
await Bun.build({
  entrypoints: ['./src/index.ts', './src/vue.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
  external: [
    'gravito-core',
    'hono',
    'react',
    'react-dom',
    'react/jsx-dev-runtime',
    'react/jsx-runtime',
    'vue',
  ],
})

console.log('📦 Building CJS bundle...')
await Bun.build({
  entrypoints: ['./src/index.ts', './src/vue.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].cjs',
  external: [
    'gravito-core',
    'hono',
    'react',
    'react-dom',
    'react/jsx-dev-runtime',
    'react/jsx-runtime',
    'vue',
  ],
})

console.log('📝 Generating type declarations...')
await $`bunx tsc --emitDeclarationOnly`

console.log('✅ Build completed successfully!')
