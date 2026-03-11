import { cp, type Dirent, mkdir, readdir, rm } from 'node:fs/promises'
import { basename } from 'node:path'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')
const _pkgName = basename(import.meta.dirname) // "core"

console.log(isDtsOnly ? 'Building @gravito/core DTS...' : 'Building @gravito/core in parallel...')

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
}

// External dependencies（workspace deps + bun built-ins）
// Note: @gravito/photon removed in Phase 2.1 - core no longer depends on photon
const externalDeps = ['bun:test', 'bun:sqlite', 'bun:ffi', 'zod']

async function buildInParallel() {
  const tasks: Promise<number>[] = []
  const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'

  if (!isDtsOnly) {
    await rm(tempDir, { recursive: true, force: true })

    // Task 1: bun build ESM
    const esmPromise = (async () => {
      const buildResult = await build({
        entrypoints: ['src/index.ts', 'src/compat.ts', 'src/engine/index.ts', 'src/ffi/index.ts'],
        outdir: 'dist',
        format: 'esm',
        target: 'bun',
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

    // Task 2: Skip CJS build for now (Bun-only project)
    // CJS module wrapping in Bun is causing issues with dynamic require()
    // Since gravito-ddd is Bun-only, ESM is sufficient
  }

  // Task 3: tsc 生成型別宣告
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

// 遞迴複製 .d.ts 檔案
async function copyDtsFiles(src: string, dest: string) {
  let entries: Dirent[]
  try {
    entries = await readdir(src, { withFileTypes: true })
  } catch (_e) {
    return
  }

  for (const entry of entries) {
    const srcPath = `${src}/${entry.name}`
    const destPath = `${dest}/${entry.name}`

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true }).catch(() => {})
      await copyDtsFiles(srcPath, destPath)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      await cp(srcPath, destPath)
    }
  }
}

await buildInParallel()

// 後處理
const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'
if (!isDtsOnly) {
  try {
    const dtsSourceDir = tempDir
    await copyDtsFiles(dtsSourceDir, 'dist')
    await rm(tempDir, { recursive: true, force: true })
  } catch (e) {
    console.warn('⚠️  Warning: Failed to copy type declarations:', e)
  }
}

console.log('✅ @gravito/core build completed')
