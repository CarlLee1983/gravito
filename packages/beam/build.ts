import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

console.log('🔨 Building @gravito/beam in parallel...')

// Build JS/TS and type declarations in parallel
async function buildInParallel() {
  const tasks: Promise<number>[] = []

  // Task 1: JS/TS build
  if (!isDtsOnly) {
    const buildPromise = (async () => {
      try {
        await build({
          entrypoints: ['src/index.ts'],
          outdir: 'dist',
          format: 'esm',
          target: 'bun',
          splitting: false,
          minify: false,
          sourcemap: 'external',
          external: ['@gravito/photon'],
        })
        return 0
      } catch (error) {
        console.error('❌ JS/TS build failed:', error)
        return 1
      }
    })()
    tasks.push(buildPromise)
  }

  // Task 2: Type declarations
  console.log('📝 Generating type declarations...')
  const tscPromise = (async () => {
    const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json'], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    })
    const exitCode = await tsc.exited
    return exitCode
  })()
  tasks.push(tscPromise)

  // Wait for all tasks
  const results = await Promise.all(tasks)

  // Check for failures
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
}

// Execute parallel build
await buildInParallel()

console.log('✅ Build completed')
