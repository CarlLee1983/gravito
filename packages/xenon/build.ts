import { build } from 'tsup'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/xenon DTS...' : 'Building @gravito/xenon...')

await build({
  entry: {
    index: 'src/index.ts',
  },
  format: isDtsOnly ? ['esm'] : ['esm', 'cjs'],
  dts: true,
  dtsOnly: isDtsOnly,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['bun'],
})

console.log('\u2705 Build complete!')
