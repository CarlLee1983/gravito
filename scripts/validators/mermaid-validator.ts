/**
 * 文檔驗證系統 - Mermaid 圖表驗證器
 *
 * 驗證 Mermaid 圖表的基本語法結構
 */

import type { ValidationError } from './types'
import { extractMermaidBlocks } from './utils'

// ============================================================================
// 設定
// ============================================================================

/**
 * 支援的 Mermaid 圖表類型
 */
const MERMAID_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
  'requirementDiagram',
  'C4Context',
  'mindmap',
  'timeline',
]

/**
 * 圖表方向關鍵字
 */
const GRAPH_DIRECTIONS = ['TB', 'TD', 'BT', 'RL', 'LR']

// ============================================================================
// 驗證函數
// ============================================================================

/**
 * 驗證文檔中的 Mermaid 圖表語法
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
export async function validateMermaid(_file: string, content: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  const mermaidBlocks = extractMermaidBlocks(content)

  for (const block of mermaidBlocks) {
    const trimmed = block.content.trim()

    // 檢查是否為空
    if (!trimmed) {
      errors.push({
        type: 'mermaid',
        line: block.startLine,
        message: 'Mermaid 圖表區塊為空',
        severity: 'error',
      })
      continue
    }

    const lines = trimmed.split('\n')
    const firstLine = lines[0].trim()

    // 驗證圖表類型
    const typeError = validateDiagramType(firstLine, block.startLine)
    if (typeError) {
      errors.push(typeError)
      continue // 類型錯誤則跳過其他檢查
    }

    // 基本語法檢查
    errors.push(...validateMermaidSyntax(trimmed, block.startLine))
  }

  return errors
}

/**
 * 驗證圖表類型聲明
 *
 * @param firstLine 第一行內容
 * @param startLine 起始行號
 * @returns 驗證錯誤（若有）
 */
function validateDiagramType(firstLine: string, startLine: number): ValidationError | null {
  // 檢查是否以有效的圖表類型開頭
  const isValidType = MERMAID_TYPES.some((type) => {
    if (type === 'graph' || type === 'flowchart') {
      // graph 和 flowchart 需要包含方向
      const pattern = new RegExp(`^${type}\\s+(${GRAPH_DIRECTIONS.join('|')})`)
      return pattern.test(firstLine)
    }
    return firstLine.startsWith(type)
  })

  if (!isValidType) {
    return {
      type: 'mermaid',
      line: startLine + 1,
      message: `無效的 Mermaid 圖表類型: "${firstLine}"`,
      severity: 'error',
    }
  }

  return null
}

/**
 * 驗證 Mermaid 基本語法
 *
 * @param content 圖表內容
 * @param startLine 起始行號
 * @returns 驗證錯誤陣列
 */
function validateMermaidSyntax(content: string, startLine: number): ValidationError[] {
  const errors: ValidationError[] = []

  // 檢查括號配對
  const bracketPairs = [
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '{', close: '}' },
  ]

  for (const pair of bracketPairs) {
    const openCount = (content.match(new RegExp(`\\${pair.open}`, 'g')) || []).length
    const closeCount = (content.match(new RegExp(`\\${pair.close}`, 'g')) || []).length

    if (openCount !== closeCount) {
      errors.push({
        type: 'mermaid',
        line: startLine,
        message: `括號不匹配: ${pair.open}${pair.close} (開: ${openCount}, 閉: ${closeCount})`,
        severity: 'warning',
      })
    }
  }

  // 檢查常見的語法錯誤模式
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNumber = startLine + i + 1

    // 檢查箭頭語法（graph/flowchart）
    if (line.includes('--') || line.includes('-->') || line.includes('-.')) {
      // 箭頭前後應該有節點
      if (line.match(/^(-->|-\.|--)/)) {
        errors.push({
          type: 'mermaid',
          line: lineNumber,
          message: '箭頭前缺少來源節點',
          severity: 'warning',
        })
      }
      if (line.match(/(-->|-\.|--)\s*$/)) {
        errors.push({
          type: 'mermaid',
          line: lineNumber,
          message: '箭頭後缺少目標節點',
          severity: 'warning',
        })
      }
    }

    // 檢查未關閉的引號
    const singleQuotes = (line.match(/'/g) || []).length
    const doubleQuotes = (line.match(/"/g) || []).length

    if (singleQuotes % 2 !== 0) {
      errors.push({
        type: 'mermaid',
        line: lineNumber,
        message: '單引號未正確閉合',
        severity: 'warning',
      })
    }

    if (doubleQuotes % 2 !== 0) {
      errors.push({
        type: 'mermaid',
        line: lineNumber,
        message: '雙引號未正確閉合',
        severity: 'warning',
      })
    }
  }

  return errors
}

/**
 * 檢查 Mermaid 圖表是否過於複雜
 *
 * @param content 圖表內容
 * @param startLine 起始行號
 * @returns 驗證錯誤陣列
 */
export function checkMermaidComplexity(content: string, startLine: number): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  // 圖表行數過多可能導致渲染問題
  if (lines.length > 100) {
    errors.push({
      type: 'mermaid',
      line: startLine,
      message: `圖表過於複雜 (${lines.length} 行)，可能影響渲染效能`,
      severity: 'warning',
    })
  }

  // 節點數量過多
  const nodeCount = (content.match(/\[|\(|\{/g) || []).length
  if (nodeCount > 50) {
    errors.push({
      type: 'mermaid',
      line: startLine,
      message: `節點數量過多 (約 ${nodeCount} 個)，建議拆分圖表`,
      severity: 'warning',
    })
  }

  return errors
}
