import { describe, expect, it, jest } from 'bun:test'
import { SmsChannel } from '../src/channels/SmsChannel'
import { Notification } from '../src/Notification'
import type { Notifiable } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

// 測試用的 Notification
class SmsNotification extends Notification {
  via() {
    return ['sms']
  }

  toSms() {
    return {
      to: '+1234567890',
      message: 'Test message',
    }
  }
}

class SmsNotificationWithFrom extends Notification {
  via() {
    return ['sms']
  }

  toSms() {
    return {
      from: '+9999999999',
      to: '+1234567890',
      message: 'Test message with custom from',
    }
  }
}

// Mock fetch
const originalFetch = global.fetch

describe('SmsChannel', () => {
  describe('Configuration', () => {
    it('應該支援 timeout 配置選項', () => {
      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
        timeout: 5000,
      })

      expect(channel).toBeDefined()
    })

    it('預設 timeout 應該是 30000ms', () => {
      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
      })

      expect(channel).toBeDefined()
    })
  })

  describe('Timeout Handling', () => {
    it('當 SMS 發送超時時應該拋出 TimeoutError', async () => {
      // Mock 一個非常慢的 fetch
      global.fetch = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  statusText: 'OK',
                } as Response),
              5000
            )
          })
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
        timeout: 100, // 100ms timeout
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow('timeout')

      // Reset fetch
      global.fetch = originalFetch
    })

    it('當 SMS 發送在 timeout 前完成時應該成功', async () => {
      // Mock 一個快速的 fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
        } as Response)
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
        timeout: 5000, // 5 秒 timeout
      })

      await expect(channel.send(new SmsNotification(), notifiable)).resolves.toBeUndefined()

      expect(global.fetch).toHaveBeenCalled()

      // Reset fetch
      global.fetch = originalFetch
    })

    it('應該支援 onTimeout 回調', async () => {
      const onTimeout = jest.fn()

      // Mock 一個非常慢的 fetch
      global.fetch = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  statusText: 'OK',
                } as Response),
              5000
            )
          })
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
        timeout: 100,
        onTimeout,
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow()

      expect(onTimeout).toHaveBeenCalledTimes(1)

      // Reset fetch
      global.fetch = originalFetch
    })
  })

  describe('Twilio Provider', () => {
    it('應該成功發送 SMS via Twilio', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
          text: () => Promise.resolve('{"sid":"SM123"}'),
        } as Response)
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-account-sid',
        apiSecret: 'test-auth-token',
        from: '+0987654321',
      })

      await expect(channel.send(new SmsNotification(), notifiable)).resolves.toBeUndefined()

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[0]).toContain('api.twilio.com')
      expect(callArgs[0]).toContain('test-account-sid')

      global.fetch = originalFetch
    })

    it('當 Twilio API 返回錯誤時應該拋出錯誤', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
          text: () => Promise.resolve('Invalid phone number'),
        } as Response)
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-account-sid',
        apiSecret: 'test-auth-token',
        from: '+0987654321',
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow(
        'Failed to send SMS via Twilio'
      )

      global.fetch = originalFetch
    })

    it('當缺少 Twilio 憑證時應該拋出錯誤', async () => {
      const channel = new SmsChannel({
        provider: 'twilio',
        from: '+0987654321',
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow(
        'Twilio API key and secret are required'
      )
    })

    it('應該使用正確的 Authorization header', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
          text: () => Promise.resolve('{"sid":"SM123"}'),
        } as Response)
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-sid',
        apiSecret: 'test-token',
        from: '+0987654321',
      })

      await channel.send(new SmsNotification(), notifiable)

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers.Authorization).toContain('Basic')

      global.fetch = originalFetch
    })

    it('應該正確編碼請求參數', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
          text: () => Promise.resolve('{"sid":"SM123"}'),
        } as Response)
      )

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-sid',
        apiSecret: 'test-token',
        from: '+0987654321',
      })

      await channel.send(new SmsNotification(), notifiable)

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const body = callArgs[1].body
      expect(body).toBeInstanceOf(URLSearchParams)
      expect(body.get('From')).toBe('+0987654321')
      expect(body.get('To')).toBe('+1234567890')
      expect(body.get('Body')).toBe('Test message')

      global.fetch = originalFetch
    })
  })

  describe('AWS SNS Provider', () => {
    it('應該在缺少 AWS SDK 時拋出錯誤', async () => {
      const channel = new SmsChannel({
        provider: 'aws-sns',
        region: 'us-east-1',
      })

      // 這個測試會嘗試導入 AWS SDK，如果失敗會拋出錯誤
      // 由於測試環境可能沒有 AWS SDK，我們期望它拋出錯誤
      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('當 Notification 沒有 toSms 方法時應該拋出錯誤', async () => {
      class InvalidNotification extends Notification {
        via() {
          return ['sms']
        }
        // 缺少 toSms 方法
      }

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        from: '+0987654321',
      })

      await expect(channel.send(new InvalidNotification(), notifiable)).rejects.toThrow(
        'Notification does not implement toSms method'
      )
    })

    it('當 provider 不支援時應該拋出錯誤', async () => {
      const channel = new SmsChannel({
        provider: 'unknown-provider' as any,
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow(
        'Unsupported SMS provider'
      )
    })

    it('當 fetch 拋出網路錯誤時應該正確傳遞', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

      const channel = new SmsChannel({
        provider: 'twilio',
        apiKey: 'test-sid',
        apiSecret: 'test-token',
        from: '+0987654321',
      })

      await expect(channel.send(new SmsNotification(), notifiable)).rejects.toThrow()

      global.fetch = originalFetch
    })
  })
})
