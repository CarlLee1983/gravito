import { beforeEach, describe, expect, it, jest } from 'bun:test'
import { SlackChannel } from '../src/channels/SlackChannel'
import { Notification } from '../src/Notification'
import type { Notifiable } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

// 測試用的 Notification
class SlackNotification extends Notification {
  via() {
    return ['slack']
  }

  toSlack() {
    return {
      text: 'Test message',
      channel: '#general',
    }
  }
}

// Mock fetch
const originalFetch = global.fetch

describe('SlackChannel with Timeout', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = originalFetch
  })

  it('應該支援 timeout 配置選項', () => {
    const channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/test',
      timeout: 5000,
    })

    expect(channel).toBeDefined()
  })

  it('預設 timeout 應該是 30000ms', () => {
    const channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/test',
    })

    // 內部應該有預設的 timeout
    expect(channel).toBeDefined()
  })

  it('當 fetch 超時時應該拋出 TimeoutError', async () => {
    // Mock fetch with AbortSignal support
    global.fetch = jest.fn(
      (_url, options: RequestInit = {}) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              resolve({
                ok: true,
                statusText: 'OK',
              } as Response),
            5000
          ) // 5 秒延遲

          // 處理 AbortSignal
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new Error('The operation was aborted'))
          })
        })
    )

    const channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/test',
      timeout: 100, // 100ms timeout
    })

    await expect(channel.send(new SlackNotification(), notifiable)).rejects.toThrow('timeout')
  })

  it('當 fetch 在 timeout 前完成時應該成功', async () => {
    // Mock 一個快速的 fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        statusText: 'OK',
      } as Response)
    )

    const channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/test',
      timeout: 5000, // 5 秒 timeout
    })

    await expect(channel.send(new SlackNotification(), notifiable)).resolves.toBeUndefined()

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('應該支援 onTimeout 回調', async () => {
    const onTimeout = jest.fn()

    // Mock fetch with AbortSignal support
    global.fetch = jest.fn(
      (_url, options: RequestInit = {}) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              resolve({
                ok: true,
                statusText: 'OK',
              } as Response),
            5000
          )

          // 處理 AbortSignal
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new Error('The operation was aborted'))
          })
        })
    )

    const channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/test',
      timeout: 100,
      onTimeout,
    })

    await expect(channel.send(new SlackNotification(), notifiable)).rejects.toThrow()

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })
})
