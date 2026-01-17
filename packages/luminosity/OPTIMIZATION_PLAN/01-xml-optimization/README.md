# Phase 1: XML 構建器性能優化

> **依賴**: Phase 0（需要基準測試結果）  
> **優先級**: 🟡 中（依測試結果決定）  
> **預估時間**: 1-2 天

[← 返回總覽](../README.md)

---

## 1.1 優化 XmlStreamBuilder 字串拼接

**⚠️ 重要說明**：現代 V8 引擎對字串 `+=` 操作已有很好的優化。此優化項目**應在 Phase 0 基準測試後決定是否實施**。

### 當前程式碼

`src/xml/XmlStreamBuilder.ts:32-128`:
```typescript
entry(item: SitemapEntry): string {
  let xml = `  <url>\n`
  xml += `    <loc>${loc}</loc>\n`
  // ... 大量字串拼接操作
  return xml
}
```

### 決策條件

- 如果 XML 構建階段耗時佔比 < 10%，**不實施**此優化
- 如果 XML 構建階段耗時佔比 > 20%，實施優化方案

### 優化方案 A: 使用模板字面量重構（推薦首選）

比 Array.join() 更可能有效，因為模板字面量在編譯時優化：

```typescript
entry(item: SitemapEntry): string {
  const loc = item.url.startsWith('http')
    ? item.url
    : `${this.options.baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`

  const escapedLoc = this.escapeXml(loc)
  
  // 基礎部分
  const lastmodPart = item.lastmod 
    ? `    <lastmod>${item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod}</lastmod>\n`
    : ''
  
  const changefreqPart = item.changefreq
    ? `    <changefreq>${item.changefreq}</changefreq>\n`
    : ''
  
  const priorityPart = item.priority !== undefined
    ? `    <priority>${item.priority.toFixed(1)}</priority>\n`
    : ''

  // alternates
  const alternatesPart = item.alternates?.length
    ? item.alternates.map(alt => 
        `    <xhtml:link rel="alternate" hreflang="${this.escapeXml(alt.lang)}" href="${this.escapeXml(alt.url)}" />\n`
      ).join('')
    : ''

  // images
  const imagesPart = item.images?.length
    ? item.images.map(img => this.buildImageXml(img)).join('')
    : ''

  // videos
  const videosPart = item.videos?.length
    ? item.videos.map(vid => this.buildVideoXml(vid)).join('')
    : ''

  return `  <url>
    <loc>${escapedLoc}</loc>
${lastmodPart}${changefreqPart}${priorityPart}${alternatesPart}${imagesPart}${videosPart}  </url>\n`
}

private buildImageXml(img: SitemapImage): string {
  const titlePart = img.title ? `      <image:title>${this.escapeXml(img.title)}</image:title>\n` : ''
  const captionPart = img.caption ? `      <image:caption>${this.escapeXml(img.caption)}</image:caption>\n` : ''
  const licensePart = img.license ? `      <image:license>${this.escapeXml(img.license)}</image:license>\n` : ''
  const geoPart = img.geo_location ? `      <image:geo_location>${this.escapeXml(img.geo_location)}</image:geo_location>\n` : ''
  
  return `    <image:image>
      <image:loc>${this.escapeXml(img.url)}</image:loc>
${titlePart}${captionPart}${licensePart}${geoPart}    </image:image>\n`
}

private buildVideoXml(vid: SitemapVideo): string {
  // 類似實現...
}
```

### 優化方案 B: 使用 Array.join()（備選）

如果方案 A 效果不明顯，測試 Array.join()：

```typescript
entry(item: SitemapEntry): string {
  const parts: string[] = ['  <url>\n']
  
  const loc = this.buildLoc(item.url)
  parts.push(`    <loc>${this.escapeXml(loc)}</loc>\n`)
  
  if (item.lastmod) {
    const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
    parts.push(`    <lastmod>${date}</lastmod>\n`)
  }
  
  // ... 其他欄位
  
  parts.push('  </url>\n')
  return parts.join('')
}
```

### 優化方案 C: 使用 Buffer（極端場景，1M+ URLs）

僅在方案 A/B 都不足時考慮：

```typescript
class XmlBufferBuilder {
  private chunks: Buffer[] = []
  private totalSize = 0
  
  entry(item: SitemapEntry): void {
    const xml = this.buildEntryString(item)
    const buf = Buffer.from(xml, 'utf-8')
    this.chunks.push(buf)
    this.totalSize += buf.length
  }
  
  build(): Buffer {
    return Buffer.concat(this.chunks, this.totalSize)
  }
}
```

### 實施步驟

1. **執行 Phase 0 基準測試**，確認 XML 構建是否為瓶頸
2. 如果需要優化，先實施方案 A（模板字面量）
3. 重新測試，比較效果
4. 如果效果不明顯，測試方案 B
5. 超大規模場景才考慮方案 C

### 預期提升

取決於基準測試結果，可能 0-60%

---

## 1.2 添加 XML 轉義（安全性修復）

> **依賴**: 無  
> **優先級**: 🔴 高（安全性問題，應優先實施）  
> **預估時間**: 0.5 天

### 當前問題

沒有 XML 轉義，存在 **XSS 和 XML 注入安全風險**

### 必須修復的位置

- `src/xml/XmlStreamBuilder.ts` - `entry()` 方法中所有用戶輸入
- `src/xml/SitemapIndexBuilder.ts` - `entry()` 方法

### 實現方案

```typescript
// src/xml/XmlStreamBuilder.ts

export class XmlStreamBuilder {
  // 靜態常量，避免每次調用創建
  private static readonly XML_ESCAPE_RE = /[&<>"']/g
  private static readonly XML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }

  /**
   * 轉義 XML 特殊字符
   * @param str 原始字串
   * @returns 轉義後的字串
   */
  private escapeXml(str: string): string {
    if (!str) return ''
    return str.replace(
      XmlStreamBuilder.XML_ESCAPE_RE, 
      (m) => XmlStreamBuilder.XML_ESCAPE_MAP[m]!
    )
  }

  /**
   * 轉義 URL（額外處理 URL 編碼）
   * @param url 原始 URL
   * @returns 安全的 URL
   */
  private escapeUrl(url: string): string {
    if (!url) return ''
    try {
      // 先解碼再編碼，確保一致性
      const decoded = decodeURIComponent(url)
      // URL 編碼後再 XML 轉義
      return this.escapeXml(encodeURI(decoded))
    } catch {
      // 如果解碼失敗，直接轉義
      return this.escapeXml(url)
    }
  }

  entry(item: SitemapEntry): string {
    // ✅ 所有用戶輸入都需要轉義
    const loc = item.url.startsWith('http')
      ? item.url
      : `${this.options.baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`

    let xml = `  <url>\n`
    xml += `    <loc>${this.escapeUrl(loc)}</loc>\n`

    if (item.lastmod) {
      const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
      xml += `    <lastmod>${this.escapeXml(date)}</lastmod>\n`
    }

    // ... 其他欄位同樣需要轉義

    // alternates
    if (item.alternates && item.alternates.length > 0) {
      for (const alt of item.alternates) {
        xml += `    <xhtml:link rel="alternate" hreflang="${this.escapeXml(alt.lang)}" href="${this.escapeUrl(alt.url)}" />\n`
      }
    }

    // Images - 標題、描述等都需要轉義
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        xml += `    <image:image>\n`
        xml += `      <image:loc>${this.escapeUrl(img.url)}</image:loc>\n`
        if (img.title) {
          xml += `      <image:title>${this.escapeXml(img.title)}</image:title>\n`
        }
        if (img.caption) {
          xml += `      <image:caption>${this.escapeXml(img.caption)}</image:caption>\n`
        }
        // ... 其他欄位
        xml += `    </image:image>\n`
      }
    }

    // Videos - 同樣需要轉義
    if (item.videos && item.videos.length > 0) {
      for (const vid of item.videos) {
        xml += `    <video:video>\n`
        xml += `      <video:thumbnail_loc>${this.escapeUrl(vid.thumbnail_loc)}</video:thumbnail_loc>\n`
        xml += `      <video:title>${this.escapeXml(vid.title)}</video:title>\n`
        xml += `      <video:description>${this.escapeXml(vid.description)}</video:description>\n`
        // ... 其他欄位
        xml += `    </video:video>\n`
      }
    }

    xml += `  </url>\n`
    return xml
  }
}
```

### 測試案例

```typescript
// tests/xml/escape.test.ts
import { describe, test, expect } from 'bun:test'
import { XmlStreamBuilder } from '../../src/xml/XmlStreamBuilder'

describe('XML Escape', () => {
  const builder = new XmlStreamBuilder({ baseUrl: 'https://example.com' })

  test('should escape special characters in URL', () => {
    const entry = { url: '/search?q=test&foo=bar' }
    const xml = builder.entry(entry)
    expect(xml).toContain('&amp;')
    expect(xml).not.toContain('?q=test&foo')
  })

  test('should escape XSS in title', () => {
    const entry = {
      url: '/page',
      images: [{ url: 'https://img.com/a.jpg', title: '<script>alert("xss")</script>' }]
    }
    const xml = builder.entry(entry)
    expect(xml).toContain('&lt;script&gt;')
    expect(xml).not.toContain('<script>')
  })

  test('should handle quotes in content', () => {
    const entry = {
      url: '/page',
      videos: [{
        thumbnail_loc: 'https://img.com/thumb.jpg',
        title: 'Test "video" title',
        description: "It's a test"
      }]
    }
    const xml = builder.entry(entry)
    expect(xml).toContain('&quot;video&quot;')
    expect(xml).toContain('&apos;s')
  })
})
```

### 驗證清單

- [ ] `XmlStreamBuilder.entry()` 所有用戶輸入已轉義
- [ ] `SitemapIndexBuilder.entry()` 所有用戶輸入已轉義
- [ ] 測試覆蓋 XSS、SQL 注入等攻擊向量
- [ ] 性能測試確認轉義開銷可接受（< 5%）

---

## 下一步

完成 Phase 1 後，繼續進行：
- [Phase 2.0: StorageAdapter 擴展](../02-storage-optimization/README.md#20-storageadapter-接口擴展前置項目)
