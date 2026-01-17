# Phase 3: 增量生成優化

> **依賴**: Phase 2（生成器分片優化）  
> **優先級**: 🔴 高  
> **預估時間**: 3-4 天

[← 返回總覽](../README.md)

---

## 目標

實現真正的增量 sitemap 生成，只更新變更的部分，而不是重新生成整個 sitemap。

---

## 當前問題

**發現位置**: `src/core/IncrementalGenerator.ts:115-129`

**關鍵問題**:
```typescript
private async generateDiff(_diff: {
  added: SitemapEntry[]
  updated: SitemapEntry[]
  removed: string[]
}): Promise<void> {
  // ❌ 這裡需要實作增量更新邏輯
  // 簡化實作：重新生成整個 sitemap（實際應用中應該只更新變更的部分）
  
  // 暫時使用完整生成
  await this.generator.run()  // ❌ 偽增量！
}
```

**問題分析**:
- `generateDiff()` 方法實際上重新生成整個 sitemap
- 沒有利用 `diff` 參數中的變更信息
- 對於大型 sitemap（100K+ URLs），即使只有 100 個變更，也要重新生成全部
- `loadBaseEntries()` 從 providers 重新獲取所有 entries，沒有快取

**性能影響**:
- 100K URLs，100 個變更：需要重新生成 100K entries（應該只生成 100 個）
- 預期提升：70-90%（對於小變更場景）

---

## 優化方案

### 3.1 實現真正的增量更新

**核心思路**:
1. 從現有 sitemap 文件讀取基礎狀態（而不是從 providers）
2. 只更新變更的 shard 文件
3. 更新 sitemap index

**實現方案**:

```typescript
// src/core/IncrementalGenerator.ts

private async generateDiff(diff: {
  added: SitemapEntry[]
  updated: SitemapEntry[]
  removed: string[]
}): Promise<void> {
  const { added, updated, removed } = diff
  
  if (added.length === 0 && updated.length === 0 && removed.length === 0) {
    return // 沒有變更
  }
  
  // 1. 讀取現有 sitemap index
  const index = await this.loadSitemapIndex()
  
  // 2. 找出需要更新的 shard
  const affectedShards = this.findAffectedShards(index, [...added, ...updated, ...removed])
  
  // 3. 對於每個受影響的 shard，讀取、更新、寫回
  for (const shardInfo of affectedShards) {
    await this.updateShard(shardInfo, { added, updated, removed })
  }
  
  // 4. 如果有新增的 entries，可能需要創建新的 shard
  const newEntries = added.filter(e => !this.isInExistingShard(e, index))
  if (newEntries.length > 0) {
    await this.createNewShard(newEntries)
  }
  
  // 5. 更新 sitemap index
  await this.updateSitemapIndex(index)
}

private async loadSitemapIndex(): Promise<SitemapIndex> {
  // 從存儲讀取現有的 sitemap index
  const indexContent = await this.options.storage.read(this.options.filename!)
  if (!indexContent) {
    // 如果沒有 index，說明是單文件模式
    return null
  }
  
  // 解析 XML index
  return this.parseSitemapIndex(indexContent)
}

private findAffectedShards(
  index: SitemapIndex | null,
  urls: (SitemapEntry | string)[]
): ShardInfo[] {
  // 根據 URL 找出它們所在的 shard
  // 簡化實現：假設我們有 URL 到 shard 的映射
  const shardMap = new Map<string, ShardInfo>()
  
  for (const url of urls) {
    const urlStr = typeof url === 'string' ? url : url.url
    const shard = this.findShardForUrl(urlStr, index)
    if (shard) {
      shardMap.set(shard.filename, shard)
    }
  }
  
  return Array.from(shardMap.values())
}

private async updateShard(
  shardInfo: ShardInfo,
  diff: { added: SitemapEntry[]; updated: SitemapEntry[]; removed: string[] }
): Promise<void> {
  // 1. 讀取現有 shard
  const shardContent = await this.options.storage.read(shardInfo.filename)
  const entries = this.parseSitemapEntries(shardContent)
  
  // 2. 應用變更
  const updatedEntries = this.applyDiffToEntries(entries, diff, shardInfo)
  
  // 3. 重新生成 shard XML
  const stream = new SitemapStream({
    baseUrl: this.options.baseUrl,
    pretty: this.options.pretty,
  })
  stream.addAll(updatedEntries)
  const xml = stream.toXML()
  
  // 4. 寫回（使用 shadow processor 如果啟用）
  if (this.shadowProcessor) {
    await this.shadowProcessor.addOperation({
      filename: shardInfo.filename,
      content: xml,
    })
  } else {
    await this.options.storage.write(shardInfo.filename, xml)
  }
}

private applyDiffToEntries(
  entries: SitemapEntry[],
  diff: { added: SitemapEntry[]; updated: SitemapEntry[]; removed: string[] },
  shardInfo: ShardInfo
): SitemapEntry[] {
  const entryMap = new Map<string, SitemapEntry>()
  
  // 建立現有 entries 的映射
  for (const entry of entries) {
    entryMap.set(entry.url, entry)
  }
  
  // 應用變更
  for (const added of diff.added) {
    if (this.isInShard(added.url, shardInfo)) {
      entryMap.set(added.url, added)
    }
  }
  
  for (const updated of diff.updated) {
    if (this.isInShard(updated.url, shardInfo)) {
      entryMap.set(updated.url, updated)
    }
  }
  
  for (const removed of diff.removed) {
    if (this.isInShard(removed, shardInfo)) {
      entryMap.delete(removed)
    }
  }
  
  return Array.from(entryMap.values()).sort((a, b) => a.url.localeCompare(b.url))
}
```

