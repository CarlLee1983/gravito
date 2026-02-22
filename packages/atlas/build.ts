const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/atlas DTS...' : 'Building @gravito/atlas...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const format = isDtsOnly ? 'esm' : 'esm,cjs'
const args = ['bunx', 'tsup', 'src/index.ts', '--format', format]

if (isDtsOnly) {
  args.push('--dts', '--dts-only')
}

args.push('--external', 'pg,mysql2,better-sqlite3,mongodb,ioredis', '--outDir', 'dist')

try {
  await Bun.$`${args}`
} catch (_error) {
  console.error('❌ tsup build failed')
  process.exit(1)
}

console.log('✅ Build complete!')
process.exit(0)
