import { cp, type Dirent, mkdir, readdir, rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')
const _pkgName = basename(import.meta.dirname) // "atlas"

console.log(isDtsOnly ? 'Building @gravito/atlas DTS...' : 'Building @gravito/atlas in parallel...')

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
}

// External dependencies（DB 驅動程式為 optional peer deps）
const externalDeps = [
  '@gravito/core',
  'bun',
  'pg',
  'mysql2',
  'better-sqlite3',
  'mongodb',
  'ioredis',
  'lru-cache',
  '@opentelemetry/api',
  '@opentelemetry/semantic-conventions',
]

async function buildInParallel() {
  const tasks: Promise<number>[] = []
  const tempDir = 'dist'

  if (!isDtsOnly) {
    // Task 1: bun build ESM（atlas 只有 ESM exports）
    const esmPromise = (async () => {
      const buildResult = await build({
        entrypoints: ['src/index.ts'],
        outdir: 'dist',
        format: 'esm',
        target: 'node',
        splitting: false,
        sourcemap: 'external',
        external: externalDeps,
      })

      if (!buildResult.success) {
        console.error('❌ ESM build failed:', buildResult.logs)
        return 1
      }
      return 0
    })()
    tasks.push(esmPromise)
  }

  // Task 2: tsc 生成型別宣告（使用 tsconfig.build.json + noCheck）
  const tscPromise = (async () => {
    const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', tempDir], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    })
    return await tsc.exited
  })()
  tasks.push(tscPromise)

  const results = await Promise.all(tasks)
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
}

await buildInParallel()

console.log('✅ @gravito/atlas build completed')
