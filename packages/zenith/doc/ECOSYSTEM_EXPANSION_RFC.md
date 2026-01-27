# Zenith Ecosystem Expansion RFC

**Status**: Draft
**Date**: 2026-01-10
**Goal**: Expand Zenith monitoring capabilities beyond Gravito/Laravel to Python, Node.js, and Go ecosystems.

---

## 1. Executive Summary

Gravito Zenith (Flux Console) is a unified control plane for background job processing. Currently, it supports **Gravito Stream** (Native) and **Laravel Queues** (via `laravel-zenith`). To become a true polyglot observability platform, we need to implement connectors for other popular queue systems.

This RFC defines the **Universal Zenith Protocol (UZP)** and proposes implementation roadmaps for Python (Celery) and Node.js (BullMQ).

---

## 2. The Universal Zenith Protocol (UZP)

Any background job system can be monitored by Zenith if it implements the following Redis-based interfaces.

### 2.1. Discovery (Heartbeat)
Workers must announce their presence every 30 seconds to avoid being marked as "Offline".

*   **Command**: `SETEX flux_console:worker:<worker_id> 60 <payload>`
*   **Payload (JSON)**:
    ```json
    {
      "id": "celery@worker-1",
      "hostname": "pod-xyz",
      "pid": 1234,
      "uptime": 3600,
      "queues": ["high", "default"],
      "concurrency": 4,
      "memory": { "rss": "50MB", "heapUsed": "N/A" },
      "framework": "celery", // "laravel", "bullmq", "asynq"
      "language": "python",  // "php", "typescript", "go"
      "timestamp": "2026-01-10T12:00:00Z"
    }
    ```

### 2.2. Event Stream (Logs)
Workers publish lifecycle events to a shared Pub/Sub channel.

*   **Command**: `PUBLISH flux_console:logs <payload>`
*   **Payload (JSON)**:
    ```json
    {
      "level": "info", // "info" (start), "success", "error"
      "message": "Processing Task: tasks.send_email",
      "workerId": "celery@worker-1",
      "queue": "default",
      "jobId": "uuid-v4",
      "timestamp": "2026-01-10T12:00:01Z",
      "metadata": {
        "attempt": 1,
        "latency": 45 // ms (for success/error events)
      }
    }
    ```

### 2.3. Metrics (Optional but Recommended)
Connectors should increment counters for throughput aggregation.

*   `INCR flux_console:metrics:processed`
*   `INCR flux_console:metrics:failed`

---

## 3. Implementation Plan: Python (Celery)

**Target**: `gravito/zenith-celery` (PyPI Package)

### Architecture
Celery has a rich Signal system. We can hook into `worker_ready`, `task_prerun`, `task_success`, and `task_failure`.

### Component Design
1.  **ZenithMonitor**: A Celery Bootstep that starts a background thread for Heartbeats.
2.  **SignalHandlers**:
    *   `task_prerun`: Publish `level: info` log.
    *   `task_success`: Publish `level: success` log + metrics.
    *   `task_failure`: Publish `level: error` log with traceback.

### Configuration
```python
# celery.py
app.conf.zenith_redis_url = "redis://localhost:6379/0"
app.conf.zenith_enabled = True
```

---

## 4. Implementation Plan: Node.js (BullMQ)

**Target**: `@gravito/zenith-bullmq` (NPM Package)

*Note: Gravito Stream is based on BullMQ principles but internal. This adapter allows *standard* BullMQ instances (e.g., in a NestJS app) to report to Zenith.*

### Architecture
BullMQ uses `QueueEvents` (which listens to Redis streams). A separate "Monitor" process is the best approach to avoid modifying the worker code too much.

### Component Design
1.  **ZenithMonitor Class**:
    ```typescript
    const monitor = new ZenithMonitor({
      connection: redisOptions,
      queues: ['email', 'reports']
    });
    monitor.start();
    ```
2.  It listens to BullMQ global events (completed, failed) and bridges them to UZP.
3.  **Heartbeat**: Since BullMQ workers don't have a central registry, the Monitor acts as a "Virtual Worker" or we require users to instantiate a `ZenithWorker` wrapper.

---

## 5. Implementation Plan: Go (Asynq)

**Target**: `github.com/gravito-framework/zenith-asynq`

### Architecture
Asynq provides `Server` middleware.

### Component Design
1.  **Middleware**: `zenith.NewMiddleware(redisClient)`.
2.  Wraps handler execution to capture Start/Success/Fail times.
3.  Publishes to Redis asynchronously.

---

## 6. Future Work: Rust (Faktory?)
(To be determined based on demand)
