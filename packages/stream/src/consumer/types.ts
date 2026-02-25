import type { Job } from '../Job'

/**
 * 從佇列抓取 job 的結果。
 *
 * JobSourceGenerator 每次 yield 一個 FetchResult，
 * 包含本輪抓取的所有 job，以及是否使用阻塞式等待的資訊。
 */
export interface FetchResult {
  /** 本次抓取到的 job 列表（可能為空） */
  jobs: Job[]
  /**
   * 是否使用了阻塞式 pop（如 BLPOP）。
   * 若為 true，代表已在 driver 層等待，不需額外 backoff。
   */
  didBlock: boolean
}

/**
 * JobSourceGenerator 的選項設定。
 */
export interface JobSourceOptions {
  /** 要消費的佇列名稱列表 */
  queues: string[]
  /** 連線名稱，不指定時使用預設連線 */
  connection?: string
  /** 每次嘗試抓取的 job 數量，大於 1 時使用批次抓取 */
  batchSize: number
  /** 是否使用阻塞式 pop */
  useBlocking: boolean
  /** 阻塞式 pop 的逾時秒數 */
  blockingTimeout: number
  /** 佇列為空時是否持續存活 */
  keepAlive: boolean
  /** 最小輪詢間隔（毫秒） */
  minPollInterval: number
  /** 最大輪詢間隔（毫秒） */
  maxPollInterval: number
  /** 自適應退避乘數 */
  backoffMultiplier: number
  /** Rate limit 設定，key 為佇列名稱 */
  rateLimits?: Record<string, { max: number; duration: number }>
  /** 並發容量 getter，讓 generator 知道可以抓多少 job */
  getCapacity: () => number
}

/**
 * JobExecutor 執行選項。
 */
export interface ExecutorOptions {
  /** debug 模式，會輸出詳細 log */
  debug: boolean
  /** Worker ID，用於 log 識別 */
  workerId: string
  /** Worker 選項（maxAttempts 等） */
  workerOptions?: {
    maxAttempts?: number
  }
  /** 監控設定 */
  monitor?: boolean | { interval?: number; extraInfo?: Record<string, unknown>; prefix?: string }
  /** 最大請求數量，達到後自動停止 */
  maxRequests?: number
  /** 外部事件回呼 */
  onEvent?: (event: string, payload: unknown) => void
}

/**
 * JobExecutor 執行一個 job 後的結果。
 */
export interface ExecutionResult {
  /** job 是否成功完成 */
  success: boolean
  /** 執行耗時（毫秒） */
  duration: number
  /** 是否因達到 maxRequests 而需要停止 consumer */
  shouldStop: boolean
  /** 如果失敗，包含錯誤資訊 */
  error?: Error
}

/**
 * Consumer 執行統計資訊。
 */
export interface ConsumerStats {
  /** 已成功處理的 job 數量 */
  processed: number
  /** 失敗（含重試失敗）的 job 數量 */
  failed: number
  /** 重試的 job 數量 */
  retried: number
  /** 目前正在執行的 job 數量 */
  active: number
}

/**
 * 停止訊號，用於 AbortController 整合。
 */
export interface StopSignal {
  /** 是否已發出停止訊號 */
  readonly aborted: boolean
}
