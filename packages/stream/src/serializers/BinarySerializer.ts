import type { NativeAcceleratorStatus } from '@gravito/core'
import type { Job } from '../Job'
import type { SerializedJob } from '../types'
import { CborNativeSerializer } from './CborNativeSerializer'
import type { JobSerializer } from './JobSerializer'

/**
 * Binary Serializer using CBOR.
 *
 * 委派給 CborNativeSerializer，使用 @gravito/core 的 NativeAccelerator
 * 進行 CBOR 編碼/解碼。自動選擇最佳後端（Native FFI 或 JavaScript Fallback）。
 *
 * 此類別保留為向後相容的入口點，新程式碼建議直接使用 CborNativeSerializer。
 *
 * @public
 * @example
 * ```typescript
 * const serializer = new BinarySerializer()
 * const serialized = serializer.serialize(job)
 * const deserialized = serializer.deserialize(serialized)
 * ```
 */
export class BinarySerializer implements JobSerializer {
  private readonly delegate: CborNativeSerializer

  constructor() {
    this.delegate = new CborNativeSerializer()
  }

  /**
   * 取得當前使用的 CBOR 後端資訊
   * 可用於診斷和監控
   */
  static getBackendInfo(): NativeAcceleratorStatus {
    return CborNativeSerializer.getBackendInfo()
  }

  /**
   * 將 Job 序列化為 CBOR 二進制格式
   */
  serialize(job: Job): SerializedJob {
    return this.delegate.serialize(job)
  }

  /**
   * 反序列化 CBOR 二進制資料為 Job
   *
   * 支援三種資料格式：
   * - Uint8Array（原生 CBOR 二進制）
   * - Base64 string（來自 Redis / 網路傳輸）
   * - ArrayBuffer（來自 Worker Transferable）
   */
  deserialize(serialized: SerializedJob): Job {
    return this.delegate.deserialize(serialized)
  }
}
