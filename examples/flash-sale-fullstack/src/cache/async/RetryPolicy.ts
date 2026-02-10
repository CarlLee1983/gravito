/**
 * 重試策略
 *
 * 定義異步失效操作的重試策略
 * - 指數退避
 * - 最大重試次數
 * - 可配置的延遲參數
 */

/**
 * 重試結果
 */
export interface RetryResult {
  success: boolean // 是否成功
  attempt: number // 嘗試次數
  totalDelay: number // 總延遲時間（毫秒）
  lastError?: Error // 最後的錯誤
}

/**
 * 重試策略配置
 */
export interface RetryConfig {
  maxAttempts: number // 最大嘗試次數
  initialDelayMs: number // 初始延遲（毫秒）
  maxDelayMs: number // 最大延遲（毫秒）
  backoffMultiplier: number // 退避乘數
  jitterFraction: number // 抖動比例 (0-1)
}

/**
 * 默認重試配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFraction: 0.1,
}

/**
 * 重試策略管理器
 */
export class RetryPolicy {
  private readonly config: RetryConfig

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    }
  }

  /**
   * 執行帶重試的操作
   *
   * @param operation 要執行的操作
   * @returns 重試結果
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<{ result?: T; retryResult: RetryResult }> {
    let lastError: Error | undefined
    let totalDelay = 0

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await operation()
        return {
          result,
          retryResult: {
            success: true,
            attempt,
            totalDelay,
          },
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 如果這不是最後一次嘗試，等待後重試
        if (attempt < this.config.maxAttempts) {
          const delayMs = this.calculateDelay(attempt)
          totalDelay += delayMs
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    // 所有嘗試都失敗
    return {
      retryResult: {
        success: false,
        attempt: this.config.maxAttempts,
        totalDelay,
        lastError,
      },
    }
  }

  /**
   * 計算重試延遲
   * 使用指數退避 + 隨機抖動
   */
  calculateDelay(attemptNumber: number): number {
    // 指數退避：2^(n-1) * initialDelay
    const exponentialDelay =
      this.config.backoffMultiplier ** (attemptNumber - 1) * this.config.initialDelayMs

    // 限制最大延遲
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs)

    // 添加隨機抖動以防止驚羣
    const jitter = cappedDelay * this.config.jitterFraction * Math.random()

    return Math.round(cappedDelay + jitter)
  }

  /**
   * 生成重試計劃
   * 返回每次嘗試前的延遲列表
   */
  generateRetrySchedule(): number[] {
    const schedule: number[] = []

    for (let attempt = 1; attempt < this.config.maxAttempts; attempt++) {
      schedule.push(this.calculateDelay(attempt))
    }

    return schedule
  }

  /**
   * 獲取配置
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * 檢查是否應該重試
   */
  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.config.maxAttempts
  }

  /**
   * 獲取剩餘重試次數
   */
  getRemainingAttempts(currentAttempt: number): number {
    return Math.max(0, this.config.maxAttempts - currentAttempt)
  }
}

/**
 * 重試策略工廠
 */
export class RetryPolicyFactory {
  /**
   * 創建快速重試策略（適合短超時）
   */
  static createFastRetry(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 5,
      initialDelayMs: 10,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterFraction: 0.1,
    })
  }

  /**
   * 創建標準重試策略
   */
  static createStandardRetry(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFraction: 0.1,
    })
  }

  /**
   * 創建慢速重試策略（適合長操作）
   */
  static createSlowRetry(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFraction: 0.2,
    })
  }

  /**
   * 創建無重試策略
   */
  static createNoRetry(): RetryPolicy {
    return new RetryPolicy({
      maxAttempts: 1,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffMultiplier: 1,
      jitterFraction: 0,
    })
  }
}
