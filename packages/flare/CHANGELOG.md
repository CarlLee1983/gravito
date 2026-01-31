# @gravito/flare

## 3.4.0

### Added

#### Timeout Protection (風險 4.2 解決方案)
- 新增 `TimeoutChannel` 裝飾器 (#P4-01)
  - 通用 timeout 包裝器，可為任何 Channel 加上超時保護
  - 支援 `timeout` 配置（毫秒）和 `onTimeout` 回調
  - 拋出 `TimeoutError` 當超時發生
- 更新所有內建 Channel 支援 timeout 配置 (#P4-02)
  - `SlackChannel`: 預設 30 秒超時
  - `MailChannel`: 預設 30 秒超時
  - `SmsChannel`: 預設 30 秒超時
- 測試覆蓋率: 90.97%

#### Lazy Loading for Queue (風險 4.1 解決方案)
- 新增 `LazyNotification` 抽象基類 (#P4-03)
  - 只儲存 ID，延遲載入資料
  - 快取機制避免重複載入
  - `ensureLoaded()` 自動檢查快取並載入
- 新增序列化守衛工具 (#P4-04)
  - `checkSerializable()` 檢查物件是否可序列化
  - `assertSerializable()` 斷言物件可序列化
  - 偵測不可序列化的型別（Function、Symbol、Promise、WeakMap、循環引用）
- 更新 `deepSerialize` 支援 Lazy Notification (#P4-05)
  - 支援雙底線開頭的特殊屬性（`__lazyId`, `__type`）
  - 過濾單底線開頭的私有屬性（`_cachedData`）
- 測試覆蓋率: 89.98%

#### Rate Limiting (v1.1 短期優化)
- 新增 `ChannelMiddleware` 介面 (#P4-06)
  - 定義中介層標準介面
  - 支援洋蔥模型（Onion Model）執行鏈
- 新增 `TokenBucket` 工具類別 (#P4-07)
  - 實作 Token Bucket 演算法
  - 自動補充機制，無外部依賴
- 新增 `RateLimitMiddleware` 中介層 (#P4-08)
  - 支援多時間窗口（每秒/每分鐘/每小時）
  - 通道獨立限流
  - 支援自定義 CacheStore（分散式限流）
  - 提供 `getStatus()` 和 `reset()` 管理方法
- 更新 `NotificationManager` 支援中介層 (#P4-09)
  - 新增 `use(middleware)` 方法
  - 實作中介層執行鏈
- 測試覆蓋率: 91.97%

#### Preference Driver (v1.1 短期優化)
- 新增 `NotificationPreference` 介面 (#P4-10)
  - 定義用戶通知偏好的資料結構
  - 擴展 `Notifiable` 介面支援 `getNotificationPreferences()`
- 新增 `PreferenceMiddleware` 中介層 (#P4-11)
  - 根據用戶偏好過濾通道
  - 支援通道過濾（enabledChannels, disabledChannels）
  - 支援通知類型過濾（disabledNotifications）
  - 容錯機制（偏好載入失敗時允許發送）
- 更新 `OrbitFlare` 配置 (#P4-12)
  - 新增 `middleware` 配置選項
  - 新增 `enablePreference` 配置選項
  - 新增 `preferenceProvider` 配置選項
- 測試覆蓋率: 89.62%

### Changed
- 更新 `NotificationManager` 支援中介層鏈式執行
- 所有 Channel 預設啟用 30 秒超時保護

### Documentation
- 新增 `RATE_LIMITING.md` 使用文檔
- 新增完整的使用範例檔案
  - `examples/timeout-example.ts`
  - `examples/lazy-notification-example.ts`
  - `examples/serialization-guard-example.ts`
  - `examples/rate-limiting-example.ts`
  - `examples/preference-middleware-example.ts`
- 新增實作總結文檔
  - `PHASE2_TIMEOUT_SUMMARY.md`
  - `PHASE3_RATE_LIMITING_SUMMARY.md`
  - `PHASE4_PREFERENCE_SUMMARY.md`

### Tests
- 新增 178 個測試案例（從 0 增加）
- 整體測試覆蓋率: 90.39%
- 所有測試通過率: 100%

## 3.3.0

### Added

- Added retry mechanism (#P3-01)
  - `RetryConfig` options: `maxAttempts`, `backoff`, `baseDelay`, `maxDelay`
  - Per-notification retry with `ShouldRetry` interface
  - Per-send retry override via `SendOptions`
- Added metrics collection (#P3-02)
  - `NotificationMetricsCollector`
  - Prometheus exporter support
- Added AWS SNS SMS provider support (#P3-03)
- Added template system (#P3-04)
  - `TemplatedNotification` base class
  - `MailTemplate` and `SlackTemplate` interfaces

## 3.2.0

### Added

- Added notification lifecycle hooks (#P2-01)
  - `notification:sending`, `notification:sent`, `notification:queued`
  - `notification:channel:sending`, `notification:channel:sent`, `notification:channel:failed`
  - `notification:batch:start`, `notification:batch:complete`
- Added parallel channel sending support (#P2-02)
  - Added `parallel` option (default: true)
  - Added `concurrency` option to limit concurrent channel sends
- Added batch sending API (#P2-03)
  - `NotificationManager.sendBatch()`
  - `NotificationManager.sendBatchStream()`
- Added configuration validation for `OrbitFlare` (#P2-05)

### Changed

- Refactored `OrbitFlare` type safety (#P2-04)

## 3.1.0

### Changed

- `NotificationManager.send()` now returns `NotificationResult` object, containing results for each channel (#P1-01)
  - Added `SendResult` and `NotificationResult` types
  - Added `throwOnError` option to optionally throw `AggregateError` on failure

### Fixed

- Fixed optional method type definitions in `Notification` base class (#P1-02)
- Fixed serialization issues with nested objects and Date objects (#P1-03)

### Added

- Added `deepSerialize` and `deepDeserialize` utility functions

## 3.0.3

### Patch Changes

- @gravito/signal@3.0.3

## 3.0.2

### Patch Changes

- Updated dependencies [905588f]
  - @gravito/stream@2.0.1
  - @gravito/signal@3.0.2

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/stream@1.0.3
  - @gravito/radiance@1.0.3
  - @gravito/signal@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/radiance@1.0.2
  - @gravito/signal@3.0.0
  - @gravito/stream@1.0.2

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/radiance@1.0.1
  - @gravito/signal@2.0.0
  - @gravito/stream@1.0.1

## 1.0.1

### Patch Changes

- Updated dependencies
  - @gravito/signal@1.0.1

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/stream@1.0.0
  - @gravito/radiance@1.0.0
  - @gravito/signal@1.0.0