---

### 3.2 優化 loadBaseEntries()

**當前問題**: 從 providers 重新獲取所有 entries

**優化方案**: 從現有 sitemap 文件讀取

```typescript
private async loadBaseEntries(): Promise<SitemapEntry[]> {
  // 1. 嘗試從存儲讀取現有 sitemap
  const indexContent = await this.options.storage.read(this.options.filename!)
  
  if (indexContent) {
    // 2. 解析 index，讀取所有 shard
    const index = this.parseSitemapIndex(indexContent)
    const allEntries: SitemapEntry[] = []
    
    for (const shardUrl of index.shardUrls) {
      const shardFilename = this.extractFilenameFromUrl(shardUrl)
      const shardContent = await this.options.storage.read(shardFilename)
      const entries = this.parseSitemapEntries(shardContent)
      allEntries.push(...entries)
    }
    
    return allEntries
  }
  
  // 3. 如果沒有現有 sitemap，從 providers 獲取（首次生成）
  return this.loadFromProviders()
}
```

---

### 3.3 實現 Sitemap 解析器

需要實現 XML 解析功能：

```typescript
// src/core/SitemapParser.ts

export class SitemapParser {
  parseSitemapIndex(xml: string): SitemapIndex {
    // 使用 XML 解析器（例如 fast-xml-parser 或內建解析）
    // 提取所有 <sitemap> 標籤
  }
  
  parseSitemapEntries(xml: string): SitemapEntry[] {
    // 解析 <urlset> 中的所有 <url> 標籤
    // 轉換為 SitemapEntry[]
  }
}
```

---

## 實施步驟

1. **實現 SitemapParser** - 用於解析現有 sitemap 文件
2. **實現 loadBaseEntries() 優化** - 從文件讀取而不是 providers
3. **實現真正的 generateDiff()** - 只更新變更的 shard
4. **實現 shard 管理邏輯** - 找出受影響的 shard、更新、創建新 shard
5. **測試增量更新** - 驗證只更新變更的部分
6. **性能測試** - 確認預期提升

---

## 預期提升

| 場景 | 當前（偽增量） | 優化後（真增量） | 提升 |
|-----|--------------|----------------|------|
| 100K URLs, 100 變更 | 重新生成 100K | 只更新 100 | 99.9% |
| 100K URLs, 1K 變更 | 重新生成 100K | 只更新 1K | 99% |
| 100K URLs, 10K 變更 | 重新生成 100K | 只更新 10K | 90% |

**預期整體提升**: 70-90%（對於小變更場景）

---

## 風險與緩解

**風險**:
- 解析現有 sitemap 可能出錯
- shard 管理邏輯複雜
- 需要處理各種邊緣情況

**緩解措施**:
- 保留完整生成作為 fallback
- 完整的錯誤處理和日誌
- 詳細的測試覆蓋

---

## 驗證清單

- [ ] SitemapParser 實現完成
- [ ] loadBaseEntries() 從文件讀取
- [ ] generateDiff() 實現真正的增量更新
- [ ] shard 管理邏輯完成
- [ ] 測試：小變更場景性能提升
- [ ] 測試：大變更場景仍正常工作
- [ ] 測試：邊緣情況（空變更、全部變更等）
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過
- [ ] 文檔已更新

---

## 下一步

完成 Phase 3 後，繼續進行：
- [Phase 4: 存儲層優化](../04-storage-optimization/README.md)
- [Phase 5: 變更追蹤優化](../05-tracker-optimization/README.md)
