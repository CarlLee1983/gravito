# Flash Sale 後續改進 - P1 優先級規劃

**優先級**：🟠 P1（後續迭代）
**預計週期**：2-3 週（60-80 小時）
**前置條件**：P0 完成
**目標**：優化快取層、事件系統，進一步提升性能和可靠性

---

## 📋 P1 任務分解

### Task P1.1: 智能快取預熱策略

**預計工作量**：6 小時
**技術棧**：Redis, Lua 腳本, 事件驅動
**風險等級**：Low（快取優化，不影響業務邏輯）

#### 設計方案

```typescript
// 快取預熱管理器
export class CacheWarmupManager {
  // 1. 啟動時預熱熱點數據
  async warmupOnStartup() {
    // 預熱最熱銷的 100 個商品
    const hotProducts = await db.query(`
      SELECT * FROM products
      WHERE view_count > 1000
      ORDER BY view_count DESC
      LIMIT 100
    `)

    for (const product of hotProducts) {
      await this.cacheService.set(
        `product:${product.id}`,
        product,
        300 // TTL: 5 分鐘
      )
    }
  }

  // 2. 事件驅動預熱
  onProductViewed(productId: string) {
    // 追蹤熱度
    this.heatMap.increment(productId)

    // 當商品熱度突然上升時，自動預熱相關商品
    if (this.heatMap.get(productId) > THRESHOLD) {
      this.preloadRelated(productId)
    }
  }

  // 3. 定期再預熱（保持命中率）
  async periodicWarmup() {
    const topProducts = await this.heatMap.getTop(100)
    for (const productId of topProducts) {
      const product = await db.query(`SELECT * FROM products WHERE id = ?`, [productId])
      await this.cacheService.refresh(`product:${productId}`, product)
    }
  }

  // 4. 推薦商品預熱（交叉銷售）
  async preloadRelated(productId: string) {
    // 預加載推薦商品，提升轉化率
    const related = await this.recommendationEngine.getRelated(productId)
    for (const item of related.slice(0, 10)) {
      await this.cacheService.set(
        `product:${item.id}`,
        item,
        300
      )
    }
  }
}
```

#### 實施清單

- [ ] **Task P1.1.1**：熱度追蹤系統（1.5 小時）
  - 使用 Redis Sorted Set 追蹤熱度
  - 實時熱度更新
  - 冷卻機制（避免過度預熱）

- [ ] **Task P1.1.2**：預熱策略實現（2 小時）
  - 啟動時預熱（Top 100 商品）
  - 事件驅動預熱（熱度突增）
  - 定期再預熱（保持新鮮度）
  - 智能調度（非高峰期預熱）

- [ ] **Task P1.1.3**：Lua 腳本優化（1.5 小時）
  - 原子性預熱操作
  - 競態條件避免
  - 性能優化

- [ ] **Task P1.1.4**：測試和驗證（1 小時）
  - 單元測試
  - 集成測試
  - 命中率驗證

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 快取命中率 | 87% | > 95% | +8% |
| 首次訪問延遲 | 50-100ms | < 30ms | ⬇ 50% |
| P99 延遲 | 12.4ms | < 5ms | ⬇ 60% |
| 熱點訪問延遲 | 7.6ms | < 1ms | ⬇ 87% |

---

### Task P1.2: 本地二級快取（L1 Cache）

**預計工作量**：5 小時
**技術棧**：In-Memory Cache, LRU, Gravito 應用內存
**風險等級**：Low（本地快取，隔離性強）

#### 設計方案

```typescript
// 二級快取管理器（本地記憶體）
export class L1CacheManager {
  private lruCache = new LRUCache<string, any>({
    max: 10000,        // 最多 10K 條目
    maxSize: 100 * 1024 * 1024,  // 100MB
    ttl: 60000,        // 60 秒 TTL
  })

  // 分層快取策略：L1(本地) → L2(Redis) → DB
  async get(key: string): Promise<any> {
    // L1：本地快取（微秒級）
    let value = this.lruCache.get(key)
    if (value) {
      this.metrics.recordL1Hit()
      return value
    }

    // L2：Redis 快取（毫秒級）
    value = await this.redisCache.get(key)
    if (value) {
      this.metrics.recordL2Hit()
      // 回源到 L1
      this.lruCache.set(key, value)
      return value
    }

    // L3：資料庫（秒級）
    this.metrics.recordL3Hit()
    return null
  }

  // 快取失效協調
  onCacheInvalidated(pattern: string) {
    // 同時清理 L1 和 L2
    this.lruCache.deletePattern(pattern)
    this.redisCache.deletePattern(pattern)
  }
}
```

#### 實施清單

- [ ] **Task P1.2.1**：LRU 快取實現（1 小時）
  - 自定義 LRU 或使用成熟庫（lru-cache）
  - 記憶體限制（100MB）
  - TTL 管理

