import { describe, expect, it, jest } from 'bun:test'
import { MailChannel } from '../src/channels/MailChannel'
import { Notification } from '../src/Notification'
import type { Notifiable } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

// 測試用的 Notification
class MailNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail() {
    return {
      subject: 'Test Subject',
      to: 'test@example.com',
      text: 'Test message',
    }
  }
}

describe('MailChannel with Timeout', () => {
  it('應該支援 timeout 配置選項', () => {
    const mockMailService = {
      send: jest.fn(() => Promise.resolve()),
    }

    const channel = new MailChannel(mockMailService, {
      timeout: 5000,
    })

    expect(channel).toBeDefined()
  })

  it('預設 timeout 應該是 30000ms', () => {
    const mockMailService = {
      send: jest.fn(() => Promise.resolve()),
    }

    const channel = new MailChannel(mockMailService)

    expect(channel).toBeDefined()
  })

  it('當郵件發送超時時應該拋出 TimeoutError', async () => {
    const mockMailService = {
      send: jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 5000) // 5 秒延遲
          })
      ),
    }

    const channel = new MailChannel(mockMailService, {
      timeout: 100, // 100ms timeout
    })

    await expect(channel.send(new MailNotification(), notifiable)).rejects.toThrow('timeout')
  })

  it('當郵件發送在 timeout 前完成時應該成功', async () => {
    const mockMailService = {
      send: jest.fn(() => Promise.resolve()),
    }

    const channel = new MailChannel(mockMailService, {
      timeout: 5000, // 5 秒 timeout
    })

    await expect(channel.send(new MailNotification(), notifiable)).resolves.toBeUndefined()

    expect(mockMailService.send).toHaveBeenCalledWith({
      subject: 'Test Subject',
      to: 'test@example.com',
      text: 'Test message',
    })
  })

  it('應該支援 onTimeout 回調', async () => {
    const onTimeout = jest.fn()

    const mockMailService = {
      send: jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 5000)
          })
      ),
    }

    const channel = new MailChannel(mockMailService, {
      timeout: 100,
      onTimeout,
    })

    await expect(channel.send(new MailNotification(), notifiable)).rejects.toThrow()

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('應該傳遞郵件服務的錯誤', async () => {
    const mockMailService = {
      send: jest.fn(() => Promise.reject(new Error('Mail service error'))),
    }

    const channel = new MailChannel(mockMailService, {
      timeout: 5000,
    })

    await expect(channel.send(new MailNotification(), notifiable)).rejects.toThrow(
      'Mail service error'
    )
  })
})
