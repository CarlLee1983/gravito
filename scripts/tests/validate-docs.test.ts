/**
 * 文檔驗證系統 - 單元測試
 *
 * 測試所有驗證器的功能
 */

import { describe, expect, it } from 'bun:test'
import {
  countLines,
  extractCodeBlocks,
  extractFrontmatter,
  extractHeadings,
  extractLinks,
  extractMermaidBlocks,
  isExternalLink,
  slugify,
  splitLinkPath,
  validateLinks,
  validateMermaid,
  validateStructure,
  validateSyntax,
  validateTemplate,
} from '../validators'

// ============================================================================
// 測試資料
// ============================================================================

const VALID_FRONTMATTER = `---
title: Test Document
version: 1.0.0
status: Stable
tier: A
last_updated: 2026-01-29
---

# Content`

const INVALID_FRONTMATTER = `---
title: Test Document
version: 1.0.0
---

# Content`

const NO_FRONTMATTER = `# Content

Just content without frontmatter.`

const VALID_TYPESCRIPT = `# Test

\`\`\`typescript
import { Test } from '@gravito/core'

const x: number = 1
const y = x + 2
\`\`\`
`

const INVALID_TYPESCRIPT = `# Test

\`\`\`typescript
import { unclosed
const x: number = 'string'
\`\`\`
`

const VALID_MERMAID = `# Test

\`\`\`mermaid
graph TB
    A[Start] --> B[End]
\`\`\`
`

const INVALID_MERMAID = `# Test

\`\`\`mermaid
invalid diagram type
\`\`\`
`

const MERMAID_UNMATCHED_BRACKETS = `# Test

\`\`\`mermaid
graph TB
    A[Start --> B(End
\`\`\`
`

// ============================================================================
// Utils 測試
// ============================================================================

describe('Utils', () => {
  describe('extractFrontmatter', () => {
    it('應該提取有效的 frontmatter', () => {
      const result = extractFrontmatter(VALID_FRONTMATTER)
      expect(result).toBeDefined()
      expect(result?.title).toBe('Test Document')
      expect(result?.version).toBe('1.0.0')
      expect(result?.status).toBe('Stable')
      expect(result?.tier).toBe('A')
    })

    it('缺少 frontmatter 應回傳 null', () => {
      const result = extractFrontmatter(NO_FRONTMATTER)
      expect(result).toBeNull()
    })

    it('無效的 YAML 應回傳 null', () => {
      const invalid = `---
invalid: yaml: content:
---`
      const result = extractFrontmatter(invalid)
      expect(result).toBeNull()
    })
  })

  describe('extractCodeBlocks', () => {
    it('應該提取程式碼區塊和語言', () => {
      const blocks = extractCodeBlocks(VALID_TYPESCRIPT)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].language).toBe('typescript')
      expect(blocks[0].code).toContain('import { Test }')
    })

    it('應該處理沒有語言標記的程式碼區塊', () => {
      const content = '```\ncode here\n```'
      const blocks = extractCodeBlocks(content)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].language).toBe('text')
    })

    it('應該正確記錄行號', () => {
      const blocks = extractCodeBlocks(VALID_TYPESCRIPT)
      expect(blocks[0].startLine).toBeGreaterThan(0)
      expect(blocks[0].endLine).toBeGreaterThan(blocks[0].startLine)
    })
  })

  describe('extractMermaidBlocks', () => {
    it('應該提取 Mermaid 圖表區塊', () => {
      const blocks = extractMermaidBlocks(VALID_MERMAID)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].content).toContain('graph TB')
    })

    it('應該正確記錄行號', () => {
      const blocks = extractMermaidBlocks(VALID_MERMAID)
      expect(blocks[0].startLine).toBeGreaterThan(0)
      expect(blocks[0].endLine).toBeGreaterThan(blocks[0].startLine)
    })
  })

  describe('extractHeadings', () => {
    it('應該提取所有標題層級', () => {
      const content = '# H1\n## H2\n### H3'
      const headings = extractHeadings(content)
      expect(headings).toHaveLength(3)
      expect(headings[0].level).toBe(1)
      expect(headings[1].level).toBe(2)
      expect(headings[2].level).toBe(3)
    })

    it('應該忽略程式碼區塊中的標題', () => {
      const content = '# Real Heading\n```\n# Not a heading\n```'
      const headings = extractHeadings(content)
      expect(headings).toHaveLength(1)
      expect(headings[0].text).toBe('Real Heading')
    })
  })

  describe('extractLinks', () => {
    it('應該提取 Markdown 連結', () => {
      const content = '[Link 1](https://example.com)\n[Link 2](./local.md)'
      const links = extractLinks(content)
      expect(links).toHaveLength(2)
      expect(links[0].href).toBe('https://example.com')
      expect(links[1].href).toBe('./local.md')
    })

    it('應該忽略程式碼區塊中的連結', () => {
      const content = '[Real Link](url)\n```\n[Not a link](url)\n```'
      const links = extractLinks(content)
      expect(links).toHaveLength(1)
    })
  })

  describe('slugify', () => {
    it('應該將英文標題轉為小寫並以連字號連接', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('API Reference')).toBe('api-reference')
    })

    it('應該保留中文字元', () => {
      expect(slugify('快速開始')).toBe('快速開始')
      expect(slugify('API 參考')).toBe('api-參考')
    })

    it('應該移除特殊符號', () => {
      expect(slugify('Hello, World!')).toBe('hello-world')
      expect(slugify('Test (Example)')).toBe('test-example')
    })
  })

  describe('isExternalLink', () => {
    it('應該識別外部連結', () => {
      expect(isExternalLink('https://example.com')).toBe(true)
      expect(isExternalLink('http://example.com')).toBe(true)
      expect(isExternalLink('//example.com')).toBe(true)
    })

    it('應該識別內部連結', () => {
      expect(isExternalLink('./local.md')).toBe(false)
      expect(isExternalLink('../parent/doc.md')).toBe(false)
      expect(isExternalLink('#anchor')).toBe(false)
    })
  })

  describe('splitLinkPath', () => {
    it('應該分離檔案路徑和錨點', () => {
      const [path, anchor] = splitLinkPath('./doc.md#section')
      expect(path).toBe('./doc.md')
      expect(anchor).toBe('section')
    })

    it('沒有錨點時應回傳 null', () => {
      const [path, anchor] = splitLinkPath('./doc.md')
      expect(path).toBe('./doc.md')
      expect(anchor).toBeNull()
    })
  })

  describe('countLines', () => {
    it('應該正確計算行數', () => {
      expect(countLines('line1\nline2\nline3')).toBe(3)
      expect(countLines('single line')).toBe(1)
      expect(countLines('')).toBe(1) // 空字串也算一行
    })
  })
})

