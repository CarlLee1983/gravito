#!/usr/bin/env bun

/**
 * @fileoverview 構建遷移驗證工具
 *
 * 驗證 5 個試點包從 tsup 遷移至 Bun.build 後的正確性：
 * 1. 執行新版 buildPackage() 構建
 * 2. 驗證輸出文件完整性（dist/ 內容、exports 路徑）
 * 3. 執行性能基準測試（每包 3 次取平均）
 * 4. 生成詳細遷移報告
 *
 * 試點包：beam、echo、ripple-client、spectrum、stream
 *
 * 使用方式：
 * ```bash
 * bun run scripts/validate-build-migration.ts [--verbose] [--ci] [--no-build]
 * ```
 *
 * 選項：
 * - `--verbose`   - 顯示詳細輸出
 * - `--ci`        - CI 模式（任何失敗以非零退出）
 * - `--no-build`  - 跳過構建，僅驗證已有的 dist/
 *
 * @module scripts/validate-build-migration
 */

import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { buildPackage, createTimer, readPackageJson } from './build-utils.ts'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 參數解析
// ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs({
  options: {
    verbose: { type: 'boolean', default: false },
    ci: { type: 'boolean', default: false },
    'no-build': { type: 'boolean', default: false },
  },
  allowPositionals: false,
})

const isVerbose = args.values.verbose ?? false
const isCi = args.values.ci ?? false
const skipBuild = args.values['no-build'] ?? false

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 試點包配置
 */
interface PilotPackageConfig {
  /** 套件名稱 */
  name: string
  /** 相對於 monorepo 根目錄的路徑 */
  path: string
  /** 入口點（相對於套件目錄） */
  entrypoints: string[]
  /** 輸出格式 */
  format: ('esm' | 'cjs')[]
  /** 外部依賴 */
  external: string[]
  /** 運行時目標 */
  target: 'bun' | 'node' | 'browser'
  /** ESM 輸出後綴（可選） */
  esmNaming?: string
  /** 期望在 dist/ 中存在的文件 */
  expectedOutputs: string[]
  /** 是否需要 CJS stub（非完整 CJS 轉譯） */
  cjsStubOnly?: boolean
}

/**
 * 驗證結果
 */
interface ValidationResult {
  /** 套件名稱 */
  packageName: string
  /** 構建是否成功 */
  buildSuccess: boolean
  /** 構建耗時（毫秒） */
  buildDuration: number
  /** 驗證通過的文件 */
  validFiles: string[]
  /** 缺失的文件 */
  missingFiles: string[]
  /** 驗證是否完全通過 */
  valid: boolean
  /** 警告訊息 */
  warnings: string[]
  /** 錯誤訊息 */
  errors: string[]
}

/**
 * 基準測試結果
 */
