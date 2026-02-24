import type { CborAccelerator, NativeAcceleratorStatus } from '@gravito/core'
import { NativeAccelerator } from '@gravito/core'
import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import type { JobSerializer } from './JobSerializer'

/**
 * 原生 CBOR 序列化器
 *
 * 使用 @gravito/core 的 NativeAccelerator 進行 CBOR 編碼/解碼，
 * 自動選擇最佳的加速器實現（Native FFI 或 JavaScript Fallback）。
 *
 * 與現有 BinarySerializer 完全相容（type 為 'binary'），
 * 可作為直接替代品使用。
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new CborNativeSerializer()
 * const serialized = serializer.serialize(job)
 * const deserialized = serializer.deserialize(serialized)
 * ```
 */
export class CborNativeSerializer implements JobSerializer {
  private readonly accelerator: CborAccelerator

  constructor() {
    this.accelerator = NativeAccelerator.getCborAccelerator()
  }

  /**
   * 取得當前使用的 CBOR 後端資訊
   * 可用於診斷和監控
   */
  static getBackendInfo(): NativeAcceleratorStatus {
    return NativeAccelerator.getStatus()
  }

  /**
   * 將 Job 序列化為 CBOR 二進制格式
   *
   * @param job - 要序列化的 Job 實例
   * @returns SerializedJob，data 為 Uint8Array
   */
  serialize(job: Job): SerializedJob {
    const id = job.id || `${Date.now()}-${crypto.randomUUID()}`

    // 萃取屬性（排除 function 和 undefined）
    const properties: Record<string, unknown> = {}
    for (const key in job) {
      if (Object.hasOwn(job, key)) {
        const value = (job as unknown as Record<string, unknown>)[key]
        if (typeof value !== 'function' && value !== undefined) {
          properties[key] = value
        }
      }
    }

    // 使用 NativeAccelerator 的 CBOR 編碼
    const encoded = this.accelerator.encode(properties)

    return {
      id,
      type: 'binary',
      data: encoded,
      createdAt: Date.now(),
      ...(job.delaySeconds !== undefined ? { delaySeconds: job.delaySeconds } : {}),
      attempts: job.attempts ?? 0,
      ...(job.maxAttempts !== undefined ? { maxAttempts: job.maxAttempts } : {}),
      ...(job.groupId ? { groupId: job.groupId } : {}),
      ...(job.priority !== undefined && job.priority !== '' ? { priority: job.priority } : {}),
      ...(job.retryAfterSeconds !== undefined ? { retryAfterSeconds: job.retryAfterSeconds } : {}),
      ...(job.retryMultiplier !== undefined ? { retryMultiplier: job.retryMultiplier } : {}),
    }
  }

  /**
   * 反序列化 CBOR 二進制資料為 Job
   *
   * 支援三種資料格式：
   * - Uint8Array（原生 CBOR 二進制）
   * - Base64 string（來自 Redis / 網路傳輸）
   * - ArrayBuffer（來自 Worker Transferable）
   *
   * @param serialized - 序列化的 Job 資料
   * @returns 還原的 Job 實例
   */
  deserialize(serialized: SerializedJob): Job {
    if (serialized.type !== 'binary') {
      throw new TypeError(`Expected binary type, got ${serialized.type}`)
    }

    const bytes = this.resolveBytes(serialized.data)

    // 使用 NativeAccelerator 的 CBOR 解碼
    let properties: Record<string, unknown>
    try {
      properties = this.accelerator.decode(bytes)
    } catch (err) {
      throw new Error(
        `Failed to decode CBOR data: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    const job = Object.create({}) as Record<string, any>
    if (properties) {
      Object.assign(job, properties)
    }

    // 從 SerializedJob 還原 metadata
    job.id = serialized.id
    if (serialized.groupId) {
      job.groupId = serialized.groupId
    }
    if (serialized.priority !== undefined) {
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

    return job as Job
  }

  /**
   * 將各種格式的 data 轉換為 Uint8Array
   *
   * @param data - Uint8Array、Base64 string 或 ArrayBuffer
   * @returns Uint8Array
   */
  private resolveBytes(data: unknown): Uint8Array {
    if (data instanceof Uint8Array) {
      return data
    }

    if (typeof data === 'string') {
      try {
        return new Uint8Array(Buffer.from(data, 'base64'))
      } catch (err) {
        throw new Error(
          `Failed to decode Base64 data: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data)
    }

    throw new TypeError(`Invalid data type for binary deserialization: ${typeof data}`)
  }
}
