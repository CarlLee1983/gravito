#!/usr/bin/env bun
import { execSync } from 'node:child_process'

console.log('Building @gravito/nebula...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build bundles WITHOUT full DTS to avoid memory exhaustion
  execSync(
    'npx tsup src/index.ts --format esm,cjs --external @gravito/core,@gravito/photon --outDir dist --target esnext',
    {
      stdio: 'inherit',
      env: process.env,
    }
  )

  console.log('✅ Build complete!')
} catch (error) {
  console.error('❌ Build failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}

process.exit(0)
