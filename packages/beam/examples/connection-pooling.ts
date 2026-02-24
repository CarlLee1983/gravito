/**
 * @fileoverview Connection pooling examples for @gravito/beam
 *
 * Demonstrates various use cases and patterns for HTTP connection pooling.
 */

import { BeamPoolExhaustedError, ConnectionPool, createBeam } from '@gravito/beam'
import type { AppType } from '../__fixtures__/app'

// ============================================================================
// Example 1: Basic Pooling with Defaults
// ============================================================================

export function example1_basicPooling() {
  // Enable pooling with default configuration (6 connections per host)
  const client = createBeam<AppType>('http://localhost:3000', {
    pool: true,
  })

  return client
}

// ============================================================================
// Example 2: Custom Pool Configuration
// ============================================================================

export function example2_customConfiguration() {
  const client = createBeam<AppType>('http://localhost:3000', {
    pool: {
      maxConnectionsPerHost: 10, // Max concurrent connections per host
      minIdlePerHost: 2, // Keep 2 idle connections warm
      idleTimeoutMs: 60000, // Close idle connections after 60s
      maxLifetimeMs: 600000, // Rotate connections after 10 min
      acquireTimeoutMs: 10000, // Wait up to 10s for available connection
      healthCheck: true, // Enable periodic health checks
      healthCheckIntervalMs: 120000, // Check every 2 minutes
      metrics: true, // Track connection metrics
    },
  })

  return client
}

// ============================================================================
// Example 3: Environment-Based Configuration
// ============================================================================

export function example3_environmentConfig() {
  const poolConfigs = {
    development: {
      maxConnectionsPerHost: 3,
      healthCheck: false, // Reduce overhead in dev
      metrics: false,
    },
    staging: {
      maxConnectionsPerHost: 6,
      healthCheck: true,
      metrics: true,
    },
    production: {
      maxConnectionsPerHost: 15,
      minIdlePerHost: 2,
      healthCheck: true,
      metrics: true,
    },
  }

  const env = process.env.NODE_ENV || 'development'
  const config = poolConfigs[env as keyof typeof poolConfigs]

  const client = createBeam<AppType>('http://api.example.com', {
    pool: config,
  })

  return client
}

// ============================================================================
// Example 4: Monitoring Metrics
// ============================================================================

export async function example4_monitoringMetrics() {
  const pool = new ConnectionPool({
    maxConnectionsPerHost: 6,
    metrics: true,
  })

  const pooledFetch = pool.createPooledFetch()
  const client = createBeam<AppType>('http://localhost:3000', {
    fetch: pooledFetch,
  })

  // Simulate some requests
  await Promise.all([client.users.$get(), client.posts.$get(), client.comments.$get()])

  // Check metrics
  const metrics = pool.getMetrics()
  console.log('Connection Pool Metrics:')
  console.log(`  Active Connections: ${metrics.totalActive}`)
  console.log(`  Idle Connections: ${metrics.totalIdle}`)
  console.log(`  Waiting Requests: ${metrics.totalWaiting}`)
  console.log(`  Total Created: ${metrics.totalCreated}`)
  console.log(`  Total Reused: ${metrics.totalReused}`)
  console.log(`  Reuse Rate: ${(metrics.reuseRate * 100).toFixed(2)}%`)
  console.log(`  Avg Acquire Time: ${metrics.avgAcquireTimeMs.toFixed(2)}ms`)

  // Per-host metrics
  console.log('\nPer-Host Metrics:')
  for (const [hostname, hostMetrics] of metrics.byHost) {
    console.log(`  ${hostname}:`)
    console.log(`    Active: ${hostMetrics.active}`)
    console.log(`    Idle: ${hostMetrics.idle}`)
    console.log(`    Waiting: ${hostMetrics.waiting}`)
  }

  await pool.close()
}

// ============================================================================
// Example 5: Graceful Shutdown
// ============================================================================

