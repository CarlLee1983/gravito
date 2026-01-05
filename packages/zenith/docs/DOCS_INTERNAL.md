# Internal Technical Documentation

This document records technical implementations for Dead Letter Queues (DLQ) and Worker Metrics within the Flux system.

## 1. Dead Letter Queue (DLQ)

### Storage (Redis)
Failed jobs are moved to a specific list with the suffix `:failed`.
- **Key**: `{queue}:failed`
- **Cap**: 1,000 items (capped via `LTRIM` in `RedisDriver.fail`).

### Life Cycle
1. `Worker` attempts to process a job.
2. On failure, `Worker` calculates retry delay using `job.getRetryDelay(attempt)`.
3. If `attempt >= maxAttempts`, `Consumer` catches the error.
4. `Consumer` calls `QueueManager.fail(job, error)`.
5. Driver pushes the job to the `:failed` list with `error` and `failedAt` metadata.

---

## 2. Worker Metrics

Workers report health metrics during their heartbeat cycle (default: every 5s).

### Metric Payload Schema
```json
{
  "cpu": 0.15,         // Load average (normalized by cores)
  "ram": {
    "rss": 120,        // Resident Set Size (MB)
    "heapUsed": 45,    // V8 Heap Used (MB)
    "heapTotal": 64    // V8 Heap Total (MB)
  }
}
```

### Storage
In Redis, metrics are stored as part of the `flux_console:workers:{id}` hash.
- **Field**: `metrics` (JSON string)

---

## 3. Bulk Retry Logic (Lua)

To ensure atomicity and performance, bulk retries of failed jobs use Lua scripts.

### Retry All Script
Moves all elements from `{queue}:failed` to `{queue}` then deletes the failed list.
```lua
local jobs = redis.call('LRANGE', KEYS[1], 0, -1)
for i, job in ipairs(jobs) do
  redis.call('RPUSH', KEYS[2], job)
end
redis.call('DEL', KEYS[1])
return #jobs
```

---

## 4. System Logs & Archiving

To maintain a permanent record of system events while keeping Redis memory usage low, Flux Console uses an asynchronous archiving pattern.

### Live Logs (Redis)
* **Key**: `flux_console:logs:system` (List)
* **Strategy**: LILO (Last-In-Last-Out) capped at 100 items.
* **Update**: Every `publishLog` call pushes to this list and trims it.

### Persistent Archiving (SQL)
* **Trigger**: Every `QueueService.publishLog` call asynchronously sends the log to the configured `PersistenceAdapter`.
* **Table**: `flux_system_logs` (MySQL or SQLite).
* **Search**: The `/api/logs/archive` endpoint performs direct SQL queries with filters on `level`, `worker_id`, `queue`, and `message` content.
* **Retention**: Cleanup is handled via `PersistenceAdapter.cleanup`, removing logs older than the configured threshold (default: 30 days).
