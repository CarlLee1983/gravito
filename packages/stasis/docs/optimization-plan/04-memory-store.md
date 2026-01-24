# MemoryStore LRU 效能優化

> 優先級：中
> 影響範圍：MemoryStore
> 預估工作量：2-3 天

---

## 問題描述

### 現況 LRU 實作

MemoryStore 目前透過刪除再插入來維持 LRU 順序，效能不佳。

```typescript
async get<T>(key: string): Promise<T | null> {
  const entry = this.cache.get(key)
  // LRU: 刪除並重新插入
  this.cache.delete(key)
  this.cache.set(key, entry)
  return entry.value as T
}
```

**問題**：
- 每次讀取都需要刪除 + 插入操作
- `maxItems` 檢查在 `put` 之後進行，可能短暫超過限制
- 缺少統計資訊

---

## 優化方案

### 雙向鏈表 + Map（推薦）

```typescript
interface LRUNode<T> {
  key: string
  value: T
  expiresAt: number | null
  prev: LRUNode<T> | null
  next: LRUNode<T> | null
}

class LRUCache<T> {
  private map: Map<string, LRUNode<T>> = new Map()
  private head: LRUNode<T> | null = null
  private tail: LRUNode<T> | null = null

  get(key: string): T | null {
    const node = this.map.get(key)
    if (!node) return null
    this.moveToHead(node)  // O(1)
    return node.value
  }

  set(key: string, value: T, expiresAt: number | null): void {
    // 先驅逐，確保不超過限制
    while (this.map.size >= this.maxSize) {
      this.evictLRU()
    }
    // 插入新節點到頭部
    const node = { key, value, expiresAt, prev: null, next: this.head }
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
    this.map.set(key, node)
  }

  private moveToHead(node: LRUNode<T>): void {
    if (node === this.head) return
    // 從當前位置移除，插入頭部
    if (node.prev) node.prev.next = node.next
    if (node.next) node.next.prev = node.prev
    if (node === this.tail) this.tail = node.prev
    node.prev = null
    node.next = this.head
    if (this.head) this.head.prev = node
    this.head = node
  }
}
```

---

## 統計功能

```typescript
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  evictions: number
  estimatedBytes?: number
}

class MemoryStore implements CacheStore {
  private stats = { hits: 0, misses: 0, evictions: 0 }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
    }
  }
}
```

---

## 驅逐策略擴展

```typescript
type EvictionPolicy = 'lru' | 'lfu' | 'ttl' | 'random'

interface MemoryStoreOptions {
  maxItems?: number
  evictionPolicy?: EvictionPolicy  // 預設: 'lru'
}
```

---

## 預期效能改進

| 操作 | 現況 | 優化後 |
|------|------|--------|
| get (hit) | ~500 ops/ms | ~2000 ops/ms |
| put (evict) | ~300 ops/ms | ~1500 ops/ms |

---

## 實作步驟

1. [ ] 實作雙向鏈表 LRU
2. [ ] 修正驅逐時機（先驅逐再插入）
3. [ ] 新增統計追蹤
4. [ ] 新增驅逐策略選項
5. [ ] 效能基準測試
