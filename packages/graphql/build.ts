import { build } from 'tsup'

await build({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['@gravito/core', 'graphql', 'graphql-yoga'],
})
