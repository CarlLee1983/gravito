/**
 * Sandboxed Worker 實作
 *
 * 在獨立的 Worker Thread 中執行 Job，提供上下文隔離和錯誤防護。
 *
 * @public
 */

import { resolve } from 'path'
import { Worker as ThreadWorker } from 'worker_threads'
import type { SerializedJob } from '../types'

/**
 * Sandboxed Worker 配置選項
 */
export interface SandboxedWorkerConfig {
  /**
   * 最大執行時間（毫秒）
   *
   * 超過此時間的 Job 將被終止。
   * @default 30000 (30 秒)
   */
  maxExecutionTime?: number

  /**
   * 最大記憶體限制（MB）
   *
   * 超過此限制的 Worker 將被終止並重啟。
   * 注意：此限制需要透過 resourceLimits 設定，但不是所有平台都支援。
   * @default undefined (無限制)
   */
  maxMemory?: number

  /**
   * 是否隔離上下文
   *
   * true 表示每個 Job 在獨立的 Worker Thread 中執行，
   * false 表示複用同一個 Worker Thread。
   * @default false
   */
  isolateContexts?: boolean

  /**
   * Worker Thread 閒置超時（毫秒）
   *
   * Worker 閒置超過此時間後將被終止以節省資源。
   * @default 60000 (60 秒)
   */
  idleTimeout?: number
}

/**
 * Worker 狀態
 */
enum WorkerState {
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 就緒 */
  READY = 'ready',
  /** 執行中 */
  BUSY = 'busy',
  /** 已終止 */
  TERMINATED = 'terminated',
}

/**
 * Sandboxed Worker
 *
 * 在獨立的 Worker Thread 中執行 Job，提供：
 * - 上下文隔離：每個 Job 可選擇在獨立的執行環境中運行
 * - 超時控制：自動終止執行時間過長的 Job
 * - 記憶體限制：防止記憶體洩漏影響主線程
 * - 錯誤隔離：Worker 崩潰不會影響主線程
 *
 * @example
 * ```typescript
 * const worker = new SandboxedWorker({
 *   maxExecutionTime: 30000,
 *   maxMemory: 512,
 *   isolateContexts: true
 * });
 *
 * await worker.execute(serializedJob);
 * await worker.terminate();
 * ```
 */
export class SandboxedWorker {
  private worker: ThreadWorker | null = null
  private state: WorkerState = WorkerState.INITIALIZING
  private config: Required<SandboxedWorkerConfig>
  private idleTimer: NodeJS.Timeout | null = null
  private executionTimer: NodeJS.Timeout | null = null

  /**
   * 建構 Sandboxed Worker
   *
   * @param config - Worker 配置選項
   */
  constructor(config: SandboxedWorkerConfig = {}) {
    this.config = {
      maxExecutionTime: config.maxExecutionTime ?? 30000,
      maxMemory: config.maxMemory ?? 0,
      isolateContexts: config.isolateContexts ?? false,
      idleTimeout: config.idleTimeout ?? 60000,
    }
  }

