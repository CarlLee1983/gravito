#!/usr/bin/env bun

/**
 * Gravito Error Class 重複檢查工具
 *
 * 掃描所有 packages\/\*\/src\/**\/*.ts 中的 Error class 定義
 * 並回報跨套件可能重複的 Error class 名稱
 *
 * 注意：Error class 的跨套件分布是刻意的（領域特定），
 * 此工具只偵測真正的命名重複，不強制移除。
 */

import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { Glob } from 'bun'

// ============================================================================
// 常數設定
// ============================================================================

const ROOT_DIR = resolve(__dirname, '..')
const SCAN_PATTERN = 'packages/*/src/**/*.ts'

// 匹配 Error class 定義的正規表示式
// 捕捉：export class FooError、class FooError、abstract class FooError
const ERROR_CLASS_REGEX = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w*Error\w*)\s*(?:extends\s+\S+)?/gm

// ANSI 色彩碼
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const BLUE = '\x1b[34m'
const MAGENTA = '\x1b[35m'

// ============================================================================
// 型別定義
// ============================================================================

interface ErrorClassOccurrence {
  /** Error class 名稱 */
  className: string
  /** 檔案相對路徑 */
  filePath: string
  /** 所屬套件目錄（packages/xxx） */
  packageDir: string
  /** 行號（1-based） */
  lineNumber: number
  /** 完整的 class 宣告行 */
  declaration: string
}

interface DuplicateGroup {
  className: string
  occurrences: ErrorClassOccurrence[]
}

interface ScanStats {
  totalFiles: number
  totalClasses: number
  duplicateGroups: DuplicateGroup[]
  /** 每個套件包含的 error class 數量 */
  classesByPackage: Map<string, number>
}

// ============================================================================
// 核心函式
// ============================================================================

/**
 * 從檔案中提取所有 Error class 宣告
 */
function extractErrorClasses(filePath: string, relativePath: string): ErrorClassOccurrence[] {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const results: ErrorClassOccurrence[] = []

    // 計算套件目錄（取 packages/xxx 部分）
    const pathParts = relativePath.split('/')
    const packageDir = pathParts.length >= 2 ? `${pathParts[0]}/${pathParts[1]}` : pathParts[0]

    let match: RegExpExecArray | null
    // 重置 lastIndex 避免 global 正規表示式狀態問題
    ERROR_CLASS_REGEX.lastIndex = 0

    while ((match = ERROR_CLASS_REGEX.exec(content)) !== null) {
      const className = match[1]

      // 計算行號：計算 match.index 之前的換行數
      const upToMatch = content.substring(0, match.index)
      const lineNumber = upToMatch.split('\n').length

      const declaration = lines[lineNumber - 1]?.trim() ?? match[0].trim()

      results.push({
        className,
        filePath: relativePath,
        packageDir,
        lineNumber,
        declaration,
      })
    }

    return results
  } catch {
    return []
  }
}

/**
 * 掃描所有 TypeScript 源檔案並統計 Error class
 */
function scanErrorClasses(): ScanStats {
  const glob = new Glob(SCAN_PATTERN)
  const allPaths = Array.from(glob.scanSync({ cwd: ROOT_DIR }))

  // 收集所有 Error class 出現紀錄
  const allOccurrences: ErrorClassOccurrence[] = []
  let totalFiles = 0

  for (const relativePath of allPaths) {
    // 排除測試檔案（tests/ 目錄或 .test.ts / .spec.ts）
    if (
      relativePath.includes('/tests/') ||
      relativePath.includes('/__tests__/') ||
      relativePath.endsWith('.test.ts') ||
      relativePath.endsWith('.spec.ts') ||
      relativePath.includes('/node_modules/')
    ) {
      continue
    }

    const fullPath = resolve(ROOT_DIR, relativePath)
    const occurrences = extractErrorClasses(fullPath, relativePath)

    if (occurrences.length > 0) {
      allOccurrences.push(...occurrences)
    }
    totalFiles++
  }

  // 按 class 名稱分組
  const groupedByName = new Map<string, ErrorClassOccurrence[]>()
  for (const occ of allOccurrences) {
    const existing = groupedByName.get(occ.className) ?? []
    groupedByName.set(occ.className, [...existing, occ])
  }

  // 找出重複（同一 class 名稱出現在不同套件）
  const duplicateGroups: DuplicateGroup[] = []
  for (const [className, occurrences] of groupedByName) {
    // 取得不重複的套件目錄集合
    const uniquePackages = new Set(occurrences.map((o) => o.packageDir))
    if (uniquePackages.size > 1) {
      duplicateGroups.push({
        className,
        occurrences: occurrences.sort((a, b) => a.packageDir.localeCompare(b.packageDir)),
      })
    }
  }

  // 按重複數量降序排列
  duplicateGroups.sort((a, b) => b.occurrences.length - a.occurrences.length)

  // 統計每個套件的 error class 數量
  const classesByPackage = new Map<string, number>()
  for (const occ of allOccurrences) {
    const pkgShortName = occ.packageDir.replace('packages/', '')
    classesByPackage.set(pkgShortName, (classesByPackage.get(pkgShortName) ?? 0) + 1)
  }

  return {
    totalFiles,
    totalClasses: allOccurrences.length,
    duplicateGroups,
    classesByPackage,
  }
}

