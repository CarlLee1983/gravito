# Bun Worker Pool Guide

The `@gravito/resilience` module provides a high-performance **Worker Pool** implementation specifically optimized for the **Bun** runtime. This allows for multi-threaded task processing without the overhead of traditional Node.js child processes.

## 1. Core Worker Pool Concepts

- **Concurrency**: Controls the number of tasks processed simultaneously per worker.
- **Worker Threads**: The number of Bun worker threads in the pool.
- **Auto-scaling**: Dynamically increases/decreases the number of active workers based on current queue depth and utilization.

## 2. Basic Configuration

To start a worker pool, you can register it in your application bootstrap or within a Satellite:

```typescript
import { WorkerPool } from '@gravito/resilience'

const pool = new WorkerPool({
  minWorkers: 2,
  maxWorkers: 8,
  concurrency: 4,
  workerThreads: 4,
  enableAutoScaling: true,
})

await pool.start()
```

## 3. Integration with `@gravito/stream` (Bull Queue)

The worker pool can pull tasks directly from a distributed queue using the `TaskSource` interface. This is common in **Galaxy Architecture** where one Satellite pushes a task and the worker pool processes it in the background.

```typescript
import { BullQueueSource } from '@gravito/resilience/bridge'

const pool = new WorkerPool({
  taskSource: new BullQueueSource(queueInstance),
  concurrency: 10,
})

await pool.start()
```

## 4. Observability & Monitoring

The Worker Pool includes native **OpenTelemetry** support for tracking metrics:

- `worker_pool_size`: Current number of active workers.
- `worker_pool_utilization`: Average CPU/Memory utilization of the pool.
- `worker_pool_queue_depth`: Number of tasks waiting to be processed.
- `worker_task_duration`: Histogram of task execution times.

```typescript
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('gravito-resilience')
const pool = new WorkerPool(config, meter)
```

## 5. Graceful Shutdown

Always ensure your worker pool is properly closed during application shutdown to avoid orphaned processes or lost tasks.

```typescript
process.on('SIGTERM', async () => {
  await pool.stop()
  console.log('Worker pool shut down gracefully.')
})
```
