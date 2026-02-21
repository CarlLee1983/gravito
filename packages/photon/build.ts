import { rm } from 'node:fs/promises'
import { build } from 'bun'

// Clean dist
await rm('dist', { recursive: true, force: true })

// Build JS/TS
await build({
  entrypoints: [
    'src/index.ts',
    'src/client.ts',
    'src/logger.ts',
    'src/bun.ts',
    'src/jwt.ts',
    'src/http-exception.ts',
    'src/openapi.ts',
    'src/middleware/circuit-breaker.ts',
    'src/middleware/otel.ts',
    'src/middleware/sse.ts',
    'src/middleware/websocket.ts',
    'src/middleware/streaming.ts',
    'src/adapter/cloudflare.ts',
    'src/adapter/vercel.ts',
    'src/adapter/deno.ts',
    'src/router/reg-exp-router.ts',
    'src/router/trie-router.ts',
  ],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  // Disabled: Small package (~120 LOC) doesn't benefit from code splitting
  splitting: false,
  // Enable minification in production builds
  minify: process.env.NODE_ENV === 'production',
  sourcemap: 'external',
})

console.log('📝 Generating type declarations...')
const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json'], {
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: import.meta.dirname,
})

const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(1)
}

console.log('✅ Photon build completed')
