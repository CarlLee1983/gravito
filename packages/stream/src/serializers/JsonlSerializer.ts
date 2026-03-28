import { StreamError, StreamErrorCodes } from '../errors'
import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * 判斷目前是否在 Bun 執行環境中。
 */
const isBun = typeof globalThis.Bun !== 'undefined'

interface BunJsonlApi {
  parse(input: string): unknown[]
  parseChunk(input: string): {
    values: unknown[]
    read: number
    done: boolean
    error: SyntaxError | null
  }
}

interface JobStateRecord extends Record<string, unknown> {
  id?: string
  groupId?: string
  priority?: string | number
  delaySeconds?: number
  attempts?: number
  maxAttempts?: number
  retryAfterSeconds?: number
  retryMultiplier?: number
}

/**
 * JSONL (JSON Lines) Serializer。
 *
 * 使用 JSONL 格式序列化 Job，每個 Job 佔一行。
 * 在 Bun 環境中利用原生 `Bun.JSONL.parse()` 和 `Bun.JSONL.parseChunk()`
 * 以獲得最佳的批量與流式處理性能；在非 Bun 環境中降級為逐行 JSON 解析。
 *
 * **使用情境**：
 * - 日誌串流與稽核場景
 * - 大量 Job 匯出 / 匯入
 * - 與外部工具（如 jq、logstash）整合
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new JsonlSerializer()
 *
 * // 單一 Job
 * const serialized = serializer.serialize(job)
 * const restored  = serializer.deserialize(serialized)
 *
 * // 批量 JSONL 字串
 * const jsonl    = serializer.serializeMany(jobs)
 * const restored = serializer.deserializeMany(jsonl)
 *
 * // 流式處理（Generator）
 * for (const job of serializer.deserializeStream(jsonlChunk)) {
 *   await queue.push(job)
 * }
 * ```
 */
export class JsonlSerializer implements JobSerializer {
  /**
   * 從 Job 提取可序列化屬性（排除函式）。
   */
  private extractProperties(job: Job): Record<string, unknown> {
    const properties: Record<string, unknown> = {}
    for (const key in job) {
      if (
        Object.hasOwn(job, key) &&
        typeof (job as unknown as Record<string, unknown>)[key] !== 'function'
      ) {
        properties[key] = (job as unknown as Record<string, unknown>)[key]
      }
    }
    return properties
  }

  /**
   * 將 SerializedJob 的 metadata 還原至 job 物件上。
   */
  private restoreMetadata(job: JobStateRecord, serialized: SerializedJob): void {
    job.id = serialized.id
    if (serialized.groupId) {
      job.groupId = serialized.groupId
    }
    if (serialized.priority) {
      job.priority = serialized.priority
    }
    if (serialized.delaySeconds !== undefined) {
      job.delaySeconds = serialized.delaySeconds
    }
    if (serialized.attempts !== undefined) {
      job.attempts = serialized.attempts
    }
    if (serialized.maxAttempts !== undefined) {
      job.maxAttempts = serialized.maxAttempts
    }
    if (serialized.retryAfterSeconds !== undefined) {
      job.retryAfterSeconds = serialized.retryAfterSeconds
    }
    if (serialized.retryMultiplier !== undefined) {
      job.retryMultiplier = serialized.retryMultiplier
    }
  }

