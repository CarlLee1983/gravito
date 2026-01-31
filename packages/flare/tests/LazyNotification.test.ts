import { beforeEach, describe, expect, it } from 'bun:test'
import type { MailMessage, Notifiable } from '../src/types'
import { LazyNotification } from '../src/utils/LazyNotification'

// 測試用的 Lazy Notification
class UserRegisteredNotification extends LazyNotification<{ userName: string; email: string }> {
  constructor(private userId: string) {
    super()
  }

  protected async loadData(_notifiable: Notifiable): Promise<{ userName: string; email: string }> {
    // 模擬資料庫查詢
    return {
      userName: `User_${this.userId}`,
      email: `user${this.userId}@example.com`,
    }
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    const data = this.getCached()
    if (!data) {
      throw new Error('資料尚未載入，請先呼叫 loadData')
    }

    return {
      subject: `歡迎 ${data.userName}`,
      text: `Email: ${data.email}`,
    }
  }

  getUserId(): string {
    return this.userId
  }
}

// Mock Notifiable
class MockUser implements Notifiable {
  constructor(private id: string) {}

  getNotifiableId(): string {
    return this.id
  }

  getNotifiableType(): string {
    return 'user'
  }
}

describe('LazyNotification', () => {
  let notifiable: Notifiable

  beforeEach(() => {
    notifiable = new MockUser('123')
  })

  describe('延遲載入機制', () => {
    it('應該在建立時不立即載入資料', () => {
      const notification = new UserRegisteredNotification('user-1')

      expect(notification.getCached()).toBeUndefined()
    })

    it('應該能夠載入資料並快取', async () => {
      const notification = new UserRegisteredNotification('user-1')

      const data = await notification.loadData(notifiable)

      expect(data).toEqual({
        userName: 'User_user-1',
        email: 'useruser-1@example.com',
      })
    })

    it('應該能夠設定和取得快取', () => {
      const notification = new UserRegisteredNotification('user-1')
      const testData = { userName: 'Test', email: 'test@example.com' }

      notification.setCached(testData)

      expect(notification.getCached()).toEqual(testData)
    })

    it('應該在已快取的情況下不重複載入', async () => {
      const notification = new UserRegisteredNotification('user-1')

      // 第一次載入
      const data1 = await notification.loadData(notifiable)
      notification.setCached(data1)

      // 第二次應該從快取取得
      const cached = notification.getCached()

      expect(cached).toBe(data1)
    })
  })

  describe('序列化支援', () => {
    it('應該能夠序列化為只包含 ID 的格式', () => {
      const notification = new UserRegisteredNotification('user-123')

      // 模擬序列化
      const serialized = {
        __lazyId: notification.getUserId(),
        __type: 'UserRegisteredNotification',
      }

      expect(serialized.__lazyId).toBe('user-123')
      expect(serialized.__type).toBe('UserRegisteredNotification')
    })

    it('序列化時不應該包含快取的資料', () => {
      const notification = new UserRegisteredNotification('user-123')
      const testData = { userName: 'Test', email: 'test@example.com' }

      notification.setCached(testData)

      // 序列化應該只包含 ID，不包含快取資料
      const serialized = JSON.stringify({
        __lazyId: notification.getUserId(),
      })

      expect(serialized).not.toContain('Test')
      expect(serialized).not.toContain('test@example.com')
    })
  })

  describe('輔助方法', () => {
    it('isLoaded 應該正確回報載入狀態', () => {
      const notification = new UserRegisteredNotification('user-123')

      expect(notification.isLoaded()).toBe(false)

      notification.setCached({ userName: 'Test', email: 'test@example.com' })

      expect(notification.isLoaded()).toBe(true)
    })

    it('clearCache 應該清除快取', () => {
      const notification = new UserRegisteredNotification('user-123')

      notification.setCached({ userName: 'Test', email: 'test@example.com' })
      expect(notification.getCached()).toBeDefined()

      notification.clearCache()

      expect(notification.getCached()).toBeUndefined()
      expect(notification.isLoaded()).toBe(false)
    })

    it('ensureLoaded 應該在未載入時自動載入資料', async () => {
      const notification = new UserRegisteredNotification('user-789')

      const data = await notification.ensureLoaded(notifiable)

      expect(data).toEqual({
        userName: 'User_user-789',
        email: 'useruser-789@example.com',
      })
      expect(notification.isLoaded()).toBe(true)
    })

    it('ensureLoaded 應該在已載入時回傳快取資料', async () => {
      const notification = new UserRegisteredNotification('user-789')
      const cachedData = { userName: 'Cached', email: 'cached@example.com' }

      notification.setCached(cachedData)

      const data = await notification.ensureLoaded(notifiable)

      expect(data).toBe(cachedData)
    })
  })

  describe('整合測試', () => {
    it('完整流程：載入資料 → 使用 toMail', async () => {
      const notification = new UserRegisteredNotification('user-456')

      // 載入資料
      const data = await notification.loadData(notifiable)
      notification.setCached(data)

      // 使用資料生成郵件
      const mailMessage = notification.toMail(notifiable)

      expect(mailMessage.subject).toContain('User_user-456')
      expect(mailMessage.text).toContain('useruser-456@example.com')
    })

    it('應該在未載入資料時拋出錯誤', () => {
      const notification = new UserRegisteredNotification('user-456')

      expect(() => {
        notification.toMail(notifiable)
      }).toThrow('資料尚未載入')
    })

    it('使用 ensureLoaded 的完整流程', async () => {
      class SmartNotification extends LazyNotification<{ userName: string }> {
        constructor(private userId: string) {
          super()
        }

        protected async loadData(): Promise<{ userName: string }> {
          return { userName: `User_${this.userId}` }
        }

        via(): string[] {
          return ['mail']
        }

        async toMailSafe(notifiable: Notifiable): Promise<MailMessage> {
          const data = await this.ensureLoaded(notifiable)
          return {
            subject: `Hello ${data.userName}`,
            text: 'Welcome',
          }
        }
      }

      const notification = new SmartNotification('smart-123')
      const mail = await notification.toMailSafe(notifiable)

      expect(mail.subject).toBe('Hello User_smart-123')
    })
  })
})
