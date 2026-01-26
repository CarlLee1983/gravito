# Phase 4: 可觀測性

> 整合 Metrics、Tracing、Structured Logging 實現完整可觀測性

## 概述

本階段將為 Echo 模組加入完整的可觀測性支援，包括指標收集、分散式追蹤與結構化日誌，以便於生產環境的監控與除錯。

## 可觀測性三支柱

| 支柱 | 用途 | 實作方式 |
|------|------|---------|
| Metrics | 量化效能與健康狀態 | 可插拔 Metrics Provider |
| Tracing | 追蹤請求流程 | OpenTelemetry 相容 |
| Logging | 結構化日誌紀錄 | 與 Gravito Logger 整合 |

## 4.1 Metrics 指標

### 核心指標定義

```typescript
/**
 * Echo 模組指標名稱
 */
export const EchoMetrics = {
  // 接收相關
  INCOMING_TOTAL: 'echo_incoming_webhooks_total',
  INCOMING_DURATION: 'echo_incoming_duration_seconds',
  INCOMING_VERIFICATION_FAILURES: 'echo_incoming_verification_failures_total',

  // 發送相關
  OUTGOING_TOTAL: 'echo_outgoing_webhooks_total',
  OUTGOING_DURATION: 'echo_outgoing_duration_seconds',
  OUTGOING_RETRIES: 'echo_outgoing_retries_total',
  OUTGOING_FAILURES: 'echo_outgoing_failures_total',

  // DLQ 相關
  DLQ_SIZE: 'echo_dlq_size',
  DLQ_ENQUEUED: 'echo_dlq_enqueued_total',
  DLQ_PROCESSED: 'echo_dlq_processed_total',
} as const
```

### Metrics Provider 介面

```typescript
/**
 * Metrics 收集器介面
 */
export interface MetricsProvider {
  /**
   * 增加計數器
   */
  increment(name: string, labels?: Record<string, string>): void

  /**
   * 記錄直方圖數值（如延遲）
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void

  /**
   * 設定 Gauge 數值
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void
}

/**
 * 標籤定義
 */
export interface WebhookMetricLabels {
  provider?: string
  event_type?: string
  status?: 'success' | 'failure'
  status_code?: string
  error_type?: string
}
```

### 預設實作：NoopMetrics

```typescript
/**
 * 空操作 Metrics（預設）
 */
export class NoopMetricsProvider implements MetricsProvider {
  increment(): void {}
  histogram(): void {}
  gauge(): void {}
}
```

### Prometheus 相容實作

```typescript
/**
 * Prometheus 格式 Metrics 收集器
 * 可搭配 prom-client 使用
 */
export class PrometheusMetricsProvider implements MetricsProvider {
  private counters = new Map<string, Map<string, number>>()
  private histograms = new Map<string, number[]>()
  private gauges = new Map<string, number>()

  increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const counterMap = this.counters.get(name) ?? new Map()
    counterMap.set(key, (counterMap.get(key) ?? 0) + 1)
    this.counters.set(name, counterMap)
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const values = this.histograms.get(key) ?? []
    values.push(value)
    this.histograms.set(key, values)
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    this.gauges.set(key, value)
  }

  /**
   * 匯出 Prometheus 格式文字
   */
  export(): string {
    const lines: string[] = []

    // 匯出計數器
    for (const [name, counterMap] of this.counters) {
      lines.push(`# TYPE ${name} counter`)
      for (const [key, value] of counterMap) {
        lines.push(`${key} ${value}`)
      }
    }

    // 匯出 Gauge
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`)
    }

    return lines.join('\n')
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return name
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return `${name}{${labelStr}}`
  }
}
```

### 整合至 WebhookReceiver

```typescript
export class WebhookReceiver {
  private metrics: MetricsProvider = new NoopMetricsProvider()

  /**
   * 設定 Metrics Provider
   */
  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  async handle(/* ... */): Promise</* ... */> {
    const startTime = performance.now()
    const labels: WebhookMetricLabels = { provider: providerName }

    try {
      // ... 驗證邏輯 ...

      if (!result.valid) {
        this.metrics.increment(EchoMetrics.INCOMING_VERIFICATION_FAILURES, {
          provider: providerName,
          error_type: this.categorizeError(result.error),
        })
        return { ...result, handled: false }
      }

      labels.event_type = result.eventType
      labels.status = 'success'

      // ... 處理邏輯 ...

      return { ...result, handled }
    } catch (error) {
      labels.status = 'failure'
      labels.error_type = error instanceof Error ? error.name : 'unknown'
      throw error
    } finally {
      const duration = (performance.now() - startTime) / 1000
      this.metrics.increment(EchoMetrics.INCOMING_TOTAL, labels)
      this.metrics.histogram(EchoMetrics.INCOMING_DURATION, duration, labels)
    }
  }

  private categorizeError(error?: string): string {
    if (!error) return 'unknown'
    if (error.includes('Missing')) return 'missing_header'
    if (error.includes('Signature')) return 'signature_invalid'
    if (error.includes('Timestamp')) return 'timestamp_invalid'
    return 'other'
  }
}
```

