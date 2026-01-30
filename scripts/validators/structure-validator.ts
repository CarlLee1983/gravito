/**
 * 文檔驗證系統 - 結構驗證器
 *
 * 驗證文檔的 YAML frontmatter 和必要章節
 */

import type { ValidationError, ValidatorOptions } from './types'
import { extractCodeBlocks, extractFrontmatter, extractHeadings } from './utils'

// ============================================================================
// 設定
// ============================================================================

/**
 * 必要的 YAML frontmatter 欄位
 */
const REQUIRED_FRONTMATTER_FIELDS = ['title', 'version', 'status', 'tier', 'last_updated']

/**
 * 有效的 status 值
 */
const VALID_STATUS = ['Stable', 'Beta', 'Experimental']

/**
 * 有效的 tier 值
 */
const VALID_TIER = ['A', 'B', 'C']

/**
 * 必要章節（繁體中文）
 */
const REQUIRED_SECTIONS_ZH = ['快速開始', 'API 參考', '架構設計']

/**
 * 必要章節（英文）
 */
const REQUIRED_SECTIONS_EN = ['quick start', 'api reference', 'architecture design']

/**
 * 各 Tier 的最低程式碼範例數量要求
 */
const MIN_CODE_EXAMPLES = {
  A: 15,
  B: 5,
  C: 0,
}

// ============================================================================
// 驗證函數
// ============================================================================

/**
 * 驗證文檔結構
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @param options 驗證選項
 * @returns 驗證錯誤陣列
 */
export async function validateStructure(
  _file: string,
  content: string,
  options?: ValidatorOptions
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // 1. 驗證 YAML frontmatter
  errors.push(...validateFrontmatter(content))

  // 2. 驗證必要章節
  errors.push(...validateRequiredSections(content))

  // 3. 驗證程式碼範例數量
  errors.push(...validateCodeExamples(content, options))

  // 4. 驗證文檔長度
  errors.push(...validateDocumentLength(content))

  return errors
}

/**
 * 驗證 YAML frontmatter
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function validateFrontmatter(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const frontmatter = extractFrontmatter(content)

  // 檢查是否存在 frontmatter
  if (!frontmatter) {
    errors.push({
      type: 'structure',
      line: 1,
      message: '缺少 YAML frontmatter',
      severity: 'error',
    })
    return errors
  }

  // 檢查 frontmatter 是否為有效物件
  if (typeof frontmatter !== 'object' || frontmatter === null) {
    errors.push({
      type: 'structure',
      line: 1,
      message: 'YAML frontmatter 格式無效',
      severity: 'error',
    })
    return errors
  }

  // 檢查必要欄位
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!(field in frontmatter)) {
      errors.push({
        type: 'structure',
        line: 1,
        message: `缺少必要的 frontmatter 欄位: ${field}`,
        severity: 'error',
      })
    }
  }

  // 驗證欄位值
  if (frontmatter.status && !VALID_STATUS.includes(frontmatter.status)) {
    errors.push({
      type: 'structure',
      line: 1,
      message: `無效的 status 值: ${frontmatter.status}（應為 ${VALID_STATUS.join(', ')} 之一）`,
      severity: 'error',
    })
  }

  if (frontmatter.tier && !VALID_TIER.includes(frontmatter.tier)) {
    errors.push({
      type: 'structure',
      line: 1,
      message: `無效的 tier 值: ${frontmatter.tier}（應為 ${VALID_TIER.join(', ')} 之一）`,
      severity: 'error',
    })
  }

  // 驗證版本號格式（語義化版本）
  if (frontmatter.version && !isValidVersion(frontmatter.version)) {
    errors.push({
      type: 'structure',
      line: 1,
      message: `無效的版本號格式: ${frontmatter.version}（應符合語義化版本規範，如 1.0.0）`,
      severity: 'warning',
    })
  }

  // 驗證日期格式（YYYY-MM-DD）
  if (frontmatter.last_updated && !isValidDate(frontmatter.last_updated)) {
    errors.push({
      type: 'structure',
      line: 1,
      message: `無效的日期格式: ${frontmatter.last_updated}（應為 YYYY-MM-DD 格式）`,
      severity: 'warning',
    })
  }

  return errors
}

/**
 * 驗證必要章節
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function validateRequiredSections(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const headings = extractHeadings(content)
  const headingTexts = headings.map((h) => h.text.toLowerCase())

  // 檢查繁體中文或英文的必要章節
  for (let i = 0; i < REQUIRED_SECTIONS_ZH.length; i++) {
    const sectionZh = REQUIRED_SECTIONS_ZH[i]
    const sectionEn = REQUIRED_SECTIONS_EN[i]

    const foundZh = headingTexts.some((h) => h.includes(sectionZh.toLowerCase()))
    const foundEn = headingTexts.some((h) => h.includes(sectionEn))

    if (!foundZh && !foundEn) {
      errors.push({
        type: 'structure',
        message: `缺少必要章節: ${sectionZh} / ${sectionEn}`,
        severity: 'warning',
      })
    }
  }

  // 檢查標題層級結構
  if (headings.length > 0) {
    // 第一個標題應該是 H1
    if (headings[0].level !== 1) {
      errors.push({
        type: 'structure',
        line: headings[0].line,
        message: `文檔應以 H1 標題開始（目前為 H${headings[0].level}）`,
        severity: 'warning',
      })
    }

    // 檢查是否有多個 H1
    const h1Count = headings.filter((h) => h.level === 1).length
    if (h1Count > 1) {
      errors.push({
        type: 'structure',
        message: `文檔有多個 H1 標題（${h1Count} 個），建議只使用一個`,
        severity: 'warning',
      })
    }
  }

  return errors
}

/**
 * 驗證程式碼範例數量
 *
 * @param content Markdown 內容
 * @param options 驗證選項
 * @returns 驗證錯誤陣列
 */
