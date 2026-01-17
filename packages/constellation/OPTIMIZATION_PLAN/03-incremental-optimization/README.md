# Phase 3: 增量生成優化

> **依賴**: Phase 1（XML 構建優化）、Phase 5（變更追蹤優化）  
> **優先級**: 🔴 **核心優化項目**  
> **預估時間**: **5-7 天**（校正後，原估計 3-4 天）  
> **風險等級**: 🔴 高

[← 返回總覽](../README.md)

---

## 目標

實現真正的增量 sitemap 生成，只更新變更的部分，而不是重新生成整個 sitemap。

> ⚠️ **校正說明**: 此階段是整個優化計劃的核心，複雜度被低估。需要實現 SitemapParser、URL-Shard 映射等基礎設施。

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

## 前置決策（必做）

在開始實作前，需先定義以下規格，避免增量流程不穩定：

1. **分片規則**：URL 排序規則、分片鍵、最大 entries 設定（固定且可重現）
2. **Shard Manifest**：URL→Shard 的映射持久化格式與存放位置
3. **XML 解析/回寫策略**：標準化輸出或保留原格式（擇一）
4. **全量回退條件**：變更比例或受影響 shard 比例的切換閾值
5. **一致性/鎖定策略**：多流程寫入時的序列化機制

> **來源**：閾值請以 `bench/BASELINE.md` 的「決策輸出」為準

---

## 分片規則與 Manifest（新增）

**建議做法**：建立 shard manifest，確保增量更新可快速定位 shard，避免反推失準。

> 詳細規格請參考附錄：[Shard Manifest 規格](../appendices/shard-manifest-spec.md)

**Manifest 範例**：
```json
{
  "version": 1,
  "maxEntriesPerShard": 50000,
  "sort": "url-lex",
  "shards": [
    { "filename": "sitemap-1.xml", "from": "/a", "to": "/m", "count": 48210 },
    { "filename": "sitemap-2.xml", "from": "/n", "to": "/z", "count": 49602 }
  ]
}
```

**關鍵要求**：
- 分片規則必須可重現（排序、分段策略固定）
- Manifest 需與 sitemap index 同步更新
- 單檔模式（無 index）也要有簡化 manifest

---

## XML 解析與回寫策略（新增）

**建議**：採用「標準化輸出」策略，統一欄位順序與格式，以降低解析複雜度與維護成本。

**注意事項**：
- 若需保留原格式（例如縮排/空白），解析器需保留結構資訊，成本較高
- 無論採用哪種策略，需在測試中驗證「增量結果與全量結果等價」

> 詳細規格請參考附錄：[XML 解析/回寫策略](../appendices/xml-parsing-writeback-strategy.md)

### 標準化輸出細則（新增）

1. **欄位順序固定**：loc → lastmod → changefreq → priority → alternates → images → videos → news
2. **日期格式固定**：`YYYY-MM-DD`（與現有 `toXML()` 一致）
3. **空白與縮排**：由 `pretty` 決定，避免保留原檔空白
4. **URL 正規化**：保持與現有 `escape()` 與 baseUrl 拼接規則一致

### 保留原格式（可選）

若業務需求要求保留原輸出：

- Parser 需保留 XML node 順序與空白
- 只替換必要節點（loc/lastmod 等）
- 解析與回寫成本顯著提高，需列入風險評估

---

## 一致性與鎖定策略（新增）

**最低要求**：
- 同一 sitemap 只允許單一增量流程寫入
- 更新 shard → 更新 sitemap index → 更新 manifest 必須序列化

**建議實作**：
- ShadowProcessor 內部加鎖（或上層加 Mutex）
- 使用「先寫 shard，再更新 index/manifest」的原子順序
- 失敗時回退全量重建或保留原版本

> 詳細方案請參考附錄：[一致性與鎖定方案](../appendices/consistency-locking-strategy.md)

### 實作方案（新增）

**方案 A：本地鎖（同一進程）**

- 以 `Mutex` 或 `Promise` 鎖住增量流程
- 適用於單一 worker/單一進程

**方案 B：分散式鎖（多進程/多機）**

- 以 storage 支援的 lock 機制（例如 S3 object lock、Redis、DB lock）
- 需設定鎖逾時與續租策略

**最小落地**：
- 先實作方案 A
- 若 Phase 0 顯示有並發需求，再擴充方案 B

---

## 子任務分解（新增）

| 子任務 | 預估時間 | 依賴 | 風險 |
|-------|---------|------|------|
| 3.0 定義分片規則與 Manifest | 0.5 天 | Phase 0 | 低 |
| 3.1 實現 SitemapParser | 1-2 天 | 3.0 | 中 |
| 3.2 實現 URL-Shard 映射 | 1 天 | 3.1 | 低 |
| 3.3 實現 loadBaseEntries() 從文件讀取 | 0.5-1 天 | 3.1, 3.2 | 低 |
| 3.4 實現真正的 generateDiff() | 1-2 天 | 3.3 | 高 |
| 3.5 實現 shard 更新邏輯 | 1 天 | 3.4 | 中 |
| 3.6 一致性/鎖定機制 | 0.5 天 | 3.4, 3.5 | 中 |
| 3.7 測試與邊緣情況處理 | 1 天 | 3.6 | 中 |

