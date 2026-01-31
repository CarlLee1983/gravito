import { Notification } from '../Notification'
import type { Notifiable } from '../types'

/**
 * Lazy Loading 通知基類
 *
 * 用於處理包含大量資料或需要資料庫查詢的通知。
 * 只儲存識別符 (ID)，在需要時才載入完整資料。
 *
 * @typeParam TData - 載入的資料型別
 *
 * @example
 * ```typescript
 * class InvoicePaidNotification extends LazyNotification<Invoice> {
 *   constructor(private invoiceId: string) {
 *     super()
 *   }
 *
 *   protected async loadData(notifiable: Notifiable): Promise<Invoice> {
 *     return await db.invoices.findById(this.invoiceId)
 *   }
 *
 *   toMail(notifiable: Notifiable): MailMessage {
 *     const invoice = this.getCached()
 *     if (!invoice) {
 *       throw new Error('Invoice data not loaded')
 *     }
 *     return {
 *       subject: `Invoice #${invoice.number} paid`,
 *       text: `Amount: ${invoice.amount}`
 *     }
 *   }
 * }
 * ```
 */
export abstract class LazyNotification<TData> extends Notification {
  /**
   * 快取的資料
   */
  private _cachedData?: TData

  /**
   * 載入資料的抽象方法（由子類實作）
   *
   * @param notifiable - 通知接收者
   * @returns 載入的資料
   */
  protected abstract loadData(notifiable: Notifiable): Promise<TData>

  /**
   * 取得快取的資料
   *
   * @returns 快取的資料，如果尚未載入則回傳 undefined
   */
  protected getCached(): TData | undefined {
    return this._cachedData
  }

  /**
   * 設定快取資料
   *
   * @param data - 要快取的資料
   */
  protected setCached(data: TData): void {
    this._cachedData = data
  }

  /**
   * 檢查資料是否已載入
   *
   * @returns 如果資料已快取則回傳 true
   */
  protected isLoaded(): boolean {
    return this._cachedData !== undefined
  }

  /**
   * 清除快取
   */
  protected clearCache(): void {
    this._cachedData = undefined
  }

  /**
   * 載入資料並快取（如果尚未載入）
   *
   * @param notifiable - 通知接收者
   * @returns 載入的資料
   */
  protected async ensureLoaded(notifiable: Notifiable): Promise<TData> {
    if (this._cachedData === undefined) {
      this._cachedData = await this.loadData(notifiable)
    }
    return this._cachedData
  }
}
