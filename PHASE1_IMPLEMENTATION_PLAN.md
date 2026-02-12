# Gravito 框架改善 Phase 1 - 事件系統升級實施計劃

**發佈日期**：2026-02-11
**版本**：v1.0
**Phase 1 時間跨度**：2026-02-19 ~ 2026-03-03（約 3 週）
**總工作量**：54 小時
**狀態**：📋 待啟動

---

## 📋 Phase 1 概覽

Phase 1 的目標是升級 Gravito 核心框架的事件系統，使其從基礎的發佈/訂閱演進為**企業級事件驅動平台**。

### 成果交付物

```
Phase 1 完成後
├─ packages/core 事件系統升級
│  ├─ EventManager v2.0（優先級支持）
│  ├─ EventAggregator（聚合和去重）
│  ├─ BackpressureManager（背壓管理）
│  ├─ EventQueue（優先級隊列）
│  └─ PriorityEscalationManager（優先級提升）
│
├─ 完整單元測試（80%+ 覆蓋率）
├─ 集成測試（Flash Sale 場景驗證）
├─ 性能基準測試
└─ 完整文檔
```

### 預期成果

| 指標 | 當前 | Phase 1 目標 | 驗證方式 |
|------|------|------------|---------|
| 事件優先級支持 | ❌ | ✅ | Flash Sale 優先級事件 |
| 事件聚合去重 | ❌ | ✅ | EventAggregator 單元測試 |
| 背壓管理 | ❌ | ✅ | 高負載測試 |
| 性能提升 | 基線 | +10-20% | Flash Sale QPS 測試 |
| 記憶體優化 | 基線 | -30% | 大規模事件測試 |

---

## 🎯 Task 分解

### Task 1.1：事件優先級系統（16 小時）

**目標**：實現 EventManager 優先級支持，支持 4 層優先級

#### 1.1.1 分析和設計（2h）
- 分析 Flash Sale EventQueue 實現
- 設計 EventManager v2.0 API
- 確定與現有代碼的集成點

#### 1.1.2 核心實現（8h）
**實施文件**：`packages/core/src/events/PriorityEventManager.ts`

```typescript
// 核心接口
interface EventOptions {
  priority?: EventPriority  // 新增
  timeout?: number
  maxRetries?: number
}

enum EventPriority {
  CRITICAL = 0,  // 立即處理
  HIGH = 1,      // 高優先級
  NORMAL = 2,    // 正常優先級（默認）
  LOW = 3,       // 低優先級
}

// 實現
class PriorityEventManager extends EventManager {
  private eventQueue: EventQueue
  private priorityStats: PriorityStatistics

  async emit(event: Event, options?: EventOptions): Promise<void>
  async emitImmediate(event: Event): Promise<void>  // CRITICAL 優先級便捷方法
  getQueueStats(): QueueStats
  setPriorityEscalation(enable: boolean): void  // 優先級提升
}
```

**實施步驟**：
1. [ ] 實現 EventQueue（優先級堆）
2. [ ] 實現 EventPriority 枚舉和配置
3. [ ] 實現 PriorityEventManager
4. [ ] 添加統計收集（PriorityStatistics）
5. [ ] 集成到 EventManager（向後兼容）

#### 1.1.3 單元測試（4h）
**測試文件**：`packages/core/src/__tests__/PriorityEventManager.test.ts`

```typescript
describe('PriorityEventManager', () => {
  describe('優先級排隊', () => {
    // 測試：CRITICAL 優先級事件先執行
    // 測試：相同優先級 FIFO
    // 測試：HIGH 優先級插隊
  })

  describe('統計信息', () => {
    // 測試：優先級分布統計
    // 測試：處理延遲統計
  })

  describe('向後兼容性', () => {
    // 測試：默認 NORMAL 優先級
    // 測試：現有代碼無需修改
  })
})
```

**驗收標準**：
- ✅ 24 個單元測試全部通過
- ✅ typecheck 通過（104 包）
- ✅ 性能測試：10000 事件入隊 < 10ms

#### 1.1.4 文檔（2h）
- [ ] API 文檔（JSDoc）
- [ ] 使用指南
- [ ] 最佳實踐
- [ ] 遷移指南（向後兼容）

---

### Task 1.2：事件聚合和去重（20 小時）

