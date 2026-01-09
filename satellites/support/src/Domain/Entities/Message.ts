import { Entity } from '@gravito/enterprise'

export interface MessageProps {
  conversationId: string
  sender: 'CUSTOMER' | 'SUPPORT'
  type: 'TEXT' | 'IMAGE' | 'CARD'
  content: string
  metadata?: any // 儲存結構化數據 (如：表單欄位、訂單卡片詳情)
  createdAt: Date
}

export class Message extends Entity<string> {
  private _props: MessageProps

  constructor(props: MessageProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  static create(props: Omit<MessageProps, 'createdAt'>) {
    return new Message({
      ...props,
      createdAt: new Date(),
    })
  }

  unpack() {
    return { ...this._props }
  }
}
