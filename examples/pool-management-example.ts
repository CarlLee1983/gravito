/**
 * Complete Pool Management Example
 * Demonstrates all features: health checking, warming, and adaptive management
 */

import { ConnectionManager, setupPrometheusExporter } from '@gravito/atlas'

/**
 * Setup database with complete pool management
 */
async function setupDatabase() {
  // 1. Create connection manager
  const manager = new ConnectionManager({
    default: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'myapp',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      pool: {
        min: 2,
        max: 20,
        acquireTimeout: 5000,
        idleTimeout: 30000,
      },
    },
  })

  // 2. Setup Prometheus metrics
  setupPrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
  })

  // 3. Enable health checking
  manager.enableHealthCheck({
    checkInterval: 30000, // Check every 30 seconds
    thresholds: {
      warningUtilization: 0.7, // 70% warning
      criticalUtilization: 0.9, // 90% critical
      maxPendingRatio: 0.5, // 50% pending
    },
    onHealthChange: (name, health) => {
      if (health.status !== 'healthy') {
        console.log(`[${name}] Health: ${health.status} - ${health.message}`)
      }
    },
    onCritical: (name, health) => {
      console.error(`CRITICAL: Pool ${name} - ${health.message}`)
      // Send alert to monitoring system
      alertMonitoring(`Pool ${name} critical`)
    },
  })

  // 4. Warm up connection pools
  console.log('Warming up connection pools...')
  const warmupResult = await manager.warmup({
    targetConnections: 5,
    concurrency: 2,
  })
  console.log(`Warmup: ${warmupResult.successful}/${warmupResult.total} successful`)

  // 5. Enable adaptive pool management
  manager.enableAdaptive({
    evaluationInterval: 60000, // Evaluate every 60 seconds
    cooldownPeriod: 30000, // Wait 30 seconds between adjustments
    maxHistorySize: 10, // Keep 10 historical samples
    onAdjustment: (event) => {
      console.log(
        `[${event.connection}] Pool adjusted: ${event.from} -> ${event.to} (${event.action})`
      )
      console.log(`  Reason: ${event.reason}`)
      // Record metrics
      recordMetric('pool_adjustment', {
        connection: event.connection,
        action: event.action,
        from: event.from,
        to: event.to,
      })
    },
  })

  return manager
}

/**
 * Monitor pool status periodically
 */
function monitorPoolStatus(manager: any, interval = 10000) {
  return setInterval(() => {
    try {
      const connection = manager.connection('default')
      const driver = connection.getDriver()
      const stats = driver.getPoolStats?.()
      const health = driver.getPoolHealth?.()

      if (stats) {
        console.log(`
          Pool Status:
          - Total: ${stats.total}/${stats.max}
          - Idle: ${stats.idle}
          - Active: ${stats.active}
          - Pending: ${stats.pending}
          - Utilization: ${((stats.active / stats.max) * 100).toFixed(1)}%
        `)
      }

      if (health) {
        console.log(`  Health: ${health.status}`)
      }
    } catch (error) {
      console.error('Failed to get pool status:', error)
    }
  }, interval)
}

/**
 * Graceful shutdown with cleanup
 */
async function shutdownGracefully(manager: any, monitorInterval: NodeJS.Timeout) {
  console.log('Starting graceful shutdown...')

  // 1. Stop monitoring
  clearInterval(monitorInterval)

  // 2. Shutdown manager (disables health check, adaptive, and disconnects)
  await manager.shutdown()

  console.log('Shutdown complete')
}

/**
 * Example usage
 */
async function main() {
  try {
    // Setup
    const manager = await setupDatabase()
    console.log('Database connected and configured')

    // Monitor
    const monitorInterval = monitorPoolStatus(manager)

    // Graceful shutdown handlers
    const handleShutdown = async (signal: string) => {
      console.log(`Received ${signal}`)
      await shutdownGracefully(manager, monitorInterval)
      process.exit(0)
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))

    // Your application code here
    console.log('Application is ready')
    console.log('Metrics available at http://localhost:9464/metrics')
  } catch (error) {
    console.error('Failed to start application:', error)
    process.exit(1)
  }
}

// Placeholder functions (implement as needed)
function alertMonitoring(message: string) {
  console.error(`[ALERT] ${message}`)
  // Send to Slack, PagerDuty, etc.
}

function recordMetric(name: string, data: any) {
  // Record to monitoring system
  console.log(`[METRIC] ${name}:`, data)
}

// Start application
main().catch(console.error)
