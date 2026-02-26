# Distributed Scheduling Guide

Scheduling tasks in a single process is easy. Scheduling them in a distributed **Galaxy Architecture** with multiple nodes requires a specialized coordinator. `@gravito/horizon` provides this layer.

## 1. Multi-Server Coordination (onOneServer)

When running multiple instances of the same application, you typically only want a task to run once per scheduled window.

```typescript
scheduler.task('prune-logs', async () => {
  await db.logs.prune()
})
.daily()
.onOneServer() // Uses a distributed lock (via Plasma/Redis)
```

**How it works:**
Horizon attempts to acquire a lock for the specific task and time window (e.g., `task:prune-logs:2026-02-26-14-00`). The first node to get the lock executes the task; others skip it.

## 2. Preventing Overlapping (withoutOverlapping)

If a task is scheduled every minute but sometimes takes 2 minutes to complete, you might want to prevent a second instance from starting.

```typescript
scheduler.task('heavy-sync', async () => {
  await performLargeSync()
})
.everyMinute()
.withoutOverlapping() // Uses an execution lock
```

## 3. Node Role Awareness

In many architectures, some nodes are "Workers" while others are "API Gateways". Horizon can restrict tasks based on the node's configured role.

```typescript
// gravito.config.ts
config: {
  scheduler: { nodeRole: 'worker' }
}

// In your code
scheduler.task('background-maintenance', () => { ... })
  .hourly()
  .onNode('worker') // Only runs if current node is a 'worker'
```

## 4. Scheduling Shell Commands

Horizon integrates with `@gravito/nova` to safely execute external scripts or system tools.

```typescript
scheduler.exec('backup-db', 'mysqldump -u root my_db > backup.sql')
  .dailyAt('03:00')
  .retry(3, 10000) // Retry 3 times if shell exit code is non-zero
```

## 5. Scheduler "Daemon" vs "Cron" Mode

- **Cron Mode**: You add `bun run gravito schedule:run` to your system's crontab. The process starts, evaluates tasks, executes what is due, and exits.
- **Daemon Mode (Work)**: You run `bun run gravito schedule:work`. This starts a long-running process that polls every minute. **This is recommended for Docker/Kubernetes environments.**

## 6. Observability

Horizon emits hooks that you can listen to for alerting or dashboards:

- `scheduler:task:start`
- `scheduler:task:success`
- `scheduler:task:failure` (Trigger a Slack alert here!)
