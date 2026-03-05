import { $ } from 'bun'
import { existsSync } from 'fs'
import { cp, mkdir } from 'fs/promises'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/plasma DTS...' : 'Building @gravito/plasma...')

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await $`rm -rf dist`
}

try {
  if (!isDtsOnly) {
    console.log('Building ESM/CJS...')
    // Use tsup for proper ESM/CJS build (handles Bun builtins correctly)
    await $`bunx tsup src/index.ts --format esm,cjs --outDir dist --external @gravito/core,@gravito/photon,ioredis,bun`
  }

  if (isDtsOnly) {
    console.log('Generating Types...')
    await $`bunx tsc --emitDeclarationOnly --declaration --outDir dist`

    // Fix incorrect directory structure from tsconfig
    // TypeScript outputs to dist/plasma/src/... but we need dist/...
    if (existsSync('dist/plasma')) {
      await mkdir('dist', { recursive: true })
      await cp('dist/plasma/src', 'dist', { recursive: true })
      await $`rm -rf dist/plasma dist/core`
    }
  }

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
