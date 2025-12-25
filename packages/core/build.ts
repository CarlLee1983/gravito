import { spawn } from 'bun'

console.log('Building gravito-core...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const tsup = spawn(
  [
    'npx',
    'tsup',
    'src/index.ts',
    '--format',
    'esm,cjs',
    '--dts',
    '--external',
    'hono', // Hono is a peer dependency
    '--external',
    'bun:test', // Bun test module
    '--outDir',
    'dist',
  ],

  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const tsupCode = await tsup.exited
if (tsupCode !== 0) {
  console.error('❌ tsup build failed')
  process.exit(1)
}

// Type declaration generation is now handled by tsup --dts

console.log('✅ Build complete!')
process.exit(0)
