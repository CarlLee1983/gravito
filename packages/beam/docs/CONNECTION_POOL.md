# HTTP Connection Pooling in @gravito/beam

## Overview

Connection pooling optimizes HTTP request performance by reusing TCP connections and avoiding expensive SSL/TLS handshakes. The Beam HTTP client provides built-in connection pooling with per-host isolation, configurable limits, and comprehensive metrics.

### Performance Benefits

- **TCP Handshake Elimination**: ~100ms savings per new connection
- **TLS Negotiation Savings**: ~50-100ms per SSL/TLS handshake
- **Typical Improvement**: 150-200ms per keep-alive reused connection
- **Zero Overhead**: Fast path when pooling disabled

## Quick Start

### Enable Default Pooling

```typescript
import { createBeam } from '@gravito/beam'
import type { AppType } from './server'

const client = createBeam<AppType>('http://localhost:3000', {
  pool: true, // Enable with default configuration
})

// Connections are now pooled and reused automatically
const response1 = await client.users.$get()
const response2 = await client.posts.$get()
// If both requests go to the same host, response2 reuses the connection from response1
```

### Custom Pool Configuration

```typescript
const client = createBeam<AppType>('http://localhost:3000', {
  pool: {
    maxConnectionsPerHost: 10,        // Default: 6
    minIdlePerHost: 2,                // Default: 0
    idleTimeoutMs: 30000,             // Default: 30s
    maxLifetimeMs: 300000,            // Default: 5 min
    acquireTimeoutMs: 5000,           // Default: 5s
    healthCheck: true,                // Default: true
    healthCheckIntervalMs: 60000,     // Default: 60s
    metrics: true,                    // Default: false
  },
})
```

## Configuration Options

### `maxConnectionsPerHost`

Maximum number of concurrent connections per host. Higher values allow more parallel requests but consume more resources.

- **Default**: `6` (HTTP/1.1 standard guideline)
- **Range**: 1-100
- **Use Case**: Increase for high-throughput APIs, decrease for resource-constrained environments

### `minIdlePerHost`

Minimum number of idle connections to keep alive per host for future requests.

- **Default**: `0`
- **Use Case**: Set to 1-2 for frequently accessed APIs to warm up connections in advance

### `idleTimeoutMs`

How long (ms) to keep an idle connection alive before closing it.

- **Default**: `30000` (30 seconds)
- **Use Case**: Increase for long-lived connections, decrease to free resources sooner

### `maxLifetimeMs`

Maximum lifetime (ms) of a connection before it's forcibly closed and replaced.

- **Default**: `300000` (5 minutes)
- **Use Case**: Rotate connections to handle server-side connection resets or firewall rules

### `acquireTimeoutMs`

Maximum wait time (ms) when pool is exhausted before failing the request.

- **Default**: `5000` (5 seconds)
- **Error**: `BeamPoolExhaustedError` if timeout exceeded
- **Use Case**: Adjust based on expected request patterns

### `healthCheck`

Enable periodic health checks to remove stale/dead connections.

- **Default**: `true`
- **Use Case**: Disable in test environments to reduce overhead

### `healthCheckIntervalMs`

Interval (ms) between automatic health checks.

- **Default**: `60000` (60 seconds)
- **Use Case**: Increase for less frequent checks, decrease for more responsive stale connection removal

### `metrics`

Enable metrics collection for monitoring and debugging.

- **Default**: `false`
- **Use Case**: Enable in production to track connection reuse rates and acquisition times

## Metrics and Monitoring

### Accessing Metrics

```typescript
import { ConnectionPool } from '@gravito/beam'

const pool = new ConnectionPool({ metrics: true })
const pooledFetch = pool.createPooledFetch()

// ... make some requests ...

const snapshot = pool.getMetrics()
console.log(`
  Total Active: ${snapshot.totalActive}
  Total Idle: ${snapshot.totalIdle}
  Total Waiting: ${snapshot.totalWaiting}
  Created: ${snapshot.totalCreated}
  Destroyed: ${snapshot.totalDestroyed}
  Reused: ${snapshot.totalReused}
  Reuse Rate: ${(snapshot.reuseRate * 100).toFixed(2)}%
  Avg Acquire Time: ${snapshot.avgAcquireTimeMs.toFixed(2)}ms
