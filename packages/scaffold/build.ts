import { $ } from 'bun'

console.log('Building @gravito/scaffold...')

await $`bunx tsup src/index.ts --format esm,cjs --clean`

console.log('✅ Build complete!')
