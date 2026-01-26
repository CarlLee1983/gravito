# 版本遷移指南

> **適用版本**: v3.0.x → v3.1.0 → v3.2.0 → v3.3.0

---

## 概述

本指南說明 `@gravito/flare` 各版本升級時需要注意的變更和遷移步驟。

---

## v3.0.x → v3.1.0

### Breaking Changes

**無 Breaking Changes** - v3.1.0 保持完全向後相容。

### 新增功能

#### 1. 發送結果返回

`send()` 方法現在返回 `NotificationResult` 物件：

```typescript
// v3.0.x（舊行為，仍然有效）
await notifications.send(user, new WelcomeEmail())

// v3.1.0（新功能）
const result = await notifications.send(user, new WelcomeEmail())
if (!result.allSuccess) {
  console.error('Failed channels:', result.results.filter(r => !r.success))
}
```

#### 2. 可選拋出錯誤

新增 `throwOnError` 選項：

```typescript
// 失敗時拋出 AggregateError
try {
  await notifications.send(user, new WelcomeEmail(), { throwOnError: true })
} catch (error) {
  if (error instanceof AggregateError) {
    console.error('Failed:', error.errors)
  }
}
```

### 遷移步驟

1. **無需修改現有代碼** - 所有現有呼叫方式仍然有效
2. **可選**：更新錯誤處理邏輯以利用新的返回值

---

## v3.1.0 → v3.2.0

### Breaking Changes

**無 Breaking Changes** - 所有新功能為可選。

### 新增功能

#### 1. 通知生命週期 Hook

```typescript
// 監聽通知發送
core.hooks.on('notification:sent', (payload) => {
  console.log(`Sent to ${payload.notifiable.getNotifiableId()}`)
  console.log(`Success: ${payload.allSuccess}`)
})

// 監聽失敗
core.hooks.on('notification:channel:failed', (payload) => {
  alertService.send({
    message: `Channel ${payload.channel} failed`,
    error: payload.error.message
  })
})
```

**可用 Hook 清單**:

| Hook | 時機 |
|------|------|
| `notification:sending` | 發送開始前 |
| `notification:queued` | 加入佇列後 |
| `notification:sent` | 所有通道完成後 |
| `notification:channel:sending` | 單一通道發送前 |
| `notification:channel:sent` | 單一通道成功後 |
| `notification:channel:failed` | 單一通道失敗後 |

#### 2. 並行通道發送

```typescript
// 預設：並行發送（新行為，效能更好）
await notifications.send(user, new MultiChannelNotification())

// 保持序列發送（舊行為）
await notifications.send(user, new MultiChannelNotification(), {
  parallel: false
})

// 限制並發數（避免 rate limit）
await notifications.send(user, new MultiChannelNotification(), {
  concurrency: 2
})
```

#### 3. 批次發送

```typescript
// 批次發送給多個接收者
const users = await db.users.findAll()
const result = await notifications.sendBatch(users, new WeeklyDigest())
console.log(`Sent ${result.success}/${result.total}`)

// 串流發送（大量資料）
for await (const result of notifications.sendBatchStream(
  db.users.stream(),
  new WeeklyDigest()
)) {
  if (!result.allSuccess) {
    console.error(`Failed for ${result.notifiable}`)
  }
}
```

#### 4. 配置驗證

配置錯誤現在會在建構時即拋出錯誤：

```typescript
// v3.1.0（執行時才發現錯誤）
const orbit = new OrbitFlare({ enableSlack: true })
// 只有在發送 Slack 通知時才會失敗

// v3.2.0（建構時就會拋出錯誤）
const orbit = new OrbitFlare({ enableSlack: true })
// Error: Slack channel enabled but webhookUrl not provided
```

### 遷移步驟

1. **無需修改現有代碼** - 預設行為變更（並行發送）通常是正向改進
2. **如果依賴序列發送順序**：添加 `{ parallel: false }` 選項
3. **可選**：添加 Hook 監聽以改善可觀察性
4. **建議**：檢查配置是否完整，避免建構時錯誤

### 潛在影響

#### 並行發送的影響

如果您的通道有相互依賴（例如必須先發郵件再發 Slack），需要明確使用序列發送：

```typescript
// 如果順序重要
await notifications.send(user, notification, { parallel: false })
```

#### 配置驗證的影響

如果您的配置不完整但之前未使用該通道，現在會在建構時失敗：

