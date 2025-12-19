import { build } from 'bun'

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['gravito-core'],
})

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'cjs',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['gravito-core'],
})

console.log('📝 Generating type declarations...')
const tsc = Bun.spawn(['bunx', 'tsc', '--emitDeclarationOnly'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(1)
}

console.log('✅ Build completed')
