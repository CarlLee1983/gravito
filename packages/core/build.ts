import { execSync } from 'child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT --dts to avoid memory issues
  execSync(
    'npx tsup src/index.ts src/compat.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --external bun:sqlite --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  console.log('Building @gravito/core/engine...')

  // Build engine bundles
  execSync(
    'npx tsup src/engine/index.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --outDir dist/engine --target esnext',
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
