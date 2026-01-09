import { Entity } from '@gravito/enterprise'

export type ConversationContextType = 'ORDER' | 'PRODUCT' | 'FORM' | 'GENERAL'

export interface ConversationProps {
  participantId: string // 顧客 ID
  subject?: string // 主旨 (如：來自聯繫表單)
  contextType: ConversationContextType
  contextId?: string // 關聯 ID (如：OrderId)
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
  lastMessageAt: Date
  createdAt: Date
}

export class Conversation extends Entity<string> {
  private _props: ConversationProps

  constructor(props: ConversationProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  static start(
    participantId: string,
    context: { type: ConversationContextType; id?: string; subject?: string }
  ) {
    return new Conversation({
      participantId,
      subject: context.subject,
      contextType: context.type,
      contextId: context.id,
      status: 'PENDING',
      lastMessageAt: new Date(),
      createdAt: new Date(),
    })
  }

  unpack() {
    return { ...this._props }
  }
}
