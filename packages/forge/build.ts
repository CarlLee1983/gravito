import { build } from 'bun'

await build({
  entrypoints: [
    './src/index.ts',
    './src/components/index.tsx',
    './src/vue/index.ts',
  ],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  external: [
    'gravito-core',
    'hono',
    'react',
    'react-dom',
    'vue',
  ],
  splitting: false,
})

console.log('✅ Build complete!')
