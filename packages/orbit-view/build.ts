import { spawn } from 'bun'

console.log('Building @gravito/orbit-view...')

// Clean dist
await Bun.$`rm -rf dist`

const external = [
  'gravito-core',
  'hono',
  'react',
  'react-dom',
  'react/jsx-dev-runtime',
  'react/jsx-runtime',
  'vue',
]

console.log('📦 Building ESM bundle...')
await Bun.build({
  entrypoints: ['./src/index.ts', './src/vue.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
  external,
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
  external,
})

console.log('📝 Generating type declarations...')
const tsc = spawn(['bunx', 'tsc', '--emitDeclarationOnly', '--skipLibCheck'], {
  stdout: 'inherit',
  stderr: 'inherit',
})

const code = await tsc.exited
if (code !== 0) {
  console.warn('⚠️  Type generation had warnings, but continuing...')
}

console.log('✅ Build complete!')
process.exit(0)
