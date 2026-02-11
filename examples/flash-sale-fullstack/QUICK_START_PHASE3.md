# 🚀 Phase 3 快速啟動指南

**準備時間**：5 分鐘
**開始時間**：2026-02-11 09:00
**分支**：`feature/flash-sale-p1.3-phase3-continuation`

---

## ⚡ 5 分鐘快速檢查清單

### 1️⃣ 確認環境（1 分鐘）

```bash
# 檢查分支
git branch
# 應該顯示: feature/flash-sale-p1.3-phase3-continuation

# 檢查 git 狀態
git status
# 應該顯示: nothing to commit, working tree clean

# 檢查最新提交
git log --oneline -3
```

### 2️⃣ 驗證現有測試（2 分鐘）

```bash
cd examples/flash-sale-fullstack

# 快速測試（只跑 Phase 2 的關鍵測試）
bun test -- phase2.2 --reporter=verbose

# 預期結果：11/11 測試通過 ✅
```

### 3️⃣ 檢查代碼結構（1 分鐘）

```bash
# 確認關鍵文件存在
ls -la src/cache/events/
# 應該顯示:
#   EventAggregator.ts
#   EventQueue.ts
#   EventDeduplicator.ts
#   BackpressureManager.ts

# 確認測試目錄
ls -la src/cache/tests/
# 應該顯示多個 .test.ts 文件
```

### 4️⃣ 類型檢查（1 分鐘）

```bash
# 快速類型檢查（只檢查 cache 模塊）
bun run typecheck -- --noEmit src/cache/

# 預期結果：成功，無錯誤
```

---

## 📋 第一天任務（09:00 - 18:00）

### 上午（09:00 - 13:00）

#### 09:00 - 11:00：ObjectPool 設計與實施

```bash
# 1. 創建 ObjectPool.ts
cat > src/cache/events/ObjectPool.ts << 'EOF'
import type { CacheEvent } from './types.js'

export interface PoolStats {
  poolSize: number
  available: number
  reused: number
  created: number
  hitRate: number
}

export class CacheEventPool {
  private pool: CacheEvent[] = []
  private maxSize: number
  private createFn: () => CacheEvent
  private resetFn: (event: CacheEvent) => void
  private stats = {
    reused: 0,
    created: 0,
  }

  constructor(
    maxSize: number,
    createFn: () => CacheEvent,
    resetFn: (event: CacheEvent) => void,
  ) {
    this.maxSize = maxSize
    this.createFn = createFn
    this.resetFn = resetFn
  }

  acquire(): CacheEvent {
    if (this.pool.length > 0) {
      this.stats.reused++
      return this.pool.pop()!
    }
    this.stats.created++
    return this.createFn()
  }

  release(event: CacheEvent): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(event)
      this.pool.push(event)
    }
  }

  getStats(): PoolStats {
    return {
      poolSize: this.pool.length,
      available: this.pool.length,
      reused: this.stats.reused,
      created: this.stats.created,
      hitRate: this.stats.reused / (this.stats.reused + this.stats.created),
    }
  }
}
EOF

# 2. 檢查文件
ls -la src/cache/events/ObjectPool.ts

# 3. 類型檢查
bun run typecheck -- src/cache/events/ObjectPool.ts
```

#### 11:00 - 13:00：編寫對象池測試

