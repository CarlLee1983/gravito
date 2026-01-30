/**
 * 文檔驗證系統 - 連結驗證器
 *
 * 驗證 Markdown 文檔中的內部連結和錨點有效性
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { ValidationError } from './types'
import { extractHeadings, extractLinks, isExternalLink, slugify, splitLinkPath } from './utils'

// ============================================================================
// 驗證函數
// ============================================================================

/**
 * 驗證文檔中的連結有效性
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @param docsRoot 文檔根目錄
 * @returns 驗證錯誤陣列
 */
export async function validateLinks(
  file: string,
  content: string,
  _docsRoot: string
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  const links = extractLinks(content)
  const headings = extractHeadings(content)

  // 建立當前文檔的錨點索引
  const anchors = new Set(headings.map((h) => slugify(h.text)))

  for (const link of links) {
    // 跳過外部連結
    if (isExternalLink(link.href)) {
      continue
    }

    // 跳過郵件連結
    if (link.href.startsWith('mailto:')) {
      continue
    }

    // 分離檔案路徑和錨點
    const [filePath, anchor] = splitLinkPath(link.href)

    // 處理純錨點連結（同一文檔內）
    if (!filePath && anchor) {
      if (!anchors.has(anchor)) {
        errors.push({
          type: 'link',
          line: link.line,
          message: `無效的錨點連結: #${anchor}（找不到對應的標題）`,
          severity: 'error',
        })
      }
      continue
    }

    // 處理相對路徑連結
    if (filePath) {
      // 解析完整路徑
      const fullPath = resolve(dirname(file), filePath)

      // 檢查檔案是否存在
      if (!existsSync(fullPath)) {
        errors.push({
          type: 'link',
          line: link.line,
          message: `找不到連結目標檔案: ${filePath}`,
          severity: 'error',
        })
        continue
      }

      // 如果有錨點，驗證目標文檔中是否存在該錨點
      if (anchor) {
        try {
          const targetContent = await Bun.file(fullPath).text()
          const targetHeadings = extractHeadings(targetContent)
          const targetAnchors = new Set(targetHeadings.map((h) => slugify(h.text)))

          if (!targetAnchors.has(anchor)) {
            errors.push({
              type: 'link',
              line: link.line,
              message: `目標文檔中找不到錨點: ${filePath}#${anchor}`,
              severity: 'error',
            })
          }
        } catch (_error) {
          errors.push({
            type: 'link',
            line: link.line,
            message: `無法讀取目標文檔: ${filePath}`,
            severity: 'warning',
          })
        }
      }
    }
  }

  return errors
}

/**
 * 檢查文檔中是否有斷掉的圖片連結
 *
 * @param file 文檔檔案路徑
 * @param content Markdown 內容
 * @returns 驗證錯誤陣列
 */
export function validateImageLinks(file: string, content: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // 匹配 Markdown 圖片語法 ![alt](src)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let match: RegExpExecArray | null

    while ((match = imageRegex.exec(line)) !== null) {
      const src = match[2]

      // 跳過外部圖片連結
      if (isExternalLink(src)) {
        continue
      }

      // 檢查本地圖片檔案是否存在
      const fullPath = resolve(dirname(file), src)
      if (!existsSync(fullPath)) {
        errors.push({
          type: 'link',
          line: lineNumber,
          message: `找不到圖片檔案: ${src}`,
          severity: 'error',
        })
      }
    }
  }

  return errors
}
