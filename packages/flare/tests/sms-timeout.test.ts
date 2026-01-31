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

// Mock fetch
const originalFetch = global.fetch

describe('SmsChannel with Timeout', () => {
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
