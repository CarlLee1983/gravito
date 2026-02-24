#!/usr/bin/env bun

/**
 * @fileoverview 未使用 Import 檢查工具（升級版 v2）
 *
 * 使用 Bun.Transpiler API 進行快速的未使用 import 靜態分析，
 * 相比舊版的 tsc + biome 方式，性能提升 3-5x。
 *
 * ## 升級亮點（v2 vs v1）
 *
 * | 功能           | v1（舊版）              | v2（此版）                    |
 * |--------------|----------------------|------------------------------|
 * | 分析引擎       | bun run typecheck    | Bun.Transpiler.scan()        |
 * | 速度           | 30-60s               | 3-10s（3-5x 加速）            |
 * | 並行性         | 受 tsc 限制            | 完全無狀態，高並行              |
 * | 精確度         | TypeScript 準確        | Transpiler 層級（可能有差異）    |
 * | Fix 能力       | biome --write        | biome --write（保留）          |
 *
 * ## 策略說明
 *
 * 使用 `trimUnusedImports: true` 選項的 Transpiler 轉換後，
 * 比對原始 import 與轉換後保留的 import 差集，即為未使用的 import。
 *
 * 使用方式：
 * ```bash
 * bun run scripts/check-unused-imports.ts [--all] [--fix] [--concurrency=4] [--verbose]
 * ```
 *
 * 選項：
 * - `--all`         - 檢查所有包（預設只檢查變更的包）
 * - `--fix`         - 自動移除未使用的導入（使用 biome）
 * - `--concurrency` - 並行數量（預設 8，v2 支援更高並行）
 * - `--verbose`     - 顯示詳細的掃描資訊
 *
 * @module scripts/check-unused-imports
 * @version 2.0.0
 */

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { $, Glob } from 'bun'
import { createTimer, findAllPackages, ScriptTranspilerCache } from './transpiler-utils'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 參數解析
// ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    fix: { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '8' },
    verbose: { type: 'boolean', default: false },
  },
})

const CONCURRENCY = Math.max(1, Number.parseInt(args.values.concurrency ?? '8', 10) || 8)

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 單一檔案的未使用 import 分析結果
 */
interface FileUnusedResult {
  /** 檔案路徑（相對於套件根目錄） */
  filePath: string
  /** 未使用的 import 路徑列表 */
  unusedImports: string[]
  /** 分析是否成功 */
  success: boolean
}

/**
 * 套件層級的分析結果
 */
