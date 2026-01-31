/**
 * AbortController 測試
 *
 * 測試 TimeoutChannel 的 AbortController 支援，包括：
 * - Timeout 取消功能
 * - 外部 AbortSignal 支援
 * - Cleanup 行為
 * - 錯誤處理
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbortError, TimeoutChannel, TimeoutError } from '../src/channels/TimeoutChannel'
import { Notification } from '../src/Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../src/types'

// Mock Notification
class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['test']
  }
}

// Mock Notifiable
const mockNotifiable: Notifiable = {
  getNotifiableId: () => 1,
  getNotifiableType: () => 'user',
}

describe('AbortController Support', () => {
  let mockChannel: NotificationChannel
  let notification: TestNotification

  beforeEach(() => {
    notification = new TestNotification()
  })

  describe('TimeoutChannel with AbortController', () => {
    it('應該在 timeout 時 abort 底層請求', async () => {
      const sendSpy = vi.fn()
      let receivedSignal: AbortSignal | undefined

      mockChannel = {
        send: vi.fn(async (_n, _notifiable, options?: AbortableSendOptions) => {
          receivedSignal = options?.signal

          // 模擬 fetch 行為：檢查 signal 並在 abort 時拋出錯誤
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              sendSpy()
              resolve()
            }, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('The operation was aborted'))
            })
          })
        }),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 50, // 50ms timeout
      })

      await expect(timeoutChannel.send(notification, mockNotifiable)).rejects.toThrow(TimeoutError)

      // 驗證 signal 被傳遞且被 abort
      expect(receivedSignal).toBeDefined()
      expect(receivedSignal?.aborted).toBe(true)

      // 由於 timeout，send 不應該被呼叫
      expect(sendSpy).not.toHaveBeenCalled()
    })

    it('應該在成功完成時 cleanup timeout', async () => {
      mockChannel = {
        send: vi.fn(async () => {
          // 快速完成
          await new Promise((resolve) => setTimeout(resolve, 10))
        }),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 100,
      })

      await timeoutChannel.send(notification, mockNotifiable)

      expect(mockChannel.send).toHaveBeenCalled()
    })

    it('應該呼叫 onTimeout 回調', async () => {
      const onTimeoutSpy = vi.fn()

      mockChannel = {
        send: vi.fn(async (_n, _notifiable, options?: AbortableSendOptions) => {
          // 模擬 fetch 行為
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('The operation was aborted'))
            })
          })
        }),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 50,
        onTimeout: onTimeoutSpy,
      })

      await expect(timeoutChannel.send(notification, mockNotifiable)).rejects.toThrow(TimeoutError)

      expect(onTimeoutSpy).toHaveBeenCalledWith('Object', notification)
    })

    it('應該在 timeout <= 0 時立即拋出錯誤', async () => {
      mockChannel = {
        send: vi.fn(),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 0,
      })

      await expect(timeoutChannel.send(notification, mockNotifiable)).rejects.toThrow(TimeoutError)

      // send 不應該被呼叫
      expect(mockChannel.send).not.toHaveBeenCalled()
    })
  })

  describe('External AbortSignal Support', () => {
    it('應該支援外部 AbortSignal', async () => {
      const controller = new AbortController()

      mockChannel = {
        send: vi.fn(async (_n, _notifiable, options?: AbortableSendOptions) => {
          // 檢查 signal
          expect(options?.signal).toBeDefined()

          // 模擬 fetch 行為
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('The operation was aborted'))
            })
          })
        }),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 1000, // 長 timeout，應該由外部 signal 取消
      })

      // 50ms 後取消
      setTimeout(() => controller.abort(), 50)

      await expect(
        timeoutChannel.send(notification, mockNotifiable, { signal: controller.signal })
      ).rejects.toThrow(AbortError)
    })

    it('應該在外部 signal 已 aborted 時立即拋出錯誤', async () => {
      const controller = new AbortController()
      controller.abort() // 提前 abort

      mockChannel = {
        send: vi.fn(),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 1000,
      })

      await expect(
        timeoutChannel.send(notification, mockNotifiable, { signal: controller.signal })
      ).rejects.toThrow(AbortError)

      // send 不應該被呼叫
      expect(mockChannel.send).not.toHaveBeenCalled()
    })

    it('應該正確區分 timeout 和外部 abort', async () => {
      // Test timeout error
      mockChannel = {
        send: vi.fn(async (_n, _notifiable, options?: AbortableSendOptions) => {
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('The operation was aborted'))
            })
          })
        }),
      }

      const timeoutChannel1 = new TimeoutChannel(mockChannel, {
        timeout: 50,
      })

      await expect(timeoutChannel1.send(notification, mockNotifiable)).rejects.toThrow(TimeoutError)

      // Test external abort error
      const controller = new AbortController()

      mockChannel = {
        send: vi.fn(async (_n, _notifiable, options?: AbortableSendOptions) => {
          return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('The operation was aborted'))
            })
          })
        }),
      }

      const timeoutChannel2 = new TimeoutChannel(mockChannel, {
        timeout: 1000,
      })

      setTimeout(() => controller.abort(), 50)

      await expect(
        timeoutChannel2.send(notification, mockNotifiable, { signal: controller.signal })
      ).rejects.toThrow(AbortError)
    })

    it('應該在底層請求拋出其他錯誤時正確傳遞', async () => {
      const customError = new Error('Network error')

      mockChannel = {
        send: vi.fn(async () => {
          throw customError
        }),
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 1000,
      })

      await expect(timeoutChannel.send(notification, mockNotifiable)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('Integration with Fetch-based Channels', () => {
    it('應該取消真正的 fetch 請求', async () => {
      let fetchAborted = false

      // Mock channel that simulates fetch behavior
      mockChannel = {
        send: async (_n, _notifiable, options?: AbortableSendOptions) => {
          // 模擬 fetch with signal
          const promise = new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 200)

            options?.signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              fetchAborted = true
              reject(new Error('Request aborted'))
            })
          })

          await promise
        },
      }

      const timeoutChannel = new TimeoutChannel(mockChannel, {
        timeout: 50,
      })

      await expect(timeoutChannel.send(notification, mockNotifiable)).rejects.toThrow()

      // 驗證 fetch 被真正取消
      expect(fetchAborted).toBe(true)
    })
  })
})
