import type { Job } from '../Job'
import type { SerializedJob } from '../types'

/**
 * Job Serializer 介面
 *
 * 負責將 Job 序列化和反序列化。
 * 支援多種序列化策略（JSON、類別名稱等）。
 *
 * @example
 * ```typescript
 * class MySerializer implements JobSerializer {
 *   serialize(job: Job): SerializedJob {
 *     // 序列化邏輯
 *   }
 *
 *   deserialize(serialized: SerializedJob): Job {
 *     // 反序列化邏輯
 *   }
 * }
 * ```
 */
export interface JobSerializer {
  /**
   * 序列化 Job
   * @param job - Job 實例
   * @returns 序列化後的 Job 資料
   */
  serialize(job: Job): SerializedJob

  /**
   * 反序列化 Job
   * @param serialized - 序列化後的 Job 資料
   * @returns Job 實例
   */
  deserialize(serialized: SerializedJob): Job
}
