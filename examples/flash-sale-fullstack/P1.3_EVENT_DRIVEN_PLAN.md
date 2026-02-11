# P1.3 事件驅動快取優化 - 實施計劃

**狀態**：🚀 計劃中
**開始日期**：2026-02-10
**預期完成**：2026-02-11 (24 小時加速實施)
**分支**：`feature/flash-sale-p1.3-event-driven`

---

## 📊 P1.3 目標概述

在 P1.1/P1.2 基礎上，通過事件驅動架構進一步優化快取失效機制，實現：

| 指標 | P1.2 值 | P1.3 目標 | 改進 |
|------|---------|---------|------|
| **事件延遲** | 50ms+ | < 10ms | 5 倍 |
| **失效吞吐量** | 1K events/s | 10K events/s | 10 倍 |
| **CPU 消耗** | 30% | < 15% | 50% 降低 |
| **記憶體效率** | 75% | > 85% | 10% 提升 |
| **P99 失效延遲** | 100ms | < 20ms | 5 倍 |

---

## 🎯 核心功能設計

### 1. 事件驅動架構

```typescript
// 事件類型定義
enum CacheEventType {
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_DELETED = 'product_deleted',
  INVENTORY_CHANGED = 'inventory_changed',
  PRICE_CHANGED = 'price_changed',
  PROMOTION_STARTED = 'promotion_started',
  PROMOTION_ENDED = 'promotion_ended',
  BATCH_UPDATE = 'batch_update'
}

// 事件優先級
enum EventPriority {
  CRITICAL = 'critical',     // 1. 立即處理
  HIGH = 'high',             // 2. 200ms 內
  NORMAL = 'normal',         // 3. 500ms 內
  LOW = 'low'                // 4. 1000ms 內
}

// 事件結構
interface CacheEvent {
  id: string
  type: CacheEventType
  priority: EventPriority
  patterns: string[]           // 失效模式集合
  timestamp: number
  source: string              // 事件來源
  metadata?: Record<string, any>
}
```

### 2. 事件聚合與背壓管理

```typescript
interface EventAggregator {
  // 事件接收和聚合
  submit(event: CacheEvent): Promise<void>

  // 背壓控制
  getQueueStats(): QueueStats
  isPressured(): boolean

  // 批量處理
  flush(timeout?: number): Promise<void>

  // 優先級調度
  getNextBatch(maxSize: number): CacheEvent[]
}

interface QueueStats {
  totalEvents: number
  byPriority: Record<EventPriority, number>
  oldestEventAge: number
  queueUtilization: number  // 0-1
}
```

### 3. 異步失效引擎

```typescript
interface AsyncInvalidationEngine {
  // 單個失效
  invalidate(pattern: string, priority: EventPriority): Promise<void>

  // 批量失效
  invalidateBatch(patterns: string[], priority: EventPriority): Promise<void>

  // 條件失效
  invalidateIf(
    pattern: string,
    condition: (value: any) => boolean
  ): Promise<number>  // 返回失效數量

  // 延遲失效
  invalidateAfter(
    pattern: string,
    delayMs: number
  ): Promise<void>
}
```

---

## 📋 實施階段

### Phase 1：事件驅動架構實施 (8 小時)

#### 1.1 事件定義與分類 (1 小時)

**任務**：
- [ ] 分析 Flash Sale 系統中的關鍵事件類型
- [ ] 定義事件優先級分類規則
- [ ] 創建 `src/cache/events/` 目錄結構

**交付物**：
- `src/cache/events/types.ts` - 事件類型定義 (100 行)
- `src/cache/events/priority.ts` - 優先級定義 (50 行)
- `docs/P1.3_EVENT_CLASSIFICATION.md` - 事件分類文檔 (200 行)

**驗證**：
- [ ] TypeScript 類型檢查通過
- [ ] 覆蓋所有已知的快取失效場景

---

#### 1.2 事件聚合器實施 (3 小時)

**任務**：
- [ ] 實施 `EventAggregator` 核心類
  - 事件隊列管理
  - 去重邏輯
  - 模式合併
  - 背壓控制

**實施要點**：
- 使用優先級隊列（Priority Queue）
- 支持動態窗口大小（200-500ms）
- 實施簡單的背壓算法（指數退避）

**交付物**：
```
src/cache/events/
├── EventAggregator.ts (250 行)
├── EventQueue.ts (200 行)
├── EventDeduplicator.ts (150 行)
└── BackpressureManager.ts (100 行)
```

