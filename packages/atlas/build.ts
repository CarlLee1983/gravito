import { execSync } from 'child_process'

console.log('Building @gravito/atlas...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT --dts to avoid memory issues in CI
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external pg,mysql2,better-sqlite3,mongodb,ioredis --outDir dist --target esnext',
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
