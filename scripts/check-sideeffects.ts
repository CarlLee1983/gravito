#!/usr/bin/env bun

/**
 * Gravito sideEffects 宣告檢查工具
 *
 * 掃描所有 package.json 並回報缺少 sideEffects 宣告的套件
 * sideEffects 是 tree-shaking 的關鍵欄位，應在所有可發布套件中明確宣告
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Glob } from 'bun'

// ============================================================================
// 常數設定
// ============================================================================

const ROOT_DIR = resolve(__dirname, '..')

// 掃描範圍：packages 和 satellites 目錄
const SCAN_PATTERNS = ['packages/*/package.json', 'satellites/*/package.json']

// ANSI 色彩碼
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const BLUE = '\x1b[34m'
const RED = '\x1b[31m'

// ============================================================================
// 型別定義
// ============================================================================

interface PackageJsonData {
  name?: string
  private?: boolean
  sideEffects?: boolean | string[]
  [key: string]: unknown
}

interface PackageResult {
  /** package.json 的相對路徑 */
  pkgJsonPath: string
  /** 套件目錄的相對路徑（不含 /package.json） */
  pkgDir: string
  /** 套件名稱 */
  name: string
  /** 是否為私有套件 */
  isPrivate: boolean
  /** 是否有 sideEffects 欄位 */
  hasSideEffects: boolean
  /** sideEffects 的值 */
  sideEffectsValue: boolean | string[] | undefined
}

interface ScanStats {
  total: number
  withSideEffects: number
  withoutSideEffects: PackageResult[]
  privatePackages: number
}

// ============================================================================
// 核心函式
// ============================================================================

/**
 * 解析 package.json 並回傳套件資訊
 */
function parsePackage(relativePath: string): PackageResult | null {
  const fullPath = resolve(ROOT_DIR, relativePath)

  try {
    const content = readFileSync(fullPath, 'utf-8')
    const pkg = JSON.parse(content) as PackageJsonData

    const pkgDir = dirname(relativePath)
    const name = pkg.name ?? pkgDir

    return {
      pkgJsonPath: relativePath,
      pkgDir,
      name,
      isPrivate: pkg.private === true,
      hasSideEffects: 'sideEffects' in pkg,
      sideEffectsValue: pkg.sideEffects,
    }
  } catch (error) {
    console.error(`${RED}❌ 無法讀取：${relativePath}${RESET}`, error)
    return null
  }
}

/**
 * 掃描所有 package.json 並統計 sideEffects 宣告狀況
 */
function scanPackages(): ScanStats {
  const allResults: PackageResult[] = []

  for (const pattern of SCAN_PATTERNS) {
    const glob = new Glob(pattern)
    const paths = Array.from(glob.scanSync({ cwd: ROOT_DIR }))

    for (const p of paths) {
      const result = parsePackage(p)
      if (result !== null) {
        allResults.push(result)
      }
    }
  }

  // 只檢查非私有套件（私有套件不發布，tree-shaking 較不重要）
  const publicPackages = allResults.filter((r) => !r.isPrivate)
  const withoutSideEffects = publicPackages.filter((r) => !r.hasSideEffects)

  // 按路徑排序
  withoutSideEffects.sort((a, b) => a.pkgDir.localeCompare(b.pkgDir))

  return {
    total: publicPackages.length,
    withSideEffects: publicPackages.length - withoutSideEffects.length,
    withoutSideEffects,
    privatePackages: allResults.length - publicPackages.length,
  }
}

// ============================================================================
// 輸出格式化
// ============================================================================

function _formatSideEffectsValue(value: boolean | string[] | undefined): string {
  if (value === false) {
    return `${DIM}false (tree-shakeable)${RESET}`
  }
  if (value === true) {
    return `${YELLOW}true (有副作用)${RESET}`
  }
  if (Array.isArray(value)) {
    return `${CYAN}[${value.join(', ')}]${RESET}`
  }
  return `${DIM}(未宣告)${RESET}`
}

function printHeader(): void {
  console.log()
  console.log(`${BOLD}${CYAN}🔍 Side Effects Declaration Check${RESET}`)
  console.log(`${DIM}${'─'.repeat(42)}${RESET}`)
}

function printSuccess(stats: ScanStats): void {
  console.log(
    `${GREEN}✅ All packages declare sideEffects properly (${stats.withSideEffects}/${stats.total})${RESET}`
  )
  printSummary(stats)
}

function printWarnings(stats: ScanStats): void {
  const count = stats.withoutSideEffects.length
  console.log(`${YELLOW}${BOLD}⚠️  Packages missing sideEffects declaration:${RESET}`)
  console.log()

  for (const pkg of stats.withoutSideEffects) {
    console.log(`  ${YELLOW}•${RESET} ${BLUE}${pkg.pkgDir}${RESET}`)
    console.log(`    ${DIM}name: ${pkg.name}${RESET}`)
  }

  console.log()
  console.log(`${DIM}Tip: Add one of the following to each package.json:${RESET}`)
  console.log(
    `  ${DIM}"sideEffects": false${RESET}  ${DIM}# Pure ESM, fully tree-shakeable${RESET}`
  )
  console.log(`  ${DIM}"sideEffects": true${RESET}   ${DIM}# Has global side effects${RESET}`)
  console.log(
    `  ${DIM}"sideEffects": ["*.css"]${RESET}  ${DIM}# Only specific files have side effects${RESET}`
  )
  console.log()
  console.log(
    `${DIM}Impact: ${count} package(s) may not be properly tree-shaken by bundlers${RESET}`
  )

  printSummary(stats)
}

function printSummary(stats: ScanStats): void {
  console.log()
  console.log(`${BOLD}Summary:${RESET}`)
  console.log(`  ${DIM}-${RESET} Total packages checked: ${BOLD}${stats.total}${RESET}`)
  console.log(
    `  ${DIM}-${RESET} With sideEffects:       ${GREEN}${BOLD}${stats.withSideEffects}${RESET}`
  )
  console.log(
    `  ${DIM}-${RESET} Without sideEffects:    ${
      stats.withoutSideEffects.length > 0
        ? `${YELLOW}${BOLD}${stats.withoutSideEffects.length}${RESET}`
        : `${GREEN}${BOLD}0${RESET}`
    }`
  )
  if (stats.privatePackages > 0) {
    console.log(`  ${DIM}-${RESET} Private (skipped):      ${DIM}${stats.privatePackages}${RESET}`)
  }
  console.log()
}

// ============================================================================
// 主程式
// ============================================================================

async function main(): Promise<void> {
  printHeader()

  const stats = scanPackages()

  if (stats.withoutSideEffects.length === 0) {
    printSuccess(stats)
    process.exit(0)
  } else {
    printWarnings(stats)
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(`${RED}❌ 執行失敗：${RESET}`, error)
  process.exit(1)
})
