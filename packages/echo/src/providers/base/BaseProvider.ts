/**
 * Webhook Provider 抽象基礎類別
 * @module @gravito/echo/providers/base
 */

import type { WebhookProvider, WebhookVerificationResult } from '../../types'
import { getHeader, hasHeader } from './HeaderUtils'

export interface ProviderOptions {
  /** 時間戳容許誤差（秒），預設 300 */
  tolerance?: number
}

/**
 * 所有 Provider 的抽象基礎類別
 * 提供通用的 header 處理與錯誤格式化
 */
export abstract class BaseProvider implements WebhookProvider {
  abstract readonly name: string

  protected tolerance: number

  constructor(options: ProviderOptions = {}) {
    this.tolerance = options.tolerance ?? 300
  }

  /**
   * 驗證 webhook 請求
   * 子類別必須實作此方法
   */
  abstract verify(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): Promise<WebhookVerificationResult>

  /**
   * 解析事件類型（可選覆寫）
   */
  parseEventType?(payload: unknown): string | undefined

  // ─────────────────────────────────────────────
  // Protected 輔助方法
  // ─────────────────────────────────────────────

  /**
   * 取得 header 值
   */
  protected getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    return getHeader(headers, name)
  }

  /**
   * 檢查 header 是否存在
   */
  protected hasHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): boolean {
    return hasHeader(headers, name)
  }

  /**
   * 建立驗證失敗結果
   */
  protected createFailure(error: string): WebhookVerificationResult {
    return { valid: false, error }
  }

  /**
   * 建立驗證成功結果
   */
  protected createSuccess(
    payload: unknown,
    options: { eventType?: string; webhookId?: string } = {}
  ): WebhookVerificationResult {
    return {
      valid: true,
      payload,
      eventType: options.eventType,
      webhookId: options.webhookId,
    }
  }

  /**
   * 將 payload 轉換為字串
   */
  protected payloadToString(payload: string | Buffer): string {
    return typeof payload === 'string' ? payload : payload.toString('utf-8')
  }

  /**
   * 安全解析 JSON
   */
  protected safeParseJson(
    str: string
  ): { success: true; data: unknown } | { success: false; error: string } {
    try {
      return { success: true, data: JSON.parse(str) }
    } catch {
      return { success: false, error: 'Failed to parse webhook payload' }
    }
  }
}
