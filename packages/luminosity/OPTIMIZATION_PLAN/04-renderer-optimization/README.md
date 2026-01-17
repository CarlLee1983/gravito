# Phase 4: 渲染器優化

> **總預估時間**: 1-2 天

[← 返回總覽](../README.md)

---


> **總預估時間**: 1-2 天

### 4.1 優化 SeoRenderer 索引生成

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1 天

**當前問題** (`src/engine/SeoRenderer.ts:55-104`):
```typescript
private renderIndex(currentUrl: string, totalPages: number, allEntries: SitemapEntry[]): string {
  // ...
  for (let i = 1; i <= totalPages; i++) {
    // 為每個分頁查找最新的 lastmod
    let lastMod: Date | string | undefined
    for (let j = start; j < Math.min(end, allEntries.length); j++) {
      const entry = allEntries[j]!
      // ... 遍歷查找最大 lastmod
    }
  }
}
```

**問題分析**:
- 雖然實際複雜度是 O(n)（每個條目只遍歷一次），但代碼結構不夠清晰
- 可以使用單次遍歷 + 預計算來優化

**完整優化實現**:

```typescript
// src/engine/SeoRenderer.ts
import type { SitemapEntry } from '../interfaces'
import type { SeoConfig } from '../types'
import { SitemapIndexBuilder } from '../xml/SitemapIndexBuilder'
import { XmlStreamBuilder } from '../xml/XmlStreamBuilder'

export class SeoRenderer {
  private static MAX_ENTRIES = 50000

  constructor(private config: SeoConfig) {}

  render(entries: SitemapEntry[], url: string, page?: number): string {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES

    // Case 1: Small sitemap
    if (entries.length <= maxEntries) {
      return this.renderSitemap(entries)
    }

    const totalPages = Math.ceil(entries.length / maxEntries)

    // Case 2: Specific page requested
    if (page && page > 0) {
      if (page > totalPages) {
        return this.renderSitemap([])
      }
      const start = (page - 1) * maxEntries
      const end = start + maxEntries
      return this.renderSitemap(entries.slice(start, end))
    }

    // Case 3: Render index
    return this.renderIndex(url, totalPages, entries, maxEntries)
  }

  private renderSitemap(entries: SitemapEntry[]): string {
    const builder = new XmlStreamBuilder({
      baseUrl: this.config.baseUrl,
      branding: this.config.branding?.enabled,
    })
    return builder.buildFull(entries)
  }

  /**
   * 優化的索引渲染
   * 使用單次遍歷預計算每個分頁的最新 lastmod
   */
  private renderIndex(
    currentUrl: string,
    totalPages: number,
    allEntries: SitemapEntry[],
    maxEntries: number
  ): string {
    const builder = new SitemapIndexBuilder({
      branding: this.config.branding?.enabled,
    })

    // 單次遍歷預計算每頁的 lastmod
    const pageLastMods = this.computePageLastMods(allEntries, maxEntries, totalPages)

    // 構建索引條目
    const indexEntries = []
    const separator = currentUrl.includes('?') ? '&' : '?'

    for (let i = 0; i < totalPages; i++) {
      indexEntries.push({
        url: `${currentUrl}${separator}page=${i + 1}`,
        lastmod: pageLastMods[i],
      })
    }

    return builder.buildFull(indexEntries)
  }

  /**
   * 單次遍歷計算每頁的最新 lastmod
   */
  private computePageLastMods(
    entries: SitemapEntry[],
    maxEntries: number,
    totalPages: number
  ): (Date | string | undefined)[] {
    const pageLastMods: (Date | string | undefined)[] = new Array(totalPages).fill(undefined)
    const pageLastModDates: (Date | undefined)[] = new Array(totalPages).fill(undefined)

    // 單次遍歷
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!
      if (!entry.lastmod) continue

      const pageIndex = Math.floor(i / maxEntries)
      const entryDate = entry.lastmod instanceof Date 
        ? entry.lastmod 
        : new Date(entry.lastmod)

      // 更新該頁的最新日期
      if (!pageLastModDates[pageIndex] || entryDate > pageLastModDates[pageIndex]!) {
        pageLastModDates[pageIndex] = entryDate
        pageLastMods[pageIndex] = entry.lastmod
      }
    }

    return pageLastMods
  }

  /**
   * 獲取渲染統計（用於調試）
   */
  getStats(entries: SitemapEntry[]): {
    totalEntries: number
    totalPages: number
    needsIndex: boolean
    estimatedSize: number
  } {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES
    const totalPages = Math.ceil(entries.length / maxEntries)
    const needsIndex = entries.length > maxEntries
    
    // 估算 XML 大小（每條目約 200 bytes）
    const estimatedSize = entries.length * 200

    return {
      totalEntries: entries.length,
      totalPages,
      needsIndex,
      estimatedSize,
    }
  }
}
```

**預期提升**:
- 代碼更清晰，維護性更好
- 對於大型 sitemap（100K+ 條目），性能略有提升

**測試**:

```typescript
// tests/engine/renderer-performance.test.ts
describe('SeoRenderer Performance', () => {
  test('should render large sitemap index efficiently', () => {
    const entries: SitemapEntry[] = Array.from({ length: 100000 }, (_, i) => ({
      url: `/page-${i}`,
      lastmod: new Date(Date.now() - i * 1000).toISOString(),
    }))

    const renderer = new SeoRenderer({
      mode: 'dynamic',
      baseUrl: 'https://example.com',
      resolvers: [],
    })

    const start = performance.now()
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')
    const duration = performance.now() - start

    console.log(`Rendered 100K entries index in ${duration.toFixed(2)}ms`)
    console.log(`XML size: ${(xml.length / 1024).toFixed(2)} KB`)

    expect(xml).toContain('sitemapindex')
    expect(duration).toBeLessThan(1000) // 應該在 1 秒內完成
  })
})
```

**驗證清單**:
- [ ] 單次遍歷優化
- [ ] `computePageLastMods` 實現
- [ ] `getStats` 調試方法
- [ ] 性能測試

---

