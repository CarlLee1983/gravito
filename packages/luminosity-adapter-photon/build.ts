import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import { $, build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log('🔨 Building @gravito/luminosity-adapter-photon in parallel...')

if (!isDtsOnly) {
  await $`rm -rf dist`
}

// Build JS/TS and type declarations in parallel (independent tasks)
async function buildInParallel() {
  const tasks: Promise<number>[] = []

  // Task 1: bun build (JS/TS)
  if (!isDtsOnly) {
    const buildPromise = (async () => {
      try {
        const result = await build({
          entrypoints: ['src/index.ts'],
          outdir: 'dist',
          format: 'esm',
          target: 'bun',
          splitting: false,
          minify: false,
          sourcemap: 'external',
          external: ['@gravito/photon', '@gravito/luminosity'],
        })
        return result ? 0 : 1
      } catch (error) {
        console.error('❌ bun build failed:', error)
        return 1
      }
    })()
    tasks.push(buildPromise)
  }

  // Task 2: tsc (type declarations)
  const tscPromise = (async () => {
    const tsc = Bun.spawn(
      ['bunx', 'tsc', '-p', 'tsconfig.build.json', '--emitDeclarationOnly', '--skipLibCheck'],
      {
        stdout: 'inherit',
        stderr: 'inherit',
      }
    )
    const exitCode = await tsc.exited
    if (exitCode !== 0) {
      console.warn('⚠️ Warning: Type generation issues')
    }
    return exitCode
  })()
  tasks.push(tscPromise)

  // Wait for all tasks
  const results = await Promise.all(tasks)

  // Check if any failed
  for (const result of results) {
    if (result !== 0) {
      console.error('❌ Build failed')
      process.exit(1)
    }
  }
}

// Execute parallel build
await buildInParallel()

// Fix incorrect directory structure from tsconfig
// TypeScript may output to dist/core/src/... but we need dist/...
// Only move luminosity-adapter-photon files, keep other dependencies
if (existsSync('dist/luminosity-adapter-photon/src')) {
  await mkdir('dist', { recursive: true })
  await cp('dist/luminosity-adapter-photon/src', 'dist', { recursive: true })
  await Bun.$`rm -rf dist/luminosity-adapter-photon`
}

console.log('✅ Build completed')
process.exit(0)