```bash
# 1. 創建測試文件框架
mkdir -p src/cache/tests/phase3

cat > src/cache/tests/phase3/phase3-object-pool.test.ts << 'EOF'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CacheEventPool } from '../../events/ObjectPool.js'
import type { CacheEvent } from '../../events/types.js'

describe('CacheEventPool', () => {
  let pool: CacheEventPool
  let eventCount = 0

  beforeEach(() => {
    eventCount = 0
    pool = new CacheEventPool(
      10, // maxSize
      () => ({
        id: ++eventCount,
        type: 'invalidation',
        pattern: '',
        priority: 0,
        timestamp: Date.now(),
      } as CacheEvent),
      (event) => {
        // reset logic
      },
    )
  })

  it('should acquire event from pool', () => {
    const event = pool.acquire()
    expect(event).toBeDefined()
    expect(event.id).toBe(1)
  })

  it('should reuse released events', () => {
    const event1 = pool.acquire()
    pool.release(event1)
    const event2 = pool.acquire()
    expect(event2).toBe(event1)
  })

  it('should track stats correctly', () => {
    pool.acquire()
    const stats = pool.getStats()
    expect(stats.created).toBe(1)
    expect(stats.reused).toBe(0)
  })

  it('should respect max pool size', () => {
    const smallPool = new CacheEventPool(2, () => ({ id: 0 } as any), () => {})
    const e1 = smallPool.acquire()
    const e2 = smallPool.acquire()
    const e3 = smallPool.acquire()

    smallPool.release(e1)
    smallPool.release(e2)
    smallPool.release(e3) // Should not be stored

    const stats = smallPool.getStats()
    expect(stats.available).toBeLessThanOrEqual(2)
  })
})
EOF

# 2. 運行測試
bun test src/cache/tests/phase3/phase3-object-pool.test.ts

# 預期結果：4/4 測試通過 ✅
```

### 下午（13:00 - 18:00）

#### 13:00 - 15:00：EventAggregator 集成

```bash
# 1. 備份原始文件
cp src/cache/events/EventAggregator.ts src/cache/events/EventAggregator.ts.backup

# 2. 修改 EventAggregator 使用對象池
# 在 constructor 中添加：
#   this.eventPool = new CacheEventPool(...)

# 3. 在 submit() 中修改為：
#   const event = this.eventPool.acquire()
#   // 設置事件字段
#   this.queue.push(event)

# 4. 在 processEvents() 中修改為：
#   this.eventPool.release(event)
```

#### 15:00 - 17:00：集成測試

```bash
# 1. 運行所有 Phase 2 測試確保沒有回歸
bun test -- phase2

# 預期結果：全部通過 ✅

# 2. 編寫集成測試驗證對象池在實際流程中的工作
cat > src/cache/tests/phase3/phase3-integration.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'
import { EventAggregator } from '../../events/EventAggregator.js'

describe('ObjectPool Integration', () => {
  it('should use pool efficiently in EventAggregator', async () => {
    const aggregator = new EventAggregator({} as any)

    // Submit many events
    for (let i = 0; i < 100; i++) {
      aggregator.submit({
        type: 'invalidation',
        pattern: `product:${i}`,
        priority: 0,
      })
    }

    // Check pool stats
    const stats = aggregator.getPoolStats()
    expect(stats.reused).toBeGreaterThan(0)
    expect(stats.hitRate).toBeGreaterThan(0.5) // At least 50% reuse
  })
})
EOF

bun test src/cache/tests/phase3/phase3-integration.test.ts
```

#### 17:00 - 18:00：每日總結

```bash
# 1. 檢查完成情況
git status

# 2. 提交代碼
git add -A
git commit -m "feat: [cache] Phase 3 Day 1 - ObjectPool 實施和集成"

# 3. 查看進度
git log --oneline -5

# 4. 編寫日志
cat > docs/PHASE3_DAY1_SUMMARY.md << 'EOF'
# Phase 3 Day 1 總結

## 完成項
- ✅ ObjectPool 設計實施
- ✅ ObjectPool 單元測試（4/4 通過）
- ✅ EventAggregator 集成
- ✅ 集成測試驗證

## 預期結果
- 對象池複用率 > 50%
- 吞吐量改進 15%

## 下一步
- Day 2：批量提交優化
EOF
```

---

## 📈 Day 2 快速任務（09:00 - 18:00）

### 上午：批量提交優化（09:00 - 13:00）

```bash
# 1. 創建 BatchSubmitter.ts
# 2. 編寫測試
# 3. 集成到 EventAggregator
# 4. 驗證改進

bun test -- phase3  # 應該有更多測試通過
```

### 下午：性能驗證（13:00 - 18:00）

```bash
# 1. 運行性能基準測試
bun test -- benchmark

# 2. 對比 Phase 2 和 Phase 3
# 預期結果：1,015 → 2,000+ ops/sec

# 3. 記憶體和延遲驗證
# 4. 最終文檔編寫
```

