# 重試系統遷移指南

從舊重試機制升級到新的分佈式重試系統

## 📋 目錄

1. [版本對比](#版本對比)
2. [升級前檢查清單](#升級前檢查清單)
3. [8 步遷移流程](#8-步遷移流程)
4. [配置遷移](#配置遷移)
5. [代碼遷移示例](#代碼遷移示例)
6. [驗證檢查清單](#驗證檢查清單)
7. [常見陷阱與解決方案](#常見陷阱與解決方案)
8. [回滾計劃](#回滾計劃)

---

## 版本對比

### 舊重試機制 vs 新系統

| 特性 | 舊系統 | 新系統 |
|------|--------|--------|
| **架構** | 單進程 `setTimeout` | 分佈式 Bull Queue + 優雅降級 |
| **重試延遲** | 固定延遲 | 指數回退（可配置） |
| **可靠性** | 進程重啟丟失重試任務 | Redis 持久化 |
| **吞吐量** | 有限（單進程） | 高（分佈式） |
| **監控** | 無 | 完整 Prometheus + Grafana |
| **部署** | 簡單 | 需要 Redis |
| **失敗處理** | 丟棄 | DLQ + 告警 |
| **背壓管理** | 無 | 完整支持 |
| **成本** | 低 | 中等（Redis） |

### 核心 API 對比

#### 舊系統

```typescript
// 舊：簡單但功能有限
import { EventPriorityQueue } from '@gravito/core'

const queue = new EventPriorityQueue({
  retryStrategy: 'simple',
  retryDelayMs: 1000,
  maxRetries: 3
})

queue.enqueue(event, 'high')
```

#### 新系統

```typescript
// 新：功能豐富、高可靠性
import { EventPriorityQueue, RetryScheduler, BackpressureManager } from '@gravito/core'

const scheduler = new RetryScheduler({
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 60000,
  maxRetries: 5
})

const queue = new EventPriorityQueue()
queue.setRetryScheduler(scheduler)

queue.enqueue(event, 'high')
```

---

## 升級前檢查清單

### 環境準備

- [ ] 確認系統有可用的 Redis（可選但推薦）
- [ ] 檢查 Node.js 版本 >= 16
- [ ] 備份當前生產數據
- [ ] 通知相關團隊計劃升級時間
- [ ] 準備監控告警（使用新的 Prometheus 規則）

### 功能審計

- [ ] 列出所有使用舊重試機制的模塊
- [ ] 統計當前的重試事件數量
- [ ] 審查重試失敗的處理邏輯
- [ ] 檢查是否有自定義重試邏輯（可能需要適配）

### 性能基準

```bash
# 在升級前收集基準數據
# 1. 事件派發延遲
# 2. 重試成功率
# 3. 系統資源使用（CPU、內存、Redis 連接數）
```

---

## 8 步遷移流程

### 步驟 1: 安裝新依賴

```bash
# 1.1 安裝 bullmq（推薦用於生產環境）
npm install bullmq redis

# 1.2 驗證安裝
npm ls bullmq redis

# 1.3 檢查 package.json
cat package.json | grep -E "(bullmq|redis)"
```

**預期輸出**：
```json
"bullmq": "^5.0.0",
"redis": "^4.6.0"
```

### 步驟 2: 升級 @gravito/core

```bash
# 2.1 更新 core 包（確保已發佈新版本）
npm update @gravito/core

# 2.2 驗證版本
npm ls @gravito/core

# 2.3 檢查新 API 是否可用
node -e "const { RetryScheduler } = require('@gravito/core'); console.log('✅ RetryScheduler 可用')"
```

### 步驟 3: 配置 Redis

```bash
# 3.1 啟動 Redis（如果使用本地）
redis-server

# 3.2 驗證連接
redis-cli ping
# 預期輸出：PONG

# 3.3 配置環境變數
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_DB=0
```

**docker-compose 方式**（推薦生產環境）：
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### 步驟 4: 更新應用配置

#### 4.1 應用程序入口

**舊代碼**：
```typescript
// src/app.ts
import { PlanetCore, EventPriorityQueue } from '@gravito/core'

const core = new PlanetCore()
const queue = new EventPriorityQueue({
  retryStrategy: 'simple',
  retryDelayMs: 1000
})
```

**新代碼**：
```typescript
// src/app.ts
import { PlanetCore, EventPriorityQueue, RetryScheduler, BackpressureManager } from '@gravito/core'

const core = new PlanetCore()

// 新：初始化重試排程器
const scheduler = new RetryScheduler({
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 60000,
  maxRetries: 5
})

// 新：初始化背壓管理器
const backpressure = new BackpressureManager({
  warningThreshold: 500,
  criticalThreshold: 1000
})

const queue = new EventPriorityQueue()
queue.setRetryScheduler(scheduler)
queue.setBackpressureManager(backpressure)
```

#### 4.2 環境配置

**新增 .env 變數**：
```bash
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 重試配置
RETRY_INITIAL_DELAY_MS=1000
RETRY_MULTIPLIER=2
RETRY_MAX_DELAY_MS=60000
RETRY_MAX_RETRIES=5
RETRY_BACKOFF_STRATEGY=exponential

# 背壓配置
BACKPRESSURE_WARNING_THRESHOLD=500
BACKPRESSURE_CRITICAL_THRESHOLD=1000
BACKPRESSURE_RECOVERY_RATIO=0.8
```

### 步驟 5: 遷移代碼

#### 5.1 隊列初始化

**舊**：
```typescript
const queue = new EventPriorityQueue({
  retryStrategy: 'simple',
  retryDelayMs: 1000,
  maxRetries: 3
})
```

**新**：
```typescript
const scheduler = new RetryScheduler({
  initialDelayMs: 1000,
  multiplier: 2,
  maxRetries: 3
})

const queue = new EventPriorityQueue()
queue.setRetryScheduler(scheduler)
```

#### 5.2 事件派發

**舊**：
```typescript
queue.enqueue(event, 'high')
```

**新**（API 相同，內部使用新機制）：
```typescript
queue.enqueue(event, 'high')
```

✅ **API 完全相同，無需修改派發代碼！**

#### 5.3 錯誤處理

**舊**：
```typescript
queue.on('retry-failed', (event) => {
  console.error('重試失敗', event)
  // 手動添加到 DLQ
})
```

**新**：
```typescript
// 自動添加到 DLQ，無需手動處理

scheduler.on('exhausted', (eventName, reason) => {
  console.log(`事件 ${eventName} 已進入 DLQ`)
  // 事件已自動進入 DeadLetterQueue
})
```

#### 5.4 監控

**舊**：
```typescript
// 無完整監控支持
queue.on('dequeued', (event) => {
  console.log('已處理', event)
})
```

**新**：
```typescript
// 完整監控支持
scheduler.on('retry', (eventName, retryCount, delay) => {
  console.log(`重試 ${eventName}，第 ${retryCount} 次，延遲 ${delay}ms`)
})

scheduler.on('exhausted', (eventName) => {
  metrics.recordDLQEntry()
})
```

### 步驟 6: 部署與驗證

#### 6.1 測試環境部署

```bash
# 6.1.1 在測試環境運行
npm run dev

# 6.1.2 監控日誌
tail -f logs/application.log | grep -i retry

# 6.1.3 檢查 Prometheus 指標
curl http://localhost:8080/metrics | grep gravito_event_retry
```

#### 6.2 灰度部署（推薦）

```bash
# 部署到 10% 的服務器
CANARY_PERCENTAGE=10 npm run deploy:production

# 監控 30 分鐘
watch -n 10 'curl http://localhost:8080/metrics | grep gravito_event'

# 如果正常，逐步增加
CANARY_PERCENTAGE=50 npm run deploy:production
CANARY_PERCENTAGE=100 npm run deploy:production
```

#### 6.3 完整部署

```bash
# 部署到所有服務器
npm run deploy:production

# 驗證所有實例已升級
npm run verify:deployment
```

### 步驟 7: 數據遷移

#### 7.1 遷移待重試任務

如果有待重試的舊任務：

```typescript
import { RetryScheduler } from '@gravito/core'

async function migrateOldRetries() {
  const scheduler = new RetryScheduler()

  // 從舊儲存讀取待重試任務
  const oldRetries = await getOldRetryQueue()

  for (const task of oldRetries) {
    // 重新排程到新系統
    await scheduler.scheduleRetry(
      task.eventName,
      task.payload,
      task.retryCount,
      task.delayMs
    )
  }

  console.log(`✅ 遷移了 ${oldRetries.length} 個任務`)
}

await migrateOldRetries()
```

#### 7.2 清理舊數據

```typescript
// 確認新系統運行正常後（至少 24 小時）
async function cleanupOldRetries() {
  // 刪除舊重試表
  await db.query('DELETE FROM old_retry_queue')
  console.log('✅ 舊數據已清理')
}
```

### 步驟 8: 驗證與監控

```bash
# 8.1 檢查系統健康
curl http://localhost:8080/health

# 8.2 驗證指標
curl http://localhost:8080/metrics | grep -E 'gravito_event_retry|gravito_event_dlq'

# 8.3 檢查告警
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "gravito_retry_system")'

# 8.4 查看日誌
tail -f logs/application.log | grep -iE 'retry|backpressure|dlq'
```

---

## 配置遷移

### 重試策略對應關係

| 舊策略 | 新配置 |
|--------|--------|
| `retryStrategy: 'simple'` | `initialDelayMs: 1000, multiplier: 1` |
| `retryDelayMs: 1000` | `initialDelayMs: 1000` |
| `maxRetries: 3` | `maxRetries: 3` |
| N/A | `multiplier: 2`（新增） |
| N/A | `maxDelayMs: 60000`（新增） |

### 快速遷移矩陣

```typescript
// 舊配置 → 新配置映射

const migrations = {
  // 激進（快速失敗）
  aggressive: {
    old: { retryDelayMs: 500, maxRetries: 2 },
    new: { initialDelayMs: 500, multiplier: 2, maxRetries: 2, maxDelayMs: 10000 }
  },

  // 平衡（推薦）
  balanced: {
    old: { retryDelayMs: 1000, maxRetries: 5 },
    new: { initialDelayMs: 1000, multiplier: 2, maxRetries: 5, maxDelayMs: 60000 }
  },

  // 保守（更多重試）
  conservative: {
    old: { retryDelayMs: 2000, maxRetries: 10 },
    new: { initialDelayMs: 2000, multiplier: 2, maxRetries: 10, maxDelayMs: 300000 }
  }
}

// 使用示例
const config = migrations.balanced
const scheduler = new RetryScheduler(config.new)
```

---

## 代碼遷移示例

### 示例 1: 訂單事件處理

#### 舊代碼

```typescript
import { EventPriorityQueue } from '@gravito/core'

class OrderService {
  private queue = new EventPriorityQueue({
    retryStrategy: 'simple',
    retryDelayMs: 1000,
    maxRetries: 3
  })

  async createOrder(order: Order) {
    const event = new OrderCreatedEvent(order)

    // 派發事件
    this.queue.enqueue(event, 'high')

    // 監聽結果
    this.queue.on('retry-failed', (failedEvent) => {
      console.error('訂單事件重試失敗', failedEvent)
      // 手動處理失敗
      this.notifyAdmin(failedEvent)
    })
  }
}
```

#### 新代碼

```typescript
import { EventPriorityQueue, RetryScheduler, DeadLetterQueue } from '@gravito/core'

class OrderService {
  private queue = new EventPriorityQueue()
  private scheduler = new RetryScheduler({
    initialDelayMs: 1000,
    multiplier: 2,
    maxRetries: 3
  })
  private dlq = new DeadLetterQueue()

  constructor() {
    // 配置隊列
    this.queue.setRetryScheduler(this.scheduler)

    // 監聽重試
    this.scheduler.on('retry', (eventName, retryCount, delay) => {
      console.log(`排程重試：${eventName}，第 ${retryCount} 次`)
    })

    // 監聽失敗（自動進入 DLQ）
    this.scheduler.on('exhausted', (eventName) => {
      console.log(`${eventName} 已進入 DLQ`)
      this.notifyAdmin(eventName)
    })
  }

  async createOrder(order: Order) {
    const event = new OrderCreatedEvent(order)

    // API 完全相同！
    this.queue.enqueue(event, 'high')
  }
}
```

✅ **只需在初始化時配置，派發代碼完全相同！**

### 示例 2: 支付事件的錯誤恢復

#### 舊代碼

```typescript
async function processPayment(payment: Payment) {
  let lastError = null

  for (let i = 0; i < 3; i++) {
    try {
      await paymentGateway.process(payment)
      return
    } catch (error) {
      lastError = error
      if (i < 2) {
        // 手動實現退避
        await sleep(1000 * Math.pow(2, i))
      }
    }
  }

  throw lastError
}
```

#### 新代碼

```typescript
async function processPayment(payment: Payment) {
  const event = new PaymentProcessedEvent(payment)

  // 排程異步重試
  queue.enqueue(event, 'high')

  // 依賴排程器自動重試
  // 無需手動循環和退避邏輯
}
```

---

## 驗證檢查清單

### 部署後驗證（立即）

- [ ] 應用程序啟動成功
- [ ] Redis 連接正常（如果使用 Bull Queue）
- [ ] 沒有錯誤日誌
- [ ] 系統能正常派發事件

### 功能驗證（1 小時內）

- [ ] 派發事件並監控隊列深度
  ```bash
  curl http://localhost:8080/metrics | grep gravito_event_priority_queue_depth
  ```

- [ ] 驗證重試機制
  ```bash
  # 派發會失敗的事件，檢查是否重試
  curl -X POST http://localhost:8080/api/test/trigger-failure

  # 檢查日誌中的重試記錄
  tail -f logs/application.log | grep -i "排程重試"
  ```

- [ ] 檢查 Prometheus 指標
  ```bash
  # 應該看到新指標
  curl http://localhost:8080/metrics | grep gravito_event_retry_
  ```

### 性能驗證（4 小時內）

- [ ] 事件派發延遲在可接受範圍內
  ```bash
  # 檢查 dispatch_duration_seconds 指標
  curl http://localhost:8080/metrics | grep dispatch_duration_seconds
  ```

- [ ] 重試成功率 > 95%
  ```bash
  # 執行 K6 性能測試
  k6 run packages/core/tests/k6/retry-system-load.js
  ```

- [ ] 系統資源使用正常
  - CPU 使用率 < 50%
  - 內存使用率 < 80%
  - Redis 連接數 < 最大連接數的 50%

### Prometheus 告警驗證（8 小時內）

- [ ] 檢查告警規則已加載
  ```bash
  curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "gravito_retry_system")'
  ```

- [ ] 至少一個告警已觸發並恢復
  ```bash
  curl http://localhost:9093/api/v1/alerts
  ```

### 生產環境驗證（24 小時監控）

- [ ] 沒有異常告警
- [ ] 重試成功率穩定 > 95%
- [ ] 沒有內存洩漏
- [ ] DLQ 大小在預期範圍內
- [ ] 用戶報告的相關問題為零

---

## 常見陷阱與解決方案

### 陷阱 1: Redis 連接失敗

**症狀**：
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解決**：
```bash
# 1. 確認 Redis 運行中
redis-cli ping

# 2. 檢查環境變數
echo $REDIS_HOST
echo $REDIS_PORT

# 3. 檢查防火牆
telnet localhost 6379

# 4. 配置重連策略
const scheduler = new RetryScheduler({
  redis: {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    }
  }
})
```

### 陷阱 2: 舊重試任務丟失

**症狀**：升級後，待重試的舊任務消失

**解決**：
```typescript
// 升級前備份舊任務
async function backupOldRetries() {
  const oldQueue = await getOldRetryQueue()
  await fs.writeFile(
    'old-retries-backup.json',
    JSON.stringify(oldQueue, null, 2)
  )
}

// 升級後遷移任務
async function restoreRetries() {
  const backup = JSON.parse(
    await fs.readFile('old-retries-backup.json', 'utf8')
  )

  for (const task of backup) {
    await scheduler.scheduleRetry(
      task.eventName,
      task.payload,
      task.retryCount,
      task.delayMs
    )
  }
}
```

### 陷阱 3: DLQ 堆積

**症狀**：DLQ 大小不斷增加

**檢查**：
```typescript
const dlqSize = dlq.size()
if (dlqSize > 10000) {
  console.warn('DLQ 堆積，檢查是否有循環失敗')

  // 分析失敗原因
  const entries = dlq.getEntries()
  const failureReasons = entries.reduce((acc, e) => {
    acc[e.reason] = (acc[e.reason] || 0) + 1
    return acc
  }, {})

  console.log('失敗分佈:', failureReasons)
}
```

**解決**：
1. 檢查是否有邏輯錯誤導致不可恢復的失敗
2. 修復根本原因
3. 使用重新加工機制重新處理 DLQ 項

### 陷阱 4: 性能下降

**症狀**：事件派發延遲增加

**檢查**：
```bash
# 檢查隊列深度
curl http://localhost:8080/metrics | grep priority_queue_depth

# 檢查 Redis 健康
redis-cli INFO stats | grep ops_per_sec

# 檢查背壓狀態
curl http://localhost:8080/metrics | grep backpressure_state
```

**解決**：
```typescript
// 優化配置
const scheduler = new RetryScheduler({
  initialDelayMs: 500,      // 降低初始延遲
  maxDelayMs: 30000,        // 降低最大延遲
  maxRetries: 3             // 減少重試次數（快速失敗）
})

// 增加並發處理
const queue = new EventPriorityQueue({
  maxConcurrency: 100       // 增加併發
})
```

### 陷阱 5: 監控告警風暴

**症狀**：過度告警

**解決**：
```yaml
# prometheus-retry-alerts.yml
- alert: RetryQueueDepthHigh
  expr: sum(gravito_event_retry_queue_depth) > 500
  for: 5m  # 增加告警持續時間
  annotations:
    summary: "..."
```

---

## 回滾計劃

### 快速回滾（< 5 分鐘）

如果遇到嚴重問題，可快速回滾到舊版本：

```bash
# 1. 停止新版本服務
docker-compose down

# 2. 恢復舊版本
git checkout v1.0.0
docker-compose up -d

# 3. 驗證
curl http://localhost:8080/health
```

### 數據恢復

```typescript
// 如果新系統的 DLQ 有重要數據，先備份
async function backupDLQ() {
  const dlq = new DeadLetterQueue()
  const entries = dlq.getEntries()

  await fs.writeFile(
    'dlq-backup.json',
    JSON.stringify(entries, null, 2)
  )

  console.log(`✅ 備份 ${entries.length} 個 DLQ 項`)
}
```

### 部分回滾

如果只是某些模塊有問題：

```typescript
// 混合模式：某些事件用新系統，某些用舊系統
const queue = new EventPriorityQueue()

if (event.type === 'critical') {
  // 關鍵事件使用新系統
  queue.setRetryScheduler(scheduler)
  queue.enqueue(event, 'high')
} else {
  // 其他事件暫時使用舊邏輯
  await legacyRetryQueue.add(event)
}
```

---

## 總結

| 階段 | 時間 | 關鍵任務 |
|------|------|---------|
| **準備** | 1 天 | 檢查清單、備份、通知 |
| **安裝** | 1-2 小時 | 依賴、Redis、配置 |
| **遷移** | 2-4 小時 | 代碼更新、測試 |
| **部署** | 1-2 小時 | 灰度、完整、驗證 |
| **監控** | 24 小時 | 持續觀察指標和告警 |

**預計總時間**：8-10 小時（不含 24 小時監控期）

## 需要幫助？

- 📖 查看 [RetryScheduler 完整指南](./RETRY_SCHEDULER_GUIDE.md)
- 📊 檢查 [監控指南](./RETRY_SYSTEM_MONITORING.md)
- 🚀 參考 [部署檢查清單](./PRODUCTION_DEPLOYMENT.md)
- 💬 提交問題或尋求支持
