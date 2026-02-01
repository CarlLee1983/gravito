/**
 * Worker Pool 實作
 *
 * 管理多個 Sandboxed Worker，提供並發控制、Worker 複用和健康檢查功能。
 *
 * @public
 */

import type { SerializedJob } from '../types'
import { SandboxedWorker, type SandboxedWorkerConfig } from './SandboxedWorker'

/**
 * Worker Pool 配置選項
 */
export interface WorkerPoolConfig extends SandboxedWorkerConfig {
  /**
   * Worker Pool 大小
   *
   * 同時存在的 Worker 數量上限。
   * @default 4
   */
  poolSize?: number

  /**
   * 最小 Worker 數量
   *
   * Pool 會預先創建並保持此數量的 Worker 就緒。
   * @default 0
   */
  minWorkers?: number

  /**
   * 健康檢查間隔（毫秒）
   *
   * 定期檢查 Worker 健康狀態並清理無效的 Worker。
   * @default 30000 (30 秒)
   */
  healthCheckInterval?: number
}

/**
 * Worker 統計資訊
 */
export interface WorkerPoolStats {
  /** 總 Worker 數量 */
  total: number
  /** 就緒的 Worker 數量 */
  ready: number
  /** 忙碌的 Worker 數量 */
  busy: number
  /** 已終止的 Worker 數量 */
  terminated: number
  /** 等待執行的 Job 數量 */
  pending: number
  /** 已完成的 Job 總數 */
  completed: number
  /** 失敗的 Job 總數 */
  failed: number
}

/**
 * Worker Pool
 *
 * 管理一組 Sandboxed Worker，提供：
 * - 並發控制：限制同時執行的 Job 數量
 * - Worker 複用：避免頻繁創建和銷毀 Worker
 * - 負載平衡：將 Job 分配到可用的 Worker
 * - 健康檢查：定期清理無效的 Worker
 * - 預熱機制：預先創建 Worker 以減少首次執行延遲
 *
 * @example
 * ```typescript
 * const pool = new WorkerPool({
 *   poolSize: 8,
 *   minWorkers: 2,
 *   maxExecutionTime: 30000
 * });
 *
 * await pool.execute(job);
 * await pool.shutdown();
 * ```
 */
export class WorkerPool {
  private workers: SandboxedWorker[] = []
  private config: Required<WorkerPoolConfig>
  private queue: Array<{
    job: SerializedJob
    resolve: () => void
    reject: (error: Error) => void
  }> = []
  private healthCheckTimer: NodeJS.Timeout | null = null
  private stats = {
    completed: 0,
    failed: 0,
  }

  /**
   * 建構 Worker Pool
   *
   * @param config - Pool 配置選項
   */
  constructor(config: WorkerPoolConfig = {}) {
    this.config = {
      poolSize: config.poolSize ?? 4,
      minWorkers: config.minWorkers ?? 0,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      maxExecutionTime: config.maxExecutionTime ?? 30000,
      maxMemory: config.maxMemory ?? 0,
      isolateContexts: config.isolateContexts ?? false,
      idleTimeout: config.idleTimeout ?? 60000,
    }

    // 初始化最小 Worker 數量
    this.warmUp()

    // 啟動健康檢查
    this.startHealthCheck()
  }

  /**
   * 預熱 Worker Pool
   *
   * 預先創建指定數量的 Worker 以加快首次執行速度。
   */
  private warmUp(): void {
    const targetCount = Math.min(this.config.minWorkers, this.config.poolSize)
    for (let i = 0; i < targetCount; i++) {
      this.createWorker()
    }
  }

  /**
   * 創建新的 Worker
   *
   * @returns SandboxedWorker 實例
   */
  private createWorker(): SandboxedWorker {
    const worker = new SandboxedWorker({
      maxExecutionTime: this.config.maxExecutionTime,
      maxMemory: this.config.maxMemory,
      isolateContexts: this.config.isolateContexts,
      idleTimeout: this.config.idleTimeout,
    })

    this.workers.push(worker)
    return worker
  }

  /**
   * 取得可用的 Worker
   *
   * 如果沒有可用的 Worker，會嘗試創建新的（在 Pool 大小限制內）。
   *
   * @returns 可用的 Worker，如果沒有則返回 null
   */
  private getAvailableWorker(): SandboxedWorker | null {
    // 尋找就緒的 Worker
    const readyWorker = this.workers.find((w) => w.isReady())
    if (readyWorker) {
      return readyWorker
    }

    // 如果沒有就緒的 Worker，檢查是否可以創建新的
    if (this.workers.length < this.config.poolSize) {
      return this.createWorker()
    }

    // Pool 已滿且所有 Worker 都在忙碌
    return null
  }

