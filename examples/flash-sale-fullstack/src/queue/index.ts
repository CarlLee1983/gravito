/**
 * Queue System Initialization
 *
 * 隊列系統初始化和 Job 類別註冊
 */

import { QueueManager } from '@gravito/stream'
import Redis from 'ioredis'
import { ConfirmOrderJob } from './jobs/ConfirmOrderJob'
import { DeductInventoryJob } from './jobs/DeductInventoryJob'
import { LockInventoryJob } from './jobs/LockInventoryJob'
import { ReleaseInventoryJob } from './jobs/ReleaseInventoryJob'

let queueManager: QueueManager | null = null

/**
 * 初始化隊列管理器
 */
export async function initializeQueueManager(): Promise<QueueManager> {
  if (queueManager) {
    return queueManager
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const prefix = process.env.REDIS_QUEUE_PREFIX || 'flash-sale:queue:'

  // 建立 Redis 連接
  const redisClient = new Redis(redisUrl)

  // 初始化 QueueManager
  queueManager = new QueueManager({
    default: 'redis',
    connections: {
      redis: {
        driver: 'redis',
        client: redisClient,
        prefix,
      },
    },
  })

  // 註冊所有 Job 類別（ClassNameSerializer 需要提前註冊）
  registerJobClasses()

  return queueManager
}

/**
 * 註冊所有 Job 類別
 */
function registerJobClasses(): void {
  if (!queueManager) {
    throw new Error('QueueManager not initialized')
  }

  // 註冊 Job 類別用於反序列化
  const jobClasses = [
    LockInventoryJob,
    DeductInventoryJob,
    ConfirmOrderJob,
    ReleaseInventoryJob,
  ] as any

  queueManager.registerJobClasses(jobClasses)
}

/**
 * 取得隊列管理器實例
 */
export function getQueueManager(): QueueManager {
  if (!queueManager) {
    throw new Error('QueueManager not initialized. Call initializeQueueManager() first.')
  }
  return queueManager
}

/**
 * 清空隊列
 */
export async function clearQueueManager(): Promise<void> {
  if (queueManager) {
    // QueueManager 沒有 close 方法，只能清空隊列
    // 連接由 PlanetCore 管理
    queueManager = null
  }
}
