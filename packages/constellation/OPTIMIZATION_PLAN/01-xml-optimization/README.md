# Phase 1: XML 構建器性能優化

> **依賴**: Phase 0（需要基準測試結果）  
> **優先級**: 🔴 高  
> **預估時間**: 2-3 天  
> **預期提升**: 20-40%（校正後，原估計 50-70%）

[← 返回總覽](../README.md)

---

## 目標

優化 `SitemapStream.toXML()` 方法的性能，從字串拼接改為 Array.join 或流式處理，提升大型 sitemap 的生成速度。

> ⚠️ **校正說明**: 現代 V8 引擎對字串拼接已有優化，預期提升從 50-70% 調整為 20-40%。實際效果需以 Phase 0 基準測試為準。

---

## 當前問題

**發現位置**: `src/core/SitemapStream.ts:31-60`

**問題分析**:
```typescript
toXML(): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="...">\n`
  
  for (const entry of this.entries) {
    xml += this.renderUrl(entry, baseUrl, pretty)  // ❌ 字串拼接
  }
  
  xml += `</urlset>`
  return xml
}
```

**性能問題**:
- 對於 50K entries，需要進行 50K+ 次字串拼接
- 每次 `+=` 操作可能觸發字串複製
- 內存使用：所有 entries 保存在 `this.entries[]` 中
- 對於 100K+ URLs，可能消耗數百 MB 記憶體

**預期影響**:
- 50K entries: ~500-1000ms
- 100K entries: ~2000-4000ms
- 內存峰值: 100-500MB（取決於 entry 大小）

---

## 優化方案

### 方案 A: 使用 Array.join()（推薦首選）

比字串拼接更高效，V8 引擎對 Array.join() 有特殊優化：

```typescript
toXML(): string {
  const parts: string[] = []
  
  // Header
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>\n`)
  parts.push(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`)
  
  // Add namespaces
  if (this.hasImages()) {
    parts.push(` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`)
  }
  // ... 其他 namespaces
  
  parts.push(`>\n`)
  
  // Entries
  for (const entry of this.entries) {
    parts.push(this.renderUrl(entry, baseUrl, pretty))
  }
  
  parts.push(`</urlset>`)
  
  return parts.join('')
}
```

**預期提升**: 30-50%

---

### 方案 B: 流式生成（推薦用於超大規模）

對於 100K+ entries，使用流式生成避免內存峰值：

```typescript
class SitemapStream {
  private options: SitemapStreamOptions
  private entries: SitemapEntry[] = []
  
  // 新增：流式生成方法
  *toXMLStream(): Generator<string, void, unknown> {
    yield `<?xml version="1.0" encoding="UTF-8"?>\n`
    yield `<urlset xmlns="...">\n`
    
    for (const entry of this.entries) {
      yield this.renderUrl(entry, this.options.baseUrl, this.options.pretty)
    }
    
    yield `</urlset>`
  }
  
  // 保留舊方法以向後相容
  toXML(): string {
    return Array.from(this.toXMLStream()).join('')
  }
  
  // 新增：直接寫入流
  async writeToStream(writer: WritableStream): Promise<void> {
    const encoder = new TextEncoder()
    for (const chunk of this.toXMLStream()) {
      await writer.write(encoder.encode(chunk))
    }
  }
}
```

**預期提升**: 50-70%（內存減少 60-80%）

---

### 方案 C: 使用 Buffer（極端場景，1M+ URLs）

僅在方案 A/B 都不足時考慮：

```typescript
toXML(): string {
  const chunks: Buffer[] = []
  const encoder = new TextEncoder()
  
  chunks.push(encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>\n`))
  chunks.push(encoder.encode(`<urlset xmlns="...">\n`))
  
  for (const entry of this.entries) {
    chunks.push(encoder.encode(this.renderUrl(entry, baseUrl, pretty)))
  }
  
  chunks.push(encoder.encode(`</urlset>`))
  
  return Buffer.concat(chunks).toString('utf-8')
}
```

---

## 實施步驟

1. **執行 Phase 0 基準測試**，確認 XML 構建是否為瓶頸
2. 如果需要優化，先實施方案 A（Array.join）
3. 重新測試，比較效果
4. 如果效果不明顯或需要處理超大規模，實施方案 B（流式生成）
5. 極端場景才考慮方案 C

---

## 額外優化：renderUrl() 方法

**當前問題**: `renderUrl()` 方法也使用字串拼接

**優化方案**:
```typescript
private renderUrl(entry: SitemapEntry, baseUrl: string, pretty?: boolean): string {
  const parts: string[] = []
  const indent = pretty ? '  ' : ''
  const subIndent = pretty ? '    ' : ''
  const nl = pretty ? '\n' : ''
  
  let loc = entry.url
  if (!loc.startsWith('http')) {
    if (!loc.startsWith('/')) loc = `/${loc}`
    loc = baseUrl + loc
  }
  
  parts.push(`${indent}<url>${nl}`)
  parts.push(`${subIndent}<loc>${this.escape(loc)}</loc>${nl}`)
  
  if (entry.lastmod) {
    const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod)
    parts.push(`${subIndent}<lastmod>${date.toISOString().split('T')[0]}</lastmod>${nl}`)
  }
  
  // ... 其他欄位
  
  parts.push(`${indent}</url>${nl}`)
  return parts.join('')
}
```

---

## 預期提升（校正後）

| 方案 | 50K entries | 100K entries | 內存減少 | 備註 |
|-----|------------|-------------|---------|------|
| 當前（字串拼接） | 500-1000ms | 2000-4000ms | - | 基準 |
| 方案 A (Array.join) | **400-800ms** | **1600-3200ms** | 0% | **推薦首選** |
| 方案 B (流式) | 350-700ms | 1400-2800ms | 60-80% | 超大規模使用 |
| 方案 C (Buffer) | 300-600ms | 1200-2400ms | 40-60% | 極端場景 |

> ⚠️ **說明**: V8 引擎對字串操作有多項優化，實際提升可能低於預期。建議以 Phase 0 基準測試結果為準後再決定是否實施方案 B/C。

---

## 驗證清單

- [ ] 基準測試顯示 XML 構建為瓶頸
- [ ] 實施方案 A（Array.join）
- [ ] 性能測試顯示預期提升
- [ ] 如果需要，實施方案 B（流式生成）
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過
- [ ] 文檔已更新

---

## 下一步

完成 Phase 1 後，繼續進行：
- [Phase 2: 生成器分片優化](../02-generator-optimization/README.md)
