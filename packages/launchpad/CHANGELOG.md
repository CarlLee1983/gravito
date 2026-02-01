# @gravito/launchpad

## 1.3.0

### Minor Changes

- **P0 緊急修復：資源限制與隊列機制**
  - 新增 `PoolConfig` 配置介面，支援 `maxRockets`、`maxQueueSize`、`queueTimeoutMs` 等參數
  - 實現 `MissionQueue` 任務隊列管理，支援 FIFO 排程和超時處理
  - 重構 `PoolManager.assignMission()`，加入三種資源耗盡策略：
    - `queue`：任務進入等待隊列（預設）
    - `reject`：立即拒絕新任務
    - `dynamic`：有限度的動態建立容器
  - 新增 Pool 狀態查詢 API：`getPoolStatus()`、`getQueueStats()`
  - 新增領域事件：`PoolExhausted`、`MissionQueued`、`MissionQueueTimeout`
  - 修改 `RefurbishConfig`，支援自訂清理命令和失敗處理策略

### Features

- **資源保護機制**：防止 Rocket 無限增長導致系統資源耗盡
- **任務隊列**：當 Pool 耗盡時，新任務自動進入隊列等待
- **可配置策略**：支援多種資源管理策略，適應不同使用場景
- **深度清理優化**：改進容器清理邏輯，減少髒污風險

### Breaking Changes

- `PoolManager` 構造函數新增可選的 `config` 參數
- `RefurbishUnit` 構造函數新增可選的 `config` 參數
- `warmup()` 方法的 `count` 參數改為可選，預設使用配置值

### Migration Guide

```typescript
// 舊版（仍然有效）
const manager = new PoolManager(docker, repo)

// 新版（可選配置）
const manager = new PoolManager(docker, repo, refurbish, router, {
  maxRockets: 10,
  exhaustionStrategy: 'queue',
  maxQueueSize: 50,
})
```

## 1.2.2

### Patch Changes

- 905588f: fix: replace insecure Math.random() with crypto.randomUUID() for ID and temporary path generation (CWE-330)

## 1.2.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/enterprise@1.0.3
  - @gravito/ripple@3.0.1
  - @gravito/stasis@3.0.1

## 1.2.0

### Minor Changes

- Implement several more examples and fix module issues, including:
  - Support middleware in core route definitions.
  - Improve Atlas driver loading and dependency injection.
  - Add PostgreSQL support to Ecommerce MVC example.
  - Fix internal type resolution issues across packages.

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/enterprise@1.0.2
  - @gravito/ripple@3.0.0
  - @gravito/stasis@3.0.0

## 1.1.0

### Minor Changes

- Launch standalone high-performance engine and core optimizations.

### Patch Changes

- q
- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/enterprise@1.0.1
  - @gravito/ripple@2.0.0
  - @gravito/stasis@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/enterprise@1.0.0
  - @gravito/ripple@1.0.0
  - @gravito/stasis@1.0.0
