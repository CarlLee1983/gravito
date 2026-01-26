# @gravito/stream

> Lightweight, high-performance queue and background job system for Galaxy Architecture.

[![npm version](https://img.shields.io/npm/v/@gravito/stream.svg)](https://www.npmjs.com/package/@gravito/stream)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/stream** is the standard background processing unit for Gravito applications. Built on the **Orbit** pattern, it provides a unified abstraction for various message brokers and queue systems, allowing you to scale from simple in-memory tasks to distributed event-driven architectures with zero friction.

## ✨ Features

- 🪐 **Orbit Integration** - Native integration with PlanetCore micro-kernel and dependency injection.
- 🔌 **Multi-Broker Support** - Built-in drivers for **Redis**, **SQS**, **Kafka**, **RabbitMQ**, **Database** (SQL), and **Memory**.
- 🛠️ **Job-Based API** - Clean, class-based job definitions with built-in serialization and failure handling.
- 🚀 **High Throughput** - Optimized for **Bun**, supporting batch consumption, concurrent processing, and adaptive polling.
- 🛡️ **Reliability** - Built-in exponential backoff retries, Dead Letter Queues (DLQ), and sequential job grouping.
- 📝 **Audit & Persistence** - Optional SQL-based persistence layer for archiving job history and providing complete audit trails.
- 🕒 **Scheduler** - Built-in CRON-based task scheduling for recurring jobs.
- 🏢 **Worker Modes** - Run embedded workers during development or standalone worker processes in production.

## 📦 Installation

```bash
bun add @gravito/stream
```

## 🚀 Quick Start

### 1. Define a Job

Create a class extending `Job` and implement the `handle` logic:

```typescript
import { Job } from '@gravito/stream';

export class ProcessOrder extends Job {
  constructor(private orderId: string) {
    super();
  }

  async handle(): Promise<void> {
    // Business logic: process the order
    console.log(`Processing order: ${this.orderId}`);
  }

  async failed(error: Error): Promise<void> {
    // Optional: cleanup or notify on permanent failure
    console.error(`Order ${this.orderId} failed: ${error.message}`);
  }
}
```

### 2. Initialize OrbitStream

Register the orbit in your application bootstrap:

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitStream } from '@gravito/stream';

const core = new PlanetCore();

core.addOrbit(OrbitStream.configure({
  default: 'redis',
  connections: {
    redis: {
      driver: 'redis',
      host: 'localhost',
      port: 6379
    }
  },
  autoStartWorker: process.env.NODE_ENV === 'development',
  workerOptions: { queues: ['default'] }
}));

await core.bootstrap();
```

### 3. Enqueue Jobs

Access the `queue` service from the request context or container:

```typescript
core.app.post('/orders', async (c) => {
  const { id } = await c.req.json();
  const queue = c.get('queue');

  // Push with fluent configuration
  await queue.push(new ProcessOrder(id))
    .onQueue('high-priority')
    .delay(30)
    .backoff(5, 2); // Start with 5s delay, then double for each retry

  return c.json({ success: true });
});
```

## 🔧 Advanced Configuration

### Multi-Queue & Concurrency

Configure the consumer to handle multiple queues with different priorities and concurrency levels:

```typescript
const consumer = new Consumer(manager, {
  queues: ['critical', 'default', 'low'],
  concurrency: 10,           // Max 10 concurrent jobs
  groupJobsSequential: true, // Process jobs with same groupId in strict order
  batchSize: 5,              // Fetch 5 jobs per poll
});
```

### Persistence & Audit Trail

Keep a history of all jobs (completed, failed, or enqueued):

```typescript
OrbitStream.configure({
  // ... connections
  persistence: {
    adapter: new SQLitePersistence(db),
    archiveCompleted: true,
    archiveFailed: true,
    archiveEnqueued: true, // Audit Mode: Log immediately when pushed
    bufferSize: 100        // Batch writes for performance
  }
});
```

## 📖 API Reference

### `QueueManager`

Accessed via `c.get('queue')` or `core.container.make('queue')`.

- **`push(job)`**: Dispatch a job to the queue.
- **`pushMany(jobs)`**: Dispatch multiple jobs efficiently.
- **`size(queue?)`**: Get the number of jobs in a queue.
- **`clear(queue?)`**: Remove all jobs from a queue.

### `Job` Fluent Methods

- **`onQueue(name)`**: Specify target queue.
- **`onConnection(name)`**: Use a specific broker connection.
- **`delay(seconds)`**: Set initial delay.
- **`backoff(seconds, multiplier?)`**: Configure retry strategy.
- **`withPriority(priority)`**: Set job priority.

## 🔌 Supported Drivers

- **Redis** - Feature-rich (DLQ, Rate limiting, Priorities).
- **SQS** - AWS managed queue (Standard/FIFO).
- **Kafka** - High-throughput distributed streams.
- **RabbitMQ** - Traditional AMQP broker.
- **Database** - Simple SQL-based persistence (PostgreSQL, MySQL, SQLite).
- **Memory** - Fast, zero-config for local development/testing.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to check the [issues page](https://github.com/gravito-framework/gravito/issues).

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
