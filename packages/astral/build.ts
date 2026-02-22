import { execSync } from 'node:child_process'

const isDtsOnly = process.argv.includes('--dts-only')

console.log(isDtsOnly ? '📝 Building @gravito/astral DTS...' : '🚀 Building @gravito/astral...')

try {
  const format = isDtsOnly ? 'esm' : 'esm,cjs'
  const dtsFlag = isDtsOnly ? '--dts --dts-only' : ''
  const cmd = `tsup src/index.ts --format ${format} ${dtsFlag}`.trim()
  execSync(cmd, { stdio: 'inherit' })
  console.log('✅ Astral build successful')
} catch (error) {
  console.error('❌ Astral build failed', error)
  process.exit(1)
}
