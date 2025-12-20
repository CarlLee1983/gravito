import { $ } from 'bun'

console.log('Building @gravito/orbit-database...')

// Clean dist
await $`rm -rf dist`

// Build with Bun
await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    format: 'esm',
    target: 'node',
    minify: false,
    splitting: true,
    external: ['pg', 'mysql2', 'better-sqlite3'],
})

// Generate types
await $`bunx tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist`

console.log('Build complete!')
