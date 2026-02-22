import { $ } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/plasma DTS...' : 'Building @gravito/plasma...')

// Clean dist
await $`rm -rf dist`

try {
  if (!isDtsOnly) {
    console.log('Building ESM/CJS...')
    // Using Bun to build for Node/Bun
    await Bun.build({
      entrypoints: ['./src/index.ts'],
      outdir: './dist',
      target: 'node', // Plasma is mostly for backend (redis)
      format: 'esm',
      external: ['@gravito/core', '@gravito/photon', 'ioredis'],
      naming: '[dir]/[name].mjs',
    })
  }

  console.log('Generating Types...')
  await $`npx tsc --emitDeclarationOnly --declaration --outDir dist`

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