**單元測試**：
- [ ] `tests/cache/EventAggregator.test.ts` (300 行，30+ 用例)
  - 基礎事件處理
  - 去重邏輯
  - 優先級排序
  - 背壓觸發
  - 窗口管理

**性能目標**：
- 事件提交延遲 < 1ms
- 聚合率 > 80% (去重後)

---

#### 1.3 異步失效引擎 (2 小時)

**任務**：
- [ ] 實施 `AsyncInvalidationEngine`
  - 非阻塞失效
  - 批量處理優化
  - 條件失效支持
  - 延遲失效調度

**實施要點**：
- 與 CacheInvalidationBatcher 集成
- 支持多種失效模式
- 異步重試機制

**交付物**：
```
src/cache/async/
├── AsyncInvalidationEngine.ts (300 行)
├── InvalidationScheduler.ts (150 行)
└── RetryPolicy.ts (100 行)
```

**單元測試**：
- [ ] `tests/cache/AsyncInvalidation.test.ts` (400 行，40+ 用例)

---

#### 1.4 事件驅動集成 (2 小時)

**任務**：
- [ ] 修改 `L1CacheManager` 支持事件驅動
- [ ] 修改 `CacheWarmupManager` 接收事件
- [ ] 修改應用啟動邏輯集成事件系統

**修改點**：
- `src/cache/L1CacheManager.ts` - 新增事件發布邏輯
- `src/cache/CacheWarmupManager.ts` - 新增事件監聽
- `src/app.ts` - 初始化事件聚合器

**交付物**：
- 更新的 L1CacheManager (30 行變更)
- 更新的 CacheWarmupManager (20 行變更)
- 更新的 app.ts (15 行變更)

---

### Phase 2：性能優化與調優 (4 小時)

#### 2.1 性能基準測試 (2 小時)

**任務**：
- [ ] 建立 P1.3 性能測試套件
- [ ] 測試事件驅動系統性能
- [ ] 對比 P1.2 性能差異

**測試場景**：
```
1. 單個高優先級事件 - 預期延遲 < 5ms
2. 批量高優先級事件 (100 個/s) - 預期吞吐量 100%
3. 混合優先級事件 (1K events/s) - 預期 CPU < 20%
4. 背壓場景 (10K events/s) - 預期丟棄率 < 1%
5. 長時間運行 (1小時) - 預期記憶體穩定
```

**交付物**：
- `tests/performance/P1.3_EVENT_PERFORMANCE.test.ts` (500 行)
- `docs/P1.3_PERFORMANCE_BASELINE.md` - 性能基準報告

**驗證標準**：
- [ ] 所有性能指標達成
- [ ] 無記憶體洩漏
- [ ] CPU 消耗合理

---

#### 2.2 優化調參 (2 小時)

**調優項目**：

1. **聚合窗口優化**
   - 當前：固定 200ms
   - 目標：動態調整 (100-500ms)
   - 判斷標準：隊列深度和 CPU 負荷

2. **背壓算法優化**
   - 實施：指數退避算法
   - 參數：初始延遲 1ms，最大延遲 100ms

3. **去重策略優化**
   - 當前：完整模式匹配
   - 改進：模式樹合併（減少去重開銷）

4. **優先級權重調整**
   - CRITICAL：0ms（立即）
   - HIGH：50ms
   - NORMAL：200ms
   - LOW：500ms

**交付物**：
- `docs/P1.3_TUNING_PARAMETERS.md` - 調參報告

---

### Phase 3：測試與驗證 (4 小時)

#### 3.1 集成測試 (2 小時)

**測試場景**：

```
場景 F：事件驅動預熱 (10 個測試)
├─ F1: 事件驅動觸發預熱
├─ F2: 優先級順序處理
├─ F3: 背壓下的預熱
├─ F4: 邊界案例

場景 G：異步失效流程 (15 個測試)
├─ G1: 單個異步失效
├─ G2: 批量異步失效
├─ G3: 條件失效
├─ G4: 延遲失效
├─ G5: 失效衝突恢復

場景 H：端到端事件驅動 (8 個測試)
├─ H1: 完整事件流程
├─ H2: 高負載場景
├─ H3: 故障恢復
```

**交付物**：
- `tests/integration/F-event-driven-warmup.test.ts` (400 行)
- `tests/integration/G-async-invalidation.test.ts` (450 行)
- `tests/integration/H-end-to-end-event-driven.test.ts` (350 行)

**驗證標準**：
- [ ] 所有 33 個集成測試通過
- [ ] P99 延遲 < 20ms
- [ ] 吞吐量達成目標

