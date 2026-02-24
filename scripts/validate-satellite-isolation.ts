#!/usr/bin/env bun

/**
 * @fileoverview Satellite 隔離驗證工具
 *
 * 驗證 Gravito Satellite 套件之間的隔離原則：
 * **Satellite 禁止直接 import 其他 Satellite，必須透過 EventBus 或 Router 通訊。**
 *
 * ## 架構原則
 *
 * 在 Galaxy Architecture 中，Satellite 是業務領域插件，設計上必須：
 * - 彼此完全隔離（不直接依賴）
 * - 透過 @gravito/signal（EventBus）進行跨 Satellite 通訊
 * - 或透過 Router 進行 HTTP 層通訊
 *
 * 違反此原則會導致：
 * - 緊密耦合，難以獨立部署
 * - 版本依賴衝突
 * - 測試困難（無法單獨測試 Satellite）
 *
 * ## 偵測範圍
 *
 * - 所有 satellites/ 子目錄中的 src/**\/*.ts 和 src/**\/*.tsx 中的 import 語句
 * - 偵測 `@gravito/satellite-*` 前綴的套件導入
 * - 排除自身（Satellite A import Satellite A 是合法的）
 *
 * ## 輸出格式
 *
 * ```
 * [VIOLATION] @gravito/satellite-commerce/src/order.ts
 *   imports @gravito/satellite-catalog (違反隔離原則)
 *   建議：使用 EventBus 或 HTTP API 進行跨 Satellite 通訊
 * ```
 *
 * 使用方式：
 * ```bash
 * bun run scripts/validate-satellite-isolation.ts [--verbose] [--ci]
 * ```
 *
 * 選項：
 * - `--verbose` - 顯示所有 Satellite 的掃描結果（含通過的）
 * - `--ci`      - CI 模式：違規時以非零退出碼退出
 *
 * @module scripts/validate-satellite-isolation
 * @version 1.0.0
 */

import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Glob } from 'bun'
import { createTimer, ScriptTranspilerCache } from './transpiler-utils'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 參數解析
// ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs({
  options: {
    verbose: { type: 'boolean', default: false },
    ci: { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '8' },
  },
})

const CONCURRENCY = Math.max(1, Number.parseInt(args.values.concurrency ?? '8', 10) || 8)

// ─────────────────────────────────────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────────────────────────────────────

/** Satellite 套件名稱前綴 */
const SATELLITE_PREFIX = '@gravito/satellite-'

/** 合法的跨 Satellite 通訊方式（用於建議提示） */
const ALLOWED_COMMUNICATION = [
  '@gravito/signal（EventBus 事件總線）',
  '@gravito/core 的 IoC Container',
  'HTTP API（透過 @gravito/photon 的 Router）',
]

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 違規記錄
 */
interface Violation {
  /** 發生違規的 Satellite（完整套件名） */
  fromSatellite: string
  /** 被非法導入的 Satellite（完整套件名） */
  toSatellite: string
  /** 發生違規的檔案路徑 */
  filePath: string
  /** import 語句的類型 */
  importKind: string
}

/**
 * 單一 Satellite 的掃描結果
 */