interface BenchmarkResult {
  /** 套件名稱 */
  packageName: string
  /** 測試次數 */
  runs: number
  /** 平均耗時（毫秒） */
  avgDuration: number
  /** 最小耗時 */
  minDuration: number
  /** 最大耗時 */
  maxDuration: number
  /** 標準差 */
  stdDev: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 試點包配置
// ─────────────────────────────────────────────────────────────────────────────

const ROOT_DIR = resolve(import.meta.dirname, '..')

const PILOT_PACKAGES: PilotPackageConfig[] = [
  {
    name: '@gravito/beam',
    path: 'packages/beam',
    entrypoints: ['src/index.ts'],
    format: ['esm'],
    external: ['@gravito/photon'],
    target: 'bun',
    expectedOutputs: ['index.js', 'index.js.map', 'index.d.ts'],
  },
  {
    name: '@gravito/echo',
    path: 'packages/echo',
    entrypoints: ['src/index.ts'],
    format: ['esm', 'cjs'],
    external: ['@gravito/core'],
    target: 'bun',
    expectedOutputs: ['index.js', 'index.js.map', 'index.cjs', 'index.d.ts'],
  },
  {
    name: '@gravito/ripple-client',
    path: 'packages/ripple-client',
    entrypoints: ['src/index.ts', 'src/react.tsx', 'src/vue.ts'],
    format: ['esm'],
    external: [],
    target: 'browser',
    esmNaming: '[name].mjs',
    cjsStubOnly: true,
    expectedOutputs: [
      'index.mjs',
      'index.mjs.map',
      'index.cjs',
      'index.d.ts',
      'react.mjs',
      'vue.mjs',
    ],
  },
  {
    name: '@gravito/stream',
    path: 'packages/stream',
    entrypoints: ['src/index.ts'],
    format: ['esm', 'cjs'],
    external: ['@gravito/core', '@gravito/atlas'],
    target: 'bun',
    expectedOutputs: ['index.js', 'index.js.map', 'index.cjs', 'index.d.ts'],
  },
  {
    name: '@gravito/spectrum',
    path: 'packages/spectrum',
    entrypoints: ['src/index.ts'],
    format: ['esm', 'cjs'],
    external: [
      '@gravito/core',
      '@gravito/atlas',
      '@gravito/photon',
      '@opentelemetry/api',
      '@opentelemetry/sdk-node',
      '@opentelemetry/exporter-trace-otlp-http',
      '@opentelemetry/resources',
      '@opentelemetry/semantic-conventions',
    ],
    target: 'bun',
    expectedOutputs: ['index.js', 'index.js.map', 'index.cjs', 'index.d.ts'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 輔助函式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 列出目錄中所有文件（遞迴，最多 2 層）
 */
async function listDistFiles(distDir: string, depth = 0): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(distDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(distDir, entry.name)
      if (entry.isDirectory() && depth < 2) {
        const subFiles = await listDistFiles(fullPath, depth + 1)
        files.push(...subFiles.map((f) => join(entry.name, f)))
      } else if (entry.isFile()) {
        files.push(entry.name)
      }
    }
  } catch {
    // dist/ 不存在
  }
  return files
}

/**
 * 計算標準差
 */
function calcStdDev(values: number[], avg: number): number {
  if (values.length <= 1) {
    return 0
  }
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * 格式化毫秒為可讀字串
 */
function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
}

// ─────────────────────────────────────────────────────────────────────────────
// 構建並驗證單一套件
// ─────────────────────────────────────────────────────────────────────────────

async function buildAndValidate(pkg: PilotPackageConfig): Promise<ValidationResult> {
  const pkgDir = resolve(ROOT_DIR, pkg.path)
  const distDir = resolve(pkgDir, 'dist')
  const warnings: string[] = []
  const errors: string[] = []

  // 執行構建
  let buildDuration = 0
  let buildSuccess = false

  if (!skipBuild) {
    const buildTimer = createTimer()
    const result = await buildPackage({
      entrypoints: pkg.entrypoints,
      outdir: 'dist',
      format: pkg.format,
      target: pkg.target,
      splitting: false,
      minify: false,
      sourcemap: 'external',
      external: pkg.external,
      ...(pkg.esmNaming ? { esmNaming: pkg.esmNaming } : {}),
      dts: true,
      packageDir: pkgDir,
      silent: !isVerbose,
    })

    // 若是 ripple-client，需要另外生成 CJS stub
    if (pkg.cjsStubOnly && result.success) {
      const { buildCJSStub } = await import('./build-utils.ts')
      await buildCJSStub(distDir, pkg.entrypoints)
    }

    buildDuration = buildTimer.elapsed()
    buildSuccess = result.success

    if (!result.success) {
      errors.push(...result.errors)
    }
  } else {
    buildSuccess = true
    buildDuration = 0
  }

  // 驗證輸出文件
  const distFiles = await listDistFiles(distDir)
  const validFiles: string[] = []
  const missingFiles: string[] = []

  for (const expected of pkg.expectedOutputs) {
    if (distFiles.includes(expected)) {
      validFiles.push(expected)
    } else {
      missingFiles.push(expected)
    }
  }

  // 警告：存在未預期的大文件
  for (const file of distFiles) {
    if (file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.mjs')) {
      try {
        const filePath = join(distDir, file)
        const fileStat = await stat(filePath)
        if (fileStat.size > 500 * 1024) {
          // 超過 500KB 可能是未正確 external 的依賴
          warnings.push(
            `${file} 體積過大 (${(fileStat.size / 1024).toFixed(0)}KB)，請確認 external 配置`
          )
        }
      } catch {
        // 忽略
      }
    }
  }

  // 驗證 package.json exports 路徑
  try {
    const pkgJson = await readPackageJson(pkgDir)
    const exportsField = pkgJson.exports as Record<string, unknown> | undefined
    if (exportsField) {
      const mainExport = exportsField['.'] as Record<string, string> | undefined
      if (mainExport) {
        for (const [condition, filePath] of Object.entries(mainExport)) {
          const relativePath = (filePath as string).replace('./dist/', '')
          if (!distFiles.includes(relativePath)) {
            warnings.push(`package.json exports["."]['${condition}'] 指向不存在的文件: ${filePath}`)
          }
        }
      }
    }
  } catch {
    warnings.push('無法讀取或解析 package.json exports')
  }

  const valid = buildSuccess && missingFiles.length === 0

  return {
    packageName: pkg.name,
    buildSuccess,
    buildDuration,
    validFiles,
    missingFiles,
    valid,
    warnings,
    errors,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 性能基準測試
// ─────────────────────────────────────────────────────────────────────────────

async function runBenchmark(pkg: PilotPackageConfig, runs = 3): Promise<BenchmarkResult> {
  const pkgDir = resolve(ROOT_DIR, pkg.path)
  const durations: number[] = []

  for (let i = 0; i < runs; i++) {
    const buildTimer = createTimer()
    await buildPackage({
      entrypoints: pkg.entrypoints,
      outdir: 'dist',
      format: pkg.format,
      target: pkg.target,
      splitting: false,
      minify: false,
      sourcemap: 'external',
      external: pkg.external,
      ...(pkg.esmNaming ? { esmNaming: pkg.esmNaming } : {}),
      dts: true,
      packageDir: pkgDir,
      silent: true,
    })
    durations.push(buildTimer.elapsed())
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const stdDev = calcStdDev(durations, avgDuration)

  return {
    packageName: pkg.name,
    runs,
    avgDuration,
    minDuration,
    maxDuration,
    stdDev,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────────────────────

const totalTimer = createTimer()

console.log('=== Bun.build 遷移驗證工具 ===')
console.log(`試點包數量: ${PILOT_PACKAGES.length}`)
console.log(`模式: ${skipBuild ? '僅驗證（跳過構建）' : '構建 + 驗證'}`)
console.log('')

// 階段 1：構建並驗證所有試點包
console.log('--- 階段 1：構建驗證 ---')
const validationResults: ValidationResult[] = []

for (const pkg of PILOT_PACKAGES) {
  process.stdout.write(`  ${pkg.name} ... `)
  const result = await buildAndValidate(pkg)
  validationResults.push(result)

  const status = result.valid ? 'OK' : 'FAIL'
  const duration = skipBuild ? '' : ` (${fmtMs(result.buildDuration)})`
  console.log(`${status}${duration}`)

  if (isVerbose || !result.valid) {
    if (result.missingFiles.length > 0) {
      console.log(`    缺失: ${result.missingFiles.join(', ')}`)
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.log(`    警告: ${w}`)
      }
    }
    if (result.errors.length > 0) {
      for (const e of result.errors) {
        console.log(`    錯誤: ${e}`)
      }
    }
    if (result.validFiles.length > 0 && isVerbose) {
      console.log(`    輸出: ${result.validFiles.join(', ')}`)
    }
  }
}

// 階段 2：性能基準測試（僅非 --no-build 模式）
const benchmarkResults: BenchmarkResult[] = []

if (!skipBuild) {
  console.log('')
  console.log('--- 階段 2：性能基準測試 (3 次) ---')

  for (const pkg of PILOT_PACKAGES) {
    process.stdout.write(`  ${pkg.name} ... `)
    const bench = await runBenchmark(pkg, 3)
    benchmarkResults.push(bench)
    console.log(
      `avg ${fmtMs(bench.avgDuration)} (min ${fmtMs(bench.minDuration)}, max ${fmtMs(bench.maxDuration)})`
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 報告生成
// ─────────────────────────────────────────────────────────────────────────────

const totalDuration = totalTimer.elapsed()
const allValid = validationResults.every((r) => r.valid)
const passCount = validationResults.filter((r) => r.valid).length
const failCount = validationResults.length - passCount

console.log('')
console.log('=== 驗證報告 ===')
console.log('')
console.log('驗證結果摘要')
console.log('─────────────────────────────────────────')
console.log(`總套件數: ${validationResults.length}`)
console.log(`通過: ${passCount}`)
console.log(`失敗: ${failCount}`)
console.log(`總耗時: ${fmtMs(totalDuration)}`)
console.log('')

// 詳細表格
console.log('套件詳情')
console.log('─────────────────────────────────────────')
const header = `${'套件名稱'.padEnd(30)} ${'狀態'.padEnd(6)} ${'構建時間'.padEnd(10)} ${'驗證文件'.padEnd(8)} ${'警告'}`
console.log(header)
console.log('─'.repeat(header.length))

for (const r of validationResults) {
  const status = r.valid ? 'PASS  ' : 'FAIL  '
  const duration = skipBuild ? 'N/A       ' : fmtMs(r.buildDuration).padEnd(10)
  const files = `${r.validFiles.length}/${r.validFiles.length + r.missingFiles.length}`.padEnd(8)
  const warns = r.warnings.length > 0 ? `${r.warnings.length} 個警告` : '-'
  console.log(`${r.packageName.padEnd(30)} ${status} ${duration} ${files} ${warns}`)
}

if (benchmarkResults.length > 0) {
  console.log('')
  console.log('性能基準（Bun.build）')
  console.log('─────────────────────────────────────────')

  // tsup 的預估基準時間（來自分析）
  const TSUP_ESTIMATE_MS = 3500 // 3-5s 取中間值

  const benchHeader = `${'套件名稱'.padEnd(30)} ${'平均'.padEnd(10)} ${'最小'.padEnd(10)} ${'最大'.padEnd(10)} ${'vs tsup'}`
  console.log(benchHeader)
  console.log('─'.repeat(benchHeader.length))

  for (const b of benchmarkResults) {
    const speedup = (TSUP_ESTIMATE_MS / b.avgDuration).toFixed(1)
    const vsLabel = `${speedup}x 快`
    console.log(
      `${b.packageName.padEnd(30)} ${fmtMs(b.avgDuration).padEnd(10)} ${fmtMs(b.minDuration).padEnd(10)} ${fmtMs(b.maxDuration).padEnd(10)} ${vsLabel}`
    )
  }

  const avgAll = benchmarkResults.reduce((a, b) => a + b.avgDuration, 0) / benchmarkResults.length
  const overallSpeedup = (TSUP_ESTIMATE_MS / avgAll).toFixed(1)
  console.log('')
  console.log(
    `整體平均: ${fmtMs(avgAll)} (vs tsup ${fmtMs(TSUP_ESTIMATE_MS)}, ${overallSpeedup}x 加速)`
  )
}

console.log('')
if (allValid) {
  console.log('全部驗證通過！可以繼續遷移剩餘套件。')
} else {
  console.log('部分套件驗證失敗，請修正後重試。')

  for (const r of validationResults.filter((r) => !r.valid)) {
    console.log(`  ${r.packageName}:`)
    if (r.missingFiles.length > 0) {
      console.log(`    缺少輸出: ${r.missingFiles.join(', ')}`)
    }
    for (const err of r.errors) {
      console.log(`    錯誤: ${err}`)
    }
  }
}

// CI 模式：失敗時非零退出
if (isCi && !allValid) {
  process.exit(1)
}
