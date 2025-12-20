import { $ } from 'bun'

console.log('Building @gravito/orbit-redis...')

await $`bunx tsc`

console.log('Build complete!')
