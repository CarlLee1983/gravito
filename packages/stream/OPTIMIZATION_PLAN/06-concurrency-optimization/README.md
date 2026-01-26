# Phase 6: 並發處理優化（漸進式方案）

> **狀態**: 已完成 (6A + 6B)
> **預估時間**: 5-7 天（含三個子階段）
> **依賴**: Phase 4 (驅動優化), Phase 8 (Consumer 優化)
> **優先級**: 🟡 中

## 📋 漸進式實施策略

為了**大幅降低風險**，本 Phase 拆分為 **3 個可獨立實施的子階段**：

| 子階段 | 內容 | 風險等級 | 預估時間 | 建議 |
|-------|------|---------|---------|------|
| **6A** | 無 Group 並發 | 🟢 低 | 1-2 天 | ✅ 建議實施 |
| **6B** | 智能分流並發 | 🟡 中 | 2-3 天 | ✅ 建議實施 |
| **6C** | 完全並發 | 🔴 高 | 2-3 天 | ⚠️ 視需求決定 |

> **建議**：僅實施 6A + 6B 即可獲得大部分性能提升（80%），同時將風險控制在可接受範圍。

---

## 🔍 原方案問題分析

### 問題 1：重新入隊會破壞 Job 順序

```typescript
// ❌ 原方案的問題
if (this.activeGroups.has(groupId)) {
  // 重新入隊 → Job 從隊首變成隊尾，順序被破壞！
  await this.queueManager.push(job)
  return
}
```

**後果**：
- 原本順序 [A1, A2, A3] 變成 [A2, A3, A1]
- 違反 FIFO 語義

### 問題 2：Redis Group FIFO 機制在 pop 階段無效

```
Redis Group FIFO 流程：
push() → 檢查 activeSet → 放入 waitList 或 pendingList
pop()  → 直接從 waitList 取 ⚠️ 不檢查 activeSet！
complete() → 從 pendingList 提取下一個
```

**後果**：並發 pop 可能同時取到同一 group 的多個 Job

---

## 🎯 改進方案：漸進式並發

### Phase 6A：無 Group 並發（🟢 低風險）

**策略**：只對**沒有 groupId** 的 Job 啟用並發，Group Job 保持順序處理。

```typescript
class Consumer {
  private concurrency: number = 1
  private runningCount: number = 0
  private runningGroupJobs: number = 0  // 追蹤正在處理的 Group Job
  
  async start(): Promise<void> {
    while (this.running && !this.stopRequested) {
      const job = await this.queueManager.pop(queue)
      
      if (job) {
        if (job.groupId) {
          // 🔒 Group Job：必須順序處理，等待其他 Job 完成
          while (this.runningCount > 0) {
            await this.waitForSlot()
          }
          this.runningGroupJobs++
          try {
            await this.processJobSync(job)
          } finally {
            this.runningGroupJobs--
          }
        } else {
          // ✅ 無 Group Job：可以並發
          if (this.runningGroupJobs === 0 && this.runningCount < this.concurrency) {
            this.runningCount++
            this.processJobAsync(job).finally(() => {
              this.runningCount--
            })
          } else {
            // 有 Group Job 正在處理，等待後順序處理
            await this.processJobSync(job)
          }
        }
      }
    }
  }
}
```

**優點**：
- ✅ 完全保留 Group FIFO 語義
- ✅ 大部分 Job（無 groupId）獲得並發處理
- ✅ 風險極低，幾乎不會出問題

**預期效果**：
- 如果 80% Job 無 groupId → 吞吐量提升 40-60%
- 如果 50% Job 無 groupId → 吞吐量提升 25-40%

---

### Phase 6B：智能分流並發（🟡 中等風險）

**策略**：不同 Group 可並發，同一 Group 內順序處理。

```typescript
class GroupAwareConcurrentConsumer {
  private concurrency: number = 4
  private semaphore: Semaphore
  private groupLocks = new Map<string, Promise<void>>()  // Group 級別鎖
  
  async processJob(job: Job): Promise<void> {
    const groupId = job.groupId
    
    if (!groupId) {
      // 無 Group：直接並發
      await this.semaphore.acquire()
      try {
        await this.worker.process(job)
      } finally {
        this.semaphore.release()
      }
      return
    }
    
    // 有 Group：獲取 Group 級別鎖
    await this.acquireGroupLock(groupId)
    try {
      await this.semaphore.acquire()
      try {
        await this.worker.process(job)
      } finally {
        this.semaphore.release()
      }
    } finally {
      this.releaseGroupLock(groupId)
    }
  }
  
  private async acquireGroupLock(groupId: string): Promise<void> {
    // 等待該 Group 的前一個 Job 完成
    while (this.groupLocks.has(groupId)) {
      await this.groupLocks.get(groupId)
    }
    // 創建新的鎖 Promise
    let resolve: () => void
    this.groupLocks.set(groupId, new Promise(r => { resolve = r }))
    return
  }
  
  private releaseGroupLock(groupId: string): void {
    const lock = this.groupLocks.get(groupId)
    this.groupLocks.delete(groupId)
    // 通知等待者
    if (lock) {
      // resolve the promise
    }
  }
}
```

**更安全的實現：使用 p-limit + 動態 limiter**