### 整合至 WebhookDispatcher

```typescript
export class WebhookDispatcher {
  private metrics: MetricsProvider = new NoopMetricsProvider()

  setMetrics(metrics: MetricsProvider): this {
    this.metrics = metrics
    return this
  }

  async dispatch<T = unknown>(payload: WebhookPayload<T>): Promise<WebhookDeliveryResult> {
    const startTime = performance.now()
    const labels: WebhookMetricLabels = { event_type: payload.event }

    const result = await this.dispatchInternal(payload)

    const duration = (performance.now() - startTime) / 1000
    labels.status = result.success ? 'success' : 'failure'
    labels.status_code = result.statusCode?.toString()

    this.metrics.increment(EchoMetrics.OUTGOING_TOTAL, labels)
    this.metrics.histogram(EchoMetrics.OUTGOING_DURATION, duration, labels)

    if (result.attempt > 1) {
      this.metrics.increment(EchoMetrics.OUTGOING_RETRIES, {
        event_type: payload.event,
      })
    }

    if (!result.success) {
      this.metrics.increment(EchoMetrics.OUTGOING_FAILURES, {
        event_type: payload.event,
        error_type: this.categorizeError(result),
      })
    }

    return result
  }

  private categorizeError(result: WebhookDeliveryResult): string {
    if (!result.statusCode) return 'network_error'
    if (result.statusCode >= 500) return 'server_error'
    if (result.statusCode >= 400) return 'client_error'
    return 'other'
  }
}
```

## 4.2 Distributed Tracing

### Span 介面

```typescript
/**
 * 追蹤 Span 介面（OpenTelemetry 相容）
 */
export interface Span {
  /** 設定屬性 */
  setAttribute(key: string, value: string | number | boolean): this
  /** 設定多個屬性 */
  setAttributes(attributes: Record<string, string | number | boolean>): this
  /** 記錄事件 */
  addEvent(name: string, attributes?: Record<string, string | number>): this
  /** 設定狀態 */
  setStatus(status: { code: SpanStatusCode; message?: string }): this
  /** 結束 Span */
  end(): void
}

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Tracer 介面
 */
export interface Tracer {
  /** 開始新 Span */
  startSpan(name: string, options?: SpanOptions): Span
  /** 在 Span 上下文中執行函數 */
  withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>): Promise<T>
}

export interface SpanOptions {
  kind?: 'client' | 'server' | 'producer' | 'consumer' | 'internal'
  attributes?: Record<string, string | number | boolean>
}
```

### Noop Tracer

```typescript
export class NoopSpan implements Span {
  setAttribute(): this { return this }
  setAttributes(): this { return this }
  addEvent(): this { return this }
  setStatus(): this { return this }
  end(): void {}
}

export class NoopTracer implements Tracer {
  startSpan(): Span {
    return new NoopSpan()
  }

  async withSpan<T>(_name: string, fn: (span: Span) => T | Promise<T>): Promise<T> {
    return fn(new NoopSpan())
  }
}
```

### 整合至 WebhookReceiver

```typescript
export class WebhookReceiver {
  private tracer: Tracer = new NoopTracer()

  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  async handle(/* ... */): Promise</* ... */> {
    return this.tracer.withSpan('echo.receive_webhook', async (span) => {
      span.setAttributes({
        'echo.provider': providerName,
        'echo.direction': 'incoming',
      })

      // 驗證
      span.addEvent('verification_start')
      const result = await provider.verify(body, headers, secret)

      if (!result.valid) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.error })
        span.setAttribute('echo.error', result.error ?? 'unknown')
        return { ...result, handled: false }
      }

      span.addEvent('verification_success')
      span.setAttributes({
        'echo.event_type': result.eventType ?? 'unknown',
        'echo.webhook_id': result.webhookId ?? '',
      })

      // 處理
      span.addEvent('handlers_start')
      // ... 呼叫 handlers ...
      span.addEvent('handlers_complete', { handler_count: handlerCount })

      span.setStatus({ code: SpanStatusCode.OK })
      return { ...result, handled }
    })
  }
}
```

### 整合至 WebhookDispatcher

```typescript
export class WebhookDispatcher {
  private tracer: Tracer = new NoopTracer()

  setTracer(tracer: Tracer): this {
    this.tracer = tracer
    return this
  }

  async dispatch<T = unknown>(payload: WebhookPayload<T>): Promise<WebhookDeliveryResult> {
    return this.tracer.withSpan('echo.dispatch_webhook', async (span) => {
      span.setAttributes({
        'echo.direction': 'outgoing',
        'echo.event': payload.event,
        'echo.url': payload.url,
        'http.method': 'POST',
        'http.url': payload.url,
      })

      const result = await this.dispatchInternal(payload, span)

      span.setAttributes({
        'echo.success': result.success,
        'echo.attempt': result.attempt,
        'echo.duration_ms': result.duration,
      })

      if (result.statusCode) {
        span.setAttribute('http.status_code', result.statusCode)
      }

      if (result.success) {
        span.setStatus({ code: SpanStatusCode.OK })
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.error,
        })
      }

      return result
    })
  }
}
```