**目標**：實現高效的事件聚合、去重和批處理

#### 1.2.1 設計和分析（3h）
- 分析 Flash Sale EventAggregator 實現
- 設計 Gravito 集成方案
- 確定聚合窗口和去重策略

#### 1.2.2 核心實現（10h）

**實施文件集**：
```
packages/core/src/events/
├── EventAggregator.ts         # 事件聚合器
├── EventDeduplicator.ts       # 去重器
├── BatchProcessor.ts          # 批處理器
└── AggregationConfig.ts       # 配置
```

**核心類**：

```typescript
// EventDeduplicator - 去重器
interface DeduplicationStrategy {
  getKey(event: Event): string
  shouldDeduplicate(event1: Event, event2: Event): boolean
}

class EventDeduplicator {
  private cache: Map<string, Event>
  private patterns: Map<string, RegExp>

  add(event: Event, strategy: DeduplicationStrategy): boolean
  isDuplicate(event: Event): boolean
  clear(): void
}

// EventAggregator - 聚合器
class EventAggregator {
  private deduplicator: EventDeduplicator
  private batcher: BatchProcessor
  private window: number  // 聚合窗口（ms）

  async aggregate(events: Event[]): Promise<Event[]>
  getAggregationStats(): AggregationStats
}

// BatchProcessor - 批處理
class BatchProcessor {
  private buffer: Event[] = []
  private batchSize: number
  private timeoutHandle: NodeJS.Timeout | null

  async add(event: Event): Promise<void>
  async flush(): Promise<Event[]>
}
```

#### 1.2.3 集成測試（5h）
**測試文件**：`packages/core/src/__tests__/EventAggregation.test.ts`

```typescript
describe('事件聚合系統', () => {
  describe('EventDeduplicator', () => {
    // 測試：精確匹配去重
    // 測試：正則表達式去重
    // 測試：去重率統計
  })

  describe('EventAggregator', () => {
    // 測試：事件聚合窗口
    // 測試：批處理大小觸發
    // 測試：超時自動刷新
  })

  describe('性能驗證', () => {
    // 測試：10000 事件去重 < 50ms
    // 測試：記憶體占用穩定
    // 測試：聚合率 > 40%
  })
})
```

**驗收標準**：
- ✅ 28 個集成測試全部通過
- ✅ 去重率 > 40%（Flash Sale 驗證）
- ✅ 聚合前 1000 事件 → 聚合後 600 事件
- ✅ 記憶體占用 < 50MB（100K 事件）

#### 1.2.4 文檔（2h）
- [ ] 聚合策略選擇指南
- [ ] 去重配置示例
- [ ] 性能調優建議

---

### Task 1.3：背壓管理系統（18 小時）

**目標**：實現完整的背壓管理，防止高負載時的級聯故障

#### 1.3.1 設計（2h）
- 分析 Flash Sale BackpressureManager 設計
- 設計 Gravito 框架集成
- 確定背壓策略（閾值、冷卻、漸進式）

#### 1.3.2 核心實現（10h）

**實施文件**：`packages/core/src/events/BackpressureManager.ts`

```typescript
enum BackpressureState {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

interface BackpressureConfig {
  warningThreshold?: number      // 隊列深度警告閾值（默認 7000）
  criticalThreshold?: number     // 隊列深度致命閾值（默認 9000）
  coolingPeriodMs?: number       // 冷卻期（默認 1000ms）
  strategy?: BackpressureStrategy // 背壓策略
}

enum BackpressureStrategy {
  REJECT = 'REJECT',            // 拒絕新事件
  DELAY = 'DELAY',              // 延遲處理
  DEGRADED = 'DEGRADED',        // 降級模式（只處理 CRITICAL）
}

class BackpressureManager {
  private state: BackpressureState = BackpressureState.NORMAL
  private queueDepth: number = 0
  private coolingStart: number | null = null

  checkPressure(): BackpressureState
  onQueueDepthChange(depth: number): void
  shouldAccept(event: Event): boolean
  shouldReject(event: Event): boolean
  getStats(): BackpressureStats
}
```

#### 1.3.3 集成測試（4h）
**測試文件**：`packages/core/src/__tests__/BackpressureManagement.test.ts`

