import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// JS/TS build (skip if dts-only)
if (!isDtsOnly) {
  await build({
    entrypoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    target: 'bun',
    splitting: false,
    minify: false,
    sourcemap: 'external',
    external: ['@gravito/photon'],
  })
}

if (isDtsOnly) {
  console.log('📝 Generating type declarations...')
} else {
  console.log('📝 Generating type declarations...')
}

const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json'], {
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: import.meta.dirname,
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(1)
}

console.log('✅ Build completed')
