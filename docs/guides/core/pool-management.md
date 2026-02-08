# Database Connection Pool Management Guide

完整的連接池管理指南，涵蓋統計、健康檢查、預熱、監控和自適應調整。

## 目錄

1. [快速開始](#快速開始)
2. [連接池統計](#連接池統計)
3. [健康檢查](#健康檢查)
4. [連接池預熱](#連接池預熱)
5. [自適應管理](#自適應管理)
6. [Prometheus 監控](#prometheus-監控)
7. [最佳實踐](#最佳實踐)
8. [故障排除](#故障排除)

## 快速開始

### 基本配置

```typescript
import { ConnectionManager } from '@gravito/atlas'

const manager = new ConnectionManager({
  default: {
    driver: 'postgres',
    host: 'localhost',
    database: 'myapp',
    pool: {
      min: 2,
      max: 20,
      acquireTimeout: 5000,
      idleTimeout: 30000,
    }
  }
})
```

### 完整功能啟用

```typescript
// 1. 健康檢查
manager.enableHealthCheck({
  checkInterval: 30000,
})

// 2. 連接池預熱
await manager.warmup()

// 3. 自適應管理
manager.enableAdaptive()
```

## 連接池統計

### 獲取池統計

```typescript
const stats = connection.getDriver().getPoolStats()
// { idle, pending, active, total, max }
```

## 健康檢查

### 啟用

```typescript
manager.enableHealthCheck({
  checkInterval: 30000,
  thresholds: {
    warningUtilization: 0.7,
    criticalUtilization: 0.9,
  }
})
```

## 連接池預熱

```typescript
await manager.warmup({
  targetConnections: 5,
  concurrency: 2,
})
```

## 自適應管理

```typescript
manager.enableAdaptive({
  evaluationInterval: 60000,
  cooldownPeriod: 30000,
})
```

## Prometheus 監控

```typescript
setupPrometheusExporter({ port: 9464 })
```

## 最佳實踐

1. 根據負載調整池大小
2. 啟動時預熱連接
3. 啟用健康檢查
4. 啟用自適應管理
5. 優雅關閉時調用 `shutdown()`

---

**版本**：1.3.0