---

#### 3.2 容錯與恢復測試 (1 小時)

**測試場景**：

- [ ] 事件聚合器故障恢復
- [ ] 背壓超限處理
- [ ] DLQ 失效場景
- [ ] 長時間運行穩定性

**交付物**：
- `tests/integration/I-event-resilience.test.ts` (300 行)

---

#### 3.3 生產就緒檢查 (1 小時)

**檢查清單**：

- [ ] 所有日誌記錄完整
- [ ] 所有 metric 導出
- [ ] 所有警告配置
- [ ] 配置文檔完成
- [ ] 操作手冊完成

**交付物**：
- `docs/P1.3_OPERATIONS.md` - 操作手冊
- `docs/P1.3_TROUBLESHOOTING.md` - 故障排除
- `docs/P1.3_MONITORING.md` - 監控指南

---

## 🧪 測試計劃摘要

### 單元測試目標：100 個測試，100% 通過

```
EventAggregator         30 個測試
EventQueue              20 個測試
EventDeduplicator       20 個測試
BackpressureManager     15 個測試
AsyncInvalidationEngine 15 個測試
```

### 集成測試目標：33 個測試，100% 通過

```
場景 F: 10 個
場景 G: 15 個
場景 H: 8 個
```

### 容錯測試目標：10 個測試，100% 通過

**總測試數**：**143 個** (100 + 33 + 10)

---

## 📈 性能目標 (P1.2 → P1.3)

| 指標 | P1.2 | P1.3 目標 | 預期改進 |
|------|------|---------|---------|
| **事件處理延遲** | 50ms | < 10ms | 5 倍 ↑ |
| **失效吞吐量** | 1K events/s | 10K events/s | 10 倍 ↑ |
| **CPU 消耗** | 30% | < 15% | 50% ↓ |
| **P99 延遲** | 100ms | < 20ms | 5 倍 ↑ |
| **記憶體使用** | 穩定 | 穩定 | 無變化 |
| **成功率** | 99.9% | > 99.99% | 提升 |

---

## 🏗️ 架構圖

```
事件發布端                 事件驅動系統               快取執行端
┌──────────────┐       ┌─────────────────┐      ┌──────────────┐
│ Product API  │       │ Event Aggregator│      │ L1 Cache     │
│ Order API    │──────→│  ┌─ EventQueue  │──┐   │ L2 Redis     │
│ Inventory    │       │  ├─ Deduplicator│  │   │ L3 Database  │
└──────────────┘       │  └─ Backpressure│  │   └──────────────┘
                       └─────────────────┘  │
                                            │
                       ┌─────────────────┐  │   ┌──────────────┐
                       │ Async Invalidat.│  └──→│ Warmup Mgr   │
                       │ Engine          │      │ RetryPolicy  │
                       │ ┌─ Scheduler    │      └──────────────┘
                       │ └─ DLQ Handler  │
                       └─────────────────┘
```

---

## 📅 實施時間表

### Day 1 (8 小時)

| 時間 | 任務 | 預期完成 |
|------|------|---------|
| 08:00-09:00 | 事件分類設計 | ✓ |
| 09:00-12:00 | 事件聚合器實施 | ✓ |
| 12:00-13:00 | 午休 | - |
| 13:00-15:00 | 異步失效引擎 | ✓ |
| 15:00-17:00 | 事件驅動集成 | ✓ |
| 17:00-18:00 | Phase 1 測試 | ✓ |

### Day 2 (4 小時 性能優化)

| 時間 | 任務 | 預期完成 |
|------|------|---------|
| 08:00-10:00 | 性能基準測試 | ✓ |
| 10:00-12:00 | 優化調參 | ✓ |

### Day 3 (4 小時 測試驗證)

| 時間 | 任務 | 預期完成 |
|------|------|---------|
| 08:00-10:00 | 集成測試 (F/G/H) | ✓ |
| 10:00-11:00 | 容錯測試 (I) | ✓ |
| 11:00-12:00 | 文檔完成 | ✓ |

---

## 📦 交付物清單

### 代碼文件 (8 個)

```
src/cache/events/
├── types.ts (100 行)
├── priority.ts (50 行)
├── EventAggregator.ts (250 行)
├── EventQueue.ts (200 行)
├── EventDeduplicator.ts (150 行)
└── BackpressureManager.ts (100 行)

src/cache/async/
├── AsyncInvalidationEngine.ts (300 行)
├── InvalidationScheduler.ts (150 行)
└── RetryPolicy.ts (100 行)

修改：
├── src/cache/L1CacheManager.ts (30 行變更)
├── src/cache/CacheWarmupManager.ts (20 行變更)
└── src/app.ts (15 行變更)
```

