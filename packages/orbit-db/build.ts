import { spawn } from 'bun'

console.log('Building @gravito/orbit-db...')

// Clean dist
await Bun.$`rm -rf dist`

console.log('📦 Building ESM bundle...')
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'bun',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
  external: ['gravito-core', 'bun:sqlite'],
})

console.log('📦 Building CJS bundle...')
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'bun',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].cjs',
  external: ['gravito-core', 'bun:sqlite'],
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
