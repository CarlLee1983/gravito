# Phase 6: 內存優化（低優先級）

> **總預估時間**: 1-2 天（可選）
> **優先級**: 🟢 低

[← 返回總覽](../README.md)

---


> **總預估時間**: 1-2 天（可選）  
> **優先級**: 🟢 低

### 6.1 優化大對象處理

**當前問題**:
- `SitemapEntry` 可能包含大量 images/videos 數據
- 在內存中保持大量條目可能導致高內存使用

**優化方案**（僅在需要時實施）:

**方案 A: 流式 XML 生成**
```typescript
// 用於 1M+ URLs 的場景
async *generateXmlStream(entries: AsyncIterable<SitemapEntry>): AsyncIterable<string> {
  yield this.xmlBuilder.start()
  
  for await (const entry of entries) {
    yield this.xmlBuilder.entry(entry)
  }
  
  yield this.xmlBuilder.end()
}
```

**方案 B: 分批處理**
```typescript
async generateLargeSitemap(
  entriesGenerator: () => AsyncIterable<SitemapEntry>,
  outputPath: string
): Promise<void> {
  const writeStream = createWriteStream(outputPath)
  
  writeStream.write(this.xmlBuilder.start())
  
  for await (const entry of entriesGenerator()) {
    writeStream.write(this.xmlBuilder.entry(entry))
  }
  
  writeStream.write(this.xmlBuilder.end())
  writeStream.end()
}
```

**實施條件**: 僅在處理 1M+ URLs 且出現 OOM 問題時實施

---

### 6.2 優化 Map/Set 使用

**當前狀態**: JavaScript 的 Map/Set 已經足夠高效，無需特別優化。

**備註**: 如果未來發現性能問題，可考慮：
- 使用 `Map.prototype.clear()` 而不是重新創建
- 批量操作時預估大小

---

