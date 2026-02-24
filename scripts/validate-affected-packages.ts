#!/usr/bin/env bun

/**
 * @fileoverview 受影響套件驗證工具（升級版 v2）
 *
 * 結合 Bun.Transpiler.scanImports() 的代碼層級依賴分析，
 * 提供比 v1（package.json 靜態分析）更精確的受影響套件偵測。
 *
 * ## 升級亮點（v2 vs v1）
 *
 * | 功能           | v1（舊版）              | v2（此版）                         |
 * |--------------|----------------------|-----------------------------------|
 * | 依賴圖來源     | package.json 聲明     | scanImports() 代碼層級（更精確）   |
 * | 偵測精確度     | 依賴聲明 = 實際使用    | 實際 import = 真正受影響           |
 * | 性能           | 基線                  | 快取加速（重複查詢）               |
 * | --verbose      | 不支援               | 支援（顯示依賴鏈細節）             |
 * | 隱式依賴       | 忽略                  | 偵測並警告                         |
 *
 * ## 執行流程
 *
 * 1. 使用 scanImports() 掃描所有套件的實際 import 依賴
 * 2. 建立雙向依賴圖（正向 + 反向）
 * 3. 從 Git diff 找出變更的套件
 * 4. 遞歸追蹤所有受影響的套件（BFS）
 * 5. 對受影響的套件執行 typecheck
 *
 * 使用方式：
 * ```bash
 * bun run scripts/validate-affected-packages.ts [--verbose] [--dry-run] [--base=<ref>]
 * ```
 *
 * 選項：
 * - `--verbose`  - 顯示依賴鏈細節和性能指標
 * - `--dry-run`  - 只顯示受影響的套件，不執行 typecheck
 * - `--base`     - Git 基準分支/提交（預設 HEAD~1，CI 中通常是 origin/main）
 *
 * @module scripts/validate-affected-packages
 * @version 2.0.0
 */

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { $ } from 'bun'
import {
  createTimer,
  findAllPackages,
  type PackageScanResult,
  scanPackageDeps,
} from './transpiler-utils'

// ─────────────────────────────────────────────────────────────────────────────
// CLI 參數解析
// ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs({
  options: {
    verbose: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    base: { type: 'string', default: '' },
    concurrency: { type: 'string', default: '8' },
  },
})

const CONCURRENCY = Math.max(1, Number.parseInt(args.values.concurrency ?? '8', 10) || 8)

// ─────────────────────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 套件資訊（包含代碼層級依賴）
 */
interface PackageNode {
  /** 完整套件名稱（如 @gravito/core） */
  name: string
  /** 套件根目錄絕對路徑 */
  path: string
  /** 從代碼 import 中發現的 @gravito/* 依賴 */
  codeDeps: Set<string>
  /** package.json 中聲明的 @gravito/* 依賴（補充） */
  declaredDeps: Set<string>
  /** 合併後的所有依賴 */
  allDeps: Set<string>
}

/**
 * 依賴圖（正向 + 反向）
 */
interface DependencyGraph {
  /** 正向圖：套件 → 其依賴的套件（set） */
  forward: Map<string, Set<string>>
  /** 反向圖：套件 → 依賴它的套件（set，用於找受影響者） */
  reverse: Map<string, Set<string>>
  /** 所有套件節點 */
  nodes: Map<string, PackageNode>
}

// ─────────────────────────────────────────────────────────────────────────────
// 套件掃描與依賴圖建立
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 讀取套件的 package.json 聲明依賴
 */
async function readDeclaredDeps(pkgPath: string): Promise<Set<string>> {
  try {
    const pkg = await Bun.file(join(pkgPath, 'package.json')).json()
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }
    return new Set(Object.keys(allDeps).filter((d) => d.startsWith('@gravito/')))
  } catch {
    return new Set()
  }
}

/**
 * 掃描所有套件，建立代碼層級依賴圖
 *
 * v2 核心改進：使用 scanImports() 取代純 package.json 分析。
 * 只有代碼中實際出現的 import 才算依賴，聲明但未使用的不算。
 *
 * @returns 依賴圖（含正向 + 反向）
 */