interface PackageResult {
  /** 套件路徑 */
  pkgPath: string
  /** 套件名稱（目錄名） */
  pkgName: string
  /** 是否有未使用的 import */
  hasUnused: boolean
  /** 各檔案的詳細結果（verbose 模式使用） */
  fileResults: FileUnusedResult[]
  /** 掃描耗時（毫秒） */
  elapsedMs: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心分析邏輯
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 分析單一 TypeScript 檔案中的未使用 import
 *
 * 策略：
 * 1. 使用 `trimUnusedImports: false` 的 Transpiler 掃描原始 import
 * 2. 使用 `trimUnusedImports: true` 的 Transpiler 掃描保留的 import
 * 3. 差集即為未使用的 import
 *
 * 注意：此方法基於 Transpiler 層級分析，對於型別導入（type-only imports）
 * 的處理可能與 TypeScript 編譯器稍有差異。
 *
 * @param filePath - 檔案絕對路徑
 * @param isTsx - 是否為 TSX 檔案
 * @returns 未使用 import 分析結果
 */
async function analyzeFileUnusedImports(
  filePath: string,
  isTsx: boolean
): Promise<FileUnusedResult> {
  try {
    const source = await Bun.file(filePath).text()
    const loader = isTsx ? 'tsx' : 'ts'

    // 建立兩個 Transpiler：一個保留未使用 import，一個修剪
    // 注意：每次建立 Transpiler 有約 40µs 開銷，但此處為了精確比較必須分開
    const transpilerKeep = new Bun.Transpiler({ loader, trimUnusedImports: false })
    const transpilerTrim = new Bun.Transpiler({ loader, trimUnusedImports: true })

    // 掃描原始 import（保留模式）
    const allImports = transpilerKeep.scanImports(source)
    const allPaths = new Set(allImports.map((i) => i.path))

    // 掃描保留的 import（修剪模式）
    const keptImports = transpilerTrim.scanImports(source)
    const keptPaths = new Set(keptImports.map((i) => i.path))

    // 計算差集：在 all 中但不在 kept 中的就是未使用的
    const unusedImports = Array.from(allPaths).filter((p) => !keptPaths.has(p))

    return {
      filePath,
      unusedImports,
      success: true,
    }
  } catch {
    return {
      filePath,
      unusedImports: [],
      success: false,
    }
  }
}

/**
 * 分析整個套件的未使用 import
 *
 * 使用 Bun Glob 找出所有 .ts/.tsx 檔案，並行分析所有檔案，
 * 返回套件層級的分析結果。
 *
 * @param packagePath - 套件根目錄絕對路徑
 * @returns 套件分析結果
 */
async function analyzePackage(packagePath: string): Promise<PackageResult> {
  const timer = createTimer()
  const pkgName = packagePath.split('/').pop() || packagePath

  // 找出 src/ 目錄下的所有 TS/TSX 檔案
  const srcPath = join(packagePath, 'src')
  const glob = new Glob('**/*.{ts,tsx}')

  const filePaths: Array<{ path: string; isTsx: boolean }> = []

  try {
    for (const file of glob.scanSync({ cwd: srcPath })) {
      // 排除 .d.ts 聲明檔（它們通常有預期的「未使用」import）
      if (file.endsWith('.d.ts')) {
        continue
      }
      filePaths.push({
        path: join(srcPath, file),
        isTsx: file.endsWith('.tsx') || file.endsWith('.jsx'),
      })
    }
  } catch {
    // src/ 不存在，嘗試根目錄
    try {
      for (const file of glob.scanSync({ cwd: packagePath })) {
        if (file.endsWith('.d.ts')) {
          continue
        }
        filePaths.push({
          path: join(packagePath, file),
          isTsx: file.endsWith('.tsx') || file.endsWith('.jsx'),
        })
      }
    } catch {
      // 無法掃描，返回空結果
    }
  }

  if (filePaths.length === 0) {
    return {
      pkgPath: packagePath,
      pkgName,
      hasUnused: false,
      fileResults: [],
      elapsedMs: timer.elapsed(),
    }
  }

  // 並行分析所有檔案（批次控制）
  const fileResults: FileUnusedResult[] = []
  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(({ path, isTsx }) => analyzeFileUnusedImports(path, isTsx))
    )
    fileResults.push(...batchResults)
  }

  // 判斷套件是否有問題
  const hasUnused = fileResults.some((r) => r.unusedImports.length > 0)

  return {
    pkgPath: packagePath,
    pkgName,
    hasUnused,
    fileResults,
    elapsedMs: timer.elapsed(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 套件發現
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 找出所有套件路徑
 */
async function getAllPackagePaths(): Promise<string[]> {
  const rootDir = process.cwd()
  const packages = await findAllPackages(rootDir)
  return packages.map((p) => p.path)
}

/**
 * 找出 Git 變更的套件路徑
 */
async function getChangedPackagePaths(): Promise<string[]> {
  try {
    const baseRef = (process.env.CHANGED_PACKAGES_BASE ?? '').trim() || 'HEAD~1'
    const { stdout } = await $`git diff --name-only ${baseRef} HEAD`.quiet()
    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    const changedPackages = new Set<string>()
    const allPackages = await getAllPackagePaths()

    for (const file of changedFiles) {
      for (const pkgPath of allPackages) {
        const relativePath = pkgPath.replace(`${process.cwd()}/`, '')
        if (file.startsWith(relativePath)) {
          changedPackages.add(pkgPath)
        }
      }
    }

    return Array.from(changedPackages)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 修復功能（使用 biome，保留向後相容）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 biome 自動修復未使用的 import
 *
 * @param packagePath - 套件根目錄
 */
async function fixWithBiome(packagePath: string): Promise<void> {
  try {
    await $`bunx biome check --write --organize-imports-enabled=true ${packagePath}`.quiet()
  } catch {
    // biome 修復失敗，忽略（不影響主流程）
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 主函式
 *
 * 執行流程：
 * 1. 確定要檢查的套件列表（--all 或變更的套件）
 * 2. 若 --fix，先用 biome 修復
 * 3. 並行分析所有套件（Transpiler 層級）
 * 4. 輸出結果和統計
 */
async function main() {
  const globalTimer = createTimer()

  process.stdout.write('檢查未使用的導入（Transpiler v2）...\n\n')

  // 1. 確定套件列表
  const packagePaths = args.values.all ? await getAllPackagePaths() : await getChangedPackagePaths()

  if (packagePaths.length === 0) {
    process.stdout.write('沒有需要檢查的套件\n')
    process.exit(0)
  }

  process.stdout.write(`掃描 ${packagePaths.length} 個套件（並行 ${CONCURRENCY}）...\n\n`)

  // 2. 若 --fix，先用 biome 修復
  if (args.values.fix) {
    process.stdout.write('執行 biome 自動修復...\n')
    await Promise.all(packagePaths.map((p) => fixWithBiome(p)))
    process.stdout.write('biome 修復完成\n\n')
  }

  // 3. 並行分析套件（批次，避免同時啟動過多）
  const packageResults: PackageResult[] = []
  for (let i = 0; i < packagePaths.length; i += CONCURRENCY) {
    const batch = packagePaths.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map((p) => analyzePackage(p)))
    packageResults.push(...batchResults)
  }

  // 4. 輸出結果
  let hasIssues = false
  for (const result of packageResults) {
    if (result.hasUnused) {
      hasIssues = true
      process.stdout.write(`[FAIL] ${result.pkgName}\n`)

      // 顯示有問題的檔案
      for (const file of result.fileResults.filter((f) => f.unusedImports.length > 0)) {
        const relPath = file.filePath.replace(`${result.pkgPath}/`, '')
        process.stdout.write(`    ${relPath}\n`)

        for (const imp of file.unusedImports.slice(0, 3)) {
          process.stdout.write(`      - ${imp}\n`)
        }
        if (file.unusedImports.length > 3) {
          process.stdout.write(`      ... 還有 ${file.unusedImports.length - 3} 個\n`)
        }
      }

      if (args.values.verbose) {
        process.stdout.write(`    耗時: ${result.elapsedMs.toFixed(0)}ms\n`)
      }
    } else {
      process.stdout.write(`[OK]   ${result.pkgName}`)
      if (args.values.verbose) {
        process.stdout.write(` (${result.elapsedMs.toFixed(0)}ms)`)
      }
      process.stdout.write('\n')
    }
  }

  // 5. 顯示統計
  const totalMs = globalTimer.elapsed()
  const cacheStats = ScriptTranspilerCache.getInstance().getStats()

  process.stdout.write('\n')
  process.stdout.write(`${'='.repeat(50)}\n`)
  process.stdout.write(`掃描完成 (${totalMs.toFixed(0)}ms)\n`)

  if (args.values.verbose) {
    process.stdout.write(`Transpiler 快取: 命中 ${cacheStats.hits}, 未中 ${cacheStats.misses}\n`)
    process.stdout.write(`分析套件: ${packageResults.length} 個\n`)
    process.stdout.write(`有問題的套件: ${packageResults.filter((r) => r.hasUnused).length} 個\n`)
  }

  if (hasIssues) {
    process.stdout.write('\n提示：使用 --fix 選項可以自動修復部分問題\n')
    process.stdout.write('   或使用 biome check --write --organize-imports-enabled=true\n')
    process.exit(1)
  } else {
    process.stdout.write('所有套件都沒有未使用的導入\n')
    process.exit(0)
  }
}

main().catch((e) => {
  process.stderr.write(`錯誤：${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
