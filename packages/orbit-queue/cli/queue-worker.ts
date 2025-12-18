#!/usr/bin/env bun

/**
 * Queue Worker CLI
 *
 * 獨立 Consumer CLI 工具，可作為微服務運行。
 * 支援多種 broker（Database、Redis、Kafka、SQS 等）。
 *
 * @example
 * ```bash
 * # 使用 Database
 * bun run queue-worker --connection=database --queues=default,emails
 *
 * # 使用 Kafka
 * bun run queue-worker --connection=kafka --queues=default --consumer-group=workers
 *
 * # 使用 SQS
 * bun run queue-worker --connection=sqs --queues=default --region=us-east-1
 * ```
 */

import type { ConsumerOptions, WorkerOptions } from '../src'
import { Consumer } from '../src/Consumer'
import { QueueManager } from '../src/QueueManager'

// 解析 CLI 參數
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

// 載入配置
function loadConfig(configPath?: string): unknown {
  if (!configPath) {
    return {}
  }

  try {
    // 嘗試載入 JSON 配置檔案
    const fs = require('node:fs')
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`[QueueWorker] Failed to load config from ${configPath}:`, error)
    return {}
  }
}

// 主函數
async function main() {
  const args = parseArgs()

  if (args.queues.length === 0) {
    console.error('[QueueWorker] Error: --queues is required')
    console.log('Usage: bun run queue-worker --queues=default,emails [options]')
    process.exit(1)
  }

  console.log('[QueueWorker] Starting...', args)

  // 載入配置
  const config = loadConfig(args.config)

  // 建立 QueueManager
  // 注意：這裡需要根據實際的配置格式來建立
  // 目前只支援 MemoryDriver，其他驅動需要在後續實作
  const queueManager = new QueueManager({
    default: args.connection ?? 'default',
    connections: {
      default: { driver: 'memory' },
      ...(config as { connections?: Record<string, unknown> })?.connections,
    },
  })

  // Worker 選項
  const workerOptions: WorkerOptions = {
    maxAttempts: args.maxAttempts ?? 3,
    timeout: args.timeout,
  }

  // Consumer 選項
  const consumerOptions: ConsumerOptions = {
    queues: args.queues,
    connection: args.connection,
    workerOptions,
    pollInterval: args.pollInterval ?? 1000,
    keepAlive: args.keepAlive ?? true,
  }

  // 建立並啟動 Consumer
  const consumer = new Consumer(queueManager, consumerOptions)

  // 處理優雅關閉
  const shutdown = async () => {
    console.log('[QueueWorker] Shutting down...')
    await consumer.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // 啟動 Consumer
  await consumer.start()
}

// 執行
main().catch((error) => {
  console.error('[QueueWorker] Fatal error:', error)
  process.exit(1)
})