  /**
   * 序列化單一 Job 為 SerializedJob。
   *
   * data 欄位使用 JSON 字串，type 標記為 'jsonl'。
   */
  serialize(job: Job): SerializedJob {
    const id = job.id || `${Date.now()}-${crypto.randomUUID()}`
    const properties = this.extractProperties(job)

    return {
      id,
      type: 'jsonl',
      data: JSON.stringify(properties),
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.priority ? { priority: job.priority } : {}),
      ...(job.retryAfterSeconds !== undefined ? { retryAfterSeconds: job.retryAfterSeconds } : {}),
      ...(job.retryMultiplier !== undefined ? { retryMultiplier: job.retryMultiplier } : {}),
    }
  }

  /**
   * 反序列化單一 SerializedJob 為 Job 物件。
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'jsonl') {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_INVALID_TYPE, {
        message: `Invalid serialization type: expected "jsonl", got "${serialized.type}"`,
        retryable: false,
      })
    }

    const dataStr =
      typeof serialized.data === 'string'
        ? serialized.data
        : Buffer.from(serialized.data).toString('utf8')

    let properties: Record<string, unknown>
    try {
      properties = JSON.parse(dataStr)
    } catch (err) {
      throw new StreamError(500, StreamErrorCodes.SERIALIZATION_PARSE_ERROR, {
        message: `JsonlSerializer: failed to parse JSON data: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
        cause: err instanceof Error ? err : new Error(String(err)),
      })
    }

    const job = Object.create({}) as JobStateRecord
    Object.assign(job, properties)
    this.restoreMetadata(job, serialized)

    return job as unknown as Job
  }

  /**
   * 批量序列化多個 Job 為 JSONL 字串（每個 SerializedJob 佔一行）。
   *
   * @param jobs - 要序列化的 Job 陣列
   * @returns 換行符分隔的 JSONL 字串
   */
  serializeMany(jobs: Job[]): string {
    return jobs.map((job) => JSON.stringify(this.serialize(job))).join('\n')
  }

  /**
   * 批量反序列化 JSONL 字串為 Job 陣列。
   *
   * 在 Bun 環境中使用 `Bun.JSONL.parse()` 以獲得最佳性能；
   * 非 Bun 環境則降級為逐行 `JSON.parse()`。
   *
   * @param jsonlStr - JSONL 格式字串（每行一個 SerializedJob）
   * @returns 還原後的 Job 陣列
   */
  deserializeMany(jsonlStr: string): Job[] {
    let parsed: SerializedJob[]

    if (isBun) {
      // 使用 Bun 原生 JSONL 解析器以獲得最佳性能
      parsed = (globalThis.Bun.JSONL as unknown as BunJsonlApi).parse(jsonlStr) as SerializedJob[]
    } else {
      // 降級：逐行解析
      parsed = jsonlStr
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          try {
            return JSON.parse(line) as SerializedJob
          } catch (err) {
            throw new StreamError(500, StreamErrorCodes.SERIALIZATION_PARSE_ERROR, {
              message: `JsonlSerializer: failed to parse JSONL line: ${err instanceof Error ? err.message : String(err)}`,
              retryable: false,
              cause: err instanceof Error ? err : new Error(String(err)),
            })
          }
        })
    }

    return parsed.map((serialized) => this.deserialize(serialized))
  }

  /**
   * 以 Generator 流式處理 JSONL 資料塊，逐一產出 Job。
   *
   * 適合處理大型串流或分批送達的 JSONL 資料，避免一次性將所有資料載入記憶體。
   * 在 Bun 環境中使用 `Bun.JSONL.parseChunk()` 以支援增量解析；
   * 非 Bun 環境則降級為按行切割後逐行解析。
   *
   * @param chunk - JSONL 資料塊（可能包含多行，或為不完整的單行）
   * @yields 每次產出一個還原後的 Job
   *
   * @example
   * ```typescript
   * const serializer = new JsonlSerializer()
   * for (const job of serializer.deserializeStream(bigJsonlChunk)) {
   *   await processJob(job)
   * }
   * ```
   */
  *deserializeStream(chunk: string): Generator<Job> {
    if (isBun) {
      // 使用 Bun 原生 JSONL 增量解析器
      const result = (globalThis.Bun.JSONL as unknown as BunJsonlApi).parseChunk(chunk)
      if (result.error) {
        throw new StreamError(500, StreamErrorCodes.SERIALIZATION_PARSE_ERROR, {
          message: `JsonlSerializer: failed to parse JSONL chunk: ${result.error.message}`,
          retryable: false,
        })
      }
      for (const serialized of result.values as SerializedJob[]) {
        yield this.deserialize(serialized)
      }
    } else {
      // 降級：按行切割後逐行解析
      const lines = chunk.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          continue
        }
        let serialized: SerializedJob
        try {
          serialized = JSON.parse(trimmed) as SerializedJob
        } catch (err) {
          throw new StreamError(500, StreamErrorCodes.SERIALIZATION_PARSE_ERROR, {
            message: `JsonlSerializer: failed to parse JSONL chunk line: ${err instanceof Error ? err.message : String(err)}`,
            retryable: false,
            cause: err instanceof Error ? err : new Error(String(err)),
          })
        }
        yield this.deserialize(serialized)
      }
    }
  }
}
