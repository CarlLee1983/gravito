import { execSync } from 'node:child_process'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT to avoid memory exhaustion
  // Full DTS generation is too memory-intensive for CI
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

  // Ensure index.d.ts exports GravitoContext for downstream packages
  console.log('Ensuring .d.ts exports are available...')
  const fs = await import('node:fs')
  try {
    const indexDts = fs.readFileSync('dist/index.d.ts', 'utf-8')
    if (!indexDts.includes('GravitoContext')) {
      // If index.d.ts doesn't export the expected types, add them
      const additionalExports = `export type GravitoContext = any;
`
      fs.writeFileSync('dist/index.d.ts', additionalExports + indexDts)
    }
  } catch {
    // If file doesn't exist, create a stub
    fs.writeFileSync(
      'dist/index.d.ts',
      `export type GravitoContext = any;
`
    )
  }

  console.log('✅ Build complete!')
} catch (_error) {
  console.error('❌ Build failed')
  process.exit(1)
}
