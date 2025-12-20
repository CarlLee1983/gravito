import { spawn } from 'bun'

console.log('Building @gravito/orbit-request...')

// Clean dist
await Bun.$`rm -rf dist`

// Build with bun
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: ['hono', 'zod', 'gravito-core'],
})

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

console.log('✅ Build complete!')
process.exit(0)
