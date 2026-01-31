import { describe, expect, it, jest } from 'bun:test'
import { RateLimitMiddleware, MemoryStore } from '../src/middleware/RateLimitMiddleware'
import { Notification } from '../src/Notification'
import type { Notifiable } from '../src/types'

const notifiable: Notifiable = {
  getNotifiableId: () => 'user-123',
  getNotifiableType: () => 'user',
}

class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms']
  }
}

describe('RateLimitMiddleware', () => {
  describe('基本限流功能', () => {
    it('應該創建 RateLimitMiddleware 實例', () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      })

      expect(middleware).toBeDefined()
      expect(middleware.name).toBe('rate-limit')
    })

    it('應該允許在限流範圍內的請求', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      })

      let nextCalled = false
      await middleware.handle(new TestNotification(), notifiable, 'email', async () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
    })

    it('應該拒絕超過限流的請求', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 2 },
      })

      let successCount = 0
      const notification = new TestNotification()

      // 發送 5 次請求
      for (let i = 0; i < 5; i++) {
        let nextCalled = false
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            nextCalled = true
          })
          if (nextCalled) {
            successCount++
          }
        } catch (_error) {
          // 被限流會拋出錯誤
        }
      }

      // 只有前 2 次應該成功
      expect(successCount).toBe(2)
    })

    it('應該在達到限流時拋出錯誤', async () => {
      const middleware = new RateLimitMiddleware({
        sms: { maxPerSecond: 1 },
      })

      const notification = new TestNotification()

      // 第一次應該成功
      await middleware.handle(notification, notifiable, 'sms', async () => {})

      // 第二次應該失敗
      let errorThrown = false
      try {
        await middleware.handle(notification, notifiable, 'sms', async () => {})
      } catch (error) {
        errorThrown = true
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Rate limit exceeded')
      }

      expect(errorThrown).toBe(true)
    })
  })

  describe('多時間窗口限流', () => {
    it('應該支援每秒限流', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 5 },
      })

      const notification = new TestNotification()
      let successCount = 0

      for (let i = 0; i < 7; i++) {
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            successCount++
          })
        } catch {
          // 忽略限流錯誤
        }
      }

      expect(successCount).toBe(5)
    })

    it('應該支援每分鐘限流', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerMinute: 3 },
      })

      const notification = new TestNotification()
      let successCount = 0

      for (let i = 0; i < 5; i++) {
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            successCount++
          })
        } catch {
          // 忽略限流錯誤
        }
      }

      expect(successCount).toBe(3)
    })

    it('應該支援每小時限流', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerHour: 10 },
      })

      const notification = new TestNotification()
      let successCount = 0

      for (let i = 0; i < 12; i++) {
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            successCount++
          })
        } catch {
          // 忽略限流錯誤
        }
      }

      expect(successCount).toBe(10)
    })

    it('應該同時支援多個時間窗口', async () => {
      const middleware = new RateLimitMiddleware({
        email: {
          maxPerSecond: 5,
          maxPerMinute: 20,
          maxPerHour: 100,
        },
      })

      const notification = new TestNotification()

      // 第一次應該成功
      let success = true
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      } catch {
        success = false
      }

      expect(success).toBe(true)
    })

    it('當達到任一限流條件時應該拒絕', async () => {
      const middleware = new RateLimitMiddleware({
        email: {
          maxPerSecond: 2,
          maxPerMinute: 100,
        },
      })

      const notification = new TestNotification()
      let successCount = 0

      // 嘗試快速發送 5 次
      for (let i = 0; i < 5; i++) {
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            successCount++
          })
        } catch {
          // 忽略限流錯誤
        }
      }

      // 應該只有 2 次成功（受 maxPerSecond 限制）
      expect(successCount).toBe(2)
    })
  })

  describe('不同通道的獨立限流', () => {
    it('不同通道應該有獨立的限流計數', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 2 },
        sms: { maxPerSecond: 2 },
      })

      const notification = new TestNotification()

      // Email 通道發送 2 次
      let emailSuccess = 0
      for (let i = 0; i < 2; i++) {
        try {
          await middleware.handle(notification, notifiable, 'email', async () => {
            emailSuccess++
          })
        } catch {
          // 忽略
        }
      }

      // SMS 通道應該還能發送 2 次
      let smsSuccess = 0
      for (let i = 0; i < 2; i++) {
        try {
          await middleware.handle(notification, notifiable, 'sms', async () => {
            smsSuccess++
          })
        } catch {
          // 忽略
        }
      }

      expect(emailSuccess).toBe(2)
      expect(smsSuccess).toBe(2)
    })

    it('應該只限制已配置的通道', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 1 },
        // sms 沒有配置限流
      })

      const notification = new TestNotification()

      // Email 第二次應該失敗
      await middleware.handle(notification, notifiable, 'email', async () => {})
      let emailBlocked = false
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      } catch {
        emailBlocked = true
      }

      // SMS 應該不受限制
      let smsSuccess = 0
      for (let i = 0; i < 5; i++) {
        try {
          await middleware.handle(notification, notifiable, 'sms', async () => {
            smsSuccess++
          })
        } catch {
          // 忽略
        }
      }

      expect(emailBlocked).toBe(true)
      expect(smsSuccess).toBe(5)
    })
  })

  describe('Token 補充機制', () => {
    it('應該在時間經過後補充 tokens', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 2 },
      })

      const notification = new TestNotification()

      // 消耗所有 tokens
      await middleware.handle(notification, notifiable, 'email', async () => {})
      await middleware.handle(notification, notifiable, 'email', async () => {})

      // 第三次應該失敗
      let blocked = false
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      } catch {
        blocked = true
      }
      expect(blocked).toBe(true)

      // 等待 1 秒讓 tokens 補充
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 現在應該可以再次發送
      let success = false
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {
          success = true
        })
      } catch {
        // 忽略
      }

      expect(success).toBe(true)
    })
  })

  describe('自定義 CacheStore', () => {
    it('應該支援自定義 CacheStore', () => {
      const mockStore = {
        get: jest.fn(),
        put: jest.fn(),
        forget: jest.fn(),
      }

      const middleware = new RateLimitMiddleware(
        {
          email: { maxPerSecond: 10 },
        },
        mockStore as any
      )

      expect(middleware).toBeDefined()
    })

    it('應該使用記憶體 store 作為預設值', async () => {
      // 不傳入 store 參數
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 5 },
      })

      const notification = new TestNotification()
      let success = false

      try {
        await middleware.handle(notification, notifiable, 'email', async () => {
          success = true
        })
      } catch {
        // 忽略
      }

      expect(success).toBe(true)
    })
  })

  describe('MemoryStore', () => {
    // 我們需要測試 MemoryStore 的內部行為
    // 由於 MemoryStore 是 internal class，我們通過 middleware 間接測試

    it('MemoryStore.get() 應該返回存在的值', async () => {
      // 使用 reflection 存取內部 MemoryStore
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      await store.put('test-key', 'test-value', 60)
      const value = await store.get('test-key')

      expect(value).toBe('test-value')
    })

    it('MemoryStore.get() 應該在 key 不存在時返回 null', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      const value = await store.get('non-existent-key')
      expect(value).toBeNull()
    })

    it('MemoryStore.get() 應該在項目過期時返回 null', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      // 設定 TTL 為 0.1 秒
      await store.put('expiring-key', 'expiring-value', 0.1)

      // 立即讀取應該成功
      const valueBefore = await store.get('expiring-key')
      expect(valueBefore).toBe('expiring-value')

      // 等待過期
      await new Promise((resolve) => setTimeout(resolve, 150))

      // 過期後應該返回 null
      const valueAfter = await store.get('expiring-key')
      expect(valueAfter).toBeNull()
    })

    it('MemoryStore.put() 應該儲存值', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      await store.put('key1', { data: 'complex-value' }, 60)
      const value = await store.get('key1')

      expect(value).toEqual({ data: 'complex-value' })
    })

    it('MemoryStore.put() 應該覆蓋已存在的 key', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      await store.put('key1', 'value1', 60)
      await store.put('key1', 'value2', 60)

      const value = await store.get('key1')
      expect(value).toBe('value2')
    })

    it('MemoryStore.forget() 應該刪除 key', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      await store.put('key-to-delete', 'value', 60)
      await store.forget('key-to-delete')

      const value = await store.get('key-to-delete')
      expect(value).toBeNull()
    })

    it('MemoryStore.forget() 在 key 不存在時應該安全地不執行任何操作', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      }) as any

      const store = middleware.store

      // 不應該拋出錯誤
      await expect(store.forget('non-existent-key')).resolves.toBeUndefined()
    })

    it('MemoryStore 應該定期清理過期項目', async () => {
      // 創建一個清理間隔較短的 MemoryStore（100ms）
      const store = new MemoryStore(100)

      // 設定多個短 TTL 的項目
      await store.put('expire1', 'value1', 0.1)
      await store.put('expire2', 'value2', 0.1)
      await store.put('expire3', 'value3', 0.1)

      // 等待清理週期（100ms 間隔 + 過期時間 100ms + 緩衝）
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 檢查快取大小（通過反射存取內部 cache）
      const cacheSize = (store as any).cache.size
      expect(cacheSize).toBe(0)

      // 清理資源
      store.destroy()
    })

    it('MemoryStore 清理不應該影響未過期的項目', async () => {
      // 創建一個清理間隔較短的 MemoryStore（100ms）
      const store = new MemoryStore(100)

      // 設定一個長 TTL 的項目和一個短 TTL 的項目
      await store.put('long-lived', 'value-long', 10)
      await store.put('short-lived', 'value-short', 0.1)

      // 等待清理週期（100ms 間隔 + 過期時間 100ms + 緩衝）
      await new Promise((resolve) => setTimeout(resolve, 250))

      // 長 TTL 的項目應該還存在
      const longValue = await store.get('long-lived')
      expect(longValue).toBe('value-long')

      // 短 TTL 的項目應該被清理
      const shortValue = await store.get('short-lived')
      expect(shortValue).toBeNull()

      // 清理資源
      store.destroy()
    })

    it('MemoryStore.destroy() 應該清理所有資源', async () => {
      const store = new MemoryStore(100)

      await store.put('key1', 'value1', 60)
      await store.put('key2', 'value2', 60)

      // 呼叫 destroy
      store.destroy()

      // 所有項目應該被清除
      const cacheSize = (store as any).cache.size
      expect(cacheSize).toBe(0)

      // cleanup interval 應該被停止
      const cleanupInterval = (store as any).cleanupInterval
      expect(cleanupInterval).toBeUndefined()
    })
  })

  describe('錯誤處理', () => {
    it('限流錯誤應該包含有用的資訊', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 1 },
      })

      const notification = new TestNotification()
      await middleware.handle(notification, notifiable, 'email', async () => {})

      try {
        await middleware.handle(notification, notifiable, 'email', async () => {})
        throw new Error('Should have thrown rate limit error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const message = (error as Error).message
        expect(message).toContain('Rate limit exceeded')
        expect(message).toContain('email')
      }
    })

    it('應該在配置為空時正常運作', async () => {
      const middleware = new RateLimitMiddleware({})

      const notification = new TestNotification()
      let success = false

      await middleware.handle(notification, notifiable, 'any-channel', async () => {
        success = true
      })

      expect(success).toBe(true)
    })
  })

  describe('狀態監控與管理', () => {
    it('getStatus 應該返回當前剩餘的 tokens', async () => {
      const middleware = new RateLimitMiddleware({
        email: {
          maxPerSecond: 10,
          maxPerMinute: 100,
          maxPerHour: 1000,
        },
      })

      // 初始狀態應該是滿的
      const initialStatus = middleware.getStatus('email')
      expect(initialStatus.second).toBe(10)
      expect(initialStatus.minute).toBe(100)
      expect(initialStatus.hour).toBe(1000)
    })

    it('getStatus 應該反映消耗後的狀態', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 5 },
      })

      const notification = new TestNotification()

      // 消耗 3 個 tokens
      for (let i = 0; i < 3; i++) {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      }

      const status = middleware.getStatus('email')
      expect(status.second).toBe(2) // 剩下 2 個
    })

    it('getStatus 應該為未配置的通道返回空物件', () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      })

      const status = middleware.getStatus('sms')
      expect(status).toEqual({})
    })

    it('getStatus 應該只返回已配置的時間窗口', () => {
      const middleware = new RateLimitMiddleware({
        email: {
          maxPerSecond: 10,
          maxPerMinute: 100,
          // 沒有配置 maxPerHour
        },
      })

      const status = middleware.getStatus('email')
      expect(status.second).toBeDefined()
      expect(status.minute).toBeDefined()
      expect(status.hour).toBeUndefined()
    })

    it('reset 應該重置通道的限流計數', async () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 2 },
      })

      const notification = new TestNotification()

      // 消耗所有 tokens
      await middleware.handle(notification, notifiable, 'email', async () => {})
      await middleware.handle(notification, notifiable, 'email', async () => {})

      // 確認已達到限制
      let blocked = false
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      } catch {
        blocked = true
      }
      expect(blocked).toBe(true)

      // 重置
      middleware.reset('email')

      // 現在應該可以再次發送
      let success = false
      try {
        await middleware.handle(notification, notifiable, 'email', async () => {
          success = true
        })
      } catch {
        // 忽略
      }
      expect(success).toBe(true)
    })

    it('reset 應該重置所有時間窗口', async () => {
      const middleware = new RateLimitMiddleware({
        email: {
          maxPerSecond: 5,
          maxPerMinute: 10,
          maxPerHour: 20,
        },
      })

      const notification = new TestNotification()

      // 消耗一些 tokens
      for (let i = 0; i < 3; i++) {
        await middleware.handle(notification, notifiable, 'email', async () => {})
      }

      // 檢查狀態
      const statusBefore = middleware.getStatus('email')
      expect(statusBefore.second).toBeLessThan(5)

      // 重置
      middleware.reset('email')

      // 檢查狀態已恢復
      const statusAfter = middleware.getStatus('email')
      expect(statusAfter.second).toBe(5)
      expect(statusAfter.minute).toBe(10)
      expect(statusAfter.hour).toBe(20)
    })

    it('reset 應該在未配置的通道上安全地不執行任何操作', () => {
      const middleware = new RateLimitMiddleware({
        email: { maxPerSecond: 10 },
      })

      // 不應該拋出錯誤
      expect(() => middleware.reset('sms')).not.toThrow()
    })
  })
})
