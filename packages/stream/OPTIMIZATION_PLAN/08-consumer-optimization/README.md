# Phase 8: Consumer 輪詢優化

> **狀態**: 部分已完成  
> **預估時間**: 1-2 天  
> **依賴**: Phase 4 (驅動優化 - BLPOP 支持)  
> **優先級**: 🟡 中

## 📋 目標

優化 Consumer 的輪詢邏輯，實現自適應輪詢間隔，減少空輪詢的 CPU 開銷。

## ✅ 已完成的優化

**立即處理邏輯** (`Consumer.ts:214-219`):
```typescript
// 已有優化：處理完 Job 後立即繼續，無等待
if (!this.stopRequested && !processed) {
  await new Promise((resolve) => setTimeout(resolve, pollInterval))
} else if (!this.stopRequested && processed) {
  // 有 Job 時：僅做 micro-task yield，不等待完整 pollInterval
  await new Promise((resolve) => setTimeout(resolve, 0))
}
```
> 此優化已在現有代碼中實現，無需重複工作。

## 🔍 待優化問題

1. ~~**固定輪詢間隔**~~: ✅ 已有立即處理邏輯
2. **空輪詢開銷**: 隊列為空時仍然頻繁輪詢，可使用 BLPOP 阻塞
3. **批量處理缺失**: Consumer 未整合 `popMany()` 進行批量獲取

## 🎯 優化策略

### 1. 自適應輪詢間隔

**實現方案**:
```typescript
class Consumer {
  private pollInterval: number = 1000
  private minInterval: number = 100    // 最小間隔
  private maxInterval: number = 5000   // 最大間隔
  private backoffMultiplier: number = 1.5
  
  private async poll(): Promise<void> {
    const job = await this.queueManager.pop(queue)
    
    if (job) {
      // 有 Job，立即處理，重置間隔
      this.pollInterval = this.minInterval
      await this.processJob(job)
    } else {
      // 無 Job，增加間隔（指數退避）
      this.pollInterval = Math.min(
        this.pollInterval * this.backoffMultiplier,
        this.maxInterval
      )
    }
    
    await sleep(this.pollInterval)
  }
}
```

### 2. 阻塞式輪詢整合 🆕

**依賴**: Phase 4 實現的 `popBlocking()` 方法

**實現方案**:
```typescript
class Consumer {
  async start(): Promise<void> {
    // ...
    while (this.running && !this.stopRequested) {
      const driver = this.queueManager.getDriver(this.connectionName)
      
      // 優先使用阻塞式輪詢（如果驅動支持）
      if (driver.popBlocking && this.options.useBlocking !== false) {
        const job = await driver.popBlocking(queue, this.options.blockingTimeout ?? 5)
        // ...
      } else {
        // Fallback: 傳統輪詢
        const job = await this.queueManager.pop(queue)
        // ...
      }
    }
  }
}
```

**配置選項**:
```typescript
consumerOptions: {
  useBlocking: true,         // 是否啟用阻塞輪詢（默認 true）
  blockingTimeout: 5,        // 阻塞超時秒數（默認 5）
}
```

### 3. 批量消費整合 🆕

**依賴**: Phase 3 實現的優化版 `popMany()`

**實現方案**:
```typescript
class Consumer {
  async start(): Promise<void> {
    // ...
    while (this.running && !this.stopRequested) {
      if (this.options.batchSize && this.options.batchSize > 1) {
        // 批量獲取
        const jobs = await driver.popMany(queue, this.options.batchSize)
        
        // 並行處理（或順序處理，取決於配置）
        if (this.options.parallelBatch) {
          await Promise.all(jobs.map(job => this.processJob(job)))
        } else {
          for (const job of jobs) {
            await this.processJob(job)
          }
        }
      } else {
        // 單條處理（現有邏輯）
        const job = await this.queueManager.pop(queue)
        // ...
      }
    }
  }
}
```

**配置選項**:
```typescript
consumerOptions: {
  batchSize: 10,             // 批量消費大小（默認 1）
  parallelBatch: false,      // 是否並行處理批量 Job（默認 false）
}
```

## 📝 實施步驟

### Step 1: 實現自適應輪詢

1. **修改 Consumer.start()**
   - 實現自適應間隔邏輯
   - 添加配置選項

2. **配置選項**
   ```typescript
   consumerOptions: {
     pollInterval: 1000,        // 初始間隔
     minPollInterval: 100,        // 最小間隔
     maxPollInterval: 5000,       // 最大間隔
     backoffMultiplier: 1.5,     // 退避倍數
   }
   ```

### Step 2: 驅動阻塞支持

1. **評估驅動支持**
   - Redis: BLPOP/BLPOPLPUSH
   - Database: 長輪詢（如支持）
   - 其他驅動: 評估阻塞能力

2. **實現阻塞輪詢**
   - 為支持的驅動實現阻塞接口
   - Consumer 使用阻塞輪詢

### Step 3: 測試和優化

1. **功能測試**
   - 自適應間隔測試
   - 阻塞輪詢測試

2. **性能測試**
   - CPU 使用率對比
   - 響應延遲測試

## 📊 預期改善

- **CPU 使用率**: 空隊列時減少 50-70%
- **響應延遲**: 有 Job 時保持低延遲（< 100ms）
- **資源效率**: 整體資源使用更高效

## ⚠️ 注意事項

1. **向後相容性**: 保持默認行為不變
2. **驅動支持**: 阻塞輪詢需要驅動支持
3. **配置平衡**: 間隔設置需要平衡響應性和資源使用

## 📈 量測指標與門檻

- **空佇列 CPU**: 降幅 >= 50%
- **有 Job 延遲**: P95 <= 100ms（視環境）
- **批量消費**: 吞吐提升 >= 20%

## 🧪 測試矩陣

- **阻塞輪詢**: BLPOP 超時與喚醒行為
- **批量消費**: batchSize 1/10/50 行為一致
- **回歸**: 單條模式與既有行為相符

## 🔁 回滾與切換策略

- `useBlocking` / `batchSize` 可配置回退
- 發生延遲異常時回到單條 `pop()`

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

## ✅ 完成標準

- [ ] 自適應輪詢實現完成
- [ ] 阻塞輪詢支持完成（如適用）
- [ ] 配置選項完善
- [ ] 性能提升驗證完成
- [ ] 文檔更新完成