  /**
   * 初始化 Worker Thread
   *
   * @returns Worker 實例
   * @throws {Error} 如果 Worker 建立失敗
   */
  private async initWorker(): Promise<ThreadWorker> {
    // 如果已存在且未終止，直接返回
    if (this.worker && this.state !== WorkerState.TERMINATED) {
      return this.worker
    }

    // 建立新的 Worker Thread
    const workerPath = resolve(__dirname, 'job-executor.js')

    const resourceLimits: any = {}
    if (this.config.maxMemory > 0) {
      // 設定記憶體限制（以位元組為單位）
      resourceLimits.maxOldGenerationSizeMb = this.config.maxMemory
      resourceLimits.maxYoungGenerationSizeMb = Math.min(this.config.maxMemory / 2, 128)
    }

    this.worker = new ThreadWorker(workerPath, {
      resourceLimits: Object.keys(resourceLimits).length > 0 ? resourceLimits : undefined,
    })

    this.state = WorkerState.INITIALIZING

    // 等待 Worker 準備完成
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'))
      }, 5000)

      this.worker!.once('message', (message: any) => {
        clearTimeout(timeout)
        if (message.type === 'ready') {
          this.state = WorkerState.READY
          resolve()
        } else {
          reject(new Error('Unexpected worker message during initialization'))
        }
      })

      this.worker!.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })

    // 設定錯誤處理
    this.worker.on('error', (error) => {
      console.error('[SandboxedWorker] Worker error:', error)
      this.state = WorkerState.TERMINATED
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[SandboxedWorker] Worker exited with code ${code}`)
      }
      this.state = WorkerState.TERMINATED
    })

    return this.worker
  }

  /**
   * 執行 Job
   *
   * 在 Worker Thread 中執行序列化的 Job。
   *
   * @param job - 序列化的 Job 資料
   * @throws {Error} 如果 Job 執行失敗或超時
   */
  async execute(job: SerializedJob): Promise<void> {
    // 如果需要隔離上下文，每次建立新的 Worker
    if (this.config.isolateContexts) {
      await this.terminate()
    }

    // 初始化或取得 Worker
    const worker = await this.initWorker()
    this.state = WorkerState.BUSY

    // 清除閒置計時器
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    try {
      // 執行 Job（帶超時控制）
      await Promise.race([this.executeInWorker(worker, job), this.createTimeoutPromise()])
    } finally {
      this.state = WorkerState.READY

      // 清除執行計時器
      if (this.executionTimer) {
        clearTimeout(this.executionTimer)
        this.executionTimer = null
      }

      // 設定閒置計時器
      if (!this.config.isolateContexts) {
        this.startIdleTimer()
      } else {
        // 如果隔離上下文，立即終止
        await this.terminate()
      }
    }
  }

  /**
   * 在 Worker 中執行 Job
   *
   * @param worker - Worker 實例
   * @param job - 序列化的 Job 資料
   * @returns Promise，在 Job 執行完成時解析
   */
  private executeInWorker(worker: ThreadWorker, job: SerializedJob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // 監聽執行結果
      const messageHandler = (message: any) => {
        if (message.type === 'success') {
          cleanup()
          resolve()
        } else if (message.type === 'error') {
          cleanup()
          const error = new Error(message.error || 'Job execution failed')
          if (message.stack) {
            error.stack = message.stack
          }
          reject(error)
        }
      }

      // 監聽錯誤
      const errorHandler = (error: Error) => {
        cleanup()
        reject(error)
      }

      // 監聽退出
      const exitHandler = (code: number) => {
        cleanup()
        if (code !== 0) {
          reject(new Error(`Worker exited unexpectedly with code ${code}`))
        }
      }

      // 清理監聽器
      const cleanup = () => {
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        worker.off('exit', exitHandler)
      }

      // 註冊監聽器
      worker.on('message', messageHandler)
      worker.on('error', errorHandler)
      worker.on('exit', exitHandler)

      // 發送執行訊息
      worker.postMessage({
        type: 'execute',
        job,
      })
    })
  }

  /**
   * 建立超時 Promise
   *
   * @returns Promise，在超時時拒絕
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise<never>((_, reject) => {
      this.executionTimer = setTimeout(() => {
        // 超時，終止 Worker
        this.terminate().catch(console.error)
        reject(new Error(`Job execution timeout after ${this.config.maxExecutionTime}ms`))
      }, this.config.maxExecutionTime)
    })
  }

  /**
   * 啟動閒置計時器
   *
   * 在 Worker 閒置一段時間後自動終止以節省資源。
   */
  private startIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    this.idleTimer = setTimeout(() => {
      this.terminate().catch(console.error)
    }, this.config.idleTimeout)
  }

  /**
   * 終止 Worker Thread
   *
   * 立即終止 Worker，釋放資源。
   */
  async terminate(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    if (this.executionTimer) {
      clearTimeout(this.executionTimer)
      this.executionTimer = null
    }

    if (this.worker) {
      const worker = this.worker
      this.worker = null
      this.state = WorkerState.TERMINATED

      try {
        await worker.terminate()
      } catch (error) {
        console.error('[SandboxedWorker] Error terminating worker:', error)
      }
    }
  }

  /**
   * 取得 Worker 狀態
   *
   * @returns 當前狀態
   */
  getState(): string {
    return this.state
  }

  /**
   * 檢查 Worker 是否就緒
   *
   * @returns true 表示就緒，可以執行 Job
   */
  isReady(): boolean {
    return this.state === WorkerState.READY
  }

  /**
   * 檢查 Worker 是否忙碌
   *
   * @returns true 表示正在執行 Job
   */
  isBusy(): boolean {
    return this.state === WorkerState.BUSY
  }
}