// ============================================================================
// 輸出格式化
// ============================================================================

function printHeader(): void {
  console.log()
  console.log(`${BOLD}${RED}🔴 Error Class Duplication Report${RESET}`)
  console.log(`${DIM}${'─'.repeat(42)}${RESET}`)
}

function printSuccess(stats: ScanStats): void {
  console.log(
    `${GREEN}✅ All error classes appear unique (${stats.totalClasses} total)${RESET}`,
  )
  printSummary(stats)
}

function printWarnings(stats: ScanStats): void {
  const _count = stats.duplicateGroups.length
  console.log(`${YELLOW}${BOLD}⚠️  Potentially duplicate error classes:${RESET}`)
  console.log()

  for (const group of stats.duplicateGroups) {
    // 列出各套件路徑（精簡顯示）
    const packageDirs = group.occurrences.map((o) => o.packageDir).join(', ')
    console.log(`  ${YELLOW}•${RESET} ${BOLD}${MAGENTA}${group.className}${RESET}:`)
    console.log(`    ${DIM}Packages: ${RESET}${BLUE}${packageDirs}${RESET}`)

    // 顯示每個出現位置與宣告
    for (const occ of group.occurrences) {
      console.log(
        `    ${DIM}├─${RESET} ${CYAN}${occ.filePath}${RESET}${DIM}:${occ.lineNumber}${RESET}`,
      )
      console.log(`       ${DIM}${occ.declaration}${RESET}`)
    }
    console.log()
  }

  console.log(
    `${DIM}Note: Cross-package error classes are intentional (domain-specific).${RESET}`,
  )
  console.log(
    `${DIM}Review duplicates to ensure they don't cause confusion or import conflicts.${RESET}`,
  )

  printSummary(stats)
}

function printSummary(stats: ScanStats): void {
  console.log()
  console.log(`${BOLD}Summary:${RESET}`)
  console.log(`  ${DIM}-${RESET} Total error classes found: ${BOLD}${stats.totalClasses}${RESET}`)
  console.log(
    `  ${DIM}-${RESET} Potential duplicates:      ${
      stats.duplicateGroups.length > 0
        ? `${YELLOW}${BOLD}${stats.duplicateGroups.length}${RESET}`
        : `${GREEN}${BOLD}0${RESET}`
    }`,
  )

  // 顯示 Error class 最多的前 6 個套件
  if (stats.classesByPackage.size > 0) {
    const topPackages = Array.from(stats.classesByPackage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    const topStr = topPackages.map(([name, count]) => `${name} (${count})`).join(', ')
    console.log(`  ${DIM}-${RESET} Packages with most errors: ${DIM}${topStr}${RESET}`)
  }
  console.log()
}

// ============================================================================
// 主程式
// ============================================================================

async function main(): Promise<void> {
  printHeader()

  const stats = scanErrorClasses()

  if (stats.duplicateGroups.length === 0) {
    printSuccess(stats)
    process.exit(0)
  } else {
    printWarnings(stats)
    // Error class 重複是警告而非錯誤（可能是刻意的領域特定設計）
    // 若要在 CI 中強制退出碼 1，請取消下一行的註解
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(`${RED}❌ 執行失敗：${RESET}`, error)
  process.exit(1)
})
