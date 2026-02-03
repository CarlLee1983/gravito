---
title: Task Scheduling (Horizon)
description: Learn how to schedule periodic tasks with Gravito Horizon.
---

# Task Scheduling (Horizon)

> `@gravito/horizon` is a distributed task scheduler inspired by Laravel Schedule, supporting Cron syntax and distributed locking.

## Defining Schedules

Define your recurring tasks in your service provider or configuration file.

```typescript
import { OrbitHorizon } from '@gravito/horizon'

export default {
  orbits: [
    OrbitHorizon.configure({
      schedule: (s) => {
        // Run every minute
        s.command('cache:clear').everyMinute()
        
        // Run daily at 1:00 AM
        s.job(new BackupDatabase()).dailyAt('01:00')
        
        // Use Cron syntax
        s.call(() => console.log('Ping!')).cron('*/5 * * * *')
      }
    })
  ]
}
```

## Distributed Locking

If you run multiple server instances, Horizon automatically uses Redis to ensure a task only runs on one server at a time.

```typescript
s.job(new MonthlyReport()).monthly().onOneServer()
```

## Running the Scheduler

In production, you need to start the scheduler worker process:

```bash
bun run gravito schedule:work
```

---

## Next Steps
Learn how to handle asynchronous tasks with the [Queue System](./queues.md).
