import { spawn } from 'bun'

console.log('Building gravito-core...')

// Clean dist
await Bun.$`rm -rf dist`

console.log('📦 Building ESM bundle...')
const esmResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
})

if (!esmResult.success) {
  console.error('❌ ESM build failed')
  process.exit(1)
}

console.log('📦 Building CJS bundle...')
const cjsResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].cjs',
})

if (!cjsResult.success) {
  console.error('❌ CJS build failed')
  process.exit(1)
}

console.log('📝 Generating type declarations...')
const tsc = spawn(
  ['bunx', 'tsc', '-p', 'tsconfig.build.json', '--emitDeclarationOnly', '--skipLibCheck'],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const code = await tsc.exited
if (code !== 0) {
  console.warn('⚠️  Type generation had warnings, but continuing...')
}

console.log('✅ Build complete!')
process.exit(0)
