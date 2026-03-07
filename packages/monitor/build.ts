import { spawn } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log('Building @gravito/monitor...')

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
    ...(isDtsOnly ? ['--dts', '--dts-only'] : []),
    '--tsconfig',
    'tsconfig.build.json',
    '--external',
    '@gravito/core',
    '--external',
    '@gravito/photon',
    '--external',
    '@opentelemetry/api',
    '--external',
    '@opentelemetry/sdk-node',
    '--external',
    '@opentelemetry/exporter-trace-otlp-http',
    '--external',
    '@opentelemetry/resources',
    '--external',
    '@opentelemetry/semantic-conventions',
    '--outDir',
    'dist',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const code = await tsup.exited
if (code !== 0) {
  console.error('❌ tsup build failed')
  process.exit(1)
}

console.log('✅ Build complete!')
process.exit(0)
