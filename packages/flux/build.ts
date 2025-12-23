import { build } from 'bun'
import { existsSync, rmSync } from 'fs'

// Clean dist
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true })
}

// ─────────────────────────────────────────────────────────────
// Build ESM for Bun (full features including BunSQLiteStorage)
// ─────────────────────────────────────────────────────────────
await build({
  entrypoints: ['./src/index.ts', './src/bun.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: ['gravito-core'],
  splitting: true,
  naming: '[dir]/[name].js',
})

// ─────────────────────────────────────────────────────────────
// Build ESM for Node (without Bun-specific imports)
// ─────────────────────────────────────────────────────────────
await build({
  entrypoints: ['./src/index.node.ts'],
  outdir: './dist/node',
  target: 'node',
  format: 'esm',
  external: ['gravito-core'],
  splitting: false,
  naming: 'index.mjs',
})

// ─────────────────────────────────────────────────────────────
// Build CJS for Node (legacy CommonJS support)
// ─────────────────────────────────────────────────────────────
await build({
  entrypoints: ['./src/index.node.ts'],
  outdir: './dist/node',
  target: 'node',
  format: 'cjs',
  external: ['gravito-core'],
  splitting: false,
  naming: 'index.cjs',
})

// ─────────────────────────────────────────────────────────────
// Generate type declarations
// ─────────────────────────────────────────────────────────────
const tsc = Bun.spawn(
  [
    'bunx',
    'tsc',
    '--emitDeclarationOnly',
    '--declaration',
    '--declarationMap',
    '--declarationDir',
    './dist',
  ],
  {
    cwd: import.meta.dir,
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

await tsc.exited

console.log('✅ @gravito/flux built successfully')
console.log('   📦 dist/index.js       (Bun ESM - full features)')
console.log('   📦 dist/bun.js         (Bun-specific exports)')
console.log('   📦 dist/node/index.mjs (Node ESM)')
console.log('   📦 dist/node/index.cjs (Node CJS)')
console.log('   📦 dist/*.d.ts         (Type declarations)')