```typescript
// 修復方式 1：提供完整配置
const orbit = new OrbitFlare({
  enableSlack: true,
  channels: {
    slack: { webhookUrl: 'https://hooks.slack.com/...' }
  }
})

// 修復方式 2：禁用不需要的通道
const orbit = new OrbitFlare({
  enableSlack: false  // 或直接不設置
})
```

---

## v3.2.0 → v3.3.0

### Breaking Changes

**無 Breaking Changes** - 所有新功能為可選。

### 新增功能

#### 1. 重試機制

```typescript
// 通知級別配置
class ImportantNotification extends Notification implements ShouldRetry {
  retry = {
    maxAttempts: 5,
    baseDelay: 2000,
    backoff: 'exponential'
  }
  // ...
}

// 發送時配置
await notifications.send(user, notification, {
  retry: {
    maxAttempts: 3,
    backoff: 'linear'
  }
})

// 禁用重試
await notifications.send(user, notification, { retry: false })
```

#### 2. 指標監控

```typescript
// 啟用指標收集
const manager = core.container.make('notifications')
manager.enableMetrics()

// 獲取摘要
const summary = manager.getMetrics()
console.log(`Success rate: ${(summary.totalSuccess / summary.totalSent * 100).toFixed(1)}%`)

// 獲取最近失敗
const failures = manager.getRecentFailures(10)

// Prometheus 整合
app.get('/metrics', (c) => {
  const summary = manager.getMetrics()
  return c.text(toPrometheusFormat(summary))
})
```

#### 3. AWS SNS SMS

```typescript
const orbit = OrbitFlare.configure({
  enableSms: true,
  channels: {
    sms: {
      provider: 'aws-sns',
      region: 'ap-northeast-1',
      // 可選：明確指定憑證
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
})
```

**注意**：使用 AWS SNS 需要安裝額外依賴：

```bash
bun add @aws-sdk/client-sns
```

### 遷移步驟

1. **無需修改現有代碼**
2. **如需重試功能**：
   - 讓通知類別實現 `ShouldRetry` 介面，或
   - 在 `send()` 時傳入 `retry` 選項
3. **如需指標監控**：呼叫 `manager.enableMetrics()`
4. **如需 AWS SNS**：安裝 `@aws-sdk/client-sns`

---

## 完整遷移檢查清單

### v3.0.x → v3.1.0

- [ ] 確認現有測試通過
- [ ] （可選）更新錯誤處理以利用 `NotificationResult`
- [ ] （可選）對關鍵通知使用 `throwOnError: true`

### v3.1.0 → v3.2.0

- [ ] 確認現有測試通過
- [ ] 檢查是否有依賴通道發送順序的邏輯
- [ ] 檢查 OrbitFlare 配置是否完整
- [ ] （可選）添加 Hook 監聽
- [ ] （可選）使用批次發送 API

### v3.2.0 → v3.3.0

- [ ] 確認現有測試通過
- [ ] （可選）為重要通知添加重試配置
- [ ] （可選）啟用指標監控
- [ ] （如需 AWS SNS）安裝 `@aws-sdk/client-sns`

---

## 常見問題

### Q: 升級後測試失敗，如何處理？

1. 檢查是否有依賴 `send()` 返回 `void` 的斷言
2. 檢查是否有依賴序列發送順序的測試
3. 檢查配置是否完整

### Q: 並行發送會影響 rate limit 嗎？

是的，如果通道有 rate limit，建議使用 `concurrency` 選項：

```typescript
await notifications.send(user, notification, { concurrency: 2 })
```

### Q: 重試會導致重複發送嗎？

只有在通道發送失敗時才會重試。如果您的通道不是冪等的，需要在通道實現中處理去重。

### Q: 如何回滾到舊版本？

```bash
bun add @gravito/flare@3.0.3
```

---

## 版本相容性矩陣

| @gravito/flare | @gravito/core | @gravito/stream | @gravito/signal |
|----------------|---------------|-----------------|-----------------|
| 3.0.x | >= 3.0.0 | >= 3.0.0 | >= 3.0.0 |
| 3.1.x | >= 3.0.0 | >= 3.0.0 | >= 3.0.0 |
| 3.2.x | >= 3.0.0 | >= 3.0.0 | >= 3.0.0 |
| 3.3.x | >= 3.0.0 | >= 3.0.0 | >= 3.0.0 |

---

**文檔版本**: 1.0
**最後更新**: 2025-01-23
