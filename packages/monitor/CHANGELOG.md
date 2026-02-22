# @gravito/monitor

## 3.1.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/photon@1.0.1

## 3.1.0 (2026-01-31)

### Minor Changes

- **feat: 新增 Health Cache 統計與監控**

  - 新增 `getCacheStats()` 方法返回 cache hits/misses/hitRate
  - Health endpoint 回應現在包含 `cache` 統計資訊
  - 新增 Prometheus metrics:
    - `health_cache_hits_total`: Cache 命中次數
    - `health_cache_misses_total`: Cache 未命中次數
    - `health_cache_hit_rate`: Cache 命中率 (0.0-1.0)

- **feat: Metrics Middleware 自動使用 routePattern**
  - 優先使用 `ctx.req.routePattern` 而非 raw path
  - 保留 `normalizePath()` 作為降級方案
  - 完全防止高基數問題

### Patch Changes

- **fix: 預設啟用 Health Cache 防止雪崩（HIGH）**

  - `cacheTtl` 預設值從 `0` 改為 `10000ms` (10 秒)
  - 防止高頻 K8s Probe 直接打到下游服務
  - 建議：根據 Probe 頻率調整 cacheTtl

- **docs: 新增配置範例和最佳實踐指南**
  - 新增 `examples/monitor-config.example.ts`
  - 包含開發/測試/生產環境的配置範例
  - 詳細說明 cacheTtl 和 sampleRate 的選擇指南

### Dependencies

- Updated @gravito/core@1.6.0

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
