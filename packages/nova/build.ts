import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import { $ } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/nova DTS...' : 'Building @gravito/nova...')

// Clean dist
await $`rm -rf dist`

try {
  if (!isDtsOnly) {
    console.log('Building ESM/CJS...')
    // Use tsup for proper ESM/CJS build (handles Bun builtins correctly)
    await $`npx tsup src/index.ts --format esm,cjs --outDir dist --external @gravito/core,bun`
  }

  console.log('Generating Types...')
  await $`npx tsc --emitDeclarationOnly --declaration --outDir dist`

  // Fix incorrect directory structure from tsconfig
  // TypeScript outputs to dist/nova/src/... but we need dist/...
  if (existsSync('dist/nova')) {
    await mkdir('dist', { recursive: true })
    await cp('dist/nova/src', 'dist', { recursive: true })
    await $`rm -rf dist/nova`
  }

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
