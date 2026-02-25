import type { Job } from '../Job'
import type { QueueManager } from '../QueueManager'
import type { FetchResult, JobSourceOptions, StopSignal } from './types'

/**
 * Async Generator，用於從佇列持續抓取 Job。
 *
 * 封裝所有抓取策略（blocking/batch/sequential），自適應 backoff，
 * 以及 rate limit 過濾邏輯。每次 yield 一個 FetchResult，
 * 包含本輪抓取的 job 列表和是否使用阻塞模式的資訊。
 *
 * 設計原則：
 * - blocking pop 已在 driver 層等待，不再額外 backoff
 * - 自適應退避：空佇列時指數增長，有 job 時重設
 * - rate limit：每輪抓取前過濾掉受限的佇列
 * - 中止信號：每次 yield 前檢查 signal.aborted
 *
 * @param queueManager - QueueManager 實例
 * @param options - 抓取策略選項
 * @param signal - 中止信號（AbortController.signal）
 *
 * @example
 * ```typescript
 * const source = jobSourceGenerator(queueManager, options, controller.signal)
 *
 * for await (const result of source) {
 *   for (const job of result.jobs) {
 *     await processJob(job)
 *   }
 * }
 * ```
 */
export async function* jobSourceGenerator(
  queueManager: QueueManager,
  options: JobSourceOptions,
  signal: StopSignal
): AsyncGenerator<FetchResult> {
  const {
    queues,
    connection,
    batchSize,
    useBlocking,
    blockingTimeout,
    keepAlive,
    minPollInterval,
    maxPollInterval,
    backoffMultiplier,
    rateLimits,
    getCapacity,
  } = options

  const connectionName = connection ?? queueManager.getDefaultConnection()
  let currentPollInterval = minPollInterval

  while (!signal.aborted) {
    // 檢查目前容量
    const capacity = getCapacity()
    if (capacity <= 0) {
      // 容量已滿，稍候再試（避免 tight loop）
      await sleep(10, signal)
      if (signal.aborted) {
        break
      }
      continue
    }

    // 過濾 rate-limited 佇列
    const eligibleQueues = await filterRateLimitedQueues(
      queueManager,
      connectionName,
      queues,
      rateLimits
    )

    if (eligibleQueues.length === 0) {
      // 所有佇列都被 rate limit，短暫等待（支援提前中止）
      await sleep(currentPollInterval, signal)
      currentPollInterval = Math.min(currentPollInterval * backoffMultiplier, maxPollInterval)
      if (signal.aborted) {
        break
      }
      yield { jobs: [], didBlock: false }
      continue
    }

    // 再次檢查中止信號
    if (signal.aborted) {
      break
    }

    // 抓取 job
    const { jobs, didBlock } = await fetchJobs(
      queueManager,
      connectionName,
      eligibleQueues,
      batchSize,
      capacity,
      useBlocking,
      blockingTimeout
    )

    if (jobs.length > 0) {
      // 有 job：重設 backoff
      currentPollInterval = minPollInterval
      yield { jobs, didBlock }
      continue
    }

    // 沒有 job
    if (!keepAlive) {
      // keepAlive=false 且佇列為空，終止 generator
      break
    }

    // 有 job 時才 yield，空結果僅在必要時 yield
    if (!didBlock) {
      // 自適應退避（支援提前中止）
      await sleep(currentPollInterval, signal)
      currentPollInterval = Math.min(currentPollInterval * backoffMultiplier, maxPollInterval)
    }
    // 若 didBlock，已在 driver 層等待過，直接繼續迴圈

    // 再次檢查中止信號再 yield
    if (!signal.aborted) {
      yield { jobs: [], didBlock }
    }
  }
}

/**
 * 過濾掉受 rate limit 限制的佇列，回傳允許處理的佇列名稱列表。
 */
async function filterRateLimitedQueues(
  queueManager: QueueManager,
  connectionName: string,
  queues: string[],
  rateLimits?: Record<string, { max: number; duration: number }>
): Promise<string[]> {
  if (!rateLimits) {
    return queues
  }

  const eligible: string[] = []
  for (const queue of queues) {
    const limitConfig = rateLimits[queue]
    if (!limitConfig) {
      eligible.push(queue)
      continue
    }

    try {
      const driver = queueManager.getDriver(connectionName)
      if (driver.checkRateLimit) {
        const allowed = await driver.checkRateLimit(queue, limitConfig)
        if (allowed) {
          eligible.push(queue)
        }
        // 被 rate limit 的佇列直接略過
      } else {
        // driver 不支援 rate limit 檢查，視為允許
        eligible.push(queue)
      }
    } catch (_err) {
      // rate limit 檢查失敗時保守處理，允許佇列通過
      eligible.push(queue)
    }
  }

  return eligible
}

/**
 * 根據策略從佇列抓取 job。
 *
 * 支援三種策略：
 * 1. batch：batchSize > 1，使用 popMany
 * 2. blocking：batchSize = 1 且 useBlocking=true，使用 popBlocking
 * 3. sequential：batchSize = 1 且 useBlocking=false，依序 pop 各佇列
 */
async function fetchJobs(
  queueManager: QueueManager,
  connectionName: string,
  eligibleQueues: string[],
  batchSize: number,
  capacity: number,
  useBlocking: boolean,
  blockingTimeout: number
): Promise<{ jobs: Job[]; didBlock: boolean }> {
  const driver = queueManager.getDriver(connectionName)

  // 策略 1：批次抓取
  if (batchSize > 1) {
    const actualBatchSize = Math.min(batchSize, capacity)
    for (const queue of eligibleQueues) {
      try {
        const fetched = await queueManager.popMany(queue, actualBatchSize, connectionName)
        if (fetched.length > 0) {
          return { jobs: fetched, didBlock: false }
        }
      } catch (_err) {
        // 單一佇列失敗不影響其他佇列
      }
    }
    return { jobs: [], didBlock: false }
  }

  // 策略 2：阻塞式 pop
  if (useBlocking && driver.popBlocking) {
    try {
      const job = await queueManager.popBlocking(eligibleQueues, blockingTimeout, connectionName)
      if (job) {
        return { jobs: [job], didBlock: true }
      }
      return { jobs: [], didBlock: true }
    } catch (_err) {
      return { jobs: [], didBlock: false }
    }
  }

  // 策略 3：依序非阻塞 pop
  for (const queue of eligibleQueues) {
    try {
      const job = await queueManager.pop(queue, connectionName)
      if (job) {
        return { jobs: [job], didBlock: false }
      }
    } catch (_err) {
      // 單一佇列失敗不影響其他佇列
    }
  }
  return { jobs: [], didBlock: false }
}

/**
 * 非同步睡眠工具函數，支援提前中止。
 *
 * 若 signal 在睡眠期間被中止，Promise 會立即 resolve（不拋出錯誤）。
 */
function sleep(ms: number, signal?: StopSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(resolve, ms)
    // 若 signal 支援 addEventListener（原生 AbortSignal），監聽中止事件
    if (signal && 'addEventListener' in signal) {
      ;(signal as AbortSignal).addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true }
      )
    }
  })
}
