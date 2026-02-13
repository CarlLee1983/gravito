/**
 * 用戶建立事件
 * 當新用戶成功註冊時發送
 */
import { Event } from '@gravito/core'

export interface UserCreatedPayload {
  userId: string
  email: string
  name: string
  role: string
  createdAt: Date
}

export class UserCreated extends Event {
  readonly eventName = 'user:created'

  constructor(public readonly payload: UserCreatedPayload) {
    super()
  }
}
