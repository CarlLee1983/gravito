import { build } from 'bun'

await build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['typescript'],
})

console.log('📝 Generating type declarations...')
const tsc = Bun.spawn(['bunx', 'tsc', '--emitDeclarationOnly', '--skipLibCheck'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  console.warn('⚠️ Warning: Type generation issues')
}

console.log('✅ Build completed')
process.exit(0)