```typescript
describe('背壓管理系統', () => {
  describe('狀態轉換', () => {
    // 測試：NORMAL → WARNING → CRITICAL
    // 測試：恢復過程
  })

  describe('事件接受/拒絕', () => {
    // 測試：WARNING 拒絕低優先級
    // 測試：CRITICAL 只接受 CRITICAL 事件
    // 測試：冷卻期間不接受
  })

  describe('性能驗證', () => {
    // 測試：高負載（10000 QPS）下穩定
    // 測試：無級聯故障
    // 測試：恢復後 < 5s 恢復正常
  })
})
```

**驗收標準**：
- ✅ 22 個背壓測試全部通過
- ✅ 10000 QPS 高負載穩定（無 OOM、無堆積）
- ✅ 故障恢復時間 < 5s
- ✅ 拒絕率統計準確

#### 1.3.4 文檔（2h）
- [ ] 背壓策略選擇指南
- [ ] 配置參數調優
- [ ] 告警和監控集成

---

## 📦 新增文件清單

### 核心實現文件（packages/core/src/）

```
src/events/
├── priority/
│   ├── EventPriority.ts                    # 優先級定義
│   ├── PriorityEscalationManager.ts        # 優先級提升
│   ├── PriorityStatistics.ts               # 優先級統計
│   └── EventQueue.ts                       # 優先級隊列
│
├── aggregation/
│   ├── EventAggregator.ts                  # 事件聚合器
│   ├── EventDeduplicator.ts                # 事件去重
│   ├── BatchProcessor.ts                   # 批處理
│   └── AggregationConfig.ts                # 配置
│
├── backpressure/
│   ├── BackpressureManager.ts              # 背壓管理
│   ├── BackpressureStrategy.ts             # 背壓策略
│   └── BackpressureConfig.ts               # 配置
│
└── v2/
    ├── PriorityEventManager.ts             # EventManager v2.0
    └── index.ts                            # 新版本導出
```

### 測試文件（packages/core/src/__tests__/）

```
__tests__/
├── PriorityEventManager.test.ts            # 優先級測試（24 個）
├── EventAggregation.test.ts                # 聚合去重測試（28 個）
├── BackpressureManagement.test.ts          # 背壓管理測試（22 個）
├── EventIntegration.test.ts                # 集成測試（16 個）
└── FlashSaleEventScenarios.test.ts         # Flash Sale 場景驗證（12 個）
```

### 文檔文件

```
docs/
├── PHASE1_IMPLEMENTATION_COMPLETE.md       # 實施完成報告
├── api/
│   ├── PriorityEventManager.md             # API 文檔
│   ├── EventAggregator.md
│   └── BackpressureManager.md
├── guides/
│   ├── priority-strategy-guide.md          # 優先級策略指南
│   ├── aggregation-configuration.md        # 聚合配置指南
│   └── backpressure-tuning.md              # 背壓調優指南
└── migration/
    └── v1-to-v2-migration.md               # 遷移指南（向後兼容）
```

---

## 🧪 驗證和測試策略

### 單元測試（60 個用例）

```
優先級系統         24 個
事件聚合和去重     28 個
背壓管理系統       22 個
──────────────────────
小計              74 個
```

### 集成測試（Flash Sale 場景）

```
場景 1：高優先級事件優先處理
├─ 創建 1000 個 NORMAL + 100 個 CRITICAL
├─ 驗證 CRITICAL 先執行
└─ 驗證執行順序正確

場景 2：大規模事件聚合去重
├─ 創建 10000 個相同失效事件
├─ 驗證聚合為 100 個批次
└─ 驗證記憶體占用 < 50MB

場景 3：高負載背壓管理
├─ 模擬 10000 QPS 高負載
├─ 驗證背壓轉移為 DEGRADED
├─ 驗證只處理 CRITICAL 事件
└─ 驗證故障恢復 < 5s

場景 4：混合場景（優先級 + 聚合 + 背壓）
├─ 混合優先級、聚合、背壓
├─ 驗證功能協調工作
└─ 驗證性能目標達成
```

### 性能基準

