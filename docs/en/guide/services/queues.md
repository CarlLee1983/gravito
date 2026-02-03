---
title: Queues
description: Learn how to handle background tasks and asynchronous processing with Gravito Stream.
---

# Queues

> Process time-consuming tasks (like sending emails or image processing) in the background to keep your application lightning fast.

## Core Concepts

Gravito's queue system is powered by `@gravito/stream`, providing support for multiple drivers and delayed processing.

### Step 1: Define a Job

A Job is a class that encapsulates your business logic.

```typescript
import { Job } from '@gravito/stream'

export class ProcessOrder extends Job {
  constructor(private orderId: string) {
    super()
  }

  async handle(): Promise<void> {
    // Time-consuming logic...
    console.log(`Processing order: ${this.orderId}`)
  }
}
```

### Step 2: Push to Queue

You can push a job to the queue from a controller or anywhere in your app:

```typescript
core.app.post('/orders', async (c) => {
  const queue = c.get('queue')
  
  // Push immediately
  await queue.push(new ProcessOrder('123'))

  // Delay processing by 10 minutes
  await queue.push(new ProcessOrder('124'))
    .delay(600)

  return c.json({ message: 'Order added to processing queue' })
})
```

## Configuring Drivers

Configure `OrbitStream` in your `gravito.config.ts`:

```typescript
import { OrbitStream } from '@gravito/stream'

export default {
  orbits: [
    OrbitStream.configure({
      default: 'redis',
      connections: {
        memory: { driver: 'memory' },
        redis: {
          driver: 'redis',
          host: 'localhost',
          port: 6379
        }
      }
    })
  ]
}
```

## Running Workers

A Worker is a background process that listens for and executes jobs.

### Development (Embedded)

You can set `autoStartWorker: true` to have the worker start alongside your application.

### Production (Standalone)

In production, it is recommended to run the worker as a standalone process:

```bash
bun run gravito queue:work --connection=redis --queues=default
```

---

## Next Steps
Learn how to [Send Emails](./mail.md) and integrate with the queue system.
