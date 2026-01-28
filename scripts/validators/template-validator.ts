/**
 * 文檔驗證系統 - 模板符合度驗證器
 *
 * 驗證文檔是否符合既定的模板結構
 */

import type { ValidationError } from './types'
import { extractHeadings } from './utils'

// ============================================================================
// 設定
// ============================================================================

/**
 * 標準模板章節順序（架構文檔）
 */
const TEMPLATE_SECTIONS = [
  '快速開始',
  '核心哲學',
  '安裝與配置',
  '核心概念',
  'API 參考',
  '架構設計',
  '進階用法',
  '整合指南',
  '效能優化',
  '故障排除',
  '遷移指南',
  '測試指南',
  '安全考量',
]

/**
 * 標準模板章節順序（英文版）
 */
const TEMPLATE_SECTIONS_EN = [
  'quick start',
  'core philosophy',
  'installation',
  'core concepts',
  'api reference',
  'architecture design',
  'advanced usage',
  'integration guide',
  'performance',
  'troubleshooting',
  'migration guide',
  'testing guide',
  'security',
]

// ============================================================================
// 驗證函數
// ============================================================================

/**
 * 驗證文檔的模板符合度
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
export async function validateTemplate(_file: string, content: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // 1. 檢查標題層級
  errors.push(...validateHeadingLevels(content))

  // 2. 檢查未替換的模板佔位符
  errors.push(...validatePlaceholders(content))

  // 3. 檢查章節順序（可選）
  // errors.push(...validateSectionOrder(content))

  return errors
}

/**
 * 驗證標題層級是否正確（不應該跳級）
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function validateHeadingLevels(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const headings = extractHeadings(content)

  let prevLevel = 0

  for (const heading of headings) {
    // 標題層級不應該跳躍（例如從 H1 直接跳到 H3）
    if (heading.level > prevLevel + 1 && prevLevel !== 0) {
      errors.push({
        type: 'template',
        line: heading.line,
        message: `標題層級跳躍: 從 H${prevLevel} 跳到 H${heading.level}（應使用 H${prevLevel + 1}）`,
        severity: 'warning',
      })
    }

    prevLevel = heading.level
  }

  return errors
}

/**
 * 檢查未替換的模板佔位符
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function validatePlaceholders(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  // 常見的佔位符模式
  const placeholderPatterns = [
    /\{\{\s*\w+\s*\}\}/, // {{ PLACEHOLDER }}
    /\[\[.*?\]\]/, // [[PLACEHOLDER]]
    /TODO:\s*\w+/i, // TODO: something
    /FIXME:\s*\w+/i, // FIXME: something
    /\[待補充\]/, // [待補充]
    /\[TBD\]/i, // [TBD]
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // 跳過程式碼區塊內的佔位符（可能是合法的程式碼）
    const isInCodeBlock = isLineInCodeBlock(content, lineNumber)
    if (isInCodeBlock) {
      continue
    }

    // 檢查每種佔位符模式
    for (const pattern of placeholderPatterns) {
      const match = line.match(pattern)
      if (match) {
        errors.push({
          type: 'template',
          line: lineNumber,
          message: `發現未替換的模板佔位符: "${match[0]}"`,
          severity: 'error',
        })
      }
    }
  }

  return errors
}

/**
 * 驗證章節順序（可選檢查）
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
function _validateSectionOrder(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const headings = extractHeadings(content)

  // 取得二級標題
  const h2Headings = headings.filter((h) => h.level === 2)
  const h2Texts = h2Headings.map((h) => h.text.toLowerCase())

  // 檢查章節順序是否與模板一致
  let templateIndex = 0

  for (let i = 0; i < h2Texts.length; i++) {
    const text = h2Texts[i]

    // 找到對應的模板章節
    while (templateIndex < TEMPLATE_SECTIONS.length) {
      const templateSection = TEMPLATE_SECTIONS[templateIndex].toLowerCase()
      const templateSectionEn = TEMPLATE_SECTIONS_EN[templateIndex]

      if (text.includes(templateSection) || text.includes(templateSectionEn)) {
        templateIndex++
        break
      }

      // 如果當前標題不匹配，但在後面的模板章節中找到了
      const laterIndex = TEMPLATE_SECTIONS.slice(templateIndex + 1).findIndex((s) =>
        text.includes(s.toLowerCase())
      )

      if (laterIndex !== -1) {
        errors.push({
          type: 'template',
          line: h2Headings[i].line,
          message: `章節順序不符合模板: "${h2Headings[i].text}" 應在 "${TEMPLATE_SECTIONS[templateIndex]}" 之後`,
          severity: 'warning',
        })
        templateIndex += laterIndex + 2
        break
      }

      templateIndex++
    }
  }

  return errors
}

/**
 * 檢查指定行是否在程式碼區塊內
 *
 * @param content Markdown 內容
 * @param targetLine 目標行號
 * @returns 是否在程式碼區塊內
 */
function isLineInCodeBlock(content: string, targetLine: number): boolean {
  const lines = content.split('\n')
  let inCodeBlock = false

  for (let i = 0; i < Math.min(targetLine, lines.length); i++) {
    const line = lines[i]

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
    }

    if (i + 1 === targetLine) {
      return inCodeBlock
    }
  }

  return false
}

/**
 * 檢查文檔格式一致性
 *
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
export function validateFormatConsistency(content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // 檢查列表項目格式一致性
    if (line.match(/^\s*[-*+]\s/)) {
      // 建議使用統一的列表符號（- 比 * 或 + 更常見）
      if (line.includes('*') || line.includes('+')) {
        errors.push({
          type: 'template',
          line: lineNumber,
          message: '建議使用統一的列表符號（使用 "-" 而非 "*" 或 "+"）',
          severity: 'warning',
        })
      }
    }

    // 檢查中英文之間是否有空格（中文排版規範）
    const mixedTextPattern = /[\u4e00-\u9fa5][a-zA-Z]|[a-zA-Z][\u4e00-\u9fa5]/
    if (mixedTextPattern.test(line) && !line.includes('`')) {
      // 跳過行內程式碼
      const hasProperSpacing = /[\u4e00-\u9fa5]\s[a-zA-Z]|[a-zA-Z]\s[\u4e00-\u9fa5]/.test(line)
      if (!hasProperSpacing) {
        errors.push({
          type: 'template',
          line: lineNumber,
          message: '建議在中英文之間加上空格以提升可讀性',
          severity: 'warning',
        })
      }
    }
  }

  return errors
}