function validateCodeExamples(content: string, options?: ValidatorOptions): ValidationError[] {
  const errors: ValidationError[] = []
  const frontmatter = extractFrontmatter(content)
  const codeBlocks = extractCodeBlocks(content)

  // 取得 tier 層級
  const tier = options?.tier || frontmatter?.tier || 'C'
  const minExamples = MIN_CODE_EXAMPLES[tier as keyof typeof MIN_CODE_EXAMPLES]

  // 檢查程式碼範例數量
  if (codeBlocks.length < minExamples) {
    const severity = tier === 'A' ? 'error' : 'warning'
    errors.push({
      type: 'structure',
      message: `程式碼範例數量不足: ${codeBlocks.length}/${minExamples}（Tier ${tier} 要求）`,
      severity,
    })
  }

  // 檢查是否有程式語言標記
  const blocksWithoutLanguage = codeBlocks.filter((b) => !b.language || b.language === 'text')
  if (blocksWithoutLanguage.length > 0) {
    errors.push({
      type: 'structure',
      message: `有 ${blocksWithoutLanguage.length} 個程式碼區塊未指定程式語言`,
      severity: 'warning',
    })
  }

  return errors
}

/**
 * 驗證文檔長度
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function validateDocumentLength(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  // 文檔過短
  if (lines.length < 50) {
    errors.push({
      type: 'structure',
      message: `文檔內容過少（${lines.length} 行），可能需要補充更多內容`,
      severity: 'warning',
    })
  }

  // 文檔過長
  if (lines.length > 2000) {
    errors.push({
      type: 'structure',
      message: `文檔內容過長（${lines.length} 行），建議拆分為多個文檔`,
      severity: 'warning',
    })
  }

  return errors
}

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 驗證版本號格式（語義化版本）
 *
 * @param version 版本號
 * @returns 是否有效
 */
function isValidVersion(version: string): boolean {
  // 語義化版本格式：主版本.次版本.修訂版本[-預發布版本][+建置資訊]
  const semverRegex = /^\d+\.\d+\.\d+(-[\da-z-]+(\.\d+)*)?(\+[\da-z-]+(\.\d+)*)?$/i
  return semverRegex.test(version)
}

/**
 * 驗證日期格式（YYYY-MM-DD）
 *
 * @param date 日期字串
 * @returns 是否有效
 */
function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return false
  }

  // 驗證日期是否真實存在
  const parsedDate = new Date(date)
  return !Number.isNaN(parsedDate.getTime())
}
