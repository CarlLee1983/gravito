import { $ } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? 'Building @gravito/scaffold DTS...' : 'Building @gravito/scaffold...')

const format = isDtsOnly ? 'esm' : 'esm,cjs'
const dtsFlags = isDtsOnly ? '--dts --dts-only' : '--dts'

await $`bunx tsup src/index.ts --format ${format} ${dtsFlags} --clean`

console.log('✅ Build complete!')
