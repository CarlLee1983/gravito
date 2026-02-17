console.log('Building @gravito/stasis...')

// Clean dist
await Bun.$`rm -rf dist`

try {
  // Build with tsup, generate dts
  console.log('Building bundles with type declarations...')
  await Bun.$`npx tsup src/index.ts --format esm,cjs --dts --external @gravito/core,@gravito/photon --outDir dist --target esnext`

  console.log('✅ Build complete!')
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