**總代碼行數**：1,200 行 (新增) + 65 行 (修改) = 1,265 行

### 測試文件 (4 個)

```
tests/cache/
├── EventAggregator.test.ts (300 行，30 個測試)
├── AsyncInvalidation.test.ts (400 行，40 個測試)

tests/integration/
├── F-event-driven-warmup.test.ts (400 行，10 個測試)
├── G-async-invalidation.test.ts (450 行，15 個測試)
├── H-end-to-end-event-driven.test.ts (350 行，8 個測試)
├── I-event-resilience.test.ts (300 行，10 個測試)

tests/performance/
└── P1.3_EVENT_PERFORMANCE.test.ts (500 行)
```

**總測試行數**：2,700 行，143 個測試

### 文檔文件 (5 個)

```
docs/
├── P1.3_EVENT_CLASSIFICATION.md (200 行)
├── P1.3_PERFORMANCE_BASELINE.md (250 行)
├── P1.3_TUNING_PARAMETERS.md (200 行)
├── P1.3_OPERATIONS.md (300 行)
├── P1.3_TROUBLESHOOTING.md (250 行)
└── P1.3_MONITORING.md (200 行)
```

**總文檔行數**：1,400 行

---

## ✅ 驗收標準

### 功能驗收

- ✅ 事件驅動架構完整實施
- ✅ 背壓管理機制正常運作
- ✅ 異步失效引擎功能完整
- ✅ 與 P1.1/P1.2 組件完全兼容

### 性能驗收

- ✅ 事件延遲 < 10ms
- ✅ 失效吞吐量 > 10K events/s
- ✅ CPU 消耗 < 15%
- ✅ P99 延遲 < 20ms
- ✅ 記憶體穩定性驗證通過

### 測試驗收

- ✅ 100 個單元測試 100% 通過
- ✅ 33 個集成測試 100% 通過
- ✅ 10 個容錯測試 100% 通過
- ✅ **總計 143 個測試全部通過**

### 文檔驗收

- ✅ 5 份完整設計文檔
- ✅ 完整的操作和故障排除手冊
- ✅ 監控指南和性能基準報告

---

## 🚀 啟動檢查清單

在開始 P1.3 實施前，確認以下條件：

```bash
# 1. 確認在新分支上
git branch -v
# 應該顯示：* feature/flash-sale-p1.3-event-driven

# 2. 確認 P1.2 測試都通過
cd examples/flash-sale-fullstack
bun test  # 應該 226+ 個測試全部通過

# 3. 確認代碼無類型錯誤
bun run typecheck  # 應該 104/104 通過

# 4. 確認代碼格式規範
bun run check  # 應該沒有錯誤

# 5. 建立 P1.3 目錄結構
mkdir -p src/cache/events
mkdir -p src/cache/async
mkdir -p tests/cache
mkdir -p docs/P1.3

# 6. 檢查當前狀態
git status  # 應該是 clean
```

---

## 📝 相關文檔

**相關計劃文檔**：
- `P1_READINESS_CHECKLIST.md` - P1 總體準備檢查清單
- `P1.2_ADVANCED_IMPLEMENTATION.md` - P1.2 進階功能實施報告

**P0-P1 完成文檔**：
- `P0_COMPLETION_REPORT.md` - P0 完成報告
- `P1.2_TEST_SUMMARY.md` - P1.2 測試總結

---

## 🎯 成功指標

P1.3 完成時應達到：

1. **架構層面**
   - ✅ 事件驅動完全實現
   - ✅ 背壓管理機制就緒
   - ✅ 異步失效引擎優化

2. **性能層面**
   - ✅ 事件處理延遲降低 5 倍
   - ✅ 失效吞吐量提升 10 倍
   - ✅ CPU 消耗降低 50%

3. **質量層面**
   - ✅ 143 個測試全部通過
   - ✅ 完整的生產就緒文檔
   - ✅ 零已知的性能瓶頸

4. **可維護性層面**
   - ✅ 清晰的架構設計文檔
   - ✅ 完整的操作手冊
   - ✅ 詳細的故障排除指南

---

**計劃狀態**：✅ 準備就緒
**下一步**：執行 Phase 1 事件驅動架構實施

🚀 **P1.3 Ready to Launch!**
