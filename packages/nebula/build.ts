import { spawn } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log('Building @gravito/nebula...')

// Clean dist
await Bun.$`rm -rf dist`

// Use tsup for multi-format build
const tsup = spawn(
  [
    'bunx',
    'tsup',
    'src/index.ts',
    '--format',
    isDtsOnly ? 'esm' : 'esm,cjs',
    ...(isDtsOnly ? ['--dts', '--dts-only'] : ['--dts']),
    '--tsconfig',
    'tsconfig.build.json',
    '--external',
    '@gravito/core,@gravito/photon',
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
