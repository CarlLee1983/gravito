# Advanced Usage

## Custom Probes

You can implement `QueueProbe` interface to monitor any custom queue system or data source.

```typescript
import { QuasarAgent, type QueueProbe, type QueueSnapshot } from '@gravito/quasar'

class MyCustomProbe implements QueueProbe {
  constructor(private name: string) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    // Fetch metrics from your source
    const metrics = await fetchMyMetrics()
    
    return {
      name: this.name,
      driver: 'redis', // Or extend types if using TS
      size: {
        waiting: metrics.waiting,
        active: metrics.active,
        failed: metrics.failed,
        delayed: 0
      }
    }
  }
}

const agent = new QuasarAgent({ ... })
agent.addQueueProbe(new MyCustomProbe('custom-1'))
```

## Generic Bridges

For systems that emit events but don't have a dedicated bridge, use `GenericBridge`.

```typescript
agent.attachBridge(eventEmitter, 'generic', {
  queueName: 'my-custom-queue',
  eventMapping: {
    started: 'process:start',
    completed: 'process:success',
    failed: 'process:error',
    progress: 'process:progress'
  }
})
```

## Health Checks in Kubernetes

Configure your `readinessProbe` and `livenessProbe` to point to the Health Server.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 9999
  initialDelaySeconds: 3
  periodSeconds: 10
```

## High Availability

Quasar Agent is stateless. You can run multiple agents for redundancy if they monitor the same queues (via Probes). 
For Bridges (which attach to Workers), usually one Agent per Worker instance is recommended.

If using **Redis Sentinel**:
```typescript
const agent = new QuasarAgent({
  service: 'app',
  transport: {
    options: {
      sentinels: [{ host: 'sentinel', port: 26379 }],
      name: 'mymaster'
    }
  }
})
```