// ============================================================================
// Validators 測試
// ============================================================================

describe('Validators', () => {
  describe('validateSyntax', () => {
    it('有效的 TypeScript 應該通過驗證', async () => {
      const errors = await validateSyntax('test.md', VALID_TYPESCRIPT)
      const syntaxErrors = errors.filter((e) => e.severity === 'error')
      expect(syntaxErrors).toHaveLength(0)
    })

    it('應該檢測語法錯誤', async () => {
      const errors = await validateSyntax('test.md', INVALID_TYPESCRIPT)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.type === 'syntax')).toBe(true)
    })

    it('應該忽略非 TypeScript/JavaScript 程式碼', async () => {
      const content = '```bash\necho "test"\n```'
      const errors = await validateSyntax('test.md', content)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateMermaid', () => {
    it('有效的 Mermaid 應該通過驗證', async () => {
      const errors = await validateMermaid('test.md', VALID_MERMAID)
      const mermaidErrors = errors.filter((e) => e.severity === 'error')
      expect(mermaidErrors).toHaveLength(0)
    })

    it('應該檢測無效的圖表類型', async () => {
      const errors = await validateMermaid('test.md', INVALID_MERMAID)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.message.includes('無效的 Mermaid 圖表類型'))).toBe(true)
    })

    it('應該檢測括號不匹配', async () => {
      const errors = await validateMermaid('test.md', MERMAID_UNMATCHED_BRACKETS)
      expect(errors.some((e) => e.message.includes('括號不匹配'))).toBe(true)
    })

    it('應該檢測空的 Mermaid 區塊', async () => {
      const content = '```mermaid\n\n```'
      const errors = await validateMermaid('test.md', content)
      expect(errors.some((e) => e.message.includes('為空'))).toBe(true)
    })
  })

  describe('validateStructure', () => {
    it('有效的結構應該通過驗證', async () => {
      // Tier A 需要至少 15 個程式碼範例
      const codeExamples = '```typescript\nconst x = 1\n```\n'.repeat(15)
      const content = `${VALID_FRONTMATTER}\n## 快速開始\n## API 參考\n## 架構設計\n${codeExamples}`
      const errors = await validateStructure('test.md', content)
      const structureErrors = errors.filter((e) => e.severity === 'error')
      expect(structureErrors).toHaveLength(0)
    })

    it('應該檢測缺少 frontmatter', async () => {
      const errors = await validateStructure('test.md', NO_FRONTMATTER)
      expect(errors.some((e) => e.message.includes('缺少 YAML frontmatter'))).toBe(true)
    })

    it('應該檢測缺少必要欄位', async () => {
      const errors = await validateStructure('test.md', INVALID_FRONTMATTER)
      expect(errors.some((e) => e.message.includes('缺少必要的 frontmatter 欄位'))).toBe(true)
    })

    it('應該檢測無效的 status 值', async () => {
      const content = `---
title: Test
version: 1.0.0
status: Invalid
tier: A
last_updated: 2026-01-29
---`
      const errors = await validateStructure('test.md', content)
      expect(errors.some((e) => e.message.includes('無效的 status 值'))).toBe(true)
    })

    it('應該檢測無效的版本號格式', async () => {
      const content = `---
title: Test
version: invalid.version
status: Stable
tier: A
last_updated: 2026-01-29
---`
      const errors = await validateStructure('test.md', content)
      expect(errors.some((e) => e.message.includes('無效的版本號格式'))).toBe(true)
    })

    it('應該檢測缺少必要章節', async () => {
      const content = `${VALID_FRONTMATTER}\n## 其他章節`
      const errors = await validateStructure('test.md', content)
      expect(errors.some((e) => e.message.includes('缺少必要章節'))).toBe(true)
    })

    it('應該檢測 Tier A 文檔的程式碼範例數量', async () => {
      const content = `${VALID_FRONTMATTER}\n\`\`\`ts\nconst x = 1\n\`\`\`` // 只有 1 個範例
      const errors = await validateStructure('test.md', content)
      expect(errors.some((e) => e.message.includes('程式碼範例數量不足'))).toBe(true)
    })
  })

  describe('validateTemplate', () => {
    it('應該檢測標題層級跳躍', async () => {
      const content = '# H1\n### H3'
      const errors = await validateTemplate('test.md', content)
      expect(errors.some((e) => e.message.includes('標題層級跳躍'))).toBe(true)
    })

    it('應該檢測未替換的佔位符', async () => {
      const content = '# Title\n\n{{ PLACEHOLDER }}\n\n[待補充]\n\nTODO: something'
      const errors = await validateTemplate('test.md', content)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.message.includes('未替換的模板佔位符'))).toBe(true)
    })

    it('應該忽略程式碼區塊中的佔位符', async () => {
      const content = '```typescript\nconst x = {{ value }}\n```'
      const errors = await validateTemplate('test.md', content)
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateLinks', () => {
    it('應該檢測無效的錨點連結', async () => {
      const content = '# Title\n\n[Link](#nonexistent)'
      const errors = await validateLinks('test.md', content, '/docs')
      expect(errors.some((e) => e.message.includes('無效的錨點連結'))).toBe(true)
    })

    it('應該通過有效的錨點連結', async () => {
      const content = '# Title\n\n[Link](#title)'
      const errors = await validateLinks('test.md', content, '/docs')
      expect(errors.filter((e) => e.type === 'link')).toHaveLength(0)
    })

    it('應該忽略外部連結', async () => {
      const content = '[External](https://example.com)'
      const errors = await validateLinks('test.md', content, '/docs')
      expect(errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// 整合測試
// ============================================================================

describe('Integration', () => {
  it('應該能處理完整的文檔', async () => {
    const completeDoc = `---
title: Complete Test Document
version: 1.0.0
status: Stable
tier: A
last_updated: 2026-01-29
---

# Complete Test Document

## 快速開始

\`\`\`typescript
import { Test } from '@gravito/core'

const app = new Test()
\`\`\`

## API 參考

[See Core](./core.md#api)

## 架構設計

\`\`\`mermaid
graph TB
    A[Start] --> B[End]
\`\`\`

${'```typescript\nconst x = 1\n```\n'.repeat(15)}
`

    const [syntaxErrors, mermaidErrors, structureErrors, templateErrors] = await Promise.all([
      validateSyntax('test.md', completeDoc),
      validateMermaid('test.md', completeDoc),
      validateStructure('test.md', completeDoc),
      validateTemplate('test.md', completeDoc),
    ])

    // 應該沒有 error 級別的問題
    const allErrors = [...syntaxErrors, ...mermaidErrors, ...structureErrors, ...templateErrors]
    const criticalErrors = allErrors.filter((e) => e.severity === 'error')

    expect(criticalErrors.length).toBe(0)
  })
})
