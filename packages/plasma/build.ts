import { $ } from 'bun'

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
    await $`bunx tsc -p tsconfig.build.json --emitDeclarationOnly --declaration --outDir dist`
  }

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