## 4.3 Structured Logging

### Log 事件定義

```typescript
/**
 * Echo 日誌事件
 */
export interface EchoLogEvent {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context: {
    module: 'echo'
    component: 'receiver' | 'dispatcher' | 'dlq' | 'replay'
    [key: string]: unknown
  }
}

/**
 * Logger 介面
 */
export interface EchoLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}
```

### 預設 Console Logger

```typescript
export class ConsoleEchoLogger implements EchoLogger {
  private formatContext(base: Record<string, unknown>, extra?: Record<string, unknown>): Record<string, unknown> {
    return {
      module: 'echo',
      timestamp: new Date().toISOString(),
      ...base,
      ...extra,
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      ...this.formatContext({}, context),
    }))
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(JSON.stringify({
      level: 'info',
      message,
      ...this.formatContext({}, context),
    }))
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...this.formatContext({}, context),
    }))
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      ...this.formatContext({}, context),
    }))
  }
}
```

### 日誌整合

```typescript
export class WebhookReceiver {
  private logger: EchoLogger = new ConsoleEchoLogger()

  setLogger(logger: EchoLogger): this {
    this.logger = logger
    return this
  }

  async handle(/* ... */): Promise</* ... */> {
    this.logger.debug('Webhook received', {
      component: 'receiver',
      provider: providerName,
    })

    const result = await provider.verify(body, headers, secret)

    if (!result.valid) {
      this.logger.warn('Webhook verification failed', {
        component: 'receiver',
        provider: providerName,
        error: result.error,
      })
      return { ...result, handled: false }
    }

    this.logger.info('Webhook verified successfully', {
      component: 'receiver',
      provider: providerName,
      eventType: result.eventType,
      webhookId: result.webhookId,
    })

    // ... 處理邏輯 ...

    this.logger.debug('Webhook processing complete', {
      component: 'receiver',
      provider: providerName,
      eventType: result.eventType,
      handlersInvoked: handlerCount,
    })

    return { ...result, handled }
  }
}
```

## 4.4 統一設定

### OrbitEcho 設定擴展

```typescript
export interface EchoObservabilityConfig {
  /** Metrics 收集器 */
  metrics?: MetricsProvider
  /** 分散式追蹤器 */
  tracer?: Tracer
  /** Logger */
  logger?: EchoLogger
}

export interface EchoConfig {
  // ... 既有設定 ...

  /** 可觀測性設定 */
  observability?: EchoObservabilityConfig
}
```

### 使用範例

```typescript
import {
  OrbitEcho,
  PrometheusMetricsProvider,
  ConsoleEchoLogger,
} from '@gravito/echo'
// 假設使用 OpenTelemetry
import { trace } from '@opentelemetry/api'

const metrics = new PrometheusMetricsProvider()

const echo = new OrbitEcho({
  providers: { /* ... */ },
  observability: {
    metrics,
    tracer: trace.getTracer('echo'),
    logger: new ConsoleEchoLogger(),
  },
})

// Prometheus 端點
app.get('/metrics', (c) => {
  return c.text(metrics.export())
})
```

## 檔案結構

```
src/
├── observability/
│   ├── metrics/
│   │   ├── MetricsProvider.ts
│   │   ├── NoopMetricsProvider.ts
│   │   ├── PrometheusMetricsProvider.ts
│   │   └── index.ts
│   ├── tracing/
│   │   ├── Tracer.ts
│   │   ├── NoopTracer.ts
│   │   └── index.ts
│   ├── logging/
│   │   ├── EchoLogger.ts
│   │   ├── ConsoleEchoLogger.ts
│   │   └── index.ts
│   └── index.ts
└── ...
```

## 成功標準

- [ ] 實作 `MetricsProvider` 介面與 Prometheus 實作
- [ ] 實作 `Tracer` 介面（OpenTelemetry 相容）
- [ ] 實作結構化日誌系統
- [ ] 整合至 Receiver 與 Dispatcher
- [ ] 預設使用 Noop 實作（零開銷）
- [ ] 完整的類型定義
- [ ] 測試覆蓋率 90%+

## 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| 效能影響 | 中 | 低 | Noop 預設，啟用時才有開銷 |
| API 複雜度 | 低 | 中 | 可選配置，簡單預設 |
| 相依性增加 | 低 | 低 | 僅定義介面，實作由使用者提供 |

---

**下一階段**: [Phase 5: 測試與文檔](./PHASE-5-TESTING.md)
