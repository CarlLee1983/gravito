import { execSync } from 'child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build main index and compat without DTS to avoid memory issues
  console.log('Building bundles...')
  execSync(
    'npx tsup src/index.ts src/compat.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --external bun:sqlite --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate minimal type stubs
  console.log('Generating type stubs...')
  await Bun.$`echo "export * from './src/index';" > dist/index.d.ts`
  await Bun.$`echo "export * from './src/compat';" > dist/compat.d.ts`

  console.log('Building @gravito/core/engine...')

  // Build engine without DTS
  execSync(
    'npx tsup src/engine/index.ts --format esm,cjs --shims --external @gravito/photon --external bun:test --outDir dist/engine --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate engine type stub
  await Bun.$`echo "export * from '../src/engine/index';" > dist/engine/index.d.ts`

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
