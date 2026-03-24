import { cp, copyFile, type Dirent, mkdir, readdir, rm } from 'node:fs/promises'
import { basename } from 'node:path'

const isDtsOnly = process.argv.includes('--dts-only')
const _pkgName = basename(import.meta.dirname) // "signal"

console.log(
  isDtsOnly ? 'Building @gravito/signal DTS...' : 'Building @gravito/signal in parallel...'
)

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
}

// External dependencies（peer deps + framework 包 + 會產生無效 ESM 的 transitive）
const externalDeps = [
  '@gravito/core',
  '@gravito/stream',
  '@gravito/prism',
  'react',
  'react-dom',
  'vue',
  '@vue/server-renderer',
  'nodemailer',
  '@aws-sdk/client-ses',
  'uglify-js', // CJS 內 conditional export 被 bundle 成無效 ESM，改為 external
]

/**
 * Build ESM and CJS bundles using tsup (via bunx).
 *
 * Note: Bun bundler v1.3.10 has a bug where splitting: false with dynamic
 * imports from external dependencies causes the bundler to emit only partial
 * content in the output file (e.g. only mjml-templates.ts content, ~1.5KB
 * instead of the expected ~3MB bundle). tsup (esbuild-based) does not have
 * this issue.
 *
 * tsup outputs CJS as 'index.js'; we rename it to 'index.cjs' to match the
 * package.json exports: { require: './dist/index.cjs' } convention.
 */
async function buildWithTsup(): Promise<number> {
  const externalFlags = externalDeps.flatMap(dep => ['--external', dep])

  const proc = Bun.spawn(
    [
      'bunx',
      'tsup',
      'src/index.ts',
      '--format',
      'esm,cjs',
      '--no-dts',
      '--no-splitting',
      '--outDir',
      'dist',
      ...externalFlags,
    ],
    {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    }
  )
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    console.error('❌ tsup build failed')
    return 1
  }

  // tsup outputs:
  //   dist/index.mjs  (ESM - correct name)
  //   dist/index.js   (CJS - needs renaming to index.cjs)
  // package.json exports.require points to dist/index.cjs
  const indexJsExists = await Bun.file('dist/index.js').exists()
  const cjsExists = await Bun.file('dist/index.cjs').exists()

  if (indexJsExists && !cjsExists) {
    await copyFile('dist/index.js', 'dist/index.cjs')
    console.log('  ✓ Created dist/index.cjs from tsup CJS output')
  }

  const esmExists = await Bun.file('dist/index.mjs').exists()
  if (!esmExists) {
    console.error('❌ dist/index.mjs not found after tsup build')
    return 1
  }

  return 0
}

async function buildInParallel() {
  const tasks: Promise<number>[] = []
  const tempDir = isDtsOnly ? 'dist' : '.tsc-temp'

  if (!isDtsOnly) {
    await rm(tempDir, { recursive: true, force: true })

    // Task 1: tsup build (ESM + CJS)
    // Uses tsup instead of bun build due to Bun v1.3.10 bundler bug:
    // bun build splitting:false emits only partial content (~1.5KB) when
    // the entry module has dynamic imports from external packages.
    const bundlePromise = buildWithTsup()
    tasks.push(bundlePromise)
  }

  // Task 3: tsc 生成型別宣告（使用 tsconfig.build.json + noCheck）
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

// 後處理：tsc 輸出到 .tsc-temp/{pkgName}/src/，需要移到 dist/
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

console.log('✅ @gravito/signal build completed')