```
QPS 指標
├─ 事件優先級入隊：> 10000 ops/sec
├─ 事件聚合去重：> 5000 ops/sec
└─ 背壓檢查：> 50000 ops/sec

延遲指標
├─ 優先級排隊：< 0.1ms（P99）
├─ 聚合檢查：< 0.5ms（P99）
└─ 背壓檢查：< 0.05ms（P99）

記憶體指標
├─ 10000 事件佇列：< 10MB
├─ 聚合器緩衝：< 5MB
└─ 去重緩存：< 50MB（100K 事件）
```

---

## 🔄 向後兼容性保證

### API 相容性

```typescript
// ✅ 現有代碼無需修改
eventManager.emit(event)                    // 默認 NORMAL 優先級

// ✅ 新功能可選使用
eventManager.emit(event, { priority: EventPriority.HIGH })
eventManager.emitImmediate(event)           // CRITICAL 便捷方法
```

### 版本策略

```
packages/core
├── v1 (當前)
│   └── EventManager（基礎）
│
├── v1.1 (Phase 1 後)
│   ├── EventManager（相同 API）
│   ├── + PriorityEventManager（增強）
│   ├── + EventAggregator（新）
│   └── + BackpressureManager（新）
│
└── v2 (未來，breaking change)
    └── 整合優先級成為默認
```

### 遷移路徑

```
現有應用
├─ 無需修改（使用 v1.1）
├─ 可選遷移（使用 PriorityEventManager）
└─ 完全升級（遷移到 v2）
```

---

## 📊 進度追蹤

### Weekly Milestones

**Week 1（2026-02-19 ~ 2026-02-25）**
- [ ] Task 1.1 分析和設計完成
- [ ] Task 1.1 核心實現 50%
- [ ] Task 1.2 設計完成
- [ ] 目標完成度：30%

**Week 2（2026-02-26 ~ 2026-03-03）**
- [ ] Task 1.1 實現和測試 100%
- [ ] Task 1.2 實現和測試 80%
- [ ] Task 1.3 實現和測試 60%
- [ ] 目標完成度：70%

**Week 3（2026-03-03 ~ 2026-03-10）**
- [ ] Task 1.2、1.3 測試 100%
- [ ] Flash Sale 集成驗證完成
- [ ] 所有文檔完成
- [ ] 目標完成度：100%

---

## 🚀 啟動清單

### 啟動前準備（Week of 2026-02-12）

- [ ] 核心團隊審查本計劃
- [ ] 確認資源分配
- [ ] 建立開發環境
- [ ] 創建 feature 分支：`feature/events-system-v2`

### 代碼審查流程

```
實施 → 自測 → 提交 PR → Code Review → Flash Sale 驗證 → Merge
      ↓       ↓         ↓            ↓                ↓
    80%+   功能正常  文檔完整      無迴歸           主分支
    覆蓋    性能達標  示例工作      性能目標
```

### 發布檢查清單

- [ ] 所有 74 個單元測試通過
- [ ] 集成測試通過（Flash Sale 場景）
- [ ] 性能基準達成
- [ ] 文檔完整（API + 指南 + 遷移）
- [ ] Code Review 通過（至少 2 人）
- [ ] TypeScript typecheck 通過
- [ ] Biome lint 通過
- [ ] Flash Sale QPS 達成預期

---

## 📞 聯繫和反饋

### 定期同步
- 每週一 10:00 AM 進度同步（30 min）
- 遇到 blocker 立即報告
- 每個 task 完成後 code review

### 反饋渠道
- GitHub Issue：Phase 1 進度追蹤
- PR Comments：代碼審查
- Discussion：設計決策

---

## 📝 相關文檔

- [FRAMEWORK_IMPROVEMENT_ROADMAP.md](./FRAMEWORK_IMPROVEMENT_ROADMAP.md) - 完整改善計劃
- [examples/flash-sale-fullstack/](./examples/flash-sale-fullstack/) - Flash Sale 參考實現
- [docs/claude/design.md](./docs/claude/design.md) - Galaxy Architecture 設計原則
- [docs/claude/constraints.md](./docs/claude/constraints.md) - Monorepo 約束

---

**🎯 目標**：完成 Phase 1，為 Gravito 框架的事件系統升級奠定堅實基礎

**狀態**：📋 待啟動
**預期完成**：2026-03-03
**下一步**：Phase 1 啟動審查會議（2026-02-12）

🚀 **Let's make Gravito events enterprise-grade!**
