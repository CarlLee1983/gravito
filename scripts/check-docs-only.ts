#!/usr/bin/env bun

/**
 * 檢查 PR 變更是否只涉及文檔
 *
 * 此腳本會：
 * 1. 取得 PR 的 git diff
 * 2. 檢查是否所有變更都在文檔相關路徑
 * 3. 如果是，輸出 0（true）；否則輸出 1（false）
 *
 * 使用方式：
 * bun run scripts/check-docs-only.ts [--base <ref>]
 *
 * 選項：
 * --base: 比較的基準 ref（默認 origin/main）
 *
 * 環境變數：
 * BASE_REF: 覆蓋 --base 參數
 *
 * 範例：
 * bun run scripts/check-docs-only.ts --base origin/main
 * # 輸出：0（只有文檔變更）或 1（有程式碼變更）
 *
 * 在 CI 中使用：
 * if bun run scripts/check-docs-only.ts; then
 *   echo "只有文檔變更，跳過 CI"
 * else
 *   echo "有程式碼變更，執行完整 CI"
 * fi
 */

import { parseArgs } from 'node:util'
import { $ } from 'bun'

const args = parseArgs({
  options: {
    base: { type: 'string', default: 'origin/main' },
  },
})

const BASE_REF = process.env.BASE_REF || args.values.base

/**
 * 文檔相關的路徑（正規表達式）
 */
const DOCS_ONLY_PATTERNS = [
  /^docs\//,
  /^[^/]*\.md$/,
  /^\.md\//,
  /^CONTRIBUTING\.md$/,
  /^WHITEPAPER.*\.md$/,
  /^README\.md$/,
  /^CHANGELOG\.md$/,
  /^\.github\/workflows\/docs-validation\.yml$/,
  /^\.github\/workflows\/security-scan\.yml$/,
]

/**
 * 檢查路徑是否為文檔相關
 */
function isDocOnlyPath(filePath: string): boolean {
  return DOCS_ONLY_PATTERNS.some((pattern) => pattern.test(filePath))
}

/**
 * 主函數
 */
async function main() {
  try {
    // 取得 git diff
    const { stdout, exitCode } = await $`git diff --name-only ${BASE_REF} HEAD`.quiet().nothrow()

    if (exitCode !== 0) {
      console.warn(`⚠️  git diff failed with exit code ${exitCode}. BASE_REF=${BASE_REF}`)
      // In case of git error, assume it's NOT docs-only to be safe
      process.exit(1)
    }

    const changedFiles = stdout.toString().trim().split('\n').filter(Boolean)

    if (changedFiles.length === 0) {
      // 沒有變更，視為文檔專用
      process.exit(0)
    }

    // 檢查所有變更的檔案
    const allDocsOnly = changedFiles.every((file) => isDocOnlyPath(file))

    if (allDocsOnly) {
      console.log('✅ 只有文檔變更，可以跳過 CI')
      process.exit(0)
    }

    // 列出非文檔檔案
    const codeChanges = changedFiles.filter((file) => !isDocOnlyPath(file))
    console.log('📝 檢測到程式碼變更：')
    for (const file of codeChanges) {
      console.log(`  - ${file}`)
    }

    process.exit(1)
  } catch (error) {
    console.error('❌ 錯誤：', error)
    process.exit(1)
  }
}

main()
