import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import { spawn } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/mass DTS...' : 'Building @gravito/mass...')

// Clean dist
await Bun.$`rm -rf dist`

// Build with bun (skip if dts-only)
if (!isDtsOnly) {
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    external: ['@gravito/photon', '@sinclair/typebox'],
  })
}

console.log('📝 Generating type declarations...')
const tsc = spawn(
  ['bunx', 'tsc', '-p', 'tsconfig.build.json', '--emitDeclarationOnly', '--skipLibCheck'],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const code = await tsc.exited
if (code !== 0) {
  console.warn('⚠️  Type generation had warnings, but continuing...')
}

// Fix incorrect directory structure from tsconfig
// TypeScript outputs to dist/mass/src/... but we need dist/...
if (existsSync('dist/mass')) {
  await mkdir('dist', { recursive: true })
  await cp('dist/mass/src', 'dist', { recursive: true })
  await Bun.$`rm -rf dist/mass dist/photon`
}

console.log('✅ Build complete!')
process.exit(0)
