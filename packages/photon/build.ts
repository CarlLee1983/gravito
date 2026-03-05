import { rm } from 'node:fs/promises'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
}

// Parallel build: JS/TS and type declarations can run simultaneously
// since they output to different directories
async function buildInParallel() {
  if (isDtsOnly) {
    console.log('📝 Generating type declarations only...')
  } else {
    console.log('🔨 Building JS and type declarations in parallel...')
  }

  const tempDir = 'dist'

  // Start both processes in parallel
  const tasks: Promise<number>[] = []

  // Task 1: bun build (JS/TS)
  if (!isDtsOnly) {
    const buildPromise = (async () => {
      const buildResult = await build({
        entrypoints: [
          'src/index.ts',
          'src/client.ts',
          'src/logger.ts',
          'src/bun.ts',
          'src/jwt.ts',
          'src/http-exception.ts',
          'src/openapi.ts',
          'src/middleware/binary.ts',
          'src/middleware/circuit-breaker.ts',
          'src/middleware/htmx.ts',
          'src/middleware/otel.ts',
          'src/middleware/ratelimit-redis.ts',
          'src/middleware/ratelimit.ts',
          'src/middleware/sse.ts',
          'src/middleware/streaming.ts',
          'src/middleware/websocket.ts',
          'src/adapter/cloudflare.ts',
          'src/adapter/deno.ts',
          'src/adapter/index.ts',
          'src/adapter/vercel.ts',
          'src/router/reg-exp-router.ts',
          'src/router/trie-router.ts',
        ],
        outdir: 'dist',
        format: 'esm',
        target: 'node',
        splitting: false,
        minify: process.env.NODE_ENV === 'production',
        sourcemap: 'external',
        external: ['@gravito/core', '@gravito/photon', 'hono', '@hono/zod-openapi', 'zod', 'cborg'],
      })

      if (!buildResult.success) {
        console.error('❌ JS/TS build failed:', buildResult.logs)
        return 1
      }
      return 0
    })()
    tasks.push(buildPromise)
  }

  // Task 2: tsc (type declarations)
  const tscPromise = (async () => {
    const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', tempDir], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    })
    return await tsc.exited
  })()
  tasks.push(tscPromise)

  // Wait for all tasks to complete
  const results = await Promise.all(tasks)

  // Check if any task failed
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
}

// Execute parallel build
await buildInParallel()

console.log('✅ Photon build completed')