> **注意**: Phase 4（存儲優化）的流式讀取功能會併入此階段作為 3.1 的一部分

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

1. **定義分片規則與 Manifest** - 固定排序/分片策略與持久化格式
2. **實現 SitemapParser** - 用於解析現有 sitemap 文件
3. **實現 loadBaseEntries() 優化** - 從文件讀取而不是 providers
4. **實現真正的 generateDiff()** - 只更新變更的 shard
5. **實現 shard 管理邏輯** - 找出受影響的 shard、更新、創建新 shard
6. **加入一致性/鎖定機制** - 避免並發寫入衝突
7. **測試增量更新** - 驗證只更新變更的部分
8. **性能測試** - 確認預期提升

---

## 預期提升

| 場景 | 當前（偽增量） | 優化後（真增量） | 提升 |
|-----|--------------|----------------|------|
| 100K URLs, 100 變更 | 重新生成 100K | 只更新 100 | 99.9% |
| 100K URLs, 1K 變更 | 重新生成 100K | 只更新 1K | 99% |
| 100K URLs, 10K 變更 | 重新生成 100K | 只更新 10K | 90% |

**預期整體提升**: 70-90%（對於小變更場景）

---

## 風險與緩解（擴展）

| 風險 | 嚴重度 | 緩解措施 |
|-----|--------|---------|
| SitemapParser 解析錯誤 | 中 | 使用成熟的 XML 解析庫（如 fast-xml-parser）、完整錯誤處理 |
| shard 管理邏輯複雜 | 高 | 分步實現、保留完整生成作為 fallback |
| URL-Shard 映射不一致 | 中 | 定期驗證、自動修復機制 |
| 大量變更導致效率低 | 低 | 設定閾值，超過時觸發完整重建 |
| 並發更新衝突 | 低 | 使用 ShadowProcessor 原子操作 |

**Fallback 策略**:
```typescript
// 建議的 fallback 機制
async generateDiff(diff: DiffResult): Promise<void> {
  try {
    // 如果變更比例或受影響 shard 比例超過閾值，觸發完整重建
    const changeRatio = (diff.added.length + diff.updated.length + diff.removed.length) / this.totalUrls
    const affectedShardRatio = this.estimateAffectedShardRatio(diff)
    if (changeRatio > 0.3 || affectedShardRatio > 0.5) {  // 閾值需依 Phase 0 校正
      console.warn('[IncrementalGenerator] Large change ratio, falling back to full generation')
      await this.generator.run()
      return
    }
    
    // 真正的增量更新邏輯
    await this.performIncrementalUpdate(diff)
  } catch (error) {
    console.error('[IncrementalGenerator] Incremental update failed, falling back to full generation', error)
    await this.generator.run()
  }
}
```

---

## 驗證清單

### 子任務 3.0: 分片規則與 Manifest
- [ ] 分片規則固定且可重現（排序與分段一致）
- [ ] Manifest 格式與存放位置確定
- [ ] Manifest 與 sitemap index 同步更新

### 子任務 3.1: SitemapParser
- [ ] XML 解析器實現（建議使用 fast-xml-parser）
- [ ] 支援解析 sitemap index
- [ ] 支援解析 urlset
- [ ] 錯誤處理完整

### 子任務 3.2: URL-Shard 映射
- [ ] 映射表數據結構設計
- [ ] 映射表持久化（可選）
- [ ] 映射查詢 O(1) 複雜度

### 子任務 3.3: loadBaseEntries()
- [ ] 從文件讀取而非 providers
- [ ] 支援讀取多個 shard
- [ ] 記憶體效率優化

### 子任務 3.4-3.5: generateDiff() 和 shard 更新
- [ ] 實現真正的增量更新
- [ ] 只更新變更的 shard
- [ ] 支援新增 shard
- [ ] 更新 sitemap index

### 子任務 3.6: 一致性與鎖定
- [ ] 同一 sitemap 僅允許單一增量流程寫入
- [ ] shard → index → manifest 更新順序固定
- [ ] 失敗時回退策略可驗證

### 整體驗證
- [ ] 測試：小變更場景性能提升 70%+
- [ ] 測試：大變更場景仍正常工作
- [ ] 測試：邊緣情況（空變更、全部變更、shard 合併等）
- [ ] 測試：單檔 sitemap 模式可增量更新
- [ ] 測試：增量結果與全量結果等價（XML normalize 比對）
- [ ] 測試：Fallback 機制正常
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過
- [ ] 文檔已更新

---

## 下一步

完成 Phase 3 後：
- Phase 4 已併入此階段（流式讀取作為 SitemapParser 的一部分）
- 進行可選優化（Phase 6, 7）或直接進入收尾測試
