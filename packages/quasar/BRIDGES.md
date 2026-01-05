# Quasar Bridges - Usage Guide

Bridges enable **real-time job execution monitoring** for third-party queue systems like BullMQ and Bee-Queue.

## What are Bridges?

Bridges attach to your queue workers and report job lifecycle events (started, completed, failed) to Zenith in real-time. This gives you:

- **Live execution logs** in Zenith UI
- **Detailed error stack traces** when jobs fail
- **Job progress tracking**

## Installation

Bridges are built into `@gravito/quasar`:

```bash
npm install @gravito/quasar ioredis
```

## Usage

### BullMQ Bridge

```typescript
import { QuasarAgent } from '@gravito/quasar'
import { Worker } from 'bullmq'

// Create Quasar agent
const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' },
})

// Create BullMQ worker
const worker = new Worker('emails', async (job) => {
  console.log(`Processing email to ${job.data.to}`)
  // ... your job logic
})

// Attach bridge for real-time monitoring
agent.attachBridge(worker, 'bullmq')

// Start agent
await agent.start()
```

### Bee-Queue Bridge

```typescript
import { QuasarAgent } from '@gravito/quasar'
import Queue from 'bee-queue'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
})

const queue = new Queue('emails')

// Attach bridge
agent.attachBridge(queue, 'bee-queue')

// Process jobs
queue.process(async (job) => {
  // ... your job logic
})

await agent.start()
```

## Complete Monitoring Setup

For **full visibility**, combine both **Probes** (statistics) and **Bridges** (logs):

```typescript
import { QuasarAgent } from '@gravito/quasar'
import { Worker } from 'bullmq'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' },
})

// 1. Monitor queue statistics (Probe)
agent.monitorQueue('emails', 'bullmq')

// 2. Monitor job execution (Bridge)
const worker = new Worker('emails', async (job) => { ... })
agent.attachBridge(worker, 'bullmq')

await agent.start()
```

This gives you:
- ✅ **Queue statistics** (waiting, active, failed counts) via Probe
- ✅ **Job execution logs** (started, completed, errors) via Bridge

## Advanced: Direct Bridge Usage

You can also use bridges directly without QuasarAgent:

```typescript
import { bridges } from '@gravito/quasar'
import { Redis } from 'ioredis'
import { Worker } from 'bullmq'

const redis = new Redis('redis://zenith-server:6379')
const worker = new Worker('emails', async (job) => { ... })

const bridge = new bridges.BullMQBridge(redis, 'flux_console:', 'worker-1')
bridge.attach(worker)

// Later, to cleanup:
bridge.detach()
```

## What You'll See in Zenith UI

When a job runs, Zenith will show:

```
[INFO] Processing job: sendEmail (job-123)
[SUCCESS] Completed job: sendEmail (job-123)
```

When a job fails:

```
[ERROR] Job failed: sendEmail (job-456) - SMTP connection timeout
  Stack: Error: SMTP connection timeout
    at SMTPClient.connect (/app/mailer.js:42:11)
    ...
```

## Comparison: Probes vs Bridges

| Feature | Probe | Bridge |
|---------|-------|--------|
| **What it monitors** | Queue statistics | Job execution |
| **Data source** | Redis keys (external scan) | Worker events (internal hooks) |
| **What you see** | "5 jobs waiting" | "Job X failed with error Y" |
| **Update frequency** | Every 10s (configurable) | Real-time (milliseconds) |
| **Setup** | `agent.monitorQueue()` | `agent.attachBridge()` |

**Recommendation**: Use both for complete visibility.
