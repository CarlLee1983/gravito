# Phase 2: 生成器分片優化

> **依賴**: Phase 1（XML 構建優化）  
> **優先級**: 🔴 高  
> **預估時間**: 2-3 天

[← 返回總覽](../README.md)

---

## 目標

優化 `SitemapGenerator` 的分片邏輯，避免每次 flushShard 都重新生成整個 XML。

---

## 當前問題

**發現位置**: `src/core/SitemapGenerator.ts:56-82`

**問題分析**:
```typescript
const flushShard = async () => {
  isMultiFile = true
  const filename = `${baseName}-${shardIndex}.xml`
  const xml = currentStream.toXML()  // ❌ 每次重新生成整個 XML
  
  await this.options.storage.write(filename, xml)
  // ...
  currentStream = new SitemapStream(...)  // 創建新 stream
}
```

**性能問題**:
- 每次 flushShard 都調用 `toXML()`，重新生成整個 XML
- 對於 50K entries 的 shard，每次 flush 都要重新生成
- 內存使用：所有 entries 保存在 stream 中直到 flush

---

## 優化方案

### 方案：流式分片生成

使用流式生成，邊生成邊寫入，避免重新生成：

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

- [ ] 流式分片生成實現
- [ ] 性能測試顯示預期提升
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過

---

## 下一步

完成 Phase 2 後，繼續進行：
- [Phase 3: 增量生成優化](../03-incremental-optimization/README.md)
