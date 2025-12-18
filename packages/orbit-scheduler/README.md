# @gravito/orbit-scheduler

Enterprise-grade distributed task scheduler for Gravito framework.

## Features

- **Fluent API**: Expressive syntax for defining task schedules (e.g. `.daily().at('14:00')`).
- **Distributed Locking**: Prevents duplicate task execution across multiple servers (supports Memory, Cache, Redis).
- **Cron Integration**: Designed to be triggered by a single system cron entry.
- **Hooks**: Events for task success/failure.

## Installation

```bash
bun add @gravito/orbit-scheduler
```

## Quick Start

1. Register the orbit in your application boot:

```typescript
import { OrbitScheduler } from '@gravito/orbit-scheduler'
import { OrbitCache } from '@gravito/orbit-cache' // Optional, for cache lock

await PlanetCore.boot({
  config: {
    scheduler: {
      lock: { driver: 'cache' },
      nodeRole: 'worker' // 'api', 'web', etc.
    }
  },
  orbits: [
    OrbitCache,      // Load cache first if using cache driver
    OrbitScheduler
  ]
})
```

2. Schedule tasks:

```typescript
// Access scheduler from core services or context
const scheduler = core.services.get('scheduler')

scheduler.task('daily-cleanup', async () => {
    await db.cleanup()
})
.daily()
.at('02:00')
.onOneServer() // Distributed lock
```

## Distributed Locking

To prevent tasks from running simultaneously on multiple servers, use `onOneServer()` (or `withoutOverlapping()`).
The default lock driver is `memory` (single server), but you should configure `cache` or `redis` for distributed setups.

## CLI Usage

The Gravito CLI provides commands to run and manage your scheduled tasks.

### List Tasks
View all registered tasks and their schedules:
```bash
bun run gravito schedule:list
```

### Run (Cron Mode)
Add this command to your system's crontab (e.g., `crontab -e`) to run every minute:
```bash
* * * * * cd /path/to/project && bun run gravito schedule:run
```

### Run (Daemon Mode)
If you prefer a long-running process (e.g., in Docker or specific worker environments):
```bash
bun run gravito schedule:work
```
This will poll every minute to execute due tasks.

### Entry Point
By default, commands look for `src/index.ts`. If your bootstrap file is elsewhere, use `--entry`:
```bash
gravito schedule:list --entry src/bootstrap.ts
```

## Performance Monitoring

The scheduler emits hooks providing execution metrics. You can listen to these events via `core.hooks`:

| Hook | Payload | Description |
|------|---------|-------------|
| `scheduler:run:start` | `{ date }` | Scheduler checks started |
| `scheduler:run:complete` | `{ date, dueCount }` | Scheduler checks completed |
| `scheduler:task:start` | `{ name, startTime }` | Individual task execution started |
| `scheduler:task:success` | `{ name, duration }` | Task completed successfully |
| `scheduler:task:failure` | `{ name, error, duration }` | Task failed |

## Optimizations

### Lightweight Execution
This package includes a lightweight, dependency-free cron parser (`SimpleCronParser`) for standard cron expressions (e.g. `* * * * *`, `0 0 * * *`). The heavy `cron-parser` library is only lazy-loaded when complex expressions are encountered, keeping your runtime memory footprint minimal.

## Process Execution & Node Roles

You can also run shell commands and restrict tasks to specific node roles (e.g., `api` vs `worker`).

### Configuration

Add `nodeRole` to your configuration:

```typescript
config: {
  scheduler: {
    nodeRole: 'worker'
  }
}
```

### Mode A: Broadcast (Maintenance)

Run on EVERY node that matches the role. Useful for machine-specific maintenance.

```typescript
// Clean temp files on ALL 'api' nodes
scheduler.exec('clean-tmp', 'rm -rf /tmp/*')
  .daily()
  .onNode('api')
```

### Mode B: Single-point (Task)

Run on ONE matching node only. Useful for centralized jobs like DB migrations or reports.

```typescript
// Run migration on ONE 'worker' node
scheduler.exec('migrate', 'bun run db:migrate')
  .onNode('worker')
  .onOneServer()
```