---

## 🔧 常用命令速查

### 測試相關

```bash
# 運行全部測試
bun test

# 運行特定測試
bun test -- phase3

# 運行指定文件
bun test src/cache/tests/phase3/phase3-object-pool.test.ts

# 觀看模式（自動重跑）
bun test --watch

# 只運行失敗的測試
bun test --reporter=verbose

# 性能測試
bun test -- --grep "benchmark|performance"
```

### 代碼質量

```bash
# 類型檢查
bun run typecheck

# Lint 檢查
bun run check

# 自動修復
bun run check:fix

# 格式化代碼
bun run format
```

### Git 操作

```bash
# 查看狀態
git status

# 查看變更
git diff

# 提交代碼
git add -A
git commit -m "feat: [cache] <描述>"

# 查看日誌
git log --oneline -10

# 推送到遠程
git push origin feature/flash-sale-p1.3-phase3-continuation
```

---

## 📊 實時進度追蹤

### 預期成果

```
Day 1 (2026-02-11)：
  ✅ ObjectPool 實施 & 測試（15%）
  ⏳ BatchSubmitter 計劃（0%）

Day 2 (2026-02-12)：
  ⏳ BatchSubmitter 實施 & 測試（20%）
  ⏳ 性能驗證 & 文檔（50%）

最終：
  - 吞吐量：1,015 → 2,000+ ops/sec
  - 測試：290+/290+ 通過
  - 文檔：完整交付
```

### 性能基準對比

```
基線（Phase 2）：      1,015 ops/sec  ████░░░░░░
目標（Phase 3）：      2,000 ops/sec  ████████░░
最終目標（Phase 5）：  5,000 ops/sec  ██████████
```

---

## ⚠️ 常見問題

### Q1：測試失敗怎麼辦？

```bash
# 1. 查看詳細錯誤
bun test -- --reporter=verbose

# 2. 檢查類型
bun run typecheck

# 3. 查看最近的 commit
git log --oneline -3
git diff HEAD~1

# 4. 回到上一個版本
git reset --hard HEAD~1
```

### Q2：性能沒有改進怎麼辦？

```bash
# 1. 檢查是否正確集成
git diff

# 2. 運行基準測試
bun test -- phase2-performance-baseline

# 3. 檢查實際代碼是否被調用
# 添加 console.log 追蹤執行路徑
```

### Q3：記憶體洩漏怎麼辦？

```bash
# 1. 運行長時間測試
bun test -- --timeout 120000

# 2. 監控堆內存
# 添加 setInterval 定期打印 process.memoryUsage()

# 3. 檢查對象是否被正確釋放
```

---

## 📞 關鍵文檔索引

| 文檔 | 用途 |
|------|------|
| P1.3_PHASE3_PLAN.md | Phase 3 完整計劃 |
| CONTINUATION_TASKS.md | 所有接續任務 |
| P1.3_PHASE2_FINAL_REPORT.md | Phase 2 成果總結 |
| P1_READINESS_CHECKLIST.md | P1 完成度檢查 |

---

## ✅ 檢查清單

### 開始前

- [ ] 確認分支：`feature/flash-sale-p1.3-phase3-continuation`
- [ ] git 狀態清潔
- [ ] 所有 Phase 2 測試通過
- [ ] TypeScript 檢查無誤

### Day 1 結束

- [ ] ObjectPool 實施完成
- [ ] 相關測試通過
- [ ] EventAggregator 集成完成
- [ ] 代碼提交到 git

### Day 2 結束

- [ ] BatchSubmitter 實施完成
- [ ] 性能驗證完成
- [ ] 所有測試通過
- [ ] 文檔編寫完成

### 最終驗收

- [ ] 吞吐量達到 2,000+ ops/sec
- [ ] 所有測試通過（290+/290+）
- [ ] 回歸測試通過
- [ ] 文檔完整

---

**開始時間**：2026-02-11 09:00
**預期完成**：2026-02-12 18:00
**狀態**：🟢 準備開始
**下一步**：確認環境後開始 ObjectPool 設計

祝好運！🚀
