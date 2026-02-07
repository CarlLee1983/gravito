# 電路斷路器使用指南

## 概述

電路斷路器（Circuit Breaker）是一種容錯設計模式，用於防止應用程式因外部服務故障而級聯失敗。Gravito Core 提供了一個完整實現，支援 OpenTelemetry 指標集成和細粒度控制。

## 核心概念

### 三態模型

電路斷路器有三種狀態：

```
┌─────────┐
│ CLOSED  │  ← 正常狀態，所有請求通過
└────┬────┘
     │ 失敗達閾值
     ↓
┌─────────┐
│  OPEN   │  ← 故障狀態，所有請求被阻止
└────┬────┘
     │ 等待 resetTimeout
     ↓
┌───────────┐
│ HALF_OPEN│  ← 恢復測試狀態，允許少量試驗請求
└────┬──────┘
     │ 成功達 successThreshold → CLOSED
     │ 失敗一次 → OPEN
```

### 狀態轉換規則

| 當前狀態 | 事件 | 新狀態 | 說明 |
|---------|------|--------|------|
| CLOSED | 失敗計數達 failureThreshold | OPEN | 觸發斷開 |
| CLOSED | 成功 | CLOSED | 保持或重置計數 |
| OPEN | resetTimeout 時間過期 | HALF_OPEN | 自動轉為半開 |
| HALF_OPEN | 成功計數達 successThreshold | CLOSED | 恢復正常 |
| HALF_OPEN | 任一失敗 | OPEN | 立即重新打開 |

## 基本使用

### 最簡配置

```typescript
import { CircuitBreaker } from '@gravito/core'

const cb = new CircuitBreaker('payment:process', {
  failureThreshold: 5,      // 5 次失敗後打開
  successThreshold: 2,       // 半開時需 2 次成功
  resetTimeout: 30000        // 30 秒後從 OPEN 轉 HALF_OPEN
})

try {
  const result = await cb.execute(async () => {
    return await paymentService.charge(amount)
  })
} catch (error) {
  if (error.message.includes('Circuit is OPEN')) {
    // 電路已打開，服務不可用
    logger.warn('Payment service unavailable')
  } else {
    // 操作失敗（但電路未打開）
    throw error
  }
}
```

### 帶指標記錄器的配置

```typescript
import { CircuitBreaker } from '@gravito/core'
import { OTelEventMetrics } from '@gravito/core'

const metrics = new OTelEventMetrics(meterProvider)

const cb = new CircuitBreaker('notification:send', {
  failureThreshold: 10,
  successThreshold: 3,
  resetTimeout: 60000,
  metricsRecorder: metrics  // 啟用指標記錄
})

// 指標將被自動記錄到 OpenTelemetry
```

## 配置選項

### CircuitBreakerOptions 介面

```typescript
interface CircuitBreakerOptions {
  /**
   * 觸發電路打開的連續失敗次數
   * 預設: 5
   */
  failureThreshold?: number

  /**
   * 半開狀態下達到此成功次數後關閉電路
   * 預設: 2
   */
  successThreshold?: number

  /**
   * 從 OPEN 轉 HALF_OPEN 的等待時間（毫秒）
   * 預設: 30000 (30 秒)
   */
  resetTimeout?: number

  /**
   * 滑動窗口大小（毫秒），用於計算失敗/成功計數
   * 超過此時間的舊事件不計入
   * 預設: 60000 (60 秒)
   */
  windowSize?: number

  /**
   * 是否啟用電路斷路器
   * 設為 false 時旁路所有邏輯，直接執行操作
   * 預設: true
   */
  enabled?: boolean

  /**
   * 指標記錄器實現
   * 用於收集失敗/成功/轉換事件
   */
  metricsRecorder?: CircuitBreakerMetricsRecorder
}
```

## 高級用法

### 監控指標

```typescript
const metrics = cb.getMetrics()

console.log({
  currentState: metrics.state,           // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  windowFailures: metrics.failures,      // 當前窗口內的失敗計數
  windowSuccesses: metrics.successes,    // 當前窗口內的成功計數
  totalFailures: metrics.totalFailures,  // 累積失敗總數
  totalSuccesses: metrics.totalSuccesses,// 累積成功總數
  totalRequests: metrics.totalRequests,  // 累積請求總數
  lastFailureAt: metrics.lastFailureAt,  // 上次失敗時間
  lastSuccessAt: metrics.lastSuccessAt,  // 上次成功時間
  openedAt: metrics.openedAt             // 電路打開時間
})
```

### 狀態檢查

```typescript
if (cb.isClosed()) {
  console.log('服務正常')
}

if (cb.isHalfOpen()) {
  console.log('服務在恢復測試中')
}

if (cb.isOpen()) {
  console.log('服務故障，電路已打開')
  // 可實施降級策略
}
```

### 手動重置

