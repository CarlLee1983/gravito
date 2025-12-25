import { $ } from 'bun'

console.log('Building @gravito/plasma...')

// Clean dist
await $`rm -rf dist`

try {
  console.log('Building ESM/CJS...')
  // Using Bun to build for Node/Bun
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'node', // Plasma is mostly for backend (redis)
    format: 'esm',
    external: ['gravito-core', '@gravito/photon', 'ioredis'],
    naming: '[dir]/[name].mjs',
  })

  // Determine if we need CJS. Typically yes for ecosystem compat.
  // Bun doesn't emit CJS easily.
  // If we can't use tsup, we might skip CJS for now if the repo is moving to ESM-only
  // OR we can try to use tsup via $`...` which might work better than spawn() for some reason?
  // Let's try to stick to ESM-only for now if possible, as it simplifies things.
  // But wait, older tools might need CJS.
  // Let's rely on Bun's ESM output. If CJS is critical, I'll revisit.

  console.log('Generating Types...')
  await $`npx tsc --emitDeclarationOnly --declaration --outDir dist`

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
