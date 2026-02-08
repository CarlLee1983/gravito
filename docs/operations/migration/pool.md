# Connection Pool Management Migration Guide

升級現有應用以使用 Issue 1.3 的池管理功能

## 升級路徑

### 步驟 1：確保兼容性

所有新功能都是可選的，100% 向後兼容：

```typescript
// 舊代碼仍然可以工作
const manager = new ConnectionManager(config)
const conn = manager.connection('default')
const result = await conn.raw('SELECT 1')
```

### 步驟 2：添加健康檢查

```typescript
// 初始化後立即啟用
manager.enableHealthCheck({
  checkInterval: 30000,
})
```

### 步驟 3：添加連接池預熱

```typescript
// 應用啟動時
manager.enableWarmup({ targetConnections: 5 })
await manager.warmup()
```

### 步驟 4：添加自適應管理

```typescript
// 生產環境推薦
manager.enableAdaptive({
  evaluationInterval: 60000,
})
```

### 步驟 5：集成 Prometheus

```typescript
import { setupPrometheusExporter } from '@gravito/atlas'

setupPrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
})
```

## 完整遷移範例

```typescript
import { ConnectionManager, setupPrometheusExporter } from '@gravito/atlas'

async function migrateToNewPoolManagement() {
  // 1. 建立管理器（無變化）
  const manager = new ConnectionManager(config)

  // 2. 啟用新功能
  manager.enableHealthCheck({
    checkInterval: 30000,
    onCritical: (name) => {
      logger.error(`Pool ${name} critical`)
    }
  })

  // 3. 預熱池
  await manager.warmup()

  // 4. 啟用自適應
  manager.enableAdaptive({
    onAdjustment: (event) => {
      logger.info(`Pool adjusted: ${event.from} -> ${event.to}`)
    }
  })

  // 5. 設置監控
  setupPrometheusExporter({ port: 9464 })

  // 6. 優雅關閉
  process.on('SIGTERM', async () => {
    await manager.shutdown()
    process.exit(0)
  })

  return manager
}

// 應用中使用
const manager = await migrateToNewPoolManagement()
```

## 版本相容性

| 功能 | v1.0 | v1.1 | v1.2 | v1.3 |
|------|------|------|------|------|
| 基本連接 | ✅ | ✅ | ✅ | ✅ |
| 池統計 | - | - | ✅ | ✅ |
| 健康檢查 | - | - | ✅ | ✅ |
| 池預熱 | - | - | ✅ | ✅ |
| Prometheus | - | - | ✅ | ✅ |
| 自適應管理 | - | - | - | ✅ |

## 向後兼容性

所有 v1.2 代碼在 v1.3 中無需修改即可工作：

```typescript
// v1.2 代碼
const manager = new ConnectionManager(config)
const conn = manager.connection('default')
const result = await conn.raw('SELECT * FROM users')

// v1.3 仍然完全支持
```

## 漸進式採用

### 第一階段：基礎監控
```typescript
manager.enableHealthCheck()
```

### 第二階段：性能優化
```typescript
await manager.warmup()
manager.enableAdaptive()
```

### 第三階段：完整可觀測性
```typescript
setupPrometheusExporter()
// 配置 Grafana 儀表板
// 設置 Prometheus 告警
```

## 常見遷移場景

### 場景 1：簡單 Web 應用

```typescript
async function setupApp() {
  const manager = new ConnectionManager(config)
  manager.enableHealthCheck()
  manager.enableAdaptive()
  return manager
}
```

### 場景 2：高流量應用

```typescript
async function setupApp() {
  const manager = new ConnectionManager(config)

  // 詳細配置
  manager.enableHealthCheck({
    checkInterval: 10000,
  })

  await manager.warmup({
    targetConnections: 20,
    concurrency: 4,
  })

  manager.enableAdaptive({
    evaluationInterval: 30000,
    cooldownPeriod: 15000,
  })

  setupPrometheusExporter({ port: 9464 })

  return manager
}
```

### 場景 3：微服務

```typescript
// 每個微服務獨立配置
const manager = new ConnectionManager({
  default: { /* 本地 DB */ },
  shared: { /* 共享 DB */ },
})

manager.enableHealthCheck()
manager.enableAdaptive()
```

## 故障排除

### 舊代碼不工作

確保使用的是新版本：
```bash
npm update @gravito/atlas
```

### 功能不啟用

檢查是否正確調用了啟用方法：
```typescript
manager.enableAdaptive()  // ✅
enableAdaptive()          // ❌
```

### 記憶體使用增加

調整歷史大小：
```typescript
manager.enableAdaptive({
  maxHistorySize: 5,  // 減少
})
```

---

**版本**：1.3.0
