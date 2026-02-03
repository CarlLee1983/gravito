---
title: 觀察者系統 (Monitor)
description: 了解如何使用 Gravito Monitor 進行健康檢查、計量與追蹤。
---

# 觀察者系統 (Monitor)

> `@gravito/monitor` 為您的應用程式提供全方位的觀察力，支援 Prometheus、OpenTelemetry 與 Kubernetes 健康檢查。

## Beta 說明

1.0.0-beta 以 Bun 原生效能為核心，監控功能採可選開啟，維持啟動速度與執行成本的平衡。健康檢查、指標與追蹤可依需求逐步啟用。

## 健康檢查 (Health Checks)

內建 `/healthz` 與 `/readyz` 端點，適合雲端原生環境。

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitMonitor } from '@gravito/monitor'

export default PlanetCore.configure({
  orbits: [
    OrbitMonitor.configure({
      health: {
        path: '/healthz',
        checks: [
          async () => ({ name: 'db', status: 'up' })
        ]
      }
    })
  ]
})
```

## 指標計量 (Metrics)

內建 Prometheus 相容的 `/metrics` 端點。

```typescript
const monitor = c.get('monitor')
monitor.counter('requests_total').inc()
```

## 鏈路追蹤 (Tracing)

整合 OpenTelemetry，自動追蹤 HTTP 請求與資料庫操作。

```typescript
OrbitMonitor.configure({
  tracing: {
    serviceName: 'my-service',
    exporter: 'otlp'
  }
})
```

---

## 下一步
了解如何透過 [日誌系統](./logging.md) 追蹤錯誤。
