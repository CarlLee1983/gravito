# Phase 1: 核心異步派發機制

**週期**：Week 1-2
**任務數**：5 個
**測試覆蓋**：80%+
**預期交付物**：可運行的異步事件派發系統

---

## 📋 任務清單

### ✅ Task 1.1.1: 在 HookManager 中添加 doActionAsync 方法

**檔案**：`packages/core/src/HookManager.ts`

**目標**：
實現異步事件派發核心 API，保留向後相容性

**詳細需求**：

```typescript
// 新增 EventOptions 接口
interface EventOptions {
  async: boolean                       // 異步派發
  priority: 'high' | 'normal' | 'low'  // 事件優先級
  timeout: number                      // 執行超時（ms）
  ordering: 'strict' | 'partition' | 'none'  // 順序保證
  idempotencyKey?: string              // 冪等性鍵（去重）
}

// 新增 doActionAsync 方法
class HookManager {
  async doActionAsync(
    name: string,
    payload: any,
    options: EventOptions = { async: true, priority: 'normal', timeout: 5000, ordering: 'none' }
  ): Promise<void> {
    // 實現邏輯
  }
}
```

**驗收標準**：
- [ ] `doActionAsync` 方法實現完成
- [ ] 支持 priority 參數
- [ ] 支持 timeout 參數
- [ ] 支持 ordering 參數
- [ ] 支持 idempotencyKey 參數
- [ ] 類型定義完整

**估計工作量**：2-3 小時

**參考代碼位置**：
- `packages/core/src/HookManager.ts`
- `packages/core/src/types/events.ts`

---

### ✅ Task 1.1.2: 實現 EventPriorityQueue 類

**檔案**：`packages/core/src/EventPriorityQueue.ts`

**目標**：
實現支持三級優先級的事件隊列

**詳細需求**：

```typescript
class EventPriorityQueue {
  private highPriority: EventTask[] = []
  private normalPriority: EventTask[] = []
  private lowPriority: EventTask[] = []

  enqueue(task: EventTask, priority: Priority): void {
    // 根據優先級入隊
  }

  dequeue(): EventTask | null {
    // 優先返回高優先級任務
  }

  getSize(): number {
    // 返回隊列總大小
  }

  getDepth(priority: Priority): number {
    // 返回特定優先級的隊列深度
  }

  private processNext(): void {
    // 按優先級處理下一個任務
  }
}
```

**隊列處理邏輯**：
1. 優先處理 High 優先級任務
2. High 隊列為空，處理 Normal 隊列
3. Normal 隊列為空，處理 Low 隊列

**驗收標準**：
- [ ] 三級隊列分離實現
- [ ] 優先級順序保證正確
- [ ] 支持入隊/出隊操作
- [ ] 支持隊列深度查詢
- [ ] 線程安全（使用 Mutex）

**估計工作量**：2-3 小時

**參考代碼位置**：
- `packages/core/src/EventPriorityQueue.ts`

---

### ✅ Task 1.1.3: 添加 EventOptions 接口定義

**檔案**：`packages/core/src/types/events.ts`

**目標**：
完整定義事件派發的所有選項

**詳細需求**：

```typescript
// 優先級定義
type EventPriority = 'high' | 'normal' | 'low'

// 順序保證策略
type OrderingStrategy = 'strict' | 'partition' | 'none'

// 重試策略
interface RetryPolicy {
  maxRetries: number
  backoff: 'exponential' | 'linear'
  initialDelayMs: number
  maxDelayMs: number
  dlqAfterMaxRetries?: boolean
}

// 事件選項
interface EventOptions {
  async?: boolean
  priority?: EventPriority
  timeout?: number
  ordering?: OrderingStrategy
  partitionKey?: string
  idempotencyKey?: string
  idempotencyTtl?: number
  retry?: RetryPolicy
}

// 事件任務
interface EventTask {
  id: string
  name: string
  payload: any
  options: EventOptions
  createdAt: Date
  priority: EventPriority
}
```

**驗收標準**：
- [ ] 所有接口定義完整
- [ ] 類型註解清晰
- [ ] 註釋說明充分
- [ ] 導出正確

**估計工作量**：1-2 小時

---

### ✅ Task 1.1.4: 實現 Feature Flag: events.asyncByDefault

**檔案**：`packages/core/src/config/CoreConfig.ts`

**目標**：
支持通過配置控制異步派發預設行為

**詳細需求**：

```typescript
interface CoreConfig {
  events?: {
    asyncByDefault?: boolean     // 默認異步模式
    migrationMode?: 'sync' | 'hybrid' | 'async'
    queueConfig?: {
      maxDepth?: number
      batchSize?: number
    }
  }
}

// 環境變數支持
// GRAVITO_EVENTS_ASYNC_BY_DEFAULT=true
// GRAVITO_EVENTS_MIGRATION_MODE=hybrid
```

