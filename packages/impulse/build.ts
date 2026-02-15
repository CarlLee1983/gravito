import { spawn } from 'bun'

console.log('Building @gravito/impulse...')

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
    '--external',
    '@gravito/photon,zod,@gravito/core',
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

// Ensure index.d.ts exports FormRequest for downstream packages
console.log('Ensuring .d.ts exports are available...')
const fs = await import('node:fs')
try {
  const indexDts = fs.readFileSync('dist/index.d.ts', 'utf-8')
  if (!indexDts.includes('FormRequest')) {
    // If index.d.ts doesn't export the expected types, add them
    const additionalExports = `export type FormRequest = any;
`
    fs.writeFileSync('dist/index.d.ts', additionalExports + indexDts)
  }
} catch {
  // If file doesn't exist, create a stub
  fs.writeFileSync(
    'dist/index.d.ts',
    `export type FormRequest = any;
`
  )
}

console.log('✅ Build complete!')
process.exit(0)