```typescript
// 在某些情況下可能需要手動重置
// 例如：確認外部服務已恢復
cb.reset()
```

### 禁用電路斷路器

```typescript
// 在開發環境或特定場景下禁用
const devCb = new CircuitBreaker('dev:service', {
  enabled: process.env.NODE_ENV !== 'production'
})

// 即使禁用，execute() 仍正常運作，但不進行狀態管理
```

## 指標集成

### 自動記錄的指標

當提供 `metricsRecorder` 時，以下事件會被自動記錄：

```typescript
interface CircuitBreakerMetricsRecorder {
  // 記錄狀態變化（0=CLOSED, 1=HALF_OPEN, 2=OPEN）
  recordState: (eventName: string, state: number) => void

  // 記錄狀態轉換
  recordTransition: (eventName: string, fromState: string, toState: string) => void

  // 記錄失敗
  recordFailure: (eventName: string) => void

  // 記錄成功
  recordSuccess: (eventName: string) => void

  // 記錄 OPEN 狀態持續時間（秒）
  recordOpenDuration: (eventName: string, seconds: number) => void
}
```

### OTelEventMetrics 電路斷路器方法

```typescript
import { OTelEventMetrics } from '@gravito/core'

const metrics = new OTelEventMetrics(meterProvider)

// 記錄電路斷路器失敗
metrics.recordCircuitBreakerFailure('payment:charge', listenerIndex)

// 記錄電路斷路器成功
metrics.recordCircuitBreakerSuccess('payment:charge', listenerIndex)

// 記錄狀態轉換
metrics.recordCircuitBreakerTransition('payment:charge', listenerIndex, 'CLOSED', 'OPEN')

// 記錄 OPEN 狀態持續時間
metrics.recordCircuitBreakerOpenDuration('payment:charge', listenerIndex, 5.2)
```

## Prometheus 查詢範例

假設使用 Prometheus 作為後端指標存儲：

### 1. 電路狀態（當前）

```promql
# 查看所有打開的電路
gravito_event_circuit_breaker_state{state="OPEN"} == 2

# 查看半開狀態的電路（正在恢復）
gravito_event_circuit_breaker_state{state="HALF_OPEN"} == 1
```

### 2. 失敗率

```promql
# 過去 5 分鐘的失敗率
rate(gravito_event_circuit_breaker_failures_total[5m])

# 特定事件的失敗率
rate(gravito_event_circuit_breaker_failures_total{event="payment:charge"}[5m])
```

### 3. 成功率

```promql
# 成功率百分比
(rate(gravito_event_circuit_breaker_successes_total[5m]) /
 (rate(gravito_event_circuit_breaker_failures_total[5m]) +
  rate(gravito_event_circuit_breaker_successes_total[5m]))) * 100
```

### 4. OPEN 狀態持續時間

```promql
# 電路打開時間累積（秒）
gravito_event_circuit_breaker_open_duration_seconds_bucket

# 99 百分位數
histogram_quantile(0.99, gravito_event_circuit_breaker_open_duration_seconds_bucket)
```

### 5. 轉換頻率

```promql
# 從 CLOSED 轉向 OPEN 的速率（每秒）
rate(gravito_event_circuit_breaker_transitions_total{from="CLOSED",to="OPEN"}[1m])

# 從 HALF_OPEN 成功關閉的速率
rate(gravito_event_circuit_breaker_transitions_total{from="HALF_OPEN",to="CLOSED"}[5m])
```

## Grafana 儀表板建議

### 推薦的面板配置

#### 面板 1：電路狀態聚合

```
類型: Stat
指標: count(gravito_event_circuit_breaker_state{state="OPEN"})
單位: 無
閾值:
  - 綠色: 0-0
  - 黃色: 1-5
  - 紅色: 5+
標題: "打開的電路數"
```

#### 面板 2：失敗率趨勢

```
類型: Graph
指標: rate(gravito_event_circuit_breaker_failures_total[5m])
分組: 按事件名
標題: "電路斷路器失敗率（請求/秒）"
Y 軸: 自動
範例圖例: {{event}}
```

#### 面板 3：狀態轉換矩陣

```
類型: Heatmap
指標: sum(rate(gravito_event_circuit_breaker_transitions_total[5m]))
      by (from, to)
標題: "狀態轉換頻率"
```

#### 面板 4：恢復時間 SLA

```
類型: Gauge
指標:
  (count(gravito_event_circuit_breaker_state{state="CLOSED"}) /
   count(gravito_event_circuit_breaker_state)) * 100
單位: percent
閾值:
  - 綠色: 95-100
  - 黃色: 90-95
  - 紅色: 0-90
標題: "電路穩定性（CLOSED % 時間）"
```

#### 面板 5：開啟時長統計

