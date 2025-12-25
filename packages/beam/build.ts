import { build } from 'bun'

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

console.log('📝 Generating type declarations...')
const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(1)
}

console.log('✅ Build completed')
