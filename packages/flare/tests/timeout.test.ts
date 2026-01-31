import { describe, expect, it, jest } from 'bun:test'
import { TimeoutChannel } from '../src/channels/TimeoutChannel'
import { Notification } from '../src/Notification'
import type { AbortableSendOptions, Notifiable, NotificationChannel } from '../src/types'

// Mock Notifiable
const notifiable: Notifiable = {
  getNotifiableId: () => 'user-1',
}

// 測試用的 Notification
class TestNotification extends Notification {
  via() {
    return ['test']
  }
}

// Mock Channel with AbortSignal support
class MockChannel implements NotificationChannel {
  constructor(public delay = 0) {}

  async send(
    _notification: Notification,
    _notifiable: Notifiable,
    options?: AbortableSendOptions
  ): Promise<void> {
    if (this.delay > 0) {
      // 模擬 fetch 行為：檢查 AbortSignal
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delay)

        options?.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('The operation was aborted'))
        })
      })
    }
  }
}

describe('TimeoutChannel', () => {
  describe('基本功能', () => {
    it('應該在指定時間內成功執行', async () => {
      const innerChannel = new MockChannel(50) // 50ms 延遲
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 200, // 200ms timeout
      })

      // 不應該拋出錯誤
      await expect(timeoutChannel.send(new TestNotification(), notifiable)).resolves.toBeUndefined()
    })

    it('應該在超時時拋出 TimeoutError', async () => {
      const innerChannel = new MockChannel(300) // 300ms 延遲
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 100, // 100ms timeout
      })

      // 應該拋出 TimeoutError
      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        'Notification send timeout'
      )
    })

    it('應該在超時時拋出包含 channel 名稱的錯誤', async () => {
      const innerChannel = new MockChannel(300)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 100,
      })

      try {
        await timeoutChannel.send(new TestNotification(), notifiable)
        expect(false).toBe(true) // 不應該執行到這裡
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('timeout')
      }
    })
  })

  describe('onTimeout 回調', () => {
    it('應該在超時時呼叫 onTimeout 回調', async () => {
      const onTimeout = jest.fn()
      const innerChannel = new MockChannel(300)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 100,
        onTimeout,
      })

      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow()

      expect(onTimeout).toHaveBeenCalledTimes(1)
      expect(onTimeout).toHaveBeenCalledWith(expect.any(String), expect.any(TestNotification))
    })

    it('不應該在成功時呼叫 onTimeout 回調', async () => {
      const onTimeout = jest.fn()
      const innerChannel = new MockChannel(50)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 200,
        onTimeout,
      })

      await timeoutChannel.send(new TestNotification(), notifiable)

      expect(onTimeout).not.toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應該傳遞內部 channel 的錯誤', async () => {
      const errorMessage = 'Network error'
      const failingChannel: NotificationChannel = {
        send: async () => {
          throw new Error(errorMessage)
        },
      }

      const timeoutChannel = new TimeoutChannel(failingChannel, {
        timeout: 1000,
      })

      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        errorMessage
      )
    })

    it('應該優先拋出內部錯誤而非超時錯誤（如果內部錯誤先發生）', async () => {
      const errorMessage = 'Immediate error'
      const failingChannel: NotificationChannel = {
        send: async () => {
          throw new Error(errorMessage)
        },
      }

      const timeoutChannel = new TimeoutChannel(failingChannel, {
        timeout: 1000,
      })

      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        errorMessage
      )
    })
  })

  describe('並發處理', () => {
    it('多個並發請求的 timeout 應該互不干擾', async () => {
      const innerChannel = new MockChannel(150)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 200,
      })

      // 啟動 3 個並發請求
      const promises = [
        timeoutChannel.send(new TestNotification(), notifiable),
        timeoutChannel.send(new TestNotification(), notifiable),
        timeoutChannel.send(new TestNotification(), notifiable),
      ]

      // 全部應該成功
      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('不同 timeout 設定的 channel 應該獨立運作', async () => {
      const innerChannel1 = new MockChannel(150)
      const innerChannel2 = new MockChannel(150)

      const fastTimeoutChannel = new TimeoutChannel(innerChannel1, {
        timeout: 100, // 會超時
      })

      const slowTimeoutChannel = new TimeoutChannel(innerChannel2, {
        timeout: 300, // 不會超時
      })

      // 第一個應該超時
      await expect(fastTimeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        'timeout'
      )

      // 第二個應該成功
      await expect(
        slowTimeoutChannel.send(new TestNotification(), notifiable)
      ).resolves.toBeUndefined()
    })
  })

  describe('邊界條件', () => {
    it('應該處理 timeout = 0 的情況', async () => {
      const innerChannel = new MockChannel(0)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 0,
      })

      // timeout = 0 應該立即超時
      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        'timeout'
      )
    })

    it('應該處理極大的 timeout 值', async () => {
      const innerChannel = new MockChannel(10)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: 999999999, // 極大值
      })

      await expect(timeoutChannel.send(new TestNotification(), notifiable)).resolves.toBeUndefined()
    })

    it('應該處理負數 timeout（視為立即超時）', async () => {
      const innerChannel = new MockChannel(0)
      const timeoutChannel = new TimeoutChannel(innerChannel, {
        timeout: -100,
      })

      await expect(timeoutChannel.send(new TestNotification(), notifiable)).rejects.toThrow(
        'timeout'
      )
    })
  })
})
