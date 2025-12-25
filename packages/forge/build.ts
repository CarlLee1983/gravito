import { $ } from 'bun'

console.log('Building @gravito/forge...')

// Clean dist
await $`rm -rf dist`

try {
  console.log('Building Server Core (Bun Target)...')
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    external: ['gravito-core', 'hono', '@gravito/nebula', '@gravito/stream'],
    naming: '[dir]/[name].mjs', // Use .mjs for clear ESM distinction
  })

  console.log('Building React Components (Browser Target)...')
  await Bun.build({
    entrypoints: ['./src/components/index.tsx'],
    outdir: './dist/components', // separate output dir to avoid conflicts
    target: 'browser',
    format: 'esm',
    external: ['react', 'react-dom'],
    naming: '[dir]/[name].mjs',
  })

  console.log('Building Vue Components (Browser Target)...')
  await Bun.build({
    entrypoints: ['./src/vue/index.ts'],
    outdir: './dist/vue', // separate output dir
    target: 'browser',
    format: 'esm',
    external: ['vue'],
    naming: '[dir]/[name].mjs',
  })

  console.log('Generating Types...')
  // Use tsup for main and react entries. Vue entry skipped for now due to .vue resolution issues in tsup dts
  await $`npx tsup src/index.ts src/components/index.tsx --dts-only --format esm --outDir dist`

  // Create a simple d.ts for vue index to satisfy exports
  await $`mkdir -p dist/vue`
  await Bun.write(
    'dist/vue/index.d.ts',
    `
export declare const ProcessingImage: any;
export declare const ProcessingStatus: any;
export declare const ProcessingVideo: any;
`
  )

  console.log('✅ Build complete!')
} catch (err) {
  console.error('❌ Build failed', err)
  process.exit(1)
}