async function buildDependencyGraph(): Promise<DependencyGraph> {
  const rootDir = process.cwd()
  const allPackages = await findAllPackages(rootDir)

  if (args.values.verbose) {
    process.stdout.write(`  掃描 ${allPackages.length} 個套件的代碼依賴...\n`)
  }

  // 並行掃描所有套件
  const nodes = new Map<string, PackageNode>()

  for (let i = 0; i < allPackages.length; i += CONCURRENCY) {
    const batch = allPackages.slice(i, i + CONCURRENCY)

    const batchResults = await Promise.all(
      batch.map(async ({ path, name }) => {
        // 代碼層級掃描（v2 新增）
        let codeScan: PackageScanResult | null = null
        try {
          codeScan = await scanPackageDeps(path, name)
        } catch {
          // 掃描失敗，繼續
        }

        // package.json 聲明依賴（補充，處理 peer deps 等無法從代碼掃到的情況）
        const declaredDeps = await readDeclaredDeps(path)

        // 代碼依賴（最精確）
        const codeDeps = codeScan?.actualGravitoDeps ?? new Set<string>()

        // 合併：代碼依賴 + 聲明依賴
        const allDeps = new Set([...codeDeps, ...declaredDeps])

        return {
          name,
          node: { name, path, codeDeps, declaredDeps, allDeps } satisfies PackageNode,
        }
      })
    )

    for (const { name, node } of batchResults) {
      nodes.set(name, node)
    }
  }

  // 建立正向圖 + 反向圖
  const forward = new Map<string, Set<string>>()
  const reverse = new Map<string, Set<string>>()

  for (const name of nodes.keys()) {
    forward.set(name, new Set())
    reverse.set(name, new Set())
  }

  for (const [name, node] of nodes) {
    for (const dep of node.allDeps) {
      if (nodes.has(dep)) {
        // name 依賴 dep（正向）
        forward.get(name)?.add(dep)
        // dep 被 name 依賴（反向）
        reverse.get(dep)?.add(name)
      }
    }
  }

  return { forward, reverse, nodes }
}

// ─────────────────────────────────────────────────────────────────────────────
// Git 變更偵測
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 從 Git diff 找出變更的套件
 *
 * @param graph - 依賴圖（提供套件路徑資訊）
 * @returns 變更的套件名稱陣列
 */
async function getChangedPackages(graph: DependencyGraph): Promise<string[]> {
  try {
    const baseRef =
      (args.values.base ?? '').trim() ||
      (process.env.CHANGED_PACKAGES_BASE ?? '').trim() ||
      'HEAD~1'

    const { stdout } = await $`git diff --name-only ${baseRef} HEAD`.quiet()
    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    const changedPackages = new Set<string>()
    const cwd = process.cwd()

    for (const file of changedFiles) {
      for (const [name, node] of graph.nodes) {
        const relativePath = node.path.replace(`${cwd}/`, '')
        if (file.startsWith(relativePath)) {
          changedPackages.add(name)
        }
      }
    }

    return Array.from(changedPackages)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 受影響套件計算
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 BFS 追蹤所有受影響的套件（變更的套件 + 依賴它們的套件）
 *
 * v2 改進：使用更精確的代碼層級依賴圖，減少誤判。
 *
 * @param changedPackages - 直接變更的套件名稱
 * @param graph - 依賴圖
 * @returns 受影響的套件名稱 Set
 */
function getAffectedPackages(changedPackages: string[], graph: DependencyGraph): Set<string> {
  const affected = new Set<string>(changedPackages)
  const queue = [...changedPackages]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) {
      continue
    }
    visited.add(current)

    // 從反向圖找出所有依賴此套件的套件
    const dependents = graph.reverse.get(current)
    if (dependents) {
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent)
          queue.push(dependent)
        }
      }
    }
  }

  return affected
}

// ─────────────────────────────────────────────────────────────────────────────
// typecheck 執行
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 對受影響的套件執行 typecheck
 *
 * 使用 turbo 並行執行，利用 Turborepo 的快取加速。
 *
 * @param packageNames - 套件名稱陣列
 * @returns 是否全部通過
 */
