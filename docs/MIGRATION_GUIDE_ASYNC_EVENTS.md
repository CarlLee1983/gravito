# 異步事件系統遷移指南

本指南幫助您從 Gravito 的傳統同步事件系統遷移到新的異步事件系統。

## 📋 目錄

- [概述](#概述)
- [向後相容性](#向後相容性)
- [三階段遷移路徑](#三階段遷移路徑)
- [新功能詳解](#新功能詳解)
- [最佳實踐](#最佳實踐)
- [性能基準](#性能基準)
- [常見問題](#常見問題)

## 概述

Gravito 的異步事件系統提供：

✅ **優先級隊列** - 高、正常、低三級優先級處理
✅ **順序保證** - 分區級別的事件順序保證
✅ **冪等性** - 重複事件自動去重
✅ **超時控制** - 可配置的回調執行超時
✅ **重試機制** - 指數/線性退避重試
✅ **死信隊列** - 失敗事件持久化
✅ **熔斷器** - 故障隔離和自動恢復
✅ **背壓管理** - 隊列滿時的策略處理

## 向後相容性

**完全向後相容！** 現有代碼無需修改即可繼續工作。

```typescript
// 舊代碼，完全支持
hookManager.addAction('user:registered', async (user) => {
  await sendWelcomeEmail(user)
})

await hookManager.doAction('user:registered', user)
```

### 相容性保證

- 現有的 `doAction()` API 保持不變
- 現有的 `addAction()` / `addFilter()` API 保持不變
- 現有的事件監聽器完全相容
- 沒有破壞性變更

## 三階段遷移路徑

### 第 1 階段：Sync（現有模式，預設）

使用傳統的同步事件派發，為了相容性這是預設配置。

```typescript
const hookManager = new HookManager({
  migrationMode: 'sync'  // 預設值
})

// 所有事件都同步執行
await hookManager.doAction('user:registered', user)
```

**優點**：
- 完全向後相容
- 執行順序完全確定
- 調試簡單

**缺點**：
- 阻塞式執行
- 一個失敗的監聽器會阻塞其他監聽器
- 性能差

### 第 2 階段：Hybrid（推薦）

自動檢測異步監聽器，智能選擇執行模式。

```typescript
const hookManager = new HookManager({
  migrationMode: 'hybrid'  // 推薦
})

// 如果有異步監聽器，自動使用異步派發
hookManager.addAction('user:registered', async (user) => {
  await sendWelcomeEmail(user)  // 異步操作
})

// 自動使用異步，不會阻塞
await hookManager.doAction('user:registered', user)
```

**優點**：
- 自動優化
- 漸進式遷移
- 最小代碼改動

**缺點**：
- 自動檢測有開銷
- 行為可能隱式

### 第 3 階段：Async（最終狀態）

完全異步執行，最佳性能和功能。

```typescript
const hookManager = new HookManager({
  migrationMode: 'async'  // 最優性能
})

// 所有事件異步執行
await hookManager.doActionAsync('user:registered', user, {
  priority: 'high',
  timeout: 5000,
  ordering: 'partition',
  partitionKey: `user:${user.id}`
})
```

**優點**：
- 最佳性能
- 完整功能支持
- 錯誤隔離

**缺點**：
- 事件處理異步化
- 需要適應異步模式

## 新功能詳解

### 1. 優先級隊列

事件按優先級處理：高 > 正常 > 低

```typescript
// 高優先級 - 立即處理
await hookManager.doActionAsync('payment:succeeded', data, {
  priority: 'high'
})

// 正常優先級 - 標準處理
await hookManager.doActionAsync('order:confirmed', data, {
  priority: 'normal'  // 預設值
})

// 低優先級 - 後台處理
await hookManager.doActionAsync('analytics:event', data, {
  priority: 'low'
})
```

### 2. 順序保證

保證相同分區內的事件有序執行。

```typescript
// 訂單相關事件必須有序執行
const orderId = '12345'

await hookManager.doActionAsync('order:created', { orderId }, {
  ordering: 'partition',
  partitionKey: `order:${orderId}`
})

await hookManager.doActionAsync('order:paid', { orderId }, {
  ordering: 'partition',
  partitionKey: `order:${orderId}`
})

await hookManager.doActionAsync('order:shipped', { orderId }, {
  ordering: 'partition',
  partitionKey: `order:${orderId}`
})

// 保證執行順序：created -> paid -> shipped
```

不同分區可並行執行：

```typescript
// 不同訂單可並行處理
const order1 = '12345'
const order2 = '67890'

await Promise.all([
  hookManager.doActionAsync('order:process', { orderId: order1 }, {
    ordering: 'partition',
    partitionKey: `order:${order1}`
  }),
  hookManager.doActionAsync('order:process', { orderId: order2 }, {
    ordering: 'partition',
    partitionKey: `order:${order2}`
  })
])

// order1 和 order2 可同時處理
```

### 3. 冪等性

重複的事件自動去重。

```typescript
// 防止重複支付
const paymentKey = `payment:${orderId}:${Date.now()}`

// 如果相同 key 在 TTL 內出現，會被跳過
await hookManager.doActionAsync('payment:process', paymentData, {
  idempotencyKey: paymentKey,
  ttl: 60000  // 1 分鐘內去重
})

// 相同 key 的重複事件會被忽略
await hookManager.doActionAsync('payment:process', paymentData, {
  idempotencyKey: paymentKey,
  ttl: 60000
})
// 第二個事件被跳過
```

### 4. 超時控制

為回調設置執行超時。

```typescript
await hookManager.doActionAsync('user:register', userData, {
  timeout: 5000  // 5 秒超時
})

// 如果回調超過 5 秒，拋出 TimeoutError
```

### 5. 重試機制

失敗事件自動重試。

```typescript
// 指數退避重試
await hookManager.doActionAsync('email:send', emailData, {
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,     // 1s, 2s, 4s, 8s...
    maxDelayMs: 30000,
    dlqAfterMaxRetries: true  // 最終失敗送 DLQ
  }
})

// 線性退避重試
await hookManager.doActionAsync('notification:send', notifData, {
  retry: {
    maxRetries: 3,
    backoff: 'linear',
    initialDelayMs: 2000      // 2s, 4s, 6s...
  }
})
```

### 6. 死信隊列

失敗事件持久化。

```typescript
const hookManager = new HookManager({
  enableDLQ: true  // 啟用死信隊列
})

// 重新隊列失敗事件
const dlqEntries = hookManager.getDLQEntries({ eventName: 'email:send' })
for (const entry of dlqEntries) {
  await hookManager.requeueDLQEntry(entry.id)
}

// 批量重隊列
const count = await hookManager.requeueDLQBatch('email:send')
```

### 7. 熔斷器

故障隔離和自動恢復。

```typescript
hookManager.addAction('external:api', async (data) => {
  await callUnstableAPI(data)
}, {
  circuitBreaker: {
    failureThreshold: 5,      // 5 次失敗後打開
    resetTimeout: 30000,      // 30 秒後嘗試恢復
    halfOpenRequests: 3       // 半開狀態允許 3 個請求
  }
})
```

### 8. 背壓管理

隊列滿時的處理策略。

```typescript
const hookManager = new HookManager({
  queue: {
    maxSize: 1000,
    strategy: 'drop-oldest'  // drop-newest, reject, ignore
  }
})

// 當隊列超過 1000，會丟棄最舊的低優先級事件
```

## 自動檢測 API

### 檢測事件派發模式

使用 `detectMode()` 檢測事件實際使用的派發模式：

```typescript
const mode = hookManager.detectMode('user:registered')
// 'sync' 或 'async'

if (mode === 'async') {
  console.log('此事件使用異步派發')
} else {
  console.log('此事件使用同步派發')
}
```

支持傳遞選項覆蓋全局配置：

```typescript
// 檢測在 'hybrid' 模式下是否會異步執行
const mode = hookManager.detectMode('user:registered', {
  migrationMode: 'hybrid'
})

// 檢測是否啟用了 asyncByDefault
const mode = hookManager.detectMode('order:created', {
  asyncByDefault: true
})
```

### 檢測監聽器是否為異步

使用 `isAsyncListener()` 檢查回調是否為異步函數：

```typescript
const isAsync = hookManager.isAsyncListener(callback)

// 有用於診斷自動檢測行為
hookManager.addAction('event:test', async () => {
  console.log('異步監聽器')
}, {
  onAdded: (listener) => {
    console.log(`監聽器是異步: ${hookManager.isAsyncListener(listener)}`)
  }
})
```

### 抑制遷移警告

使用 `suppressMigrationWarning()` 抑制特定事件的警告：

```typescript
// 抑制 'email:send' 事件的遷移警告
hookManager.suppressMigrationWarning('email:send')

// 之後 'email:send' 不會再顯示警告
hookManager.doAction('email:send', data)
```

也可以通過環境變數全局抑制所有警告：

```bash
# 禁用所有遷移警告
export GRAVITO_SUPPRESS_MIGRATION_WARNING=true
```

或抑制特定事件（逗號分隔）：

```bash
# 只抑制這些事件的警告
export GRAVITO_SUPPRESS_MIGRATION_WARNING=email:send,log:write
```

## 最佳實踐

### 1. 選擇合適的遷移模式

```typescript
// 新項目 → async
const hookManager = new HookManager({ migrationMode: 'async' })

// 現有項目升級 → hybrid（漸進遷移）
const hookManager = new HookManager({ migrationMode: 'hybrid' })

// 保守項目 → sync（保持不變）
const hookManager = new HookManager({ migrationMode: 'sync' })
```

### 2. 使用分區保證順序

```typescript
// ❌ 不好：依賴全局順序（緩慢）
await hookManager.doActionAsync('event:1', data, {
  ordering: 'strict'
})

// ✅ 好：按資源分區（快速且有序）
await hookManager.doActionAsync('event:1', data, {
  ordering: 'partition',
  partitionKey: resourceId
})
```

### 3. 使用優先級區分重要性

```typescript
// ❌ 不好：所有事件同優先級
await hookManager.doActionAsync('event', data)

// ✅ 好：根據重要性設置優先級
if (isPayment) {
  await hookManager.doActionAsync('event', data, { priority: 'high' })
} else if (isNotification) {
  await hookManager.doActionAsync('event', data, { priority: 'normal' })
} else {
  await hookManager.doActionAsync('event', data, { priority: 'low' })
}
```

### 4. 為關鍵操作設置冪等性

```typescript
// 支付、訂單等關鍵操作必須冪等
await hookManager.doActionAsync('payment:process', paymentData, {
  idempotencyKey: `payment:${orderId}:${timestamp}`,
  ttl: 3600000  // 1 小時
})
```

### 5. 配置適當的超時

```typescript
// 快速操作（如日誌）
await hookManager.doActionAsync('log:write', logData, {
  timeout: 1000  // 1 秒
})

// 中等操作（如通知）
await hookManager.doActionAsync('notify:send', notifData, {
  timeout: 5000  // 5 秒
})

// 長時間操作（如數據處理）
await hookManager.doActionAsync('data:process', processData, {
  timeout: 30000  // 30 秒
})
```

### 6. 設置合理的重試策略

```typescript
// 幂等操作 → 更多重試
await hookManager.doActionAsync('idempotent:op', data, {
  retry: { maxRetries: 5 }
})

// 非冪等操作 → 少重試
await hookManager.doActionAsync('side:effect', data, {
  retry: { maxRetries: 1 }
})

// 外部 API → 指數退避
await hookManager.doActionAsync('external:api', data, {
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000
  }
})
```

### 7. 使用自動檢測 API 診斷行為

```typescript
// 在 hybrid 模式下診斷事件實際使用的派發方式
const hookManager = new HookManager({ migrationMode: 'hybrid' })

hookManager.addAction('user:registered', async (user) => {
  await sendEmail(user)
})

// 檢查此事件實際使用的派發模式
const mode = hookManager.detectMode('user:registered')
console.log(`user:registered 使用 ${mode} 派發`)
// 輸出：user:registered 使用 async 派發（因為監聽器是異步的）
```

### 8. 在遷移過程中抑制警告

```typescript
// 在逐步遷移中，為已驗證的事件抑制警告
const hookManager = new HookManager({
  migrationMode: 'hybrid',
  showDeprecationWarnings: true
})

// 標記已驗證的事件
const verifiedEvents = ['order:created', 'payment:processed', 'user:registered']
verifiedEvents.forEach(event => hookManager.suppressMigrationWarning(event))

// 已驗證的事件不會顯示警告，其他事件仍會顯示
```

## 性能基準

### 吞吐量對比

| 模式 | 吞吐量 | 說明 |
|------|-------|------|
| **Sync** | ~200,000 events/sec | 基線，純同步 |
| **Async** | ~2,000 events/sec | 支持完整功能 |
| **Async+DLQ** | ~1,800 events/sec | 加上持久化 |
| **Async+Partition** | ~1,900 events/sec | 加上順序保證 |

### 實際應用建議

- **同步處理**（< 100 監聽器）：使用 Sync
- **中型應用**（100-1000 監聽器）：使用 Hybrid 或 Async
- **高併發應用**（> 1000 監聽器）：使用 Async + 優化配置

## 常見問題

### Q1. 我應該何時使用異步？

**A:** 以下情況優先考慮異步：
- 監聽器執行耗時操作（IO、網路調用）
- 有多個監聽器且執行順序不重要
- 需要故障隔離（一個失敗不影響其他）
- 應用需要高併發

### Q2. 異步會改變執行順序嗎？

**A:** 取決於配置：
- `ordering: 'none'`（預設）→ 順序不確定
- `ordering: 'partition'` → 相同分區內有序
- `ordering: 'strict'` → 全局有序（但很慢）

### Q3. 我的監聽器拋出異常，會發生什麼？

**A:** 根據配置：
- **Sync**：異常被捕捉，後續監聽器繼續執行
- **Async**：異常被捕捉，重試或送 DLQ
- **有熔斷器**：失敗累積後自動斷路

### Q4. 冪等性如何工作？

**A:** 使用 idempotencyKey 和 TTL：
1. 事件到達時，檢查 key 是否在快取中
2. 如果在且未過期，事件被跳過
3. 如果不在或已過期，事件執行並快取
4. TTL 過期後，key 從快取移除

### Q5. DLQ 中的事件何時被清理？

**A:** 手動管理：
- 使用 `hookManager.requeueDLQEntry()` 重隊列
- 使用 `hookManager.deleteDLQEntry()` 刪除
- 使用 `hookManager.getDLQEntries()` 查詢

### Q6. 性能不如同步，為何還要用異步？

**A:** 因為：
- 同步模式一個失敗影響全部，不可靠
- 非同步模式支持失敗隔離和自動恢復
- 異步模式雖然吞吐量低，但總延遲更低（並行処理）
- 對於關鍵系統，可靠性比吞吐量更重要

### Q7. 如何監控異步事件的執行？

**A:** 使用隊列深度 API：

```typescript
const depth = hookManager.getQueueDepth()
const highDepth = hookManager.getQueueDepthByPriority('high')
const dlqCount = hookManager.getDLQCount('event:name')
```

### Q8. 可以混合使用同步和異步嗎？

**A:** 可以：
- `migrationMode: 'hybrid'` 自動檢測
- 明確指定 `async: true/false` 覆蓋配置
- 同一事件可有同步和異步監聽器

### Q9. 如何檢測事件實際使用的派發模式？

**A:** 使用 `detectMode()` 檢測事件的派發方式：

```typescript
const mode = hookManager.detectMode('user:registered')
if (mode === 'async') {
  console.log('事件使用異步派發')
}
```

配置選項會影響檢測結果：
- `migrationMode: 'sync'` → 總是 'sync'
- `migrationMode: 'async'` → 總是 'async'
- `migrationMode: 'hybrid'` → 根據監聽器自動檢測
- 可傳遞選項覆蓋全局配置

### Q10. 如何檢查監聽器是否為異步函數？

**A:** 使用 `isAsyncListener()` 檢查：

```typescript
const isAsync = hookManager.isAsyncListener(myCallback)
console.log(`監聽器是異步: ${isAsync}`)
```

用於診斷自動檢測行為。在 `hybrid` 模式下，異步監聽器會觸發異步派發。

### Q11. 如何在遷移期間抑制警告？

**A:** 使用 `suppressMigrationWarning()` 抑制特定事件的警告：

```typescript
// 抑制單個事件
hookManager.suppressMigrationWarning('email:send')

// 或批量抑制已驗證的事件
['order:created', 'payment:processed'].forEach(e =>
  hookManager.suppressMigrationWarning(e)
)
```

也可通過環境變數全局抑制：
```bash
export GRAVITO_SUPPRESS_MIGRATION_WARNING=true
# 或指定特定事件
export GRAVITO_SUPPRESS_MIGRATION_WARNING=email:send,log:write
```

## 遷移檢查清單

- [ ] 選擇遷移模式（sync → hybrid → async）
- [ ] 更新 HookManager 配置
- [ ] 識別關鍵操作，添加冪等性
- [ ] 為耗時操作設置超時
- [ ] 配置重試和死信隊列
- [ ] 為核心業務添加熔斷器
- [ ] 測試優先級和順序保證
- [ ] 建立監控和告警
- [ ] 性能測試和基準對比
- [ ] 文檔更新和團隊培訓

## 技術支持

遇到問題？

1. 查看源碼文檔：`packages/core/src/HookManager.ts`
2. 運行基準測試：`bun run benchmark:event-system`
3. 檢查死信隊列：`hookManager.getDLQEntries()`
4. 啟用調試日誌：`showDeprecationWarnings: true`

---

**版本**：1.0.0
**更新**：2026-02-03
**相關文檔**：[事件系統 API 文檔](./EVENT_SYSTEM_API.md)
