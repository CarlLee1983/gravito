# @gravito/flare

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