`)

// Per-host metrics
for (const [hostname, metrics] of snapshot.byHost) {
  console.log(`${hostname}: ${metrics.active} active, ${metrics.idle} idle`)
}
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `totalActive` | Number of connections currently in use |
| `totalIdle` | Number of idle connections available for reuse |
| `totalWaiting` | Number of requests waiting for available connections |
| `totalCreated` | Total connections created (cumulative) |
| `totalDestroyed` | Total connections closed (cumulative) |
| `totalReused` | Total connections reused from pool |
| `reuseRate` | Percentage of connections that were reused (0.0-1.0) |
| `avgAcquireTimeMs` | Average time (ms) to acquire a connection |
| `byHost` | Per-host breakdown of the above metrics |

### Interpreting Metrics

**High Reuse Rate (>80%)**: Pooling is working well, connections are being reused effectively.

**Low Reuse Rate (<20%)**: Pool might be ineffective for your access patterns. Consider:
- Adjusting `maxConnectionsPerHost` downward
- Increasing `idleTimeoutMs` to keep connections alive longer
- Reviewing request patterns

**High Waiting Requests**: Pool is frequently exhausted. Solutions:
- Increase `maxConnectionsPerHost`
- Reduce `idleTimeoutMs` to cycle connections faster
- Implement request batching or rate limiting

**High Avg Acquire Time**: Connections are slower to acquire. Possible causes:
- Network latency
- Server under load
- Pool exhaustion (check waiting requests)

## Error Handling

### BeamPoolExhaustedError

Thrown when no connections are available and the acquire timeout expires.

```typescript
import { BeamPoolExhaustedError } from '@gravito/beam'

try {
  const response = await client.data.$get()
} catch (error) {
  if (error instanceof BeamPoolExhaustedError) {
    console.error(`Pool exhausted for ${error.message}`)
    // Handle gracefully: retry, queue request, or fail-fast
  }
}
```

### Retry with Pool Exhaustion

```typescript
const client = createBeam<AppType>(url, {
  pool: { maxConnectionsPerHost: 10 },
  retry: {
    count: 3,
    delay: 1000,
    statusCodes: [429, 500, 502, 503, 504],
    // BeamPoolExhaustedError is not automatically retried
  },
})

// To manually retry on pool exhaustion:
async function requestWithPoolRetry(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await client.data.$get()
    } catch (error) {
      if (error instanceof BeamPoolExhaustedError && i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      throw error
    }
  }
}
```

## Best Practices

### 1. Enable Metrics in Production

```typescript
const client = createBeam<AppType>(url, {
  pool: { metrics: true },
})

// Periodically log metrics for monitoring
setInterval(() => {
  const metrics = pool.getMetrics()
  logger.info('Pool metrics', {
    reuseRate: metrics.reuseRate,
    avgAcquireTime: metrics.avgAcquireTimeMs,
    waiting: metrics.totalWaiting,
  })
}, 60000)
```

### 2. Configure Per Environment

```typescript
const poolConfig = {
  development: {
    maxConnectionsPerHost: 3,
    healthCheck: false, // Reduce overhead
  },
  staging: {
    maxConnectionsPerHost: 6,
    metrics: true,
  },
  production: {
    maxConnectionsPerHost: 10,
    minIdlePerHost: 1,
    metrics: true,
  },
}

const client = createBeam<AppType>(url, {
  pool: poolConfig[process.env.NODE_ENV || 'development'],
})
```

### 3. Graceful Shutdown

```typescript
// If using ConnectionPool directly
const pool = new ConnectionPool(config)
const pooledFetch = pool.createPooledFetch()

// On application shutdown
process.on('SIGTERM', async () => {
  await pool.close()
  console.log('Connection pool closed')
})
```

### 4. Monitor Connection Waiting

```typescript
const client = createBeam<AppType>(url, {
  pool: { metrics: true },
})

// Alert if requests frequently wait for connections
setInterval(() => {
  const metrics = pool.getMetrics()
  if (metrics.totalWaiting > 10) {
    logger.warn('Many requests waiting for pool connections', {
      waiting: metrics.totalWaiting,
      active: metrics.totalActive,
    })
    // Consider increasing maxConnectionsPerHost
  }
}, 10000)
```

### 5. Test Pool Behavior

```typescript
import { describe, it, expect } from 'bun:test'

