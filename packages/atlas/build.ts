import { spawn } from 'bun'

console.log('Building @gravito/atlas...')

// Clean dist
await Bun.$`rm -rf dist`

// Build with Bun
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  minify: false,
  splitting: true,
  external: ['pg', 'mysql2', 'better-sqlite3', 'mongodb', 'ioredis'],
})

console.log('📝 Generating type declarations...')
const tsc = spawn(
  [
    'bunx',
    'tsc',
    '--emitDeclarationOnly',
    '--declaration',
    '--declarationMap',
    '--outDir',
    'dist',
    '--skipLibCheck',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const code = await tsc.exited
if (code !== 0) {
  console.warn('⚠️  Type generation had warnings/errors, but continuing...')
}

console.log('✅ Build complete!')
process.exit(0)
