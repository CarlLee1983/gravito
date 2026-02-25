import { spawn } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/radiance DTS...' : 'Building @gravito/radiance...')

// Clean dist
await Bun.$`rm -rf dist`

if (!isDtsOnly) {
  // Build JS with Bun.build (native, fast)
  const buildResult = await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    target: 'node',
    splitting: false,
    sourcemap: 'external',
    minify: false,
    external: ['@gravito/core'],
  })

  if (!buildResult.success) {
    console.error('\u274c JS build failed:', buildResult.logs)
    process.exit(1)
  }
}

// Generate type declarations using tsc
const tsc = spawn(
  [
    'bunx',
    'tsc',
    '-p',
    'tsconfig.json',
    '--emitDeclarationOnly',
    '--skipLibCheck',
    '--outDir',
    'dist',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
    cwd: import.meta.dirname,
  }
)
const tscCode = await tsc.exited
if (tscCode !== 0) {
  console.error('\u274c Type declaration generation failed')
  process.exit(1)
}

console.log('\u2705 Build complete!')
