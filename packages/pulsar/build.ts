import { execSync } from 'child_process'

console.log('Building @gravito/pulsar...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external @gravito/core,@gravito/photon,@gravito/stasis,bun:sqlite --outDir dist',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
