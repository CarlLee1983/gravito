import { $ } from 'bun'

console.log('Building @gravito/orbit-mongo...')

await $`bunx tsc`

console.log('Build complete!')
