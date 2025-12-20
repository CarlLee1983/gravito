import type { SitemapStorage } from '../types'

export interface ShadowProcessorOptions {
  storage: SitemapStorage
  mode: 'atomic' | 'versioned'
  enabled: boolean
}

export interface ShadowOperation {
  filename: string
  content: string
  shadowId?: string
}

/**
 * 影子處理器
 * 管理影子生成流程，支援原子切換和版本化兩種模式
 */
export class ShadowProcessor {
  private options: ShadowProcessorOptions
  private shadowId: string
  private operations: ShadowOperation[] = []

  constructor(options: ShadowProcessorOptions) {
    this.options = options
    this.shadowId = `shadow-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  /**
   * 添加一個影子操作
   */
  async addOperation(operation: ShadowOperation): Promise<void> {
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
      await this.options.storage.writeShadow(
        operation.filename,
        operation.content,
        this.shadowId
      )
    } else {
      // 如果儲存不支援影子處理，直接寫入
      await this.options.storage.write(operation.filename, operation.content)
    }
  }

  /**
   * 提交所有影子操作
   */
  async commit(): Promise<void> {
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