- [ ] **Task P1.2.2**：分層快取邏輯（2 小時）
  - L1 → L2 → DB 回源
  - 失效協調（一致性）
  - 預熱策略集成

- [ ] **Task P1.2.3**：監控指標（1 小時）
  - L1 命中率
  - L2 命中率
  - 記憶體使用
  - 驅逐率

- [ ] **Task P1.2.4**：測試和優化（1 小時）
  - 性能基準
  - 記憶體洩漏檢測
  - 一致性測試

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 熱點訪問延遲 | 7.6ms | < 0.1ms | ⬇ 70x |
| 平均延遲 | 7.6ms | 2-3ms | ⬇ 60% |
| CPU 負荷 | 50% | 35% | ⬇ 30% |
| Redis 負荷 | 常規 | -30% | ⬇ 降低 |

---

### Task P1.3: 事件驅動快取更新優化

**預計工作量**：4 小時
**技術棧**：Event System, Pattern Matching, DLQ
**風險等級**：Medium（涉及事件系統，需協調）

#### 設計方案

```typescript
// 事件驅動快取更新優化
export class OptimizedCacheInvalidationHandler {
  // 批量模式：合併多個失效請求
  private batchQueue: CacheInvalidationEvent[] = []
  private batchTimer: NodeJS.Timeout | null = null

  // 訂閱事件
  onEvent(event: BusinessEvent) {
    if (this.isCacheRelevant(event)) {
      this.batchQueue.push(event)

      // 200ms 內的相同模式失效合併
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(
          () => this.processBatch(),
          200
        )
      }
    }
  }

  // 智能失效策略
  private processBatch() {
    const patterns = this.deduplicatePatterns(this.batchQueue)

    for (const pattern of patterns) {
      // 使用 Lua 腳本原子執行
      this.redisCache.deletePatternAtomic(pattern)
      this.lruCache.deletePattern(pattern)
    }

    this.metrics.recordBatchInvalidation(patterns.length)
    this.batchQueue = []
    this.batchTimer = null
  }

  // 避免失效衝突
  private deduplicatePatterns(events: CacheInvalidationEvent[]): string[] {
    const patterns = new Set<string>()

    for (const event of events) {
      const pattern = this.getInvalidationPattern(event)
      patterns.add(pattern)
    }

    return Array.from(patterns)
  }

  // 與 DLQ 協調
  async handleFailedInvalidation(error: Error, event: CacheInvalidationEvent) {
    // 失效失敗進入 DLQ，後續重試
    await this.dlqManager.moveToDLQ('cache-invalidation-failed', {
      event,
      error: error.message,
      timestamp: Date.now(),
    })
  }
}
```

#### 實施清單

- [ ] **Task P1.3.1**：批量失效機制（1 小時）
  - 收集快取失效請求
  - 合併相同模式
  - 定時批量執行

- [ ] **Task P1.3.2**：智能模式匹配（1 小時）
  - 事件 → 失效模式映射
  - 去重邏輯
  - 優化模式（避免過度失效）

- [ ] **Task P1.3.3**：DLQ 集成（1 小時）
  - 失效失敗進 DLQ
  - 自動重試機制
  - 失效衝突偵測

- [ ] **Task P1.3.4**：測試和監控（1 小時）
  - 失效延遲測試
  - 衝突檢測測試
  - 監控指標

#### 預期收益

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 失效衝突 | 偶發 | 零 | 消除 |
| 失效延遲 | < 100ms | < 10ms | ⬇ 90% |
| Redis 命令數 | 高 | -50% | ⬇ 優化 |
| 一致性問題 | 可能 | 無 | 保證 |

---

## 📊 P1 階段總結

| 任務 | 工作量 | 優先級 | 收益 | 風險 |
|------|--------|--------|------|------|
| P1.1 智能預熱 | 6h | 🟠 Medium | 命中率 +8% | Low |
| P1.2 本地二級快取 | 5h | 🟠 Medium | 熱點延遲 ⬇ 70x | Low |
| P1.3 事件優化 | 4h | 🟠 Medium | 失效零衝突 | Medium |
| **合計** | **15h** | - | **P99 < 5ms + 零失效衝突** | **低-中風險** |

---

## 🚀 執行計劃

### 前置條件

- P0 完成且穩定運行
- 監控和告警系統就緒

### 執行步驟

1. **Week 3-4 (Monday-Wednesday)**
   - P1.1 智能預熱策略
   - P1.2 本地二級快取

2. **Week 4-5 (Thursday-Friday)**
   - P1.3 事件驅動優化
   - 集成測試與性能驗證

### 驗收標準

- [ ] 快取命中率 > 95%
- [ ] P99 延遲 < 5ms
- [ ] 零快取一致性問題
- [ ] 記憶體使用穩定
- [ ] 文檔完整

---

**計劃開始日期**：2026-02-20（P0 完成後）
**預期完成日期**：2026-03-05
**里程碑**：超高性能快取層（命中率 95%+，延遲 < 5ms）
