# Phase 2: 生成器分片優化

> **依賴**: Phase 0（需要基準測試確認是否為瓶頸）  
> **優先級**: ⚪ **待評估**（原為 🔴 高）  
> **預估時間**: 1-2 天（如需實施）

[← 返回總覽](../README.md)

---

## ⚠️ 可行性評估校正

**原問題描述**:
> "每次 flushShard 都重新生成整個 XML"

**實際情況分析**:

```typescript
// src/core/SitemapGenerator.ts:56-82
const flushShard = async () => {
  isMultiFile = true
  const filename = `${baseName}-${shardIndex}.xml`
  const xml = currentStream.toXML()  // ← 這只是當前 shard 的 XML
  
  await this.options.storage.write(filename, xml)
  // ...
  currentStream = new SitemapStream(...)  // 創建新的空 stream
}
```

**校正結論**:
- ✅ 每個 shard 是**獨立的 stream**
- ✅ `toXML()` 只生成當前 shard 的 entries（最多 50K），不是整個 sitemap
- ✅ 當前設計是正確的分片模式
- ⚠️ **此階段可能不需要優化**

---

## 建議

1. **等待 Phase 0 基準測試結果**
2. 如果測試顯示分片過程是瓶頸，再實施優化
3. 如果測試顯示不是瓶頸，**跳過此階段**

---

## 當前設計說明（供參考）

**正確的理解**:
- `SitemapGenerator` 會在 entries 達到 `maxEntriesPerFile`（預設 50K）時觸發 `flushShard()`
- 每次 flush 只處理當前累積的 entries，然後創建新的空 stream
- 這是標準的分片處理模式，效率合理

---

## 如果需要優化的方案（備選）

### 方案：真正的流式分片生成

如果 Phase 0 測試顯示分片過程是瓶頸，可考慮使用流式生成，邊生成邊寫入：

```typescript
async run(): Promise<void> {
  // 使用流式生成器
  const streamGenerator = new SitemapStreamGenerator({
    baseUrl: this.options.baseUrl,
    pretty: this.options.pretty,
  })
  
  let shardIndex = 1
  let currentCount = 0
  let currentWriter: WritableStream | null = null
  
  const flushShard = async () => {
    if (currentWriter) {
      await currentWriter.close()
    }
    
    const filename = `${baseName}-${shardIndex}.xml`
    currentWriter = await this.createShardWriter(filename)
    
    // 寫入 header
    await this.writeHeader(currentWriter)
    
    shardIndex++
    currentCount = 0
  }
  
  // 流式處理 entries
  for (const provider of providers) {
    const entries = await provider.getEntries()
    
    for await (const entry of entries) {
      if (currentCount >= maxEntriesPerFile) {
        await this.writeFooter(currentWriter)
        await flushShard()
      }
      
      await this.writeEntry(currentWriter, entry)
      currentCount++
    }
  }
  
  // 寫入最後的 footer
  await this.writeFooter(currentWriter)
}
```

---

## 驗證清單

- [ ] **Phase 0 基準測試確認此階段為瓶頸**
- [ ] 如需優化：流式分片生成實現
- [ ] 性能測試顯示預期提升
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過

---

## 下一步

- 如果 Phase 0 確認需要優化：實施上述方案
- 如果 Phase 0 顯示不是瓶頸：**跳過此階段**，直接進行 [Phase 3: 增量生成優化](../03-incremental-optimization/README.md)
