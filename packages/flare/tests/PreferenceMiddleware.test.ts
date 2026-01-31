import { describe, expect, it } from 'bun:test'
import { PreferenceMiddleware } from '../src/middleware/PreferenceMiddleware'
import { Notification } from '../src/Notification'
import type { Notifiable, NotificationPreference } from '../src/types'

// 測試用 Notifiable
const createNotifiable = (overrides: Partial<Notifiable> = {}): Notifiable => ({
  getNotifiableId: () => 'user-123',
  getNotifiableType: () => 'user',
  ...overrides,
})

// 測試用 Notification
class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms', 'slack']
  }
}

class WelcomeNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'database']
  }
}

describe('PreferenceMiddleware', () => {
  describe('基本功能', () => {
    it('應該創建 PreferenceMiddleware 實例', () => {
      const middleware = new PreferenceMiddleware()
      expect(middleware).toBeDefined()
      expect(middleware.name).toBe('preference')
    })

    it('沒有偏好設定時，應該允許所有通道', async () => {
      const middleware = new PreferenceMiddleware()
      const notifiable = createNotifiable()
      const notification = new TestNotification()

      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    it('應該接受自定義 NotificationPreference 提供者', () => {
      const customProvider: NotificationPreference = {
        getUserPreferences: async () => ({
          enabledChannels: ['email'],
          disabledChannels: [],
          disabledNotifications: [],
        }),
      }

      const middleware = new PreferenceMiddleware(customProvider)
      expect(middleware).toBeDefined()
    })
  })

  describe('禁用通道過濾', () => {
    it('用戶禁用通道時，該通道的通知被跳過', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledChannels: ['sms'],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該通過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      // SMS 應該被跳過
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)
    })

    it('應該支援禁用多個通道', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledChannels: ['sms', 'slack'],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該通過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      // SMS 應該被跳過
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)

      // Slack 應該被跳過
      let slackCalled = false
      await middleware.handle(notification, notifiable, 'slack', async () => {
        slackCalled = true
      })
      expect(slackCalled).toBe(false)
    })
  })

  describe('啟用通道過濾', () => {
    it('用戶啟用特定通道時，只有啟用的通道收到通知', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該通過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      // SMS 應該被跳過（不在 enabledChannels 中）
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)
    })

    it('應該支援多個啟用通道', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email', 'slack'],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該通過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      // Slack 應該通過
      let slackCalled = false
      await middleware.handle(notification, notifiable, 'slack', async () => {
        slackCalled = true
      })
      expect(slackCalled).toBe(true)

      // SMS 應該被跳過
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)
    })
  })

  describe('優先級規則', () => {
    it('disabledChannels 應該優先於 enabledChannels', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email', 'sms'],
          disabledChannels: ['sms'], // SMS 同時在啟用和禁用列表中
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該通過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      // SMS 應該被跳過（disabledChannels 優先）
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)
    })

    it('當同一通道同時在 enabled 和 disabled 列表時，應該被禁用', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'],
          disabledChannels: ['email'],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // Email 應該被跳過
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(false)
    })
  })

  describe('禁用特定通知類型', () => {
    it('用戶禁用特定通知類型時，該類型通知被跳過', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledNotifications: ['TestNotification'],
        }),
      })

      const middleware = new PreferenceMiddleware()

      // TestNotification 應該被跳過
      let testNotificationCalled = false
      await middleware.handle(new TestNotification(), notifiable, 'email', async () => {
        testNotificationCalled = true
      })
      expect(testNotificationCalled).toBe(false)

      // WelcomeNotification 應該通過
      let welcomeNotificationCalled = false
      await middleware.handle(new WelcomeNotification(), notifiable, 'email', async () => {
        welcomeNotificationCalled = true
      })
      expect(welcomeNotificationCalled).toBe(true)
    })

    it('應該支援禁用多個通知類型', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledNotifications: ['TestNotification', 'WelcomeNotification'],
        }),
      })

      const middleware = new PreferenceMiddleware()

      // TestNotification 應該被跳過
      let testCalled = false
      await middleware.handle(new TestNotification(), notifiable, 'email', async () => {
        testCalled = true
      })
      expect(testCalled).toBe(false)

      // WelcomeNotification 應該被跳過
      let welcomeCalled = false
      await middleware.handle(new WelcomeNotification(), notifiable, 'email', async () => {
        welcomeCalled = true
      })
      expect(welcomeCalled).toBe(false)
    })

    it('通知類型過濾應該優先於通道過濾', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'], // Email 啟用
          disabledNotifications: ['TestNotification'], // 但 TestNotification 被禁用
        }),
      })

      const middleware = new PreferenceMiddleware()

      // TestNotification 應該被跳過（即使 email 是啟用的）
      let testCalled = false
      await middleware.handle(new TestNotification(), notifiable, 'email', async () => {
        testCalled = true
      })
      expect(testCalled).toBe(false)
    })
  })

  describe('使用自定義 NotificationPreference 提供者', () => {
    it('應該使用自定義提供者獲取偏好', async () => {
      const customProvider: NotificationPreference = {
        getUserPreferences: async (notifiable) => {
          // 根據用戶 ID 返回不同的偏好
          if (notifiable.getNotifiableId() === 'vip-user') {
            return {
              enabledChannels: ['email', 'sms', 'slack'],
              disabledChannels: [],
              disabledNotifications: [],
            }
          }
          return {
            enabledChannels: ['email'],
            disabledChannels: [],
            disabledNotifications: [],
          }
        },
      }

      const middleware = new PreferenceMiddleware(customProvider)

      // 普通用戶只能用 email
      const normalUser = createNotifiable({
        getNotifiableId: () => 'normal-user',
      })
      let smsCalled = false
      await middleware.handle(new TestNotification(), normalUser, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)

      // VIP 用戶可以用 SMS
      const vipUser = createNotifiable({
        getNotifiableId: () => 'vip-user',
      })
      let vipSmsCalled = false
      await middleware.handle(new TestNotification(), vipUser, 'sms', async () => {
        vipSmsCalled = true
      })
      expect(vipSmsCalled).toBe(true)
    })
  })

  describe('錯誤處理與容錯', () => {
    it('偏好載入失敗時，應該記錄錯誤並允許通知發送', async () => {
      const errorProvider: NotificationPreference = {
        getUserPreferences: async () => {
          throw new Error('Database connection failed')
        },
      }

      const middleware = new PreferenceMiddleware(errorProvider)
      const notifiable = createNotifiable()
      const notification = new TestNotification()

      // 應該容錯，允許發送
      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    it('getNotificationPreferences 拋出錯誤時，應該容錯', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => {
          throw new Error('User preferences corrupted')
        },
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // 應該容錯，允許發送
      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    it('偏好格式錯誤時，應該容錯', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => {
          // 返回錯誤格式
          return null as any
        },
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      // 應該容錯，允許發送
      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })
  })

  describe('組合偏好來源', () => {
    it('應該優先使用 Notifiable 上的 getNotificationPreferences', async () => {
      const customProvider: NotificationPreference = {
        getUserPreferences: async () => ({
          enabledChannels: ['email'],
          disabledChannels: [],
          disabledNotifications: [],
        }),
      }

      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['sms'], // 不同於 customProvider
        }),
      })

      const middleware = new PreferenceMiddleware(customProvider)
      const notification = new TestNotification()

      // 應該使用 Notifiable 的偏好（sms 啟用）
      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(true)

      // Email 應該被跳過（Notifiable 只啟用了 sms）
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(false)
    })

    it('Notifiable 沒有 getNotificationPreferences 時，使用自定義提供者', async () => {
      const customProvider: NotificationPreference = {
        getUserPreferences: async () => ({
          enabledChannels: ['email'],
          disabledChannels: [],
          disabledNotifications: [],
        }),
      }

      const notifiable = createNotifiable() // 沒有 getNotificationPreferences

      const middleware = new PreferenceMiddleware(customProvider)
      const notification = new TestNotification()

      // 應該使用 customProvider 的偏好
      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)

      let smsCalled = false
      await middleware.handle(notification, notifiable, 'sms', async () => {
        smsCalled = true
      })
      expect(smsCalled).toBe(false)
    })
  })

  describe('邊界情況', () => {
    it('enabledChannels 為空陣列時，應該拒絕所有通道', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: [],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(false)
    })

    it('disabledChannels 為空陣列時，不應該影響其他規則', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'],
          disabledChannels: [],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      let emailCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        emailCalled = true
      })
      expect(emailCalled).toBe(true)
    })

    it('disabledNotifications 為空陣列時，不應該影響通知發送', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledNotifications: [],
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })
      expect(nextCalled).toBe(true)
    })

    it('所有偏好設定都為 undefined 時，應該允許所有通道', async () => {
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: undefined,
          disabledChannels: undefined,
        }),
      })

      const middleware = new PreferenceMiddleware()
      const notification = new TestNotification()

      let nextCalled = false
      await middleware.handle(notification, notifiable, 'email', async () => {
        nextCalled = true
      })
      expect(nextCalled).toBe(true)
    })
  })
})
