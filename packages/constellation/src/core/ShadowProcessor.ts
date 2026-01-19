import type { SitemapStorage } from '../types'
import { Mutex } from '../utils/Mutex'

/**
 * Options for configuring the `ShadowProcessor`.
 *
 * @public
 * @since 3.0.0
 */
export interface ShadowProcessorOptions {
  /** The storage backend used for writing files. */
  storage: SitemapStorage
  /**
   * Deployment mode:
   * - `atomic`: All files are swapped at once when committed.
   * - `versioned`: Each file is committed individually, potentially creating a new version.
   */
  mode: 'atomic' | 'versioned'
  /** Whether shadow processing is enabled. */
  enabled: boolean
}

/**
 * Represents a single file write operation within a shadow session.
 *
 * @public
 * @since 3.0.0
 */
export interface ShadowOperation {
  /** The destination filename. */
  filename: string
  /** The file content to be written. */
  content: string
  /** Optional unique identifier for the shadow session. */
  shadowId?: string
}

/**
 * ShadowProcessor manages the staging and atomic deployment of generated files.
 *
 * It allows files to be written to a "shadow" location before being "committed"
 * (swapped) to their final destination, ensuring zero-downtime and atomic updates
 * for sitemaps and indexes.
 *
 * @public
 * @since 3.0.0
 */
export class ShadowProcessor {
  private options: ShadowProcessorOptions
  private shadowId: string
  private operations: ShadowOperation[] = []
  private mutex = new Mutex()

  constructor(options: ShadowProcessorOptions) {
    this.options = options
    this.shadowId = `shadow-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  /**
   * 添加一個影子操作
   */
  async addOperation(operation: ShadowOperation): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (!this.options.enabled) {
        // 如果未啟用影子處理，直接寫入
        await this.options.storage.write(operation.filename, operation.content)
        return
      }

      this.operations.push({
        ...operation,
        shadowId: operation.shadowId || this.shadowId,
      })

      // 寫入影子位置
      if (this.options.storage.writeShadow) {
        await this.options.storage.writeShadow(operation.filename, operation.content, this.shadowId)
      } else {
        // 如果儲存不支援影子處理，直接寫入
        await this.options.storage.write(operation.filename, operation.content)
      }
    })
  }

  /**
   * 提交所有影子操作
   */
  async commit(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (!this.options.enabled) {
        return
      }

      if (this.options.mode === 'atomic') {
        // 原子切換模式：一次性提交所有影子檔案
        if (this.options.storage.commitShadow) {
          await this.options.storage.commitShadow(this.shadowId)
        }
      } else {
        // 版本化模式：為每個檔案創建版本
        for (const operation of this.operations) {
          if (this.options.storage.commitShadow) {
            await this.options.storage.commitShadow(operation.shadowId || this.shadowId)
          }
        }
      }

      // 清空操作列表
      this.operations = []
    })
  }

  /**
   * 取消所有影子操作
   */
  async rollback(): Promise<void> {
    if (!this.options.enabled) {
      return
    }

    // 清空操作列表（實際檔案清理由儲存層處理）
    this.operations = []
  }

  /**
   * 獲取當前影子 ID
   */
  getShadowId(): string {
    return this.shadowId
  }

  /**
   * 獲取所有操作
   */
  getOperations(): ShadowOperation[] {
    return [...this.operations]
  }
}
