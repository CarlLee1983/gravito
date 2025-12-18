import { $ } from 'bun'

console.log('🧹 Cleaning dist directory...')
await $`rm -rf dist`

console.log('📦 Building ESM bundle...')
const esmResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].mjs',
})

if (!esmResult.success) {
  console.error('❌ ESM build failed:')
  for (const log of esmResult.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('📦 Building CJS bundle...')
const cjsResult = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'cjs',
  target: 'node',
  sourcemap: 'external',
  minify: false,
  naming: '[dir]/[name].cjs',
})

if (!cjsResult.success) {
  console.error('❌ CJS build failed:')
  for (const log of cjsResult.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('📝 Generating type declarations...')
const tscResult = await $`bunx tsc -p tsconfig.build.json --emitDeclarationOnly`.quiet()

if (tscResult.exitCode !== 0) {
  console.error('❌ Type declaration generation failed:')
  console.error(tscResult.stderr.toString())
  process.exit(1)
}

console.log('✅ Build completed successfully!')
console.log('   - dist/index.mjs (ESM)')
console.log('   - dist/index.cjs (CJS)')
console.log('   - dist/index.d.ts (Types)')
