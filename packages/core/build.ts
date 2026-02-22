const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/core DTS...' : 'Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const format = isDtsOnly ? 'esm' : 'esm,cjs'
const args = ['bunx', 'tsup', 'src/index.ts', 'src/compat.ts', '--format', format]

if (isDtsOnly) {
  args.push('--dts', '--dts-only')
}

args.push(
  '--shims',
  '--external',
  '@gravito/photon',
  '--external',
  'bun:test',
  '--external',
  'bun:sqlite',
  '--outDir',
  'dist'
)

try {
  await Bun.$`${args}`
} catch (_error) {
  console.error('❌ tsup build failed')
  process.exit(1)
}

console.log(isDtsOnly ? 'Building @gravito/core/engine DTS...' : 'Building @gravito/core/engine...')

// Build Standalone Engine
const engineFormat = isDtsOnly ? 'esm' : 'esm,cjs'
const engineArgs = ['bunx', 'tsup', 'src/engine/index.ts', '--format', engineFormat]

if (isDtsOnly) {
  engineArgs.push('--dts', '--dts-only')
}

engineArgs.push(
  '--shims',
  '--external',
  '@gravito/photon',
  '--external',
  'bun:test',
  '--outDir',
  'dist/engine'
)

try {
  await Bun.$`${engineArgs}`
} catch (_error) {
  console.error('❌ tsup engine build failed')
  process.exit(1)
}

console.log('✅ Build complete!')
process.exit(0)