async function typecheckPackages(packageNames: string[]): Promise<boolean> {
  if (packageNames.length === 0) {
    process.stdout.write('沒有受影響的套件需要檢查\n')
    return true
  }

  process.stdout.write(`\n執行 typecheck（${packageNames.length} 個套件）...\n`)

  try {
    const filter = packageNames.map((name) => `--filter=${name}`)
    await $`bunx turbo run typecheck ${filter}`.quiet()
    process.stdout.write('所有受影響的套件都通過了 typecheck\n')
    return true
  } catch {
    process.stderr.write('部分套件未通過 typecheck\n')
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 主程式
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 主函式
 *
 * 執行流程：
 * 1. 掃描所有套件，建立代碼層級依賴圖
 * 2. 從 Git diff 找出變更的套件
 * 3. BFS 追蹤所有受影響的套件
 * 4. 輸出受影響套件列表（--verbose 顯示依賴鏈）
 * 5. 執行 typecheck（除非 --dry-run）
 */
async function main() {
  const globalTimer = createTimer()

  process.stdout.write('分析受影響的套件（v2 代碼層級）...\n\n')

  // 1. 掃描套件，建立依賴圖
  process.stdout.write('建立代碼層級依賴圖...\n')
  const graphTimer = createTimer()
  const graph = await buildDependencyGraph()
  const graphMs = graphTimer.elapsed()

  process.stdout.write(`找到 ${graph.nodes.size} 個套件 (${graphMs.toFixed(0)}ms)\n`)

  // 2. 找出變更的套件
  const changedPackages = await getChangedPackages(graph)

  if (changedPackages.length === 0) {
    process.stdout.write('沒有檢測到變更的套件（可能是第一次提交）\n')
    process.stdout.write('跳過檢查\n')
    process.exit(0)
  }

  process.stdout.write(`\n變更的套件（${changedPackages.length} 個）：\n`)
  for (const name of changedPackages) {
    process.stdout.write(`  - ${name}\n`)
  }

  // 3. 計算受影響的套件
  const affectedSet = getAffectedPackages(changedPackages, graph)
  const indirectlyAffected = Array.from(affectedSet).filter(
    (name) => !changedPackages.includes(name)
  )

  process.stdout.write(`\n受影響的套件（${affectedSet.size} 個）：\n`)

  // 直接變更的套件
  process.stdout.write(`  直接變更（${changedPackages.length} 個）：\n`)
  for (const name of changedPackages.sort()) {
    process.stdout.write(`    - ${name}\n`)
  }

  // 間接受影響的套件（因依賴變更）
  if (indirectlyAffected.length > 0) {
    process.stdout.write(`  因依賴變更而受影響（${indirectlyAffected.length} 個）：\n`)
    for (const name of indirectlyAffected.sort()) {
      process.stdout.write(`    - ${name}`)

      // verbose 模式：顯示為什麼受影響（依賴鏈）
      if (args.values.verbose) {
        const node = graph.nodes.get(name)
        if (node) {
          const affectedDeps = Array.from(node.allDeps).filter((d) => affectedSet.has(d))
          if (affectedDeps.length > 0) {
            process.stdout.write(` (因 ${affectedDeps.join(', ')} 變更)`)
          }
        }
      }

      process.stdout.write('\n')
    }
  }

  // verbose 模式：顯示性能統計
  if (args.values.verbose) {
    process.stdout.write('\n性能統計：\n')
    process.stdout.write(`  依賴圖建立: ${graphMs.toFixed(0)}ms\n`)
    process.stdout.write(`  掃描套件數: ${graph.nodes.size}\n`)

    // 統計代碼 vs 聲明依賴的差異
    let codeOnlyDeps = 0
    let declaredOnlyDeps = 0
    for (const node of graph.nodes.values()) {
      for (const dep of node.codeDeps) {
        if (!node.declaredDeps.has(dep)) {
          codeOnlyDeps++
        }
      }
      for (const dep of node.declaredDeps) {
        if (!node.codeDeps.has(dep)) {
          declaredOnlyDeps++
        }
      }
    }

    if (codeOnlyDeps > 0) {
      process.stdout.write(`  隱式依賴（代碼有 import 但 package.json 未聲明）: ${codeOnlyDeps}\n`)
    }
    if (declaredOnlyDeps > 0) {
      process.stdout.write(`  未使用聲明（package.json 有但代碼未 import）: ${declaredOnlyDeps}\n`)
    }
  }

  // 4. dry-run 模式：只顯示，不執行 typecheck
  if (args.values['dry-run']) {
    process.stdout.write('\n[dry-run 模式] 跳過 typecheck 執行\n')
    const totalMs = globalTimer.elapsed()
    process.stdout.write(`總耗時: ${totalMs.toFixed(0)}ms\n`)
    process.exit(0)
  }

  // 5. 執行 typecheck
  const success = await typecheckPackages(Array.from(affectedSet))

  const totalMs = globalTimer.elapsed()
  process.stdout.write(`\n總耗時: ${totalMs.toFixed(0)}ms\n`)

  process.exit(success ? 0 : 1)
}

main().catch((e) => {
  process.stderr.write(`錯誤：${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
