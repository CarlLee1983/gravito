# Phase 5: 變更追蹤優化

> **依賴**: 無  
> **優先級**: 🟡 中  
> **預估時間**: 1-2 天

[← 返回總覽](../README.md)

---

## 目標

優化 `MemoryChangeTracker` 的性能，從陣列 filter 改為 Map/Set 索引。

---

## 當前問題

**發現位置**: `src/core/ChangeTracker.ts:28-47`

**問題分析**:
```typescript
async getChanges(since?: Date): Promise<SitemapChange[]> {
  if (!since) {
    return [...this.changes]  // ❌ 複製整個陣列
  }
  
  return this.changes.filter((change) => change.timestamp >= since)  // ❌ O(n) 過濾
}

async getChangesByUrl(url: string): Promise<SitemapChange[]> {
  return this.changes.filter((change) => change.url === url)  // ❌ O(n) 過濾
}
```

**性能問題**:
- `getChanges()` 使用 `filter()`，時間複雜度 O(n)
- `getChangesByUrl()` 使用 `filter()`，時間複雜度 O(n)
- 對於 100K 變更記錄，每次查詢都要遍歷整個陣列

---

## 優化方案

### 使用 Map/Set 索引

```typescript
export class MemoryChangeTracker implements ChangeTracker {
  private changes: SitemapChange[] = []
  private changesByUrl: Map<string, SitemapChange[]> = new Map()
  private changesByTime: SitemapChange[] = []  // 按時間排序
  private maxChanges: number
  
  async track(change: SitemapChange): Promise<void> {
    this.changes.push(change)
    
    // 更新 URL 索引
    if (!this.changesByUrl.has(change.url)) {
      this.changesByUrl.set(change.url, [])
    }
    this.changesByUrl.get(change.url)!.push(change)
    
    // 更新時間索引（使用二分查找插入）
    this.insertByTime(change)
    
    // 清理舊記錄
    if (this.changes.length > this.maxChanges) {
      this.cleanupOldChanges()
    }
  }
  
  async getChanges(since?: Date): Promise<SitemapChange[]> {
    if (!since) {
      return [...this.changes]
    }
    
    // 使用二分查找找到起始位置
    const startIndex = this.findTimeIndex(since)
    return this.changesByTime.slice(startIndex)
  }
  
  async getChangesByUrl(url: string): Promise<SitemapChange[]> {
    return this.changesByUrl.get(url) || []
  }
  
  private insertByTime(change: SitemapChange): void {
    // 二分查找插入位置
    const index = this.findTimeIndex(change.timestamp)
    this.changesByTime.splice(index, 0, change)
  }
  
  private findTimeIndex(timestamp: Date): number {
    // 二分查找實現
    let left = 0
    let right = this.changesByTime.length
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (this.changesByTime[mid]!.timestamp < timestamp) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    
    return left
  }
}
```

---

## 實作注意事項（新增）

1. **時間索引插入成本**：`changesByTime.splice()` 為 O(n)，若 `track()` 呼叫頻繁，可能成為新瓶頸  
   - 若變更時間單調遞增，可直接 `push()` 並省略二分插入  
   - 若無法保證單調，需明確 `maxChanges` 上限以控制成本
2. **清理同步**：`cleanupOldChanges()` 必須同步清除 `changes`、`changesByUrl`、`changesByTime`  
   - 建議以 URL→變更索引為主，避免遺漏或記憶體洩漏
3. **可選優化**：可新增 `getChangesByUrlSince(url, since)` 以減少上層二次過濾

---

## 預期提升

| 操作 | 當前（O(n)） | 優化後（O(log n)） | 提升 |
|-----|------------|------------------|------|
| getChanges(since) | O(n) | O(log n) | 80-95% |
| getChangesByUrl() | O(n) | O(1) | 95-99% |

---

## 驗證清單

- [ ] Map/Set 索引實現
- [ ] 性能測試顯示預期提升
- [ ] 所有現有測試通過
- [ ] 向後相容性驗證通過

---

## 下一步

完成 Phase 5 後，繼續進行：
- [Phase 3: 增量生成優化](../03-incremental-optimization/README.md)
