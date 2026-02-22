# @gravito/horizon

## 3.2.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints

- Updated dependencies
  - @gravito/core@1.6.1
  - @gravito/stasis@3.1.1

## 3.2.0

### ⚠ Breaking Changes

- **`withoutOverlapping()` 行為變更**: 此方法不再是 `onOneServer()` 的別名。現在實作獨立的執行鎖機制，防止任務在前次執行未完成時重複觸發。
  - **舊行為**: `withoutOverlapping(300)` 等同於 `onOneServer(300)`，設置時間窗口鎖。
  - **新行為**: `withoutOverlapping(3600)` 使用執行鎖 (`task:running:{name}`)，並在任務完成時主動釋放。
  - **遷移指南**: 如果你希望保持舊行為（防止多伺服器同時執行），請改用 `onOneServer()`。如果需要兩者兼具，可同時使用：
    ```typescript
    scheduler
      .task("my-task", callback)
      .everyMinute()
      .onOneServer(300) // 時間窗口鎖
      .withoutOverlapping(3600); // 執行鎖
    ```

### Features

- **Overlapping Control**: 實作真正的任務重疊防護機制。
  - 新增 `preventOverlapping` 和 `overlappingExpiresAt` 屬性到 `ScheduledTask` 介面。
  - 使用獨立的執行鎖 (`task:running:{name}`) 追蹤任務執行狀態。
  - 任務完成後主動釋放鎖，支援背景任務與前景任務。
  - 失敗時自動釋放鎖，確保系統不會被鎖住。
- **新增 Hook 事件**: 新增 `scheduler:task:skipped` 事件，當任務因重疊而被跳過時觸發。

### Documentation

- 更新 README.md，新增 Overlapping Control 使用說明與範例。
- 更新 `docs/architecture/horizon.md`，新增執行鎖技術規格與設計決策說明。
- 將版本升級至 v1.1.0，標記 Overlapping Control 功能為已完成。

### Tests

- 新增 `tests/overlapping.test.ts` 測試檔案，涵蓋 8 個測試案例。
- 測試覆蓋率包括：任務重疊檢測、鎖釋放、背景任務、失敗處理、與 `onOneServer()` 協同運作等。

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