describe('Connection pooling', () => {
  it('should reuse connections efficiently', async () => {
    const client = createBeam<AppType>(url, {
      pool: {
        maxConnectionsPerHost: 2,
        metrics: true,
      },
    })

    // Make multiple sequential requests
    for (let i = 0; i < 5; i++) {
      await client.data.$get()
    }

    const metrics = pool.getMetrics()
    expect(metrics.totalCreated).toBeLessThanOrEqual(2) // Only 2 connections created
    expect(metrics.reuseRate).toBeGreaterThan(0.5) // Most requests reused
  })
})
```

## Common Patterns

### Connection Pool Wrapper

```typescript
export class ApiClient {
  private pool: ConnectionPool | null = null

  constructor(private baseUrl: string) {}

  getClient<T>() {
    if (!this.pool) {
      this.pool = new ConnectionPool({
        maxConnectionsPerHost: 10,
        metrics: true,
      })
    }

    return createBeam<T>(this.baseUrl, {
      pool: this.pool.createPooledFetch(),
    })
  }

  getMetrics() {
    return this.pool?.getMetrics()
  }

  async close() {
    await this.pool?.close()
  }
}
```

### Multi-Host Pooling

```typescript
const clients = {
  userService: createBeam<UserAPI>('http://users:3000', { pool: true }),
  orderService: createBeam<OrderAPI>('http://orders:3000', { pool: true }),
  inventoryService: createBeam<InventoryAPI>('http://inventory:3000', { pool: true }),
}

// Each service gets independent connection pools
```

### Conditional Pooling

```typescript
const shouldPoolConnections = process.env.NODE_ENV === 'production'

const client = createBeam<AppType>(url, {
  pool: shouldPoolConnections ? { maxConnectionsPerHost: 10 } : false,
})
```

## Troubleshooting

### Issue: Pool Exhaustion Errors

**Symptom**: `BeamPoolExhaustedError: Connection pool exhausted for api.example.com`

**Solutions**:
1. Increase `maxConnectionsPerHost`
2. Check if requests are being held too long (increase request timeout)
3. Enable metrics to see if connections aren't being released properly

### Issue: High Memory Usage

**Symptom**: Memory grows as application runs

**Solutions**:
1. Decrease `maxConnectionsPerHost`
2. Decrease `idleTimeoutMs` to close idle connections sooner
3. Decrease `maxLifetimeMs` to rotate connections more frequently
4. Check metrics for connections being properly released

### Issue: Slow Acquisition Times

**Symptom**: `avgAcquireTimeMs` is high (>100ms)

**Causes**:
1. Pool frequently exhausted (check `totalWaiting`)
2. Network latency to backend
3. Server under load

**Solutions**:
1. Increase `maxConnectionsPerHost`
2. Reduce other services' pool sizes to free resources
3. Optimize backend performance

### Issue: Connection Resets from Server

**Symptom**: Intermittent connection errors

**Solutions**:
1. Decrease `maxLifetimeMs` to rotate connections
2. Decrease `idleTimeoutMs` to close long-idle connections
3. Enable `healthCheck` for automatic stale connection removal

## Performance Characteristics

### Acquire Time Breakdown

- **Fresh Connection**: 100-300ms (includes TCP + TLS handshake)
- **Reused Connection**: 1-5ms (keep-alive socket reuse)
- **Pool Exhaustion**: 5000ms+ (waits for timeout)

### Connection Lifecycle

```
Created → Idle → Active → Used → Idle → (reuse) → Active → ...
              ↓                                      ↓
           Evicted                          Expired/Destroyed
```

### Resource Usage

- **Per Connection**: ~2-5KB memory for metadata
- **Per Pool**: ~50-100KB for management structures
- **Metrics**: ~10-20KB when enabled

## Migration from No Pooling

### Before (No Pooling)

```typescript
const client = createBeam<AppType>(url)
// Each request creates a new connection
```

### After (With Pooling)

```typescript
const client = createBeam<AppType>(url, {
  pool: { maxConnectionsPerHost: 6 }, // or just true
})
// Connections are reused automatically
```

**No code changes needed** - pooling is transparent to your application logic!

## See Also

- [Beam API Reference](./API.md)
- [BeamOptions Configuration](../src/types.ts)
- [Performance Tuning Guide](./PERFORMANCE.md)
