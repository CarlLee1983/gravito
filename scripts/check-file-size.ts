#!/usr/bin/env bun

/**
 * Gravito 檔案大小檢查工具
 *
 * 掃描 packages\/*\/src\/**\/*.ts 並回報超過 800 行的檔案
 * 用於 CI 強制執行程式碼垂直大小限制
 */

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { Glob } from 'bun'

// ============================================================================
// 常數設定
// ============================================================================

const ROOT_DIR = resolve(__dirname, '..')
const LINE_LIMIT = 800
const SCAN_PATTERN = 'packages/*/src/**/*.ts'

// ANSI 色彩碼
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const BLUE = '\x1b[34m'

// ============================================================================
// 型別定義
// ============================================================================

interface FileResult {
  relativePath: string
  lineCount: number
}

interface ScanStats {
  totalFiles: number
  oversizedFiles: FileResult[]
  maxFile: FileResult | null
}

// ============================================================================
// 核心函式
// ============================================================================

/**
 * 格式化數字，加入千位分隔符
 */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/**
 * 計算檔案行數
 */
function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8')
    // 計算換行符數量，最後一行若無換行也算一行
    const lines = content.split('\n')
    // 若最後一行是空字串（檔案以換行結尾），不計入
    return content.endsWith('\n') ? lines.length - 1 : lines.length
  } catch {
    return 0
  }
}

/**
 * 掃描所有 TypeScript 源檔案並統計行數
 */
function scanFiles(): ScanStats {
  const glob = new Glob(SCAN_PATTERN)
  const allPaths = Array.from(glob.scanSync({ cwd: ROOT_DIR }))

  const oversizedFiles: FileResult[] = []
  let totalFiles = 0
  let maxFile: FileResult | null = null

  for (const relativePath of allPaths) {
    // 排除測試相關目錄（若有誤匹配）
    if (relativePath.includes('/__tests__/') || relativePath.includes('/node_modules/')) {
      continue
    }

    const fullPath = resolve(ROOT_DIR, relativePath)
    const lineCount = countLines(fullPath)
    totalFiles++

    const result: FileResult = { relativePath, lineCount }

    if (lineCount > LINE_LIMIT) {
      oversizedFiles.push(result)
    }

    if (maxFile === null || lineCount > maxFile.lineCount) {
      maxFile = result
    }
  }

  // 按行數降序排列
  oversizedFiles.sort((a, b) => b.lineCount - a.lineCount)

  return { totalFiles, oversizedFiles, maxFile }
}

// ============================================================================
// 輸出格式化
// ============================================================================

function printHeader(): void {
  console.log()
  console.log(`${BOLD}${CYAN}📊 File Size Analysis${RESET}`)
  console.log(`${DIM}${'─'.repeat(40)}${RESET}`)
}

function printSuccess(stats: ScanStats): void {
  console.log(
    `${GREEN}✅ All files within limits (0 files > ${formatNumber(LINE_LIMIT)} lines)${RESET}`
  )
  printSummary(stats)
}

function printWarnings(stats: ScanStats): void {
  console.log(`${YELLOW}${BOLD}⚠️  Files exceeding ${formatNumber(LINE_LIMIT)} line limit:${RESET}`)
  console.log()

  for (const file of stats.oversizedFiles) {
    const filename = basename(file.relativePath)
    const lineStr = `${formatNumber(file.lineCount)} lines`
    const severity = file.lineCount > LINE_LIMIT * 2 ? RED : YELLOW
    console.log(
      `  ${severity}•${RESET} ${BLUE}${file.relativePath}${RESET}: ${severity}${BOLD}${lineStr}${RESET}`
    )
    // 顯示超出比例
    const overBy = file.lineCount - LINE_LIMIT
    const percent = Math.round((overBy / LINE_LIMIT) * 100)
    console.log(
      `    ${DIM}(${formatNumber(overBy)} lines over limit, ${filename}, +${percent}%)${RESET}`
    )
  }

  printSummary(stats)
}

function printSummary(stats: ScanStats): void {
  console.log()
  console.log(`${BOLD}Summary:${RESET}`)
  console.log(
    `  ${DIM}-${RESET} Total files scanned:  ${BOLD}${formatNumber(stats.totalFiles)}${RESET}`
  )
  console.log(
    `  ${DIM}-${RESET} Files > ${formatNumber(LINE_LIMIT)} lines: ${
      stats.oversizedFiles.length > 0
        ? `${YELLOW}${BOLD}${stats.oversizedFiles.length}${RESET}`
        : `${GREEN}${BOLD}0${RESET}`
    }`
  )

  if (stats.maxFile) {
    const maxFilename = basename(stats.maxFile.relativePath)
    console.log(
      `  ${DIM}-${RESET} Max file size:        ${BOLD}${formatNumber(stats.maxFile.lineCount)} lines${RESET} ${DIM}(${maxFilename})${RESET}`
    )
  }
  console.log()
}

// ============================================================================
// 主程式
// ============================================================================

async function main(): Promise<void> {
  printHeader()

  const stats = scanFiles()

  if (stats.oversizedFiles.length === 0) {
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
