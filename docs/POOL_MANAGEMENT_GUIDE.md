# 連接池管理指南

## Phase 1: 連接池統計與健康檢查

本指南涵蓋如何使用 Gravito Atlas 的連接池管理功能。連接池管理包括實時統計、健康監控和自動預熱。

## 快速開始

### 啟用連接池健康檢查

```typescript
import { ConnectionManager } from '@gravito/atlas'

const manager = new ConnectionManager({
  default: {
    driver: 'postgres',
    host: 'localhost',
    database: 'myapp',
    pool: { min: 2, max: 10 },
  },
})

// 啟用健康檢查
manager.enableHealthCheck({
  checkInterval: 30000, // 每 30 秒檢查一次
})
```

### 啟用連接池預熱

```typescript
// 啟用連接池預熱
manager.enableWarmup({
  targetConnections: 3, // 預熱 3 個連接
})

// 執行預熱
const result = await manager.warmup()
console.log(`成功: ${result.successful}, 失敗: ${result.failed}`)
```

## 獲取連接池統計

### 獲取驅動程序提供的統計

```typescript
const connection = manager.connection('default')
const driver = connection.getDriver()

// 獲取連接池統計
const stats = driver.getPoolStats()
if (stats) {
  console.log('連接池統計:')
  console.log(`  空閒: ${stats.idle}`)
  console.log(`  活躍: ${stats.active}`)
  console.log(`  等待: ${stats.pending}`)
  console.log(`  總計: ${stats.total}/${stats.max}`)
  console.log(`  利用率: ${((stats.active / stats.max) * 100).toFixed(1)}%`)
}
```

### 獲取池健康狀態

```typescript
// 啟用健康檢查後，可以獲取健康狀態
const healthStatus = manager.getHealthStatus('default')
console.log(`狀態: ${healthStatus.status}`)
console.log(`消息: ${healthStatus.message}`)
```

## 配置選項

### 健康檢查配置

```typescript
interface PoolHealthCheckConfig {
  // 檢查間隔（毫秒），默認 30000
  checkInterval: number

  // 健康狀態閾值
  thresholds: {
    // 警告利用率（0-1），默認 0.7
    warningUtilization: number

    // 臨界利用率（0-1），默認 0.9
    criticalUtilization: number

    // 最大待處理比例（0-1），默認 0.5
    maxPendingRatio: number
  }

  // 啟用連接可用性測試
  enableConnectionTest: boolean

  // 連接測試超時（毫秒），默認 5000
  connectionTestTimeout: number

  // 健康狀態變化回調
  onHealthChange?: (connectionName: string, health: PoolHealth) => void

  // 臨界狀態回調
  onCritical?: (connectionName: string, health: PoolHealth) => void
}
```

### 連接池預熱配置

```typescript
interface PoolWarmerConfig {
  // 每個池的目標連接數，默認 2
  targetConnections?: number

  // 併發預熱連接數，默認 2
  concurrency?: number

  // 每個預熱查詢超時（毫秒），默認 5000
  timeout?: number

  // 預熱完成回調
  onComplete?: (result: WarmupResult) => void

  // 單個連接預熱回調
  onConnectionWarmed?: (connectionName: string, duration: number) => void
}
```

## API 參考

### ConnectionManager 新增方法

#### `enableHealthCheck(config?: Partial<PoolHealthCheckConfig>): void`

啟用連接池健康檢查。

```typescript
manager.enableHealthCheck({
  checkInterval: 30000,
  thresholds: {
    warningUtilization: 0.7,
    criticalUtilization: 0.9,
    maxPendingRatio: 0.5,
  },
  onHealthChange: (name, health) => {
    console.log(`${name} 狀態變化: ${health.status}`)
  },
})
```

#### `disableHealthCheck(): void`

停止連接池健康檢查。

```typescript
manager.disableHealthCheck()
```

#### `getHealthStatus(connectionName?: string): PoolHealth | Map<string, PoolHealth>`

獲取連接池健康狀態。

```typescript
// 獲取特定連接的狀態
const health = manager.getHealthStatus('default')

// 獲取所有連接的狀態
const allHealth = manager.getHealthStatus()
allHealth.forEach((health, name) => {
  console.log(`${name}: ${health.status}`)
})
```

#### `getConnectionNames(): string[]`

獲取所有配置的連接名稱。

```typescript
const names = manager.getConnectionNames()
console.log('已配置的連接:', names)
```

#### `enableWarmup(config?: Partial<PoolWarmerConfig>): void`

啟用連接池預熱。

```typescript
manager.enableWarmup({
  targetConnections: 3,
  concurrency: 2,
})
```

#### `warmup(): Promise<WarmupResult>`

執行連接池預熱。

