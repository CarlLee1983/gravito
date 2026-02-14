import { execSync } from 'child_process'

console.log('Building @gravito/atlas...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external pg,mysql2,better-sqlite3,mongodb,ioredis --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  // Generate empty type declaration file
  // This allows TypeScript to resolve module during dependent builds
  // Full types are available directly from source files
  await Bun.$`echo "export {};" > dist/index.d.ts`

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
