/**
 * 並發測試助手
 * 用於模擬並發訪問和測試
 */

export type ConcurrentTask<T> = () => Promise<T>

export interface ConcurrentResult<T> {
  successes: T[]
  failures: Error[]
  duration: number
}

/**
 * 並發執行多個任務
 */
export async function executeConcurrently<T>(
  tasks: ConcurrentTask<T>[],
  concurrency = 10
): Promise<ConcurrentResult<T>> {
  const startTime = Date.now()
  const successes: T[] = []
  const failures: Error[] = []
  const queue = [...tasks]
  const running: Promise<void>[] = []

  async function processTask() {
    while (queue.length > 0) {
      const task = queue.shift()
      if (!task) break

      try {
        const result = await task()
        successes.push(result)
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  // 建立並發工作者
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    running.push(processTask())
  }

  // 等待所有任務完成
  await Promise.all(running)

  const duration = Date.now() - startTime

  return {
    successes,
    failures,
    duration,
  }
}

/**
 * 批量執行操作並收集結果
 */
export async function batchExecute<T>(
  operations: ConcurrentTask<T>[],
  batchSize = 100
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((op) => op()))
    results.push(...batchResults)
  }

  return results
}

/**
 * 重試失敗的任務
 */
export async function retryWithBackoff<T>(
  task: ConcurrentTask<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await task()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        // 指數退避
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt))
      }
    }
  }

  throw lastError || new Error('Task failed after retries')
}

/**
 * 在指定時間內持續執行任務（壓力測試）
 */
export async function stressTest<T>(
  task: ConcurrentTask<T>,
  durationMs = 10000,
  concurrency = 10
): Promise<ConcurrentResult<T>> {
  const startTime = Date.now()
  const successes: T[] = []
  const failures: Error[] = []
  const tasks: Promise<void>[] = []

  async function worker() {
    while (Date.now() - startTime < durationMs) {
      try {
        const result = await task()
        successes.push(result)
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  // 建立並發工作者
  for (let i = 0; i < concurrency; i++) {
    tasks.push(worker())
  }

  await Promise.all(tasks)

  const duration = Date.now() - startTime

  return {
    successes,
    failures,
    duration,
  }
}

/**
 * 漸進式負載測試
 */
export async function rampUpTest<T>(
  task: ConcurrentTask<T>,
  maxConcurrency = 100,
  stepSize = 10,
  durationPerStep = 5000
): Promise<Map<number, ConcurrentResult<T>>> {
  const results = new Map<number, ConcurrentResult<T>>()

  for (let concurrency = stepSize; concurrency <= maxConcurrency; concurrency += stepSize) {
    const tasks: ConcurrentTask<T>[] = []
    const operationsPerWorker = durationPerStep / 10 // 估計每個工作者 10ms 的任務時間
    const totalOperations = concurrency * operationsPerWorker

    for (let i = 0; i < totalOperations; i++) {
      tasks.push(task)
    }

    const result = await executeConcurrently(tasks, concurrency)
    results.set(concurrency, result)

    // 等待一段時間再進行下一個階段
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return results
}

/**
 * 並發一致性檢查
 */
export async function checkConcurrencyConsistency<T>(
  readTask: ConcurrentTask<T>,
  expectedValue: T,
  concurrency = 100,
  duration = 5000
): Promise<{ consistent: boolean; inconsistencies: number }> {
  let inconsistencies = 0
  const startTime = Date.now()
  const workers: Promise<void>[] = []

  async function worker() {
    while (Date.now() - startTime < duration) {
      try {
        const value = await readTask()
        if (JSON.stringify(value) !== JSON.stringify(expectedValue)) {
          inconsistencies++
        }
      } catch {
        // 忽略讀取錯誤
      }
    }
  }

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker())
  }

  await Promise.all(workers)

  return {
    consistent: inconsistencies === 0,
    inconsistencies,
  }
}
