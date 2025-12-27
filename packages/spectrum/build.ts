import { spawn } from 'bun'

console.log('Building @gravito/spectrum...')

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
    'gravito-core',
    '--external',
    '@gravito/atlas',
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
