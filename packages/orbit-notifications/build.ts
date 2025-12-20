import { spawn } from 'bun'

console.log('Building @gravito/orbit-notifications...')

// Clean dist
await Bun.$`rm -rf dist`

const external = [
  'gravito-core',
  '@gravito/orbit-queue',
  '@gravito/orbit-mail',
  '@gravito/orbit-broadcasting',
]

// Build ESM
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  minify: false,
  naming: '[dir]/[name].mjs',
  external,
})

// Build CJS
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'node',
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