```
類型: Stat
指標: histogram_quantile(0.95,
        gravito_event_circuit_breaker_open_duration_seconds_bucket)
單位: seconds
標題: "95% 電路打開時長"
```

## 最佳實踐

### 1. 配置建議

```typescript
// 根據服務特徵調整參數
// 高流量、低延遲服務
const highThroughputCb = new CircuitBreaker('api:gateway', {
  failureThreshold: 10,      // 更高的容差
  successThreshold: 5,        // 需要多次確認恢復
  resetTimeout: 20000         // 快速重試
})

// 關鍵業務、低流量服務
const criticalServiceCb = new CircuitBreaker('billing:process', {
  failureThreshold: 3,        // 敏感度高
  successThreshold: 1,        // 快速恢復
  resetTimeout: 60000         // 謹慎重試
})
```

### 2. 告警規則

推薦在 Prometheus 中設定以下告警：

```yaml
groups:
  - name: circuit_breaker
    rules:
      # 電路打開告警
      - alert: CircuitBreakerOpen
        expr: gravito_event_circuit_breaker_state{state="OPEN"} == 2
        for: 1m
        annotations:
          summary: "電路 {{ $labels.event }} 已打開"

      # 高失敗率告警
      - alert: HighFailureRate
        expr: rate(gravito_event_circuit_breaker_failures_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "{{ $labels.event }} 失敗率 > 10%"

      # 多個電路同時打開告警
      - alert: ManyCircuitsOpen
        expr: count(gravito_event_circuit_breaker_state{state="OPEN"}) > 3
        for: 1m
        annotations:
          summary: "{{ $value }} 個電路打開，可能存在系統級故障"
```

### 3. 降級策略

```typescript
async function callServiceWithFallback(eventName: string, primaryFn: () => Promise<any>, fallbackFn: () => Promise<any>) {
  try {
    return await cb.execute(primaryFn)
  } catch (error) {
    if (error.message.includes('Circuit is OPEN')) {
      logger.info(`${eventName} 電路打開，使用降級方案`)
      return await fallbackFn()
    }
    throw error
  }
}

// 使用
const result = await callServiceWithFallback(
  'payment:charge',
  () => paymentService.charge(amount),
  () => queueService.deferPayment(amount)  // 降級：入隊延後處理
)
```

### 4. 監控和日誌

```typescript
class MonitoredCircuitBreaker {
  private cb: CircuitBreaker

  constructor(name: string, options: CircuitBreakerOptions) {
    const metricsRecorder = {
      recordState: (event: string, state: number) => {
        logger.info(`[${event}] 狀態變為 ${['CLOSED', 'HALF_OPEN', 'OPEN'][state]}`)
      },
      recordTransition: (event: string, from: string, to: string) => {
        logger.warn(`[${event}] 轉換: ${from} → ${to}`)
      },
      recordFailure: (event: string) => {
        metrics.increment(`cb.failures.${event}`)
      },
      recordSuccess: (event: string) => {
        metrics.increment(`cb.successes.${event}`)
      },
      recordOpenDuration: (event: string, seconds: number) => {
        metrics.histogram(`cb.open_duration.${event}`, seconds)
      }
    }

    this.cb = new CircuitBreaker(name, {
      ...options,
      metricsRecorder
    })
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.cb.execute(fn)
  }
}
```

## 故障排除

### 問題：電路頻繁在 OPEN/HALF_OPEN 之間切換

**原因**：successThreshold 或 failureThreshold 配置過低

**解決**：
```typescript
// 不好：門檻太低
const cb = new CircuitBreaker('api', {
  failureThreshold: 1,
  successThreshold: 1
})

// 更好：增加緩衝
const cb = new CircuitBreaker('api', {
  failureThreshold: 5,      // 5 次失敗才打開
  successThreshold: 3       // 需要 3 次成功確認恢復
})
```

### 問題：電路打開時間過長

**原因**：resetTimeout 設置過大，或外部服務真實故障時間較長

**解決**：
1. 調整 resetTimeout 以符合實際恢復時間
2. 實施主動降級機制
3. 監控外部服務健康狀態

### 問題：指標沒有記錄

**確認**：
1. 確認 metricsRecorder 已傳入
2. 確認 OTelEventMetrics 已正確初始化
3. 檢查指標輸出器是否配置

```typescript
// 驗證配置
const metrics = new OTelEventMetrics(meterProvider)
const cb = new CircuitBreaker('test', {
  metricsRecorder: metrics
})

// 執行操作並檢查指標
await cb.execute(async () => 'test')
```

## 總結

電路斷路器是構建韌性系統的關鍵模式。通過合理配置和監控，可以：

- ✅ 防止級聯故障
- ✅ 提高系統可用性
- ✅ 加速故障恢復
- ✅ 改善用戶體驗
- ✅ 簡化調試和監控

始終結合指標監控和告警，才能有效運維生產環境。
