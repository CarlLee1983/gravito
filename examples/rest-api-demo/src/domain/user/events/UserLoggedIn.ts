/**
 * 用戶登入事件
 * 當用戶成功登入時發送
 */
import { Event } from '@gravito/core'

export interface UserLoggedInPayload {
  userId: string
  email: string
  loginAt: Date
  ipAddress?: string
  userAgent?: string
}

export class UserLoggedIn extends Event {
  readonly eventName = 'user:logged_in'

  constructor(public readonly payload: UserLoggedInPayload) {
    super()
  }
}
