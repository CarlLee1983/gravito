import { existsSync, rmSync } from 'node:fs'
import { build, $ } from 'bun'

// Clean dist
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true })
}

console.log('Building @gravito/flux...')

try {
  // 1. Build ESM for Bun (full features)
  await build({
    entrypoints: ['./src/index.ts', './src/bun.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    external: ['gravito-core'],
    splitting: true,
    naming: '[dir]/[name].js',
  })

  // 2. Build ESM for Node
  await build({
    entrypoints: ['./src/index.node.ts'],
    outdir: './dist/node',
    target: 'node',
    format: 'esm',
    external: ['gravito-core'],
    splitting: false, // Node doesn't handle splitting as gracefully usually for libs unless configured well
    naming: 'index.mjs',
  })

  // 3. Types
  console.log('Generating Types...')
  await $`npx tsc --emitDeclarationOnly --declaration --declarationMap --declarationDir ./dist`

  console.log('✅ @gravito/flux built successfully')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
