#!/usr/bin/env bun

/**
 * Queue Worker CLI
 *
 * Standalone Consumer CLI tool that can run as a microservice.
 * Supports multiple brokers (Database, Redis, Kafka, SQS, etc.).
 *
 * @example
 * ```bash
 * # Database
 * bun run queue-worker --connection=database --queues=default,emails
 *
 * # Kafka
 * bun run queue-worker --connection=kafka --queues=default --consumer-group=workers
 *
 * # SQS
 * bun run queue-worker --connection=sqs --queues=default --region=us-east-1
 * ```
 */

import type { ConsumerOptions, WorkerOptions } from '../src'
import { Consumer } from '../src/Consumer'
import { QueueManager } from '../src/QueueManager'

// Parse CLI args
function parseArgs(): {
  connection?: string
  queues: string[]
  workers?: number
  timeout?: number
  maxAttempts?: number
  pollInterval?: number
  keepAlive?: boolean
  config?: string
} {
  const args = process.argv.slice(2)
  const options: {
    connection?: string
    queues: string[]
    workers?: number
    timeout?: number
    maxAttempts?: number
    pollInterval?: number
    keepAlive?: boolean
    config?: string
  } = {
    queues: [],
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]

      switch (key) {
        case 'connection':
          options.connection = value
          i++
          break
        case 'queues':
          options.queues = value.split(',').map((q) => q.trim())
          i++
          break
        case 'workers':
          options.workers = parseInt(value, 10)
          i++
          break
        case 'timeout':
          options.timeout = parseInt(value, 10)
          i++
          break
        case 'max-attempts':
          options.maxAttempts = parseInt(value, 10)
          i++
          break
        case 'poll-interval':
          options.pollInterval = parseInt(value, 10)
          i++
          break
        case 'keep-alive':
          options.keepAlive = value === 'true'
          i++
          break
        case 'config':
          options.config = value
          i++
          break
      }
    }
  }

  return options
}

// Load config
function loadConfig(configPath?: string): unknown {
  if (!configPath) {
    return {}
  }

  try {
    // Try to load a JSON config file.
    const fs = require('node:fs')
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`[QueueWorker] Failed to load config from ${configPath}:`, error)
    return {}
  }
}

// Main
async function main() {
  const args = parseArgs()

  if (args.queues.length === 0) {
    console.error('[QueueWorker] Error: --queues is required')
    console.log('Usage: bun run queue-worker --queues=default,emails [options]')
    process.exit(1)
  }

  console.log('[QueueWorker] Starting...', args)

  // Load config
  const config = loadConfig(args.config)

  // Create QueueManager.
  // Note: this should be constructed based on your real config format.
  // For now, only MemoryDriver is supported here; other drivers can be added later.
  const queueManager = new QueueManager({
    default: args.connection ?? 'default',
    connections: {
      default: { driver: 'memory' },
      ...(config as { connections?: Record<string, unknown> })?.connections,
    },
  })

  // Worker options
  const workerOptions: WorkerOptions = {
    maxAttempts: args.maxAttempts ?? 3,
    timeout: args.timeout,
  }

  // Consumer options
  const consumerOptions: ConsumerOptions = {
    queues: args.queues,
    connection: args.connection,
    workerOptions,
    pollInterval: args.pollInterval ?? 1000,
    keepAlive: args.keepAlive ?? true,
  }

  // Create and start Consumer
  const consumer = new Consumer(queueManager, consumerOptions)

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[QueueWorker] Shutting down...')
    await consumer.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Start Consumer
  await consumer.start()
}

// Run
main().catch((error) => {
  console.error('[QueueWorker] Fatal error:', error)
  process.exit(1)
})
