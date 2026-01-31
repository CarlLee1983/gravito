/**
 * Lazy Notification 範例
 *
 * 展示如何使用 LazyNotification 來處理包含大量資料或需要資料庫查詢的通知。
 */

import type { MailMessage, Notifiable } from '../src/types'
import { LazyNotification } from '../src/utils/LazyNotification'

// 模擬資料庫
const database = {
  invoices: new Map([
    [
      'inv-123',
      {
        id: 'inv-123',
        number: 'INV-2025-001',
        amount: 1500,
        currency: 'TWD',
        customerName: '張三',
        customerEmail: 'zhang@example.com',
        items: [
          { name: '產品 A', quantity: 2, price: 500 },
          { name: '產品 B', quantity: 1, price: 500 },
        ],
      },
    ],
  ]),
}

/**
 * 發票已付款通知（使用 Lazy Loading）
 *
 * 只儲存發票 ID，在需要時才載入完整的發票資料
 */
class InvoicePaidNotification extends LazyNotification<{
  invoice: {
    id: string
    number: string
    amount: number
    currency: string
    customerName: string
    customerEmail: string
  }
}> {
  constructor(private invoiceId: string) {
    super()
  }

  /**
   * 載入發票資料（從資料庫）
   */
  protected async loadData(_notifiable: Notifiable): Promise<{
    invoice: {
      id: string
      number: string
      amount: number
      currency: string
      customerName: string
      customerEmail: string
    }
  }> {
    // 模擬資料庫查詢
    const invoice = database.invoices.get(this.invoiceId)

    if (!invoice) {
      throw new Error(`Invoice ${this.invoiceId} not found`)
    }

    return {
      invoice: {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        currency: invoice.currency,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
      },
    }
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail', 'database']
  }

  /**
   * 生成郵件內容
   */
  toMail(_notifiable: Notifiable): MailMessage {
    const data = this.getCached()

    if (!data) {
      throw new Error('Invoice data not loaded. Call ensureLoaded() first.')
    }

    return {
      subject: `發票 ${data.invoice.number} 已付款`,
      to: data.invoice.customerEmail,
      html: `
        <h1>付款確認</h1>
        <p>親愛的 ${data.invoice.customerName}，</p>
        <p>您的發票 <strong>${data.invoice.number}</strong> 已成功付款。</p>
        <p>金額: ${data.invoice.amount} ${data.invoice.currency}</p>
        <p>感謝您的惠顧！</p>
      `,
    }
  }

  /**
   * 生成資料庫通知
   */
  toDatabase(_notifiable: Notifiable) {
    const data = this.getCached()

    if (!data) {
      throw new Error('Invoice data not loaded.')
    }

    return {
      type: 'invoice.paid',
      data: {
        invoiceId: data.invoice.id,
        invoiceNumber: data.invoice.number,
        amount: data.invoice.amount,
      },
    }
  }

  /**
   * 取得發票 ID（用於序列化）
   */
  getInvoiceId(): string {
    return this.invoiceId
  }
}

/**
 * 使用範例
 */
async function example() {
  // 1. 建立通知（只需要 ID）
  const notification = new InvoicePaidNotification('inv-123')

  // 模擬 notifiable
  const customer: Notifiable = {
    getNotifiableId: () => 'customer-456',
    getNotifiableType: () => 'customer',
  }

  // 2. 載入資料
  const data = await notification.loadData(customer)
  notification.setCached(data)

  // 3. 使用資料生成通知
  const mail = notification.toMail(customer)
  console.log('郵件主旨:', mail.subject)
  console.log('收件人:', mail.to)

  // 4. 序列化通知（用於佇列）
  const serialized = {
    __lazyId: notification.getInvoiceId(),
    __type: 'InvoicePaidNotification',
  }
  console.log('序列化後的通知:', serialized)

  // 注意：序列化後的通知不包含快取的發票資料
  // Worker 端需要重新載入資料
}

/**
 * 使用 ensureLoaded 的進階範例
 */
class SmartInvoiceNotification extends LazyNotification<{ invoice: any }> {
  constructor(private invoiceId: string) {
    super()
  }

  protected async loadData(): Promise<{ invoice: any }> {
    const invoice = database.invoices.get(this.invoiceId)
    if (!invoice) {
      throw new Error('Invoice not found')
    }
    return { invoice }
  }

  via(): string[] {
    return ['mail']
  }

  /**
   * 使用 ensureLoaded 自動載入資料（如果尚未載入）
   */
  async toMailSafe(notifiable: Notifiable): Promise<MailMessage> {
    // ensureLoaded 會自動檢查快取，如果沒有快取則載入
    const data = await this.ensureLoaded(notifiable)

    return {
      subject: `發票 ${data.invoice.number}`,
      to: data.invoice.customerEmail,
      text: `金額: ${data.invoice.amount}`,
    }
  }
}

// 執行範例
if (require.main === module) {
  example().catch(console.error)
}
