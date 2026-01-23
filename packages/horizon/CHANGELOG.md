# @gravito/horizon

## 3.1.0

### ⚠ Breaking Changes

- **Validation**: Invalid time formats, timezones, and cron expressions now throw errors immediately instead of producing invalid schedules or failing silently at runtime.
  - `at()`, `dailyAt()`, `weeklyOn()`, `monthlyOn()` require strict "HH:mm" format (e.g., "09:00", not "9:00").
  - `hourlyAt()` requires integer 0-59.
  - `cron()` requires a valid 5-part cron expression.

### Features

- **Timeout Control**: Added `.timeout(ms)` method to `TaskSchedule`. Default timeout is 1 hour.
- **Retry Mechanism**: Added `.retry(attempts, delayMs)` method to `TaskSchedule`. Allows automatic retries for failed tasks.
- **Enhanced Hooks & Metrics**:
  - Added `scheduler:task:retry` hook for monitoring retry attempts.
  - Success and failure hooks now include `attempts` count in their payload.
- **Enhanced Validation**: 
  - Added `.timezone()` validation with helpful error messages.
  - Added `.cron()` syntax validation.
- **Logging**: Added debug logging for due tasks in `SchedulerManager`.

### Performance

- **Caching**: Implemented O(1) LRU caching for `CronParser` to optimize high-frequency schedule checks.

## 3.0.1

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.1
  - @gravito/stasis@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.2.0
  - @gravito/stasis@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @gravito/core@1.1.0
  - @gravito/stasis@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @gravito/core@1.0.0
  - @gravito/stasis@1.0.0
