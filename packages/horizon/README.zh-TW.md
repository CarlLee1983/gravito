# @gravito/horizon

Gravito 框架的企業級分散式任務排程器。

`@gravito/horizon` 為管理分散式環境中的定時任務（Cron jobs）提供了一個強大、流暢且高度可配置的系統。它支援多種鎖定機制以防止重複執行、節點角色過濾、重試機制以及完整的監控 Hook。

## 特色

- **Fluent API**: 使用人類可讀的語法定義任務排程（例如：`.daily().at('14:00')`）。
- **分散式鎖**: 防止任務在多台伺服器上同時執行（支援 Memory、Cache 與 Redis）。
- **節點角色過濾**: 可將任務限制在特定角色（如 `worker`）的節點上執行，或將維護任務廣播至所有匹配節點。
- **高可靠性**: 內建任務超時控制與自動重試機制（可配置延遲時間）。
- **Shell 指令支援**: 除了 TypeScript 回呼函式，也能排程執行原始 Shell 指令。
- **延遲 Cron 解析**: 對於標準表達式使用輕量級的 `SimpleCronParser`，僅在需要複雜邏輯時才加載 `cron-parser`。
- **完整的 Hook 機制**: 提供生命週期事件，用於監控任務成功、失敗、重試以及排程器狀態。

## 安裝

```bash
bun add @gravito/horizon
```

### 同儕依賴 (Peer Dependencies)
- `@gravito/core` (必需)
- `@gravito/stasis` (選填，用於 Cache/Redis 分散式鎖)

## 快速開始

### 1. 註冊 Orbit

在應用程式啟動流程中初始化 Horizon：

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitHorizon } from '@gravito/horizon'
import { OrbitCache } from '@gravito/stasis' // 選填，用於分散式鎖

await PlanetCore.boot({
  config: {
    scheduler: {
      lock: { driver: 'cache' }, // 使用 @gravito/stasis 快取
      nodeRole: process.env.NODE_ROLE || 'worker'
    }
  },
  orbits: [
    OrbitCache,
    OrbitHorizon
  ]
})
```

### 2. 設定排程任務

在 Service Provider 或啟動腳本中定義任務：

```typescript
import { SchedulerManager } from '@gravito/horizon'

const scheduler = core.services.get<SchedulerManager>('scheduler')

// 基礎回呼任務
scheduler.task('daily-cleanup', async () => {
  await db.cleanup()
})
.dailyAt('02:00')
.onOneServer() // 開啟分散式鎖

// Shell 指令執行
scheduler.exec('sync-storage', 'aws s3 sync ./local s3://bucket')
  .everyFiveMinutes()
  .onNode('worker')
  .retry(3, 5000) // 失敗重試 3 次，每次間隔 5 秒
```

## 排程 API

### 頻率方法 (Frequency Methods)
- `everyMinute()`: 每分鐘執行 (`* * * * *`)
- `everyFiveMinutes()`, `everyTenMinutes()`, `everyFifteenMinutes()`, `everyThirtyMinutes()`
- `hourly()`, `hourlyAt(minute)`: 每小時的特定分鐘執行。
- `daily()`, `dailyAt('HH:mm')`: 每天執行一次。
- `weekly()`, `weeklyOn(day, 'HH:mm')`: 每週執行一次 (0=週日)。
- `monthly()`, `monthlyOn(date, 'HH:mm')`: 每月執行一次。
- `cron('expression')`: 使用自定義的 5 段式 Cron 表達式。

### 限制與約束 (Constraints)
- `timezone('Asia/Taipei')`: 設定執行時區（預設為 UTC）。
- `onOneServer(lockTtl?)`: 確保該任務在全球環境中同一時間僅由一個實例執行。
- `onNode(role)`: 僅在當前節點角色匹配時執行。
- `runInBackground()`: 任務執行時不阻塞排程器主迴圈。

### 可靠性與生命週期 (Reliability & Lifecycle)
- `timeout(ms)`: 設定最大執行時間（預設為 1 小時）。
- `retry(attempts, delayMs)`: 設定失敗後的重試次數。
- `onSuccess(callback)`: 任務執行成功時觸發。
- `onFailure(callback)`: 任務執行失敗時觸發。

## CLI 使用方法

透過 Gravito CLI 管理與運行排程器：

### 列出所有已註冊任務
```bash
bun run gravito schedule:list
```

### 運行（Cron 模式）
將此指令加入系統 crontab，每分鐘觸發一次排程檢查：
```bash
* * * * * cd /app && bun run gravito schedule:run
```

### 運行（Daemon 模式）
在長駐程序中每分鐘輪詢一次（適合 Docker 環境）：
```bash
bun run gravito schedule:work
```

## 監控 Hook

透過 `core.hooks` 訂閱事件，以建立監控儀表板或警報系統：

| Hook | Payload | 說明 |
|------|---------|-------------|
| `scheduler:run:start` | `{ date }` | 排程檢查開始。 |
| `scheduler:run:complete` | `{ date, dueCount }` | 排程檢查結束。 |
| `scheduler:task:start` | `{ name, startTime }` | 單一任務開始執行。 |
| `scheduler:task:retry` | `{ name, attempt, error }` | 任務失敗並正在重試。 |
| `scheduler:task:success` | `{ name, duration, attempts }` | 任務成功完成。 |
| `scheduler:task:failure` | `{ name, error, duration }` | 任務在所有重試後依然失敗。 |

## 授權條款

MIT
