import { execSync } from 'node:child_process'

console.log('🚀 Building @gravito/astral...')

try {
  execSync('bunx tsup src/index.ts --format esm,cjs --dts', { stdio: 'inherit' })
  console.log('✅ Astral build successful')
} catch (error) {
  console.error('❌ Astral build failed', error)
  process.exit(1)
}
