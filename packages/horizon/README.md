# @gravito/horizon

Enterprise-grade distributed task scheduler for the Gravito framework.

`@gravito/horizon` provides a robust, fluent, and highly configurable system for managing scheduled tasks (Cron jobs) in a distributed environment. It supports multiple locking mechanisms to prevent duplicate execution, node role filtering, retries, and comprehensive monitoring hooks.

## Features

- **Fluent API**: Human-readable syntax for defining task schedules (e.g., `.daily().at('14:00')`).
- **Distributed Locking**: Prevents duplicate task execution across multiple servers (supports Memory, Cache, and Redis).
- **Node Role Awareness**: Restrict tasks to specific nodes (e.g., only run on `worker` nodes) or broadcast maintenance tasks to all matching nodes.
- **Reliability Features**: Built-in support for task timeouts and automatic retries with configurable delays.
- **Shell Command Support**: Schedule raw shell commands alongside TypeScript callbacks (powered by [@gravito/nova](../nova) for type-safe execution).
- **Lazy Cron Parsing**: Lightweight `SimpleCronParser` for standard expressions, with `cron-parser` only loaded when complex logic is required.
- **Comprehensive Hooks**: Lifecycle events for monitoring task success, failure, retries, and scheduler activity.

## Installation

```bash
bun add @gravito/horizon
```

### Peer Dependencies
- `@gravito/core` (Required)
- `@gravito/stasis` (Optional, for Cache/Redis distributed locking)

## Quick Start

### 1. Register the Orbit

Initialize Horizon in your application bootstrap process:

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitHorizon } from '@gravito/horizon'
import { OrbitCache } from '@gravito/stasis' // Optional, for distributed locking

await PlanetCore.boot({
  config: {
    scheduler: {
      lock: { driver: 'cache' }, // Uses @gravito/stasis cache
      nodeRole: process.env.NODE_ROLE || 'worker'
    }
  },
  orbits: [
    OrbitCache,
    OrbitHorizon
  ]
})
```

### 2. Schedule Tasks

Define tasks in your service providers or bootstrap files:

```typescript
import { SchedulerManager } from '@gravito/horizon'

const scheduler = core.services.get<SchedulerManager>('scheduler')

// Basic callback task
scheduler.task('daily-cleanup', async () => {
  await db.cleanup()
})
.dailyAt('02:00')
.onOneServer() // Distributed lock

// Shell command execution (type-safe via @gravito/nova)
scheduler.exec('sync-storage', 'aws s3 sync ./local s3://bucket')
  .everyFiveMinutes()
  .onNode('worker')
  .retry(3, 5000) // Retry 3 times with 5s delay
  .timeout(300000) // 5 minute timeout
```

## Scheduling API

### Frequency Methods
- `everyMinute()`: Every minute (`* * * * *`)
- `everyFiveMinutes()`, `everyTenMinutes()`, `everyFifteenMinutes()`, `everyThirtyMinutes()`
- `hourly()`, `hourlyAt(minute)`: Every hour at a specific minute.
- `daily()`, `dailyAt('HH:mm')`: Once per day.
- `weekly()`, `weeklyOn(day, 'HH:mm')`: Once per week (0=Sunday).
- `monthly()`, `monthlyOn(date, 'HH:mm')`: Once per month.
- `cron('expression')`: Custom 5-part cron expression.

### Constraints & Execution Control
- `timezone('Asia/Taipei')`: Set execution timezone (defaults to UTC).
- `onOneServer(lockTtl?)`: Ensure only one instance of this task runs globally at a time (time-window lock).
- `withoutOverlapping(ttl?)`: Prevent task from executing if previous instance is still running (execution lock).
- `onNode(role)`: Only run this task if the current node's role matches.
- `runInBackground()`: Don't wait for task completion in the main scheduler loop.

#### Overlapping Control vs. OnOneServer

- **`onOneServer()`**: Uses a **time-window lock** to prevent multiple servers from executing the same task in the same minute window. Lock key is based on `task:{name}:{timestamp_minute}`.
- **`withoutOverlapping()`**: Uses an **execution lock** to prevent a task from running if the previous execution hasn't completed yet. Lock key is `task:running:{name}`.

You can use both together for comprehensive protection:

```typescript
scheduler.task('heavy-sync', async () => {
  // Long-running task (may take 5+ minutes)
  await syncLargeDataset()
})
.everyMinute()
.onOneServer()         // Prevent multi-server execution
.withoutOverlapping()  // Prevent overlapping executions
.timeout(600000)       // 10 minute timeout
```

### Reliability & Lifecycle
- `timeout(ms)`: Set maximum execution time (defaults to 1 hour).
- `retry(attempts, delayMs)`: Number of retries on failure.
- `onSuccess(callback)`: Execute a callback when the task succeeds.
- `onFailure(callback)`: Execute a callback when the task fails.

## CLI Usage

The Gravito CLI allows you to manage and run your scheduler:

### List Registered Tasks
```bash
bun run gravito schedule:list
```

### Run (Cron Mode)
Add this to your system crontab to trigger the scheduler every minute:
```bash
* * * * * cd /app && bun run gravito schedule:run
```

### Run (Daemon Mode)
Poll every minute in a long-running process (ideal for Docker):
```bash
bun run gravito schedule:work
```

## Shell Execution with Nova

Horizon uses [@gravito/nova](../nova) for shell command execution, which provides:

- **Type-Safe Execution**: Template literal-based API prevents shell injection
- **Automatic Escaping**: All command arguments are automatically escaped
- **Consistent API**: Same Shell API used across Gravito framework
- **Error Handling**: Comprehensive error capture with stdout/stderr

Example with advanced shell operations:

```typescript
import { Shell } from '@gravito/nova'

scheduler.task('backup-database', async () => {
  // Use nova Shell API for custom commands
  const result = await Shell.run`mysqldump -u ${dbUser} -p${dbPassword} ${dbName}`
    .nothrow()
    .run()

  if (result.success) {
    // Upload backup to S3
    await Shell.run`aws s3 cp - s3://backups/${Date.now()}.sql`
      .nothrow()
      .run()
  }
})
.dailyAt('03:00')
.onOneServer()
```

---

## Monitoring Hooks

Subscribe to hooks via `core.hooks` to build monitoring dashboards or alerts:

| Hook | Payload | Description |
|------|---------|-------------|
| `scheduler:run:start` | `{ date }` | Scheduler evaluation started. |
| `scheduler:run:complete` | `{ date, dueCount }` | Scheduler evaluation finished. |
| `scheduler:task:start` | `{ name, startTime }` | Individual task started. |
| `scheduler:task:skipped` | `{ name, reason, timestamp }` | Task was skipped (e.g., due to overlapping execution). |
| `scheduler:task:retry` | `{ name, attempt, error }` | Task failed and is retrying. |
| `scheduler:task:success` | `{ name, duration, attempts }` | Task finished successfully. |
| `scheduler:task:failure` | `{ name, error, duration }` | Task failed after all retries. |

## License

MIT