  /**
   * 執行 Job
   *
   * 將 Job 分配到可用的 Worker 執行。如果沒有可用的 Worker，
   * Job 會被加入佇列等待。
   *
   * @param job - 序列化的 Job 資料
   * @throws {Error} 如果 Job 執行失敗
   */
  async execute(job: SerializedJob): Promise<void> {
    const worker = this.getAvailableWorker()

    if (worker) {
      // 有可用的 Worker，直接執行
      try {
        await worker.execute(job)
        this.stats.completed++
      } catch (error) {
        this.stats.failed++
        throw error
      } finally {
        // 執行完成後，檢查是否有等待的 Job
        this.processQueue()
      }
    } else {
      // 沒有可用的 Worker，加入佇列
      return new Promise<void>((resolve, reject) => {
        this.queue.push({ job, resolve, reject })
      })
    }
  }

  /**
   * 處理佇列中的 Job
   *
   * 當有 Worker 變為可用時，從佇列中取出 Job 執行。
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return
    }

    const worker = this.getAvailableWorker()
    if (!worker) {
      return
    }

    const item = this.queue.shift()
    if (!item) {
      return
    }

    // 執行 Job
    worker
      .execute(item.job)
      .then(() => {
        this.stats.completed++
        item.resolve()
      })
      .catch((error) => {
        this.stats.failed++
        item.reject(error)
      })
      .finally(() => {
        // 繼續處理佇列
        this.processQueue()
      })
  }

  /**
   * 啟動健康檢查
   *
   * 定期檢查 Worker 狀態並清理已終止的 Worker。
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      return
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * 執行健康檢查
   *
   * 清理已終止的 Worker 並確保最小 Worker 數量。
   */
  private performHealthCheck(): void {
    // 移除已終止的 Worker
    this.workers = this.workers.filter((worker) => {
      if (worker.getState() === 'terminated') {
        worker.terminate().catch(console.error)
        return false
      }
      return true
    })

    // 確保最小 Worker 數量
    const activeWorkers = this.workers.length
    if (activeWorkers < this.config.minWorkers) {
      const needed = this.config.minWorkers - activeWorkers
      for (let i = 0; i < needed; i++) {
        this.createWorker()
      }
    }
  }

  /**
   * 取得 Pool 統計資訊
   *
   * @returns 統計資訊
   */
  getStats(): WorkerPoolStats {
    let ready = 0
    let busy = 0
    let terminated = 0

    for (const worker of this.workers) {
      const state = worker.getState()
      if (state === 'ready') ready++
      else if (state === 'busy') busy++
      else if (state === 'terminated') terminated++
    }

    return {
      total: this.workers.length,
      ready,
      busy,
      terminated,
      pending: this.queue.length,
      completed: this.stats.completed,
      failed: this.stats.failed,
    }
  }

  /**
   * 關閉 Pool
   *
   * 終止所有 Worker 並清理資源。等待中的 Job 會被拒絕。
   */
  async shutdown(): Promise<void> {
    // 停止健康檢查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    // 拒絕所有等待中的 Job
    for (const item of this.queue) {
      item.reject(new Error('Worker pool is shutting down'))
    }
    this.queue = []

    // 終止所有 Worker
    await Promise.all(this.workers.map((worker) => worker.terminate().catch(console.error)))

    this.workers = []
  }

  /**
   * 等待所有 Job 完成
   *
   * 阻塞直到所有執行中和等待中的 Job 都完成。
   *
   * @param timeout - 最大等待時間（毫秒），0 表示無限等待
   * @throws {Error} 如果超時
   */
  async waitForCompletion(timeout = 0): Promise<void> {
    const startTime = Date.now()

    return new Promise<void>((resolve, reject) => {
      const checkCompletion = () => {
        const stats = this.getStats()
        const isComplete = stats.busy === 0 && stats.pending === 0

        if (isComplete) {
          resolve()
          return
        }

        if (timeout > 0 && Date.now() - startTime > timeout) {
          reject(new Error('Wait for completion timeout'))
          return
        }

        setTimeout(checkCompletion, 100)
      }

      checkCompletion()
    })
  }
}
