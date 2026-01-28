#!/usr/bin/env bun

/**
 * Gravito 文檔驗證工具
 *
 * 自動驗證所有架構文檔的品質，包括：
 * - 程式碼語法正確性
 * - 連結有效性
 * - Mermaid 圖表語法
 * - 文檔結構完整性
 * - 模板符合度
 */

import { relative, resolve } from 'node:path'
import { Glob } from 'bun'
import type { ValidationResult } from './validators'
import {
  validateLinks,
  validateMermaid,
  validateStructure,
  validateSyntax,
  validateTemplate,
} from './validators'

// ============================================================================
// 設定
// ============================================================================

const ROOT_DIR = resolve(__dirname, '..')
const DOCS_DIR = resolve(ROOT_DIR, 'docs/architecture')
const DOCS_PATTERN = '*.md'

// 顏色輸出
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

// ============================================================================
// 主函數
// ============================================================================

/**
 * 驗證單一文檔
 *
 * @param filePath 文檔完整路徑
 * @returns 驗證結果
 */
async function validateDocument(filePath: string): Promise<ValidationResult> {
  const content = await Bun.file(filePath).text()

  // 並行執行所有驗證器
  const [syntaxErrors, linkErrors, mermaidErrors, structureErrors, templateErrors] =
    await Promise.all([
      validateSyntax(filePath, content),
      validateLinks(filePath, content, DOCS_DIR),
      validateMermaid(filePath, content),
      validateStructure(filePath, content),
      validateTemplate(filePath, content),
    ])

  // 合併所有錯誤
  const allErrors = [
    ...syntaxErrors,
    ...linkErrors,
    ...mermaidErrors,
    ...structureErrors,
    ...templateErrors,
  ]

  // 排序：error 在前，warning 在後
  allErrors.sort((a, b) => {
    if (a.severity === 'error' && b.severity === 'warning') {
      return -1
    }
    if (a.severity === 'warning' && b.severity === 'error') {
      return 1
    }
    return (a.line || 0) - (b.line || 0)
  })

  return {
    file: filePath,
    passed: !allErrors.some((e) => e.severity === 'error'),
    errors: allErrors,
  }
}

/**
 * 格式化檔案路徑（相對於專案根目錄）
 *
 * @param filePath 完整路徑
 * @returns 相對路徑
 */
function formatFilePath(filePath: string): string {
  return relative(ROOT_DIR, filePath)
}

/**
 * 輸出驗證結果
 *
 * @param result 驗證結果
 */
function printValidationResult(result: ValidationResult): void {
  const relPath = formatFilePath(result.file)
  const _errors = result.errors.filter((e) => e.severity === 'error')
  const warnings = result.errors.filter((e) => e.severity === 'warning')

  if (result.passed && warnings.length === 0) {
    console.log(`${COLORS.green}✓${COLORS.reset} ${COLORS.gray}${relPath}${COLORS.reset}`)
    return
  }

  // 輸出檔案名稱
  const statusIcon = result.passed
    ? `${COLORS.yellow}⚠${COLORS.reset}`
    : `${COLORS.red}✗${COLORS.reset}`
  console.log(`${statusIcon} ${relPath}`)

  // 輸出錯誤和警告
  for (const error of result.errors) {
    const prefix =
      error.severity === 'error'
        ? `  ${COLORS.red}🔴${COLORS.reset}`
        : `  ${COLORS.yellow}🟡${COLORS.reset}`
    const line = error.line ? `${COLORS.gray}:${error.line}${COLORS.reset}` : ''
    const type = `${COLORS.blue}[${error.type}${line}]${COLORS.reset}`
    console.log(`${prefix} ${type} ${error.message}`)
  }

  console.log() // 空行分隔
}

/**
 * 輸出驗證摘要
 *
 * @param results 所有驗證結果
 */
function printSummary(results: ValidationResult[]): void {
  const totalFiles = results.length
  const passedFiles = results.filter((r) => r.passed).length
  const failedFiles = totalFiles - passedFiles

  let totalErrors = 0
  let totalWarnings = 0

  for (const result of results) {
    totalErrors += result.errors.filter((e) => e.severity === 'error').length
    totalWarnings += result.errors.filter((e) => e.severity === 'warning').length
  }

  console.log('='.repeat(60))
  console.log('📊 驗證摘要')
  console.log('='.repeat(60))
  console.log(`總檔案數: ${totalFiles}`)
  console.log(`${COLORS.green}通過: ${passedFiles}${COLORS.reset}`)
  console.log(`${COLORS.red}失敗: ${failedFiles}${COLORS.reset}`)
  console.log(`${COLORS.red}錯誤: ${totalErrors}${COLORS.reset}`)
  console.log(`${COLORS.yellow}警告: ${totalWarnings}${COLORS.reset}`)
}

/**
 * 主程序
 */
async function main(): Promise<void> {
  console.log('🔍 開始驗證文檔...\n')

  // 掃描所有 Markdown 檔案
  const glob = new Glob(DOCS_PATTERN)
  const files = Array.from(glob.scanSync({ cwd: DOCS_DIR })).map((f) => resolve(DOCS_DIR, f))

  if (files.length === 0) {
    console.log(`${COLORS.yellow}⚠${COLORS.reset} 在 ${DOCS_DIR} 中找不到任何 Markdown 檔案`)
    process.exit(0)
  }

  console.log(`📄 找到 ${files.length} 個文檔檔案\n`)

  // 驗證所有檔案
  const results = await Promise.all(files.map(validateDocument))

  // 輸出結果
  for (const result of results) {
    printValidationResult(result)
  }

  // 輸出摘要
  printSummary(results)

  // 判斷是否有錯誤
  const hasErrors = results.some((r) => !r.passed)

  if (hasErrors) {
    console.log(`\n${COLORS.red}❌ 驗證失敗${COLORS.reset}`)
    process.exit(1)
  } else {
    console.log(`\n${COLORS.green}✅ 所有驗證通過${COLORS.reset}`)
    process.exit(0)
  }
}

// ============================================================================
// 執行
// ============================================================================

main().catch((error) => {
  console.error(`${COLORS.red}❌ 執行失敗:${COLORS.reset}`, error)
  process.exit(2)
})