interface SatelliteScanResult {
  /** Satellite 完整套件名 */
  name: string
  /** Satellite 根目錄 */
  path: string
  /** 掃描的檔案數 */
  scannedFiles: number
  /** 違規記錄 */
  violations: Violation[]
  /** 掃描耗時（毫秒） */
  elapsedMs: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Satellite 發現
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 找出所有 Satellite 套件
 *
 * 掃描 satellites/ 目錄，找出所有 @gravito/satellite-* 套件。
 *
 * @param rootDir - Monorepo 根目錄
 * @returns Satellite 資訊陣列
 */
async function findAllSatellites(rootDir: string): Promise<Array<{ name: string; path: string }>> {
  const satellitesDir = join(rootDir, 'satellites')
  const satellites: Array<{ name: string; path: string }> = []
  const glob = new Glob('*/package.json')

  try {
    for (const relPath of glob.scanSync({ cwd: satellitesDir })) {
      const pkgJsonPath = join(satellitesDir, relPath)
      try {
        const pkg = await Bun.file(pkgJsonPath).json()
        // 只處理 @gravito/satellite-* 套件
        if (pkg.name?.startsWith(SATELLITE_PREFIX)) {
          satellites.push({
            name: pkg.name,
            path: resolve(pkgJsonPath, '..'),
          })
        }
      } catch {
        // 忽略無法讀取的 package.json
      }
    }
  } catch {
    // satellites/ 目錄不存在
  }

  return satellites
}

// ─────────────────────────────────────────────────────────────────────────────
// 違規偵測
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 掃描單一 Satellite 的所有違規
 *
 * 使用 Bun.Transpiler.scanImports() 掃描所有 .ts/.tsx 檔案，
 * 找出對其他 Satellite 的直接 import（違反隔離原則）。
 *
 * @param satellite - Satellite 資訊
 * @param allSatelliteNames - 所有 Satellite 套件名稱的 Set（用於快速查詢）
 * @returns 掃描結果（含違規記錄）
 */
async function scanSatelliteViolations(
  satellite: { name: string; path: string },
  allSatelliteNames: Set<string>
): Promise<SatelliteScanResult> {
  const timer = createTimer()
  const violations: Violation[] = []
  const srcPath = join(satellite.path, 'src')
  const cache = ScriptTranspilerCache.getInstance()

  // 找出所有 .ts/.tsx 檔案
  const glob = new Glob('**/*.{ts,tsx}')
  const filePaths: Array<{ path: string; isTsx: boolean }> = []

  try {
    for (const file of glob.scanSync({ cwd: srcPath })) {
      // 排除 .d.ts 聲明檔
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
      for (const file of glob.scanSync({ cwd: satellite.path })) {
        if (file.endsWith('.d.ts') || file.includes('node_modules')) {
          continue
        }
        filePaths.push({
          path: join(satellite.path, file),
          isTsx: file.endsWith('.tsx') || file.endsWith('.jsx'),
        })
      }
    } catch {
      // 無法掃描
    }
  }

  // 並行掃描所有檔案
  const checkFile = async (filePath: string, isTsx: boolean): Promise<Violation[]> => {
    const fileViolations: Violation[] = []
    try {
      const source = await Bun.file(filePath).text()
      const imports = cache.scanImports(source, isTsx)

      for (const imp of imports) {
        // 只關注 @gravito/satellite-* 的 import
        if (!imp.path.startsWith(SATELLITE_PREFIX)) {
          continue
        }

        // 提取包名（只取 @gravito/satellite-xxx 部分，不含子路徑）
        const pkgName = imp.path.split('/').slice(0, 3).join('/')

        // 排除自身（合法：Satellite 可以 import 自己的子路徑）
        if (pkgName === satellite.name) {
          continue
        }

        // 確認目標是已知的 Satellite（避免誤判外部套件）
        if (!allSatelliteNames.has(pkgName)) {
          continue
        }

        fileViolations.push({
          fromSatellite: satellite.name,
          toSatellite: pkgName,
          filePath,
          importKind: imp.kind,
        })
      }
    } catch {
      // 讀取或掃描失敗，忽略
    }
    return fileViolations
  }

  // 批次並行掃描
  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(({ path, isTsx }) => checkFile(path, isTsx)))
    for (const fileViolations of batchResults) {
      violations.push(...fileViolations)
    }
  }

  return {
    name: satellite.name,
    path: satellite.path,
    scannedFiles: filePaths.length,
    violations,
    elapsedMs: timer.elapsed(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 輸出格式化
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 格式化違規報告
 *
 * @param violation - 違規記錄
 * @param rootDir - Monorepo 根目錄（用於計算相對路徑）
 */
function formatViolation(violation: Violation, rootDir: string): string {
  const relPath = violation.filePath.replace(`${rootDir}/`, '')
  const lines: string[] = [
    `  [VIOLATION] ${relPath}`,
    `    import '${violation.toSatellite}' (違反 Satellite 隔離原則)`,
  ]
  return lines.join('\n')
}

/**
 * 格式化修復建議
 *
 * @param violation - 違規記錄
 */
function formatSuggestion(violation: Violation): string {
  const targetShortName = violation.toSatellite.replace(SATELLITE_PREFIX, '')
  const fromShortName = violation.fromSatellite.replace(SATELLITE_PREFIX, '')

  const lines = [
    '',
    `  修復建議（${fromShortName} → ${targetShortName}）：`,
    `  1. 使用 EventBus 發送事件：`,
    `     // 在 ${fromShortName} 中`,
    `     const bus = container.resolve(EventBus)`,
    `     await bus.emit('${targetShortName}:some-event', payload)`,
    `  2. 或使用 HTTP API 呼叫：`,
    `     const client = new ApiClient('/${targetShortName}')`,
    `     await client.get('/resource')`,
    '',
    '  合法的跨 Satellite 通訊方式：',
    ...ALLOWED_COMMUNICATION.map((way) => `    - ${way}`),
  ]

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 主函式
 *
 * 執行流程：
 * 1. 找出所有 Satellite 套件
 * 2. 並行掃描每個 Satellite 的 import
 * 3. 偵測跨 Satellite 的直接 import（違規）
 * 4. 輸出違規清單和修復建議
 * 5. CI 模式下違規時以非零退出碼退出
 */
async function main() {
  const globalTimer = createTimer()
  const rootDir = process.cwd()

  process.stdout.write('驗證 Satellite 隔離原則...\n\n')

  // 1. 找出所有 Satellite
  const satellites = await findAllSatellites(rootDir)

  if (satellites.length === 0) {
    process.stdout.write('未找到任何 Satellite 套件（satellites/ 目錄為空或不存在）\n')
    process.exit(0)
  }

  process.stdout.write(`找到 ${satellites.length} 個 Satellite 套件\n\n`)

  if (args.values.verbose) {
    for (const sat of satellites) {
      process.stdout.write(`  - ${sat.name}\n`)
    }
    process.stdout.write('\n')
  }

  // 建立 Satellite 名稱 Set（快速查詢）
  const allSatelliteNames = new Set(satellites.map((s) => s.name))

  // 2. 並行掃描所有 Satellite
  process.stdout.write('掃描 import 語句...\n')
  const scanTimer = createTimer()

  const results: SatelliteScanResult[] = []
  for (let i = 0; i < satellites.length; i += CONCURRENCY) {
    const batch = satellites.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((sat) => scanSatelliteViolations(sat, allSatelliteNames))
    )
    results.push(...batchResults)
  }

  const scanMs = scanTimer.elapsed()
  const totalFiles = results.reduce((sum, r) => sum + r.scannedFiles, 0)
  process.stdout.write(`掃描完成：${totalFiles} 個檔案 (${scanMs.toFixed(0)}ms)\n\n`)

  // 3. 收集違規
  const allViolations = results.flatMap((r) => r.violations)

  // 4. 輸出結果
  if (allViolations.length === 0) {
    // 全部通過
    process.stdout.write(`${'='.repeat(60)}\n`)
    process.stdout.write('所有 Satellite 都符合隔離原則\n')
    process.stdout.write(`${'='.repeat(60)}\n`)

    // verbose 模式：顯示每個 Satellite 的掃描統計
    if (args.values.verbose) {
      process.stdout.write('\n掃描詳情：\n')
      for (const result of results.sort((a, b) => a.name.localeCompare(b.name))) {
        const shortName = result.name.replace(SATELLITE_PREFIX, '')
        process.stdout.write(
          `  [OK] ${shortName} (${result.scannedFiles} 個檔案, ${result.elapsedMs.toFixed(0)}ms)\n`
        )
      }
    }
  } else {
    // 有違規
    const violatingSatellites = new Set(allViolations.map((v) => v.fromSatellite))

    process.stdout.write(`${'='.repeat(60)}\n`)
    process.stdout.write(
      `發現 ${allViolations.length} 個隔離違規（涉及 ${violatingSatellites.size} 個 Satellite）\n`
    )
    process.stdout.write(`${'='.repeat(60)}\n\n`)

    // 按 Satellite 分組輸出
    for (const result of results.filter((r) => r.violations.length > 0)) {
      const shortName = result.name.replace(SATELLITE_PREFIX, '')
      process.stdout.write(`[FAIL] ${shortName}\n`)

      // 按目標 Satellite 分組（去重）
      const violationsByTarget = new Map<string, Violation[]>()
      for (const v of result.violations) {
        const existing = violationsByTarget.get(v.toSatellite) ?? []
        existing.push(v)
        violationsByTarget.set(v.toSatellite, existing)
      }

      for (const [toSatellite, violations] of violationsByTarget) {
        const toShortName = toSatellite.replace(SATELLITE_PREFIX, '')
        process.stdout.write(`  直接 import ${toShortName}（${violations.length} 個地方）：\n`)

        for (const v of violations.slice(0, 5)) {
          process.stdout.write(`${formatViolation(v, rootDir)}\n`)
        }
        if (violations.length > 5) {
          process.stdout.write(`  ... 還有 ${violations.length - 5} 個違規檔案\n`)
        }

        // 顯示修復建議
        if (violations[0]) {
          process.stdout.write(`${formatSuggestion(violations[0])}\n`)
        }
      }

      process.stdout.write('\n')
    }

    // 通過的 Satellite（verbose 模式）
    if (args.values.verbose) {
      const passing = results.filter((r) => r.violations.length === 0)
      if (passing.length > 0) {
        process.stdout.write(`通過的 Satellite（${passing.length} 個）：\n`)
        for (const result of passing.sort((a, b) => a.name.localeCompare(b.name))) {
          const shortName = result.name.replace(SATELLITE_PREFIX, '')
          process.stdout.write(`  [OK] ${shortName} (${result.scannedFiles} 個檔案)\n`)
        }
        process.stdout.write('\n')
      }
    }
  }

  // 5. 統計摘要
  const totalMs = globalTimer.elapsed()
  process.stdout.write(`總掃描耗時: ${totalMs.toFixed(0)}ms\n`)

  if (args.values.verbose) {
    const cacheStats = ScriptTranspilerCache.getInstance().getStats()
    process.stdout.write(`Transpiler 快取: 命中 ${cacheStats.hits}, 未中 ${cacheStats.misses}\n`)
  }

  // 6. CI 模式：違規時以非零退出
  if (allViolations.length > 0) {
    if (args.values.ci) {
      process.stderr.write('\nCI 模式：發現 Satellite 隔離違規，請修復後再提交\n')
    }
    process.exit(1)
  }

  process.exit(0)
}

main().catch((e) => {
  process.stderr.write(`錯誤：${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
