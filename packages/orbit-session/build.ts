import { spawn } from 'bun'

console.log('Building @gravito/orbit-session...')

// Clean dist
await Bun.$`rm -rf dist`

// Build ESM
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
  external: ['gravito-core', 'hono', '@gravito/orbit-cache'],
})

// Build CJS
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].cjs',
  external: ['gravito-core', 'hono', '@gravito/orbit-cache'],
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
