/**
 * 文檔驗證系統 - 工具函數
 *
 * 提供 Markdown 解析和通用工具函數
 */

import * as yaml from 'yaml'
import type { CodeBlock, DocumentFrontmatter, Heading, Link, MermaidBlock } from './types'

// ============================================================================
// YAML Frontmatter 解析
// ============================================================================

/**
 * 提取文檔的 YAML frontmatter
 *
 * @param content Markdown 內容
 * @returns Frontmatter 物件，若無則回傳 null
 */
export function extractFrontmatter(content: string): DocumentFrontmatter | null {
  // 匹配 YAML frontmatter（支援結尾沒有換行的情況）
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/m)
  if (!match) {
    return null
  }

  try {
    const frontmatter = yaml.parse(match[1])
    return frontmatter as DocumentFrontmatter
  } catch (_error) {
    // YAML 解析錯誤會在驗證階段由結構驗證器檢測
    return null
  }
}

// ============================================================================
// 程式碼區塊提取
// ============================================================================

/**
 * 提取 Markdown 中的所有程式碼區塊
 *
 * @param content Markdown 內容
 * @returns 程式碼區塊陣列
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const lines = content.split('\n')
  let currentBlock: Partial<CodeBlock> | null = null
  let currentLineNumber = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    currentLineNumber = i + 1

    // 開始程式碼區塊
    const startMatch = line.match(/^```(\w+)?/)
    if (startMatch && !currentBlock) {
      currentBlock = {
        language: startMatch[1] || 'text',
        code: '',
        startLine: currentLineNumber,
      }
      continue
    }

    // 結束程式碼區塊
    if (line.trim() === '```' && currentBlock) {
      blocks.push({
        language: currentBlock.language!,
        code: currentBlock.code!,
        startLine: currentBlock.startLine!,
        endLine: currentLineNumber,
      })
      currentBlock = null
      continue
    }

    // 收集程式碼內容
    if (currentBlock) {
      currentBlock.code += (currentBlock.code ? '\n' : '') + line
    }
  }

  return blocks
}

/**
 * 提取 Markdown 中的所有 Mermaid 圖表區塊
 *
 * @param content Markdown 內容
 * @returns Mermaid 圖表區塊陣列
 */
export function extractMermaidBlocks(content: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = []
  const lines = content.split('\n')
  let currentBlock: Partial<MermaidBlock> | null = null
  let currentLineNumber = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    currentLineNumber = i + 1

    // 開始 Mermaid 區塊
    if (line.trim() === '```mermaid' && !currentBlock) {
      currentBlock = {
        content: '',
        startLine: currentLineNumber,
      }
      continue
    }

    // 結束 Mermaid 區塊
    if (line.trim() === '```' && currentBlock) {
      blocks.push({
        content: currentBlock.content!,
        startLine: currentBlock.startLine!,
        endLine: currentLineNumber,
      })
      currentBlock = null
      continue
    }

    // 收集圖表內容
    if (currentBlock) {
      currentBlock.content += (currentBlock.content ? '\n' : '') + line
    }
  }

  return blocks
}

// ============================================================================
// Markdown 元素提取
// ============================================================================

/**
 * 提取 Markdown 中的所有標題
 *
 * @param content Markdown 內容
 * @returns 標題陣列
 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // 追蹤程式碼區塊（標題在程式碼區塊內不算）
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      continue
    }

    // 匹配 ATX 風格標題（# ## ### 等）
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: lineNumber,
      })
    }
  }

  return headings
}

/**
 * 提取 Markdown 中的所有連結
 *
 * @param content Markdown 內容
 * @returns 連結陣列
 */
export function extractLinks(content: string): Link[] {
  const links: Link[] = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // 追蹤程式碼區塊（連結在程式碼區塊內不算）
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      continue
    }

    // 匹配 Markdown 連結 [text](href)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(line)) !== null) {
      links.push({
        text: match[1],
        href: match[2],
        line: lineNumber,
      })
    }
  }

  return links
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 將標題文字轉換為錨點 ID（slug）
 *
 * @param text 標題文字
 * @returns 錨點 ID
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留英文、中文、空格和連字號
    .replace(/[\s_]+/g, '-') // 將空格和底線轉為連字號
    .replace(/^-+|-+$/g, '') // 移除開頭和結尾的連字號
}

/**
 * 檢查檔案是否存在
 *
 * @param filePath 檔案路徑
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    return Bun.file(filePath).size !== undefined
  } catch {
    return false
  }
}

/**
 * 計算文字行數
 *
 * @param text 文字內容
 * @returns 行數
 */
export function countLines(text: string): number {
  return text.split('\n').length
}

/**
 * 判斷是否為外部連結
 *
 * @param href 連結 URL
 * @returns 是否為外部連結
 */
export function isExternalLink(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')
}

/**
 * 從連結中分離路徑和錨點
 *
 * @param href 連結 URL
 * @returns [檔案路徑, 錨點]
 */
export function splitLinkPath(href: string): [string, string | null] {
  const parts = href.split('#')
  return [parts[0], parts[1] || null]
}
