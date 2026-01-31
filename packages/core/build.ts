import { spawn } from 'bun'

console.log('Building @gravito/core...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const tsup = spawn(
  [
    'npx',
    'tsup',
    'src/index.ts',
    'src/compat.ts',
    '--format',
    'esm,cjs',
    '--dts',
    '--shims',
    '--external',
    '@gravito/photon', // Photon is a peer dependency
    '--external',
    'bun:test', // Bun test module
    '--external',
    'bun:sqlite', // Bun sqlite module (runtime-only)
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

console.log('Building @gravito/core/engine...')

// Build Standalone Engine
const tsupEngine = spawn(
  [
    'npx',
    'tsup',
    'src/engine/index.ts',
    '--format',
    'esm,cjs',
    '--dts',
    '--shims',
    '--external',
    '@gravito/photon',
    '--external',
    'bun:test',
    '--outDir',
    'dist/engine',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const tsupEngineCode = await tsupEngine.exited
if (tsupEngineCode !== 0) {
  console.error('❌ tsup engine build failed')
  process.exit(1)
}

console.log('✅ Build complete!')
process.exit(0)