```typescript
const result = await manager.warmup()
console.log(`預熱結果:
  - 總數: ${result.total}
  - 成功: ${result.successful}
  - 失敗: ${result.failed}
  - 耗時: ${result.duration}ms`)
```

### 驅動程序方法

#### `getPoolStats(): PoolStats | null`

獲取連接池統計（如果驅動程序支持）。

```typescript
const driver = connection.getDriver()
const stats = driver.getPoolStats()
```

#### `getPoolHealth(): PoolHealth`

獲取連接池健康狀態（如果驅動程序支持）。

```typescript
const driver = connection.getDriver()
const health = driver.getPoolHealth()
```

## 類型定義

### PoolStats

```typescript
interface PoolStats {
  // 空閒連接數
  idle: number

  // 等待連接的客戶端數
  pending: number

  // 活躍連接數
  active: number

  // 連接總數
  total: number

  // 最大連接數
  max: number
}
```

### PoolHealth

```typescript
interface PoolHealth {
  // 狀態: 'healthy' | 'warning' | 'critical' | 'disconnected'
  status: 'healthy' | 'warning' | 'critical' | 'disconnected'

  // 人類可讀的消息
  message: string

  // 池統計信息（如果可用）
  stats?: PoolStats

  // 最後檢查時間戳
  lastCheck?: Date
}
```

## 實現細節

### 支持的驅動程序

| 驅動程序 | 統計支持 | 健康檢查 |
|---------|--------|--------|
| PostgreSQL | ✅ | ✅ |
| MySQL | ✅ | ✅ |
| MariaDB | ✅ | ✅ |
| BunSQL | ✅ | ✅ |
| SQLite | ⚠️ | ⚠️ |
| MongoDB | ❌ | ❌ |
| Redis | ❌ | ❌ |

**注意**: SQLite 驅動返回簡化的統計信息（總是 1 個連接）。

### 健康評估邏輯

池健康狀態基於以下指標：

- **Healthy**: 利用率 < 70% 且待處理比例 ≤ 50%
- **Warning**: 利用率 70-89% 或待處理比例 > 50%
- **Critical**: 利用率 ≥ 90%
- **Disconnected**: 連接未初始化

### 預熱策略

預熱使用以下策略：

1. 併發建立指定數量的連接
2. 尊重配置的並發限制
3. 在超時時優雅降級
4. 返回每個連接的預熱結果

## 最佳實踐

### 1. 啟動時預熱

```typescript
async function initializeApp() {
  // 啟用健康檢查
  manager.enableHealthCheck()

  // 預熱連接池
  await manager.warmup()

  // 開始應用
  startServer()
}
```

### 2. 監控生產環境

```typescript
manager.enableHealthCheck({
  onCritical: (name, health) => {
    // 發送告警
    alerting.sendAlert(`連接池 "${name}" 已進入臨界狀態`, {
      status: health.status,
      stats: health.stats,
    })
  },
})
```

### 3. 配置調整

根據應用的負載特性調整配置：

```typescript
// 高流量應用
manager.enableHealthCheck({
  checkInterval: 10000, // 更頻繁的檢查
  thresholds: {
    warningUtilization: 0.6,
    criticalUtilization: 0.8,
    maxPendingRatio: 0.3,
  },
})

// 低流量應用
manager.enableHealthCheck({
  checkInterval: 60000, // 不那麼頻繁的檢查
  thresholds: {
    warningUtilization: 0.8,
    criticalUtilization: 0.95,
    maxPendingRatio: 0.7,
  },
})
```

### 4. 優雅關閉

```typescript
async function gracefulShutdown() {
  // manager.shutdown() 會自動停止健康檢查
  await manager.shutdown()
}
```

## 故障排除

### 問題: 健康檢查沒有觸發回調

**原因**: 健康狀態沒有變化

**解決方案**: 確認回調函數正確註冊，並驗證池的實際狀態。

```typescript
// 手動檢查狀態
const health = manager.getHealthStatus('default')
console.log('當前狀態:', health.status)
```

### 問題: 預熱失敗

**原因**: 連接超時或數據庫不可用

**解決方案**: 增加超時時間或檢查數據庫連接

```typescript
manager.enableWarmup({
  timeout: 10000, // 增加超時
  targetConnections: 1, // 減少目標連接數
})
```

### 問題: 連接池統計始終為 null

**原因**: 驅動程序不支持池統計

**解決方案**: 檢查驅動程序是否支持（見上面的支持矩陣）

## 下一步

- **Phase 2**: Prometheus 監控指標
- **Phase 3**: 自適應連接池管理
- **Phase 4**: 完整測試與交付

## 更新歷史

- **2026-02-07**: Phase 1 初始版本
  - PostgreSQL & MySQL 驅動連接池統計
  - 健康檢查系統
  - 連接池預熱機制
