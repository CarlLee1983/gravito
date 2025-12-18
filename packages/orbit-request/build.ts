import { $ } from 'bun'

console.log('Building @gravito/orbit-request...')

// Clean dist
await $`rm -rf dist`

// Build with bun
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: ['hono', 'zod'],
})

// Generate types with tsc
await $`bunx tsc -p tsconfig.build.json --emitDeclarationOnly`

console.log('Build complete!')