**使用方式**：

```typescript
// 通過配置
const core = new Core({
  events: {
    asyncByDefault: true,
    migrationMode: 'hybrid',
  }
})

// 通過環境變數
process.env.GRAVITO_EVENTS_ASYNC_BY_DEFAULT = 'true'
```

**驗收標準**：
- [ ] 環境變數解析正確
- [ ] 配置默認值合理
- [ ] 配置驗證邏輯正確
- [ ] 文檔完整

**估計工作量**：1-2 小時

---

### ✅ Task 1.1.5: 編寫單元測試（80%+ 覆蓋率）

**檔案**：`packages/core/tests/HookManager.async.test.ts`

**目標**：
確保異步派發邏輯正確，覆蓋率達 80%+

**測試場景**：

```typescript
describe('HookManager - Async Dispatch', () => {
  // 1. 基礎異步派發
  it('should dispatch events asynchronously', async () => {
    const order = await core.hooks.doActionAsync('order:created', { orderId: '123' }, {
      async: true
    })
    // 驗證：事件被異步處理
  })

  // 2. 優先級隊列
  it('should process high priority events first', async () => {
    // 發送多個優先級不同的事件
    // 驗證：高優先級事件先完成
  })

  // 3. 順序保證
  it('should maintain order with partition ordering', async () => {
    // 發送多個相同 orderId 的事件
    // 驗證：相同分區內的事件順序正確
  })

  // 4. 超時控制
  it('should timeout long-running listeners', async () => {
    // 設置超時，監聽器超時
    // 驗證：事件因超時而拋出錯誤
  })

  // 5. 向後相容
  it('should be backward compatible with sync mode', async () => {
    // 調用舊 API
    // 驗證：仍可同步執行
  })

  // 6. 冪等性
  it('should deduplicate with idempotencyKey', async () => {
    // 發送相同 idempotencyKey 的事件
    // 驗證：只執行一次
  })
})
```

**涵蓋範圍**：
- ✅ HookManager.doActionAsync() - 主流程
- ✅ EventPriorityQueue - 隊列邏輯
- ✅ 優先級排序
- ✅ 順序保證
- ✅ 超時控制
- ✅ 冪等性
- ✅ 向後相容

**驗收標準**：
- [ ] 所有測試通過
- [ ] 行覆蓋率 ≥ 80%
- [ ] 分支覆蓋率 ≥ 75%
- [ ] 邊界情況測試完整

**估計工作量**：4-5 小時

---

## 📊 工作量統計

| 任務 | 工作量 | 總計 |
|------|--------|------|
| 1.1.1 | 2-3 h | 2.5 h |
| 1.1.2 | 2-3 h | 2.5 h |
| 1.1.3 | 1-2 h | 1.5 h |
| 1.1.4 | 1-2 h | 1.5 h |
| 1.1.5 | 4-5 h | 4.5 h |
| **總計** | | **12.5 h** |

---

## ✅ 驗收標準

**General**：
- [ ] 所有 5 個任務完成
- [ ] 代碼遵循項目風格指南
- [ ] 無 lint 錯誤
- [ ] TypeScript 類型檢查通過

**Performance**：
- [ ] 基準測試通過
  ```bash
  npm run benchmark:event-system
  # 預期：異步模式吞吐量 > 同步模式 3x
  ```

**Testing**：
- [ ] 單元測試
  ```bash
  cd packages/core
  npm run test -- tests/HookManager.async.test.ts
  # 預期：所有測試通過，覆蓋率 > 80%
  ```

**Documentation**：
- [ ] API 文檔完整
- [ ] 遷移指南初稿
- [ ] 代碼註釋清晰

---

## 📝 交付物清單

- `packages/core/src/HookManager.ts` - 新增 doActionAsync 方法
- `packages/core/src/EventPriorityQueue.ts` - 優先級隊列實現
- `packages/core/src/types/events.ts` - 事件類型定義
- `packages/core/src/config/CoreConfig.ts` - 配置擴展
- `packages/core/tests/HookManager.async.test.ts` - 單元測試
- `docs/MIGRATION_GUIDE_ASYNC_EVENTS.md` - 遷移指南初稿

---

## 🔗 相關文檔

- [Phase 2: 可觀測性整合](./Phase2-可观测性整合.md)
- [Phase 3: 向後兼容性測試](./Phase3-向后兼容性测试.md)
- [Issue 1.2: Event System - Reliability](../Issue1.2-事件系统可靠性/README.md)

---

**最後更新**：2026-02-02
