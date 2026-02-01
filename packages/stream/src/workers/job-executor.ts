/**
 * Worker Thread 執行腳本
 *
 * 此腳本運行在獨立的 Worker Thread 中，負責接收序列化的 Job 資料、
 * 反序列化、執行，並將結果回傳給主線程。
 *
 * @internal
 */

import { parentPort } from 'worker_threads'
import type { SerializedJob } from '../types'

/**
 * Worker 訊息類型
 */
interface WorkerMessage {
  /**
   * 訊息類型
   * - execute: 執行 Job
   * - shutdown: 關閉 Worker
   */
  type: 'execute' | 'shutdown'

  /**
   * 序列化的 Job 資料（當 type 為 'execute' 時）
   */
  job?: SerializedJob

  /**
   * Job 類別名稱到實作的映射（序列化為 JSON 字串）
   */
  classRegistry?: string
}

/**
 * Worker 回應類型
 */
interface WorkerResponse {
  /**
   * 回應類型
   * - success: Job 執行成功
   * - error: Job 執行失敗
   * - ready: Worker 已準備好
   */
  type: 'success' | 'error' | 'ready'

  /**
   * 錯誤訊息（當 type 為 'error' 時）
   */
  error?: string

  /**
   * 錯誤堆疊（當 type 為 'error' 時）
   */
  stack?: string
}

/**
 * 已註冊的 Job 類別映射
 */
const jobClasses = new Map<string, any>()

/**
 * 註冊 Job 類別
 *
 * @param name - 類別名稱
 * @param JobClass - Job 類別建構函式
 */
function _registerJobClass(name: string, JobClass: any): void {
  jobClasses.set(name, JobClass)
}

/**
 * 反序列化 Job
 *
 * 根據序列化類型將序列化的 Job 資料還原為 Job 實例。
 *
 * @param serialized - 序列化的 Job 資料
 * @returns Job 實例
 * @throws {Error} 如果反序列化失敗
 */
function deserializeJob(serialized: SerializedJob): any {
  if (serialized.type === 'json') {
    // JSON 序列化：直接解析
    return JSON.parse(serialized.data)
  }

  if (serialized.type === 'class') {
    // 類別序列化：需要類別名稱和註冊的類別
    if (!serialized.className) {
      throw new Error('Class serialization requires className')
    }

    const JobClass = jobClasses.get(serialized.className)
    if (!JobClass) {
      throw new Error(`Job class "${serialized.className}" not registered in worker thread`)
    }

    // 解析資料並重建實例
    const data = JSON.parse(serialized.data)
    const instance = Object.create(JobClass.prototype)
    Object.assign(instance, data)

    return instance
  }

  if (serialized.type === 'msgpack') {
    // MessagePack 序列化：需要 msgpack 套件
    throw new Error('MessagePack deserialization not yet implemented in worker')
  }

  throw new Error(`Unknown serialization type: ${serialized.type}`)
}

/**
 * 執行 Job
 *
 * @param serialized - 序列化的 Job 資料
 * @throws {Error} 如果 Job 執行失敗
 */
async function executeJob(serialized: SerializedJob): Promise<void> {
  // 反序列化 Job
  const job = deserializeJob(serialized)

  // 檢查是否有 handle 方法
  if (typeof job.handle !== 'function') {
    throw new Error('Job must have a handle() method')
  }

  // 執行 Job
  await job.handle()
}

/**
 * 主線程訊息處理器
 */
if (parentPort) {
  // 發送準備完成訊息
  parentPort.postMessage({ type: 'ready' } as WorkerResponse)

  // 監聽主線程訊息
  parentPort.on('message', async (message: WorkerMessage) => {
    if (message.type === 'shutdown') {
      // 關閉 Worker
      process.exit(0)
    }

    if (message.type === 'execute' && message.job) {
      try {
        // 如果有類別註冊資料，先註冊類別
        if (message.classRegistry) {
          const _registry = JSON.parse(message.classRegistry)
          // 注意：這裡需要實際的類別實作，暫時只記錄類別名稱
          // 實際使用時需要從主線程傳遞類別定義或使用其他機制
        }

        // 執行 Job
        await executeJob(message.job)

        // 回傳成功訊息
        parentPort!.postMessage({ type: 'success' } as WorkerResponse)
      } catch (error) {
        // 回傳錯誤訊息
        const err = error instanceof Error ? error : new Error(String(error))
        parentPort!.postMessage({
          type: 'error',
          error: err.message,
          stack: err.stack,
        } as WorkerResponse)
      }
    }
  })
}
