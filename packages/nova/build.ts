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

  if (isDtsOnly) {
    console.log('Generating Types...')
    await $`npx tsc --emitDeclarationOnly --declaration --outDir dist`
  }

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
