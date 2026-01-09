# @gravito/quasar

Universal system monitoring agent for Gravito Zenith. Provides comprehensive monitoring for Node.js/Bun applications including system metrics, queue statistics, and real-time job execution tracking.

## Features

### 🔍 System Monitoring
- CPU, memory, and process metrics
- Automatic heartbeat reporting
- Multi-runtime support (Node.js, Bun, Deno)

### 📊 Queue Monitoring (Probes)
Monitor queue statistics from various queue systems:
- **BullMQ** (v5+)
- **Bull** (v3/v4)
- **Bee-Queue**
- **Laravel Queues**
- **Redis Lists** (generic)

### 📝 Real-time Job Tracking (Bridges)
Track individual job execution with detailed logs:
- Job lifecycle events (started, completed, failed)
- Error stack traces
- Progress updates
- Execution context

## Installation

```bash
npm install @gravito/quasar ioredis
# or
bun add @gravito/quasar ioredis
```

## Quick Start

### Basic System Monitoring

```typescript
import { QuasarAgent } from '@gravito/quasar'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' }
})

await agent.start()
```

### Queue Statistics Monitoring

```typescript
import { QuasarAgent } from '@gravito/quasar'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' } // Local queue Redis
})

// Monitor queue statistics
agent.monitorQueue('emails', 'bullmq')
agent.monitorQueue('notifications', 'bee-queue')
agent.monitorQueue('default', 'laravel')

await agent.start()
```

### Real-time Job Execution Tracking

```typescript
import { QuasarAgent } from '@gravito/quasar'
import { Worker } from 'bullmq'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' }
})

// Create your worker
const worker = new Worker('emails', async (job) => {
  // Your job logic
  console.log(`Sending email to ${job.data.to}`)
})

// Attach bridge for real-time monitoring
agent.attachBridge(worker, 'bullmq')

await agent.start()
```

### Complete Monitoring Setup

For **full visibility**, combine both Probes (statistics) and Bridges (execution logs):

```typescript
import { QuasarAgent } from '@gravito/quasar'
import { Worker } from 'bullmq'

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith-server:6379' },
  monitor: { url: 'redis://localhost:6379' }
})

// 1. Monitor queue statistics (Probe)
agent.monitorQueue('emails', 'bullmq')

// 2. Monitor job execution (Bridge)
const worker = new Worker('emails', async (job) => { /* ... */ })
agent.attachBridge(worker, 'bullmq')

await agent.start()
```

This gives you:
- ✅ **Queue statistics** (waiting, active, failed counts)
- ✅ **Job execution logs** (started, completed, errors with stack traces)

## Configuration

### QuasarOptions

```typescript
interface QuasarOptions {
  // Service identifier (required)
  service: string
  
  // Optional custom name (defaults to hostname)
  name?: string
  
  // Redis connection for Zenith transport (required)
  transport?: {
    url?: string
    client?: Redis
    options?: any
  }
  
  // Redis connection for local queue monitoring (optional)
  monitor?: {
    url?: string
    client?: Redis
    options?: any
  }
  
  // Heartbeat interval in milliseconds (default: 10000)
  interval?: number
  
  // Custom system probe (optional)
  probe?: Probe
}
```

### Dual Redis Connections

Quasar uses two separate Redis connections:

1. **Transport Redis**: Connects to Zenith server to send metrics and logs
2. **Monitor Redis**: Connects to your application's Redis to inspect queues

This separation allows monitoring local queues while reporting to a remote Zenith instance.

## Supported Queue Systems

### Probes (Statistics)

| Queue System | Type | Keys Monitored |
|--------------|------|----------------|
| BullMQ v5+ | `'bullmq'` | `wait`, `active`, `delayed`, `failed` |
| Bull v3/v4 | `'bull'` | `waiting`, `active`, `delayed`, `failed` |
| Bee-Queue | `'bee-queue'` | `waiting`, `active`, `failed` |
| Laravel | `'laravel'` | `queues:*`, `queues:*:delayed`, `queues:*:reserved` |
| Generic Redis | `'redis'` | Custom list key |

### Bridges (Execution Logs)

| Queue System | Type | Events Tracked |
|--------------|------|----------------|
| BullMQ | `'bullmq'` | `active`, `completed`, `failed`, `progress` |
| Bee-Queue | `'bee-queue'` | `job succeeded`, `job failed`, `job progress` |

## Remote Control

Enable remote control to allow Zenith UI to execute commands:

```typescript
const agent = new QuasarAgent({ /* ... */ })

await agent.start()

// Enable after start (requires nodeId)
await agent.enableRemoteControl()
```

Supported commands:
- Retry failed jobs
- Delete jobs
- Laravel-specific actions (restart workers, retry all)

## Advanced Usage

### Direct Bridge Usage

```typescript
import { bridges } from '@gravito/quasar'
import { Redis } from 'ioredis'
import { Worker } from 'bullmq'

const redis = new Redis('redis://zenith-server:6379')
const worker = new Worker('emails', async (job) => { /* ... */ })

const bridge = new bridges.BullMQBridge(redis, 'flux_console:', 'worker-1')
bridge.attach(worker)

// Later, cleanup
bridge.detach()
```

### Custom System Probe

```typescript
import { QuasarAgent } from '@gravito/quasar'
import type { Probe, SystemMetrics } from '@gravito/quasar'

class CustomProbe implements Probe {
  async getMetrics(): Promise<SystemMetrics> {
    return {
      cpu: { /* ... */ },
      memory: { /* ... */ },
      pid: process.pid,
      hostname: os.hostname(),
      platform: process.platform,
      uptime: process.uptime()
    }
  }
}

const agent = new QuasarAgent({
  service: 'my-app',
  transport: { url: 'redis://zenith:6379' },
  probe: new CustomProbe()
})
```

## Architecture

### Probes vs Bridges

| Feature | Probe | Bridge |
|---------|-------|--------|
| **Purpose** | Queue statistics | Job execution tracking |
| **Data source** | Redis keys (external scan) | Worker events (internal hooks) |
| **What you see** | "5 jobs waiting" | "Job X failed with error Y" |
| **Update frequency** | Every 10s (configurable) | Real-time (milliseconds) |
| **Setup** | `agent.monitorQueue()` | `agent.attachBridge()` |
| **Performance impact** | Minimal (periodic scan) | Minimal (event-driven) |

**Recommendation**: Use both for complete visibility.

## Examples

See [BRIDGES.md](./BRIDGES.md) for detailed bridge usage examples.

## TypeScript Support

Fully typed with TypeScript. All interfaces and types are exported:

```typescript
import type {
  QuasarOptions,
  Probe,
  QueueProbe,
  SystemMetrics,
  QueueSnapshot,
  QueueBridge,
  ZenithLogPayload
} from '@gravito/quasar'
```

## License

MIT

## Related Packages

- `@gravito/zenith` - Zenith monitoring dashboard
- `@gravito/stream` - Native Gravito queue system with built-in monitoring
- `gravito/laravel-zenith` - Laravel integration package
