import { build } from 'tsup'

const isDtsOnly = process.argv.includes('--dts-only')

await build({
  entry: ['src/index.ts'],
  format: isDtsOnly ? ['esm'] : ['esm', 'cjs'],
  dts: true,
  dtsOnly: isDtsOnly,
  clean: true,
  external: ['@gravito/core', 'graphql', 'graphql-yoga'],
})

console.log('\u2705 Build complete!')
