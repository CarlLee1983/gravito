const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/resilience DTS...' : 'Building @gravito/resilience...')

// Clean dist
await Bun.$`rm -rf dist`

// Build resilience entry point
const format = isDtsOnly ? 'esm' : 'esm,cjs'
const args = ['bunx', 'tsup', 'src/index.ts', '--format', format]

if (isDtsOnly) {
  args.push('--dts', '--dts-only')
} else {
  args.push('--dts')
}

args.push(
  '--shims',
  '--external',
  '@gravito/core',
  '--external',
  '@opentelemetry/api',
  '--external',
  'bun:test',
  '--outDir',
  'dist'
)

try {
  await Bun.$`${args}`
  console.log('✅ Build complete!')
  process.exit(0)
} catch (_error) {
  console.error('❌ tsup build failed')
  process.exit(1)
}