export async function example5_gracefulShutdown() {
  const pool = new ConnectionPool({
    maxConnectionsPerHost: 10,
  })

  const pooledFetch = pool.createPooledFetch()
  const client = createBeam<AppType>('http://localhost:3000', {
    fetch: pooledFetch,
  })

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, closing connection pool...`)
    await pool.close()
    console.log('Pool closed, exiting')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  return client
}

// ============================================================================
// Example 6: Handling Pool Exhaustion
// ============================================================================

export async function example6_handlePoolExhaustion() {
  const client = createBeam<AppType>('http://localhost:3000', {
    pool: {
      maxConnectionsPerHost: 2, // Low limit to easily exhaust
      acquireTimeoutMs: 1000, // Short timeout for demo
    },
  })

  // Attempt request with retry logic for pool exhaustion
  async function requestWithPoolRetry(maxAttempts = 3): Promise<Response> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await client.data.$get()
      } catch (error) {
        if (error instanceof BeamPoolExhaustedError && attempt < maxAttempts - 1) {
          const delay = 1000 * 2 ** attempt // Exponential backoff
          console.log(`Pool exhausted, retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  }

  try {
    const response = await requestWithPoolRetry()
    return response
  } catch (error) {
    console.error('Request failed:', error)
  }
}

// ============================================================================
// Example 7: Multi-Service Architecture
// ============================================================================

export function example7_multiService() {
  // Each service gets independent connection pools
  const clients = {
    auth: createBeam<any>('http://auth-service:3000', {
      pool: { maxConnectionsPerHost: 8 },
    }),
    users: createBeam<any>('http://users-service:3000', {
      pool: { maxConnectionsPerHost: 10 },
    }),
    orders: createBeam<any>('http://orders-service:3000', {
      pool: { maxConnectionsPerHost: 15 },
    }),
    inventory: createBeam<any>('http://inventory-service:3000', {
      pool: { maxConnectionsPerHost: 6 },
    }),
  }

  return clients
}

// ============================================================================
// Example 8: Pool Performance Monitoring
// ============================================================================

export async function example8_performanceMonitoring() {
  const pool = new ConnectionPool({
    maxConnectionsPerHost: 6,
    metrics: true,
  })

  const pooledFetch = pool.createPooledFetch()
  const client = createBeam<AppType>('http://localhost:3000', {
    fetch: pooledFetch,
  })

  // Periodic monitoring
  const monitoringInterval = setInterval(() => {
    const metrics = pool.getMetrics()

    // Alert on high wait times
    if (metrics.totalWaiting > 5) {
      console.warn('⚠️  High connection waiting queue:', metrics.totalWaiting)
    }

    // Alert on low reuse rate
    if (metrics.reuseRate < 0.5) {
      console.warn('⚠️  Low connection reuse rate:', metrics.reuseRate)
    }

    // Info logging
    console.log('📊 Pool Status:', {
      active: metrics.totalActive,
      idle: metrics.totalIdle,
      waiting: metrics.totalWaiting,
      reuseRate: `${(metrics.reuseRate * 100).toFixed(1)}%`,
      avgAcquireTime: `${metrics.avgAcquireTimeMs.toFixed(0)}ms`,
    })
  }, 10000) // Every 10 seconds

  // Clean up monitoring on shutdown
  process.on('SIGTERM', () => {
    clearInterval(monitoringInterval)
    pool.close()
  })

  return { client, pool }
}

// ============================================================================
// Example 9: Conditional Pooling
// ============================================================================

export function example9_conditionalPooling() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  const client = createBeam<AppType>('http://localhost:3000', {
    // Only enable pooling in production and staging
    pool: !isDevelopment ? { maxConnectionsPerHost: 10 } : false,

    // Other optimizations
    timeout: isProduction ? 30000 : 10000,
    retry: isProduction ? { count: 3, delay: 1000 } : { count: 0 },
  })

  return client
}

// ============================================================================
// Example 10: Resource-Constrained Environment
// ============================================================================

export function example10_resourceConstrained() {
  // For edge computing, serverless, or low-resource environments
  const client = createBeam<AppType>('http://localhost:3000', {
    pool: {
      maxConnectionsPerHost: 2, // Minimal connections
      minIdlePerHost: 0, // No pre-warmed connections
      idleTimeoutMs: 10000, // Close idle connections quickly
      healthCheck: false, // Disable health checks
      metrics: false, // Disable metrics collection
    },
  })

  return client
}

// ============================================================================
// Example 11: High-Throughput Service
// ============================================================================

export function example11_highThroughput() {
  // For APIs that handle many concurrent requests
  const client = createBeam<AppType>('http://localhost:3000', {
    pool: {
      maxConnectionsPerHost: 50, // Many concurrent connections
      minIdlePerHost: 10, // Keep connections warm
      idleTimeoutMs: 120000, // Long idle timeout
      maxLifetimeMs: 900000, // Long connection lifetime
      acquireTimeoutMs: 2000, // Short timeout (should rarely hit)
      healthCheck: true,
      metrics: true, // Monitor performance
    },
  })

  return client
}