```typescript
import pLimit from 'p-limit'

class GroupAwareConcurrentConsumer {
  private globalLimit = pLimit(4)  // 全局並發限制
  private groupLimiters = new Map<string, ReturnType<typeof pLimit>>()
  
  private getGroupLimiter(groupId: string): ReturnType<typeof pLimit> {
    if (!this.groupLimiters.has(groupId)) {
      // 每個 Group 的並發數為 1（保證順序）
      this.groupLimiters.set(groupId, pLimit(1))
    }
    return this.groupLimiters.get(groupId)!
  }
  
  async processJob(job: Job): Promise<void> {
    if (!job.groupId) {
      // 無 Group：只受全局限制
      await this.globalLimit(() => this.worker.process(job))
    } else {
      // 有 Group：先通過 Group 限制（順序），再通過全局限制（並發控制）
      const groupLimiter = this.getGroupLimiter(job.groupId)
      await groupLimiter(async () => {
        await this.globalLimit(() => this.worker.process(job))
      })
    }
  }
}
```

**優點**：
- ✅ 不同 Group 完全並發
- ✅ 同一 Group 嚴格順序
- ✅ 使用成熟的 p-limit 庫，減少自己實現的 bug

**注意事項**：
- ⚠️ 需要定期清理 `groupLimiters` Map 避免內存洩漏
- ⚠️ 需要確保 pop 的 Job 不會被其他 Consumer 重複處理

---

### Phase 6C：完全並發（🔴 高風險，可選）

**策略**：將 Group FIFO 邏輯完全移到 Driver 層的 `pop()` 階段。

```lua
-- Redis Lua 腳本：GroupAware Pop
-- 只 pop 不在 activeGroups 中的 Job
local function groupAwarePop(queue, activeGroupsKey)
  local jobs = redis.call('LRANGE', queue, -10, -1)  -- 看最後 10 個
  
  for i, jobPayload in ipairs(jobs) do
    local job = cjson.decode(jobPayload)
    local groupId = job.groupId
    
    if not groupId or redis.call('SISMEMBER', activeGroupsKey, groupId) == 0 then
      -- 這個 Job 可以被 pop
      redis.call('LREM', queue, 1, jobPayload)
      if groupId then
        redis.call('SADD', activeGroupsKey, groupId)
      end
      return jobPayload
    end
  end
  
  return nil
end
```

**問題**：
- 需要修改所有驅動的 `pop()` 實現
- 增加複雜度和測試負擔
- 可能影響 pop 性能

**建議**：除非有強烈需求，否則**不建議實施**。

---

## 📝 修訂後的實施步驟

### Step 1: 實施 Phase 6A（1-2 天）

1. **修改 ConsumerOptions**
   ```typescript
   interface ConsumerOptions {
     // ...existing options
     concurrency?: number           // 並發數（默認 1）
     groupJobsSequential?: boolean  // Group Job 是否強制順序（默認 true）
   }
   ```

2. **實現基礎並發邏輯**
   - 使用 p-limit 或自實現 Semaphore
   - Group Job 保持順序處理

3. **測試驗證**
   - 無 Group Job 並發測試
   - Group Job 順序測試
   - 混合場景測試

### Step 2: 實施 Phase 6B（2-3 天）

1. **實現 GroupAwareSemaphore**
   - 使用 p-limit 的 Group 級別限制
   - 定期清理不活躍的 Group 限制器

2. **整合到 Consumer**
   - 新增配置選項
   - 保持向後相容

3. **壓力測試**
   - 多 Group 並發測試
   - 內存洩漏測試
   - 極端場景測試

### Step 3: 評估 Phase 6C（可選）

1. **評估是否需要**
   - 分析 6A + 6B 後的性能瓶頸
   - 評估實施成本 vs 收益

2. **如果決定實施**
   - 設計 Driver 層 GroupAware Pop
   - 充分測試後再上線

---

## 📊 預期改善（修訂版）

| 實施階段 | 吞吐量提升 | 風險等級 | 建議 |
|---------|----------|---------|------|
| Phase 6A | 25-50% | 🟢 低 | ✅ 必須實施 |
| Phase 6A + 6B | 40-70% | 🟡 中 | ✅ 建議實施 |
| Phase 6A + 6B + 6C | 50-100% | 🔴 高 | ⚠️ 視需求決定 |

---

## ⚠️ 注意事項

1. **默認並發數為 1**：保持向後相容，用戶需明確啟用並發
2. **Group Job 優先順序**：當有 Group Job 等待時，減少並發 pop 頻率
3. **優雅關閉**：需要等待所有進行中的 Job 完成
4. **監控告警**：建議添加 Group 鎖等待時間監控

---

## 📈 量測指標與門檻

- **吞吐量**: 6A 提升 >= 25%，6B 提升 >= 40%
- **順序正確性**: Group FIFO 測試 100% 通過
- **併發延遲**: P95 延遲不得回歸 >10%

## 🧪 測試矩陣

- **無 Group**: 並發處理正確性 + 吞吐提升
- **有 Group**: 嚴格順序與無重複處理
- **混合場景**: 多 Group + 無 Group 同時存在
- **資源**: 記憶體洩漏/鎖累積監控

## 🔁 回滾與切換策略

- `concurrency` 默認 1，可立即切回順序模式
- 6B group limiter 可用 Feature Flag 關閉

---

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

---

## ✅ 完成標準

### Phase 6A
- [x] 基礎並發實現完成
- [x] Group Job 順序處理驗證
- [x] 測試覆蓋率 > 80%

### Phase 6B
- [x] GroupAwareSemaphore 實現完成 (via p-limit)
- [x] 內存洩漏測試通過 (Verified cleanup logic)
- [x] 壓力測試通過 (Verified mixed concurrency)
- [x] 文檔更新完成 (Updated types.ts/ConsumerOptions)

### Phase 6C（可選）
- [ ] 需求評估完成 (Skipped as current solution is sufficient)
- [ ] 如實施：Driver 層修改完成
- [ ] 如實施：全面測試通過
